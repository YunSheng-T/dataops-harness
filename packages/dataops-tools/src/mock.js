/**
 * Mock stage payloads.
 *
 * These are the exact JSON shapes the client cards already project. When the
 * real platform adapters land, each builder is replaced by an API/MCP call and
 * the tool signatures stay unchanged.
 */
export const SCENARIOS = {
  'channel-report': {
    requirement: {
      kind: 'requirement',
      id: '需求 #3821',
      title: '渠道日报改造',
      source: 'devops（mock）',
      priority: 'P2',
      goal: '渠道日报从下单口径改为支付口径，按渠道按天输出。',
      scope: 'dws.trade_channel_daily + 1 张报表，不动上游明细。',
      acceptance: ['与旧口径差异 < 0.5%', '05:00 前产出', '空渠道占比 < 0.1%'],
      impacts: ['报表 · ads.channel_report', 'API · api.channel_metrics', '报表 · rpt.funnel'],
      artifact: 'requirement.yaml',
      updatedAt: '2026-10-25 09:30'
    },
    design: {
      kind: 'design',
      status: 'draft',
      target: { table: 'dws.trade_channel_daily', grain: '渠道 × 日期', partition: 'dt' },
      sources: [
        { table: 'dwd.orders', fields: ['order_id', 'channel_id', 'pay_time', 'amount'], filter: 'dt = ${bizdate}' },
        { table: 'dim.channel', join: 'channel_id' }
      ],
      steps: [
        { title: '过滤有效订单', logic: "status in ('paid','shipped') and amount > 0" },
        { title: '按渠道聚合', logic: 'count(distinct order_id) as order_cnt, sum(amount) as gmv' },
        { title: '补全渠道名', logic: 'left join dim.channel on channel_id' }
      ],
      schedule: { cron: '0 3 * * *', sla: '05:00', dependsOn: ['dwd.orders@dt-1', 'dim.channel@dt'] },
      metrics: [{ name: 'order_cnt', definition: '支付订单数（去重）', owner: '交易组' }],
      artifact: 'design.yaml',
      updatedAt: '2026-10-25 09:42'
    },
    techPlan: {
      kind: 'tech_plan',
      status: 'draft',
      tasks: [
        { platform: '建模平台', name: '新建 dws.trade_channel_daily（1 张表）' },
        { platform: 'ETL 平台', name: '订单过滤 + 渠道聚合（2 个任务）' },
        { platform: '调度平台', name: '日更 03:00，依赖 dwd.orders@dt-1' }
      ],
      estimate: '2 人日',
      risks: ['上游 dwd.orders 延迟会顶到 05:00 SLA', 'api.channel_metrics 需提前通知调用方'],
      artifact: 'tech-plan.yaml',
      updatedAt: '2026-10-25 09:50'
    },
    evidence: {
      kind: 'evidence',
      claim: 'dwd.orders 近 7 天日均 200 万行，user_id 空值 0.3%',
      query: "SELECT dt, count(*) AS rows, sum(if(user_id IS NULL,1,0)) AS nulls\nFROM dwd.orders\nWHERE dt BETWEEN '2026-10-18' AND '2026-10-24'\nGROUP BY dt;",
      timeRange: '2026-10-18 ~ 2026-10-24',
      env: 'prod 只读',
      asOf: '2026-10-25 09:28',
      cost: '扫描 1.2 GB · 3.4s',
      tone: 'pass',
      artifact: 'evidence/ev-001.yaml'
    }
  },
  'member-model': {
    requirement: {
      kind: 'requirement',
      id: '需求 #3902',
      title: '会员维度建模',
      source: 'devops（mock）',
      priority: 'P1',
      goal: '建立统一的会员维度，支持会员等级、注册渠道、生命周期状态分析。',
      scope: 'dim.member + 1 个下游看板，替换现有三张口径不一致的会员表。',
      acceptance: ['主键 member_id 唯一', '等级口径与交易域一致', '02:30 前产出'],
      impacts: ['看板 · member_growth', '报表 · ads.member_level_daily'],
      artifact: 'requirement.yaml',
      updatedAt: '2026-10-25 09:05'
    },
    design: {
      kind: 'design',
      status: 'draft',
      target: { table: 'dim.member', grain: '会员 × 快照日期', partition: 'dt' },
      sources: [
        { table: 'ods.member', fields: ['member_id', 'register_channel', 'register_time', 'status'], filter: 'dt = ${bizdate}' },
        { table: 'ods.member_level', join: 'member_id' }
      ],
      steps: [
        { title: '去重会员主档', logic: 'row_number() over (partition by member_id order by update_time desc) = 1' },
        { title: '关联当前等级', logic: 'left join ods.member_level on member_id' },
        { title: '打生命周期标记', logic: "case when status = 'active' then 'active' else 'churned' end" }
      ],
      schedule: { cron: '0 2 * * *', sla: '02:30', dependsOn: ['ods.member@dt', 'ods.member_level@dt'] },
      metrics: [{ name: 'member_cnt', definition: '有效会员数（去重）', owner: '会员组' }],
      artifact: 'design.yaml',
      updatedAt: '2026-10-25 09:16'
    },
    techPlan: {
      kind: 'tech_plan',
      status: 'draft',
      tasks: [
        { platform: '建模平台', name: '新建 dim.member（快照表）' },
        { platform: 'ETL 平台', name: '会员去重 + 等级关联（2 个任务）' },
        { platform: '调度平台', name: '日更 02:00，依赖 ods.member@dt' }
      ],
      estimate: '3 人日',
      risks: ['历史等级缺失需要回刷', '三张旧表下线要排期通知'],
      artifact: 'tech-plan.yaml',
      updatedAt: '2026-10-25 09:24'
    },
    evidence: {
      kind: 'evidence',
      claim: 'ods.member 近 7 天日均新增 1.8 万，member_id 重复率 0.02%',
      query: "SELECT dt, count(*) AS rows, count(*) - count(distinct member_id) AS dup\nFROM ods.member\nWHERE dt BETWEEN '2026-10-18' AND '2026-10-24'\nGROUP BY dt;",
      timeRange: '2026-10-18 ~ 2026-10-24',
      env: 'prod 只读',
      asOf: '2026-10-25 09:02',
      cost: '扫描 320 MB · 1.1s',
      tone: 'warn',
      artifact: 'evidence/ev-002.yaml'
    }
  }
}


