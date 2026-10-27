/**
 * Host half: DataOps stage tools.
 *
 * Tool names, parameters and payload `kind`s are the public contract the client
 * cards render. Data access lives behind provider seams (mock / cli / http);
 * switching providers never changes the model-facing surface.
 */
import { resolve } from 'node:path'
import { normalizeConfig } from './config.js'
import { buildPipelinePackage } from './pipeline-package.js'
import { buildDevelopArtifacts } from './develop-package.js'
import { createMockProvider } from './providers/mock.js'
import { createDevops } from './providers/devops.js'
import { createCatalog } from './providers/catalog.js'
import { ensureWorkitem, findWorkitemBySource, readWorkitem, stageComplete, stagePrepare, stageSignoff, updateWorkitem } from './workitem-store.js'
import { US_AS_OF, listUs, usDetail } from './fixtures/us.js'
import { readDatamap } from './fixtures/datamap.js'
import { readLineageV2 } from './fixtures/lineage.js'
import { readEvidenceV2 } from './fixtures/evidence.js'
import { DEVELOP } from './fixtures/develop.js'
import { CICD_PIPELINE } from './fixtures/cicd.js'
import {
  designPayload, evidencePayload, formatImpact, gap, lineagePayload, now,
  requirementPayload, stagePayload, tablePayload, techPlanPayload
} from './contracts.js'
import { buildAnalysis, buildProfile, buildScan, buildSchedule, buildSolution } from './mock.js'

export const name = 'dataops-tools'
export const inject = ['tools']

const SCENARIO = {
  type: 'string',
  enum: ['channel-report', 'member-model'],
  description: '离线 mock 场景；真实 provider 下忽略。'
}

const parameterRoot = properties => ({ type: 'object', properties, additionalProperties: false })
const DELIVERABLE_KINDS = {
  intake: 'requirement',
  requirement: 'requirement',
  design: 'design',
  analysis: 'scheme',
  solution: 'scheme',
  tech_plan: 'scheme',
  develop: 'develop',
  postmortem: 'review',
  incident: 'incident'
}
const DELIVERABLE_STATUSES = ['draft', 'reviewed', 'approved', 'blocked']
const DELIVERABLE_PATH = /^(?:deliverables|artifacts)\/[A-Za-z0-9][A-Za-z0-9._\/-]*$/
const DELIVERABLE_MAX_BYTES = 256 * 1024

const LOG_SCENARIOS = {
  'channel-report': {
    taskId: 'dws.trade_channel_daily_daily',
    timeRange: { from: '2026-10-25 00:00', to: '2026-10-26 08:00' },
    events: [
      { at: '2026-10-26T05:02:11+08:00', level: 'error', code: 'TASK_TIMEOUT', source: 'scheduler', message: '上游 dwd.orders 分区 2026-10-26 未就绪，等待超时' },
      { at: '2026-10-26T05:03:40+08:00', level: 'warn', code: 'PARTITION_LATE', source: 'scheduler', message: '分区到达时间比 SLA 晚 42 分钟' },
      { at: '2026-10-26T05:07:02+08:00', level: 'error', code: 'TASK_FAILED', source: 'executor', message: 'dws.trade_channel_daily 任务失败退出码 1' }
    ],
    errorCodes: ['TASK_TIMEOUT', 'PARTITION_LATE', 'TASK_FAILED'],
    upstream: ['dwd.orders'],
    downstream: ['ads.channel_report', 'rpt.funnel'],
    recentRuns: [
      { runId: 'run-20261026-0500', status: 'failed', startedAt: '2026-10-26T05:00:00+08:00', finishedAt: '2026-10-26T05:07:03+08:00' },
      { runId: 'run-20261025-0500', status: 'success', startedAt: '2026-10-25T05:00:00+08:00', finishedAt: '2026-10-25T05:04:10+08:00' }
    ],
    evidence: [{ id: 'ev-log-20261026-001', claim: '2026-10-26 05:00 批次等待上游分区超时', source: 'scheduler' }]
  },
  'member-model': {
    taskId: 'dim.member_profile_daily',
    timeRange: { from: '2026-10-25 00:00', to: '2026-10-26 08:00' },
    events: [
      { at: '2026-10-26T04:12:08+08:00', level: 'warn', code: 'ROW_COUNT_DROP', source: 'quality', message: 'dim.member_profile_daily 行数环比下降 18%' }
    ],
    errorCodes: ['ROW_COUNT_DROP'],
    upstream: ['dwd.member_base'],
    downstream: ['dws.member_summary'],
    recentRuns: [{ runId: 'run-20261026-0400', status: 'succeeded_with_warning', startedAt: '2026-10-26T04:00:00+08:00', finishedAt: '2026-10-26T04:12:09+08:00' }],
    evidence: [{ id: 'ev-log-20261026-002', claim: '行数环比下降 18%，与上游分区缺失同时发生', source: 'quality' }]
  }
}

