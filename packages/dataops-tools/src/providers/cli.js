/**
 * CLI transport for one platform domain.
 *
 * Commands come from configuration as argument arrays and never pass through a
 * shell. Placeholders accept scalars only; the resolved credential is exposed to
 * the child through the configured env name, never through argv.
 */
import { execFile } from 'node:child_process'
import { abortedError, configError, formatError, notFoundError, timeoutError, upstreamError } from '../errors.js'

const MAX_OUTPUT_BYTES = 1024 * 1024

function renderArgs(template, vars) {
  if (!Array.isArray(template) || template.length === 0) {
    throw configError('dataops-tools: CLI command template is missing', '在插件 config 的 commands 里补上该操作。')
  }
  return template.map(part => String(part).replace(/\{([a-zA-Z0-9_]+)\}/gu, (_match, key) => {
    if (vars[key] === undefined || vars[key] === null) {
      throw configError('dataops-tools: missing CLI parameter ' + key)
    }
    return String(vars[key])
  }))
}

function run(execFileImpl, command, args, options) {
  return new Promise((resolve, reject) => {
    execFileImpl(command, args, options, (error, stdout, stderr) => {
      if (error) reject(Object.assign(error, { stdout, stderr }))
      else resolve({ stdout, stderr })
    })
  })
}

export function createCliClient(domain, options) {
  const execFileImpl = options.execFileImpl || execFile
  const timeoutMs = options.timeoutMs
  const resolveSecret = options.resolveSecret

  return {
    domain,
    async call(op, vars, context) {
      const template = domain.commands[op]
      const args = renderArgs(template, vars || {})
      const command = args.shift()
      const token = domain.tokenRef ? await resolveSecret(domain.tokenRef) : undefined
      if (domain.tokenRef && !token) {
        throw configError('缺少凭据 ' + domain.tokenRef, '在 ~/.dsh/.env 或 credential store 里配置 ' + domain.tokenRef + '。')
      }

      const env = { ...process.env, ...(domain.env || {}) }
      if (domain.tokenRef && token) env[domain.tokenRef] = token

      let result
      try {
        result = await run(execFileImpl, command, args, {
          timeout: timeoutMs,
          maxBuffer: MAX_OUTPUT_BYTES,
          signal: context && context.signal,
          cwd: domain.cwd,
          env,
          windowsHide: true
        })
      } catch (error) {
        if (context && context.signal && context.signal.aborted) throw abortedError()
        if (error.code === 'ETIMEDOUT' || error.killed) throw timeoutError('平台 CLI 执行超时')
        if (error.code === 'ENOENT') {
          throw configError('找不到平台 CLI：' + command, '确认 CLI 已安装并在 PATH 中，或在 config 里写绝对路径。')
        }
        if (error.code === 4 || error.code === 3) throw notFoundError('平台 CLI 未找到对象（exit ' + error.code + '）')
        throw upstreamError('平台 CLI 执行失败（exit ' + (error.code === undefined ? '?' : error.code) + '）')
      }

      const text = String(result.stdout || '').trim()
      if (text.length > MAX_OUTPUT_BYTES) throw formatError('CLI 输出超过 1 MB，已拒绝解析')
      try {
        return JSON.parse(text)
      } catch {
        throw formatError('CLI 输出不是 JSON（检查 --json 参数）')
      }
    }
  }
}
