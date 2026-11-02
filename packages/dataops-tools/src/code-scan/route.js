/**
 * DataOps route for the mock code-scan adapter.
 *
 * The route is intentionally a transport adapter: it resolves the Session,
 * forwards the request to the scan service and returns the scanId. It never
 * parses source code or stores scan results.
 */
import { createMockCodeScanService } from './mock.js'

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  })
}

export function createCodeScanRoute(ctx, service = createMockCodeScanService()) {
  const connection = ctx && typeof ctx.get === 'function' ? ctx.get('connection') : null
  const agents = ctx && typeof ctx.get === 'function' ? ctx.get('agents') : null
  if (!connection || !connection.fetch || typeof connection.fetch.register !== 'function' || !agents) return null

  const handler = async request => {
    if (request.method === 'GET') {
      const url = new URL(request.url)
      const sessionId = url.searchParams.get('sessionId')
      const scanId = url.searchParams.get('scanId')
      if (!sessionId || !scanId) return json(400, { ok: false, error: 'SESSION_AND_SCAN_REQUIRED' })
      const agent = typeof agents.get === 'function' ? agents.get(sessionId) : null
      if (!agent) return json(404, { ok: false, error: 'SESSION_NOT_FOUND' })
      const result = service.get(scanId)
      if (!result || result.sessionId !== sessionId) return json(404, { ok: false, error: 'SCAN_NOT_FOUND' })
      return json(200, result)
    }
    if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD' })
    let body = {}
    try { body = await request.json() } catch { return json(400, { ok: false, error: 'BODY_INVALID' }) }
    const sessionId = body.sessionId
    if (!sessionId) return json(400, { ok: false, error: 'SESSION_REQUIRED' })
    const agent = typeof agents.get === 'function' ? agents.get(sessionId) : null
    if (!agent) return json(404, { ok: false, error: 'SESSION_NOT_FOUND' })
    const scope = body.scope && body.scope.kind ? body.scope : { kind: 'workspace' }
    if (!['workspace', 'files'].includes(scope.kind)) return json(400, { ok: false, error: 'SCOPE_UNSUPPORTED' })
    if (scope.kind === 'files' && (!Array.isArray(scope.files) || !scope.files.length)) return json(400, { ok: false, error: 'FILES_REQUIRED' })
    const started = service.start({ sessionId, scope, profile: body.profile, source: body.source || 'panel' })
    return json(202, started)
  }
  return connection.fetch.register({ path: '/api/dataops/code-scan', methods: ['GET', 'POST'], requestBody: 'buffered', fetch: handler })
}

export function registerCodeScanRoute(ctx, service) {
  const dispose = createCodeScanRoute(ctx, service)
  if (dispose && typeof ctx.effect === 'function') ctx.effect(() => dispose, 'dataops code scan route')
  return dispose
}
