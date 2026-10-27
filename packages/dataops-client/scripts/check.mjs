// Offline checks for the dataops client: cards, stores, brief and tabs.
import { createDataopsCards } from '../src/cards.js'
import { createStageStore } from '../src/stage-store.js'
import { createContextStore } from '../src/context-store.js'
import { createDataopsTabs } from '../src/tabs.js'
import { createStageBrief } from '../src/brief.js'

const React = {
  createElement(type, props, ...children) {
    return { type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }
  },
  useEffect(fn) { fn() },
  useState: value => [value, () => {}],
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot()
}

const Cards = createDataopsCards(React)
const StageStore = createStageStore()
const ContextStore = createContextStore()
const Tabs = createDataopsTabs(React, ContextStore)
const Brief = createStageBrief(React, StageStore, ContextStore)

const results = []
const checks = []
const check = (name, fn) => { checks.push([name, fn]) }
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const text = node => {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(text).join('')
  if (typeof node.type === 'function') return text(node.type(node.props))
  return text(node.props.children)
}
const block = payload => ({ content: [{ type: 'text', text: '前面的说明文字' }, { type: 'text', text: JSON.stringify(payload) }] })

check('design card renders grain, sources, impact and schedule', () => {
  const body = text(Cards.DesignCard({
    block: block({
      kind: 'design',
      target: { table: 'dws.trade_channel_daily', grain: '渠道 × 日期', partition: 'dt' },
      sources: [{ table: 'dwd.orders' }, { table: 'dim.channel' }],
      steps: [{ title: '过滤有效订单', logic: "status in ('paid')" }],
      schedule: { cron: '0 3 * * *', sla: '05:00' },
      metrics: [{ name: 'order_cnt', definition: '支付订单数' }],
      impact: { count: 3, top: [], truncated: false },
      source: 'catalog', asOf: '2026-10-25 10:00', partial: true,
      gaps: [{ id: 'G-STEPS', message: '加工逻辑待补充', severity: 'warning' }],
      status: 'draft'
    })
  }))
  assert(body.includes('dws.trade_channel_daily'), 'missing target table')
  assert(body.includes('渠道 × 日期'), 'missing grain')
  assert(body.includes('dwd.orders') && body.includes('dim.channel'), 'missing sources')
  assert(body.includes('0 3 * * *'), 'missing schedule')
  assert(body.includes('影响 3 个下游'), 'missing impact')
  assert(body.includes('待补充'), 'missing gaps')
  assert(body.includes('2026-10-25 10:00'), 'missing asOf')
})

check('requirement card renders source, owner and gaps', () => {
  const body = text(Cards.RequirementCard({
    block: block({
      kind: 'requirement', id: '需求 #3821', title: '渠道日报改造',
      goal: '改为支付口径', scope: 'dws.trade_channel_daily',
      acceptance: ['差异 < 0.5%'], impacts: ['报表 · ads.channel_report'],
      owner: '交易组', status: '进行中', source: 'devops', asOf: '2026-10-25 09:30',
      partial: true, gaps: [{ id: 'G-IMPACT', message: '影响资产未登记', severity: 'warning' }]
    })
  }))
  assert(body.includes('渠道日报改造'), 'missing title')
  assert(body.includes('交易组'), 'missing owner')
  assert(body.includes('影响资产未登记'), 'missing gap')
  assert(body.includes('devops'), 'missing source')
})

check('table card renders metadata and columns', () => {
  const body = text(Cards.TableCard({
    block: block({
      kind: 'table', table: 'dwd.orders', owner: '交易组', layer: 'dwd', grain: '订单',
      partition: 'dt', rowCount: 2000000, source: 'catalog', asOf: '2026-10-25 10:00',
      columns: [{ name: 'order_id', type: 'string', comment: '订单号' }, { name: 'amount', type: 'decimal' }],
      partial: false, gaps: []
    })
  }))
  assert(body.includes('dwd.orders') && body.includes('2000000'), 'table meta')
  assert(body.includes('order_id') && body.includes('订单号'), 'columns')
})

