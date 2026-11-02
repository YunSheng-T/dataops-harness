/**
 * Mock code-scan service for the DataOps UI contract.
 *
 * The real service and CLI are internal. This adapter only proves the scanId,
 * polling and result shape; it never reads source files or executes rules.
 */
const MOCK_FILES = [
  'code/sql/channel_report/DML/dws_channel_daily.sql',
  'code/sql/channel_report/DDL/dws_channel_daily.sql',
  'lts_code/channel_daily/task.yaml'
]

function accepted(scanId, now) {
  return { ok: true, kind: 'code_scan', scanId, phase: 'queued', acceptedAt: new Date(now).toISOString() }
}

export function createMockCodeScanService(options = {}) {
  const now = typeof options.now === 'function' ? options.now : Date.now
  const durationMs = Number.isFinite(options.durationMs) ? options.durationMs : 900
  const runs = new Map()
  let sequence = 0

  function start(input = {}) {
    sequence += 1
    const scanId = 'scan-mock-' + String(sequence).padStart(4, '0')
    const startedAt = now()
    runs.set(scanId, {
      scanId,
      sessionId: input.sessionId || null,
      source: input.source || 'panel',
      profile: input.profile || 'dataops-default',
      scope: input.scope && input.scope.kind ? input.scope : { kind: 'workspace' },
      startedAt
    })
    return accepted(scanId, startedAt)
  }

  function get(scanId) {
    const run = runs.get(scanId)
    if (!run) return null
    const elapsed = now() - run.startedAt
    const phase = elapsed < 150 ? 'queued' : elapsed < durationMs ? 'running' : 'complete'
    const result = {
      schemaVersion: '1.0',
      kind: 'code_scan',
      scanId,
      sessionId: run.sessionId,
      phase,
      status: phase === 'complete' ? 'warn' : 'running',
      engine: { name: 'mock-code-scan', version: '0.0.0' },
      profile: run.profile,
      source: run.source,
      scope: { kind: 'files', files: MOCK_FILES.slice() },
      findings: [
        {
          id: 'finding-group-by',
          ruleId: 'SQL_GROUP_BY',
          category: 'sql',
          severity: 'warning',
          message: '查询包含未聚合字段，可能影响结果粒度。',
          location: { path: MOCK_FILES[0], line: 42 }
        },
        {
          id: 'finding-scope-ok',
          ruleId: 'FILE_SCOPE_OK',
          category: 'scope',
          severity: 'info',
          message: '文件在扫描范围内。',
          location: { path: MOCK_FILES[2], line: 1 }
        }
      ],
      impacts: {
        packages: [{ name: 'sql_channel_models', files: 2 }],
        assets: [{ id: 'dws_channel_daily', kind: 'table', package: 'sql_channel_models', downstream: 2 }],
        downstream: [
          { id: 'rpt_channel_gmv', kind: 'report', criticality: 'critical', distance: 2 },
          { id: 'api_channel_metrics', kind: 'data_service', criticality: 'medium', distance: 1 }
        ]
      },
      metrics: { files: 3, packages: 1, findings: 2, warnings: 1 },
      asOf: new Date(run.startedAt + durationMs).toISOString()
    }
    return result
  }

  function reset() { runs.clear(); sequence = 0 }
  return { start, get, reset }
}

export const MOCK_SCAN_FILES = MOCK_FILES
