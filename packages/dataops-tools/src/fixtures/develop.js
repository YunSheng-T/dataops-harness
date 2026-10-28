export const DEVELOP_AS_OF = '2026-10-27T16:40:00+08:00'

export const DEVELOP = {
  kind: 'develop',
  schemaVersion: 2,
  stage: 'develop',
  source: 'mock-development',
  mock: true,
  asOf: DEVELOP_AS_OF,
  target: 'dws.trade_channel_daily',
  branch: 'feat/channel-pay-caliber',
  status: 'awaiting_merge',
  loop: 2,
  artifacts: [
    { type: 'sql', path: 'deliverables/develop/sql/create_or_replace.sql', owner: '交易组' },
    { type: 'sql', path: 'deliverables/develop/sql/etl.sql', owner: '交易组' },
    { type: 'sql', path: 'deliverables/develop/sql/reconcile.sql', owner: '交易组' },
    { type: 'sql', path: 'deliverables/develop/sql/rollback.sql', owner: '交易组' },
    { type: 'etl_yaml', path: 'deliverables/develop/etl/etl_channel_pay.yaml', owner: '交易组' },
    { type: 'schedule_yaml', path: 'deliverables/develop/schedule/channel_pay_daily.yaml', owner: '交易组' },
    { type: 'data_consume_api_yaml', path: 'deliverables/develop/api/channel_metrics_api.yaml', owner: '数据服务组' },
    { type: 'ops_script', path: 'deliverables/develop/ops/datasource.yaml', owner: '交易组' },
    { type: 'ops_script', path: 'deliverables/develop/ops/deploy.sh', owner: '交易组' },
    { type: 'test', path: 'deliverables/develop/tests/test-report.md', owner: '交易组' }
  ],
  validation: {
    build: {
      status: 'passed', attempt: 2, log: 'evidence/ev-develop-build-002.yaml',
      attempts: [
        { attempt: 1, status: 'failed', error: 'decimal(18,2) 与源字段 decimal(18,4) 类型不匹配', action: '显式 cast 并补精度校验' },
        { attempt: 2, status: 'passed', note: '编译通过，生成 etl/schedule/api' }
      ]
    },
    scan: {
      status: 'passed', attempt: 2, blocking: [],
      attempts: [
        { attempt: 1, status: 'failed', blocking: ['并发 8 > 平台上限 4', '任务作业数 52 > 平台上限 50'], action: '拆分为两个依赖段，并发降到 4' },
        { attempt: 2, status: 'passed', checks: ['并发 4/4', '作业数 48/50', 'SQL 规范通过', '密钥扫描通过'] }
      ]
    },
    deploy: {
      status: 'passed', attempt: 2, env: 'dev', evidence: 'evidence/ev-develop-deploy-002.yaml',
      attempts: [
        { attempt: 1, status: 'blocked', reason: '数据源 dwd.orders 未登记', action: '补 datasource.yaml 并重部署' },
        { attempt: 2, status: 'passed', note: '开发环境数据源与权限验证通过' }
      ]
    },
    test: {
      status: 'manual', attempt: 1, note: '平台无自动化测试机制，人工验证',
      cases: [
        { name: '主键唯一', result: 'pass', detail: '(dt, channel_id) 0 重复' },
        { name: '空渠道', result: 'pass', detail: '0.18% < 0.1% 阈值待确认' },
        { name: '去重前后', result: 'manual', detail: 'order_id 1% 重复需人工核对' }
      ]
    }
  },
  tasks: [
    { id: 'T1', name: 'ETL SQL 与支付口径过滤', status: 'done', progress: 100, owner: '交易组' },
    { id: 'T2', name: '调度与依赖', status: 'done', progress: 100, owner: '交易组' },
    { id: 'T3', name: '数据消费 API 契约', status: 'done', progress: 100, owner: '数据服务组' },
    { id: 'T4', name: '回滚 SQL 与调度回滚', status: 'done', progress: 100, owner: '交易组' },
    { id: 'T5', name: '测试与对账', status: 'done', progress: 100, owner: '交易组' },
    { id: 'T6', name: '合入等待 Committer', status: 'pending', progress: 0, owner: '代码平台' }
  ],
  review: {
    se: { status: 'approved', approver: '王工', at: DEVELOP_AS_OF },
    committer: { status: 'pending', approver: '代码平台' },
    ba: 'advisory'
  },
  merge: { status: 'pending', commit: null, reviewer: '代码平台' },
  mustNotChange: ['ADS 字段名', 'API 契约', '明细粒度'],
  rollback: { artifact: 'deliverables/develop/sql/rollback.sql', schedule: 'channel_pay_daily 回滚配置' },
  gaps: [
    { id: 'G-TEST-AUTO', severity: 'warning', message: '平台无自动化测试机制，测试为人工记录', owner: '平台组' }
  ]
}

export const DEVELOP_BUILD_FAILED = {
  ...DEVELOP,
  status: 'fixing',
  loop: 1,
  validation: {
    build: {
      status: 'failed',
      attempt: 1,
      error: '编译失败：dws.trade_channel_daily.order_cnt 聚合与源字段类型不匹配',
      log: 'evidence/ev-develop-build-001.yaml',
      attempts: [
        { attempt: 1, status: 'failed', error: 'decimal(18,2) 与源字段 decimal(18,4) 类型不匹配', action: '等待修复：显式 cast 并补精度校验' }
      ]
    },
    scan: { status: 'pending' },
    deploy: { status: 'pending' },
    test: { status: 'pending' }
  },
  review: {
    se: { status: 'pending', approver: '王工' },
    committer: { status: 'waiting', approver: '代码平台' },
    ba: 'advisory'
  },
  merge: { status: 'pending', commit: null, reviewer: '代码平台' },
  gaps: [
    { id: 'G-BUILD', severity: 'blocking', message: 'Build attempt 1 失败，必须修复后重跑', owner: '交易组' }
  ]
}
