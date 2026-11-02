#!/usr/bin/env node
import { createMockCodeScanService } from '../src/code-scan/mock.js'
import { createCodeScanRoute } from '../src/code-scan/route.js'

const results = []
const checks = []
const check = (name, fn) => checks.push([name, fn])
const assert = (condition, message) => { if (!condition) throw new Error(message) }

check('mock scan service is async and only exposes scanId', () => {
  let now = 1000
  const service = createMockCodeScanService({ now: () => now, durationMs: 1000 })
  const accepted = service.start({ sessionId: 's1', scope: { kind: 'workspace' } })
  assert(accepted.scanId === 'scan-mock-0001', 'scanId')
  assert(accepted.phase === 'queued', 'accepted phase')
  const queued = service.get(accepted.scanId)
  assert(queued.phase === 'queued', 'queued result')
  now += 300
  const running = service.get(accepted.scanId)
  assert(running.phase === 'running', 'running phase')
  now += 900
  const complete = service.get(accepted.scanId)
  assert(complete.phase === 'complete', 'complete phase')
  assert(complete.findings.some(item => item.ruleId === 'SQL_GROUP_BY'), 'finding')
  assert(complete.impacts.downstream.length === 2, 'impacts')
  assert(service.get('scan-missing') === null, 'unknown scan')
})

check('code scan route triggers and reads by scanId only', async () => {
  let route
  const now = () => 2000
  const service = createMockCodeScanService({ now })
  const connection = { fetch: { register(definition) { route = definition.fetch; return () => {} } } }
  const ctx = {
    get(name) {
      if (name === 'connection') return connection
      if (name === 'agents') return { get(id) { return id === 's1' ? { id } : undefined } }
      return undefined
    },
    effect(fn) { return fn() }
  }
  createCodeScanRoute(ctx, service)
  assert(typeof route === 'function', 'route registered')
  const missing = await route(new Request('http://x/api/dataops/code-scan'))
  assert(missing.status === 400, 'session required')
  const started = await route(new Request('http://x/api/dataops/code-scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: 's1', scope: { kind: 'workspace' }, source: 'panel' })
  }))
  assert(started.status === 202, 'trigger status')
  const accepted = await started.json()
  assert(accepted.scanId === 'scan-mock-0001', 'route scanId')
  const latest = await route(new Request('http://x/api/dataops/code-scan?sessionId=s1'))
  assert(latest.status === 400, 'latest is not supported')
  const read = await route(new Request('http://x/api/dataops/code-scan?sessionId=s1&scanId=' + accepted.scanId))
  assert(read.status === 200, 'read status')
  const body = await read.json()
  assert(body.phase === 'queued' && body.findings.length === 2, 'route result')
})

const failures = []
for (const [name, fn] of checks) {
  try { await fn(); console.log('ok   ' + name) } catch (error) { failures.push([name, error]) }
}
if (failures.length) {
  for (const [name, error] of failures) console.error('FAIL ' + name + ': ' + error.message)
  process.exit(1)
}
console.log('code scan: PASS (' + checks.length + ' checks)')
