/**
 * P1「开发」视图：Tabs + 文本编辑器 + 完整同步状态 + 三方冲突模式。
 * 状态机全部在 model.js（可单测）；本文件只做渲染与 DOM 交互。
 * 服从原生主题变量，不 fixed 全屏；任何失败路径本地草稿可导出。
 */
function createDataDevelopmentView(React) {
  var h = React.createElement

  var SYNC_LABEL = { clean: '已保存', dirty: '未保存', saving: '保存中…', 'save-unknown': '结果未知', conflict: '冲突' }
  var AVAIL_LABEL = { 'read-only': '只读', missing: '已删除' }

  function basename(path) {
    var parts = String(path || '').split('/')
    return parts[parts.length - 1] || path
  }

  function download(name, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(function () { URL.revokeObjectURL(url) }, 5000)
  }

  function ConflictPanel(props) {
    var model = props.model
    var c = model.state.conflict
    var confirmState = React.useState(false)
    var confirming = confirmState[0]
    var setConfirming = confirmState[1]
    React.useEffect(function () { setConfirming(false) }, [c])
    function column(title, digest, text) {
      return h('div', { key: title, style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border, #e5e7eb)', borderRadius: '6px', overflow: 'hidden' } },
        h('div', { style: { padding: '6px 10px', fontSize: '12px', borderBottom: '1px solid var(--border, #e5e7eb)', background: 'var(--background-secondary, #f9fafb)' } },
          h('div', { style: { fontWeight: 600 } }, title),
          h('div', { style: { fontFamily: 'monospace', color: '#9ca3af', fontSize: '11px' } }, String(digest || '').slice(0, 27) + '…')),
        h('pre', { style: { flex: 1, margin: 0, padding: '10px', overflow: 'auto', maxHeight: '40vh', fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, text))
    }
    return h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '12px', gap: '12px' } },
      h('div', { style: { fontSize: '13px', color: '#b91c1c' } }, '磁盘内容与你的草稿已分叉。三方内容均保留，保存与自动刷新已暂停；以下操作都不会自动落盘。'),
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'stretch' } },
        column('base（打开时基线）', c.baseDigest, c.baseText),
        column('local（你的草稿）', undefined, c.localText),
        column('current（当前磁盘）', c.currentDigest, c.currentText)),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px' } },
        confirming
          ? h(React.Fragment, null,
              h('span', { style: { color: '#b91c1c', alignSelf: 'center' } }, '确认丢弃本地草稿，采用磁盘内容？'),
              h('button', { onClick: function () { model.adoptCurrent() } }, '确认采用 current'),
              h('button', { onClick: function () { setConfirming(false) } }, '取消'))
          : h('button', { onClick: function () { setConfirming(true) } }, '采用 current…'),
        h('button', { onClick: function () { model.keepLocal() } }, '保留 local 为草稿'),
        h('button', { title: '以 local 为基础手工合并；current 已成为新基线，不会自动落盘', onClick: function () { model.mergeDraft(c.localText) } }, '手工合并'),
        h('button', { onClick: function () { download(basename(model.state.fileAddress) + '.draft.txt', c.localText) } }, '导出 local')))
  }

  // clean 外部刷新的轻量行 Diff：共同前后缀折叠，仅渲染变化行，避免大文件 O(n²)。
  function ExternalDiff(props) {
    var before = String(props.before || '').split('\n')
    var after = String(props.after || '').split('\n')
    var prefix = 0
    while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1
    var suffix = 0
    while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1
    var removed = before.slice(prefix, before.length - suffix)
    var added = after.slice(prefix, after.length - suffix)
    var rows = removed.map(function (text) { return { kind: '-', text: text } })
      .concat(added.map(function (text) { return { kind: '+', text: text } }))
    var visible = rows.slice(0, 200)
    return h('div', { style: { margin: '8px 12px 0', border: '1px solid var(--border, #e5e7eb)', borderRadius: '6px', overflow: 'auto', maxHeight: '30vh', flexShrink: 0 } },
      h('div', { style: { padding: '5px 10px', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid var(--border, #e5e7eb)' } }, '外部变更 Diff（base → current）'),
      visible.map(function (row, index) {
        return h('div', { key: index, style: { display: 'flex', gap: '8px', padding: '1px 10px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: row.kind === '-' ? '#b91c1c' : '#15803d', background: row.kind === '-' ? 'rgba(185,28,28,.06)' : 'rgba(21,128,61,.06)' } },
          h('span', null, row.kind), h('span', null, row.text || ' '))
      }),
      rows.length > visible.length ? h('div', { style: { padding: '5px 10px', fontSize: '11px', color: '#6b7280' } }, '其余 ' + (rows.length - visible.length) + ' 行变更省略') : null)
  }

  function EditorBody(props) {
    var model = props.model
    var s = model.state
    var taRef = React.useRef(null)
    var selRef = React.useRef({ start: 0, end: 0, scroll: 0 })
    var prevDraft = React.useRef(s.draft)
    // clean 外部刷新后尽量保留光标/选择/滚动。
    React.useEffect(function () {
      var ta = taRef.current
      if (ta && prevDraft.current !== s.draft) {
        var start = Math.min(selRef.current.start, s.draft.length)
        var end = Math.min(selRef.current.end, s.draft.length)
        try { ta.setSelectionRange(start, end) } catch (e) { /* 非聚焦时忽略 */ }
        ta.scrollTop = selRef.current.scroll
      }
      prevDraft.current = s.draft
    }, [s.draft])
    var readOnly = s.availability !== 'normal'
    return h('textarea', {
      ref: taRef,
      value: s.draft,
      spellCheck: false,
      readOnly: readOnly,
      onChange: function (event) { model.input(event.target.value) },
      onSelect: function (event) {
        selRef.current = { start: event.target.selectionStart, end: event.target.selectionEnd, scroll: event.target.scrollTop }
      },
      onScroll: function (event) { selRef.current.scroll = event.target.scrollTop },
      style: { flex: 1, resize: 'none', border: 'none', outline: 'none', padding: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px', lineHeight: 1.6, background: 'transparent', color: 'inherit', opacity: readOnly ? 0.7 : 1 },
    })
  }

  function DataDevelopmentView(props) {
    var sessionId = props.sessionId
    var tabsState = props.useDevTabs(function (s) { return s })
    var pending = props.useDevPending(function (s) { return s[sessionId] })
    var dismissedRef = React.useRef(undefined)
    var dismissTick = React.useState(0)

    // 原生深链：viewRequest → openLocation；非法 focus 不跳转（UI-03）。
    React.useEffect(function () {
      if (!props.viewRequest || props.viewRequest.view !== 'dataops-dev') return
      var location = decodeLocation(props.viewRequest.focus)
      props.completeViewRequest()
      if (location === null) return
      props.openLocation(location)
    }, [props.viewRequest])

    // 预览入口的 pending 交接：消费一次性定位。
    React.useEffect(function () {
      if (!pending) return
      props.consumePending()
      props.openLocation(pending)
    }, [pending])

    // 轮询外部变化 + 窗口聚焦即对账 + 卸载/隐藏时持久化 hot-exit。
    React.useEffect(function () {
      var timer = setInterval(props.pollActive, 4000)
      function onFocus() { props.pollActive() }
      function onHide() { props.persistAll() }
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onHide)
      window.addEventListener('beforeunload', onHide)
      return function () {
        clearInterval(timer)
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onHide)
        window.removeEventListener('beforeunload', onHide)
        props.persistAll()
      }
    }, [])

    var activeTab = tabsState.tabs.find(function (tab) { return tab.fileAddress === tabsState.activeAddress })
    var model = activeTab ? activeTab.model : undefined
    var s = model ? model.state : undefined
    var notice = s && s.notice
    if (dismissedRef.current !== undefined && dismissedRef.current !== notice) dismissedRef.current = undefined
    var noticeVisible = notice && dismissedRef.current === undefined

    return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'inherit' } },
      // Tabs 条
      tabsState.tabs.length > 0
        ? h('div', { style: { display: 'flex', gap: '2px', padding: '4px 8px', borderBottom: '1px solid var(--border, #e5e7eb)', overflowX: 'auto', fontSize: '12px' } },
            tabsState.tabs.map(function (tab) {
              var active = tab.fileAddress === tabsState.activeAddress
              var dirty = tab.model.state.sync !== 'clean'
              return h('span', { key: tab.fileAddress, style: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', background: active ? 'var(--background-secondary, #f3f4f6)' : 'transparent', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' },
                onClick: function () { props.activateTab(tab.fileAddress) } },
                basename(tab.fileAddress),
                dirty ? h('span', { title: '有未保存内容', style: { color: '#d97706' } }, '●') : null,
                h('span', { title: '关闭（草稿经 hot-exit 保留）', style: { color: '#9ca3af', marginLeft: '2px' },
                  onClick: function (event) { event.stopPropagation(); props.closeTab(tab.fileAddress) } }, '×'))
            }))
        : null,
      model
        ? h(React.Fragment, { key: s.fileAddress },
            // 标题栏：路径 + 同步状态 + savedDigest + 降级标记 + 操作
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderBottom: '1px solid var(--border, #e5e7eb)', fontSize: '12px', flexWrap: 'wrap' } },
              h('span', { style: { fontWeight: 600 }, title: s.fileAddress }, s.fileAddress),
              s.phase === 'ready'
                ? h('span', { style: { color: s.sync === 'conflict' || s.sync === 'save-unknown' ? '#b91c1c' : '#6b7280' } }, SYNC_LABEL[s.sync] || s.sync)
                : null,
              s.availability !== 'normal'
                ? h('span', { style: { color: '#b45309', border: '1px solid #b45309', borderRadius: '4px', padding: '0 4px' } }, AVAIL_LABEL[s.availability])
                : null,
              s.savedDigest ? h('span', { style: { color: '#9ca3af', fontFamily: 'monospace' } }, s.savedDigest.slice(0, 19) + '…') : null,
              h('span', { style: { flex: 1 } }),
              s.phase === 'ready'
                ? h('button', { disabled: s.sync !== 'dirty' || s.availability !== 'normal', onClick: function () { model.save() }, style: { fontSize: '12px', padding: '2px 10px' } }, '保存')
                : null,
              s.phase === 'ready' && s.sync === 'save-unknown'
                ? h('button', { onClick: function () { model.reconcile() }, style: { fontSize: '12px', padding: '2px 10px' } }, '重新对账')
                : null,
              s.phase === 'ready'
                ? h('button', { title: '导出本地草稿', onClick: function () { download(basename(s.fileAddress) + '.draft.txt', model.exportText()) }, style: { fontSize: '12px', padding: '2px 10px' } }, '导出草稿')
                : null),
            // 通知条（外部刷新 / 恢复 / 错误）
            noticeVisible
              ? h('div', { style: { display: 'flex', gap: '8px', padding: '6px 12px', fontSize: '12px', borderBottom: '1px solid var(--border, #e5e7eb)', color: notice.kind === 'error' ? '#b91c1c' : '#6b7280' } },
                  h('span', { style: { flex: 1 } }, notice.message),
                  h('button', { onClick: function () { dismissedRef.current = notice; dismissTick[1](dismissTick[0] + 1) } }, '知道了'))
              : null,
            noticeVisible && notice.kind === 'external-clean'
              ? h(ExternalDiff, { before: notice.baseText, after: notice.currentText })
              : null,
            // 主体
            s.phase === 'opening' ? h('div', { style: { padding: '24px', color: '#9ca3af', fontSize: '13px' } }, '打开中…') : null,
            s.phase === 'error' ? h('div', { style: { padding: '24px', fontSize: '13px', color: '#b91c1c' } }, '打开失败：' + s.error) : null,
            s.phase === 'ready' && s.sync === 'conflict' ? h(ConflictPanel, { model: model }) : null,
            s.phase === 'ready' && s.sync !== 'conflict' ? h(EditorBody, { model: model }) : null,
            // Ctrl+S 键盘保存
            h(KeyboardSave, { model: model }))
        : h('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px', padding: '24px', textAlign: 'center' } },
            '从文件预览点「在开发中打开」，或经会话深链 openView(\'dataops-dev\', focus) 打开文件'))
  }

  function KeyboardSave(props) {
    var model = props.model
    React.useEffect(function () {
      function onKeydown(event) {
        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
          event.preventDefault()
          model.save()
        }
      }
      window.addEventListener('keydown', onKeydown)
      return function () { window.removeEventListener('keydown', onKeydown) }
    }, [model])
    return null
  }

  return { DataDevelopmentView: DataDevelopmentView }
}
