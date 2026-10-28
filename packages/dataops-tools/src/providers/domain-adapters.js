/**
 * Domain adapter contracts for the intranet integration.
 *
 * This is the seam the stage tools should consume as real systems replace
 * fixtures. The registry is intentionally separate from the current
 * devops/catalog providers so migration can happen domain by domain.
 */
import { configError } from '../errors.js'
import { createHttpClient } from './http.js'
import { createCliClient } from './cli.js'

export const DOMAIN_NAMES = [
  'us', 'datamap', 'lineage', 'profile', 'scheduler', 'code', 'cicd', 'release', 'identity'
]

export const DOMAIN_OPERATIONS = {
  us: ['list', 'detail'],
  datamap: ['search', 'path', 'asset'],
  lineage: ['upstream', 'downstream'],
  profile: ['snapshot'],
  scheduler: ['jobs', 'instances', 'logs', 'compile', 'health'],
  code: ['build', 'scan', 'test', 'review', 'mergeStatus'],
  cicd: ['run', 'artifact'],
  release: ['environments', 'approval'],
  identity: ['me', 'roles']
}

const PROVIDER_KINDS = new Set(['mock', 'http', 'cli'])

export function normalizeDomainConfig(name, raw) {
  if (!DOMAIN_NAMES.includes(name)) throw configError('dataops-tools: unknown domain ' + name)
  const source = raw && typeof raw === 'object' ? raw : {}
  const kind = source.kind || 'mock'
  if (!PROVIDER_KINDS.has(kind)) throw configError('dataops-tools: domain ' + name + ' kind must be mock, http or cli')
  const normalized = { kind }
  if (kind === 'http') {
    if (typeof source.baseUrl !== 'string' && typeof source.baseUrlEnv !== 'string') {
      throw configError('dataops-tools: domain ' + name + ' needs baseUrl or baseUrlEnv')
    }
    normalized.baseUrl = source.baseUrl
    normalized.baseUrlEnv = source.baseUrlEnv
    normalized.paths = source.paths && typeof source.paths === 'object' ? source.paths : {}
    normalized.tokenRef = source.tokenRef
  }
  if (kind === 'cli') {
    if (!source.commands || typeof source.commands !== 'object') {
      throw configError('dataops-tools: domain ' + name + ' cli needs commands')
    }
    normalized.commands = source.commands
    normalized.cwd = source.cwd
    normalized.env = source.env
    normalized.tokenRef = source.tokenRef
  }
  return normalized
}

export function createDomainAdapter(name, rawConfig, options = {}) {
  const config = normalizeDomainConfig(name, rawConfig)
  const timeoutMs = options.timeoutMs || 8000
  const retry = options.retry ?? 0
  const resolveSecret = options.resolveSecret || (async key => process.env[key])
  const mock = options.mock && options.mock[name]

  if (config.kind === 'mock') {
    return {
      name,
      kind: 'mock',
      async health() { return { ok: true, kind: 'mock', mock: true } },
      async read(operation, args = {}) {
        if (mock) return mock(operation, args)
        throw new Error('domain-adapter: mock not implemented for ' + name + '.' + operation)
      }
    }
  }

  const transport = config.kind === 'cli'
    ? createCliClient(config, { timeoutMs, resolveSecret, execFileImpl: options.execFileImpl })
    : createHttpClient(config, { timeoutMs, retry, resolveSecret, fetchImpl: options.fetchImpl })

  return {
    name,
    kind: config.kind,
    async health() {
      const hasHealth = config.kind === 'http' ? Boolean(config.paths && config.paths.health) : Boolean(config.commands && config.commands.health)
      if (!hasHealth) return { ok: true, kind: config.kind, mock: false, checked: false }
      try { await transport.call('health', {}, {}); return { ok: true, kind: config.kind, mock: false, checked: true } } catch (error) { return { ok: false, kind: config.kind, mock: false, checked: true, error: error && error.code || 'UPSTREAM' } }
    },
    async read(operation, args = {}) {
      if (!DOMAIN_OPERATIONS[name].includes(operation)) throw configError('domain-adapter: ' + name + ' does not support ' + operation)
      return transport.call(operation, args, { signal: args.signal })
    }
  }
}

export function createDomainAdapters(config = {}, options = {}) {
  const domains = config.domains && typeof config.domains === 'object' ? config.domains : {}
  return Object.fromEntries(DOMAIN_NAMES.map(name => [name, createDomainAdapter(name, domains[name] || { kind: 'mock' }, {
    timeoutMs: options.timeoutMs || config.timeoutMs,
    retry: options.retry ?? config.retry,
    resolveSecret: options.resolveSecret,
    fetchImpl: options.fetchImpl,
    execFileImpl: options.execFileImpl,
    mock: options.mock
  })]))
}