check('lineage card renders direction and nodes', () => {
  const body = text(Cards.LineageCard({
    block: block({
      kind: 'lineage', table: 'dws.trade_channel_daily', direction: 'down', depth: 1,
      nodes: [{ table: 'dws.trade_channel_daily', type: 'table' }, { table: 'ads.channel_report', type: 'report' }],
      edges: [{ from: 'dws.trade_channel_daily', to: 'ads.channel_report', kind: 'report' }],
      source: 'catalog', asOf: '2026-10-25 10:00', truncated: false, partial: false, gaps: []
    })
  }))
  assert(body.includes('下游'), 'direction')
  assert(body.includes('ads.channel_report'), 'downstream node')
})

check('evidence card keeps query, cost and provenance', () => {
  const body = text(Cards.EvidenceCard({
    block: block({
      kind: 'evidence', claim: '日均 200 万行', env: 'prod 只读',
      query: 'SELECT count(*) FROM dwd.orders', timeRange: '2026-10-18 ~ 2026-10-24',
      asOf: '2026-10-25 09:28', cost: '1.2 GB · 3.4s', source: 'mock'
    })
  }))
  assert(body.includes('SELECT count(*)'), 'missing query')
  assert(body.includes('1.2 GB'), 'missing cost')
})

check('profile card renders keys and join coverage', () => {
  const body = text(Cards.ProfileCard({
    block: block({ kind: 'profile', table: 'dwd.orders', grain: '订单', rowCount: 2000000, candidateKeys: ['order_id'], joinCoverage: [{ from: 'dwd.orders.channel_id', to: 'dim.channel.channel_id', coverage: '99.98%' }], columns: [{ name: 'order_id', type: 'string', nullRate: '0%', distinct: 1980000 }], findings: ['order_id 唯一'], source: 'mock', asOf: '2026-10-26 10:00' })
  }))
  assert(body.includes('数据画像') && body.includes('订单'), 'profile basics')
  assert(body.includes('order_id') && body.includes('99.98%'), 'profile keys/join')
})

check('analysis and solution cards render findings/decisions', () => {
  const analysis = text(Cards.AnalysisCard({
    block: block({ kind: 'analysis', question: '口径是否可比', baseline: [{ metric: '差异', before: '1', after: '0.8', delta: '-0.2' }], findings: [{ title: '差异来自未支付', detail: '过滤 pending', severity: 'info' }], conclusion: '先补映射', source: 'mock', asOf: '2026-10-26 10:00' })
  }))
  assert(analysis.includes('口径是否可比') && analysis.includes('差异来自未支付'), 'analysis card')
  const solution = text(Cards.SolutionCard({
    block: block({ kind: 'solution', target: 'dws.x', scope: '只改口径', decisions: [{ decision: '过滤支付订单', reason: '财务口径' }], alternatives: [{ option: '改上游', tradeoff: '影响大' }], source: 'mock', asOf: '2026-10-26 10:00' })
  }))
  assert(solution.includes('只改口径') && solution.includes('过滤支付订单'), 'solution card')
})

check('cicd scan and schedule compile cards render', () => {
  const scan = text(Cards.CicdCard({
    block: block({ kind: 'cicd', phase: 'scan', runId: 'CICD-1', status: 'pass', checks: [{ name: 'SQL 规范', status: 'pass', detail: 'ok' }], summary: { errors: 0, warnings: 0 }, source: 'mock', asOf: '2026-10-26 10:00' })
  }))
  assert(scan.includes('CICD') && scan.includes('SQL 规范'), 'scan card')
  const schedule = text(Cards.ScheduleCard({
    block: block({ kind: 'schedule', status: 'validated', dialect: 'mock-cli', yaml: 'apiVersion: dataops/v1\nkind: ScheduleSpec', diagnostics: [{ severity: 'warning', code: 'W-1', message: '补映射' }], compile: { command: 'dataops compile x', exitCode: 0, durationMs: 12 }, source: 'mock', asOf: '2026-10-26 10:00' })
  }))
  assert(schedule.includes('schedule.yaml') && schedule.includes('apiVersion'), 'schedule card')
  assert(schedule.includes('W-1') && schedule.includes('dataops compile'), 'schedule diagnostics')
})

