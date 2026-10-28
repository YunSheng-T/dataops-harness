/**
 * File adapter for workitems (P2.2).
 *
 * The public contract is deliberately narrow: read one workitem or list them,
 * and apply a validated patch. The YAML here is the human-readable workitem
 * format, not an arbitrary YAML service; unknown keys still round-trip through
 * the parser/serializer.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

export const STAGES = ['requirement', 'design', 'scheme', 'develop', 'cicd', 'review']
const STAGE_STATUSES = ['pending', 'in_progress', 'blocked', 'awaiting_approval', 'done']
const WORK_STATUSES = ['draft', 'planning', 'executing', 'review', 'approved', 'applied', 'verified', 'abandoned']
const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'blocked']
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const SAFE_PATH = /^(?:deliverables|artifacts|evidence)\/[A-Za-z0-9][A-Za-z0-9._\/-]*$/

function stamp() {
  // Workitems are user-facing records in the local DataOps timezone.
  const local = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return local.toISOString().replace('T', ' ').slice(0, 16) + '+08:00'
}

function indentOf(line) {
  return line.length - line.trimStart().length
}

function stripComment(line) {
  let quote = ''
  let depth = 0
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quote) {
      if (c === '\\') { i++; continue }
      if (c === quote) quote = ''
      continue
    }
    if (c === '"' || c === "'") { quote = c; continue }
    if (c === '{' || c === '[') { depth++; continue }
    if (c === '}' || c === ']') { depth = Math.max(0, depth - 1); continue }
    if (c === '#' && depth === 0 && (i === 0 || /\s/.test(line[i - 1])) && (i + 1 === line.length || /\s/.test(line[i + 1]))) return line.slice(0, i)
  }
  return line
}

function splitTop(value, separator) {
  const parts = []
  let quote = ''
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (quote) {
      if (c === '\\') { i++; continue }
      if (c === quote) quote = ''
      continue
    }
    if (c === '"' || c === "'") { quote = c; continue }
    if (c === '{' || c === '[') { depth++; continue }
    if (c === '}' || c === ']') { depth--; continue }
    if (c === separator && depth === 0) {
      parts.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(value.slice(start).trim())
  return parts
}

function topLevelColon(value) {
  let quote = ''
  let depth = 0
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (quote) {
      if (c === '\\') { i++; continue }
      if (c === quote) quote = ''
      continue
    }
    if (c === '"' || c === "'") { quote = c; continue }
    if (c === '{' || c === '[') { depth++; continue }
    if (c === '}' || c === ']') { depth--; continue }
    if (c === ':' && depth === 0) return i
  }
  return -1
}

function scalar(value) {
  const text = String(value).trim()
  if (!text) return null
  if (text.startsWith('{') && text.endsWith('}')) {
    try { return JSON.parse(text) } catch { /* fall through to flow parser */ }
    const result = {}
    const inner = text.slice(1, -1).trim()
    if (!inner) return result
    for (const part of splitTop(inner, ',')) {
      const colon = topLevelColon(part)
      if (colon <= 0) throw new Error('workitem YAML: invalid inline map entry ' + part)
      result[unquote(part.slice(0, colon).trim())] = scalar(part.slice(colon + 1))
    }
    return result
  }
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim()
    return inner ? splitTop(inner, ',').map(scalar) : []
  }
  if (text.startsWith('"')) {
    try { return JSON.parse(text) } catch { return text.slice(1, -1) }
  }
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1).replace(/''/g, "'")
  if (text === 'null' || text === '~') return null
  if (text === 'true') return true
  if (text === 'false') return false
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text)
  return text
}

function unquote(key) {
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) return scalar(key)
  return key
}

