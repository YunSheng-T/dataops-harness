/**
 * DevDocument 一致性打开与受防护保存的核心逻辑（Host 侧，无 cordis 依赖）。
 * 文件真相始终是同一 Session 的 ctx.fs；本模块不建第二文件系统。
 */
import {
  concurrentRead,
  documentUnknown,
  idempotencyConflict,
  mapSaveError,
  notFound,
  notRegularFile,
  staleVersion,
  tooLarge,
} from './errors.js'
import { digestBytes, digestText } from './digest.js'
import { contentTypeOf, decodeUtf8Strict } from './text.js'

/** 一致性打开的最大重读次数（stat → readBytes → stat 版本不一致时）。 */
const OPEN_RETRY_LIMIT = 3

/**
 * @typedef {object} DevDocumentRecord
 * @property {string} documentId
 * @property {string} sessionId
 * @property {string} fileAddress   展示路径（host 文件系统绝对路径）
 * @property {object} target        ctx.fs.resolve 的产物（opaque targetKey）
 * @property {string} baseVersion   最近一致快照的 opaque FsVersion 字符串
 * @property {string} savedDigest   最近落盘内容的 sha256
 * @property {string} contentType
 * @property {Map<string, { targetDigest: string, result: object }>} idempotency
 * @property {Promise<unknown>} tail  每文档串行保存队列
 */

export class DevDocumentStore {
  /** @param {{ maxBytes: number }} config */
  constructor(config) {
    this.config = config
    /** @type {Map<string, DevDocumentRecord>} */
    this.documents = new Map()
    /** (sessionId + '\n' + fileAddress) → documentId；同一地址只有一个文档模型。 */
    this.byAddress = new Map()
    /** 保存能力一次性令牌：service.save 签发，bridge 消费。 @type {Set<string>} */
    this.pendingTokens = new Set()
    /** @type {Map<string, { token: string, documentId: string, targetDigest: string }>} */
    this.pendingByToken = new Map()
  }

  /**
   * 一致性读取当前磁盘：stat → readBytes → stat，前后 FsVersion 一致才返回；
   * 不一致有限重读，仍失败报 dev/concurrent-read。不更新任何文档记录。
   */
  async readConsistent(fs, target, displayPath, signal) {
    let lastError
    for (let attempt = 0; attempt < OPEN_RETRY_LIMIT; attempt++) {
      signal?.throwIfAborted()
      const stat1 = await fs.stat(target, signal)
      if (stat1 === undefined) throw notFound(displayPath)
      if (stat1.type !== 'file') throw notRegularFile(displayPath, stat1.type)
      if (stat1.size !== undefined && stat1.size > this.config.maxBytes) {
        throw tooLarge(displayPath, stat1.size, this.config.maxBytes)
      }
      let bytes
      try {
        bytes = await fs.readBytes(target, signal, this.config.maxBytes)
      } catch (error) {
        if (error && error.code === 'FS_TOO_LARGE') {
          throw tooLarge(displayPath, stat1.size ?? -1, this.config.maxBytes)
        }
        throw error
      }
      const stat2 = await fs.stat(target, signal)
      if (stat2 === undefined) throw notFound(displayPath)
      if (String(stat1.version) === String(stat2.version)) {
        return { version: String(stat2.version), bytes }
      }
      lastError = concurrentRead(displayPath)
    }
    throw lastError
  }

  /**
   * 一致性打开：lstat（符号链接策略）→ resolve → 一致性读取。
   * 同一 (sessionId, 规范化 fileAddress) 只有一个文档模型：重复打开返回
   * 已有 documentId + 当前磁盘一致快照（客户端负责聚焦已有 tab）。
   */
  async open(fs, sessionId, workspaceRoot, path, signal) {
    const info0 = await fs.lstat(path, { cwd: workspaceRoot }, signal)
    if (info0 === undefined) throw notFound(path)
    // 首版只有 regular file 可编辑；末端符号链接与目录、特殊文件一律拒绝。
    if (info0.type !== 'file') throw notRegularFile(path, info0.type)

    const target = await fs.resolve(path, { cwd: workspaceRoot, signal })
    const displayPath = target.displayPath

    const { version, bytes } = await this.readConsistent(fs, target, displayPath, signal)
    const addressKey = sessionId + '\n' + displayPath
    const existingId = this.byAddress.get(addressKey)
    const existing = existingId !== undefined ? this.documents.get(existingId) : undefined
    if (existing !== undefined) {
      // 同一文档重新打开：推进到当前磁盘快照，保留 documentId、幂等记录与保存队列。
      existing.baseVersion = version
      existing.savedDigest = digestBytes(bytes)
      return this.snapshot(existing, bytes)
    }
    const record = {
      documentId: crypto.randomUUID(),
      sessionId,
      fileAddress: displayPath,
      target,
      baseVersion: version,
      savedDigest: digestBytes(bytes),
      contentType: contentTypeOf(displayPath),
      idempotency: new Map(),
      tail: Promise.resolve(),
    }
    this.documents.set(record.documentId, record)
    this.byAddress.set(addressKey, record.documentId)
    return this.snapshot(record, bytes)
  }

  /** @returns 打开快照。 */
  snapshot(record, bytes) {
    const text = decodeUtf8Strict(bytes, record.fileAddress)
    return {
      documentId: record.documentId,
      fileAddress: record.fileAddress,
      text,
      baseVersion: record.baseVersion,
      savedDigest: record.savedDigest,
      contentType: record.contentType,
      readOnly: false,
      capabilities: { canAnalyze: false, canStructuredEdit: false, allowedActions: [] },
    }
  }

  /** @returns {DevDocumentRecord} */
  require(documentId) {
    const record = this.documents.get(documentId)
    if (record === undefined) throw documentUnknown(documentId)
    return record
  }

