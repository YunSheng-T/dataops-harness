/**
 * hot-exit：Session 隔离、带 TTL 的 IndexedDB 草稿箱。
 * 只在本地浏览器持久化 dirty/conflict 草稿；不自动保存、不共享、不发给 Agent。
 * 高安全环境可在 localStorage 置 'dataops-dev.hotExit.disabled' = '1' 禁用。
 */
var HOT_EXIT_DB = 'dataops-dev-hot-exit'
var HOT_EXIT_STORE = 'drafts'
var HOT_EXIT_TTL_MS = 7 * 24 * 60 * 60 * 1000

function hotExitDisabled() {
  try { return globalThis.localStorage && localStorage.getItem('dataops-dev.hotExit.disabled') === '1' } catch (e) { return true }
}

/** 纯函数：记录是否过期（独立导出供 Node 单测）。 */
function hotExitExpired(record, now, ttlMs) {
  return typeof record.updatedAt !== 'number' || now - record.updatedAt > (ttlMs || HOT_EXIT_TTL_MS)
}

function openDb() {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open(HOT_EXIT_DB, 1)
    request.onupgradeneeded = function () {
      var db = request.result
      if (!db.objectStoreNames.contains(HOT_EXIT_STORE)) db.createObjectStore(HOT_EXIT_STORE, { keyPath: 'key' })
    }
    request.onsuccess = function () { resolve(request.result) }
    request.onerror = function () { reject(request.error) }
  })
}

function createHotExit() {
  var dbPromise = null
  function db() {
    if (hotExitDisabled()) return Promise.reject(new Error('hot-exit disabled'))
    if (!dbPromise) dbPromise = openDb()
    return dbPromise
  }
  function keyOf(sessionScope, fileAddress) {
    return sessionScope + '\n' + fileAddress
  }
  function withStore(mode, run) {
    return db().then(function (database) {
      return new Promise(function (resolve, reject) {
        var tx = database.transaction(HOT_EXIT_STORE, mode)
        var request = run(tx.objectStore(HOT_EXIT_STORE))
        tx.oncomplete = function () { resolve(request ? request.result : undefined) }
        tx.onerror = function () { reject(tx.error) }
        tx.onabort = function () { reject(tx.error) }
      })
    })
  }
  return {
    get: function (sessionScope, fileAddress) {
      return withStore('readonly', function (store) { return store.get(keyOf(sessionScope, fileAddress)) })
        .then(function (record) {
          if (!record) return undefined
          if (hotExitExpired(record, Date.now())) return undefined
          return record
        })
        .catch(function () { return undefined })
    },
    put: function (record) {
      return withStore('readwrite', function (store) {
        return store.put(Object.assign({}, record, { key: keyOf(record.sessionScope, record.fileAddress) }))
      }).catch(function () { /* 持久化失败不阻塞编辑 */ })
    },
    remove: function (sessionScope, fileAddress) {
      return withStore('readwrite', function (store) { return store.delete(keyOf(sessionScope, fileAddress)) })
        .catch(function () { /* 同上 */ })
    },
    prune: function (sessionScope) {
      return withStore('readwrite', function (store) {
        var request = store.openCursor()
        request.onsuccess = function () {
          var cursor = request.result
          if (!cursor) return
          var value = cursor.value
          if (value && value.sessionScope === sessionScope && hotExitExpired(value, Date.now())) cursor.delete()
          cursor.continue()
        }
        return request
      }).catch(function () { /* 清理失败可下次再清 */ })
    },
  }
}
