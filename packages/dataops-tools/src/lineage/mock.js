/**
 * Mock lineage provider.
 *
 * The mock is intentionally coherent with samples/internal-code-repo:
 * 4 tables, 2 data flows, 1 schedule task. Table/data-flow graphs are
 * provider-owned; task DAG stays a repository concern.
 */
const TABLES = [
  { id: 'table:dwd.orders', kind: 'table_lineage', label: 'dwd.orders', group: '表', sub: 'dwd · 上游 2 / 下游 3', focus: 'table:dwd.orders' },
  { id: 'table:dim.channel', kind: 'table_lineage', label: 'dim.channel', group: '表', sub: 'dim · 上游 0 / 下游 2', focus: 'table:dim.channel' },
  { id: 'table:dws.trade_channel_daily', kind: 'table_lineage', label: 'dws.trade_channel_daily', group: '表', sub: 'dws · 上游 2 / 下游 1', focus: 'table:dws.trade_channel_daily' },
  { id: 'table:ads.channel_report', kind: 'table_lineage', label: 'ads.channel_report', group: '表', sub: 'ads · 上游 1 / 下游 1', focus: 'table:ads.channel_report' }
]
const FLOWS = [
  { id: 'flow:channel_daily', kind: 'data_flow', label: 'channel_daily', group: '数据链路', sub: 'lts_channel_daily · 3 tasks / 4 tables', focus: 'flow:channel_daily' },
  { id: 'flow:etl_channel_sync', kind: 'data_flow', label: 'etl_channel_sync', group: '数据链路', sub: 'FlashSync · 2 tables', focus: 'flow:etl_channel_sync' }
]
const TASKS = [
  { id: 'task:channel_daily_mixed', kind: 'task_dag', label: 'channel_daily_mixed', group: '调度 DAG', sub: 'lts_code/channel_daily · 6 jobs', focus: 'task:channel_daily_mixed' }
]
const AS_OF = '2026-11-02 22:30'
const tableNodes = [
  { id: 'table:dwd.orders', type: 'table', label: 'dwd.orders', layer: 'dwd', meta: 'Hive · 交易组', owner: '交易组' },
  { id: 'table:dim.channel', type: 'table', label: 'dim.channel', layer: 'dim', meta: 'MySQL · 交易组', owner: '交易组' },
  { id: 'table:dws.trade_channel_daily', type: 'table', label: 'dws.trade_channel_daily', layer: 'dws', meta: 'ClickHouse · 交易组', owner: '交易组' },
  { id: 'table:ads.channel_report', type: 'table', label: 'ads.channel_report', layer: 'ads', meta: 'ClickHouse · 报表组', owner: '报表组' }
]
const tableEdges = [
  { from: 'table:dwd.orders', to: 'table:dws.trade_channel_daily', kind: 'feeds', label: '读' },
  { from: 'table:dim.channel', to: 'table:dws.trade_channel_daily', kind: 'feeds', label: 'join' },
  { from: 'table:dws.trade_channel_daily', to: 'table:ads.channel_report', kind: 'feeds', label: '下游' }
]
const flowNodes = [
  ...tableNodes,
  { id: 'flow:channel_daily', type: 'schedule_task', label: 'channel_daily_mixed', meta: 'cron 02:10 · 6 jobs', owner: '交易组' },
  { id: 'job:etl_channel', type: 'etl_job', label: 'ETL 渠道聚合', meta: 'Spark SQL · attempt 2', owner: '交易组' },
  { id: 'job:etl_channel_sync', type: 'etl_job', label: '集成 贴源', meta: 'FlashSync · channel_alert', owner: '交易组' }
]
const flowEdges = [
  { from: 'table:dwd.orders', to: 'job:etl_channel', kind: 'reads', label: '读' },
  { from: 'table:dim.channel', to: 'job:etl_channel', kind: 'reads', label: 'join' },
  { from: 'job:etl_channel', to: 'table:dws.trade_channel_daily', kind: 'writes', label: '写' },
  { from: 'flow:channel_daily', to: 'job:etl_channel', kind: 'runs', label: '触发' },
  { from: 'job:etl_channel_sync', to: 'table:dws.trade_channel_daily', kind: 'writes', label: '产出' }
]
const taskNodes = [
  { id: 'task:channel_daily_mixed', type: 'schedule_task', label: 'channel_daily_mixed', meta: 'cron 02:10 · 6 jobs', owner: '交易组' },
  { id: 'job:load_check', type: 'job', label: 'load_check', meta: 'url GET · retry 2', owner: '交易组' },
  { id: 'job:G_1006', type: 'job', label: 'G_1006', meta: 'group', owner: '交易组' },
  { id: 'job:calc_sql', type: 'job', label: 'calc_sql', meta: 'open_gauss · SQL', owner: '交易组' },
  { id: 'job:export_shell', type: 'job', label: 'export_shell', meta: 'shell', owner: '交易组' },
  { id: 'job:wait_upstream', type: 'job', label: 'wait_upstream', meta: 'tskdep', owner: '交易组' },
  { id: 'job:notify', type: 'job', label: 'notify', meta: 'url POST', owner: '交易组' }
]
const taskEdges = [
  { from: 'task:channel_daily_mixed', to: 'job:load_check', kind: 'depends_on' },
  { from: 'task:channel_daily_mixed', to: 'job:G_1006', kind: 'depends_on' },
  { from: 'task:channel_daily_mixed', to: 'job:wait_upstream', kind: 'depends_on' },
  { from: 'job:G_1006', to: 'job:calc_sql', kind: 'depends_on' },
  { from: 'job:G_1006', to: 'job:export_shell', kind: 'depends_on' },
  { from: 'job:load_check', to: 'job:wait_upstream', kind: 'depends_on' },
  { from: 'job:load_check', to: 'job:notify', kind: 'depends_on' },
  { from: 'job:G_1006', to: 'job:notify', kind: 'depends_on' }
]
function graph(kind, focus) {
  if (kind === 'data_flow') return { graphId: 'flow:channel_daily', kind, title: 'channel_daily · 数据链路', focus: focus || 'flow:channel_daily', nodes: flowNodes, edges: flowEdges, source: 'mock', asOf: AS_OF, partial: false, gaps: [] }
  if (kind === 'task_dag') return { graphId: 'task:channel_daily_mixed', kind, title: 'channel_daily_mixed · 调度 DAG', focus: focus || 'task:channel_daily_mixed', nodes: taskNodes, edges: taskEdges, source: 'mock', asOf: AS_OF, partial: false, gaps: [] }
  return { graphId: 'table:dws.trade_channel_daily', kind: 'table_lineage', title: 'dws.trade_channel_daily · 表血缘', focus: focus || 'table:dws.trade_channel_daily', nodes: tableNodes, edges: tableEdges, source: 'mock', asOf: AS_OF, partial: false, gaps: [] }
}
export function createMockLineageProvider() {
  return {
    index() {
      return { ok: true, objects: TABLES.concat(FLOWS, TASKS), counts: { table_lineage: TABLES.length, data_flow: FLOWS.length, task_dag: TASKS.length }, source: 'mock', asOf: AS_OF }
    },
    graph(kind, focus) {
      if (!['table_lineage', 'data_flow', 'task_dag'].includes(kind)) return { ok: false, error: 'UNSUPPORTED_LINEAGE_KIND' }
      return { ok: true, graph: graph(kind, focus) }
    }
  }
}
