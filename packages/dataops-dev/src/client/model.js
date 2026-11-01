/**
 * P1 单文档状态机（纯 JS，无 React / 无 DOM，可在 Node 下单测）。
 *
 * 状态：clean / dirty / saving / save-unknown / conflict（正交 availability：
 * normal / read-only / missing）。任何失败路径 draft 保留且可导出；
 * 不自动重试写入、不伪造 receipt、不自动落盘。
 */

var DIGEST_PREFIX = 'sha256:'

/** 与 Host digest.js 同算法：sha256:<hex of utf8 bytes>。浏览器与 Node 均有 webcrypto。 */
function digestText(text) {
  var bytes = new TextEncoder().encode(text)
  return Promise.resolve(crypto.subtle.digest('SHA-256', bytes)).then(function (buffer) {
    var hex = Array.from(new Uint8Array(buffer)).map(function (b) { return b.toString(16).padStart(2, '0') }).join('')
    return DIGEST_PREFIX + hex
  })
}

var DEFINITIVE_SAVE_ERRORS = {
  'dev/too-large': true,
  'dev/unsupported-encoding': true,
  'dev/action-forbidden': true,
  'dev/idempotency-conflict': true,
}

/**
 * @param options { sessionId, remote, emit } remote 为 devDocumentsRemote 形态；
 * emit 在每次状态变化时调用（无参）。
 */