export function parseWorkitem(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/)
    .map(line => ({ indent: indentOf(line), text: stripComment(line).trim() }))
    .filter(line => line.text.trim() !== '')
  let index = 0

  function parseBlock(indent) {
    if (index >= lines.length || lines[index].indent < indent) return null
    if (lines[index].indent > indent) throw new Error('workitem YAML: unexpected indentation at line ' + (index + 1))
    return lines[index].text.startsWith('- ') || lines[index].text === '-' ? parseSequence(indent) : parseMap(indent)
  }

  function parseMap(indent) {
    const result = {}
    while (index < lines.length && lines[index].indent === indent && !lines[index].text.startsWith('- ') && lines[index].text !== '-') {
      const line = lines[index]
      const colon = topLevelColon(line.text)
      if (colon <= 0) throw new Error('workitem YAML: expected key: value at line ' + (index + 1) + ' text=' + JSON.stringify(line.text))
      const key = unquote(line.text.slice(0, colon).trim())
      const rest = line.text.slice(colon + 1).trim()
      index++
      if (rest !== '') {
        result[key] = scalar(rest)
        continue
      }
      if (index < lines.length && lines[index].indent > indent) result[key] = parseBlock(lines[index].indent)
      else result[key] = null
    }
    return result
  }

  function parseSequence(indent) {
    const result = []
    while (index < lines.length && lines[index].indent === indent && (lines[index].text.startsWith('- ') || lines[index].text === '-')) {
      const line = lines[index]
      const rest = line.text === '-' ? '' : line.text.slice(2).trim()
      index++
      if (rest === '') {
        if (index < lines.length && lines[index].indent > indent) result.push(parseBlock(lines[index].indent))
        else result.push(null)
        continue
      }
      if (rest.startsWith('{') || rest.startsWith('[') || rest.startsWith('"') || rest.startsWith("'")) {
        result.push(scalar(rest))
        continue
      }
      const colon = topLevelColon(rest)
      if (colon <= 0 || (colon < rest.length - 1 && !/\s/.test(rest.charAt(colon + 1)))) {
        result.push(scalar(rest))
        continue
      }
      const item = {}
      const key = unquote(rest.slice(0, colon).trim())
      const value = rest.slice(colon + 1).trim()
      if (value !== '') item[key] = scalar(value)
      else if (index < lines.length && lines[index].indent > indent) item[key] = parseBlock(lines[index].indent)
      else item[key] = null
      if (index < lines.length && lines[index].indent > indent) {
        const continuation = parseBlock(lines[index].indent)
        if (continuation && typeof continuation === 'object' && !Array.isArray(continuation)) Object.assign(item, continuation)
      }
      result.push(item)
    }
    return result
  }

  const parsed = parseBlock(0)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
}

function quoteString(value) {
  return JSON.stringify(String(value))
}

