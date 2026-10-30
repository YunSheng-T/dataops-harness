/**
 * Read-only LTS task.yaml parser and validator.
 *
 * Source format only (formatVersion: 2). Build artifacts (task.json) are a
 * different contract and deliberately not modeled here.
 */
import { parseWorkitem } from './workitem-store.js'

const TASK_TYPES = new Set(['周期任务', '实时任务', '触发型任务'])
const JOB_TYPES = new Set(['url', 'shell', 'open_gauss', 'libra', 'group', 'tskdep'])
const PLACEHOLDER_RE = /\$\$([A-Za-z_][A-Za-z0-9_]*)\$\$/g

function asArray(value) {
  return Array.isArray(value) ? value : (value === null || value === undefined || value === '' ? [] : [value])
}

function text(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function issue(code, message, extra = {}) {
  return { code, severity: 'error', message, ...extra }
}

function warn(code, message, extra = {}) {
  return { code, severity: 'warning', message, ...extra }
}

function placeholders(value, out) {
  if (typeof value === 'string') {
    let match
    while ((match = PLACEHOLDER_RE.exec(value))) out.add(match[1])
    PLACEHOLDER_RE.lastIndex = 0
  } else if (Array.isArray(value)) {
    for (const item of value) placeholders(item, out)
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) placeholders(item, out)
  }
  return out
}

export function parseProperties(source) {
  const values = {}
  for (const raw of String(source || '').split(/\r?\n/u)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf('=')
    if (index <= 0) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    if (key) values[key] = value
  }
  return values
}

function validateTask(task, index, parameters, findings) {
  const prefix = task && task.name ? 'task ' + task.name : 'task #' + (index + 1)
  if (!task || typeof task !== 'object') {
    findings.push(issue('LTS_TASK_SHAPE', 'task #' + (index + 1) + ' must be an object'))
    return
  }
  if (!text(task.name)) findings.push(issue('LTS_TASK_NAME', prefix + ' is missing name'))
  if (!TASK_TYPES.has(task.type)) findings.push(issue('LTS_TASK_TYPE', prefix + ' has invalid type ' + task.type))
  if (task.type === '周期任务' && !text(task.cronExp)) findings.push(issue('LTS_CRON', prefix + ' periodic task needs cronExp'))
  if (task.type === '触发型任务' && task.cronExp) findings.push(warn('LTS_TRIGGER_CRON', prefix + ' trigger task should not have cronExp'))
  if (task.isFullJob !== '是') findings.push(issue('LTS_FULL_JOB', prefix + ' isFullJob must be 是'))
  if (!Array.isArray(task.taskParams)) findings.push(warn('LTS_TASK_PARAMS', prefix + ' taskParams should be an array'))
  if (task.owner && text(task.owner) && !/^<[^>]+>$/u.test(task.owner) && !/^[A-Za-z]\d{8}$/u.test(task.owner)) {
    findings.push(warn('LTS_OWNER', prefix + ' owner should be an employee id or placeholder'))
  }
  const jobs = asArray(task.jobs)
  if (!jobs.length) findings.push(issue('LTS_JOBS', prefix + ' has no jobs'))
  const names = new Set()
  const parents = new Map()
  for (const job of jobs) {
    if (!job || typeof job !== 'object') {
      findings.push(issue('LTS_JOB_SHAPE', prefix + ' has a non-object job'))
      continue
    }
    const name = text(job.name)
    if (!name) findings.push(issue('LTS_JOB_NAME', prefix + ' has a job without name'))
    else if (names.has(name)) findings.push(issue('LTS_JOB_DUPLICATE', prefix + ' duplicate job name ' + name))
    else names.add(name)
    if (!JOB_TYPES.has(job.jobType)) findings.push(issue('LTS_JOB_TYPE', prefix + ' job ' + (name || '?') + ' has invalid jobType ' + job.jobType, { job: name }))
    const parentNames = asArray(job.parentJobName)
    parents.set(name, parentNames)
    if (!parentNames.length) findings.push(warn('LTS_JOB_PARENT', prefix + ' job ' + (name || '?') + ' has no parentJobName'))
    if (job.jobType === 'url') {
      if (!text(job.jobExecPath)) findings.push(issue('LTS_URL_EXEC', prefix + ' job ' + (name || '?') + ' url needs jobExecPath', { job: name }))
      if (!['GET', 'POST'].includes(job.jobCallMethod)) findings.push(issue('LTS_URL_METHOD', prefix + ' job ' + (name || '?') + ' url needs GET/POST', { job: name }))
    }
    if (job.jobType === 'tskdep') {
      for (const key of ['depTaskName', 'depJobName', 'mainJobName']) {
        if (!(job.jobParam && text(job.jobParam[key]))) findings.push(issue('LTS_TSKDEP', prefix + ' job ' + (name || '?') + ' tskdep missing ' + key, { job: name }))
      }
    }
    for (const key of ['jobTimeout', 'jobRetryTimes', 'jobRetryInterval']) {
      if (job[key] !== undefined && !Number.isFinite(Number(job[key]))) findings.push(issue('LTS_JOB_NUMBER', prefix + ' job ' + (name || '?') + ' has non-numeric ' + key, { job: name }))
    }
  }
  for (const [name, parentNames] of parents) {
    for (const parent of parentNames) {
      if (parent !== 'start' && !names.has(parent)) findings.push(issue('LTS_JOB_PARENT_MISSING', prefix + ' job ' + name + ' references missing parent ' + parent, { job: name }))
    }
  }
  const visiting = new Set()
  const visited = new Set()
  function visit(name) {
    if (visiting.has(name)) { findings.push(issue('LTS_JOB_CYCLE', prefix + ' has cycle at ' + name, { job: name })); return }
    if (visited.has(name) || !parents.has(name)) return
    visiting.add(name)
    for (const parent of parents.get(name) || []) visit(parent)
    visiting.delete(name)
    visited.add(name)
  }
  for (const name of parents.keys()) visit(name)
  const placeholdersFound = placeholders(task, new Set())
  for (const key of placeholdersFound) {
    if (!(key in parameters)) findings.push(warn('LTS_PLACEHOLDER', prefix + ' placeholder $$' + key + '$$ is not declared in parameters.properties', { placeholder: key }))
  }
}

export function parseLtsTask(source, options = {}) {
  const raw = typeof source === 'string' ? parseWorkitem(source) : (source || {})
  const findings = []
  if (Number(raw.formatVersion) !== 2) findings.push(issue('LTS_FORMAT', 'LTS formatVersion must be 2'))
  const tasks = asArray(raw.tasks)
  if (!tasks.length) findings.push(issue('LTS_TASKS', 'LTS task.yaml needs at least one tasks[] entry'))
  const parameters = options.parameters && typeof options.parameters === 'object'
    ? options.parameters
    : parseProperties(options.parametersText || '')
  tasks.forEach((task, index) => validateTask(task, index, parameters, findings))
  return {
    formatVersion: raw.formatVersion,
    raw,
    tasks,
    parameters,
    placeholders: Array.from(placeholders(tasks, new Set())).sort(),
    findings,
    ok: !findings.some(item => item.severity === 'error')
  }
}
