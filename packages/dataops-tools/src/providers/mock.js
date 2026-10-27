/**
 * Mock provider: offline fixtures shaped like the normalized platform DTOs.
 * The client cards never see this file; they only see the final payloads.
 */
import { SCENARIO_KEYS, buildRequirement, buildDesign, buildTechPlan, buildEvidence, buildDevelop, buildTest, buildRelease, buildPostmortem, buildIncident } from '../mock.js'

const TABLES = {
  'dws.trade_channel_daily': {
    table: 'dws.trade_channel_daily', owner: '交易组', layer: 'dws', grain: '渠道 × 日期', partition: 'dt',
    rowCount: 12000, updatedAt: '2026-10-25 03:12',
    columns: [
      { name: 'dt', type: 'date', comment: '分区' },
      { name: 'channel_id', type: 'string', comment: '渠道' },
      { name: 'channel_name', type: 'string', comment: '渠道名' },
      { name: 'order_cnt', type: 'bigint', comment: '支付订单数' },
      { name: 'gmv', type: 'decimal(18,2)', comment: '成交额' }
    ]
  },
  'dwd.orders': {
    table: 'dwd.orders', owner: '交易组', layer: 'dwd', grain: '订单', partition: 'dt',
    rowCount: 2000000, updatedAt: '2026-10-25 02:40',
    columns: [
      { name: 'order_id', type: 'string', comment: '订单号' },
      { name: 'channel_id', type: 'string', comment: '渠道' },
      { name: 'user_id', type: 'string', comment: '用户' },
      { name: 'amount', type: 'decimal(18,2)', comment: '金额' },
      { name: 'status', type: 'string', comment: '订单状态' }
    ]
  },
  'dim.channel': {
    table: 'dim.channel', owner: '交易组', layer: 'dim', grain: '渠道', partition: '全量',
    rowCount: 12000, updatedAt: '2026-10-24 23:00',
    columns: [
      { name: 'channel_id', type: 'string', comment: '渠道' },
      { name: 'channel_name', type: 'string', comment: '渠道名' }
    ]
  },
  'dim.member': {
    table: 'dim.member', owner: '会员组', layer: 'dim', grain: '会员 × 快照日期', partition: 'dt',
    rowCount: 860000, updatedAt: '2026-10-25 02:20',
    columns: [
      { name: 'dt', type: 'date', comment: '快照日期' },
      { name: 'member_id', type: 'string', comment: '会员' },
      { name: 'level', type: 'string', comment: '等级' },
      { name: 'lifecycle', type: 'string', comment: '生命周期' }
    ]
  },
  'ods.member': {
    table: 'ods.member', owner: '会员组', layer: 'ods', grain: '会员', partition: 'dt',
    rowCount: 18000, updatedAt: '2026-10-25 01:50',
    columns: [
      { name: 'member_id', type: 'string', comment: '会员' },
      { name: 'register_channel', type: 'string', comment: '注册渠道' },
      { name: 'status', type: 'string', comment: '状态' }
    ]
  },
  'ods.member_level': {
    table: 'ods.member_level', owner: '会员组', layer: 'ods', grain: '会员等级', partition: 'dt',
    rowCount: 860000, updatedAt: '2026-10-25 01:55',
    columns: [
      { name: 'member_id', type: 'string', comment: '会员' },
      { name: 'level', type: 'string', comment: '等级' }
    ]
  },
  'ads.channel_report': { table: 'ads.channel_report', owner: '报表组', layer: 'ads', grain: '渠道 × 日期', partition: 'dt', rowCount: 12000, updatedAt: '2026-10-25 05:10', columns: [] },
  'api.channel_metrics': { table: 'api.channel_metrics', owner: '数据服务组', layer: 'api', grain: '渠道 × 日期', partition: '—', rowCount: 0, updatedAt: '2026-10-25 05:20', columns: [] },
  'rpt.funnel': { table: 'rpt.funnel', owner: '报表组', layer: 'ads', grain: '渠道 × 日期', partition: 'dt', rowCount: 12000, updatedAt: '2026-10-25 05:12', columns: [] },
  'ads.member_level_daily': { table: 'ads.member_level_daily', owner: '会员组', layer: 'ads', grain: '等级 × 日期', partition: 'dt', rowCount: 3000, updatedAt: '2026-10-25 02:40', columns: [] }
}