check('release card distinguishes awaiting, rejected and executed', () => {
  const base = { kind: 'release', changeId: 'CHG-1', target: 'dws.x', window: '04:00-05:00', strategy: '灰度', steps: ['预发'], rollback: '切回 v1', approvals: [{ role: '数据负责人', status: 'pending' }], source: 'mock', asOf: '2026-10-25 15:30' }
  const awaiting = text(Cards.ReleaseCard({ block: block({ ...base, status: 'awaiting_approval', executed: false, approval: { outcome: 'unavailable', reason: 'approval service is not composed' } }) }))
  assert(awaiting.includes('待审批') && awaiting.includes('未执行'), 'awaiting release')
  const rejected = text(Cards.ReleaseCard({ block: block({ ...base, status: 'rejected', executed: false, approval: { outcome: 'rejected' } }) }))
  assert(rejected.includes('已拒绝') && rejected.includes('未执行'), 'rejected release')
  const released = text(Cards.ReleaseCard({ block: block({ ...base, status: 'released', executed: true, approval: { outcome: 'allowed-once' } }) }))
  assert(released.includes('已执行') && released.includes('已提交发布'), 'released card')
})

check('deliverable renderer dispatches by kind', () => {
  const tech = text(Cards.DeliverableRenderer({
    block: block({ kind: 'tech_plan', stage: 'scheme', deliverable: 'deliverables/tech-plan.yaml', status: 'draft', tasks: [{ platform: 'ETL', name: '订单过滤' }], estimate: '1 人日', risks: [], source: 'agent', asOf: '2026-10-26 18:00' })
  }))
  assert(tech.includes('技术方案') && tech.includes('订单过滤'), 'tech_plan dispatch')
  const req = text(Cards.DeliverableRenderer({
    block: block({ kind: 'requirement', stage: 'requirement', deliverable: 'deliverables/requirement.yaml', status: 'draft', id: '需求 #1', title: '渠道日报', goal: '改口径', scope: 'dws', acceptance: [], impacts: [], owner: '交易组', source: 'agent', asOf: '2026-10-26 18:00' })
  }))
  assert(req.includes('渠道日报'), 'requirement dispatch')
  const pm = text(Cards.DeliverableRenderer({
    block: block({ kind: 'postmortem', stage: 'review', deliverable: 'deliverables/postmortem.yaml', target: '渠道日报支付口径', summary: '差异 0.12%', metrics: [], issues: [], actions: [], source: 'agent', asOf: '2026-10-26 22:00' })
  }))
  assert(pm.includes('复盘') && pm.includes('差异 0.12%'), 'postmortem dispatch')
})

check('malformed payload falls back instead of throwing', () => {
  const body = text(Cards.DesignCard({ block: { content: [{ type: 'text', text: 'not json' }] } }))
  assert(body.includes('not json'), 'fallback should show raw text')
})

check('styling literals appear only as token fallbacks', () => {
  let css = ''
  Cards.installStyles({
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, textContent: '' }),
    head: { appendChild: node => { css = node.textContent } }
  })
  assert(css.includes('--dsw-alias-'), 'css does not use DSH semantic tokens')
  const withoutVars = css.replace(/var\([^)]*\)/gu, '')
  assert(!/#[0-9a-f]{3,8}\b/iu.test(withoutVars), 'literal color outside a token fallback')
})

