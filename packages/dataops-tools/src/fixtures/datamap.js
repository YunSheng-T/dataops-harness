export const DATAMAP_AS_OF = '2026-10-27T04:12:00+08:00'

export const PHYSICAL_ASSETS = {
  'dwd.orders': {
    id: 'dwd.orders', name: 'dwd.orders', assetType: 'warehouse_table', platform: 'hive', layer: 'dwd',
    owner: '交易组', rowCount: 2100000,
    fields: [
      { name: 'order_id', type: 'string', description: '订单号' },
      { name: 'channel_id', type: 'string', description: '渠道 ID' },
      { name: 'user_id', type: 'string', description: '用户 ID' },
      { name: 'amount', type: 'decimal(18,2)', description: '订单金额' },
      { name: 'status', type: 'string', description: '订单状态' }
    ]
  },
  'dim.channel': {
    id: 'dim.channel', name: 'dim.channel', assetType: 'warehouse_table', platform: 'mysql', layer: 'dim',
    owner: '交易组', rowCount: 1200,
    fields: [
      { name: 'channel_id', type: 'string', description: '渠道 ID' },
      { name: 'channel_name', type: 'string', description: '渠道名称' }
    ]
  },
  'dws.trade_channel_daily': {
    id: 'dws.trade_channel_daily', name: 'dws.trade_channel_daily', assetType: 'warehouse_table', platform: 'clickhouse', layer: 'dws',
    owner: '交易组', rowCount: 12000,
    fields: [
      { name: 'dt', type: 'date', description: '分区日期' },
      { name: 'channel_id', type: 'string', description: '渠道 ID' },
      { name: 'order_cnt', type: 'bigint', description: '支付订单数' },
      { name: 'gmv', type: 'decimal(18,2)', description: '成交额' }
    ]
  },
  'ads.channel_report': {
    id: 'ads.channel_report', name: 'ads.channel_report', assetType: 'warehouse_table', platform: 'clickhouse', layer: 'ads',
    owner: '报表组', rowCount: 12000, fields: []
  },
  'rpt.funnel': {
    id: 'rpt.funnel', name: 'rpt.funnel', assetType: 'warehouse_table', platform: 'clickhouse', layer: 'ads',
    owner: '报表组', rowCount: 12000, fields: []
  },
  'api.channel_metrics': {
    id: 'api.channel_metrics', name: 'api.channel_metrics', assetType: 'warehouse_table', platform: 'api', layer: 'api',
    owner: '数据服务组', rowCount: 0, fields: []
  }
}

export const DATAMAP = {
  kind: 'datamap', schemaVersion: 2, source: 'mock-datamap', asOf: DATAMAP_AS_OF, mock: true,
  scenario: { id: 'scenario.channel-pay', name: '渠道日报支付口径改造', domain: '渠道运营 / 交易分析' },
  path: [
    { level: 'scenario', id: 'scenario.channel-pay', name: '渠道日报支付口径改造' },
    { level: 'domain', id: 'domain.channel-ops', name: '渠道运营 / 交易分析' },
    { level: 'business_object', id: 'bo.order', name: '订单' },
    { level: 'logical_entity', id: 'le.order_fact', name: '订单事实' },
    { level: 'logical_entity', id: 'le.channel_dim', name: '渠道维度' },
    { level: 'physical_asset', id: 'dwd.orders', name: 'dwd.orders' },
    { level: 'physical_asset', id: 'dim.channel', name: 'dim.channel' },
    { level: 'physical_asset', id: 'dws.trade_channel_daily', name: 'dws.trade_channel_daily' }
  ],
  assets: ['dwd.orders', 'dim.channel', 'dws.trade_channel_daily', 'ads.channel_report', 'rpt.funnel', 'api.channel_metrics'].map(id => PHYSICAL_ASSETS[id]),
  selected: ['dwd.orders', 'dim.channel'],
  candidates: [
    { id: 'C1', asset: 'dwd.orders', fit: 'partial', reason: '现成资产可用，但无 pay_time', blockedBy: ['G-PAYTIME'] },
    { id: 'C2', asset: 'payment_flow', fit: 'blocked', reason: 'DataMap 未登记支付流水物理资产', blockedBy: ['G-PAYTIME'] },
    { id: 'C3', asset: 'dwd.orders + pay_time', fit: 'future', reason: '需上游补字段，当前窗口不可用', blockedBy: [] }
  ],
  metadataStatus: 'partial',
  gaps: [
    { id: 'G-DATAMAP-PAY', severity: 'blocking', message: 'DataMap 支付事实下没有物理资产', owner: '交易组', action: '确认支付流水表是否已登记' }
  ]
}

export function readDatamap(args = {}) {
  return { ...DATAMAP, ...(args.asset ? { selected: [args.asset] } : {}), requestedBy: args.usId || null }
}
