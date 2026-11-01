import { createHash } from 'node:crypto'

/**
 * Content digest over the exact bytes read from / written to disk.
 * Format: `sha256:<hex>`. Computed host-side only; client digests are never trusted.
 * @param {Uint8Array} bytes
 */
export function digestBytes(bytes) {
  return 'sha256:' + createHash('sha256').update(bytes).digest('hex')
}

/** @param {string} text UTF-8 encode then digest — the save path's canonical form. */
export function digestText(text) {
  return digestBytes(new TextEncoder().encode(text))
}
