/**
 * Read-only DataOps repository detector and validator.
 *
 * This module deliberately sits on top of the existing repo index and LTS
 * parser. It does not build, deploy, write files, or resolve credentials.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { indexRepository, parseBuildConfig, parseManifest } from '../repo/index.js'
import { parseLtsTask, parseProperties } from '../lts.js'

const SKIP_DIRS = new Set(['.git', 'node_modules', 'output', 'dist', '.pnpm-store'])
const MANIFEST_PATH = '.dataops/manifest.yaml'
const BUILD_PATH = '.dataops/build.yaml'

function errorMessage(error) {
  return error && error.message ? error.message : String(error)
}

function walk(root, base, out) {
  if (!existsSync(base)) return
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(root, join(base, entry.name), out)
    } else if (entry.isFile()) {
      out.push(relative(root, join(base, entry.name)).split('\\').join('/'))
    }
  }
}

function finding(severity, code, message, extra = {}) {
  return { severity, code, message, ...extra }
}

function classify(path) {
  if (/\/task\.yaml$/u.test(path)) return 'lts'
  if (path.includes('/code/sql/') || /\.sql$/u.test(path)) return 'sql'
  if (path.includes('/code/etl/')) return 'etl'
  if (path.includes('/code/data_service/')) return 'data_service'
  if (path.endsWith('.properties')) return 'properties'
  return 'other'
}

export function detectRepository(root) {
  const base = resolve(root || '.')
  const manifestPath = join(base, MANIFEST_PATH)
  const buildPath = join(base, BUILD_PATH)
  const exists = { manifest: existsSync(manifestPath), build: existsSync(buildPath) }
  const reasons = []
  const findings = []
  if (!exists.manifest && !exists.build) {
    return {
      detected: false,
      partial: false,
      confidence: 'none',
      root: base,
      signals: [],
      findings: [finding('info', 'REPO_NOT_DETECTED', '当前 workspace 没有 .dataops/manifest.yaml 或 build.yaml')]
    }
  }
  let manifest
  let build
  if (exists.manifest) {
    try {
      manifest = parseManifest(readFileSync(manifestPath, 'utf8'))
      findings.push(...manifest.findings.map(item => ({ ...item, path: MANIFEST_PATH, severity: 'warning' })))
    } catch (error) {
      reasons.push('manifest parse failed: ' + errorMessage(error))
      findings.push(finding('blocking', 'MANIFEST_PARSE', errorMessage(error), { path: MANIFEST_PATH }))
    }
  } else {
    reasons.push('manifest missing')
  }
  if (exists.build) {
    try {
      build = parseBuildConfig(readFileSync(buildPath, 'utf8'))
      findings.push(...build.findings.map(item => ({ ...item, path: BUILD_PATH, severity: 'warning' })))
    } catch (error) {
      reasons.push('build parse failed: ' + errorMessage(error))
      findings.push(finding('blocking', 'BUILD_PARSE', errorMessage(error), { path: BUILD_PATH }))
    }
  } else {
    reasons.push('build missing')
  }
  const platformRoots = manifest && Array.isArray(manifest.platforms)
    ? manifest.platforms.filter(item => existsSync(join(base, item.path)))
    : []
  const packages = build && Array.isArray(build.packages) ? build.packages : []
  if (!platformRoots.length) reasons.push('no existing manifest platform root')
  if (!packages.length) reasons.push('no build packages')
  const strong = Boolean(manifest && build && platformRoots.length && packages.length && !findings.some(item => item.severity === 'blocking'))
  return {
    detected: strong,
    partial: !strong,
    confidence: strong ? 'strong' : 'partial',
    root: base,
    signals: [exists.manifest && MANIFEST_PATH, exists.build && BUILD_PATH, ...platformRoots.map(item => item.path)].filter(Boolean),
    reasons,
    findings
  }
}

function ltsFiles(files) {
  return files.filter(path => /\/task\.yaml$/u.test(path))
}

export function scanRepository(root) {
  const detection = detectRepository(root)
  const base = detection.root
  if (!detection.detected && !detection.partial) {
    return { ok: false, kind: 'repo_scan', mode: 'scan', detection, metrics: emptyMetrics(), packages: [], tasks: [], artifacts: [], files: [], diagnostics: detection.findings }
  }
  let index
  try {
    index = indexRepository({ root: base })
  } catch (error) {
    return {
      ok: false,
      mode: 'scan',
      detection,
      metrics: emptyMetrics(),
      packages: [], tasks: [], artifacts: [], files: [],
      diagnostics: detection.findings.concat(finding('blocking', 'REPO_INDEX_FAILED', errorMessage(error)))
    }
  }
  const files = []
  walk(base, base, files)
  const packages = (index.packages || []).map(pkg => ({
    packageName: pkg.packageName,
    platform: pkg.platform,
    toolChain: pkg.toolChain,
    serviceType: pkg.serviceType,
    operationType: pkg.operationType,
    files: pkg.files || [],
    missing: pkg.missing || [],
    unresolved: pkg.unresolved || []
  }))
  const tasks = []
  const diagnostics = detection.findings.concat(index.findings || [])
  for (const path of ltsFiles(files)) {
    try {
      const source = readFileSync(join(base, path), 'utf8')
      const propsPath = join(base, path, '..', 'parameters.properties')
      const parameters = existsSync(propsPath) ? parseProperties(readFileSync(propsPath, 'utf8')) : {}
      const parsed = parseLtsTask(source, { parameters })
      for (const item of parsed.tasks || []) {
        tasks.push({
          name: item.name,
          type: item.type,
          cronExp: item.cronExp || null,
          path,
          jobs: (item.jobs || []).map(job => ({ name: job.name, type: job.jobType, parents: Array.isArray(job.parentJobName) ? job.parentJobName : [job.parentJobName].filter(Boolean) }))
        })
      }
      diagnostics.push(...(parsed.findings || []).map(item => ({ ...item, path })))
    } catch (error) {
      diagnostics.push(finding('blocking', 'LTS_PARSE_FAILED', errorMessage(error), { path }))
    }
  }
  const artifacts = files.filter(path => classify(path) !== 'other').map(path => ({ path, type: classify(path) }))
  const metrics = {
    packages: packages.length,
    tasks: tasks.length,
    jobs: tasks.reduce((sum, task) => sum + task.jobs.length, 0),
    artifacts: artifacts.length,
    files: files.length
  }
  return { ok: true, kind: 'repo_scan', mode: 'scan', detection, metrics, packages, tasks, artifacts, files, diagnostics }
}

function emptyMetrics() {
  return { packages: 0, tasks: 0, jobs: 0, artifacts: 0, files: 0 }
}

function mapDiagnostic(scan, item) {
  const severity = item.severity === 'error' || item.severity === 'blocking' ? 'blocking' : item.severity === 'warning' ? 'warning' : 'info'
  return finding(severity, item.code || 'REPO_DIAGNOSTIC', item.message || String(item), {
    path: item.path,
    task: item.task,
    job: item.job,
    hint: item.hint
  })
}

export function validateRepository(scan) {
  if (!scan || !scan.ok) {
    const findings = ((scan && scan.diagnostics) || []).map(item => mapDiagnostic(scan || {}, item))
    return { ok: false, kind: 'repo_validation', mode: 'validate', status: findings.some(item => item.severity === 'blocking') ? 'block' : 'warn', metrics: (scan && scan.metrics) || emptyMetrics(), findings, asOf: new Date().toISOString() }
  }
  const findings = (scan.diagnostics || []).map(item => mapDiagnostic(scan, item))
  const claimed = new Set((scan.packages || []).flatMap(pkg => pkg.files || []))
  for (const pkg of scan.packages || []) {
    for (const path of pkg.missing || []) findings.push(finding('blocking', 'PACKAGE_FILE_MISSING', 'package 文件范围没有命中任何文件', { path, package: pkg.packageName }))
    for (const path of pkg.unresolved || []) findings.push(finding('warning', 'PACKAGE_FILE_UNRESOLVED', 'package 文件范围无法解析', { path, package: pkg.packageName }))
  }
  for (const artifact of scan.artifacts || []) {
    if (['sql', 'etl', 'data_service'].includes(artifact.type) && !claimed.has(artifact.path)) {
      findings.push(finding('warning', 'ARTIFACT_UNCLAIMED', '制品没有被任何 package 覆盖', { path: artifact.path }))
    }
  }
  const status = findings.some(item => item.severity === 'blocking') ? 'block' : findings.some(item => item.severity === 'warning') ? 'warn' : 'pass'
  return {
    ok: status !== 'block',
    kind: 'repo_validation',
    mode: 'validate',
    status,
    asOf: new Date().toISOString(),
    detection: scan.detection,
    metrics: {
      ...scan.metrics,
      blocking: findings.filter(item => item.severity === 'blocking').length,
      warning: findings.filter(item => item.severity === 'warning').length,
      info: findings.filter(item => item.severity === 'info').length
    },
    findings
  }
}

export function checkRepository(root) {
  const scan = scanRepository(root)
  const validation = validateRepository(scan)
  return { ...validation, scan }
}
