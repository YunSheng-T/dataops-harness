/**
 * DataOps document preview.
 *
 * The upstream Files tab owns browsing and file opening. This renderer claims
 * code/config suffixes and gives DataOps files their own structure summary:
 * LTS tasks/jobs, build packages, manifest refs, SQL blocks, properties.
 */
export function createDataopsDocumentPreview(React) {
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
      return { name: entry.name, type: type, parents: parents, paramKind: type === 'tskdep' ? 'dependency' : type === 'group' ? 'group' : type === 'open_gauss' || type === 'libra' ? 'database' : type === 'url' ? 'http' : 'script' }
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
    while ((match = cronRe.exec(text))) crons.push(match[1].trim())
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

  function Dag(props) {
    var jobs = props.jobs || []
    var taskName = props.taskName || 'task'
    if (!jobs.length) return null
    var nodes = [{ id: '__start', label: '开始', type: 'start', parents: [] }].concat(jobs.map(function (job) {
      return { id: job.name, label: job.name, type: job.type, parents: job.parents || [] }
    }))
    var names = {}
    nodes.forEach(function (node) { names[node.id] = node })
    var levels = {}
    nodes.forEach(function (node) { levels[node.id] = 0 })
    for (var pass = 0; pass < nodes.length; pass++) {
      nodes.forEach(function (node) {
        (node.parents || []).forEach(function (parent) {
          if (names[parent]) levels[node.id] = Math.max(levels[node.id], (levels[parent] || 0) + 1)
        })
      })
    }
    var groups = {}
    nodes.forEach(function (node) {
      var level = levels[node.id] || 0
      if (!groups[level]) groups[level] = []
      groups[level].push(node)
    })
    var levelKeys = Object.keys(groups).map(Number).sort(function (a, b) { return a - b })
    var cols = ['开始', '前置', '并行', '加工', '汇聚', '通知']
    var NODE_W = 148, NODE_H = 42, COL_GAP = 18, ROW_GAP = 18, LEFT = 18, TOP = 34
    var positions = {}
    var maxRows = 1
    nodes.forEach(function (node) {
      var level = levels[node.id] || 0
      var same = groups[String(level)] || []
      var row = same.indexOf(node)
      maxRows = Math.max(maxRows, same.length)
      positions[node.id] = { x: LEFT + level * (NODE_W + COL_GAP), y: TOP + row * (NODE_H + ROW_GAP), level: level, node: node }
    })
    var height = Math.max(220, TOP + maxRows * (NODE_H + ROW_GAP) + 18)
    var marker = 'do-doc-dag-arrow'
    function truncate(value, n) { var text = String(value || ''); return text.length > n ? text.slice(0, n - 1) + '…' : text }
    function nodeView(node) {
      var p = positions[node.id]
      return h('g', { key: node.id, className: 'do-graph-v2-node do-doc-dag-node', transform: 'translate(' + p.x + ',' + p.y + ')', 'data-kind': node.type },
        h('rect', { width: NODE_W, height: NODE_H, rx: 8 }),
        h('text', { x: 10, y: 17, className: 'do-graph-v2-label' }, truncate(node.label, 21)),
        h('text', { x: 10, y: 31, className: 'do-graph-v2-meta' }, truncate(node.type === 'start' ? 'task start' : node.type, 26)))
    }
    function edgeView(edge) {
      var a = positions[edge.from], b = positions[edge.to]
      if (!a || !b) return null
      var x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2
      var mid = (x1 + x2) / 2
      return h('path', { key: edge.from + '>' + edge.to, className: 'do-graph-v2-edge', 'marker-end': 'url(#' + marker + ')', d: 'M ' + x1 + ' ' + y1 + ' C ' + mid + ' ' + y1 + ' ' + mid + ' ' + y2 + ' ' + x2 + ' ' + y2 })
    }
    var edges = []
    nodes.forEach(function (node) {
      if (node.id === '__start') return
      var parents = (node.parents || []).filter(function (parent) { return names[parent] })
      if (!parents.length) parents = ['__start']
      parents.forEach(function (parent) { edges.push({ from: parent, to: node.id }) })
    })
    var width = Math.max(900, levelKeys.length * (NODE_W + COL_GAP) + LEFT * 2)
    return h('div', { className: 'do-doc-graph' },
      h('div', { className: 'do-doc-graph-head' },
        h('span', { className: 'do-doc-graph-title' }, '调度血缘'),
        h('span', { className: 'do-doc-graph-task' }, taskName),
        h('span', { className: 'do-doc-graph-meta' }, nodes.length + ' 节点 · ' + edges.length + ' 依赖')),
      h('div', { className: 'do-graph-v2-scroll' },
        h('svg', { viewBox: '0 0 ' + width + ' ' + height, className: 'do-graph-v2-svg', role: 'img', 'aria-label': '调度血缘图' },
          h('defs', null, h('marker', { id: marker, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', className: 'do-graph-v2-arrow' }))),
          cols.slice(0, levelKeys.length).map(function (label, index) {
            return h('text', { key: label, x: LEFT + index * (NODE_W + COL_GAP), y: 17, className: 'do-graph-v2-col-label' }, label)
          }),
          edges.map(edgeView),
          nodes.map(nodeView))),
      h('div', { className: 'do-graph-v2-legend' },
        h('span', null, h('i', { className: 'do-legend-line' }), '实线 = 依赖'),
        h('span', null, h('i', { className: 'do-legend-dot' }), '节点 = 作业'),
        h('span', null, '按 jobType 着色')))
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
        })),
        summary.jobs.length ? h(Dag, { jobs: summary.jobs, taskName: summary.taskName }) : null)
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

  function Body(props) {
    var content = props.content
    var showSource = React.useState(false)
    if (!content || content.kind !== 'text') return null
    var text = String(content.text || '')
    var name = fileName(props.resourceAddress)
    var summary = describe(name, text)
    var all = lines(text)
    var max = 2000
    var source = all.slice(0, max).join('\n')
    return h('div', { className: 'do-doc', ref: props.scrollportRef },
      h('div', { className: 'do-doc-head' },
        h('span', { className: 'do-doc-badge' }, kindLabel(summary)),
        h('b', { className: 'do-doc-name' }, name),
        h('span', { className: 'do-doc-meta' }, all.length + ' 行' + (content.eof === false ? ' · 持续加载' : '')),
        h('button', { type: 'button', className: 'do-doc-toggle', onClick: function () { showSource[1](!showSource[0]) } }, showSource[0] ? '收起源码' : '查看源码')),
      h('div', { className: 'do-doc-summary' }, h(Summary, { summary: summary })),
      showSource[0] ? h('div', { className: 'do-doc-source-wrap' },
        h('pre', { className: 'do-doc-source' }, source),
        all.length > max ? h('div', { className: 'do-doc-muted' }, '只显示前 ' + max + ' 行') : null) : null)
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
