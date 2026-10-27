/**
 * HTTP transport for one platform domain.
 *
 * URL and credentials come from configuration only. Plain fetch is used because
 * the dsh launcher installs undici's global proxy dispatcher, so proxy settings
 * already apply.
 */
import {
  abortedError, authError, configError, formatError, notFoundError, timeoutError, upstreamError
} from '../errors.js'

const MAX_BODY_BYTES = 1024 * 1024

function resolveBaseUrl(domain) {
  const value = domain.baseUrl || (domain.baseUrlEnv ? process.env[domain.baseUrlEnv] : undefined)
  if (!value) {
    throw configError(
      'dataops-tools: catalog/devops base URL is not configured',
      domain.baseUrlEnv ? `设置环境变量 ${domain.baseUrlEnv}，或在插件 config 里写 baseUrl。` : '在插件 config 里写 baseUrl 或 baseUrlEnv。'
    )
  }
  let url
  try {
    url = new URL(value)
  } catch {
    throw configError('dataops-tools: base URL is not a valid URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw configError('dataops-tools: base URL must be http(s)')
  }
  if (url.username || url.password) {
    throw configError('dataops-tools: base URL must not embed credentials')
  }
  return url
}

function renderPath(template, vars) {
  if (typeof template !== 'string' || template === '') {
    throw configError('dataops-tools: HTTP path template is missing', '在插件 config 的 paths 里补上该操作。')
  }
  return template.replace(/\{([a-zA-Z0-9_]+)\}/gu, (_match, key) => {
    if (vars[key] === undefined || vars[key] === null) {
      throw configError('dataops-tools: missing path parameter ' + key)
    }
    return encodeURIComponent(String(vars[key]))
  })
}

function combinedSignal(timeoutMs, signal) {
  const timeout = AbortSignal.timeout(timeoutMs)
  if (!signal) return { signal: timeout, timeout, caller: undefined }
  if (typeof AbortSignal.any === 'function') return { signal: AbortSignal.any([signal, timeout]), timeout, caller: signal }
  return { signal, timeout, caller: signal }
}

export function createHttpClient(domain, options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const timeoutMs = options.timeoutMs
  const retry = options.retry
  const resolveSecret = options.resolveSecret

  async function attempt(url, token, signal) {
    const headers = { accept: 'application/json' }
    if (token) headers.authorization = 'Bearer ' + token
    const response = await fetchImpl(url, { method: 'GET', headers, signal })

    if (response.status === 401 || response.status === 403) throw authError('平台拒绝访问（HTTP ' + response.status + '）')
    if (response.status === 404) throw notFoundError('平台没有找到对象（HTTP 404）')
    if (response.status >= 500) throw upstreamError('平台返回 HTTP ' + response.status)

    const text = await response.text()
    if (text.length > MAX_BODY_BYTES) throw formatError('平台响应超过 1 MB，已拒绝解析')
    try {
      return JSON.parse(text)
    } catch {
      throw formatError('平台返回的不是 JSON')
    }
  }

  return {
    domain,
    async call(op, vars, context) {
      const base = resolveBaseUrl(domain)
      const path = renderPath(domain.paths[op], vars || {})
      const url = new URL(path, base)
      const token = domain.tokenRef ? await resolveSecret(domain.tokenRef) : undefined
      if (domain.tokenRef && !token) {
        throw configError('缺少凭据 ' + domain.tokenRef, '在 ~/.dsh/.env 或 credential store 里配置 ' + domain.tokenRef + '。')
      }

      let lastError
      for (let attemptIndex = 0; attemptIndex <= retry; attemptIndex++) {
        const combined = combinedSignal(timeoutMs, context && context.signal)
        try {
          return await attempt(url, token, combined.signal)
        } catch (error) {
          lastError = error
          if (combined.caller && combined.caller.aborted) throw abortedError()
          if (combined.timeout.aborted) throw timeoutError('平台请求超时')
          const retryable = error.code === 'UPSTREAM' || error.name === 'TypeError'
          if (!retryable || attemptIndex === retry) break
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      if (lastError && lastError.code) throw lastError
      throw upstreamError('平台请求失败：' + (lastError && lastError.message ? lastError.message : 'unknown'))
    }
  }
}
