/**
 * Title-adjacent stage chip: "设计 · 2/6" beside the Session title.
 * Seat: `conversation.session.header.actions` (list, session scope); the
 * registration injects the current `sessionId` so the chip reads the same
 * per-session stage store as the row badge.
 */
export function createHeaderStage(React, store) {
  var h = React.createElement

  function useStage(sessionId) {
    if (typeof React.useSyncExternalStore === 'function') {
      return React.useSyncExternalStore(store.subscribe, function () { return store.get(sessionId) })
    }
    var state = React.useState(store.get(sessionId))
    React.useEffect(function () {
      return store.subscribe(function () { state[1](store.get(sessionId)) })
    }, [sessionId])
    return state[0]
  }

  function HeaderStage(props) {
    var stage = useStage(props.sessionId)
    if (!stage) return null
    return h('span', {
      className: 'do-pill',
      'data-tone': stage.tone || 'brand',
      title: '当前阶段：' + stage.label
    }, stage.label + (stage.total ? ' · ' + stage.index + '/' + stage.total : '') + (stage.substage ? ' · ' + stage.substage : ''))
  }

  return HeaderStage
}
