// Fixture CLI used by provider-check.mjs. Prints the same platform JSON the
// real CLI is expected to print, selected by the second argument.
const mode = process.argv[2]
const arg = process.argv[3]

const ticket = {
  ticketId: arg,
  name: '渠道日报改造',
  detail: '渠道日报从下单口径改为支付口径，按渠道按天输出。',
  priority: 'P2',
  assignee: { name: '交易组' },
  state: '进行中',
  acceptanceCriteria: '差异 < 0.5%\n05:00 前产出',
  tables: [{ type: 'table', name: 'dws.trade_channel_daily' }],
  updatedAt: '2026-10-25 09:30'
}

const tables = {
  'dws.trade_channel_daily': {
    tableName: 'dws.trade_channel_daily',
    ownerName: '交易组',
    zone: 'dws',
    granularity: '渠道 × 日期',
    partitionColumn: 'dt',
    rowCount: 12000,
    fields: [
      { name: 'dt', type: 'date' },
      { name: 'channel_id', type: 'string' },
      { name: 'order_cnt', type: 'bigint' }
    ]
  },
  'dwd.orders': {
    tableName: 'dwd.orders',
    ownerName: '交易组',
    zone: 'dwd',
    granularity: '订单',
    partitionColumn: 'dt',
    rowCount: 2000000,
    fields: [
      { name: 'order_id', type: 'string' },
      { name: 'channel_id', type: 'string' },
      { name: 'amount', type: 'decimal' }
    ]
  }
}

if (mode === 'ticket') {
  process.stdout.write(JSON.stringify(ticket))
} else if (mode === 'table') {
  process.stdout.write(JSON.stringify(tables[arg] || { tableName: arg, fields: [] }))
} else if (mode === 'lineage') {
  const direction = process.argv[4] || 'both'
  const nodes = direction === 'up'
    ? ['dwd.orders', 'dim.channel', arg]
    : [arg, 'ads.channel_report', 'api.channel_metrics']
  const edges = direction === 'up'
    ? [{ from: 'dwd.orders', to: arg }, { from: 'dim.channel', to: arg }]
    : [{ from: arg, to: 'ads.channel_report' }, { from: arg, to: 'api.channel_metrics' }]
  process.stdout.write(JSON.stringify({ nodes, edges }))
} else {
  process.stderr.write('unknown mode ' + mode)
  process.exit(2)
}
