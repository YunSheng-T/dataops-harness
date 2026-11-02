#!/usr/bin/env node
/**
 * Create a local, isolated Stage 0–5 demo workitem with mock artifacts.
 * It never touches the P1 sample workitem or any real system.
 *
 * usage:
 *   node scripts/seed-dataops-demo.mjs --stage develop
 *   node scripts/seed-dataops-demo.mjs --stage cicd
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { normalizeConfig } from '../packages/dataops-tools/src/config.js'
import { ensureWorkitem, readWorkitem, stageComplete, stagePrepare, stageSignoff } from '../packages/dataops-tools/src/workitem-store.js'
import { buildDevelopArtifacts } from '../packages/dataops-tools/src/develop-package.js'
import { buildPipelinePackage } from '../packages/dataops-tools/src/pipeline-package.js'
import { DEVELOP, DEVELOP_BUILD_FAILED } from '../packages/dataops-tools/src/fixtures/develop.js'
import { CICD_PIPELINE } from '../packages/dataops-tools/src/fixtures/cicd.js'

const root = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const targetStage = flag('--stage') || 'develop'
const mode = flag('--mode') || 'ok'
const id = flag('--id') || '2026-10-27-us-3821-demo'
const config = normalizeConfig({ workitemsDir: join(root, 'workitems') })
const dir = join(root, 'workitems', id)
if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })

const source = { system: 'edevops', id: 'US-3821-DEMO', demo: true }
const created = ensureWorkitem(config, { id, source, title: '渠道日报支付口径（Stage 0–5 demo）', initialStage: 'requirement', owner: '陈璐', requester: '渠道运营', assets: ['dws.trade_channel_daily', 'dwd.orders', 'dim.channel'] })
const wid = created.workitem.id

async function prep(kind, stage, payload, deliverable, substage) {
  return stagePrepare(config, { id: wid, kind, stage, deliverable, payload, status: payload.status || 'draft', ...(substage ? { substage } : {}) })
}
async function sign(gate, role, actionId, actor) {
  return stageSignoff(config, { id: wid, gate, role, via: 'ui', actionId, actor })
}

await prep('requirement', 'requirement', {
  id: 'REQ-3821', title: '渠道日报支付口径',
  goal: '把 dws.trade_channel_daily 从下单口径改为支付成功口径，下游继承同一口径。',
  scope: 'dws.trade_channel_daily + ads.channel_report / rpt.funnel / api.channel_metrics',
  nonGoals: ['不新增实时链路', '不改 dwd.orders 明细表结构', '不调整现有调度时间窗'],
  acceptance: ['支付成功 GMV 与财务支付流水差异 <= 0.1%', '3 个下游报表 / API 口径一致', '05:00 前产出'],
  constraints: ['仅使用 mock 只读环境', '上线窗口避开月结日'],
  owner: '交易组', requester: '渠道运营', priority: 'P1',
  impacts: ['table · dws.trade_channel_daily', 'report · rpt.funnel', 'api · api.channel_metrics'],
  gaps: [],
  evidence: [
    { id: 'ev-req-001', title: '支付成功订单规模', query: "select dt, count(*) as order_cnt, sum(amount) as gmv from dwd.orders where status = 'paid' and dt = '2026-10-26' group by dt", timeRange: '2026-10-26', env: 'mock-prod-ro', asOf: '2026-10-27T04:12:00+08:00' },
    { id: 'ev-req-002', title: '口径差异基线', query: "select sum(case when status = 'paid' then amount else 0 end) / sum(amount) as paid_ratio from dwd.orders where dt = '2026-10-26'", timeRange: '2026-10-26', env: 'mock-prod-ro', asOf: '2026-10-27T04:18:00+08:00' }
  ]
}, 'deliverables/requirement/requirement.yaml')
await sign('requirement', 'BA', 'ui-demo-ba', '陈璐')
await sign('requirement', 'requester', 'ui-demo-req', '渠道运营')

await prep('design', 'design', {
  summary: '渠道日报支付成功口径设计',
  goal: '把支付成功订单按渠道 × 支付日期聚合，保持下游报表和 API 同一口径。',
  target: { table: 'dws.trade_channel_daily', grain: '渠道 × 支付日期', primaryKey: ['dt', 'channel_id'], partition: 'dt=${bizdate}' },
  sources: [
    { table: 'dwd.orders', fields: ['order_id', 'channel_id', 'pay_time', 'amount', 'status'], filter: "status = 'paid' and dt = '${bizdate}'" },
    { table: 'dim.channel', fields: ['channel_id', 'channel_name'], join: 'channel_id' }
  ],
  steps: [
    { title: '过滤支付成功订单', logic: 'status = paid and amount > 0' },
    { title: '按渠道聚合', logic: 'count(distinct order_id) as order_cnt, sum(amount) as gmv' },
    { title: '补全渠道维度', logic: 'left join dim.channel on channel_id' }
  ],
  metrics: [{ name: 'order_cnt', definition: '支付成功订单数（去重）', owner: '交易组' }, { name: 'gmv', definition: '支付成功订单金额', owner: '交易组' }],
  schedule: { cron: '0 5 * * *', sla: '05:00', dependsOn: ['dwd.orders@dt-1', 'dim.channel@dt'] },
  dataMap: { path: ['交易域', '订单', '订单事实', 'dwd.orders'], assets: [{ id: 'dwd.orders', name: 'dwd.orders', type: 'warehouse_table', owner: '交易组', fields: 42 }, { id: 'dim.channel', name: 'dim.channel', type: 'warehouse_table', owner: '交易组', fields: 12 }] },
  designEvidence: [
    { title: '支付时间跨日', claim: '跨日支付订单按支付日期归属，会影响日报日切', detail: '0.7% 支付单跨日支付', evidence: ['ev-req-002'], status: 'warn' },
    { title: '渠道映射覆盖', claim: 'dim.channel 覆盖 99.98% 支付订单', detail: '缺失 0.02% 进入 unknown 渠道', evidence: ['ev-req-001'], status: 'pass' }
  ],
  quality: [{ item: 'channel_id 空值', expectation: '<= 0.1%', status: 'warn' }],
  impact: { count: 3, top: [{ table: 'ads.channel_report' }, { table: 'rpt.funnel' }, { table: 'api.channel_metrics' }] },
  gaps: [{ id: 'G-PAYTIME', severity: 'warning', message: '支付时间跨日归属需要业务确认' }]
}, 'deliverables/design/design.yaml')
await sign('design', 'BA', 'ui-demo-design', '陈璐')

await prep('analysis', 'scheme', {
  substage: 'analysis', status: 'passed',
  question: '支付口径与下单口径差多少，是否会影响投放和财务报表',
  baseline: [
    { metric: '支付成功 GMV', old: '1,284 万', new: '1,279 万', delta: '-0.39%', status: 'pass' },
    { metric: '订单数', old: '82.4 万', new: '81.9 万', delta: '-0.61%', status: 'pass' },
    { metric: '下游报表差异', old: '3 张', new: '0 张', delta: '已统一', status: 'pass' }
  ],
  findings: [
    { title: '跨日支付影响日切', claim: '0.7% 支付单在次日完成支付', severity: 'warning', detail: '建议按 pay_time 归属，保留 reconcile 查询', evidence: ['ev-req-002'] },
    { title: '渠道映射缺口', claim: '0.02% 支付订单无 channel_id', severity: 'warning', detail: '进入 unknown 渠道，不阻塞口径切换', evidence: ['ev-req-001'] }
  ],
  candidates: [
    { id: 'A', fit: '推荐', source: 'dwd.orders + dim.channel', pros: '在 dws 一次生效，3 个下游统一', reason: '影响面可控' },
    { id: 'B', fit: '备选', source: 'ads.channel_report', pros: '只改报表层，改动小', reason: 'API 仍是旧口径' }
  ],
  recommendation: { candidate: 'A', rationale: '统一 dws 口径，报表和 API 同步生效' },
  conclusion: '可切口径；2 个 warning 均有 mock 证据，无 blocking。',
  evidence: [
    { id: 'ev-analysis-001', query: "select sum(case when status = 'paid' then amount else 0 end) / sum(amount) as paid_ratio from dwd.orders where dt = '2026-10-26'", timeRange: '2026-10-26', env: 'mock-prod-ro', asOf: '2026-10-27T04:30:00+08:00' }
  ],
  gaps: []
}, 'deliverables/scheme/analysis.yaml', 'analysis')
await sign('scheme.analysis', 'BA', 'ui-demo-analysis', '陈璐')

await prep('solution', 'scheme', {
  substage: 'solution', target: '渠道日报支付口径', scope: 'dws + 下游报表/API',
  summary: '选择在 dws 统一支付成功口径，下游报表和 API 只读同一结果。',
  chosenOption: 'A',
  options: [
    { id: 'A', name: 'dws 统一口径', scopeDelta: '改 1 张目标表 + 1 个 ETL', impactCount: 3, pros: ['一次生效', '下游无二套口径'], rejectedReason: null },
    { id: 'B', name: '只在 ads 改', scopeDelta: '改 1 张报表', impactCount: 1, pros: ['影响面小'], rejectedReason: 'API 仍保留旧口径，报表和 API 不一致' }
  ],
  decisions: [
    { question: '口径放在哪一层', decision: '放在 dws', reason: '3 个下游共享，避免每个下游重复改', evidence: ['ev-analysis-001'] },
    { question: '跨日支付如何归属', decision: '按 pay_time 归属', reason: '财务对账以支付成功时间切日', evidence: ['ev-req-002'] }
  ],
  impacts: { assets: [{ id: 'ads.channel_report', change: '换口径' }, { id: 'rpt.funnel', change: '换口径' }, { id: 'api.channel_metrics', change: '契约保持' }] },
  dependencies: [{ id: 'D1', need: '财务支付流水可用', owner: '财务数据组' }],
  constraints: [{ text: '上线窗口避开月结' }, { text: 'API 字段名不变' }],
  risks: [{ risk: '跨日支付导致日报波动', mitigation: '保留 reconcile 查询 + 回滚 SQL' }],
  gaps: []
}, 'deliverables/scheme/solution.yaml', 'solution')
await sign('scheme.solution', 'BA', 'ui-demo-solution', '陈璐')

await prep('tech_plan', 'scheme', {
  substage: 'tech_plan', target: { table: 'dws.trade_channel_daily' },
  tasks: [
    { id: 'T1', name: '支付成功订单过滤与渠道聚合', platform: 'ETL', owner: '交易组', status: 'planned', dependsOn: [] },
    { id: 'T2', name: '调度依赖与产出 SLA', platform: 'LTS', owner: '交易组', status: 'planned', dependsOn: ['T1'] },
    { id: 'T3', name: '下游报表 / API 验证', platform: '报表+API', owner: '数据服务组', status: 'planned', dependsOn: ['T1', 'T2'] }
  ],
  dependencies: [{ id: 'D1', from: 'dwd.orders', to: 'T1', need: 'dt-1 分区就绪' }, { id: 'D2', from: 'T1', to: 'T3', need: '目标表产出' }],
  estimate: { total: '2 人日', breakdown: 'ETL 1 人日 / 调度 0.5 人日 / 验证 0.5 人日' },
  sla: { outputBy: '05:00', scheduleConstraints: { cron: '0 5 * * *' } },
  risks: [
    { id: 'R1', risk: '上游 dwd.orders 延迟', mitigation: '等待上游 + 05:00 告警', owner: '交易组' },
    { id: 'R2', risk: '跨日支付导致日报波动', mitigation: 'reconcile + 回滚 SQL', owner: '交易组' }
  ],
  rollback: { steps: ['切换回旧 SQL', '恢复调度 v1', '重跑当日分区'], materials: ['rollback.sql', 'schedule v1'] },
  lineage: { table: 'dws.trade_channel_daily', view: 'design', nodes: [{ id: 'table:dwd.orders', table: 'dwd.orders', type: 'physical_table', label: 'dwd.orders' }, { id: 'table:dim.channel', table: 'dim.channel', type: 'physical_table', label: 'dim.channel' }, { id: 'table:dws.trade_channel_daily', table: 'dws.trade_channel_daily', type: 'physical_table', label: 'dws.trade_channel_daily' }], edges: [{ from: 'table:dwd.orders', to: 'table:dws.trade_channel_daily', type: 'reads' }, { from: 'table:dim.channel', to: 'table:dws.trade_channel_daily', type: 'reads' }] },
  gaps: []
}, 'deliverables/scheme/tech-plan.yaml', 'tech_plan')
await sign('scheme.tech_plan', 'SE', 'ui-demo-tech', '王工')

const artifacts = buildDevelopArtifacts(join(root, 'workitems'), wid)
await prep('develop', 'develop', { ...(mode === 'build-failed' ? DEVELOP_BUILD_FAILED : DEVELOP), artifacts }, 'deliverables/develop/develop.yaml')
if (mode === 'build-failed' && targetStage === 'cicd') throw new Error('build-failed demo cannot be advanced to cicd; fix the build first')
if (targetStage === 'cicd') {
  await sign('develop.code_review', 'SE', 'ui-demo-dev-se', '王工')
  await sign('develop.merge', 'Committer', 'ui-demo-merge', '代码平台')
  await prep('cicd', 'cicd', { ...CICD_PIPELINE, status: 'queued' }, 'deliverables/cicd/cicd.yaml')
  const artifact = buildPipelinePackage(join(root, 'workitems'), wid, { target: 'dws.trade_channel_daily', commit: 'abc1234' })
  stageComplete(config, { id: wid })
  // Stage 5 card after package: write the final payload for the demo.
  const file = join(dir, 'deliverables', 'cicd', 'cicd.yaml')
  writeFileSync(file, JSON.stringify({ ...CICD_PIPELINE, artifact, status: 'succeeded' }, null, 2) + '\n')
} else if (mode !== 'build-failed') {
  await sign('develop.code_review', 'SE', 'ui-demo-dev-se', '王工')
}
const final = readWorkitem(config, { id: wid })
console.log(JSON.stringify({ id: wid, stage: final.stage, stages: final.stages, next: final.next, dir }, null, 2))
