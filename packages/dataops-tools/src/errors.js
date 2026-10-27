/**
 * Domain errors carry a stable code for tests and an actionable Chinese hint
 * for the model. They never include credential values or full upstream bodies.
 */
export class DataOpsError extends Error {
  constructor(code, message, hint) {
    super(message)
    this.name = 'DataOpsError'
    this.code = code
    this.hint = hint
  }
}

export function configError(message, hint) {
  return new DataOpsError('CONFIG', message, hint)
}

export function authError(message) {
  return new DataOpsError('AUTH', message, '检查 token 是否配置、是否过期，或联系平台管理员授权。')
}

export function notFoundError(message) {
  return new DataOpsError('NOT_FOUND', message, '确认对象名称/单号是否正确，或在平台里确认可见性。')
}

export function timeoutError(message) {
  return new DataOpsError('TIMEOUT', message, '稍后重试；如果持续超时，检查网络或平台负载。')
}

export function formatError(message) {
  return new DataOpsError('FORMAT', message, '确认平台返回的是 JSON；如字段有变化，更新 mapping。')
}

export function upstreamError(message) {
  return new DataOpsError('UPSTREAM', message, '平台暂时不可用，稍后重试或联系平台值班。')
}

export function abortedError(message) {
  return new DataOpsError('ABORTED', message || '请求已取消。')
}
