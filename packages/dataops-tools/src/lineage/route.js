import { createMockLineageProvider } from './mock.js'
import { scanRepository } from '../repo-doctor/index.js'

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}

export function createLineageRoute(ctx, provider = createMockLineageProvider()) {
  const connection = ctx && typeof ctx.get === 'function' ? ctx.get('connection') : null
  if (!connection || !connection.fetch || typeof connection.fetch.register !== 'function') return null
  const agents = ctx && typeof ctx.get === 'function' ? ctx.get('agents') : null
  const workingDirectory = ctx && typeof ctx.get === 'function' ? ctx.get('workingDirectory') : null
  const handler = async request => {
    if (request.method !== 'GET') return json(405, { ok: false, error: 'METHOD' })
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) return json(400, { ok: false, error: 'SESSION_REQUIRED' })
    const mode = url.searchParams.get('mode') || 'index'
    let repo = null
    if (agents && workingDirectory && typeof agents.get === 'function') {
      const agent = agents.get(sessionId)
      if (agent) {
        try {
          const root = await workingDirectory.ensure(agent, request.signal)
          repo = scanRepository(root)
        } catch (error) { /* optional repo context; provider fallback remains explicit */ }
      }
    }
    const context = { tasks: repo && repo.ok ? repo.tasks : null }
    if (mode === 'index') return json(200, provider.index(context))
    if (mode === 'graph') {
      const kind = url.searchParams.get('kind')
      const focus = url.searchParams.get('focus') || null
      const result = provider.graph(kind, focus, context)
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
