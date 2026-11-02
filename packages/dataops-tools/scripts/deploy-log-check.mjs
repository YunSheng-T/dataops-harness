#!/usr/bin/env node
import { createMockDeployLogService } from '../src/deploy-log/mock.js'
import { createDeployLogRoute } from '../src/deploy-log/route.js'

const results = []
const checks = []
const check = (name, fn) => checks.push([name, fn])
const assert = (condition, message) => { if (!condition) throw new Error(message) }

check('deploy log is queried by deploymentId only', () => {
  const service = createMockDeployLogService()
  const success = service.get('deploy-20261102-001')
  assert(success.ok && success.packageName === 'channel_daily_pkg', 'success deployment')
  assert(success.events.some(event => event.phase === 'activate'), 'activate event')
  const failed = service.get('deploy-20261102-002')
  assert(failed.ok && failed.status === 'failed' && failed.events.some(event => event.code === 'DEPLOY_CONFLICT'), 'failed deployment')
  assert(service.get('missing').error === 'DEPLOYMENT_NOT_FOUND', 'missing deployment')
})

check('deploy log route requires session and deploymentId', async () => {
  let route
  const service = createMockDeployLogService()
  const connection = { fetch: { register(definition) { route = definition.fetch; return () => {} } } }
  const ctx = {
    get(name) {
      if (name === 'connection') return connection
      if (name === 'agents') return { get(id) { return id === 's1' ? { id } : undefined } }
      return undefined
    },
    effect(fn) { return fn() }
  }
  createDeployLogRoute(ctx, service)
  assert(typeof route === 'function', 'route registered')
  const missing = await route(new Request('http://x/api/dataops/deploy-log'))
  assert(missing.status === 400, 'session and id required')
  const unknown = await route(new Request('http://x/api/dataops/deploy-log?sessionId=s1&deploymentId=nope'))
  assert(unknown.status === 404, 'unknown deployment')
  const response = await route(new Request('http://x/api/dataops/deploy-log?sessionId=s1&deploymentId=deploy-20261102-001'))
  assert(response.status === 200, 'deploy status')
  const body = await response.json()
  assert(body.kind === 'deploy_log' && body.version === '1.4.0', 'deploy body')
  assert(!new URL('http://x/api/dataops/deploy-log?sessionId=s1&deploymentId=deploy-20261102-001').searchParams.has('package'), 'deploy log must not be queried by package')
})

const failures = []
for (const [name, fn] of checks) {
  try { await fn(); console.log('ok   ' + name) } catch (error) { failures.push([name, error]) }
}
if (failures.length) {
  for (const [name, error] of failures) console.error('FAIL ' + name + ': ' + error.message)
  process.exit(1)
}
console.log('deploy log: PASS (' + checks.length + ' checks)')
