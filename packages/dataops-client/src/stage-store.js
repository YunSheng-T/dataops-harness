/**
 * Per-session stage state shared by the session-row badge, the header chip and
 * the turn brief. The turn definition is the only writer: when a dataops tool
 * result settles, it publishes the stage; the two decorations subscribe.
 *
 * No persistence: stage is derivable from the Session log, so the badge simply
 * stays empty until a turn in this client produced a dataops result.
 */
export function createStageStore() {
  var values = {}
  var listeners = []

  return {
    get: function (sessionId) {
      return values[String(sessionId)] || null
    },
    set: function (sessionId, value) {
      var key = String(sessionId)
      if (values[key] === value) return
      values[key] = value
      listeners.slice().forEach(function (listener) { listener() })
    },
    subscribe: function (listener) {
      listeners.push(listener)
      return function () {
        var index = listeners.indexOf(listener)
        if (index >= 0) listeners.splice(index, 1)
      }
    }
  }
}
