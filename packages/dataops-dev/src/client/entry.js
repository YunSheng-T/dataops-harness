/**
 * P1 原生入口：文件预览工具栏「在开发中打开」。
 * 通过插件内 pendingLocations 交接定位，再经公开服务
 * ctx.uiConversation.binding(sessionId).activate('dataops-dev') 激活视图。
 * （conversation.session 的 openView 注入面只覆盖其自身子树，
 * 预览工具栏不在其中，故用自有交接通道；viewRequest 原生深链路径不变。）
 */

/** 每 Session 一次性定位交接：set → 视图激活后 consume。 */
function createPendingLocations() {
  var state = {}
  var listeners = new Set()
  function emit() { listeners.forEach(function (listener) { listener() }) }
  return {
    source: {
      getSnapshot: function () { return state },
      subscribe: function (listener) {
        listeners.add(listener)
        return function () { listeners.delete(listener) }
      },
    },
    set: function (sessionId, location) {
      var next = Object.assign({}, state)
      next[sessionId] = location
      state = next
      emit()
    },
    consume: function (sessionId) {
      if (!(sessionId in state)) return
      var next = Object.assign({}, state)
      delete next[sessionId]
      state = next
      emit()
    },
  }
}

function createDevOpenAction(React) {
  var h = React.createElement
  function DevOpenAction(props) {
    return h('button', {
      type: 'button',
      title: '在开发视图中编辑此文件',
      onClick: function () { props.openInDev(props.absolutePath) },
      style: { fontSize: '12px', padding: '2px 10px', whiteSpace: 'nowrap' },
    }, '在开发中打开')
  }
  return { DevOpenAction: DevOpenAction }
}