export const STAGE_FIXTURES = {
  'channel-report': {
    develop: {
      kind: 'develop', status: 'running',
      target: 'dws.trade_channel_daily',
      branch: 'feature/channel-report-pay',
      tasks: [
        { name: '支付口径订单过滤', platform: 'ETL', owner: '交易组', status: 'done', progress: 100 },
        { name: '渠道维表关联', platform: 'ETL', owner: '交易组', status: 'running', progress: 70 },
        { name: '日报调度配置', platform: '调度', owner: '交易组', status: 'pending', progress: 0 }
      ],
      runs: [{ id: 'run-20261025-03', status: 'success', at: '2026-10-25 03:18' }],
      blockers: [{ message: 'dim.channel 新增 channel_type 字段待发布', owner: '交易组' }],
      artifact: 'develop.yaml', updatedAt: '2026-10-25 14:20'
    },
    test: {
      kind: 'test', status: 'passed', conclusion: 'pass',
      target: 'dws.trade_channel_daily',
      summary: { diff: '0.12%', quality: '99.98%', performance: '38s', sla: '04:40' },
      cases: [
        { name: '主键唯一', type: '唯一性', status: 'pass', detail: '0 重复' },
        { name: '支付金额对账', type: '对账', status: 'pass', detail: '差异 0.12% < 0.5%' },
        { name: '空渠道占比', type: '质量', status: 'warn', detail: '0.18% > 0.1%，需补映射' },
        { name: '产出时效', type: 'SLA', status: 'pass', detail: '04:40 < 05:00' }
      ],
      artifact: 'test-report.yaml', updatedAt: '2026-10-25 15:10'
    },
    release: {
      kind: 'release', status: 'pending', changeId: 'CHG-20261025-01',
      target: 'dws.trade_channel_daily',
      window: '2026-10-26 04:00 - 05:00',
      strategy: '灰度 10% → 50% → 100%',
      steps: ['预发校验', '灰度 10% 对比', '全量切换', '旧口径下线'],
      rollback: '切回 dws.trade_channel_daily_v1，5 分钟内完成',
      approvals: [
        { role: '数据负责人', status: 'approved' },
        { role: '下游报表 owner', status: 'pending' }
      ],
      artifact: 'release.yaml', updatedAt: '2026-10-25 15:30'
    },
    postmortem: {
      kind: 'postmortem', status: 'done', target: 'dws.trade_channel_daily',
      summary: '渠道日报切换支付口径，首日按时产出，差异 0.12%。',
      metrics: [
        { name: '对账差异', target: '<0.5%', actual: '0.12%' },
        { name: '产出时效', target: '05:00', actual: '04:40' },
        { name: '空渠道占比', target: '<0.1%', actual: '0.18%' }
      ],
      issues: [{ title: '空渠道占比未达标', severity: 'P2', action: '补齐渠道维表映射' }],
      actions: [{ owner: '交易组', action: '补 channel_type 映射', due: '2026-11-01' }],
      artifact: 'postmortem.yaml', updatedAt: '2026-10-27 10:00'
    },
    incident: {
      kind: 'incident', status: '处理中', severity: 'P1',
      title: '渠道日报任务失败', target: 'dws.trade_channel_daily',
      startedAt: '2026-10-25 03:12',
      symptom: '03:00 调度失败，下游 3 张报表未产出',
      timeline: [
        { time: '03:12', event: '任务 dws_trade_channel_daily 失败' },
        { time: '03:15', event: '下游报表延迟告警' },
        { time: '03:22', event: '定位上游 dt=2026-10-25 分区未产出' },
        { time: '03:40', event: '上游补数任务已提交' }
      ],
      cause: '上游 dwd.orders 当日分区未产出，任务读取空分区后主键校验失败。',
      impact: {
        count: 3,
        top: [
          { table: 'ads.channel_report', type: 'report', owner: '报表组' },
          { table: 'api.channel_metrics', type: 'api', owner: '数据服务组' },
          { table: 'rpt.funnel', type: 'report', owner: '报表组' }
        ]
      },
      actions: [
        { action: '重跑上游 dwd.orders 补数', owner: '交易组', status: '进行中' },
        { action: '恢复后重跑日报', owner: '交易组', status: '待执行' }
      ],
      evidence: {
        query: "select count(*) from dwd.orders where dt = '2026-10-25'",
        timeRange: '2026-10-25', env: 'prod 只读', cost: '扫描 1.2 GB · 2.8s'
      },
      artifact: 'incident.yaml', updatedAt: '2026-10-25 03:45'
    }
  },
  'member-model': {
    develop: {
      kind: 'develop', status: 'done',
      target: 'dim.member',
      branch: 'feature/member-dim',
      tasks: [
        { name: '会员主档去重', platform: 'ETL', owner: '会员组', status: 'done', progress: 100 },
        { name: '等级关联', platform: 'ETL', owner: '会员组', status: 'done', progress: 100 },
        { name: '生命周期标记', platform: 'ETL', owner: '会员组', status: 'done', progress: 100 }
      ],
      runs: [{ id: 'run-20261025-02', status: 'success', at: '2026-10-25 02:18' }],
      blockers: [],
      artifact: 'develop.yaml', updatedAt: '2026-10-25 13:10'
    },
    test: {
      kind: 'test', status: 'passed', conclusion: 'pass',
      target: 'dim.member',
      summary: { diff: '0.02%', quality: '99.99%', performance: '22s', sla: '02:10' },
      cases: [
        { name: 'member_id 唯一', type: '唯一性', status: 'pass', detail: '0 重复' },
        { name: '等级口径', type: '一致性', status: 'pass', detail: '与交易域差异 0.02%' },
        { name: '历史回刷', type: '数据量', status: 'pass', detail: '覆盖 86 万会员' },
        { name: '产出时效', type: 'SLA', status: 'pass', detail: '02:10 < 02:30' }
      ],
      artifact: 'test-report.yaml', updatedAt: '2026-10-25 14:05'
    },
    release: {
      kind: 'release', status: 'approved', changeId: 'CHG-20261025-02',
      target: 'dim.member',
      window: '2026-10-26 02:00 - 03:00',
      strategy: '全量切换（维表）',
      steps: ['历史回刷', '预发校验', '全量切换', '旧表下线'],
      rollback: '恢复三张旧会员表读取，切换周知下游',
      approvals: [
        { role: '数据负责人', status: 'approved' },
        { role: '下游看板 owner', status: 'approved' }
      ],
      artifact: 'release.yaml', updatedAt: '2026-10-25 14:30'
    },
    postmortem: {
      kind: 'postmortem', status: 'done', target: 'dim.member',
      summary: '会员维度上线，主键唯一和等级口径达标，旧表按计划下线。',
      metrics: [
        { name: '等级差异', target: '<0.1%', actual: '0.02%' },
        { name: '产出时效', target: '02:30', actual: '02:10' },
        { name: '会员覆盖', target: '>= 86 万', actual: '86.2 万' }
      ],
      issues: [{ title: '历史等级缺失回刷耗时', severity: 'P3', action: '下次拆批回刷' }],
      actions: [{ owner: '会员组', action: '补历史等级监控', due: '2026-11-05' }],
      artifact: 'postmortem.yaml', updatedAt: '2026-10-27 11:00'
    },
    incident: {
      kind: 'incident', status: '已恢复', severity: 'P2',
      title: '会员等级口径不一致', target: 'dim.member',
      startedAt: '2026-10-25 02:20',
      symptom: '会员看板等级分布差异 1.2%，交易域与会员域对不上',
      timeline: [
        { time: '02:20', event: '看板差异告警' },
        { time: '02:35', event: '定位 ods.member_level 延迟更新' },
        { time: '02:50', event: '重跑等级关联任务' },
        { time: '03:05', event: '差异回到 0.02%，恢复' }
      ],
      cause: 'ods.member_level 当日分区延迟，dim.member 读到前一日的等级快照。',
      impact: {
        count: 2,
        top: [
          { table: 'ads.member_level_daily', type: 'report', owner: '会员组' },
          { table: 'member_growth', type: 'dashboard', owner: '会员组' }
        ]
      },
      actions: [
        { action: '等级任务增加上游就绪检查', owner: '会员组', status: '已完成' },
        { action: '看板加口径差异监控', owner: '会员组', status: '待执行' }
      ],
      evidence: {
        query: "select dt, level, count(*) from dim.member where dt = '2026-10-25' group by dt, level",
        timeRange: '2026-10-25', env: 'prod 只读', cost: '扫描 320 MB · 1.1s'
      },
      artifact: 'incident.yaml', updatedAt: '2026-10-25 03:10'
    }
  }
}

