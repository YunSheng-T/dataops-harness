/**
 * P1 guards on top of Repo Doctor's scan output.
 *
 * These rules only inspect the index already produced by scanRepository. They
 * never mutate files, resolve real placeholder values, or execute build steps.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const PLACEHOLDER_RE = /\$\$([A-Za-z_][A-Za-z0-9_]*)\$\$/g
const ARTIFACT_TYPES = new Set(['sql', 'etl', 'data_service'])

function finding(severity, code, message, extra = {}) {
  return { severity, code, message, ...extra }
}

function placeholdersIn(source) {
  const keys = new Set()
  let match
  while ((match = PLACEHOLDER_RE.exec(source))) keys.add(match[1])
  PLACEHOLDER_RE.lastIndex = 0
  return keys
}

function taskFindings(scan) {
  const findings = []
  const tasks = scan.tasks || []
  const seen = new Set()
  for (const task of tasks) {
    if (task.name) {
      if (seen.has(task.name)) findings.push(finding('blocking', 'LTS_TASK_DUPLICATE', 'task name 在仓库内重复：' + task.name, { task: task.name, path: task.path }))
      seen.add(task.name)
    }
    const placeholders = task.placeholders || []
    if (placeholders.length && !task.parametersFile) {
      findings.push(finding('warning', 'PLACEHOLDER_FILE_MISSING', 'task 使用了占位符，但同目录没有 parameters.properties', { path: task.path, task: task.name }))
    }
    for (const key of task.emptyParameters || []) {
      if (!placeholders.includes(key)) continue
      findings.push(finding('warning', 'PLACEHOLDER_VALUE_EMPTY', 'parameters.properties 中 $$' + key + '$$ 的值为空', { path: task.path, task: task.name, placeholder: key }))
    }
    const jobs = new Map((task.jobs || []).map(job => [job.name, job]))
    for (const job of task.jobs || []) {
      const parentNames = job.parents || []
      const groupParent = parentNames.map(name => jobs.get(name)).find(parent => parent && parent.type === 'group')
      const path = String(job.path || '')
      const prefix = path.includes('|') ? path.slice(0, path.indexOf('|')) : ''
      if (groupParent) {
        // A job with a group parent and a path is contained by that group. A
        // multi-parent job can join a group without belonging to its path; the
        // sample's top-level notify job is one such case.
        if (prefix !== groupParent.name && (prefix || parentNames.length === 1)) {
          findings.push(finding('blocking', 'LTS_PATH_GROUP_MISMATCH', 'job ' + job.name + ' 的 path 必须以父 group ' + groupParent.name + ' 开头', { path: task.path, task: task.name, job: job.name }))
        }
      } else if (prefix) {
        findings.push(finding('blocking', 'LTS_PATH_GROUP_MISMATCH', 'job ' + job.name + ' 的 path 声明了 group，但父 job 不是 group', { path: task.path, task: task.name, job: job.name }))
      }
    }
  }
  return findings
}

function artifactFindings(scan) {
  const findings = []
  const root = scan.detection && scan.detection.root
  if (!root) return findings
  const declared = new Set((scan.tasks || []).flatMap(task => [...(task.placeholders || []), ...(task.parameterKeys || [])]))
  for (const artifact of scan.artifacts || []) {
    if (!ARTIFACT_TYPES.has(artifact.type)) continue
    const full = join(root, artifact.path)
    if (!existsSync(full)) continue
    let source
    try { source = readFileSync(full, 'utf8') } catch { continue }
    const keys = placeholdersIn(source)
    for (const key of keys) {
      if (!declared.has(key)) findings.push(finding('warning', 'PLACEHOLDER_ARTIFACT_UNDECLARED', '制品中的 $$' + key + '$$ 没有在仓库 properties 中声明', { path: artifact.path, placeholder: key }))
    }
  }
  return findings
}

export function guardRepository(scan) {
  if (!scan || !scan.ok) return []
  return [...taskFindings(scan), ...artifactFindings(scan)]
}