  /** bridge 用：文档当前基线版本（FsVersion 字符串），文档已关闭则为 undefined。 */
  baseVersionOf(documentId) {
    return this.documents.get(documentId)?.baseVersion
  }

  /**
   * 签发一次性保存能力令牌。令牌只在 bridge 消费一次后作废，
   * 离开本进程不可伪造（不经过 wire）。
   */
  issueSaveToken(record, targetDigest) {
    const token = crypto.randomUUID()
    this.pendingByToken.set(token, { token, documentId: record.documentId, targetDigest })
    return token
  }

  /**
   * bridge 消费令牌：一次性、绑定 documentId 与 targetKey。
   * @returns {{ documentId: string, targetDigest: string }}
   */
  claimSaveToken(token, targetKey) {
    const pending = this.pendingByToken.get(token)
    if (pending === undefined) return undefined
    this.pendingByToken.delete(token)
    const record = this.documents.get(pending.documentId)
    if (record === undefined || String(record.target.targetKey) !== String(targetKey)) return undefined
    return pending
  }

  /**
   * 受防护保存。幂等、串行（每文档单飞）、Host 重算 digest。
   * 真实写入经 `dispatchWrite`（默认走 write-intent 瀑布 → bridge → ctx.fs.writeText）。
   */
  save(fs, sessionId, documentId, baseVersion, text, idempotencyKey, dispatchWrite, signal) {
    const record = this.require(documentId)
    if (record.sessionId !== sessionId) throw documentUnknown(documentId)
    const targetDigest = digestText(text)
    if (Buffer.byteLength(text, 'utf8') > this.config.maxBytes) {
      throw tooLarge(record.fileAddress, Buffer.byteLength(text, 'utf8'), this.config.maxBytes)
    }

    const prior = record.idempotency.get(idempotencyKey)
    if (prior !== undefined) {
      if (prior.targetDigest !== targetDigest) throw idempotencyConflict(idempotencyKey)
      return record.tail // 同 key 同内容：返回原保存结果
    }

    const run = record.tail.then(() => this.saveOnce(fs, record, baseVersion, text, targetDigest, idempotencyKey, dispatchWrite, signal))
    record.tail = run.catch(() => {})
    return run
  }

  async saveOnce(fs, record, baseVersion, text, targetDigest, idempotencyKey, dispatchWrite, signal) {
    // 客户端带上来的 baseVersion 必须与 Host 记录的当前基线一致；
    // 不一致意味着客户端状态过期，直接 stale，不浪费一次真实写入。
    if (String(baseVersion) !== String(record.baseVersion)) throw staleVersion(record.fileAddress)

    const token = this.issueSaveToken(record, targetDigest)
    let outcome
    try {
      outcome = await dispatchWrite(record, text, token, signal)
    } catch (error) {
      const mapped = mapSaveError(error, record.fileAddress)
      if (mapped !== undefined) throw mapped
      throw error
    }

    // 新 FsVersion 只能来自真实写入 outcome，不得制造。
    const result = {
      version: String(outcome.version),
      savedDigest: targetDigest,
      savedAt: new Date().toISOString(),
      receipt: {
        saveId: crypto.randomUUID(),
        documentId: record.documentId,
        savedDigest: targetDigest,
        savedAt: new Date().toISOString(),
      },
    }
    record.baseVersion = result.version
    record.savedDigest = targetDigest
    record.idempotency.set(idempotencyKey, { targetDigest, result })
    return result
  }

  /**
   * 当前磁盘一致快照（P1 外部变化检测 / clean 刷新）。
   * 返回前把文档基线推进到当前磁盘版本——调用方（轮询/刷新/冲突取数）
   * 总是得到真实的 base/local/current 三方中的 current；保存仍以
   * replaceIfVersion 兜底，推进基线不会放过任何过期写入。
   */
  async current(fs, sessionId, documentId, signal) {
    const record = this.require(documentId)
    if (record.sessionId !== sessionId) throw documentUnknown(documentId)
    const { version, bytes } = await this.readConsistent(fs, record.target, record.fileAddress, signal)
    record.baseVersion = version
    record.savedDigest = digestBytes(bytes)
    return this.snapshot(record, bytes)
  }

  /**
   * save-unknown 对账：只比较真实磁盘状态，不重试写入、不伪造 receipt。
   * - currentDigest == targetDigest → saved（有幂等记录给原 receipt，否则无 receipt）
   * - currentVersion == 保存前 baseVersion 且内容不同 → not-saved
   * - 其他 → conflict，附当前一致快照
   */
  async reconcile(fs, sessionId, documentId, baseVersion, targetDigest, signal) {
    const record = this.require(documentId)
    if (record.sessionId !== sessionId) throw documentUnknown(documentId)
    const { version, bytes } = await this.readConsistent(fs, record.target, record.fileAddress, signal)
    const currentDigest = digestBytes(bytes)
    if (currentDigest === targetDigest) {
      record.baseVersion = version
      record.savedDigest = currentDigest
      let receipt
      for (const entry of record.idempotency.values()) {
        if (entry.targetDigest === targetDigest) { receipt = entry.result.receipt; break }
      }
      return { kind: 'saved', version, savedDigest: currentDigest, receipt }
    }
    if (version === String(baseVersion)) {
      return { kind: 'not-saved', version, currentDigest }
    }
    record.baseVersion = version
    record.savedDigest = currentDigest
    return { kind: 'conflict', current: this.snapshot(record, bytes) }
  }

  close(sessionId, documentId) {
    const record = this.documents.get(documentId)
    if (record === undefined || record.sessionId !== sessionId) return
    this.documents.delete(documentId)
    this.byAddress.delete(record.sessionId + '\n' + record.fileAddress)
  }
}