check('stage store publishes and notifies per session', () => {
  let hits = 0
  const off = StageStore.subscribe(() => { hits++ })
  StageStore.set('s1', { label: '设计', tone: 'brand' })
  StageStore.set('s2', { label: '排障', tone: 'warn' })
  assert(StageStore.get('s1').label === '设计', 'missing s1 stage')
  assert(StageStore.get('s2').label === '排障', 'missing s2 stage')
  assert(hits === 2, 'subscribers did not fire per set')
  off()
  StageStore.set('s1', { label: '方案', tone: 'brand' })
  assert(hits === 2, 'unsubscribe did not detach')
})

check('context store keeps the latest payload per kind and session', () => {
  ContextStore.ingest('s1', { kind: 'design', target: { table: 'dws.x' } })
  ContextStore.ingest('s1', { kind: 'table', table: 'dws.x', columns: [] })
  ContextStore.ingest('s2', { kind: 'lineage', table: 'dwd.y', nodes: [] })
  const s1 = ContextStore.get('s1')
  assert(s1.design.target.table === 'dws.x', 'design slice')
  assert(s1.table.table === 'dws.x', 'table slice')
  assert(ContextStore.get('s2').lineage.table === 'dwd.y', 'per-session isolation')
  ContextStore.ingest('s1', { kind: 'design', target: { table: 'dws.v2' } })
  ContextStore.ingest('s1', { kind: 'table', table: 'dws.v2', columns: [] })
  assert(ContextStore.get('s1').design.target.table === 'dws.v2', 'latest wins')
})

check('turn brief maps tool payload and ingests context', () => {
  const brief = Brief._internals.briefFrom({ kind: 'design', status: 'draft', target: { table: 'dws.x' } })
  assert(brief.index === 2 && brief.total === 6, 'wrong stage index')
  assert(brief.next === '进入方案', 'wrong next step')
  const payloads = {
    design: { kind: 'design', target: { table: 'dws.x' }, sources: [], steps: [] },
    table: { kind: 'table', table: 'dws.x', columns: [] }
  }
  text(Brief.TurnTail({ brief, payloads, sessionId: 's-brief' }))
  const body = text(Brief.StageNavigator({ payloads, sessionId: 's-brief' }))
  assert(body.includes('阶段简报'), 'missing brief title')
  assert(body.includes('设计'), 'missing current stage')
  assert(ContextStore.get('s-brief').table.table === 'dws.x', 'context was not ingested')
  assert(StageStore.get('s-brief').label === '设计', 'stage was not published')
})

check('turn definition publishes a numeric turn', () => {
  const def = Brief.definition()
  def.match({ type: 'turn/start', data: { turn: 2 } })
  const state = def.start()
  const event = {
    type: 'tool/result',
    data: { message: { content: block({ kind: 'requirement', artifact: 'requirement.yaml' }).content } }
  }
  const updated = def.update({ state }, { event })
  const location = def.buildLocationData({ state: updated }, 'turn', null)
  assert(location && location.kind === 'turn', 'missing turn location')
  assert(location.turn === 2 && Number.isSafeInteger(location.turn), 'turn must be a safe integer')
  assert(location.value.brief.index === 1, 'requirement should be stage 1')
})

