/**
 * DeployAdapter: invoke `dataops deploy execute` for a built package.
 * Current scope: sit, execute mode, no approval-id, no dry-run.
 */
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { logExcerpt, runCli } from './cli-runner.js'

function required(value, name) {
  if (value === undefined || value === null || String(value).trim() === '') throw new Error('deploy: ' + name + ' is required')
  return String(value)
}

export function createDeployAdapter(options = {}) {
  const root = resolve(options.root || '.')
  const command = options.command || 'dataops'
  const configPath = options.configPath || '.dataops/build.yaml'
  const targetEnv = 'sit'

  async function run(input = {}) {
    const packageName = required(input.packageName, 'packageName')
    const artifact = resolve(root, input.artifact || join(options.outputDir || 'output', packageName + '.zip'))
    if (!existsSync(artifact)) throw new Error('deploy: artifact not found: ' + artifact)
    const enterpriseId = required(input.enterpriseId || options.enterpriseId, 'enterpriseId')
    const projectId = required(input.projectId || options.projectId, 'projectId')
    const args = ['deploy', 'execute', '--package', packageName, '--artifact', artifact, '--config', configPath, '--target-env', targetEnv, '--mode', 'execute', '--enterprise-id', enterpriseId, '--project-id', projectId]
    const result = await runCli(options.execFileImpl, command, args, {
      cwd: root,
      env: options.env,
      timeoutMs: options.timeoutMs || 300000,
      signal: input.signal
    })
    return {
      ok: !result.error,
      command,
      args,
      packageName,
      artifact,
      targetEnv,
      mode: 'execute',
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
      logExcerpt: logExcerpt(result.stdout, result.stderr),
      warnings: [],
      errors: result.error ? [result.error.message || 'deploy command failed'] : []
    }
  }

  return { targetEnv, run }
}
