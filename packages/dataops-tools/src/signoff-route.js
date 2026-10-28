/**
 * Host exact route for signoff. A future browser client calls this route after
 * the user confirms a stage card; no Agent turn is required.
 */
import { createLocalSignoffIdentity, createSignoffService } from './signoff-service.js'

const MAX_BODY = 64 * 1024

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  })
}

export function createSignoffRoute(options) {
  const service = createSignoffService(options)
  return async function fetch(request) {
    if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD' })
    const type = request.headers.get('content-type') || ''
    if (!type.includes('application/json')) return json(415, { ok: false, error: 'CONTENT_TYPE' })
    let payload
    try {
      const text = await request.text()
      if (text.length > MAX_BODY) return json(413, { ok: false, error: 'BODY_TOO_LARGE' })
      payload = JSON.parse(text)
    } catch {
      return json(400, { ok: false, error: 'INVALID_JSON' })
    }
    try {
      const result = await service.sign({
        workitemId: payload.workitemId,
        gate: payload.gate,
        role: payload.role,
        comment: payload.comment,
        actionId: payload.actionId
      })
      return json(200, { ok: true, workitem: result })
    } catch (error) {
      return json(400, { ok: false, error: 'SIGNOFF_REJECTED', message: error && error.message ? error.message : 'signoff failed' })
    }
  }
}

export function createIdentityRoute(options = {}) {
  const identity = options.identity || createLocalSignoffIdentity('陈璐', ['BA', 'requester', 'SE', 'Committer'])
  return async function fetch(request) {
    if (request.method !== 'GET') return json(405, { ok: false, error: 'METHOD' })
    try {
      const user = await identity()
      return json(200, { ok: true, user: { id: user.id, name: user.name, roles: Array.isArray(user.roles) ? user.roles : [], mock: true } })
    } catch {
      return json(401, { ok: false, error: 'IDENTITY_UNAVAILABLE' })
    }
  }
}

export function registerSignoffRoute(ctx, config, store, identity) {
  const connection = ctx && typeof ctx.get === 'function' ? ctx.get('connection') : null
  if (!connection || !connection.fetch || typeof connection.fetch.register !== 'function') return null
  const route = createSignoffRoute({ store, identity })
  const identityRoute = createIdentityRoute({ identity })
  const dispose = connection.fetch.register({
    path: '/api/dataops/signoff',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: route
  })
  const disposeIdentity = connection.fetch.register({
    path: '/api/dataops/identity',
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: identityRoute
  })
  if (typeof ctx.effect === 'function') ctx.effect(() => async () => { await dispose(); await disposeIdentity() })
  return dispose
}