check('six-stage cards render their key facts', () => {
  const develop = text(Cards.DevelopCard({
    block: block({ kind: 'develop', target: 'dws.x', status: 'running', branch: 'feature/x', tasks: [{ name: '过滤订单', status: 'done', progress: 100, owner: '交易组' }], blockers: [{ message: '维表待发布' }], source: 'mock', asOf: '2026-10-25 14:20' })
  }))
  assert(develop.includes('开发') && develop.includes('过滤订单') && develop.includes('维表待发布'), 'develop card')
  const test = text(Cards.TestCard({
    block: block({ kind: 'test', conclusion: 'pass', status: 'passed', target: 'dws.x', summary: { diff: '0.12%', quality: '99.98%', performance: '38s', sla: '04:40' }, cases: [{ name: '主键唯一', type: '唯一性', status: 'pass', detail: '0 重复' }], source: 'mock', asOf: '2026-10-25 15:10' })
  }))
  assert(test.includes('测试') && test.includes('0.12%') && test.includes('主键唯一'), 'test card')
  const release = text(Cards.ReleaseCard({
    block: block({ kind: 'release', changeId: 'CHG-1', target: 'dws.x', window: '04:00-05:00', strategy: '灰度', steps: ['预发'], rollback: '切回 v1', approvals: [{ role: '数据负责人', status: 'approved' }], source: 'mock', asOf: '2026-10-25 15:30' })
  }))
  assert(release.includes('CHG-1') && release.includes('切回 v1'), 'release card')
  const postmortem = text(Cards.PostmortemCard({
    block: block({ kind: 'postmortem', target: 'dws.x', summary: '按时上线', metrics: [{ name: '差异', target: '<0.5%', actual: '0.12%' }], issues: [{ title: '空渠道', severity: 'P2' }], actions: [{ owner: '交易组', action: '补映射', due: '2026-11-01' }], source: 'mock', asOf: '2026-10-27 10:00' })
  }))
  assert(postmortem.includes('复盘') && postmortem.includes('0.12%') && postmortem.includes('补映射'), 'postmortem card')
})

check('incident card renders timeline, cause and evidence', () => {
  const body = text(Cards.IncidentCard({
    block: block({
      kind: 'incident', title: '渠道日报任务失败', severity: 'P1', status: '处理中', target: 'dws.x',
      startedAt: '03:12', symptom: '下游报表未产出', timeline: [{ time: '03:12', event: '任务失败' }, { time: '03:40', event: '补数提交' }],
      cause: '上游分区未产出', impact: { count: 3, top: [] }, actions: [{ action: '重跑上游', owner: '交易组', status: '进行中' }],
      evidence: { query: 'select count(*) from dwd.orders', timeRange: '2026-10-25', env: 'prod 只读', cost: '2.8s' },
      source: 'mock', asOf: '2026-10-25 03:45'
    })
  }))
  assert(body.includes('排障') && body.includes('任务失败') && body.includes('03:40'), 'incident timeline')
  assert(body.includes('上游分区未产出') && body.includes('重跑上游'), 'incident cause/actions')
})

check('design canvas and artifact modal render', () => {
  const design = { target: { table: 'dws.x', grain: '渠道 × 日期', partition: 'dt' }, sources: [{ table: 'dwd.orders', owner: '交易组' }], steps: [{ title: '过滤', logic: 'status = paid' }] }
  const canvas = text(Cards._internals.DesignCanvas({ open: true, onClose: () => {}, design }))
  assert(canvas.includes('dwd.orders') && canvas.includes('dws.x') && canvas.includes('过滤'), 'canvas content')
  const artifact = text(Cards._internals.ArtifactModal({ open: true, onClose: () => {}, artifact: 'design.yaml', value: design }))
  assert(artifact.includes('design.yaml') && artifact.includes('dwd.orders'), 'artifact content')
})

check('stage and incident briefs map to the right step', () => {
  assert(Brief._internals.briefFrom({ kind: 'develop' }).index === 4, 'develop stage')
  assert(Brief._internals.briefFrom({ kind: 'test' }).index === 5, 'test stage')
  assert(Brief._internals.briefFrom({ kind: 'release' }).index === 5, 'release stage')
  assert(Brief._internals.briefFrom({ kind: 'postmortem' }).index === 6, 'postmortem stage')
  const incident = Brief._internals.briefFrom({ kind: 'incident', status: '处理中', target: 'dws.x', artifact: 'incident.yaml' })
  assert(incident.total === 0 && incident.label === '排障', 'incident brief')
  const body = text(Brief.TurnTail({ brief: incident, payloads: { incident: { kind: 'incident', target: 'dws.x' } }, sessionId: 's-incident' }))
  assert(body.includes('排障简报') && body.includes('修复并验证'), 'incident tail')
})

