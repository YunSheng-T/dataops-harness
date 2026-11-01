/**
 * P1 Tabs 控制器（每个 IDE Session 一个）：同一规范化 fileAddress 只有一个
 * 文档模型，重复打开聚焦已有 tab；draft/撤销输入在 tab 间独立。
 * 纯 JS + 订阅源，React 通过 inject hooks 的 use 绑定读取。
 */
function createTabsController(options) {
  var sessionId = options.sessionId
  var sessionScope = options.sessionScope
  var remote = options.remote
  var hotExit = options.hotExit
  var clientInstance = options.clientInstance
  var listeners = new Set()

  var state = {
    tabs: [], // [{ fileAddress, model }]
    activeAddress: undefined,
  }

  function emit() {
    state = Object.assign({}, state)
    listeners.forEach(function (listener) { listener() })
  }

  function tabOf(address) {
    return state.tabs.find(function (tab) { return tab.fileAddress === address })
  }

  // hot-exit 持久化去抖：输入时 500ms 合并，clean 立即清除由 persist 判定。
  var persistTimers = new Map()
  function schedulePersist(model) {
    var address = model.state.fileAddress
    if (!address) return
    clearTimeout(persistTimers.get(address))
    persistTimers.set(address, setTimeout(function () {
      persistTimers.delete(address)
      controller.persist(model)
    }, 500))
  }

  var controller = {
    source: {
      getSnapshot: function () { return state },
      subscribe: function (listener) {
        listeners.add(listener)
        return function () { listeners.delete(listener) }
      },
    },
    activeModel: function () {
      var tab = tabOf(state.activeAddress)
      return tab ? tab.model : undefined
    },
    activate: function (address) {
      if (state.activeAddress === address) return
      state.activeAddress = address
      emit()
      var model = controller.activeModel()
      if (model) model.poll() // 切回 tab 时立即对账一次外部状态
    },
    openLocation: function (location) {
      var address = location.fileAddress
      var existing = tabOf(address)
      if (existing !== undefined) {
        // UI-02：聚焦已有 tab，保留 dirty 与编辑状态，不创建第二个 buffer。
        controller.activate(address)
        return
      }
      var model = createDocumentModel({
        sessionId: sessionId,
        remote: remote,
        emit: function () { schedulePersist(model); emit() },
        onSubscribe: function (listener) {
          listeners.add(listener)
          return function () { listeners.delete(listener) }
        },
      })
      state.tabs = state.tabs.concat([{ fileAddress: address, model: model }])
      state.activeAddress = address
      emit()
      Promise.resolve()
        .then(function () { return remote.open(sessionId, address) })
        .then(function (snapshot) {
          return Promise.resolve(hotExit.get(sessionScope, snapshot.fileAddress)).then(function (restored) {
            model.init(snapshot, restored)
            controller.persist(model)
          })
        })
        .catch(function (error) { model.failOpen(error) })
    },
    closeTab: function (address) {
      var tab = tabOf(address)
      if (!tab) return
      controller.persist(tab.model)
      tab.model.close()
      var index = state.tabs.indexOf(tab)
      state.tabs = state.tabs.filter(function (item) { return item !== tab })
      if (state.activeAddress === address) {
        var next = state.tabs[Math.min(index, state.tabs.length - 1)]
        state.activeAddress = next ? next.fileAddress : undefined
      }
      emit()
    },
    /** dirty/conflict 时写 hot-exit；clean 时清除。 */
    persist: function (model) {
      var record = model.hotExitRecord(sessionScope, clientInstance)
      if (record === null) {
        if (model.state.fileAddress) hotExit.remove(sessionScope, model.state.fileAddress)
      } else {
        hotExit.put(record)
      }
    },
    persistAll: function () {
      state.tabs.forEach(function (tab) { controller.persist(tab.model) })
    },
    pollActive: function () {
      var model = controller.activeModel()
      if (model) model.poll()
    },
  }
  return controller
}
