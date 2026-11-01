/**
 * P0 最小「开发」视图：标题栏（路径 + 同步状态 + savedDigest 摘要）、文本区、
 * 手动保存（Ctrl+S / 按钮）。冲突与三方面板是 P1 范围；P0 遇 stale 只展示错误
 * 并保留本地草稿，绝不自动覆盖。
 */
function createDataDevelopmentView(React) {
  var h = React.createElement

  function DataDevelopmentView(props) {
    var sessionId = props.sessionId
    var remote = props.devDocuments
    var viewRequest = props.viewRequest
    var completeViewRequest = props.completeViewRequest

    var docState = React.useState(null)
    var doc = docState[0]
    var setDoc = docState[1]
    var draftState = React.useState('')
    var draft = draftState[0]
    var setDraft = draftState[1]
    var statusState = React.useState({ kind: 'empty' })
    var status = statusState[0]
    var setStatus = statusState[1]
    var dirtyRef = React.useRef(false)

    // 一次性 focus 深链：消费后 completeViewRequest。非法 focus 不跳转（UI-03）。
    React.useEffect(function () {
      if (!viewRequest || viewRequest.view !== 'dataops-dev') return
      var location = decodeLocation(viewRequest.focus)
      completeViewRequest()
      if (location === null) {
        setStatus({ kind: 'error', message: '无效的开发视图定位（focus 非法或已过期）' })
        return
      }
      setStatus({ kind: 'opening', message: location.fileAddress })
      remote.open(sessionId, location.fileAddress).then(function (snapshot) {
        setDoc(snapshot)
        setDraft(snapshot.text)
        dirtyRef.current = false
        setStatus({ kind: 'clean', message: snapshot.fileAddress })
      }, function (error) {
        setStatus({ kind: 'error', message: (error && error.code ? error.code + ': ' : '') + String(error && error.message || error) })
      })
    }, [viewRequest])

    var doSave = React.useCallback(function () {
      if (!doc || !dirtyRef.current) return
      var snapshotText = draft
      setStatus({ kind: 'saving', message: doc.fileAddress })
      remote.save(sessionId, doc.documentId, doc.baseVersion, snapshotText, crypto.randomUUID()).then(function (result) {
        setDoc(Object.assign({}, doc, { baseVersion: result.version, savedDigest: result.savedDigest }))
        dirtyRef.current = false
        setStatus({ kind: 'clean', message: doc.fileAddress })
      }, function (error) {
        var code = error && error.code
        if (code === 'dev/stale-version') setStatus({ kind: 'conflict', message: '磁盘版本已变化，本地草稿已保留（三方冲突面板在 P1 提供）' })
        else setStatus({ kind: 'error', message: (code ? code + ': ' : '') + String(error && error.message || error) })
      })
    }, [doc, draft])

    React.useEffect(function () {
      function onKeydown(event) {
        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
          event.preventDefault()
          doSave()
        }
      }
      window.addEventListener('keydown', onKeydown)
      return function () { window.removeEventListener('keydown', onKeydown) }
    }, [doSave])

    var STATUS_LABEL = { empty: '未打开文件', opening: '打开中…', clean: '已保存', dirty: '未保存', saving: '保存中…', conflict: '冲突', error: '错误' }

    return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'inherit' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderBottom: '1px solid var(--border, #e5e7eb)', fontSize: '12px' } },
        h('span', { style: { fontWeight: 600 } }, doc ? doc.fileAddress : '开发'),
        h('span', { style: { color: status.kind === 'error' || status.kind === 'conflict' ? '#b91c1c' : '#6b7280' } }, STATUS_LABEL[status.kind] || status.kind),
        doc ? h('span', { style: { color: '#9ca3af', fontFamily: 'monospace' } }, doc.savedDigest.slice(0, 19) + '…') : null,
        h('span', { style: { flex: 1 } }),
        h('button', {
          disabled: !doc || !dirtyRef.current || status.kind === 'saving',
          onClick: doSave,
          style: { fontSize: '12px', padding: '2px 10px' },
        }, '保存')),
      status.kind === 'error' || status.kind === 'conflict'
        ? h('div', { style: { padding: '6px 12px', fontSize: '12px', color: '#b91c1c', borderBottom: '1px solid var(--border, #e5e7eb)' } }, status.message)
        : null,
      doc
        ? h('textarea', {
            value: draft,
            spellCheck: false,
            onChange: function (event) {
              dirtyRef.current = true
              setDraft(event.target.value)
              if (status.kind !== 'dirty') setStatus({ kind: 'dirty', message: doc.fileAddress })
            },
            style: { flex: 1, resize: 'none', border: 'none', outline: 'none', padding: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px', lineHeight: 1.6, background: 'transparent', color: 'inherit' },
          })
        : h('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' } },
            '从文件卡片或会话深链打开文件（openView(\'dataops-dev\', focus)）'))
  }

  return { DataDevelopmentView: DataDevelopmentView }
}
