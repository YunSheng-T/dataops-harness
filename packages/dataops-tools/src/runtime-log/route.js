/**
 * RuntimeLog mock route.
 *
 * list/detail is addressed by platform coordinates and a platform runId.
 * The real implementation delegates these calls to dataops CLI; this route
 * never accepts a package name.
 */
import { createMockRuntimeLogService } from './mock.js'

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  })
}

function locatorFrom(url) {
  const get = name => url.searchParams.get(name) || undefined
  return { platform: get('platform'), project: get('project'), group: get('group'), task: get('task'), job: get('job'), sourcePath: get('sourcePath') }
}

export function createRuntimeLogRoute(ctx, service = createMockRuntimeLogService()) {
  const connection = ctx && typeof ctx.get === 'function' ? ctx.get('connection') : null
  const agents = ctx && typeof ctx.get === 'function' ? ctx.get('agents') : null
  if (!connection || !connection.fetch || typeof connection.fetch.register !== 'function' || !agents) return null
  const handler = async request => {
    if (request.method !== 'GET') return json(405, { ok: false, error: 'METHOD' })
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) return json(400, { ok: false, error: 'SESSION_REQUIRED' })
    const agent = typeof agents.get === 'function' ? agents.get(sessionId) : null
    if (!agent) return json(404, { ok: false, error: 'SESSION_NOT_FOUND' })
    const mode = url.searchParams.get('mode') || 'list'
    if (mode === 'targets') return json(200, { ok: true, kind: 'runtime_targets', source: 'mock', targets: service.targets() })
    if (mode === 'detail') {
      const result = service.detail({ ...locatorFrom(url), runId: url.searchParams.get('runId') })
      return json(result.ok ? 200 : 404, result)
    }
    if (mode !== 'list') return json(400, { ok: false, error: 'MODE_INVALID' })
    const result = service.list(locatorFrom(url))
    return json(result.ok ? 200 : 400, result)
  }
  return connection.fetch.register({ path: '/api/dataops/runtime-log', methods: ['GET'], requestBody: 'buffered', fetch: handler })
}

export function registerRuntimeLogRoute(ctx, service) {
  const dispose = createRuntimeLogRoute(ctx, service)
  if (dispose && typeof ctx.effect === 'function') ctx.effect(() => dispose, 'dataops runtime log route')
  return dispose
}
