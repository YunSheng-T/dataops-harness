import { createMockLineageProvider } from './mock.js'

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}

export function createLineageRoute(ctx, provider = createMockLineageProvider()) {
  const connection = ctx && typeof ctx.get === 'function' ? ctx.get('connection') : null
  const agents = ctx && typeof ctx.get === 'function' ? ctx.get('agents') : null
  if (!connection || !connection.fetch || typeof connection.fetch.register !== 'function' || !agents) return null
  const handler = async request => {
    if (request.method !== 'GET') return json(405, { ok: false, error: 'METHOD' })
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) return json(400, { ok: false, error: 'SESSION_REQUIRED' })
    if (typeof agents.get === 'function' && !agents.get(sessionId)) return json(404, { ok: false, error: 'SESSION_NOT_FOUND' })
    const mode = url.searchParams.get('mode') || 'index'
    if (mode === 'index') return json(200, provider.index())
    if (mode === 'graph') {
      const kind = url.searchParams.get('kind')
      const focus = url.searchParams.get('focus') || null
      const result = provider.graph(kind, focus)
      return json(result.ok ? 200 : 400, result)
    }
    return json(400, { ok: false, error: 'UNKNOWN_MODE' })
  }
  return connection.fetch.register({ path: '/api/dataops/lineage', methods: ['GET'], requestBody: 'buffered', fetch: handler })
}

export function registerLineageRoute(ctx, provider) {
  const dispose = createLineageRoute(ctx, provider)
  if (dispose && typeof ctx.effect === 'function') ctx.effect(() => dispose, 'dataops lineage route')
  return dispose
}