// v2 scheme / CICD mock story. Kept separate so the original 7-stage fixtures
// remain readable; tools return these payloads with kind/source/asOf.
const SCENARIO_EXTRAS = {
  'channel-report': {
    profile: {
      kind: 'profile',
      table: 'dwd.orders',
      grain: '订单',
      partition: 'dt',
      rowCount: 2000000,
      columns: [
        { name: 'order_id', type: 'string', nullRate: '0%', distinct: 1980000, sample: 'ORD-20261025-001' },
        { name: 'channel_id', type: 'string', nullRate: '0.02%', distinct: 18, sample: 'ch_01' },
        { name: 'amount', type: 'decimal(18,2)', nullRate: '0.01%', min: 0.01, max: 99999 },
        { name: 'user_id', type: 'string', nullRate: '0.30%', distinct: 860000, sample: 'u_1024' }
      ],
      candidateKeys: ['order_id'],
      joinCoverage: [
        { from: 'dwd.orders.channel_id', to: 'dim.channel.channel_id', coverage: '99.98%' }
      ],
      findings: ['order_id 唯一，可作为粒度键', 'channel_id 覆盖 99.98%，18 个渠道', 'user_id 空值 0.30%，不影响渠道日报'],
      evidence: { query: "select count(*), count(distinct order_id) from dwd.orders where dt='2026-10-24'", timeRange: '2026-10-24', env: 'prod 只读', cost: '扫描 1.2 GB · 3.4s' },
      artifact: 'profile.yaml', updatedAt: '2026-10-25 10:02'
    },
    analysis: {
      kind: 'analysis',
      question: '支付口径改造后，渠道日报的订单数和 GMV 是否与旧口径可比？',
      baseline: [
        { metric: 'order_cnt', before: '1,820,000', after: '1,806,400', delta: '-0.75%' },
        { metric: 'gmv', before: '¥ 92.4M', after: '¥ 92.0M', delta: '-0.43%' }
      ],
      findings: [
        { title: '差异来自未支付订单', detail: '旧口径包含 pending/cancelled 订单，支付口径过滤后差异 0.75%。', severity: 'info' },
        { title: '空渠道占比 0.18%', detail: '18 个渠道中 3 个未在 dim.channel 登记，需要补映射。', severity: 'warning' }
      ],
      conclusion: '支付口径差异在 0.5% 阈值附近，建议先补渠道映射，再灰度切换。',
      evidence: { query: "select status, count(*) from dwd.orders where dt='2026-10-24' group by status", timeRange: '2026-10-24', env: 'prod 只读', cost: '扫描 420 MB · 1.2s' },
      artifact: 'analysis.md', updatedAt: '2026-10-25 10:18'
    },
    solution: {
      kind: 'solution',
      target: 'dws.trade_channel_daily',
      scope: '只改渠道日报的订单口径和调度依赖，不改上游明细。',
      decisions: [
        { decision: '过滤 status in (paid, shipped) 且 amount > 0', reason: '与财务支付口径一致' },
        { decision: '保留旧表一个灰度周期', reason: '支持快速回滚' }
      ],
      alternatives: [
        { option: '在 dwd 层加支付口径字段', tradeoff: '影响全链路，首版不采用' }
      ],
      acceptance: ['与旧口径差异 < 0.5%', '05:00 前产出', '空渠道占比 < 0.1%'],
      dependencies: ['dwd.orders@dt-1', 'dim.channel@dt'],
      artifact: 'solution.yaml', updatedAt: '2026-10-25 10:35'
    },
    scan: {
      kind: 'cicd', phase: 'scan', runId: 'CICD-20261025-01', status: 'pass',
      target: 'dws.trade_channel_daily',
      checks: [
        { name: 'SQL 规范', status: 'pass', detail: '无 SELECT * / 隐式转换' },
        { name: '分区裁剪', status: 'pass', detail: 'dt 条件命中分区' },
        { name: '调度依赖', status: 'warn', detail: '空渠道映射未登记，建议补 owner' },
        { name: '密钥扫描', status: 'pass', detail: '未发现明文密钥' }
      ],
      summary: { errors: 0, warnings: 1 },
      artifact: 'scan-report.yaml', updatedAt: '2026-10-25 15:45'
    },
    schedule: {
      kind: 'schedule', status: 'validated', dialect: 'mock-cli',
      target: 'dws.trade_channel_daily',
      spec: {
        apiVersion: 'dataops/v1', kind: 'ScheduleSpec',
        metadata: { name: 'dws_trade_channel_daily_daily', owner: '交易组' },
        spec: {
          timezone: 'Asia/Shanghai',
          schedule: { cron: '0 3 * * *', catchup: false },
          tasks: [
            { id: 'etl_trade_channel_daily', operator: 'spark_sql', dependsOn: ['dwd.orders', 'dim.channel'], partition: 'dt=${bizdate-1}', retries: 2, sla: '05:00' }
          ]
        }
      },
      yaml: "# generated by dataops compile (mock)\napiVersion: dataops/v1\nkind: ScheduleSpec\nmetadata:\n  name: dws_trade_channel_daily_daily\n  owner: 交易组\nspec:\n  timezone: Asia/Shanghai\n  schedule:\n    cron: \"0 3 * * *\"\n    catchup: false\n  tasks:\n    - id: etl_trade_channel_daily\n      operator: spark_sql\n      dependsOn: [dwd.orders, dim.channel]\n      partition: \"dt=${bizdate-1}\"\n      retries: 2\n      sla: \"05:00\"\n",
      diagnostics: [{ severity: 'warning', code: 'W-CHANNEL-MAP', message: '空渠道占比 0.18%，发布前建议补齐 dim.channel 映射。' }],
      compile: { command: 'dataops compile schedule-spec.yaml', exitCode: 0, durationMs: 1200, stdout: 'compiled schedule.yaml' },
      artifact: 'schedule.yaml', updatedAt: '2026-10-25 16:05'
    }
  },
  'member-model': {
    profile: {
      kind: 'profile', table: 'ods.member', grain: '会员', partition: 'dt', rowCount: 860000,
      columns: [
        { name: 'member_id', type: 'string', nullRate: '0%', distinct: 858000, sample: 'm_1024' },
        { name: 'status', type: 'string', nullRate: '0.10%', distinct: 4, sample: 'active' },
        { name: 'register_channel', type: 'string', nullRate: '1.20%', distinct: 12, sample: 'app' }
      ],
      candidateKeys: ['member_id'],
      joinCoverage: [{ from: 'ods.member.member_id', to: 'ods.member_level.member_id', coverage: '97.40%' }],
      findings: ['member_id 重复率 0.02%，可作为主键', '等级关联覆盖 97.4%，历史缺失需回刷'],
      evidence: { query: "select count(*), count(distinct member_id) from ods.member where dt='2026-10-24'", timeRange: '2026-10-24', env: 'prod 只读', cost: '扫描 320 MB · 1.1s' },
      artifact: 'profile.yaml', updatedAt: '2026-10-25 09:55'
    },
    analysis: {
      kind: 'analysis', question: '三张旧会员表能否合并为 dim.member？',
      baseline: [{ metric: '会员数', before: '852,000', after: '858,000', delta: '+0.70%' }],
      findings: [
        { title: '主键基本一致', detail: 'member_id 重复率 0.02%，可直接做快照主键。', severity: 'info' },
        { title: '历史等级缺失', detail: '2.6% 会员没有等级记录，需要回刷补全。', severity: 'warning' }
      ],
      conclusion: '可以合并，但必须先回刷等级缺口，否则下游看板会出现未知等级。',
      evidence: { query: "select level, count(*) from dim.member group by level", timeRange: '2026-10-24', env: 'prod 只读', cost: '扫描 80 MB · 0.4s' },
      artifact: 'analysis.md', updatedAt: '2026-10-25 10:08'
    },
    solution: {
      kind: 'solution', target: 'dim.member',
      scope: '统一会员维度，替换三张口径不一致的会员表。',
      decisions: [{ decision: '按 member_id 做快照', reason: '保留等级/生命周期历史' }],
      alternatives: [{ option: '保留三张旧表并打宽', tradeoff: '长期口径分裂，不采用' }],
      acceptance: ['member_id 唯一', '等级口径与交易域一致', '02:30 前产出'],
      dependencies: ['ods.member@dt', 'ods.member_level@dt'],
      artifact: 'solution.yaml', updatedAt: '2026-10-25 10:20'
    },
    scan: {
      kind: 'cicd', phase: 'scan', runId: 'CICD-20261025-02', status: 'pass',
      target: 'dim.member',
      checks: [
        { name: 'SQL 规范', status: 'pass', detail: '无 SELECT * / 隐式转换' },
        { name: '主键唯一', status: 'pass', detail: 'member_id 0 重复' },
        { name: '历史回刷', status: 'warn', detail: '2.6% 等级缺失，需回刷窗口' }
      ],
      summary: { errors: 0, warnings: 1 },
      artifact: 'scan-report.yaml', updatedAt: '2026-10-25 14:30'
    },
    schedule: {
      kind: 'schedule', status: 'validated', dialect: 'mock-cli', target: 'dim.member',
      spec: {
        apiVersion: 'dataops/v1', kind: 'ScheduleSpec',
        metadata: { name: 'dim_member_daily', owner: '会员组' },
        spec: { timezone: 'Asia/Shanghai', schedule: { cron: '0 2 * * *', catchup: false }, tasks: [{ id: 'etl_dim_member', operator: 'spark_sql', dependsOn: ['ods.member', 'ods.member_level'], partition: 'dt=${bizdate}', retries: 2, sla: '02:30' }] }
      },
      yaml: "# generated by dataops compile (mock)\napiVersion: dataops/v1\nkind: ScheduleSpec\nmetadata:\n  name: dim_member_daily\n  owner: 会员组\nspec:\n  timezone: Asia/Shanghai\n  schedule:\n    cron: \"0 2 * * *\"\n    catchup: false\n  tasks:\n    - id: etl_dim_member\n      operator: spark_sql\n      dependsOn: [ods.member, ods.member_level]\n      partition: \"dt=${bizdate}\"\n      retries: 2\n      sla: \"02:30\"\n",
      diagnostics: [{ severity: 'warning', code: 'W-LEVEL-GAP', message: '2.6% 会员等级缺失，建议先回刷。' }],
      compile: { command: 'dataops compile schedule-spec.yaml', exitCode: 0, durationMs: 980, stdout: 'compiled schedule.yaml' },
      artifact: 'schedule.yaml', updatedAt: '2026-10-25 14:50'
    }
  }
}

