/**
 * Mock RuntimeLog service.
 *
 * Runtime logs are addressed by platform coordinates, never by package.
 * The real list/detail calls are owned by dataops CLI; this fixture only
 * proves the DataOps UI contract.
 */
const TARGETS = [
  {
    platform: 'lts',
    project: 'dataops-sample',
    group: 'channel_daily',
    task: 'channel_daily_mixed',
    sourcePath: 'lts_code/channel_daily/task.yaml'
  },
  {
    platform: 'etl',
    project: 'dataops-sample',
    group: 'etl_channel_sync',
    job: 'sync_channel',
    sourcePath: 'code/etl/flashsync/channel_alert.csv'
  }
]

const RUNS = {
  'lts:dataops-sample:channel_daily:channel_daily_mixed': [
    { runId: 'lts-run-20261102-0310', status: 'failed', startedAt: '2026-11-02T03:10:00+08:00', finishedAt: '2026-11-02T03:39:00+08:00', durationMs: 1740000 },
    { runId: 'lts-run-20261101-0310', status: 'success', startedAt: '2026-11-01T03:10:00+08:00', finishedAt: '2026-11-01T03:36:00+08:00', durationMs: 1560000 },
    { runId: 'lts-run-20261031-0310', status: 'success', startedAt: '2026-10-31T03:10:00+08:00', finishedAt: '2026-10-31T03:34:00+08:00', durationMs: 1440000 }
  ],
  'etl:dataops-sample:etl_channel_sync:sync_channel': [
    { runId: 'etl-run-20261102-0308', status: 'success', startedAt: '2026-11-02T03:08:00+08:00', finishedAt: '2026-11-02T03:12:10+08:00', durationMs: 250000 },
    { runId: 'etl-run-20261101-0308', status: 'success', startedAt: '2026-11-01T03:08:00+08:00', finishedAt: '2026-11-01T03:11:50+08:00', durationMs: 230000 }
  ]
}

const EVENTS = {
  'lts-run-20261102-0310': [
    { seq: 1, at: '2026-11-02T03:10:00+08:00', phase: 'schedule', level: 'info', job: 'scheduler', message: '任务进入调度队列' },
    { seq: 2, at: '2026-11-02T03:12:00+08:00', phase: 'start', level: 'info', job: 'start', message: 'run 开始' },
    { seq: 3, at: '2026-11-02T03:14:00+08:00', phase: 'dependency', level: 'warn', job: 'load_check', message: '等待上游 dwd.orders 分区就绪', code: 'UPSTREAM_WAIT' },
    { seq: 4, at: '2026-11-02T03:24:00+08:00', phase: 'retry', level: 'warn', job: 'calc_sql', message: '作业重试 1 次', code: 'DB_TIMEOUT' },
    { seq: 5, at: '2026-11-02T03:39:00+08:00', phase: 'error', level: 'error', job: 'G_1006', message: 'group 终止；下游作业未执行', code: 'DB_TIMEOUT' }
  ],
  'lts-run-20261101-0310': [
    { seq: 1, at: '2026-11-01T03:10:00+08:00', phase: 'schedule', level: 'info', job: 'scheduler', message: '任务进入调度队列' },
    { seq: 2, at: '2026-11-01T03:12:00+08:00', phase: 'start', level: 'info', job: 'start', message: 'run 开始' },
    { seq: 3, at: '2026-11-01T03:36:00+08:00', phase: 'end', level: 'info', job: 'end', message: 'run 成功' }
  ],
  'etl-run-20261102-0308': [
    { seq: 1, at: '2026-11-02T03:08:00+08:00', phase: 'start', level: 'info', job: 'sync_channel', message: 'ETL job 开始' },
    { seq: 2, at: '2026-11-02T03:10:00+08:00', phase: 'job', level: 'info', job: 'sync_channel', message: '读取源表完成' },
    { seq: 3, at: '2026-11-02T03:12:10+08:00', phase: 'end', level: 'info', job: 'sync_channel', message: '写入目标表完成' }
  ]
}

function key(locator) {
  return [locator.platform, locator.project, locator.group || '', locator.task || locator.job || ''].join(':')
}

function normalizeLocator(input = {}) {
  return {
    platform: String(input.platform || ''),
    project: String(input.project || ''),
    group: String(input.group || ''),
    task: input.task ? String(input.task) : undefined,
    job: input.job ? String(input.job) : undefined,
    sourcePath: input.sourcePath ? String(input.sourcePath) : undefined
  }
}

export function createMockRuntimeLogService() {
  function targets() {
    return TARGETS.map(item => ({ ...item }))
  }

  function list(input) {
    const locator = normalizeLocator(input)
    if (!locator.platform || !locator.project || !locator.group || (!locator.task && !locator.job)) {
      return { ok: false, error: 'LOCATOR_INCOMPLETE', gaps: ['platform/project/group/task 必须完整'] }
    }
    const runs = RUNS[key(locator)] || []
    return {
      ok: true,
      kind: 'runtime_log_list',
      locator,
      source: 'mock',
      asOf: '2026-11-02T03:42:00+08:00',
      runs: runs.map(run => ({ ...run }))
    }
  }

  function detail(input) {
    const locator = normalizeLocator(input)
    const runId = input.runId ? String(input.runId) : ''
    if (!runId) return { ok: false, error: 'RUN_ID_REQUIRED' }
    const runs = RUNS[key(locator)] || []
    const run = runs.find(item => item.runId === runId)
    if (!run) return { ok: false, error: 'RUN_NOT_FOUND' }
    const events = EVENTS[runId] || []
    return {
      ok: true,
      kind: 'runtime_log',
      locator,
      run: { ...run },
      events,
      upstream: ['dwd.orders'],
      downstream: ['ads.channel_report', 'rpt.funnel'],
      errorCodes: Array.from(new Set(events.map(event => event.code).filter(Boolean))),
      source: 'mock',
      asOf: '2026-11-02T03:42:00+08:00'
    }
  }

  return { targets, list, detail }
}
