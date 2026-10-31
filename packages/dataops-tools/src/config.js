/**
 * Plugin configuration normalization.
 *
 * The profile owns the switches; tools never read process.env for base URLs.
 * Credential refs are names (env vars or credential-store keys), never values.
 */
const PROVIDERS = new Set(['mock', 'cli', 'http'])

export const DEFAULTS = {
  provider: 'mock',
  timeoutMs: 8000,
  retry: 1,
  maxDepth: 3,
  maxNodes: 200,
  mockDelayMs: 0,
  workitemsDir: 'workitems',
  pipelineTimeoutMs: 900000,
  pipelinePollIntervalMs: 3000
}

function positiveInt(value, fallback, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(number)))
}

function normalizeDomain(raw, fallbackKind, domainName) {
  const domain = raw || {}
  const kind = domain.kind || fallbackKind
  if (!PROVIDERS.has(kind)) {
    throw new Error(`dataops-tools: ${domainName}.kind must be mock, cli or http (got ${JSON.stringify(kind)})`)
  }

  const normalized = {
    kind,
    tokenRef: typeof domain.tokenRef === 'string' && domain.tokenRef !== '' ? domain.tokenRef : undefined
  }

  if (kind === 'cli') {
    if (!domain.commands || typeof domain.commands !== 'object') {
      throw new Error(`dataops-tools: ${domainName}.commands is required when kind is cli`)
    }
    normalized.commands = domain.commands
    normalized.cwd = typeof domain.cwd === 'string' ? domain.cwd : undefined
    normalized.env = domain.env && typeof domain.env === 'object' ? domain.env : undefined
  }

  if (kind === 'http') {
    if (!domain.baseUrl && !domain.baseUrlEnv) {
      throw new Error(`dataops-tools: ${domainName}.baseUrl or baseUrlEnv is required when kind is http`)
    }
    normalized.baseUrl = typeof domain.baseUrl === 'string' ? domain.baseUrl : undefined
    normalized.baseUrlEnv = typeof domain.baseUrlEnv === 'string' ? domain.baseUrlEnv : undefined
    normalized.paths = domain.paths && typeof domain.paths === 'object' ? domain.paths : {}
  }

  return normalized
}

export function normalizeConfig(config) {
  const input = config || {}
  const provider = input.provider === undefined ? DEFAULTS.provider : input.provider
  if (!PROVIDERS.has(provider)) {
    throw new Error(`dataops-tools: provider must be mock, cli or http (got ${JSON.stringify(provider)})`)
  }

  return {
    provider,
    timeoutMs: positiveInt(input.timeoutMs, DEFAULTS.timeoutMs, 100, 120000),
    retry: positiveInt(input.retry, DEFAULTS.retry, 0, 3),
    maxDepth: positiveInt(input.maxDepth, DEFAULTS.maxDepth, 1, 3),
    maxNodes: positiveInt(input.maxNodes, DEFAULTS.maxNodes, 1, 1000),
    mockDelayMs: positiveInt(input.mockDelayMs, DEFAULTS.mockDelayMs, 0, 10000),
    workitemsDir: typeof input.workitemsDir === 'string' && input.workitemsDir.trim() !== '' ? input.workitemsDir.trim() : DEFAULTS.workitemsDir,
    repoRoot: typeof input.repoRoot === 'string' && input.repoRoot.trim() !== '' ? input.repoRoot.trim() : null,
    repoManifestPath: typeof input.repoManifestPath === 'string' && input.repoManifestPath.trim() !== '' ? input.repoManifestPath.trim() : '.dataops/manifest.yaml',
    repoBuildPath: typeof input.repoBuildPath === 'string' && input.repoBuildPath.trim() !== '' ? input.repoBuildPath.trim() : '.dataops/build.yaml',
    disabledTools: Array.isArray(input.disabledTools) ? input.disabledTools.filter(item => typeof item === 'string') : [],
    domains: input.domains && typeof input.domains === 'object' && !Array.isArray(input.domains) ? input.domains : {},
    devops: normalizeDomain(input.devops, provider, 'devops'),
    catalog: normalizeDomain(input.catalog, provider, 'catalog'),
    cicd: normalizeDomain(input.cicd, 'mock', 'cicd'),
    pipelineTimeoutMs: positiveInt(input.pipelineTimeoutMs, DEFAULTS.pipelineTimeoutMs, 1000, 3600000),
    pipelinePollIntervalMs: positiveInt(input.pipelinePollIntervalMs, DEFAULTS.pipelinePollIntervalMs, 100, 60000)
  }
}