const EDGES = [
  { from: 'dwd.orders', to: 'dws.trade_channel_daily', kind: 'task' },
  { from: 'dim.channel', to: 'dws.trade_channel_daily', kind: 'dim' },
  { from: 'dws.trade_channel_daily', to: 'ads.channel_report', kind: 'report' },
  { from: 'dws.trade_channel_daily', to: 'api.channel_metrics', kind: 'api' },
  { from: 'dws.trade_channel_daily', to: 'rpt.funnel', kind: 'report' },
  { from: 'ods.member', to: 'dim.member', kind: 'task' },
  { from: 'ods.member_level', to: 'dim.member', kind: 'dim' },
  { from: 'dim.member', to: 'ads.member_level_daily', kind: 'report' }
]

function tableOf(table) {
  return TABLES[table] || { table, owner: '未知', layer: '—', grain: '待确认', partition: '—', rowCount: null, updatedAt: null, columns: [] }
}

function pickScenario(args) {
  return args && SCENARIO_KEYS.includes(args.scenario) ? args.scenario : SCENARIO_KEYS[0]
}

function ticketFromRequirement(requirement) {
  return {
    id: requirement.id,
    title: requirement.title,
    goal: requirement.goal,
    priority: requirement.priority,
    owner: requirement.title === '会员维度建模' ? '会员组' : '交易组',
    status: '进行中',
    acceptance: requirement.acceptance,
    impacts: requirement.impacts.map(item => {
      const [type, name] = String(item).split(' · ')
      return { type: type || '资产', name: name || String(item) }
    }),
    links: [],
    updatedAt: requirement.updatedAt
  }
}

export function createMockProvider() {
  return {
    kind: 'mock',
    async getTicket(args) {
      return ticketFromRequirement(buildRequirement({ scenario: pickScenario(args), ticketId: args && args.ticketId }))
    },
    async getTable(args) {
      return tableOf(args.table)
    },
    async getLineage(args) {
      const direction = args.direction || 'both'
      const depth = Math.max(1, Math.min(3, Number(args.depth) || 1))
      const seen = new Set([args.table])
      const nodes = [tableOf(args.table)]
      const edges = []
      let frontier = [args.table]
      for (let level = 0; level < depth; level++) {
        const next = []
        for (const edge of EDGES) {
          const matchUp = edge.to === frontier[0] || frontier.includes(edge.to)
          const matchDown = frontier.includes(edge.from)
          if ((direction === 'up' || direction === 'both') && matchUp && !seen.has(edge.from)) {
            seen.add(edge.from); nodes.push(tableOf(edge.from)); next.push(edge.from); edges.push(edge)
          }
          if ((direction === 'down' || direction === 'both') && matchDown && !seen.has(edge.to)) {
            seen.add(edge.to); nodes.push(tableOf(edge.to)); next.push(edge.to); edges.push(edge)
          }
        }
        if (!next.length) break
        frontier = next
      }
      return { table: args.table, direction, depth, nodes, edges, truncated: false }
    },
    async getDesign(args) {
      return buildDesign({ scenario: pickScenario(args), targetTable: args && args.targetTable })
    },
    async getTechPlan(args) {
      return buildTechPlan({ scenario: pickScenario(args) })
    },
    async getEvidence(args) {
      return buildEvidence({ scenario: pickScenario(args) })
    },
    async getDevelop(args) {
      return buildDevelop({ scenario: pickScenario(args) })
    },
    async getTest(args) {
      return buildTest({ scenario: pickScenario(args) })
    },
    async getRelease(args) {
      return buildRelease({ scenario: pickScenario(args) })
    },
    async getPostmortem(args) {
      return buildPostmortem({ scenario: pickScenario(args) })
    },
    async getIncident(args) {
      return buildIncident({ scenario: pickScenario(args) })
    }
  }
}
