/**
 * Optional real deployment adapter for Stage 5.
 *
 * It is deliberately opt-in: the default profile has no release CLI and keeps
 * the mock environment status. The internal profile maps `domains.release` to
 * the dataops deploy command and passes deploy:true explicitly.
 */
import { configError, formatError, upstreamError } from '../errors.js'
import { createCliClient } from './cli.js'

const ENVIRONMENTS = ['dev', 'sit', 'uat', 'beta', 'gamma']

function normalizeEnvironment(value, name) {
  const status = String(value && value.status || 'unknown').toLowerCase()
  if (!['deployed', 'succeeded', 'running', 'pending', 'failed', 'blocked'].includes(status)) {
    throw formatError('deploy CLI returned unknown status for ' + name + ': ' + status)
  }
  return {
    name,
    status: status === 'succeeded' ? 'deployed' : status,
    deployedAt: value && (value.deployedAt || value.finishedAt || value.at) || null,
    approval: value && value.approval || null,
    ...(value && value.deploymentId ? { deploymentId: String(value.deploymentId) } : {})
  }
}

export function createDeployCliAdapter(config, options = {}) {
  const domain = config.domains && config.domains.release
  if (!domain || domain.kind !== 'cli') throw configError('deploy adapter requires domains.release.kind=cli')
  const transport = createCliClient(domain, {
    timeoutMs: options.timeoutMs || config.timeoutMs,
    resolveSecret: options.resolveSecret || (async key => process.env[key]),
    execFileImpl: options.execFileImpl
  })
  return {
    kind: 'cli',
    async deploy(args = {}) {
      const environments = Array.isArray(args.environments) && args.environments.length ? args.environments : ENVIRONMENTS
      const result = await transport.call('deploy', {
        artifact: args.artifact,
        packageName: args.packageName,
        workitemId: args.workitemId,
        environment: environments[environments.length - 1],
        operator: args.operator,
        ticket: args.ticket
      }, { signal: args.signal })
      if (!result || typeof result !== 'object') throw formatError('deploy CLI returned a non-object')
      if (result.status && !['deployed', 'succeeded', 'pending', 'running', 'failed', 'blocked'].includes(String(result.status).toLowerCase())) {
        throw upstreamError('deploy CLI returned unknown result status ' + result.status)
      }
      const rawEnvironments = Array.isArray(result.environments) ? result.environments : []
      const byName = new Map(rawEnvironments.map(item => [item && item.name, item]))
      return {
        platform: result.platform || 'company-release-platform',
        approvalId: result.approvalId || null,
        source: 'release-cli',
        mock: false,
        environments: environments.map(name => normalizeEnvironment(byName.get(name) || { status: result.status || 'pending' }, name))
      }
    }
  }
}
