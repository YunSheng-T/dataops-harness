/**
 * Read-only DataOps panel data route.
 *
 * The request carries a Session id, never an arbitrary filesystem root. The
 * Host resolves that Session through workingDirectory, so the panel can only
 * inspect the workspace the user is already in.
 */
import { resolve } from 'node:path'
import { checkRepository, scanRepository, validateRepository } from './index.js'

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  })
}

export function createRepoDoctorRoute(ctx) {
  const connection = ctx && typeof ctx.get === 'function' ? ctx.get('connection') : null
  if (!connection || !connection.fetch || typeof connection.fetch.register !== 'function') return null
  const agents = ctx && typeof ctx.get === 'function' ? ctx.get('agents') : null
  const workingDirectory = ctx && typeof ctx.get === 'function' ? ctx.get('workingDirectory') : null
  if (!agents || !workingDirectory) return null
  const handler = async request => {
    if (request.method !== 'GET') return json(405, { ok: false, error: 'METHOD' })
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const mode = url.searchParams.get('mode') || 'check'
    if (!sessionId) return json(400, { ok: false, error: 'SESSION_REQUIRED' })
    if (!['scan', 'validate', 'check'].includes(mode)) return json(400, { ok: false, error: 'MODE_INVALID' })
    const agent = typeof agents.get === 'function' ? agents.get(sessionId) : null
    if (!agent) return json(404, { ok: false, error: 'SESSION_NOT_FOUND' })
    try {
      const root = await workingDirectory.ensure(agent, request.signal)
      const result = mode === 'scan'
        ? scanRepository(resolve(root))
        : mode === 'validate'
          ? validateRepository(scanRepository(resolve(root)))
          : checkRepository(resolve(root))
      return json(200, { ok: result.ok !== false, mode, ...result })
    } catch (error) {
      return json(422, { ok: false, error: 'REPO_DOCTOR_FAILED', message: error && error.message ? error.message : String(error) })
    }
  }
  return connection.fetch.register({ path: '/api/dataops/repo-doctor', methods: ['GET'], requestBody: 'buffered', fetch: handler })
}

export function registerRepoDoctorRoute(ctx) {
  const dispose = createRepoDoctorRoute(ctx)
  if (dispose && typeof ctx.effect === 'function') ctx.effect(() => dispose, 'dataops repo doctor route')
  return dispose
}