check('scheme and cicd briefs expose substeps', () => {
  const scheme = Brief._internals.briefFrom({ kind: 'profile', status: 'done' })
  const schemeBody = text(Brief.StageNavigator({ payloads: { profile: { kind: 'profile', table: 'dwd.orders' } }, sessionId: 's-scheme', expanded: true }))
  assert(schemeBody.includes('数据挖掘') && schemeBody.includes('技术方案输出'), 'scheme substeps')
  const cicd = Brief._internals.briefFrom({ kind: 'schedule', status: 'validated' })
  const cicdBody = text(Brief.StageNavigator({ payloads: { schedule: { kind: 'schedule', status: 'validated' } }, sessionId: 's-cicd', expanded: true }))
  assert(cicdBody.includes('编译构建') && cicdBody.includes('发布/部署'), 'cicd substeps')
})

check('turn brief ignores unknown payloads', () => {
  assert(Brief._internals.parsePayload(block({ kind: 'mystery' }).content) === null, 'unknown kind should be ignored')
  assert(Brief._internals.briefFrom({ kind: 'tech_plan' }).index === 3, 'tech_plan should be scheme stage 3')
})

check('lineage tab draws a graph from real lineage', () => {
  ContextStore.ingest('s-graph', {
    kind: 'lineage', table: 'dws.trade_channel_daily', direction: 'down', depth: 1,
    nodes: [
      { table: 'dws.trade_channel_daily', type: 'table', owner: '交易组' },
      { table: 'ads.channel_report', type: 'report', owner: '报表组' },
      { table: 'api.channel_metrics', type: 'api', owner: '数据服务组' }
    ],
    edges: [
      { from: 'dws.trade_channel_daily', to: 'ads.channel_report', kind: 'report' },
      { from: 'dws.trade_channel_daily', to: 'api.channel_metrics', kind: 'api' }
    ],
    truncated: false
  })
  const body = text(Tabs.tabs[1].body.Component({ sessionId: 's-graph' }))
  assert(body.includes('dws.trade_channel_daily'), 'graph target')
  assert(body.includes('3 个节点') && body.includes('2 条边'), 'graph node/edge counts')
  assert(body.includes('下游'), 'graph direction')
})

check('design impact draws a synthetic lineage graph', () => {
  ContextStore.ingest('s-impact', {
    kind: 'design', target: { table: 'dim.member' },
    impact: { count: 2, top: [
      { table: 'ads.member_level_daily', type: 'report', owner: '会员组' },
      { table: 'member_growth', type: 'dashboard', owner: '会员组' }
    ] }
  })
  const body = text(Tabs.tabs[1].body.Component({ sessionId: 's-impact' }))
  assert(body.includes('dim.member'), 'synthetic target: ' + body.slice(0, 800))
  assert(body.includes('3 个节点') && body.includes('2 条边'), 'synthetic node/edge counts')
  assert(body.includes('来自设计卡影响面'), 'synthetic marker')
})

check('three right-sidebar tabs read the context store', () => {
  assert(Tabs.definitions.length === 3, 'expected three tab types')
  const kinds = Tabs.definitions.map(item => item.kind)
  assert(new Set(kinds).size === 3, 'tab kinds must be unique')
  const asset = Tabs.tabs[0]
  const empty = text(asset.body.Component({ sessionId: 's-empty' }))
  assert(empty.includes('还没有资产上下文'), 'empty state')
  const populated = text(asset.body.Component({ sessionId: 's1' }))
  assert(populated.includes('dws.v2'), 'asset tab should read the latest design target')
  const lineage = Tabs.tabs[1]
  assert(text(lineage.body.Component({ sessionId: 's2' })).includes('dwd.y'), 'lineage tab should read context')
  const evidence = Tabs.tabs[2]
  assert(text(evidence.body.Component({ sessionId: 's-empty' })).includes('还没有证据'), 'evidence empty state')
})


