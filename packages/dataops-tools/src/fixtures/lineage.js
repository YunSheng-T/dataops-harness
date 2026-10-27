export const LINEAGE_AS_OF = '2026-10-27T03:30:00+08:00'

const table = (id, label, layer, owner) => ({ id: 'table:' + id, type: 'physical_table', label, assetType: 'warehouse_table', platform: 'hive', layer, owner })
const task = (id, label, cycle, cron, sla) => ({ id: 'task:' + id, type: 'schedule_task', label, cycle, cron, sla })
const job = (id, label, kind, parent) => ({ id: 'job:' + id, type: 'etl_job', jobKind: kind, label, parent })
const edge = (from, to, type, extra = {}) => ({ from, to, type, ...extra })

const nodes = [
  table('dwd.orders', 'dwd.orders', 'dwd', '交易组'),
  table('dim.channel', 'dim.channel', 'dim', '交易组'),
  table('dws.trade_channel_daily', 'dws.trade_channel_daily', 'dws', '交易组'),
  job('etl_orders', '订单清洗', 'batch_etl', 'task:orders_daily'),
  job('etl_channel', '渠道补全', 'batch_etl', 'task:channel_daily'),
  job('etl_target', '支付口径聚合', 'batch_etl', 'task:channel_pay'),
  task('orders_daily', '订单日任务', 'daily', '0 2 * * *', '02:00'),
  task('channel_daily', '渠道维表任务', 'daily', '0 3 * * *', '03:00'),
  task('channel_pay', '渠道支付日报', 'daily', '0 3 * * *', '05:00'),
  { id: 'report:ads.channel_report', type: 'report', label: 'ads.channel_report', owner: '报表组' },
  { id: 'report:rpt.funnel', type: 'report', label: 'rpt.funnel', owner: '报表组' },
  { id: 'api:channel_metrics', type: 'api', label: 'api.channel_metrics', owner: '数据服务组' }
]

const edges = [
  edge('job:etl_orders', 'table:dwd.orders', 'writes'),
  edge('job:etl_channel', 'table:dim.channel', 'writes'),
  edge('task:orders_daily', 'job:etl_orders', 'triggers'),
  edge('task:channel_daily', 'job:etl_channel', 'triggers'),
  edge('task:channel_pay', 'job:etl_target', 'triggers'),
  edge('table:dwd.orders', 'job:etl_target', 'reads', { fields: ['order_id', 'channel_id', 'amount', 'status'] }),
  edge('table:dim.channel', 'job:etl_target', 'reads', { fields: ['channel_id', 'channel_name'] }),
  edge('job:etl_target', 'table:dws.trade_channel_daily', 'writes', { planned: true }),
  edge('table:dws.trade_channel_daily', 'report:ads.channel_report', 'derives'),
  edge('table:dws.trade_channel_daily', 'report:rpt.funnel', 'derives'),
  edge('table:dws.trade_channel_daily', 'api:channel_metrics', 'calls')
]

export const LINEAGE_V2 = {
  kind: 'lineage', schemaVersion: 2, source: 'mock-independent-lineage', asOf: LINEAGE_AS_OF, mock: true,
  table: 'dws.trade_channel_daily', direction: 'both', depth: 1, views: ['design', 'production', 'schedule'],
  view: 'design', mode: 'planned',
  nodes: nodes.filter(n => ['table:dwd.orders', 'table:dim.channel', 'table:dws.trade_channel_daily', 'job:etl_orders', 'job:etl_channel', 'job:etl_target', 'task:orders_daily', 'task:channel_daily', 'task:channel_pay'].includes(n.id)),
  edges: edges.filter(e => !String(e.to).startsWith('report:') && !String(e.to).startsWith('api:')),
  downstream: [
    { id: 'ads.channel_report', type: 'table', owner: '报表组' },
    { id: 'rpt.funnel', type: 'report', owner: '报表组' },
    { id: 'api.channel_metrics', type: 'api', owner: '数据服务组' }
  ],
  graph: { nodes, edges },
  schedule: { taskId: 'task:channel_pay', cycle: 'daily', cron: '0 3 * * *', sla: '05:00', timezone: 'Asia/Shanghai', retries: 2, dependsOn: ['table:dwd.orders@dt-1', 'table:dim.channel'] },
  timeband: {
    upstreamReadyAt: '03:12', etlStart: '03:30', etlEnd: '04:38', sla: '05:00', buffer: '22m',
    points: [
      { at: '03:12', label: '上游就绪' },
      { at: '03:30', label: 'ETL 开始' },
      { at: '04:38', label: 'ETL 结束' },
      { at: '05:00', label: 'SLA' }
    ],
    evidence: ['ev-20261026-006']
  },
  transforms: [
    { jobId: 'job:etl_target', type: 'SQL', logic: 'status 过滤 + 渠道聚合 + distinct order_id', inputs: ['table:dwd.orders'] }
  ],
  diff: [
    { type: 'added', node: 'job:etl_target', label: '支付口径聚合' },
    { type: 'changed', node: 'table:dws.trade_channel_daily', label: '口径改为支付成功' }
  ],
  gaps: []
}

export function readLineageV2(args = {}) {
  const view = args.view || 'design'
  const mode = args.mode || 'planned'
  const graph = view === 'design'
    ? { nodes: nodes.filter(n => !String(n.id).startsWith('report:') && !String(n.id).startsWith('api:')), edges: edges.filter(e => !String(e.to).startsWith('report:') && !String(e.to).startsWith('api:')) }
    : { nodes, edges }
  return { ...LINEAGE_V2, view, mode, graph, nodes: graph.nodes, edges: graph.edges }
}
