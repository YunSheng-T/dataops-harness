/**
 * DevDocuments：dataops-dev 的 Host Remote 服务（`devDocuments` 命名空间）。
 *
 * - 继承 TypertRemoteService，经 `typertRemote` 绑定被 Gateway 源码模式发现；
 *   Remote 方法标记用命令式描述符写入（与 @Remote 装饰器同一存储格式，
 *   见 dsh-typert-protocol 的 REMOTE_METHOD_DESCRIPTOR）。
 * - open/save 的参数必须是简单命名形参（SRC 模式按源码解析参数名），
 *   末位 `signal` 是保留的 AbortSignal 参数名。
 * - Session 绑定：workspaceRoot 依次取 sessions header.cwd → sandboxPolicy.workspaceRoot
 *   → 插件 config.workspaceRoot（显式部署/测试配置）；sessions 在线而 sessionId
 *   未知时拒绝。Client 提供的 sessionId 只用于定位，权限由 Host 侧文件系统与
 *   沙箱策略决定。
 */
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { DevDocumentStore } from './documents.js'
import { bridgeUnavailable, sessionUnknown } from './errors.js'
import { createUiActor } from './bridge.js'

const REMOTE_METHOD_DESCRIPTOR = '@deepseek-ai/dsh-typert-protocol/remote-methods'

/** 与 @Remote 装饰器相同的存储格式：在原型上登记 direct 方法标记。 */
function markRemoteMethods(prototype, methods) {
  Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
    configurable: true,
    value: Object.freeze({
      version: 1,
      methods: Object.freeze(methods.map(method => Object.freeze({ method, invocation: Object.freeze({ kind: 'direct' }) }))),
    }),
  })
}

export class DevDocuments extends TypertRemoteService {
  static inject = ['fs']

  constructor(ctx, config = {}) {
    super(ctx, 'devDocuments')
    this.store = new DevDocumentStore({ maxBytes: config.maxBytes ?? 2 * 1024 * 1024 })
    this.bridge = config.bridge ?? { mounted: () => false }
    this.config = config
  }

  /** 解析本次调用允许的工作区根。 */
  workspaceRootOf(sessionId) {
    const sessions = this.ctx.get('sessions')
    if (sessions !== undefined) {
      const header = sessions.get(sessionId)?.header
      if (header === undefined) throw sessionUnknown(sessionId)
      if (header.cwd) return header.cwd
    }
    const sandboxRoot = this.ctx.get('sandboxPolicy')?.workspaceRoot
    if (sandboxRoot !== undefined) return sandboxRoot
    if (this.config.workspaceRoot !== undefined) return this.config.workspaceRoot
    throw sessionUnknown(sessionId)
  }

  async open(sessionId, path, signal) {
    if (typeof sessionId !== 'string' || sessionId.length === 0) throw sessionUnknown(String(sessionId))
    if (typeof path !== 'string' || path.length === 0) throw sessionUnknown('(empty path)')
    const workspaceRoot = this.workspaceRootOf(sessionId)
    return this.store.open(this.ctx.fs, sessionId, workspaceRoot, path, signal)
  }

  async save(sessionId, documentId, baseVersion, text, idempotencyKey, signal) {
    if (!this.bridge.mounted()) throw bridgeUnavailable()
    const dispatchWrite = (record, content, token, writeSignal) => {
      const uiActor = createUiActor(token)
      return this.ctx
        .waterfall('fs/write-intent', record.target, uiActor, () => { throw bridgeUnavailable() })
        .then(intent => this.ctx.fs.writeText(record.target, content, intent, signal))
    }
    return this.store.save(this.ctx.fs, sessionId, documentId, baseVersion, text, idempotencyKey, dispatchWrite, signal)
  }

  async close(sessionId, documentId, signal) {
    this.store.close(sessionId, documentId)
  }
}

markRemoteMethods(DevDocuments.prototype, ['open', 'save', 'close'])