check('USPicker renders first page, preview and start action', () => {
  const items = Array.from({ length: 8 }, (_, i) => ({
    id: 'US-' + (3821 + i), title: 'US 标题 ' + i, status: i === 0 ? '待分析' : '待设计', priority: 'P1',
    initialStage: 'requirement', goal: '目标 ' + i, acceptance: ['验收 ' + i], assets: ['dws.trade_channel_daily'], existingWorkitem: i === 1 ? 'wi-1' : null
  }))
  const body = text(Cards.USPickerCard({ block: block({ kind: 'us-picker', items, asOf: '2026-10-27 10:42', source: 'mock-edevops' }) }))
  assert(body.includes('US-3821') && body.includes('US 标题 0'), 'us rows')
  assert(body.includes('开始处理') && body.includes('查看全部'), 'us actions')
  assert(!body.includes('US-3826'), 'inline list must stop at five')
})

check('intake card shows US to workitem handoff', () => {
  const body = text(Cards.IntakeCard({ block: block({ kind: 'intake', stage: 'requirement', us: { id: 'US-3821', title: '渠道日报' }, workitem: { id: 'wi-3821', stage: 'requirement', source: { system: 'edevops', id: 'US-3821' } }, created: true, initialStage: 'requirement', next: '需求' }) }))
  assert(body.includes('US-3821') && body.includes('wi-3821') && body.includes('新建'), 'intake handoff')
})

check('analysis blocked card shows supplement action', () => {
  const body = text(Cards.AnalysisCard({ block: block({ kind: 'analysis', stage: 'scheme', substage: 'analysis', status: 'blocked', question: '能否算支付口径', findings: [{ id: 'F1', title: '缺 status', claim: '枚举未登记', severity: 'blocking' }], gaps: [{ id: 'G-STATUS', message: 'status 未登记', severity: 'blocking' }], review: { ba: 'reviewed' } }) }))
  assert(body.includes('补充 mock 证据'), 'missing supplement action')
  assert(!body.includes('BA 签收'), 'blocked card must not offer signoff')
})

check('lineage v2 card renders design timeband', () => {
  const body = text(Cards.LineageCard({ block: block({ kind: 'lineage', schemaVersion: 2, table: 'dws.trade_channel_daily', view: 'design', mode: 'planned', graph: { nodes: [{ id: 'table:dwd.orders', type: 'physical_table', label: 'dwd.orders', layer: 'dwd' }, { id: 'job:etl_target', type: 'etl_job', label: '支付口径聚合', jobKind: 'batch_etl' }, { id: 'table:dws.trade_channel_daily', type: 'physical_table', label: 'dws.trade_channel_daily', layer: 'dws' }], edges: [] }, timeband: { upstreamReadyAt: '03:12', etlStart: '03:30', etlEnd: '04:38', sla: '05:00', buffer: '22m', points: [{ at: '03:12', label: '就绪' }, { at: '05:00', label: 'SLA' }] }, gaps: [] }) }))
  assert(body.includes('设计血缘') && body.includes('03:12') && body.includes('22m'), 'v2 lineage preview')
})

check('tech plan renders task and embedded lineage', () => {
  const body = text(Cards.TechPlanCard({ block: block({ kind: 'tech_plan', stage: 'scheme', target: 'dws.trade_channel_daily', status: 'draft', tasks: [{ id: 'T1', name: '支付口径聚合', platform: 'spark', owner: '交易组' }], estimate: '2 人日', risks: [], gaps: [], review: { se: 'pending', dev: 'deferred' }, lineage: { table: 'dws.trade_channel_daily', graph: { nodes: [{ id: 'table:dws.trade_channel_daily', type: 'physical_table', label: 'dws.trade_channel_daily' }], edges: [] }, timeband: { upstreamReadyAt: '03:12', sla: '05:00', buffer: '22m', points: [] } } }) }))
  assert(body.includes('支付口径聚合') && body.includes('设计血缘') && body.includes('SE 确认'), 'tech plan preview')
})