Object.keys(SCENARIO_EXTRAS).forEach(function (scenario) {
  Object.assign(SCENARIOS[scenario], SCENARIO_EXTRAS[scenario])
})

export const SCENARIO_KEYS = Object.keys(SCENARIOS)

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function pick(args) {
  const scenario = args && SCENARIOS[args.scenario] ? args.scenario : SCENARIO_KEYS[0]
  return { scenario: scenario, data: SCENARIOS[scenario] }
}

export function buildRequirement(args) {
  const { scenario, data } = pick(args)
  const payload = clone(data.requirement)
  if (args && args.ticketId) payload.id = '需求 ' + args.ticketId
  payload.scenario = scenario
  return payload
}

export function buildDesign(args) {
  const { scenario, data } = pick(args)
  const payload = clone(data.design)
  if (args && args.targetTable) payload.target.table = args.targetTable
  payload.scenario = scenario
  return payload
}

export function buildTechPlan(args) {
  const { scenario, data } = pick(args)
  const payload = clone(data.techPlan)
  payload.scenario = scenario
  return payload
}

export function buildEvidence(args) {
  const { scenario, data } = pick(args)
  const payload = clone(data.evidence)
  payload.scenario = scenario
  return payload
}

function extra(args, key) {
  const { scenario, data } = pick(args)
  return { scenario, payload: clone(data[key]) }
}

