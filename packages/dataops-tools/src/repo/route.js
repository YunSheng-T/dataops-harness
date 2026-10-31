/**
 * Read-only repo inspector route. The client right-sidebar tab calls this
 * without an Agent turn. Paths are fixed by plugin config; the request cannot
 * choose an arbitrary filesystem root.
 */
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { indexRepository } from './index.js'
import { parseLtsTask, parseProperties } from '../lts.js'

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  })
}

function ltsForPackage(root, pkg) {
  const files = (pkg.files || []).filter(path => /\.(?:yaml|yml)$/iu.test(path))
  return files.map(path => {
    try {
      const source = readFileSync(join(root, path), 'utf8')
      const propertiesPath = join(root, dirname(path), 'parameters.properties')
      const parameters = existsSync(propertiesPath) ? parseProperties(readFileSync(propertiesPath, 'utf8')) : {}
      const parsed = parseLtsTask(source, { parameters })
      if (Number(parsed.formatVersion) !== 2 || !parsed.tasks.length) return null
      return {
        file: path,
        ok: parsed.ok,
        taskCount: parsed.tasks.length,
        jobCount: parsed.tasks.reduce((sum, task) => sum + (Array.isArray(task.jobs) ? task.jobs.length : 0), 0),
        placeholders: parsed.placeholders,
        findings: parsed.findings,
        tasks: parsed.tasks.map(task => ({
          name: task.name,
          type: task.type,
          cronExp: task.cronExp || null,
          jobs: (task.jobs || []).map(job => ({ name: job.name, type: job.jobType, parents: Array.isArray(job.parentJobName) ? job.parentJobName : [job.parentJobName].filter(Boolean) }))
        }))
      }
    } catch (error) {
      return { file: path, ok: false, error: error && error.message ? error.message : 'parse failed', findings: [] }
    }
  }).filter(Boolean)
}

export function createRepoRoute(options = {}) {
  const configuredRoot = options.repoRoot ? resolve(options.repoRoot) : null
  const manifestPath = options.manifestPath || '.dataops/manifest.yaml'
  const buildPath = options.buildPath || '.dataops/build.yaml'
  return async function fetch(request) {
    if (request.method !== 'GET') return json(405, { ok: false, error: 'METHOD' })
    if (!configuredRoot) return json(409, { ok: false, error: 'REPO_NOT_CONFIGURED', message: '在 dataops-tools config 里配置 repoRoot' })
    if (!existsSync(join(configuredRoot, manifestPath))) return json(409, { ok: false, error: 'MANIFEST_MISSING', message: 'manifest.yaml not found' })
    try {
      const index = indexRepository({ root: configuredRoot, manifestPath, buildPath })
      const packages = index.packages.map(pkg => ({ ...pkg, lts: ltsForPackage(configuredRoot, pkg) }))
      return json(200, {
        ok: true,
        schemaVersion: 1,
        asOf: new Date().toISOString(),
        repo: basename(configuredRoot),
        manifest: { version: index.manifest.version, platforms: index.manifest.platforms },
        packages,
        findings: index.findings
      })
    } catch (error) {
      return json(422, { ok: false, error: 'REPO_INDEX_FAILED', message: error && error.message ? error.message : 'repo index failed' })
    }
  }
}

export function registerRepoRoute(ctx, config) {
  const connection = ctx && typeof ctx.get === 'function' ? ctx.get('connection') : null
  if (!connection || !connection.fetch || typeof connection.fetch.register !== 'function') return null
  if (!config || !config.repoRoot) return null
  const route = createRepoRoute({
    repoRoot: resolve(process.cwd(), config.repoRoot),
    manifestPath: config.repoManifestPath,
    buildPath: config.repoBuildPath
  })
  const dispose = connection.fetch.register({
    path: '/api/dataops/repo',
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: route
  })
  if (typeof ctx.effect === 'function') ctx.effect(() => dispose)
  return dispose
}
