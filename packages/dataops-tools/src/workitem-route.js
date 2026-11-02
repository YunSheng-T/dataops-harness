/**
 * Explicit demo workitem archive route.
 *
 * Artifact revisions are immutable. A user who no longer wants a workitem can
 * archive the whole workitem; the directory moves under .demo-archive and the
 * US source binding disappears without deleting the audit trail.
 */
import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { join, resolve } from 'node:path'

const SAFE_ID = /^[A-Za-z0-9._-]+$/u

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  })
}

export function createWorkitemArchiveRoute(options = {}) {
  const workitemsDir = resolve(options.workitemsDir || 'workitems')
  return async function fetch(request) {
    if (request.method !== 'POST') return json(405, { ok: false, error: 'METHOD' })
    if (!String(request.headers.get('content-type') || '').includes('application/json')) return json(415, { ok: false, error: 'CONTENT_TYPE' })
    let payload
    try { payload = await request.json() } catch { return json(400, { ok: false, error: 'INVALID_JSON' }) }
    const id = payload && payload.id
    if (typeof id !== 'string' || !SAFE_ID.test(id) || id === '.' || id === '..') return json(400, { ok: false, error: 'INVALID_WORKITEM_ID' })
    const source = join(workitemsDir, id)
    if (!existsSync(source)) return json(404, { ok: false, error: 'WORKITEM_NOT_FOUND' })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const archiveRoot = join(workitemsDir, '.demo-archive')
    const target = join(archiveRoot, stamp + '-' + id)
    mkdirSync(archiveRoot, { recursive: true })
    renameSync(source, target)
    return json(200, { ok: true, archived: { id, target } })
  }
}

export function registerWorkitemArchiveRoute(ctx, config) {
  const connection = ctx && typeof ctx.get === 'function' ? ctx.get('connection') : null
  if (!connection || !connection.fetch || typeof connection.fetch.register !== 'function') return null
  const dispose = connection.fetch.register({
    path: '/api/dataops/workitem/archive',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: createWorkitemArchiveRoute({ workitemsDir: resolve(process.cwd(), config.workitemsDir || 'workitems') })
  })
  if (typeof ctx.effect === 'function') ctx.effect(() => dispose)
  return dispose
}
