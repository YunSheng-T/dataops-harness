export const EVIDENCE_AS_OF = '2026-10-27T04:30:00+08:00'

const base = { kind: 'evidence', source: 'mock-profile', asOf: EVIDENCE_AS_OF, env: 'prod-ro', mock: true }
export const EVIDENCE_PENDING = [
  { ...base, id: 'ev-20261026-001', claim: 'dwd.orders 有 5 个字段，没有 pay_time', query: 'describe dwd.orders', timeRange: '2026-10-20~2026-10-26', resultDigest: '5 columns; pay_time absent', cost: '1 scan' },
  { ...base, id: 'ev-20261026-003', claim: 'dwd.orders 单分区 2.1M 行，order_id 0 重复', query: 'select count(*), count(distinct order_id) from dwd.orders where dt=...', timeRange: '2026-10-26', resultDigest: 'rows=2100000; dup=0', cost: '1.2 GB / 3.4s' },
  { ...base, id: 'ev-20261026-004', claim: 'status 枚举未登记，当前只有假设', query: 'select status, count(*) from dwd.orders where dt=... group by status', timeRange: '2026-10-26', resultDigest: 'blocked: enum not registered', cost: 'not run' }
]
export const EVIDENCE_CLOSED = [
  { ...base, id: 'ev-20261026-007', claim: 'status 有 4 个枚举：paid/shipped/refund/closed', query: 'select status, count(*) from dwd.orders ...', timeRange: '2026-10-20~2026-10-26', resultDigest: 'paid 72%, shipped 20%, refund 5%, closed 3%', cost: '1 scan', resolutionFor: 'G-STATUS', mockResolved: true },
  { ...base, id: 'ev-20261026-008', claim: 'order_id 重复 1%，按 order_id 去重后口径可用', query: 'select count(*) - count(distinct order_id) from dwd.orders ...', timeRange: '2026-10-20~2026-10-26', resultDigest: 'duplicate_rate=1.0%', cost: '1 scan', resolutionFor: 'G-DUPKEY', mockResolved: true },
  { ...base, id: 'ev-20261026-009', claim: '本轮 mock 接受按下单分区 dt 归属支付口径，pay_time 接入后重开', query: 'mock decision: order-date attribution accepted for this window', timeRange: '2026-10-20~2026-10-26', resultDigest: 'assumption accepted; no production claim', cost: '0', resolutionFor: 'G-PAYTIME', mockResolved: true },
  { ...base, id: 'ev-20261026-010', claim: 'DataMap 支付流水无物理资产，本轮不选 C2，改用 dwd.orders + dt 归属', query: 'mock decision: payment_flow asset unavailable; choose C1', timeRange: '2026-10-20~2026-10-26', resultDigest: 'C2 rejected; C1 accepted with assumption', cost: '0', resolutionFor: 'G-DATAMAP-PAY', mockResolved: true }
]

export function readEvidenceV2(args = {}) {
  const resolution = args.resolution || 'pending'
  return {
    kind: 'evidence-set', schemaVersion: 2, source: 'mock-profile', asOf: EVIDENCE_AS_OF, mock: true,
    resolution,
    items: resolution === 'closed' ? EVIDENCE_CLOSED : EVIDENCE_PENDING,
    gaps: resolution === 'closed' ? [] : [
      { id: 'G-STATUS', severity: 'blocking', message: 'status 枚举未登记', owner: '交易组', action: '补枚举与分布', mustCloseBefore: '3a pass' },
      { id: 'G-DUPKEY', severity: 'blocking', message: 'order_id 1% 重复，去重口径待确认', owner: '交易组', action: '确认去重口径', mustCloseBefore: '3a pass' }
    ]
  }
}
