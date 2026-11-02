/**
 * DeployLog mock route.
 *
 * DeployLog is queried by deploymentId only. It never accepts a package name
 * as a substitute for the company-wide deployment id.
 */
import { createMockDeployLogService } from './mock.js'

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  })
}

export function createDeployLogRoute(ctx, service = createMockDeployLogService()) {
  const connection = ctx && typeof ctx.get === 'function' ? ctx.get('connection') : null
  const agents = ctx && typeof ctx.get === 'function' ? ctx.get('agents') : null
  if (!connection || !connection.fetch || typeof connection.fetch.register !== 'function' || !agents) return null
  const handler = async request => {
    if (request.method !== 'GET') return json(405, { ok: false, error: 'METHOD' })
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const deploymentId = url.searchParams.get('deploymentId')
    if (!sessionId || !deploymentId) return json(400, { ok: false, error: 'SESSION_AND_DEPLOYMENT_REQUIRED' })
    const agent = typeof agents.get === 'function' ? agents.get(sessionId) : null
    if (!agent) return json(404, { ok: false, error: 'SESSION_NOT_FOUND' })
    const result = service.get(deploymentId)
    return json(result.ok ? 200 : 404, result)
  }
  return connection.fetch.register({ path: '/api/dataops/deploy-log', methods: ['GET'], requestBody: 'buffered', fetch: handler })
}

export function registerDeployLogRoute(ctx, service) {
  const dispose = createDeployLogRoute(ctx, service)
  if (dispose && typeof ctx.effect === 'function') ctx.effect(() => dispose, 'dataops deploy log route')
  return dispose
}
