/**
 * BuildAdapter: invoke `dataops build run` for one declared package.
 *
 * It deliberately does not resolve $$KEY$$ values. Build is yaml->json+zip;
 * placeholders stay in the artifact and are resolved by deploy.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseBuildConfig } from './index.js'
import { logExcerpt, runCli } from './cli-runner.js'

function required(value, name) {
  if (value === undefined || value === null || String(value).trim() === '') throw new Error('build: ' + name + ' is required')
  return String(value)
}

export function createBuildAdapter(options = {}) {
  const root = resolve(options.root || '.')
  const command = options.command || 'dataops'
  const configPath = options.configPath || '.dataops/build.yaml'
  const outputDir = options.outputDir || 'output'
  const config = parseBuildConfig(readFileSync(resolve(root, configPath), 'utf8'))

  async function run(input = {}) {
    const packageName = required(input.packageName, 'packageName')
    const enterpriseId = required(input.enterpriseId || options.enterpriseId, 'enterpriseId')
    const projectId = required(input.projectId || options.projectId, 'projectId')
    const pkg = config.packages.find(item => item.packageName === packageName)
    if (!pkg) throw new Error('build: package is not declared in build.yaml: ' + packageName)
    if (!pkg.files || !pkg.files.length) throw new Error('build: package has no files: ' + packageName)
    const artifact = join(resolve(root, outputDir), packageName + '.zip')
    const args = ['build', 'run', '--package', packageName, '--config', configPath, '--output-dir', outputDir, '--enterprise-id', enterpriseId, '--project-id', projectId]
    const result = await runCli(options.execFileImpl, command, args, {
      cwd: root,
      env: options.env,
      timeoutMs: options.timeoutMs || 300000,
      signal: input.signal
    })
    const buildInfo = join(resolve(root, outputDir), 'buildInfo.properties')
    const ok = !result.error && existsSync(artifact)
    return {
      ok,
      command,
      args,
      packageName,
      artifact,
      buildInfo: existsSync(buildInfo) ? buildInfo : null,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
      logExcerpt: logExcerpt(result.stdout, result.stderr),
      warnings: result.error ? [] : [],
      errors: result.error ? [result.error.message || 'build command failed'] : (existsSync(artifact) ? [] : ['build artifact not found: ' + artifact])
    }
  }

  return { config, run }
}
