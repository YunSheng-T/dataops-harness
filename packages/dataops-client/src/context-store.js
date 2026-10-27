/**
 * Per-session workbench context: the latest payload of each dataops kind.
 * Writers: the turn definition (via TurnTail) after a tool result settles.
 * Readers: right-sidebar tabs and cards. No I/O and no fetches live here.
 */
export function createContextStore() {
  var STORAGE_KEY = 'dataops.context.v1'
  var values = {}
  var listeners = []

  function canStore() {
    try { return typeof localStorage !== 'undefined' && localStorage !== null } catch (error) { return false }
  }
  function load() {
    if (!canStore()) return
    try {
      var raw = localStorage.getItem(STORAGE_KEY)
      var parsed = raw ? JSON.parse(raw) : null
      if (parsed && typeof parsed === 'object') values = parsed
    } catch (error) { values = {} }
  }
  function save() {
    if (!canStore()) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)) } catch (error) { /* quota / private mode */ }
  }
  load()

  function get(sessionId) {
    return values[String(sessionId)] || null
  }

  function ingest(sessionId, payload) {
    if (!payload || typeof payload !== 'object' || typeof payload.kind !== 'string') return
    var key = String(sessionId)
    var current = values[key] || {}
    if (current[payload.kind] === payload) return
    var next = Object.assign({}, current)
    next[payload.kind] = payload
    values[key] = next
    save()
    listeners.slice().forEach(function (listener) { listener() })
  }

  function subscribe(listener) {
    listeners.push(listener)
    return function () {
      var index = listeners.indexOf(listener)
      if (index >= 0) listeners.splice(index, 1)
    }
  }

  return { get: get, ingest: ingest, subscribe: subscribe }
}