function plainString(value) {
  const text = String(value)
  if (text === '' || /^\s|\s$/.test(text) || /[\n\r\t]/.test(text)) return null
  if (/^[!&*?,\[\]{}#|>@`"'%-]/.test(text)) return null
  if (/:\s|\s#/.test(text)) return null
  if (/^(?:true|false|null|~)$/i.test(text)) return null
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return null
  return text
}

function serializeValue(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.length ? null : '[]'
  if (typeof value === 'object') return null
  const plain = plainString(value)
  return plain === null ? quoteString(value) : plain
}

function keyText(key) {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(key) ? key : quoteString(key)
}

function serializeNode(value, indent = 0) {
  const pad = ' '.repeat(indent)
  if (Array.isArray(value)) {
    if (value.length === 0) return pad + '[]\n'
    let out = ''
    for (const item of value) {
      if (Array.isArray(item)) {
        out += pad + '-\n' + serializeNode(item, indent + 2)
        continue
      }
      if (item && typeof item === 'object') {
        const entries = Object.entries(item)
        if (entries.length === 0) { out += pad + '- {}\n'; continue }
        const [firstKey, firstValue] = entries[0]
        if (serializeValue(firstValue) !== null) out += pad + '- ' + keyText(firstKey) + ': ' + serializeValue(firstValue) + '\n'
        else out += pad + '- ' + keyText(firstKey) + ':\n' + serializeNode(firstValue, indent + 4)
        for (const [key, child] of entries.slice(1)) {
          const scalar = serializeValue(child)
          if (scalar !== null) out += pad + '  ' + keyText(key) + ': ' + scalar + '\n'
          else out += pad + '  ' + keyText(key) + ':\n' + serializeNode(child, indent + 4)
        }
        continue
      }
      out += pad + '- ' + serializeValue(item) + '\n'
    }
    return out
  }
  if (value && typeof value === 'object') {
    let out = ''
    for (const [key, child] of Object.entries(value)) {
      const scalar = serializeValue(child)
      if (scalar !== null) out += pad + keyText(key) + ': ' + scalar + '\n'
      else out += pad + keyText(key) + ':\n' + serializeNode(child, indent + 2)
    }
    return out
  }
  return pad + serializeValue(value) + '\n'
}

export function serializeWorkitem(item) {
  return serializeNode(item, 0)
}

function localNow() {
  const local = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return local.toISOString().replace('T', ' ').slice(0, 16) + '+08:00'
}

function slugify(value) {
  return String(value || 'workitem').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'workitem'
}

function rootDir(config) {
  return resolve(process.cwd(), config.workitemsDir || 'workitems')
}

function itemDir(root, id) {
  if (typeof id !== 'string' || !SAFE_ID.test(id) || id === '.' || id === '..') {
    throw new Error('workitem: invalid id ' + JSON.stringify(id))
  }
  const dir = resolve(root, id)
  if (!dir.startsWith(root + sep)) throw new Error('workitem: id escapes workitems directory')
  return dir
}

function itemPath(root, id) {
  return join(itemDir(root, id), 'item.yaml')
}

function normalize(item, id) {
  const stages = {}
  const rawStages = item.stages && typeof item.stages === 'object' ? item.stages : {}
  for (const stage of STAGES) {
    const raw = rawStages[stage] && typeof rawStages[stage] === 'object' ? rawStages[stage] : {}
    stages[stage] = {
      status: raw.status || 'pending',
      ...(raw.substage !== undefined ? { substage: raw.substage } : {}),
      deliverable: raw.deliverable !== undefined ? raw.deliverable : (raw.artifact !== undefined ? raw.artifact : null)
    }
  }
  const deliverables = Array.isArray(item.deliverables)
    ? item.deliverables
    : (Array.isArray(item.artifacts) ? item.artifacts : [])
  return {
    ...item,
    id: item.id || id,
    stages,
    deliverables,
    artifacts: undefined,
    schema: 'deliverable',
    legacy: Array.isArray(item.artifacts) && !Array.isArray(item.deliverables)
  }
}

function readRaw(root, id) {
  const path = itemPath(root, id)
  if (!existsSync(path)) throw new Error('workitem: not found ' + id + ' (expected ' + path + ')')
  return parseWorkitem(readFileSync(path, 'utf8'))
}

function publicItem(raw, id) {
  const item = normalize(raw, id)
  return {
    kind: 'workitem',
    id: item.id,
    title: item.title,
    type: item.type,
    status: item.status,
    stage: item.stage,
    substage: item.substage || null,
    owner: item.owner || null,
    source: item.source || null,
    updated_at: item.updated_at || null,
    stages: item.stages,
    deliverables: item.deliverables,
    evidence: Array.isArray(item.evidence) ? item.evidence : [],
    gaps: Array.isArray(item.gaps) ? item.gaps : [],
    approvals: Array.isArray(item.approvals) ? item.approvals : [],
    next: item.next || null,
    legacy: item.legacy
  }
}

export function findWorkitemBySource(config, source) {
  if (!source || !source.system || !source.id) return null
  const root = rootDir(config)
  if (!existsSync(root)) return null
  for (const id of readdirSync(root)) {
    if (!SAFE_ID.test(id) || id === '_template') continue
    try {
      const raw = readRaw(root, id)
      if (raw.source && raw.source.system === source.system && raw.source.id === source.id) return publicItem(raw, id)
    } catch { /* ignore malformed workitems */ }
  }
  return null
}

export function ensureWorkitem(config, args) {
  const source = args && args.source
  if (!source || typeof source !== 'object' || typeof source.system !== 'string' || typeof source.id !== 'string') {
    throw new Error('workitem: source.system and source.id are required')
  }
  const existing = findWorkitemBySource(config, source)
  if (existing) return { kind: 'workitem', created: false, workitem: existing, source }

  const slug = slugify(args.title) || slugify(source.id)
  const id = args.id || `${new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)}-${slug}`
  const root = rootDir(config)
  const dir = itemDir(root, id)
  if (existsSync(join(dir, 'item.yaml'))) throw new Error('workitem: already exists ' + id)
  mkdirSync(join(dir, 'deliverables'), { recursive: true })
  for (const stage of STAGES) mkdirSync(join(dir, 'deliverables', stage), { recursive: true })
  mkdirSync(join(dir, 'evidence'), { recursive: true })
  const stage = STAGES.includes(args.initialStage) ? args.initialStage : 'requirement'
  const approvals = ['requirement', 'design', 'scheme.analysis', 'scheme.solution', 'scheme.tech_plan', 'develop.code_review', 'develop.merge'].map(gate => ({
    gate, status: 'pending', signoffs: []
  }))
  const item = {
    id,
    title: args.title || source.id,
    type: 'delivery',
    status: 'planning',
    stage,
    substage: null,
    owner: args.owner || 'BA',
    requester: args.requester || null,
    created_at: stamp(),
    updated_at: stamp(),
    mock: true,
    source,
    assets: Array.isArray(args.assets) ? args.assets : [],
    acceptance: Array.isArray(args.acceptance) ? args.acceptance : [],
    stages: Object.fromEntries(STAGES.map(key => [key, {
      status: key === stage ? 'in_progress' : 'pending',
      ...(key === 'scheme' ? { substage: null } : {}),
      deliverable: null
    }])),
    deliverables: [],
    evidence: [],
    gaps: Array.isArray(args.gaps) ? args.gaps : [],
    approvals,
    next: args.next || '需求阶段：确认目标、范围、验收、owner'
  }
  const path = join(dir, 'item.yaml')
  writeFileSync(path, serializeWorkitem(item), 'utf8')
  writeFileSync(join(dir, 'intent.md'), `# Intent\n\n${source.id} · ${item.title}\n\n来源：${source.system}/${source.id}\n`, 'utf8')
  writeFileSync(join(dir, 'plan.md'), `# Plan\n\n## 阶段\n\n- [ ] 需求\n- [ ] 设计\n- [ ] 方案\n- [ ] 开发\n- [ ] CICD\n- [ ] 复盘\n\n## 日志\n\n- ${stamp()} · 接单 · ${source.system}/${source.id} · 创建 workitem\n`, 'utf8')
  writeFileSync(join(dir, 'decision.md'), '# Decision\n\n> 签收记录由 UI 动作写入；Agent 不自签。\n', 'utf8')
  return { kind: 'workitem', created: true, workitem: publicItem(item, id), source }
}

export function listWorkitems(config) {
  const root = rootDir(config)
  if (!existsSync(root)) return []
  return readdirSync(root)
    .filter(id => SAFE_ID.test(id) && id !== '_template')
    .filter(id => existsSync(join(root, id, 'item.yaml')))
    .slice(0, 50)
    .map(id => {
      try {
        const item = normalize(readRaw(root, id), id)
        return { id, title: item.title, stage: item.stage, status: item.status, updated_at: item.updated_at || null }
      } catch { return null }
    })
    .filter(Boolean)
}

export function readWorkitem(config, args) {
  const root = rootDir(config)
  const id = args && args.id
  if (!id) {
    return { kind: 'workitem-list', items: listWorkitems(config) }
  }
  return publicItem(readRaw(root, id), id)
}

function validatePathArray(value, name) {
  if (!Array.isArray(value)) throw new Error('workitem: ' + name + ' must be an array')
  for (const path of value) {
    if (typeof path !== 'string' || !SAFE_PATH.test(path) || path.includes('..')) {
      throw new Error('workitem: ' + name + ' contains an unsafe path ' + JSON.stringify(path))
    }
  }
}

function validatePatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('workitem: patch must be an object')
  const allowed = new Set(['stage', 'substage', 'status', 'stages', 'next', 'gaps', 'approvals', 'deliverables', 'evidence'])
  for (const key of Object.keys(patch)) {
    if (!allowed.has(key)) throw new Error('workitem: unsupported patch field ' + key)
  }
  if (patch.stage !== undefined && !STAGES.includes(patch.stage)) throw new Error('workitem: invalid stage ' + patch.stage)
  if (patch.status !== undefined && !WORK_STATUSES.includes(patch.status)) throw new Error('workitem: invalid status ' + patch.status)
  if (patch.next !== undefined && patch.next !== null && typeof patch.next !== 'string') throw new Error('workitem: next must be a string')
  if (patch.deliverables !== undefined) validatePathArray(patch.deliverables, 'deliverables')
  if (patch.evidence !== undefined) validatePathArray(patch.evidence, 'evidence')
  if (patch.gaps !== undefined && !Array.isArray(patch.gaps)) throw new Error('workitem: gaps must be an array')
  if (patch.approvals !== undefined) {
    if (!Array.isArray(patch.approvals)) throw new Error('workitem: approvals must be an array')
    for (const approval of patch.approvals) {
      if (!approval || typeof approval !== 'object' || typeof approval.gate !== 'string') throw new Error('workitem: approval needs gate')
      if (approval.status && !APPROVAL_STATUSES.includes(approval.status)) throw new Error('workitem: invalid approval status ' + approval.status)
      if (approval.signoffs !== undefined) {
        if (!Array.isArray(approval.signoffs)) throw new Error('workitem: approval signoffs must be an array')
        for (const signoff of approval.signoffs) {
          if (!signoff || typeof signoff !== 'object' || typeof signoff.role !== 'string') throw new Error('workitem: signoff needs role')
          if (signoff.via !== 'ui' || typeof signoff.actionId !== 'string' || !/^ui-[a-z0-9-]+$/i.test(signoff.actionId)) throw new Error('workitem: signoff must come from a UI action')
        }
      }
    }
  }
  if (patch.stages !== undefined) {
    if (!patch.stages || typeof patch.stages !== 'object' || Array.isArray(patch.stages)) throw new Error('workitem: stages must be an object')
    for (const [stage, value] of Object.entries(patch.stages)) {
      if (!STAGES.includes(stage)) throw new Error('workitem: invalid stage key ' + stage)
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('workitem: stage ' + stage + ' must be an object')
      if (value.status !== undefined && !STAGE_STATUSES.includes(value.status)) throw new Error('workitem: invalid stage status ' + value.status)
      if (value.artifact !== undefined && value.deliverable === undefined) value.deliverable = value.artifact
      if (value.deliverable !== undefined && value.deliverable !== null) {
        if (typeof value.deliverable !== 'string' || !SAFE_PATH.test(value.deliverable) || value.deliverable.includes('..')) throw new Error('workitem: unsafe stage deliverable')
      }
    }
  }
}

function approvedGates(raw) {
  const set = new Set()
  for (const approval of raw.approvals || []) {
    if (approval && approval.status === 'approved') set.add(approval.gate)
  }
  return set
}

function validateStageAdvance(raw, patch) {
  if (!raw.source || raw.source.system !== 'edevops') return
  const gates = approvedGates({ ...raw, approvals: patch.approvals || raw.approvals })
  const stage = patch.stage || raw.stage
  const substage = patch.substage !== undefined ? patch.substage : raw.substage
  if (stage === 'design' && !gates.has('requirement')) throw new Error('workitem: requirement gate is not approved')
  if (stage === 'scheme' && !gates.has('design')) throw new Error('workitem: design gate is not approved')
  if (stage === 'scheme' && substage === 'solution' && !gates.has('scheme.analysis')) throw new Error('workitem: scheme.analysis gate is not approved')
  if (stage === 'scheme' && substage === 'tech_plan' && !gates.has('scheme.solution')) throw new Error('workitem: scheme.solution gate is not approved')
  if (stage === 'scheme' && patch.stages && patch.stages.scheme && patch.stages.scheme.status === 'done' && !gates.has('scheme.tech_plan')) throw new Error('workitem: scheme.tech_plan gate is not approved')
  if (stage === 'develop' && !gates.has('scheme.tech_plan')) throw new Error('workitem: scheme.tech_plan gate is not approved')
  if (stage === 'cicd' && !gates.has('develop.merge')) throw new Error('workitem: develop.merge gate is not approved')
}

function applyPatch(raw, patch) {
  const next = { ...raw }
  for (const key of ['stage', 'substage', 'status', 'next', 'gaps', 'approvals', 'deliverables', 'evidence']) {
    if (patch[key] !== undefined) next[key] = patch[key]
  }
  if (patch.stages !== undefined) {
    next.stages = { ...(next.stages || {}) }
    for (const [stage, value] of Object.entries(patch.stages)) {
      const { artifact, ...clean } = value
      next.stages[stage] = { ...(next.stages[stage] || {}), ...clean }
      if (clean.deliverable !== undefined && clean.deliverable !== null) next.stages[stage].deliverable = clean.deliverable
      delete next.stages[stage].artifact
    }
  }
  // New writes use deliverables; legacy artifacts are read once and converted.
  if (Array.isArray(next.artifacts) && !Array.isArray(next.deliverables)) next.deliverables = next.artifacts
  delete next.artifacts
  for (const stage of STAGES) {
    if (next.stages && next.stages[stage]) {
      if (next.stages[stage].artifact !== undefined && next.stages[stage].deliverable === undefined) next.stages[stage].deliverable = next.stages[stage].artifact
      delete next.stages[stage].artifact
    }
  }
  return next
}

function planLine(patch) {
  const parts = []
  if (patch.status) parts.push('status=' + patch.status)
  if (patch.stage) parts.push('stage=' + patch.stage)
  if (patch.substage) parts.push('substage=' + patch.substage)
  if (patch.next) parts.push('next=' + patch.next)
  if (patch.deliverables) parts.push('deliverables=' + patch.deliverables.length)
  if (patch.gaps) parts.push('gaps=' + patch.gaps.length)
  return '- ' + stamp() + ' · 工作项更新 · ' + (parts.join(' · ') || 'patch') + ' · via dataops_shared_update_workitem\n'
}

export function updateWorkitem(config, args) {
  const id = args && args.id
  if (!id) throw new Error('workitem: id is required')
  const root = rootDir(config)
  const dir = itemDir(root, id)
  const raw = readRaw(root, id)
  validatePatch(args.patch)
  validateStageAdvance(raw, args.patch)
  const next = applyPatch(raw, args.patch)
  next.updated_at = stamp()
  const normalized = normalize(next, id)
  const planPath = join(dir, 'plan.md')
  const entry = planLine(args.patch)
  if (args.dryRun === true) {
    return { ...publicItem(next, id), dryRun: true, previewPlanEntry: entry }
  }
  const path = itemPath(root, id)
  const temp = path + '.tmp-' + process.pid
  writeFileSync(temp, serializeWorkitem(next), 'utf8')
  renameSync(temp, path)
  if (existsSync(planPath)) appendFileSync(planPath, entry, 'utf8')
  else writeFileSync(planPath, '# Plan\n\n## 日志\n\n' + entry, 'utf8')
  return publicItem(next, id)
}

export const STAGE_KINDS = {
  intake: 'requirement',
  requirement: 'requirement',
  design: 'design',
  analysis: 'scheme',
  solution: 'scheme',
  tech_plan: 'scheme',
  develop: 'develop',
  cicd: 'cicd',
  postmortem: 'review',
  incident: 'incident'
}
export const GATE_ROLES = {
  requirement: ['BA', 'requester'],
  design: ['BA'],
  'scheme.analysis': ['BA'],
  'scheme.solution': ['BA'],
  'scheme.tech_plan': ['SE'],
  'develop.code_review': ['SE'],
  'develop.merge': ['Committer']
}

function writeItem(dir, raw, config, planText) {
  const path = join(dir, 'item.yaml')
  const temp = path + '.tmp-' + process.pid
  writeFileSync(temp, serializeWorkitem(raw), 'utf8')
  renameSync(temp, path)
  if (planText) {
    const planPath = join(dir, 'plan.md')
    const line = '- ' + stamp() + ' · ' + planText + '\n'
    if (existsSync(planPath)) appendFileSync(planPath, line, 'utf8')
    else writeFileSync(planPath, '# Plan\n\n## 日志\n\n' + line, 'utf8')
  }
}

function approvedGateSet(raw) {
  const set = new Set()
  for (const approval of raw.approvals || []) if (approval && approval.status === 'approved') set.add(approval.gate)
  return set
}

function ensureStageAllowed(raw, stage, substage) {
  if (!raw.source || raw.source.system !== 'edevops') return
  const gates = approvedGateSet(raw)
  if (stage === 'design' && !gates.has('requirement')) throw new Error('stage: requirement gate is not approved')
  if (stage === 'scheme' && !gates.has('design')) throw new Error('stage: design gate is not approved')
  if (stage === 'scheme' && substage === 'solution' && !gates.has('scheme.analysis')) throw new Error('stage: scheme.analysis gate is not approved')
  if (stage === 'scheme' && substage === 'tech_plan' && !gates.has('scheme.solution')) throw new Error('stage: scheme.solution gate is not approved')
  if (stage === 'develop' && !gates.has('scheme.tech_plan')) throw new Error('stage: scheme.tech_plan gate is not approved')
  if (stage === 'cicd' && !gates.has('develop.merge')) throw new Error('stage: develop.merge gate is not approved')
}

export function stagePrepare(config, args) {
  const id = args && args.id
  if (!id) throw new Error('stage: id is required')
  const kind = args.kind
  const stage = args.stage || STAGE_KINDS[kind]
  if (!STAGE_KINDS[kind] || STAGE_KINDS[kind] !== stage) throw new Error('stage: kind/stage mismatch')
  const deliverable = args.deliverable
  if (typeof deliverable !== 'string' || !SAFE_PATH.test(deliverable) || deliverable.includes('..')) throw new Error('stage: unsafe deliverable path')
  if (!args.payload || typeof args.payload !== 'object' || Array.isArray(args.payload)) throw new Error('stage: payload must be an object')
  const root = rootDir(config)
  const dir = itemDir(root, id)
  const raw = readRaw(root, id)
  ensureStageAllowed(raw, stage, args.substage)
  const full = join(dir, deliverable)
  mkdirSync(dirname(full), { recursive: true })
  const file = { ...args.payload, kind, stage, ...(args.substage ? { substage: args.substage } : {}), deliverable, status: args.status || args.payload.status || 'draft' }
  writeFileSync(full, serializeWorkitem(file), 'utf8')
  raw.stages = raw.stages && typeof raw.stages === 'object' ? raw.stages : {}
  raw.stages[stage] = raw.stages[stage] || {}
  raw.stages[stage].status = 'in_progress'
  raw.stages[stage].deliverable = deliverable
  if (stage === 'scheme' && args.substage) raw.stages[stage].substage = args.substage
  raw.deliverables = Array.isArray(raw.deliverables) ? raw.deliverables : []
  if (!raw.deliverables.includes(deliverable)) raw.deliverables.push(deliverable)
  if (Array.isArray(args.gaps)) raw.gaps = args.gaps
  if (args.next) raw.next = args.next
  raw.updated_at = stamp()
  writeItem(dir, raw, config, `stage prepare · ${stage}${args.substage ? '/' + args.substage : ''} · ${deliverable}`)
  return { ...file, workitemId: id, prepared: true, workitemStage: raw.stage }
}

function advanceAfterSignoff(raw, gate) {
  raw.stages = raw.stages && typeof raw.stages === 'object' ? raw.stages : {}
  const stage = stage => {
    raw.stages[stage] = raw.stages[stage] || {}
    return raw.stages[stage]
  }
  if (gate === 'requirement') {
    stage('requirement').status = 'done'
    raw.stage = 'design'
    stage('design').status = 'in_progress'
    raw.next = '设计阶段：DataMap 寻源 + 字段/粒度/口径 + BA 签收'
    return 'design'
  }
  if (gate === 'design') {
    stage('design').status = 'done'
    raw.stage = 'scheme'
    stage('scheme').status = 'in_progress'
    stage('scheme').substage = 'analysis'
    raw.next = '3a 分析：数据挖掘/基线/候选；blocking=0 才可 pass'
    return 'scheme.analysis'
  }
  if (gate === 'scheme.analysis') {
    stage('scheme').substage = 'solution'
    raw.next = '3b 需求方案：选择/备选/tradeoff + BA 签收'
    return 'scheme.solution'
  }
  if (gate === 'scheme.solution') {
    stage('scheme').substage = 'tech_plan'
    raw.next = '3c 技术方案：任务/依赖/SLA/回滚 + 一层设计血缘 + SE 签收'
    return 'scheme.tech_plan'
  }
  if (gate === 'scheme.tech_plan') {
    stage('scheme').status = 'done'
    raw.stage = 'develop'
    stage('develop').status = 'in_progress'
    raw.next = '开发验证：生成多产物，Build → Scan → Deploy → Test 回流，SE 评审 + Committer 合入'
    return 'develop'
  }
  if (gate === 'develop.code_review') {
    stage('develop').status = 'awaiting_merge'
    raw.next = 'SE 评审通过；等待 Committer 外部合入，合入后才进 CICD'
    return null
  }
  if (gate === 'develop.merge') {
    stage('develop').status = 'done'
    raw.stage = 'cicd'
    stage('cicd').status = 'in_progress'
    raw.next = '触发一条数据 CICD pipeline；产物是制品包 + manifest/checksum + 外部环境只读状态'
    return 'cicd'
  }
  return null
}

export function stageSignoff(config, args) {
  const id = args && args.id
  if (!id) throw new Error('stage: id is required')
  const gate = args.gate
  const requestedRole = String(args.role || '')
  const role = ({ ba: 'BA', requester: 'requester', se: 'SE', committer: 'Committer', dev: 'Dev' })[requestedRole] || requestedRole
  const roles = GATE_ROLES[gate]
  if (!roles) throw new Error('stage: unknown gate ' + gate)
  if (!roles.includes(role)) throw new Error('stage: role ' + role + ' cannot sign ' + gate)
  if (args.via !== 'ui' || typeof args.actionId !== 'string' || !/^ui-[a-z0-9-]+$/i.test(args.actionId)) throw new Error('stage: signoff must come from a UI action')
  const root = rootDir(config)
  const dir = itemDir(root, id)
  const raw = readRaw(root, id)
  const current = raw.stage
  const substage = raw.substage || (raw.stages && raw.stages.scheme && raw.stages.scheme.substage)
  const allowed = gate === 'requirement' ? current === 'requirement'
    : gate === 'design' ? current === 'design'
    : gate === 'scheme.analysis' ? current === 'scheme' && substage === 'analysis'
    : gate === 'scheme.solution' ? current === 'scheme' && substage === 'solution'
    : gate === 'scheme.tech_plan' ? current === 'scheme' && substage === 'tech_plan'
    : gate === 'develop.code_review' ? current === 'develop'
    : gate === 'develop.merge' ? current === 'develop'
    : false
  if (!allowed) throw new Error('stage: ' + gate + ' is not the current stage gate')
  if (gate === 'develop.merge') {
    const review = (raw.approvals || []).find(a => a && a.gate === 'develop.code_review')
    if (!review || review.status !== 'approved') throw new Error('stage: develop.code_review must be approved before merge')
  }
  const stageKey = gate.startsWith('scheme.') ? 'scheme' : gate.startsWith('develop.') ? 'develop' : gate
  const pointer = raw.stages && raw.stages[stageKey] && raw.stages[stageKey].deliverable
  if (gate === 'develop.merge' && pointer) {
    const file = parseWorkitem(readFileSync(join(dir, pointer), 'utf8'))
    const validation = file.validation || {}
    if (!validation.build || validation.build.status !== 'passed') throw new Error('stage: develop build must pass before Committer merge')
    if (validation.scan && (validation.scan.status === 'failed' || (validation.scan.blocking || []).length)) throw new Error('stage: develop scan has blocking findings')
  }
  if ((gate === 'scheme.analysis' || gate === 'scheme.solution' || gate === 'scheme.tech_plan') && pointer) {
    const file = parseWorkitem(readFileSync(join(dir, pointer), 'utf8'))
    if (file.status === 'blocked' || file.status === 'returned') throw new Error('stage: ' + gate + ' deliverable is not ready (' + file.status + ')')
    if ((file.gaps || []).some(g => g.severity === 'blocking' && (!g.blockingFor || g.blockingFor === 'analysis' || g.blockingFor === 'solution'))) throw new Error('stage: ' + gate + ' has blocking gaps')
  }
  raw.approvals = Array.isArray(raw.approvals) ? raw.approvals : []
  let approval = raw.approvals.find(a => a && a.gate === gate)
  if (!approval) { approval = { gate, status: 'pending', signoffs: [] }; raw.approvals.push(approval) }
  approval.signoffs = Array.isArray(approval.signoffs) ? approval.signoffs : []
  const existing = approval.signoffs.find(s => s.actionId === args.actionId)
  if (!existing) approval.signoffs.push({ role, approver: args.actor || role, at: stamp(), via: 'ui', actionId: args.actionId, ...(args.comment ? { comment: args.comment } : {}) })
  const signedRoles = new Set(approval.signoffs.map(s => s.role))
  approval.status = roles.every(r => signedRoles.has(r)) ? 'approved' : 'awaiting_signoff'
  const advanced = approval.status === 'approved' ? advanceAfterSignoff(raw, gate) : null
  raw.updated_at = stamp()
  writeItem(dir, raw, config, `stage signoff · ${gate}/${role} · ${approval.status}${advanced ? ' · advanced=' + advanced : ''}`)
  return { ...publicItem(raw, id), advanced, gateStatus: approval.status }
}

export function stageComplete(config, args) {
  const id = args && args.id
  if (!id) throw new Error('stage: id is required')
  const root = rootDir(config)
  const dir = itemDir(root, id)
  const raw = readRaw(root, id)
  if (raw.stage !== 'cicd') throw new Error('stage: only cicd can be completed by pipeline')
  raw.stages = raw.stages && typeof raw.stages === 'object' ? raw.stages : {}
  raw.stages.cicd = raw.stages.cicd || {}
  raw.stages.cicd.status = 'done'
  raw.next = 'Stage 5 完成：pipeline 成功 + 制品包生成；Stage 6 不在本版'
  raw.updated_at = stamp()
  writeItem(dir, raw, config, 'stage complete · cicd · pipeline succeeded + artifact package')
  return publicItem(raw, id)
}

export const _internals = { parseWorkitem, serializeWorkitem, normalize, validatePatch }

/**
 * Stable storage/service seam. The current implementation is the local YAML
 * adapter; a shared Workitem service can replace it without changing tools.
 */
export function createWorkitemStore(config) {
  return {
    kind: 'file',
    get: id => readWorkitem(config, { id }),
    list: () => readWorkitem(config, {}),
    create: input => ensureWorkitem(config, input),
    update: (id, patch, options = {}) => updateWorkitem(config, { id, patch, dryRun: options.dryRun === true }),
    prepare: args => stagePrepare(config, args),
    signoff: args => stageSignoff(config, args),
    complete: args => stageComplete(config, args)
  }
}
