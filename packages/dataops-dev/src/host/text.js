import { unsupportedEncoding } from './errors.js'

const decoder = new TextDecoder('utf-8', { fatal: true })

/**
 * Strictly decode UTF-8 bytes; invalid sequences and lone surrogates fail with
 * `dev/unsupported-encoding`. Never substitutes U+FFFD, never normalizes EOL/BOM.
 * @param {Uint8Array} bytes @param {string} path
 */
export function decodeUtf8Strict(bytes, path) {
  try {
    return decoder.decode(bytes)
  } catch {
    throw unsupportedEncoding(path)
  }
}

const CONTENT_TYPES = {
  '.sql': 'text/x-sql',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.py': 'text/x-python',
  '.ts': 'text/typescript',
  '.js': 'text/javascript',
}

/** @param {string} displayPath */
export function contentTypeOf(displayPath) {
  const dot = displayPath.lastIndexOf('.')
  if (dot < 0) return 'text/plain'
  return CONTENT_TYPES[displayPath.slice(dot).toLowerCase()] ?? 'text/plain'
}
