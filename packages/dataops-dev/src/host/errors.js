/**
 * Stable `dev/*` RemoteError constructors. Codes are the wire contract; messages
 * are for operators. Never leak draft text or secrets into either.
 */
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'

/** @param {string} code @param {string} message @param {Record<string, unknown>} [details] */
export function devError(code, message, details = {}) {
  return new RemoteError(code, message, details)
}

export const notFound = path => devError('dev/not-found', `no such file: ${path}`, { path })
export const notRegularFile = (path, type) => devError('dev/not-regular-file', `not a regular file: ${path} (${type})`, { path, type })
export const tooLarge = (path, bytes, maxBytes) => devError('dev/too-large', `file exceeds the ${maxBytes}-byte limit: ${path} (${bytes} bytes)`, { path, bytes, maxBytes })
export const unsupportedEncoding = path => devError('dev/unsupported-encoding', `file is not valid UTF-8: ${path}`, { path })
export const concurrentRead = path => devError('dev/concurrent-read', `file changed while being read: ${path}`, { path })
export const staleVersion = path => devError('dev/stale-version', `file changed since the base version: ${path}`, { path })
export const idempotencyConflict = key => devError('dev/idempotency-conflict', `idempotency key reused with different content: ${key}`, { idempotencyKey: key })
export const documentUnknown = documentId => devError('dev/not-found', `unknown or closed document: ${documentId}`, { documentId })
export const sessionUnknown = sessionId => devError('dev/not-found', `unknown session: ${sessionId}`, { sessionId })
export const bridgeUnavailable = () => devError('dev/action-forbidden', 'dataops-dev write-intent bridge is not mounted; UI saves are disabled')
