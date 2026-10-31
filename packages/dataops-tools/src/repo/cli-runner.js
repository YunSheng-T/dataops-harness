/** Shared no-shell CLI runner for dataops build/deploy. */
import { execFile } from 'node:child_process'

export function runCli(execFileImpl, command, args, options = {}) {
  const impl = execFileImpl || execFile
  const started = Date.now()
  return new Promise(resolve => {
    impl(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env || {}) },
      timeout: options.timeoutMs,
      maxBuffer: options.maxBuffer || 1024 * 1024,
      windowsHide: true,
      signal: options.signal
    }, (error, stdout, stderr) => {
      resolve({
        error,
        stdout: String(stdout || ''),
        stderr: String(stderr || ''),
        durationMs: Date.now() - started,
        exitCode: error && typeof error.code === 'number' ? error.code : (error ? 1 : 0)
      })
    })
  })
}

export function logExcerpt(stdout, stderr, limit = 4000) {
  return [stdout, stderr].filter(Boolean).join('\n').slice(-limit)
}
