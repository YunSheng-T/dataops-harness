/**
 * P0 集成测试装配：真实 cordis Context + 真实 fs-local 后端 +
 * 真实 fs-observation-policy + 真实 dataops-dev 插件。
 * 内存 fake 只出现在「会话目录根」这一部署配置（config.workspaceRoot），
 * 文件系统与策略链零替身。
 */
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import * as FsPolicy from '@deepseek-ai/dsh-fs-observation-policy'
import * as DataopsDev from '../src/host/index.js'
import { applyBridge } from '../src/host/bridge.js'
import { DevDocuments } from '../src/host/service.js'

export const SESSION = 'test-session'

/**
 * @param {{ withBridge?: boolean, maxBytes?: number }} [options]
 */
export async function boot(options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dataops-dev-p0-'))
  const ctx = new Context()
  await ctx.plugin(LocalFileSystem, { cwd: dir })
  await ctx.plugin(FsPolicy)
  const config = { workspaceRoot: dir }
  if (options.maxBytes !== undefined) config.maxBytes = options.maxBytes
  if (options.withBridge === false) {
    // AGT-05：装配缺失 bridge —— 服务在、瀑布最外层不在。
    const service = new DevDocuments(ctx, config)
    return { ctx, dir, service }
  }
  await ctx.plugin(DataopsDev, config)
  return { ctx, dir, service: ctx.get('devDocuments') }
}

/** 带故障注入的真实 fs 包装：只注入并发，不改变任何读写语义。 */
export function withSabotage(fs, saboteur) {
  return new Proxy(fs, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value
      if (prop === 'stat') {
        return async (...args) => {
          const result = await value.apply(receiver, args)
          await saboteur(result)
          return result
        }
      }
      return value.bind(receiver)
    },
  })
}

export function writeFile(dir, name, content) {
  writeFileSync(join(dir, name), content)
}

export { join, mkdirSync }
