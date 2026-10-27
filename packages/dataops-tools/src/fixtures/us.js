import { IDENTITIES } from './identity.js'

export const US_AS_OF = '2026-10-27T10:42:00+08:00'

const base = {
  source: { system: 'edevops', type: 'US' },
  assignee: IDENTITIES.ba.name,
  requester: IDENTITIES.requester.name,
  updatedAt: US_AS_OF,
  mock: true
}

export const US_ITEMS = [
  {
    ...base, id: 'US-3821', title: '渠道日报从下单口径改为支付口径', status: '待分析', priority: 'P1',
    assets: ['dws.trade_channel_daily', 'ads.channel_report', 'rpt.funnel', 'api.channel_metrics'],
    initialStage: 'requirement', existingWorkitem: null, goal: '渠道日报核心指标改为支付成功口径，可对账',
    acceptance: ['支付口径可对账', '下游字段和粒度不变', '05:00 前产出'],
    impacts: ['dws.trade_channel_daily', 'ads.channel_report', 'rpt.funnel', 'api.channel_metrics'],
    next: '确认目标/范围/验收，进入设计'
  },
  {
    ...base, id: 'US-3827', title: '会员模型补维度', status: '设计中', priority: 'P2',
    assets: ['dim.member', 'ads.member_level_daily'], initialStage: 'design',
    existingWorkitem: '2026-10-26-channel-report-pay-caliber', goal: '会员模型补充分层维度', acceptance: ['维度覆盖率达到 95%'], impacts: ['dim.member'], next: '补设计并签收'
  },
  { ...base, id: 'US-3830', title: '渠道映射补齐', status: '开发中', priority: 'P1', assets: ['dim.channel'], initialStage: 'develop', existingWorkitem: null, goal: '补齐 3 个缺失渠道映射', acceptance: ['空渠道占比低于 0.1%'], impacts: ['dim.channel'], next: '开发阶段准备' },
  { ...base, id: 'US-3834', title: '交易域血缘补录', status: '待分析', priority: 'P3', assets: ['dwd.orders'], initialStage: 'requirement', existingWorkitem: null, goal: '补录交易域表级血缘', acceptance: ['关键表 100% 登记'], impacts: ['dwd.orders'], next: '确认范围' },
  { ...base, id: 'US-3838', title: '日报空渠道告警', status: '待设计', priority: 'P2', assets: ['dws.trade_channel_daily'], initialStage: 'design', existingWorkitem: null, goal: '空渠道超过阈值时告警', acceptance: ['告警 5 分钟内触达'], impacts: ['dws.trade_channel_daily'], next: '设计告警规则' },
  { ...base, id: 'US-3841', title: '渠道维表 channel_type 发布', status: '待分析', priority: 'P2', assets: ['dim.channel'], initialStage: 'requirement', existingWorkitem: null, goal: '发布 channel_type 字段', acceptance: ['消费方确认字段'], impacts: ['dim.channel'], next: '确认字段口径' },
  { ...base, id: 'US-3844', title: '支付对账口径统一', status: '待方案', priority: 'P1', assets: ['dwd.orders'], initialStage: 'scheme', existingWorkitem: null, goal: '统一支付与对账口径', acceptance: ['月底累计对平'], impacts: ['dwd.orders'], next: '进入 3a 分析' },
  { ...base, id: 'US-3849', title: '报表字段变更通知', status: '待测试', priority: 'P3', assets: ['ads.channel_report'], initialStage: 'cicd', existingWorkitem: null, goal: '通知下游字段变更', acceptance: ['消费方确认'], impacts: ['ads.channel_report'], next: '测试/发布准备' }
]

export function initialStageForUsStatus(status) {
  if (status === '待分析' || status === '待设计') return 'requirement'
  if (status === '设计中') return 'design'
  if (status === '待方案' || status === '方案中') return 'scheme'
  if (status === '开发中') return 'develop'
  if (status === '待测试' || status === '测试中' || status === '待发布') return 'cicd'
  return 'review'
}

export function usDetail(id) {
  const item = US_ITEMS.find(x => x.id === id)
  if (!item) return null
  return {
    ...item,
    source: { ...item.source, id: item.id, url: 'https://edevops.example/us/' + item.id, statusAtIntake: item.status, assignee: item.assignee, fetchedAt: US_AS_OF },
    requester: item.requester || IDENTITIES.requester.name,
    owner: item.assignee,
    nonGoals: item.id === 'US-3821' ? ['不接真实发布', '不改 api/rpt 契约'] : [],
    constraints: item.id === 'US-3821' ? ['05:00 前产出', '下游字段与粒度不变'] : [],
    analysisDefault: item.id === 'US-3821' ? 'blocked' : 'ready'
  }
}

export function listUs(args = {}) {
  let items = US_ITEMS.slice()
  if (args.query) {
    const q = String(args.query).toLowerCase()
    items = items.filter(x => x.id.toLowerCase().includes(q) || x.title.toLowerCase().includes(q))
  }
  if (args.statuses && args.statuses.length) items = items.filter(x => args.statuses.includes(x.status))
  if (args.assignee) items = items.filter(x => x.assignee === args.assignee)
  return items.slice(0, Math.min(Number(args.limit) || 50, 50))
}
