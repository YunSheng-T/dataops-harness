/**
 * Host-side signoff seam.
 *
 * This is the boundary a future DSH Host/Client RPC (or an intranet identity
 * service) should call. It does not depend on an Agent turn, prompt text, or a
 * browser DOM. The current identity is injectable/mock; replace it with SSO in
 * the intranet phase.
 */
import { configError } from './errors.js'

const ROLE_ALIASES = {
  ba: 'BA',
  requester: 'requester',
  se: 'SE',
  dev: 'Dev',
  committer: 'Committer'
}

export function createSignoffService(options = {}) {
  const store = options.store
  const identity = options.identity || (() => ({ id: 'local-user', name: '本地用户', roles: ['BA', 'requester', 'SE', 'Committer'] }))
  const nextId = options.actionId || (() => 'ui-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8))

  if (!store || typeof store.signoff !== 'function') throw configError('signoff service requires a WorkitemStore')

  return {
    async sign(input = {}) {
      if (!input.workitemId) throw configError('signoff service: workitemId is required')
      if (!input.gate) throw configError('signoff service: gate is required')
      const user = await identity(input)
      if (!user || !user.name) throw configError('signoff service: identity is required')
      const requested = ROLE_ALIASES[String(input.role || '').toLowerCase()] || input.role
      if (!requested) throw configError('signoff service: role is required')
      if (Array.isArray(user.roles) && user.roles.length && !user.roles.includes(requested)) {
        throw configError('signoff service: user ' + user.name + ' does not hold role ' + requested)
      }
      const result = await store.signoff({
        id: input.workitemId,
        gate: input.gate,
        role: requested,
        actor: user.name,
        comment: input.comment,
        via: 'ui',
        actionId: input.actionId || nextId(),
        userId: user.id,
        sessionId: input.sessionId
      })
      return { ...result, actor: user.name, role: requested }
    }
  }
}

export function createLocalSignoffIdentity(name = '陈璐', roles = ['BA', 'requester', 'SE', 'Committer']) {
  return async () => ({ id: 'local:' + name, name, roles })
}

/**
 * Adapt a domain `identity` adapter to the signoff identity function.
 * The adapter output is expected to contain id/name/roles; no browser-provided
 * actor is trusted.
 */
export function createAdapterIdentity(adapter) {
  if (!adapter || typeof adapter.read !== 'function') throw configError('identity adapter is required')
  return async () => {
    const me = await adapter.read('me', {})
    if (!me || typeof me !== 'object') throw configError('identity adapter returned no user')
    return {
      id: String(me.id || me.userId || ''),
      name: String(me.name || me.displayName || me.userName || ''),
      roles: Array.isArray(me.roles) ? me.roles.map(String) : []
    }
  }
}
