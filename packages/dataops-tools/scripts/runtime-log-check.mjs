#!/usr/bin/env node
import { createMockRuntimeLogService } from '../src/runtime-log/mock.js'
import { createRuntimeLogRoute } from '../src/runtime-log/route.js'

const results = []
const checks = []
const check = (name, fn) => checks.push([name, fn])
const assert = (condition, message) => { if (!condition) throw new Error(message) }

check('runtime log lists by platform coordinates and details by runId', () => {
  const service = createMockRuntimeLogService()
  const lts = service.list({ platform: 'lts', project: 'dataops-sample', group: 'channel_daily', task: 'channel_daily_mixed' })
  assert(lts.ok && lts.runs.length === 3, 'LTS runs')
  assert(lts.runs[0].runId === 'lts-run-20261102-0310', 'failed first')
  const etl = service.list({ platform: 'etl', project: 'dataops-sample', group: 'etl_channel_sync', job: 'sync_channel' })
  assert(etl.ok && etl.runs.length === 2, 'ETL runs')
  const detail = service.detail({ platform: 'lts', project: 'dataops-sample', group: 'channel_daily', task: 'channel_daily_mixed', runId: lts.runs[0].runId })
  assert(detail.ok && detail.events.length === 4 && detail.errorCodes.includes('DB_TIMEOUT'), 'detail')
  assert(!('package' in detail.locator) && !('package' in lts.locator), 'runtime locator must not be package scoped')
})

check('runtime log route exposes targets, list and detail', async () => {
  let route
  const service = createMockRuntimeLogService()
  const connection = { fetch: { register(definition) { route = definition.fetch; return () => {} } } }
  const ctx = {
    get(name) {
      if (name === 'connection') return connection
      if (name === 'agents') return { get(id) { return id === 's1' ? { id } : undefined } }
      return undefined
    },
    effect(fn) { return fn() }
  }
  createRuntimeLogRoute(ctx, service)
  assert(typeof route === 'function', 'route registered')
  const targets = await route(new Request('http://x/api/dataops/runtime-log?sessionId=s1&mode=targets'))
  assert(targets.status === 200, 'targets status')
  assert((await targets.json()).targets.length === 2, 'targets')
  const list = await route(new Request('http://x/api/dataops/runtime-log?sessionId=s1&mode=list&platform=lts&project=dataops-sample&group=channel_daily&task=channel_daily_mixed'))
  assert(list.status === 200, 'list status')
  const listed = await list.json()
  const detail = await route(new Request('http://x/api/dataops/runtime-log?sessionId=s1&mode=detail&platform=lts&project=dataops-sample&group=channel_daily&task=channel_daily_mixed&runId=' + listed.runs[0].runId))
  assert(detail.status === 200, 'detail status')
  assert(!new URL('http://x/api/dataops/runtime-log?sessionId=s1&mode=list').searchParams.has('package'), 'route must not accept package')
})

const failures = []
for (const [name, fn] of checks) {
  try { await fn(); console.log('ok   ' + name) } catch (error) { failures.push([name, error]) }
}
if (failures.length) {
  for (const [name, error] of failures) console.error('FAIL ' + name + ': ' + error.message)
  process.exit(1)
}
console.log('runtime log: PASS (' + checks.length + ' checks)')