check('stage result card routes prepared deliverable payloads', () => {
  const body = text(Cards.StageResultCard({ block: block({ kind: 'requirement', stage: 'requirement', title: '需求', goal: '目标', status: 'draft', gaps: [] }) }))
  assert(body.includes('需求') && body.includes('目标'), 'stage result delegates to deliverable renderer')
})


check('requirement card exposes BA and requester signoff actions', () => {
  const tree = Cards.RequirementCard({ block: block({ kind: 'requirement', stage: 'requirement', title: '需求', goal: '目标', status: 'draft', review: { ba: { approver: '陈璐', status: 'pending' }, requester: { approver: '渠道运营', status: 'pending' } }, gaps: [] }) })
  const body = text(tree)
  assert(body.includes('BA 签收') && body.includes('需求方确认'), 'signoff buttons exist')
})


check('turn tail exposes the current gate summary and stage brief', () => {
  const requirement = { kind: 'requirement', status: 'draft', title: '需求', goal: '支付口径', review: { ba: { status: 'pending', approver: '陈璐' }, requester: { status: 'pending', approver: '渠道运营' } }, gaps: [] }
  const brief = Brief._internals.briefFrom(requirement)
  const body = text(Brief.StageNavigator({ payloads: { requirement }, sessionId: 's-gate-dock' }))
  assert(body.includes('当前门禁 · 需求'), 'missing current gate title')
  assert(body.includes('阶段简报'), 'missing stage brief')
})



check('turn tail renders the full current card when a renderer is supplied', () => {
  const requirement = { kind: 'requirement', status: 'draft', title: '需求', goal: '支付口径', review: { ba: { status: 'pending', approver: '陈璐' }, requester: { status: 'pending', approver: '渠道运营' } }, gaps: [] }
  const brief = Brief._internals.briefFrom(requirement)
  let rendered = null
  const renderCard = props => { rendered = JSON.parse(props.block.content[0].text); return 'FULL_CURRENT_CARD' }
  const body = text(Brief.TurnTail({ brief, payloads: { requirement }, sessionId: 's-full-card', renderCard }))
  assert(body.includes('FULL_CURRENT_CARD') && rendered.kind === 'requirement', 'full card was not rendered')
})



check('stage navigator groups cards and statuses by stage', () => {
  ContextStore.ingest('s-nav', { kind: 'workitem', id: 'w', stage: 'scheme', stages: { requirement: { status: 'done' }, design: { status: 'done' }, scheme: { status: 'in_progress', substage: 'analysis' } }, approvals: [{ gate: 'requirement', status: 'approved', signoffs: [] }, { gate: 'design', status: 'approved', signoffs: [] }, { gate: 'scheme.analysis', status: 'pending', signoffs: [] }] })
  ContextStore.ingest('s-nav', { kind: 'requirement', title: '需求', status: 'reviewed', review: { ba: { status: 'approved' }, requester: { status: 'approved' } }, gaps: [] })
  ContextStore.ingest('s-nav', { kind: 'analysis', question: '分析', status: 'reviewed', review: { ba: { status: 'pending' } }, gaps: [] })
  const body = text(Brief.StageNavigator({ sessionId: 's-nav', expanded: true }))
  assert(body.includes('阶段简报') && body.includes('需求') && body.includes('分析'), 'navigator content missing')
})


for (const [name, fn] of checks) {
  try {
    await fn()
    results.push(`ok   ${name}`)
  } catch (error) {
    results.push(`FAIL ${name}: ${error.message}`)
    process.exitCode = 1
  }
}
console.log(results.join('\n'))
