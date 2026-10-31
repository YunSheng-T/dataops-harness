/**
 * DataOps document preview.
 *
 * The upstream Files tab owns browsing and file opening. This renderer claims
 * code/config suffixes and gives DataOps files their own structure summary:
 * LTS tasks/jobs, build packages, manifest refs, SQL blocks, properties.
 */
export function createDataopsDocumentPreview(React, Cards, LineageFlow) {
  var h = React.createElement
  var ID = '@dataops/dsh-dataops-client/code-preview'
  var EXTENSIONS = ['yaml', 'yml', 'sql', 'properties']

  function fileName(address) {
    try {
      var path = decodeURIComponent(String(address || ''))
      var clean = path.split('?')[0].split('#')[0]
      return clean.split('/').pop() || clean
    } catch (error) {
      return String(address || '').split('/').pop() || 'file'
    }
  }

  function lines(text) {
    return String(text || '').split(/\r?\n/u)
  }

  function countMatches(text, re) {
    var match = String(text || '').match(re)
    return match ? match.length : 0
  }

  function parseLts(text) {
    var jobsStart = text.search(/^    jobs:\s*$/mu)
    var taskHeader = jobsStart >= 0 ? text.slice(0, jobsStart) : text
    var jobText = jobsStart >= 0 ? text.slice(jobsStart) : ''
    var jobMatches = []
    var jobRe = /^(\s*)-\s+name:\s*["']?([^"'\n]+)["']?\s*$/gmu
    var match
    while ((match = jobRe.exec(jobText))) jobMatches.push({ index: match.index, name: match[2].trim() })
    var jobs = jobMatches.map(function (entry, index) {
      var next = jobMatches[index + 1] ? jobMatches[index + 1].index : jobText.length
      var block = jobText.slice(entry.index, next)
      var type = (block.match(/^\s*jobType:\s*([A-Za-z0-9_]+)\s*$/mu) || [])[1] || 'unknown'
      var parentText = (block.match(/^\s*parentJobName:\s*\[([^\]]*)\]/mu) || [])[1] || ''
      var parents = parentText.split(',').map(function (value) { return value.trim().replace(/^["']|["']$/gu, '') }).filter(Boolean)
      var path = (block.match(/^\s*path:\s*["']?([^"'\n]+)["']?\s*$/mu) || [])[1] || null
      var exec = (block.match(/^\s*jobExecPath:\s*["']?([^"'\n]+)["']?\s*$/mu) || [])[1] || null
      var timeout = (block.match(/^\s*jobTimeout:\s*(\d+)/mu) || [])[1] || null
      var retries = (block.match(/^\s*jobRetryTimes:\s*(\d+)/mu) || [])[1] || null
      return { name: entry.name, type: type, parents: parents, path: path, exec: exec, timeout: timeout, retries: retries, paramKind: type === 'tskdep' ? 'dependency' : type === 'group' ? 'group' : type === 'open_gauss' || type === 'libra' ? 'database' : type === 'url' ? 'http' : 'script' }
    })
    var typeCounts = {}
    jobs.forEach(function (job) { typeCounts[job.type] = (typeCounts[job.type] || 0) + 1 })
    var taskName = (taskHeader.match(/^    name:\s*["']?([^"'\n]+)["']?\s*$/mu) || [])[1]
    var taskType = (taskHeader.match(/^    type:\s*["']?([^"'\n]+)["']?\s*$/mu) || [])[1]
    var taskParamNames = []
    var taskParamRe = /^\s{6}-\s+name:\s*["']?([^"'\n]+)["']?\s*$/gmu
    while ((match = taskParamRe.exec(taskHeader))) taskParamNames.push(match[1].trim())
    var taskCount = countMatches(text, /^\s*-\s+itemName:/gmu)
    var taskNames = []
    var itemRe = /^\s*itemName:\s*["']?([^"'\n]+)["']?\s*$/gmu
    while ((match = itemRe.exec(text))) taskNames.push(match[1].trim())
    var crons = []
    var cronRe = /^\s*cronExp:\s*["']?([^"'\n]+)["']?\s*$/gmu
    while ((match = cronRe.exec(text))) {
      var cronValue = match[1].trim()
      if (cronValue && cronValue !== 'null' && cronValue !== '~') crons.push(cronValue)
    }
    return {
      type: 'lts',
      taskCount: taskCount,
      jobCount: jobs.length,
      taskName: taskName ? taskName.trim() : null,
      taskType: taskType ? taskType.trim() : null,
      taskParamNames: taskParamNames.slice(0, 8),
      taskNames: taskNames.slice(0, 5),
      jobs: jobs.slice(0, 20),
      typeCounts: typeCounts,
      crons: crons.slice(0, 3),
      placeholders: Array.from(new Set((text.match(/\$\$([A-Za-z_][A-Za-z0-9_]*)\$\$/gu) || []).map(value => value.slice(2, -2)))).slice(0, 12)
    }
  }

  function parseBuild(text) {
    var packages = []
    var re = /^\s*-\s+packageName:\s*["']?([^"'\n]+)["']?\s*$/gmu
    var m
    while ((m = re.exec(text))) packages.push(m[1].trim())
    var toolchains = Array.from(new Set((text.match(/^\s*toolChain:\s*["']?([^"'\n]+)["']?\s*$/gmu) || []).map(value => value.split(':')[1].trim())))
    return { type: 'build', packageCount: packages.length, packages: packages.slice(0, 10), toolchains: toolchains.slice(0, 6) }
  }

  function parseManifest(text) {
    var refs = []
    var re = /^\s{6}([A-Za-z0-9_-]+):\s*["']?([^"'\n]+)["']?\s*$/gmu
    var m
    while ((m = re.exec(text))) refs.push(m[1] + ': ' + m[2].trim())
    return { type: 'manifest', refCount: refs.length, refs: refs.slice(0, 10) }
  }

  function parseSql(text) {
    var ddl = countMatches(text, /^\s*(?:CREATE|ALTER|DROP|TRUNCATE)\s+/gimu)
    var dml = countMatches(text, /^\s*(?:INSERT|UPDATE|DELETE|MERGE)\s+/gimu)
    return { type: 'sql', ddl: ddl, dml: dml, statements: countMatches(text, /;\s*$/gmu) }
  }

  function parseProperties(text) {
    var rows = []
    for (var line of lines(text)) {
      var trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      var index = trimmed.indexOf('=')
      if (index > 0) rows.push({ key: trimmed.slice(0, index).trim(), value: trimmed.slice(index + 1).trim() })
    }
    return { type: 'properties', rows: rows.slice(0, 24), count: rows.length }
  }

  function parseYaml(text) {
    if (/^\s*formatVersion:\s*2\s*$/mu.test(text) && /^\s*tasks:\s*$/mu.test(text)) return parseLts(text)
    if (/^\s*packages:\s*$/mu.test(text)) return parseBuild(text)
    if (/^\s*structure:\s*$/mu.test(text) && /^\s*ref:\s*$/mu.test(text)) return parseManifest(text)
    var keys = countMatches(text, /^[A-Za-z_][A-Za-z0-9_-]*:/gmu)
    return { type: 'yaml', keys: keys }
  }

  function describe(name, text) {
    var lower = name.toLowerCase()
    if (lower.endsWith('.properties')) return parseProperties(text)
    if (lower.endsWith('.sql')) return parseSql(text)
    return parseYaml(text)
  }

  function kindLabel(summary) {
    if (summary.type === 'lts') return 'LTS 调度'
    if (summary.type === 'build') return '构建配置'
    if (summary.type === 'manifest') return '仓库映射'
    if (summary.type === 'properties') return '参数文件'
    if (summary.type === 'sql') return 'SQL'
    return 'YAML'
  }

  function Summary(props) {
    var summary = props.summary
    if (summary.type === 'lts') {
      return h('div', { className: 'do-doc-facts' },
        h('div', null, h('b', null, summary.taskCount), h('span', null, '任务')),
        h('div', null, h('b', null, summary.jobCount), h('span', null, '作业')),
        h('div', null, h('b', null, summary.placeholders.length), h('span', null, '占位符')),
        summary.taskName ? h('div', { className: 'do-doc-line' }, '任务名：' + summary.taskName + (summary.taskType ? ' · ' + summary.taskType : '')) : null,
        summary.crons.length ? h('div', { className: 'do-doc-line' }, 'cron：' + summary.crons.join('、')) : null,
        summary.taskParamNames.length ? h('div', { className: 'do-doc-line' }, '参数：' + summary.taskParamNames.join('、')) : null,
        h('div', { className: 'do-doc-types' }, Object.keys(summary.typeCounts || {}).map(function (type) {
          return h('span', { key: type, className: 'do-doc-type' }, type + ' × ' + summary.typeCounts[type])
        })))
    }
    if (summary.type === 'build') {
      return h('div', { className: 'do-doc-facts' },
        h('div', null, h('b', null, summary.packageCount), h('span', null, '包')),
        summary.toolchains.length ? h('div', { className: 'do-doc-line' }, 'toolChain：' + summary.toolchains.join('、')) : null,
        summary.packages.length ? h('div', { className: 'do-doc-line' }, '包名：' + summary.packages.join('、')) : null)
    }
    if (summary.type === 'manifest') {
      return h('div', { className: 'do-doc-facts' },
        h('div', null, h('b', null, summary.refCount), h('span', null, '平台映射')),
        summary.refs.length ? h('div', { className: 'do-doc-line' }, summary.refs.join(' · ')) : null)
    }
    if (summary.type === 'sql') {
      return h('div', { className: 'do-doc-facts' },
        h('div', null, h('b', null, summary.ddl), h('span', null, 'DDL')),
        h('div', null, h('b', null, summary.dml), h('span', null, 'DML')),
        h('div', null, h('b', null, summary.statements), h('span', null, '语句')))
    }
    if (summary.type === 'properties') {
      return h('div', { className: 'do-doc-props' }, summary.rows.map(row => h('div', { key: row.key, className: 'do-doc-prop' }, h('code', null, row.key), h('span', null, row.value))))
    }
    return h('div', { className: 'do-doc-muted' }, 'YAML / 文本 · ' + summary.keys + ' 个顶层键')
  }

  var editorStylesReady = false
  function ensureEditorStyles() {
    if (editorStylesReady || typeof document === 'undefined') return
    editorStylesReady = true
    var style = document.createElement('style')
    style.setAttribute('data-dataops-code-editor', 'true')
    style.textContent = (typeof CODEMIRROR_CSS === 'string' ? CODEMIRROR_CSS : '') + `
      .do-doc-split{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden}
      .do-doc-split .do-doc-head{flex:none}
      .do-doc-viewtabs{display:flex;gap:2px;margin-left:auto;padding:2px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.07));border-radius:6px;background:var(--dsw-alias-bg-l2,#f7f8fa)}
      .do-doc-viewtabs button{border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#8b93a2);font-size:10px;line-height:18px;padding:0 7px;border-radius:4px;cursor:pointer}
      .do-doc-viewtabs button[data-active=true]{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#171a20);box-shadow:0 1px 2px rgba(15,23,42,.06)}
      .do-doc-panes{display:grid;grid-template-columns:minmax(0,1.06fr) minmax(280px,.94fr);gap:10px;min-height:0;flex:1;margin-top:10px}
      .do-doc-preview-pane{min-width:0;overflow:auto;padding-right:2px}
      .do-doc-editor{min-width:0;min-height:0;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.07));border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);overflow:hidden}
      .do-doc-editor-head{display:flex;align-items:center;gap:6px;padding:7px 9px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.07));min-height:32px;flex:none}
      .do-doc-editor-name{font-size:10px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .do-doc-editor-kind{font-family:ui-monospace,Menlo,monospace;font-size:8px;line-height:15px;padding:0 4px;border-radius:3px;background:var(--dsw-alias-bg-l2,#f7f8fa);color:var(--dsw-alias-label-tertiary,#8b93a2)}
      .do-doc-editor-meta{font-size:8.5px;color:var(--dsw-alias-label-tertiary,#8b93a2);margin-left:auto}
      .do-doc-editor-copy{border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#8b93a2);font-size:9px;line-height:18px;padding:0 4px;cursor:pointer}
      .do-doc-editor-copy:hover{color:var(--dsw-alias-state-business-primary,#4176e6)}
      .do-doc-editor-body{flex:1;min-height:280px;overflow:auto;background:var(--dsw-alias-bg-layer-1,#fff)}
      .do-doc-editor-fallback{margin:0;padding:12px;font-family:ui-monospace,Menlo,monospace;font-size:9px;line-height:1.7;white-space:pre;color:var(--dsw-alias-label-secondary,#61666b)}
      .do-doc-editor-foot{flex:none;padding:4px 9px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.05));font-size:8px;color:var(--dsw-alias-label-quaternary,#b6bbc3)}
      .do-doc-editor .CodeMirror{height:100%;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#61666b);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9.5px;line-height:1.65}
      .do-doc-editor .CodeMirror-scroll{min-height:100%}
      .do-doc-editor .CodeMirror-gutters{background:var(--dsw-alias-bg-l2,#f7f8fa);border-right:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.05))}
      .do-doc-editor .CodeMirror-linenumber{color:var(--dsw-alias-label-quaternary,#b6bbc3);font-size:8.5px}
      .do-doc-editor .CodeMirror-cursor{border-left-color:var(--dsw-alias-state-business-primary,#4176e6)}
      .do-doc-editor .cm-keyword{color:var(--dsw-alias-state-business-primary,#4176e6)}
      .do-doc-editor .cm-string{color:var(--dsw-alias-state-success-primary,#17835c)}
      .do-doc-editor .cm-number{color:var(--dsw-alias-state-warn-primary,#9a6700)}
      .do-doc-editor .cm-atom{color:var(--dsw-alias-state-business-primary,#4176e6)}
      .do-doc-editor .cm-comment{color:var(--dsw-alias-label-quaternary,#b6bbc3)}
      .do-doc-split[data-mode=preview] .do-doc-panes{grid-template-columns:1fr}
      .do-doc-split[data-mode=preview] .do-doc-editor{display:none}
      .do-doc-split[data-mode=source] .do-doc-panes{grid-template-columns:1fr}
      .do-doc-split[data-mode=source] .do-doc-preview-pane{display:none}
      @container (max-width:760px){.do-doc-panes{grid-template-columns:1fr}.do-doc-editor{min-height:320px}}
    `
    ;(document.head || document.documentElement).appendChild(style)
  }

  function SourceEditor(props) {
    var copied = React.useState(false)
    var all = props.lines || []
    var shown = all.slice(0, 2000)
    var cmRef = { current: null }
    var canEditor = typeof ensureCodeMirrorRuntime === 'function' && typeof document !== 'undefined'
    function copy() {
      try {
        var text = cmRef.current ? cmRef.current.getValue() : all.join('\n')
        if (navigator.clipboard) navigator.clipboard.writeText(text)
        copied[1](true)
        setTimeout(function () { copied[1](false) }, 1400)
      } catch (error) { /* clipboard optional */ }
    }
    function mount(el) {
      if (props.scrollportRef) props.scrollportRef.current = el
      if (!el || !canEditor || el.getAttribute('data-editor-ready') === 'true') return
      el.setAttribute('data-editor-ready', 'true')
      ensureEditorStyles()
      try {
        var CodeMirrorRuntime = ensureCodeMirrorRuntime()
        if (typeof CodeMirrorRuntime !== 'function') return
        cmRef.current = CodeMirrorRuntime(el, {
          value: shown.join('\n'),
          mode: props.kind === 'SQL' ? 'text/x-sql' : 'text/x-yaml',
          readOnly: true,
          lineNumbers: true,
          lineWrapping: false,
          viewportMargin: Infinity,
          tabSize: 2
        })
      } catch (error) { /* the surrounding page can show the raw file */ }
    }
    return h('aside', { className: 'do-doc-editor', 'aria-label': '源码预览' },
      h('div', { className: 'do-doc-editor-head' },
        h('span', { className: 'do-doc-editor-name' }, props.name),
        h('span', { className: 'do-doc-editor-kind' }, props.kind || 'TEXT'),
        h('span', { className: 'do-doc-editor-meta' }, all.length + ' 行 · 只读'),
        h('button', { type: 'button', className: 'do-doc-editor-copy', onClick: copy }, copied[0] ? '已复制' : '复制')),
      h('div', { className: 'do-doc-editor-body', ref: mount, tabIndex: 0, role: 'textbox', 'aria-readonly': 'true', 'aria-label': props.name + ' 源码' },
        canEditor ? null : h('pre', { className: 'do-doc-editor-fallback' }, shown.join('\n')),
        all.length > 2000 ? h('div', { className: 'do-doc-muted' }, '只显示前 2000 行') : null),
      h('div', { className: 'do-doc-editor-foot' }, '只读源码 · CodeMirror 5.65 运行时'))
  }

  function Body(props) {
    var content = props.content
    var modeState = React.useState('split')
    var focusState = React.useState(false)
    var mode = modeState[0]
    if (!content || content.kind !== 'text') return null
    var text = String(content.text || '')
    var name = fileName(props.resourceAddress)
    var summary = describe(name, text)
    var all = lines(text)
    var ltsCard = null
    if (summary.type === 'lts' && LineageFlow && typeof LineageFlow.LineageSurface === 'function') {
      ltsCard = h(LineageFlow.LineageSurface, {
        initialView: 'schedule',
        schedule: {
          taskName: summary.taskName || name,
          taskType: summary.taskType || '调度任务',
          cron: summary.crons[0] || null,
          jobs: summary.jobs,
          taskParams: summary.taskParamNames,
          placeholders: summary.placeholders,
          source: name
        }
      })
    } else if (summary.type === 'lts' && Cards && typeof Cards.LineageV2Card === 'function' && summary.jobs.length) {
      var lineage = {
        kind: 'lineage', schemaVersion: 2, view: 'schedule', mode: 'planned', table: summary.taskName || name,
        schedule: {
          taskName: summary.taskName,
          taskType: summary.taskType,
          cron: summary.crons[0] || null,
          taskCount: summary.taskCount,
          jobCount: summary.jobCount,
          typeCounts: summary.typeCounts,
          jobs: summary.jobs,
          taskParams: summary.taskParamNames,
          placeholders: summary.placeholders
        },
        gaps: []
      }
      ltsCard = h(Cards.LineageV2Card, { block: { content: [{ type: 'text', text: JSON.stringify(lineage) }] }, onFocusChange: function (value) { focusState[1](value) } })
    }
    return h('div', { className: 'do-doc do-doc-split', 'data-mode': mode, 'data-focus': focusState[0] ? 'true' : undefined },
      h('div', { className: 'do-doc-head' },
        h('span', { className: 'do-doc-badge' }, kindLabel(summary)),
        h('b', { className: 'do-doc-name' }, name),
        h('span', { className: 'do-doc-meta' }, all.length + ' 行' + (content.eof === false ? ' · 持续加载' : '')),
        h('div', { className: 'do-doc-viewtabs', role: 'group', 'aria-label': '文件视图' },
          [['split', '分栏'], ['preview', '预览'], ['source', '源码']].map(function (item) {
            return h('button', { key: item[0], type: 'button', 'data-active': mode === item[0] ? 'true' : undefined, onClick: function () { modeState[1](item[0]) } }, item[1])
          }))),
      h('div', { className: 'do-doc-panes' },
        h('div', { className: 'do-doc-preview-pane' }, h('div', { className: 'do-doc-summary' }, ltsCard || h(Summary, { summary: summary }))),
        h(SourceEditor, { name: name, kind: kindLabel(summary), lines: all, scrollportRef: props.scrollportRef })))
  }

  return {
    id: ID,
    definition: {
      id: ID,
      extensions: EXTENSIONS,
      priority: 'extension',
      title: function () { return 'DataOps 代码' },
      loading: 'text-pages',
      wrap: false
    },
    Body: Body
  }
}
