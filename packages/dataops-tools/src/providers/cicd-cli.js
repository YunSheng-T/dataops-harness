/**
 * CICD CLI pipeline adapter.
 *
 * The internal platform owns pipeline execution and artifacts. DataOps only
 * invokes the CLI, polls the run, and validates the structured result. It does
 * not deploy, release, roll back, or fabricate a local artifact in real mode.
 */
import { configError, formatError, timeoutError, upstreamError } from '../errors.js'
import { createCliClient } from './cli.js'

const TERMINAL = new Set(['succeeded', 'failed', 'blocked', 'cancelled'])

function normalizePipeline(raw) {
  if (!raw || typeof raw !== 'object') throw formatError('CICD CLI 返回不是对象')
  const pipelineRunId = raw.pipelineRunId || raw.runId
  if (!pipelineRunId) throw formatError('CICD CLI 返回缺少 pipelineRunId/runId')
  const status = String(raw.status || 'queued').toLowerCase()
  if (!['queued', 'running', ...TERMINAL].includes(status)) throw formatError('CICD CLI 返回未知状态 ' + status)
  return {
    ...raw,
    pipelineRunId,
    status,
    stages: Array.isArray(raw.stages) ? raw.stages : []
  }
}

function validateSucceeded(value) {
  const artifact = value.artifact || {}
  for (const key of ['package', 'digest', 'manifest', 'checksum']) {
    if (typeof artifact[key] !== 'string' || artifact[key].trim() === '') {
      throw formatError('CICD pipeline succeeded but artifact.' + key + ' is missing')
    }
  }
  return value
}

/**
 * Create a runner over a generic CLI transport.
 * Exposed separately so sync/async and polling can be tested without spawning.
 */
export function createCicdPipelineRunner(options) {
  const transport = options.transport
  const pollIntervalMs = options.pollIntervalMs || 3000
  const pipelineTimeoutMs = options.pipelineTimeoutMs || 900000
  const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)))
  const now = options.now || (() => Date.now())

  if (!transport || typeof transport.call !== 'function') throw configError('CICD runner requires a CLI transport')

  async function settle(value) {
    if (value.status === 'succeeded') return validateSucceeded(value)
    if (value.status === 'failed' || value.status === 'blocked' || value.status === 'cancelled') {
      throw upstreamError('CICD pipeline ' + value.status + ' (' + value.pipelineRunId + ')')
    }
    return value
  }

  return {
    async run(args = {}) {
      const startedAt = now()
      let value = normalizePipeline(await transport.call('run', {
        target: args.target,
        commit: args.commit,
        workitemId: args.workitemId
      }, { signal: args.signal }))
      if (TERMINAL.has(value.status)) return settle(value)
      if (!transport.commands || !transport.commands.status) {
        throw configError('CICD CLI 返回非终态，但未配置 status 命令', '在 cicd.commands.status 配置轮询命令。')
      }
      while (true) {
        if (args.signal && args.signal.aborted) throw args.signal.reason || new Error('CICD pipeline aborted')
        if (now() - startedAt >= pipelineTimeoutMs) throw timeoutError('CICD pipeline 轮询超时 (' + value.pipelineRunId + ')')
        await sleep(pollIntervalMs)
        value = normalizePipeline(await transport.call('status', { runId: value.pipelineRunId }, { signal: args.signal }))
        if (TERMINAL.has(value.status)) return settle(value)
      }
    }
  }
}

export function createCicdCliAdapter(config, options = {}) {
  const domain = config.cicd
  if (!domain || domain.kind !== 'cli') throw configError('CICD adapter requires config.cicd.kind=cli')
  const transport = createCliClient(domain, {
    timeoutMs: options.timeoutMs || config.timeoutMs,
    resolveSecret: options.resolveSecret || (async key => process.env[key]),
    execFileImpl: options.execFileImpl
  })
  const runner = createCicdPipelineRunner({
    transport,
    pollIntervalMs: options.pollIntervalMs || config.pipelinePollIntervalMs,
    pipelineTimeoutMs: options.pipelineTimeoutMs || config.pipelineTimeoutMs,
    sleep: options.sleep,
    now: options.now
  })
  return { kind: 'cli', run: runner.run }
}