export function buildProfile(args) {
  const { scenario, payload } = extra(args, 'profile')
  payload.scenario = scenario
  return payload
}

export function buildAnalysis(args) {
  const { scenario, payload } = extra(args, 'analysis')
  payload.scenario = scenario
  return payload
}

export function buildSolution(args) {
  const { scenario, payload } = extra(args, 'solution')
  payload.scenario = scenario
  return payload
}

export function buildScan(args) {
  const { scenario, payload } = extra(args, 'scan')
  payload.scenario = scenario
  return payload
}

export function buildSchedule(args) {
  const { scenario, payload } = extra(args, 'schedule')
  payload.scenario = scenario
  return payload
}

function stageFixture(args, key) {
  const { scenario } = pick(args)
  return { scenario, data: clone(STAGE_FIXTURES[scenario][key]) }
}

export function buildDevelop(args) {
  const { scenario, data } = stageFixture(args, 'develop')
  data.scenario = scenario
  return data
}

export function buildTest(args) {
  const { scenario, data } = stageFixture(args, 'test')
  data.scenario = scenario
  return data
}

export function buildRelease(args) {
  const { scenario, data } = stageFixture(args, 'release')
  data.scenario = scenario
  return data
}

export function buildPostmortem(args) {
  const { scenario, data } = stageFixture(args, 'postmortem')
  data.scenario = scenario
  return data
}

export function buildIncident(args) {
  const { scenario, data } = stageFixture(args, 'incident')
  data.scenario = scenario
  return data
}