function createDocumentModel(options) {
  var sessionId = options.sessionId
  var remote = options.remote
  var emit = options.emit

  var model = {
    state: {
      phase: 'opening', // opening | ready | error
      availability: 'normal', // normal | read-only | missing
      sync: 'clean', // clean | dirty | saving | save-unknown | conflict
      documentId: undefined,
      fileAddress: undefined,
      contentType: undefined,
      baseVersion: undefined,
      savedDigest: undefined,
      baseText: '',
      draft: '',
      conflict: undefined, // { baseText, baseDigest, localText, currentText, currentVersion, currentDigest }
      saving: undefined, // { snapshot, idemKey, baseVersion }
      receipt: undefined,
      savedAt: undefined,
      notice: undefined, // { kind, message }
      error: undefined, // 打开失败的最终错误信息
    },
    _lastAttempt: null, // { snapshot, idemKey, baseVersion } 幂等重试用
  }

  function set(patch) {
    model.state = Object.assign({}, model.state, patch)
    emit()
  }

  function ready() {
    return model.state.phase === 'ready'
  }

  /** 打开成功后初始化；restored 为 hot-exit 记录（可空）。 */
  model.init = function (snapshot, restored) {
    var draft = snapshot.text
    var sync = 'clean'
    var conflict
    if (restored && restored.draftText !== snapshot.text) {
      if (restored.baseDigest === snapshot.savedDigest) {
        // 磁盘未变：恢复普通 dirty，不自动保存。
        draft = restored.draftText
        sync = 'dirty'
      } else {
        // 磁盘已变：恢复为冲突，base=退出时基线，local=退出时草稿，current=当前磁盘。
        draft = restored.draftText
        sync = 'conflict'
        conflict = {
          baseText: restored.baseText,
          baseDigest: restored.baseDigest,
          localText: restored.draftText,
          currentText: snapshot.text,
          currentVersion: snapshot.baseVersion,
          currentDigest: snapshot.savedDigest,
        }
      }
    }
    set({
      phase: 'ready',
      availability: 'normal',
      sync: sync,
      conflict: conflict,
      documentId: snapshot.documentId,
      fileAddress: snapshot.fileAddress,
      contentType: snapshot.contentType,
      baseVersion: snapshot.baseVersion,
      savedDigest: snapshot.savedDigest,
      baseText: snapshot.text,
      draft: draft,
      receipt: undefined,
      savedAt: undefined,
      notice: restored && sync !== 'clean' ? { kind: 'restored', message: '已恢复未保存草稿' } : undefined,
    })
  }

  model.failOpen = function (error) {
    var code = error && error.code
    set({ phase: 'error', error: (code ? code + ': ' : '') + String(error && error.message || error) })
  }

  model.input = function (text) {
    if (!ready() || model.state.sync === 'conflict') return
    set({ sync: model.state.sync === 'saving' || model.state.sync === 'save-unknown' ? model.state.sync : 'dirty', draft: text })
  }

  function onSaved(result, S) {
    var sameDraft = model.state.draft === S
    model._lastAttempt = null
    set({
      sync: sameDraft ? 'clean' : 'dirty',
      saving: undefined,
      conflict: undefined,
      baseVersion: result.version,
      savedDigest: result.savedDigest,
      baseText: S,
      savedAt: result.savedAt || new Date().toISOString(),
      receipt: result.receipt,
      notice: result.receipt ? undefined : { kind: 'saved-by-content', message: '按内容确认已保存（无原始回执）' },
    })
  }

  function enterConflict(currentSnapshot) {
    var s = model.state
    set({
      sync: 'conflict',
      saving: undefined,
      conflict: {
        baseText: s.conflict ? s.conflict.baseText : s.baseText,
        baseDigest: s.conflict ? s.conflict.baseDigest : s.savedDigest,
        localText: s.draft,
        currentText: currentSnapshot.text,
        currentVersion: currentSnapshot.baseVersion,
        currentDigest: currentSnapshot.savedDigest,
      },
      // Host 记录已推进到 current；本地基线同步推进，draft 保留。
      baseVersion: currentSnapshot.baseVersion,
      savedDigest: currentSnapshot.savedDigest,
      baseText: currentSnapshot.text,
      notice: undefined,
    })
  }

  async function onSaveError(error, S) {
    var code = error && error.code
    if (code === 'dev/stale-version') {
      try {
        var currentSnapshot = await remote.current(sessionId, model.state.documentId)
        enterConflict(currentSnapshot)
      } catch (currentError) {
        set({ sync: 'dirty', saving: undefined, notice: { kind: 'error', message: '冲突且读取当前磁盘失败：' + String(currentError && currentError.message || currentError) } })
      }
      return
    }
    if (code === 'dev/read-only') {
      set({ availability: 'read-only', sync: 'dirty', saving: undefined, notice: { kind: 'error', message: '文件不可写，已降级只读；本地草稿可导出' } })
      return
    }
    if (code === 'dev/not-found') {
      set({ availability: 'missing', sync: 'dirty', saving: undefined, notice: { kind: 'error', message: '文件已不存在；本地草稿可导出' } })
      return
    }
    if (DEFINITIVE_SAVE_ERRORS[code]) {
      // 确定性失败：未发生写入，回到 dirty，由用户处理。
      set({ sync: 'dirty', saving: undefined, notice: { kind: 'error', message: code + ': ' + String(error.message || error) } })
      return
    }
    // 响应未知：可能已落盘也可能未执行。进入 save-unknown 并立即对账一次。
    set({ sync: 'save-unknown', saving: undefined, notice: { kind: 'error', message: '保存结果未知，正在对账…' } })
    await model.reconcile()
  }

  /** 手动保存：固定快照 S；保存期间的后续输入仍是新的 dirty draft。 */
  model.save = async function () {
    var s = model.state
    if (!ready() || s.availability !== 'normal') return
    if (s.sync !== 'dirty') return
    var S = s.draft
    var reuse = model._lastAttempt && model._lastAttempt.snapshot === S && model._lastAttempt.baseVersion === s.baseVersion
    var idemKey = reuse ? model._lastAttempt.idemKey : crypto.randomUUID()
    var attempt = { snapshot: S, idemKey: idemKey, baseVersion: s.baseVersion }
    model._lastAttempt = attempt
    set({ sync: 'saving', saving: { snapshot: S, idemKey: idemKey, baseVersion: s.baseVersion }, notice: undefined })
    try {
      var result = await remote.save(sessionId, s.documentId, s.baseVersion, S, idemKey)
      onSaved(result, S)
    } catch (error) {
      await onSaveError(error, S)
    }
  }

  /** save-unknown 对账：只在真实磁盘状态上判定，不重试写入。 */
  model.reconcile = async function () {
    var s = model.state
    var attempt = model._lastAttempt
    if (s.sync !== 'save-unknown' || !attempt) return
    try {
      var targetDigest = await digestText(attempt.snapshot)
      var r = await remote.reconcile(sessionId, s.documentId, attempt.baseVersion, targetDigest)
      if (r.kind === 'saved') {
        onSaved({ version: r.version, savedDigest: r.savedDigest, receipt: r.receipt }, attempt.snapshot)
      } else if (r.kind === 'not-saved') {
        // 保持 dirty，幂等键保留，只有用户显式重试。
        set({ sync: 'dirty', notice: { kind: 'not-saved', message: '确认未落盘；可用同一幂等键显式重试保存' } })
      } else {
        enterConflict(r.current)
      }
    } catch (error) {
      set({ notice: { kind: 'error', message: '对账失败，仍处于结果未知状态：' + String(error && error.message || error) } })
    }
  }

  /**
   * 外部变化检测（轮询 / 窗口聚焦时调用）。
   * saving / save-unknown / conflict 期间跳过；clean 安全刷新，dirty 进入三方冲突。
   */
  model.poll = async function () {
    var s = model.state
    if (!ready()) return
    if (s.sync === 'saving' || s.sync === 'save-unknown' || s.sync === 'conflict') return
    var snapshot
    try {
      snapshot = await remote.current(sessionId, s.documentId)
    } catch (error) {
      if (error && error.code === 'dev/not-found' && s.availability !== 'missing') {
        set({ availability: 'missing', notice: { kind: 'error', message: '文件已被删除；本地草稿可导出' } })
      }
      return
    }
    if (model.state.sync !== s.sync) return // 轮询期间状态已变，丢弃本次结果
    var patch = {}
    if (s.availability === 'missing') patch.availability = 'normal'
    if (snapshot.baseVersion === s.baseVersion && s.availability === 'normal') return
    if (snapshot.baseVersion === s.baseVersion) { set(patch); return }
    if (s.sync === 'clean') {
      // clean 外部更新：安全刷新（光标/滚动由视图层保留）。
      set(Object.assign(patch, {
        baseVersion: snapshot.baseVersion,
        savedDigest: snapshot.savedDigest,
        baseText: snapshot.text,
        draft: snapshot.text,
        notice: { kind: 'external-clean', message: '磁盘已被外部更新，已刷新为最新内容' },
      }))
    } else {
      enterConflict(snapshot)
    }
  }

  /** 采用 current：视图层二次确认后调用；丢弃 local，回到 clean。 */
  model.adoptCurrent = function () {
    var c = model.state.conflict
    if (!c) return
    model._lastAttempt = null
    set({ sync: 'clean', conflict: undefined, draft: c.currentText, notice: { kind: 'adopted', message: '已采用磁盘内容' } })
  }

  /** 保留 local 为草稿：只把 current 设为新基线（已在 enterConflict 完成），仍需显式保存。 */
  model.keepLocal = function () {
    var c = model.state.conflict
    if (!c) return
    set({ sync: 'dirty', conflict: undefined, draft: c.localText, notice: { kind: 'keep-local', message: '已保留本地草稿；基线为当前磁盘版本，保存仍须手动' } })
  }

  /** 手工合并：以给定文本生成 merge draft，不自动落盘。 */
  model.mergeDraft = function (text) {
    if (!model.state.conflict) return
    set({ sync: 'dirty', conflict: undefined, draft: text, notice: { kind: 'merge', message: '合并草稿已生成，未落盘' } })
  }

  /** 导出用本地草稿（任何失败路径都可用）。 */
  model.exportText = function () {
    return model.state.draft
  }

  /** hot-exit 记录；clean 且无冲突时返回 null（调用方应清除记录）。 */
  model.hotExitRecord = function (sessionScope, clientInstance) {
    var s = model.state
    if (!ready()) return null
    if (s.sync === 'clean' && !s.conflict) return null
    return {
      sessionScope: sessionScope,
      fileAddress: s.fileAddress,
      baseVersion: s.baseVersion,
      baseDigest: s.savedDigest,
      baseText: s.baseText,
      draftText: s.draft,
      updatedAt: Date.now(),
      clientInstance: clientInstance,
    }
  }

  model.close = function () {
    if (!ready()) return
    Promise.resolve(remote.close(sessionId, model.state.documentId)).catch(function () { /* 释放 presence 失败不影响本地 */ })
  }

  model.source = {
    getSnapshot: function () { return model.state },
    subscribe: function (listener) { return options.onSubscribe(listener) },
  }

  return model
}