function textTool(def) {
  return {
    name: def.name,
    description: def.description,
    parameters: def.parameters,
    output: {
      schema: { type: 'object' },
      render(_args, value) {
        return [
          { type: 'text', text: def.summary(value) },
          { type: 'text', text: JSON.stringify(value) }
        ]
      }
    },
    async execute(args, exec) {
      if (exec && exec.signal && exec.signal.aborted) throw new Error(def.name + ': aborted')
      return def.execute(args || {}, exec || {})
    }
  }
}

function firstImpactTable(ticket) {
  if (!ticket || !Array.isArray(ticket.impacts)) return undefined
  const hit = ticket.impacts.find(item => item && typeof item.name === 'string' && item.name.includes('.'))
  return hit ? hit.name : undefined
}

export function createTools(config, deps) {
  const options = deps || {}
  const mock = createMockProvider()
  const resolveSecret = async ref => {
    if (!ref) return undefined
    const credentials = options.ctx && typeof options.ctx.get === 'function' ? options.ctx.get('credentials') : undefined
    if (credentials && typeof credentials.resolve === 'function') {
      try {
        const resolved = await credentials.resolve(ref)
        if (resolved && resolved.value) return resolved.value
      } catch { /* fall through to env */ }
    }
    return process.env[ref]
  }
  const transportOptions = {
    mock,
    timeoutMs: config.timeoutMs,
    retry: config.retry,
    maxDepth: config.maxDepth,
    maxNodes: config.maxNodes,
    resolveSecret,
    fetchImpl: options.fetchImpl,
    execFileImpl: options.execFileImpl
  }
  const devops = createDevops(config, transportOptions)
  const catalog = createCatalog(config, transportOptions)
  const devopsSource = config.devops.kind
  const catalogSource = config.catalog.kind

  function requireTicketId(args) {
    if (!args.ticketId) {
      throw Object.assign(new Error('devops 模式需要 ticketId'), {
        code: 'CONFIG', hint: '请提供需求单号，例如 REQ-3821。'
      })
    }
  }

  async function runRequirement(args, exec) {
    if (config.devops.kind !== 'mock') requireTicketId(args)
    const ticket = await devops.getTicket({ ...args, signal: exec.signal })
    return requirementPayload(ticket, { source: devopsSource, asOf: now() })
  }

  async function mockDesign(args, exec) {
    const design = await mock.getDesign(args)
    const targetTable = design.target.table
    const targetMeta = await mock.getTable({ table: targetTable })
    const sources = []
    for (const item of design.sources || []) {
      const meta = await mock.getTable({ table: item.table })
      sources.push({ ...item, owner: meta.owner, rowCount: meta.rowCount, updatedAt: meta.updatedAt })
    }
    const lineage = await mock.getLineage({ table: targetTable, direction: 'down', depth: 1 })
    return designPayload({
      ...design,
      target: { ...design.target, grain: design.target.grain || targetMeta.grain, partition: design.target.partition || targetMeta.partition },
      sources,
      impact: formatImpact(lineage, targetTable)
    }, { source: 'mock', asOf: now(), lineage })
  }

  async function realDesign(args, exec) {
    const ticket = args.ticketId ? await devops.getTicket({ ticketId: args.ticketId, signal: exec.signal }) : undefined
    const targetTable = args.targetTable || firstImpactTable(ticket)
    if (!targetTable) {
      throw Object.assign(new Error('需要 targetTable 或带目标表的需求单'), {
        code: 'CONFIG', hint: '在 devops 工单里关联目标表，或显式传 targetTable。'
      })
    }

    const gaps = []
    let targetMeta
    try {
      targetMeta = await catalog.getTable({ table: targetTable, signal: exec.signal })
    } catch (error) {
      gaps.push(gap('G-TARGET-META', '目标表元数据读取失败：' + error.message, 'warning', '检查 catalog 权限或表名。'))
    }

    let sourceTables = Array.isArray(args.sources) && args.sources.length > 0 ? args.sources.slice(0, 5) : []
    if (sourceTables.length === 0) {
      try {
        const up = await catalog.getLineage({ table: targetTable, direction: 'up', depth: 1, signal: exec.signal })
        sourceTables = up.nodes.filter(node => node.table !== targetTable).map(node => node.table).slice(0, 5)
      } catch (error) {
        gaps.push(gap('G-SOURCES', '来源表读取失败：' + error.message, 'warning', '显式传 sources 或检查血缘服务。'))
      }
    }
    if (sourceTables.length === 0) gaps.push(gap('G-SOURCES', '来源表待补充', 'warning', '显式传 sources 或在血缘系统登记上游。'))

    const metas = await Promise.allSettled(sourceTables.map(table => catalog.getTable({ table, signal: exec.signal })))
    const sources = sourceTables.map((table, index) => {
      const meta = metas[index].status === 'fulfilled' ? metas[index].value : undefined
      if (metas[index].status === 'rejected') {
        gaps.push(gap('G-SOURCE-' + index, table + ' 元数据读取失败', 'warning', '检查表名或 catalog 权限。'))
      }
      return {
        table,
        fields: meta && meta.columns ? meta.columns.slice(0, 5).map(column => column.name) : [],
        owner: meta && meta.owner,
        rowCount: meta && meta.rowCount,
        updatedAt: meta && meta.updatedAt
      }
    })

    let impact
    if (args.withImpact !== false) {
      try {
        const lineage = await catalog.getLineage({ table: targetTable, direction: 'down', depth: 1, signal: exec.signal })
        impact = formatImpact(lineage, targetTable)
      } catch (error) {
        gaps.push(gap('G-IMPACT', '下游影响读取失败：' + error.message, 'warning', '稍后重试或检查血缘服务。'))
      }
    }

    gaps.push(gap('G-STEPS', '加工逻辑待补充', 'warning', '由数据开发补充过滤/聚合/关联步骤。'))
    gaps.push(gap('G-SCHEDULE', '调度待补充', 'warning', '确认 cron、SLA 与上游依赖。'))
    gaps.push(gap('G-METRICS', '指标口径待补充', 'warning', '确认指标定义与 owner。'))

    return designPayload({
      status: 'draft',
      target: {
        table: targetTable,
        grain: (targetMeta && targetMeta.grain) || '待确认',
        partition: (targetMeta && targetMeta.partition) || '—'
      },
      sources,
      steps: [],
      schedule: {},
      metrics: [],
      impact
    }, { source: catalogSource, asOf: now(), gaps })
  }

  async function runDesign(args, exec) {
    if (config.devops.kind === 'mock' && config.catalog.kind === 'mock') return mockDesign(args, exec)
    return realDesign(args, exec)
  }

  async function runTable(args, exec) {
    const meta = await catalog.getTable({ table: args.table, signal: exec.signal })
    return tablePayload(meta, { source: catalogSource, asOf: now() })
  }

  async function runLineage(args, exec) {
    if (args.view || args.mode) return readLineageV2(args)
    const lineage = await catalog.getLineage({
      table: args.table,
      direction: args.direction || 'both',
      depth: args.depth || 1,
      signal: exec.signal
    })
    return lineagePayload(lineage, { source: catalogSource, asOf: now() })
  }

  async function runTechPlan(args) {
    const plan = await mock.getTechPlan(args)
    return techPlanPayload(plan, { source: 'mock', asOf: now() })
  }

  async function runEvidence(args) {
    if (args.resolution) return readEvidenceV2(args)
    const evidence = await mock.getEvidence(args)
    return evidencePayload(evidence, { source: 'mock', asOf: now() })
  }

  async function runDevelop(args) {
    return stagePayload(await mock.getDevelop(args), { source: 'mock', asOf: now() })
  }

  async function runTest(args) {
    return stagePayload(await mock.getTest(args), { source: 'mock', asOf: now() })
  }

  async function requestReleaseApproval(exec, release) {
    const ctx = options.ctx
    let approval
    try {
      approval = ctx && typeof ctx.get === 'function' ? ctx.get('approval') : undefined
    } catch {
      approval = undefined
    }
    if (!approval || typeof approval.request !== 'function') {
      return { outcome: 'unavailable', reason: 'approval service is not composed', decidedAt: now() }
    }
    if (!exec || !exec.agent) {
      return { outcome: 'unavailable', reason: 'release call has no agent for approval', decidedAt: now() }
    }
    try {
      const outcome = await approval.request({
        agent: exec.agent,
        toolName: 'dataops_cicd_release',
        ...(exec.callId ? { callId: exec.callId } : {}),
        reason: 'release ' + release.changeId + ' to ' + release.target + ' in window ' + release.window + '; rollback: ' + release.rollback,
        displayReason: {
          en: 'Allow this data release? ' + release.changeId + ' · ' + release.target + ' · ' + release.window,
          zh: '允许本次数据发布？' + release.changeId + ' · ' + release.target + ' · ' + release.window
        },
        ...(exec.signal ? { signal: exec.signal } : {})
      })
      if (outcome === 'allowed-once' || outcome === 'rejected' || outcome === 'cancelled' || outcome === 'unavailable') {
        return { outcome: outcome, decidedAt: now() }
      }
      return { outcome: 'unavailable', reason: 'unexpected approval outcome: ' + String(outcome), decidedAt: now() }
    } catch (error) {
      return { outcome: 'unavailable', reason: error && error.message ? error.message : String(error), decidedAt: now() }
    }
  }

  async function runRelease(args, exec) {
    const release = await mock.getRelease(args)
    const approval = await requestReleaseApproval(exec || {}, release)
    const executed = approval.outcome === 'allowed-once'
    const status = executed
      ? 'released'
      : approval.outcome === 'rejected'
        ? 'rejected'
        : approval.outcome === 'cancelled'
          ? 'cancelled'
          : approval.outcome === 'unavailable'
            ? 'blocked'
            : 'awaiting_approval'
    const payload = stagePayload({
      ...release,
      status: status,
      executed: executed,
      approval: approval,
      ...(executed ? { approvals: (release.approvals || []).map(item => ({ ...item, status: 'approved' })) } : {}),
      ...(!executed ? { gaps: [{ id: 'G-RELEASE-APPROVAL', message: approval.reason || 'release did not receive approval', severity: 'blocking', action: 'Obtain DSH approval before releasing.' }] } : {})
    }, { source: 'mock', asOf: now() })
    if (!executed && approval.outcome !== 'rejected' && approval.outcome !== 'cancelled') payload.partial = true
    return payload
  }

  async function runPostmortem(args) {
    return stagePayload(await mock.getPostmortem(args), { source: 'mock', asOf: now() })
  }

  async function runIncident(args) {
    return stagePayload(await mock.getIncident(args), { source: 'mock', asOf: now() })
  }

  async function runReadWorkitem(args) {
    return readWorkitem(config, args)
  }

  async function runUpdateWorkitem(args) {
    return updateWorkitem(config, args)
  }

  async function runReadLogs(args) {
    const scenario = args.scenario || 'channel-report'
    const sample = LOG_SCENARIOS[scenario] || LOG_SCENARIOS['channel-report']
    return {
      kind: 'logs',
      taskId: args.taskId || sample.taskId,
      timeRange: args.timeRange || sample.timeRange,
      generatedAt: now(),
      source: 'mock',
      events: sample.events,
      errorCodes: sample.errorCodes,
      upstream: sample.upstream,
      downstream: sample.downstream,
      recentRuns: sample.recentRuns,
      evidence: sample.evidence,
      note: '只读日志信号；根因由 pipeline-debug 技能结合证据判断。'
    }
  }

  async function runReadUs(args) {
    if (args && args.id) {
      const item = usDetail(args.id)
      if (!item) throw new Error('US not found: ' + args.id)
      const existing = findWorkitemBySource(config, item.source)
      return { kind: 'us', schemaVersion: 2, source: 'mock-edevops', asOf: US_AS_OF, mock: true, item: { ...item, existingWorkitem: existing ? existing.id : item.existingWorkitem || null } }
    }
    const items = listUs(args).map(item => {
      const source = { ...item.source, id: item.id }
      const existing = findWorkitemBySource(config, source)
      return { ...item, source, existingWorkitem: existing ? existing.id : item.existingWorkitem || null }
    })
    return { kind: 'us-picker', schemaVersion: 2, source: 'mock-edevops', asOf: US_AS_OF, mock: true, items, total: items.length }
  }

  async function runReadDatamap(args) {
    return readDatamap(args)
  }

  async function runEnsureWorkitem(args) {
    return ensureWorkitem(config, args)
  }

  async function runStage(args) {
    if (args.action === 'prepare') return stagePrepare(config, args)
    if (args.action === 'signoff') return stageSignoff(config, args)
    if (args.action === 'status') return readWorkitem(config, { id: args.id })
    if (args.action === 'complete') return stageComplete(config, args)
    throw new Error('stage: action must be prepare, signoff or status')
  }

  function validateDeliverable(args) {
    if (!args || typeof args !== 'object') throw new Error('present_deliverable: arguments must be an object')
    const kind = args.kind
    if (typeof kind !== 'string' || Object.prototype.hasOwnProperty.call(DELIVERABLE_KINDS, kind) === false) {
      throw new Error('present_deliverable: unsupported kind ' + String(kind))
    }
    const expectedStage = DELIVERABLE_KINDS[kind]
    if (args.stage !== expectedStage) {
      throw new Error('present_deliverable: stage ' + String(args.stage) + ' does not match kind ' + kind + ' (expected ' + expectedStage + ')')
    }
    const deliverable = args.deliverable
    if (typeof deliverable !== 'string' || !DELIVERABLE_PATH.test(deliverable) || deliverable.includes('..')) {
      throw new Error('present_deliverable: deliverable must be a safe deliverables/... path')
    }
    if (!args.payload || typeof args.payload !== 'object' || Array.isArray(args.payload)) {
      throw new Error('present_deliverable: payload must be a JSON object')
    }
    const bytes = Buffer.byteLength(JSON.stringify(args.payload), 'utf8')
    if (bytes > DELIVERABLE_MAX_BYTES) {
      throw new Error('present_deliverable: payload exceeds ' + DELIVERABLE_MAX_BYTES + ' bytes')
    }
    const status = args.status || 'draft'
    if (DELIVERABLE_STATUSES.indexOf(status) < 0) throw new Error('present_deliverable: unsupported status ' + status)
    const gaps = args.gaps || []
    if (!Array.isArray(gaps)) throw new Error('present_deliverable: gaps must be an array')
    return { kind, stage: expectedStage, deliverable, status, gaps }
  }

  async function runPresentDeliverable(args) {
    const checked = validateDeliverable(args)
    return {
      ...args.payload,
      kind: checked.kind,
      stage: checked.stage,
      deliverable: checked.deliverable,
      status: checked.status,
      source: typeof args.source === 'string' && args.source ? args.source : 'agent',
      asOf: typeof args.asOf === 'string' && args.asOf ? args.asOf : now(),
      gaps: checked.gaps,
      partial: checked.gaps.length > 0,
      presented: true
    }
  }

  async function runProfile(args) {
    return stagePayload(buildProfile(args), { source: 'mock', asOf: now() })
  }

  async function runAnalysis(args) {
    return stagePayload(buildAnalysis(args), { source: 'mock', asOf: now() })
  }

  async function runSolution(args) {
    return stagePayload(buildSolution(args), { source: 'mock', asOf: now() })
  }

  async function runScan(args) {
    return stagePayload(buildScan(args), { source: 'mock', asOf: now() })
  }

  async function runCompile(args) {
    return stagePayload(buildSchedule(args), { source: 'mock', asOf: now() })
  }

  const tools = [
    textTool({
      name: 'dataops_requirement_extract_spec',
      description: '从 devops 读取需求单并整理成 requirement 产物（目标、范围、验收标准、影响资产）。有单号时必须传 ticketId；返回结构化 JSON，客户端渲染成需求卡。',
      parameters: parameterRoot({
        ticketId: { type: 'string', description: '需求单号，例如 REQ-3821。' },
        scenario: SCENARIO
      }),
      execute: runRequirement,
      summary: value => '需求 ' + value.id + '：' + value.title + '（验收 ' + value.acceptance.length + ' 条，影响 ' + value.impacts.length + ' 个资产' + (value.partial ? ' · 有缺口' : '') + '）'
    }),
    textTool({
      name: 'dataops_design_compose_model',
      description: '基于需求单和数据目录生成数据设计：目标表、粒度、来源字段、调度与下游影响。可传 ticketId 或 targetTable；返回 design JSON，客户端渲染成设计卡。',
      parameters: parameterRoot({
        ticketId: { type: 'string', description: '需求单号；用于读取需求和目标表。' },
        targetTable: { type: 'string', description: '目标表名；省略时取需求单里的第一个表资产。' },
        sources: { type: 'array', items: { type: 'string' }, description: '来源表列表；省略时取血缘上游。' },
        withImpact: { type: 'boolean', description: '是否查询下游影响，默认 true。' },
        scenario: SCENARIO
      }),
      execute: runDesign,
      summary: value => '数据设计：' + value.target.table + '｜粒度 ' + value.target.grain + '｜' + value.sources.length + ' 个来源｜影响 ' + (value.impact ? value.impact.count : 0) + ' 个下游' + (value.partial ? ' · 有缺口' : '')
    }),
    textTool({
      name: 'dataops_shared_read_table',
      description: '读取一张表的元数据卡：owner、分层、粒度、分区、行数、字段。用于确认来源或目标表结构；返回 table JSON，客户端渲染成表卡。',
      parameters: parameterRoot({
        table: { type: 'string', description: '表名，例如 dwd.orders。' }
      }),
      execute: runTable,
      summary: value => '表 ' + value.table + '：' + value.owner + ' · ' + value.layer + ' · ' + value.columns.length + ' 个字段'
    }),
    textTool({
      name: 'dataops_shared_read_lineage',
      description: '查询表级血缘：上游来源或下游影响。depth 最大 3；返回 lineage JSON，客户端渲染成血缘卡。',
      parameters: parameterRoot({
        table: { type: 'string', description: '表名，例如 dws.trade_channel_daily。' },
        direction: { type: 'string', enum: ['up', 'down', 'both'], description: '查询方向，默认 both。' },
        depth: { type: 'number', description: '层级，1-3，默认 1。' },
        view: { type: 'string', enum: ['design', 'production', 'schedule'] },
        mode: { type: 'string', enum: ['observed', 'planned', 'diff'] }
      }),
      execute: runLineage,
      summary: value => '血缘 ' + value.table + '：' + value.nodes.length + ' 个节点 / ' + value.edges.length + ' 条边' + (value.truncated ? '（已截断）' : '')
    }),
    textTool({
      name: 'dataops_scheme_compose_tech_plan',
      description: '把设计映射成平台任务（建模、ETL、调度）、工时与风险。返回 tech_plan JSON，客户端渲染成技术方案卡。',
      parameters: parameterRoot({ scenario: SCENARIO }),
      execute: runTechPlan,
      summary: value => '技术方案：' + value.tasks.length + ' 个任务｜' + value.estimate
    }),
    textTool({
      name: 'dataops_shared_read_evidence',
      description: '返回一条带查询、时间范围、环境、扫描成本的证据记录，用于复核结论。任何数字结论都应附带一条证据。',
      parameters: parameterRoot({ scenario: SCENARIO, resolution: { type: 'string', enum: ['pending', 'closed'] } }),
      execute: runEvidence,
      summary: value => '证据：' + value.claim + '（' + value.env + ' · ' + value.cost + '）'
    }),
    textTool({
      name: 'dataops_shared_read_profile',
      description: '共享事实：读取表的数据画像（行数、空值、重复、候选键、join 覆盖），用于方案阶段的数据挖掘。只读，返回 profile JSON。',
      parameters: parameterRoot({ table: { type: 'string', description: '表名，例如 dwd.orders。' }, scenario: SCENARIO }),
      execute: runProfile,
      summary: value => '画像 ' + value.table + '：' + value.rowCount + ' 行 · 候选键 ' + (value.candidateKeys || []).join(', ')
    }),
    textTool({
      name: 'dataops_scheme_analyze_data',
      description: '方案·数据分析：把画像/证据整理成基线、差异、发现与结论；返回 analysis JSON，客户端渲染成分析卡。只读。',
      parameters: parameterRoot({ scenario: SCENARIO }),
      execute: runAnalysis,
      summary: value => '分析：' + value.question + '｜' + (value.findings || []).length + ' 个发现'
    }),
    textTool({
      name: 'dataops_scheme_compose_solution',
      description: '方案·需求方案设计：基于需求/设计/分析产出范围、决策、替代方案与验收映射；返回 solution JSON。',
      parameters: parameterRoot({ scenario: SCENARIO }),
      execute: runSolution,
      summary: value => '需求方案：' + value.target + '｜' + (value.decisions || []).length + ' 个决策'
    }),
    textTool({
      name: 'dataops_develop_generate_code',
      description: '推进到开发阶段：返回任务拆解、分支、运行记录与阻塞项。用于 6 阶段演示，也用于确认真实开发进度。返回 develop JSON，客户端渲染开发卡。',
      parameters: parameterRoot({ scenario: SCENARIO }),
      execute: runDevelop,
      summary: value => '开发：' + value.target + '｜' + value.tasks.length + ' 个任务｜阻塞 ' + (value.blockers || []).length + ' 项'
    }),
    textTool({
      name: 'dataops_cicd_scan',
      description: 'CICD·扫描：对 SQL/调度/密钥做规范与安全扫描，返回 cicd JSON（phase=scan）。mock 只读。',
      parameters: parameterRoot({ scenario: SCENARIO }),
      execute: runScan,
      summary: value => '扫描：' + value.status + '｜错误 ' + value.summary.errors + '｜警告 ' + value.summary.warnings
    }),
    textTool({
      name: 'dataops_cicd_compile',
      description: 'CICD·编译：mock 返回内部 CLI dataops compile 的编译产物（schedule YAML + diagnostics）；真实模式只调用 CLI，不回调 Agent。',
      parameters: parameterRoot({ scenario: SCENARIO }),
      execute: runCompile,
      summary: value => '编译：' + value.status + '｜' + value.dialect + '｜' + (value.diagnostics || []).length + ' 条诊断'
    }),
    textTool({
      name: 'dataops_cicd_test',
      description: '推进到测试阶段：返回对账、唯一性、质量、SLA 用例与结论。返回 test JSON，客户端渲染测试卡。',
      parameters: parameterRoot({ scenario: SCENARIO }),
      execute: runTest,
      summary: value => '测试：' + value.conclusion + '｜差异 ' + value.summary.diff + '｜SLA ' + value.summary.sla
    }),
    textTool({
      name: 'dataops_cicd_release',
      description: '推进到发布阶段：执行前请求 DSH 原生审批；只有 allowed-once 才返回 released，其他情况返回 blocked/rejected/cancelled，不执行发布。返回 release JSON。',
      parameters: parameterRoot({ scenario: SCENARIO }),
      execute: runRelease,
      summary: value => '发布：' + value.changeId + '｜' + value.status + '｜窗口 ' + value.window
    }),
    textTool({
      name: 'dataops_review_write_postmortem',
      description: '推进到复盘阶段：返回目标/实际指标、问题与行动项。返回 postmortem JSON，客户端渲染复盘卡。',
      parameters: parameterRoot({ scenario: SCENARIO }),
      execute: runPostmortem,
      summary: value => '复盘：' + value.target + '｜' + value.metrics.length + ' 个指标｜' + value.actions.length + ' 个行动项'
    }),
    textTool({
      name: 'dataops_incident_triage',
      description: '排障场景：返回故障时间线、根因、影响面、处置动作与证据。返回 incident JSON，客户端渲染排障卡。',
      parameters: parameterRoot({ scenario: SCENARIO }),
      execute: runIncident,
      summary: value => '排障：' + value.title + '｜' + value.severity + '｜' + value.status
    }),
    textTool({
      name: 'dataops_shared_read_develop',
      description: '读取 mock 开发验证事实：多产物清单、build/scan/deploy/test attempt、SE/Committer 状态；传 workitemId 会写入 mock 多产物文件。',
      parameters: parameterRoot({ workitemId: { type: 'string', description: '可选：把 mock 多产物写到该 workitem。' } }),
      execute: async args => {
        const value = { ...DEVELOP, workitemMode: 'mock' }
        if (args.workitemId) value.materialized = buildDevelopArtifacts(resolve(config.workitemsDir), args.workitemId)
        return value
      },
      summary: value => '开发验证：' + value.target + '｜' + value.artifacts.length + ' 个产物'
    }),
    textTool({
      name: 'dataops_cicd_pipeline',
      description: '触发/读取一条 mock 数据 CICD pipeline：build/scan/test/package、制品包 manifest/checksum、外部环境只读状态；不执行真实部署。',
      parameters: parameterRoot({ workitemId: { type: 'string', description: '可选：完成后把 workitem cicd 阶段标为 done。' } }),
      execute: async args => {
        const value = { ...CICD_PIPELINE, mock: true }
        if (args.workitemId) {
          value.artifact = buildPipelinePackage(resolve(config.workitemsDir), args.workitemId, { target: value.target, commit: value.commit })
          value.workitem = stageComplete(config, { id: args.workitemId })
        }
        return value
      },
      summary: value => 'CICD：' + value.pipelineRunId + '｜' + value.status + '｜' + value.artifact.package
    }),
    textTool({
      name: 'dataops_shared_present_deliverable',
      description: '展示桥：校验阶段交付物的 kind/stage/deliverable/payload，平铺 payload 返回给 DeliverableRenderer；不生成内容、不审批、不写工作项。',
      parameters: parameterRoot({
        kind: { type: 'string', enum: Object.keys(DELIVERABLE_KINDS) },
        stage: { type: 'string', enum: ['requirement', 'design', 'scheme', 'develop', 'cicd', 'review', 'incident'] },
        deliverable: { type: 'string', description: '安全相对路径，例如 deliverables/tech-plan.yaml；兼容旧 artifacts/ 读取。' },
        status: { type: 'string', enum: DELIVERABLE_STATUSES },
        payload: { type: 'object', description: '交付物结构化内容，按 kind 交给现有卡片。' },
        source: { type: 'string' },
        asOf: { type: 'string' },
        gaps: { type: 'array', items: { type: 'object' } }
      }),
      execute: runPresentDeliverable,
      summary: value => '交付物：' + value.kind + '｜' + value.deliverable + '｜' + value.status
    }),
    textTool({
      name: 'dataops_shared_read_workitem',
      description: '读取工作项：返回 item.yaml 的阶段、交付物、证据、缺口和审批；不传 id 时列出可用工作项。',
      parameters: parameterRoot({
        id: { type: 'string', description: '工作项目录名，例如 2026-10-26-channel-report-pay-caliber。' }
      }),
      execute: runReadWorkitem,
      summary: value => value.kind === 'workitem-list' ? '工作项：' + value.items.length + ' 个' : '工作项：' + value.id + '｜' + value.stage + '｜' + value.status
    }),
    textTool({
      name: 'dataops_shared_update_workitem',
      description: '更新工作项：校验 stage/status/交付物路径后原子写 item.yaml，并在 plan.md 追加一行；dryRun 只预览不落盘。',
      parameters: parameterRoot({
        id: { type: 'string' },
        patch: { type: 'object', description: '允许 stage/substage/status/stages/next/gaps/approvals/deliverables/evidence。' },
        dryRun: { type: 'boolean', description: '只校验并返回预览，不写 item.yaml/plan.md。' }
      }),
      execute: runUpdateWorkitem,
      summary: value => '工作项更新：' + value.id + '｜' + value.stage + '｜' + value.status + (value.dryRun ? '（dryRun）' : '')
    }),
    textTool({
      name: 'dataops_shared_read_logs',
      description: '排障只读信号：返回时间线、错误码、上下游和最近运行；不替 Agent 下根因结论。',
      parameters: parameterRoot({
        scenario: SCENARIO,
        taskId: { type: 'string' },
        timeRange: { type: 'string', description: '可选时间范围；mock 下列表会回填样例范围。' }
      }),
      execute: runReadLogs,
      summary: value => '日志：' + value.taskId + '｜' + value.errorCodes.join(', ')
    }),
    textTool({
      name: 'dataops_shared_read_us',
      description: 'US 接单：按 id 返回 US 详情，不传 id 返回当前 BA 待处理 US 列表；只读，不写 US 状态。',
      parameters: parameterRoot({
        id: { type: 'string' },
        statuses: { type: 'array', items: { type: 'string' } },
        assignee: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'number' }
      }),
      execute: runReadUs,
      summary: value => value.kind === 'us' ? 'US：' + value.item.id + '｜' + value.item.status : '待我处理 US：' + value.items.length + ' 条'
    }),
    textTool({
      name: 'dataops_shared_read_datamap',
      description: 'DataMap 寻源：返回场景→主题→业务对象→逻辑实体→物理资产、字段/owner/行数/assetType；不含血缘和深度质量。',
      parameters: parameterRoot({ usId: { type: 'string' }, scenario: { type: 'string' }, asset: { type: 'string' } }),
      execute: runReadDatamap,
      summary: value => 'DataMap：' + value.assets.length + ' 个资产｜' + value.scenario.name
    }),
    textTool({
      name: 'dataops_shared_ensure_workitem',
      description: '按 source.system + source.id 去重创建/恢复工作项；不覆盖已有工作项。',
      parameters: parameterRoot({
        source: { type: 'object', description: '至少包含 system/id；可选 type/url/status_at_intake。' },
        title: { type: 'string' },
        initialStage: { type: 'string', enum: ['requirement', 'design', 'scheme', 'develop', 'cicd', 'review'] },
        owner: { type: 'string' },
        requester: { type: 'string' },
        assets: { type: 'array', items: { type: 'string' } },
        acceptance: { type: 'array', items: { type: 'string' } },
        next: { type: 'string' }
      }),
      execute: runEnsureWorkitem,
      summary: value => '工作项：' + value.workitem.id + '｜' + (value.created ? '新建' : '恢复')
    }),
    textTool({
      name: 'dataops_shared_stage',
      description: '阶段运行时：prepare 写交付物并更新 workitem；signoff 记录 UI 签收并推进 stage；status 读取工作项。',
      parameters: parameterRoot({
        action: { type: 'string', enum: ['prepare', 'signoff', 'status', 'complete'] },
        id: { type: 'string' },
        kind: { type: 'string', enum: ['intake', 'requirement', 'design', 'analysis', 'solution', 'tech_plan', 'develop', 'cicd', 'postmortem', 'incident'] },
        stage: { type: 'string', enum: ['requirement', 'design', 'scheme', 'develop', 'cicd', 'review', 'incident'] },
        substage: { type: 'string', enum: ['analysis', 'solution', 'tech_plan'] },
        deliverable: { type: 'string' },
        payload: { type: 'object' },
        status: { type: 'string' },
        gaps: { type: 'array', items: { type: 'object' } },
        next: { type: 'string' },
        gate: { type: 'string', enum: ['requirement', 'design', 'scheme.analysis', 'scheme.solution', 'scheme.tech_plan', 'develop.code_review', 'develop.merge'] },
        role: { type: 'string', enum: ['BA', 'requester', 'SE', 'Dev', 'Committer'] },
        actor: { type: 'string' },
        via: { type: 'string', enum: ['ui'] },
        actionId: { type: 'string' },
        comment: { type: 'string' }
      }),
      execute: runStage,
      summary: value => value.action === 'signoff' || value.gateStatus
        ? '阶段签收：' + (value.id || '') + '｜' + (value.gateStatus || '') + (value.advanced ? '｜进入 ' + value.advanced : '')
        : '阶段交付：' + (value.kind || '') + '｜' + (value.workitemId || value.id || '')
    })
  ]
  const disabled = new Set(config.disabledTools || [])
  return disabled.size ? tools.filter(tool => !disabled.has(tool.name)) : tools
}

export const TOOLS = createTools(normalizeConfig({}), {})

export function apply(ctx, config) {
  const tools = createTools(normalizeConfig(config), { ctx })
  for (const tool of tools) ctx.tools.register(tool)
}
