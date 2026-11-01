import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'

export const SUPPORTED_DSH_RANGE = '>=0.2.1-rc.2 <0.3.0'
export const BUNDLE_NAME = '@dataops/dsh-dataops-bundle'
export const BUNDLE_VERSION = '0.1.0'
export const DEFAULT_PROFILE = 'dataops'

export function parseVersion(value) {
  const match = String(value).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : []
  }
}

function compareIdentifier(left, right) {
  const leftNumeric = /^\d+$/.test(left)
  const rightNumeric = /^\d+$/.test(right)
  if (leftNumeric && rightNumeric) return Number(left) - Number(right)
  if (leftNumeric) return -1
  if (rightNumeric) return 1
  return left < right ? -1 : left > right ? 1 : 0
}

export function compareVersions(leftValue, rightValue) {
  const left = parseVersion(leftValue)
  const right = parseVersion(rightValue)
  if (!left || !right) throw new Error('invalid semver: ' + leftValue + ' / ' + rightValue)
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] - right[key]
  }
  if (left.prerelease.length === 0 && right.prerelease.length === 0) return 0
  if (left.prerelease.length === 0) return 1
  if (right.prerelease.length === 0) return -1
  const length = Math.max(left.prerelease.length, right.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    if (left.prerelease[index] === undefined) return -1
    if (right.prerelease[index] === undefined) return 1
    const compared = compareIdentifier(left.prerelease[index], right.prerelease[index])
    if (compared !== 0) return compared
  }
  return 0
}

export function satisfiesRange(value, range = SUPPORTED_DSH_RANGE) {
  const match = String(range).trim().match(/^>=\s*(\S+)\s+<\s*(\S+)$/)
  if (!match) throw new Error('unsupported range: ' + range)
  const version = parseVersion(value)
  if (!version) return false
  const lower = parseVersion(match[1])
  const upper = parseVersion(match[2])
  if (version.prerelease.length > 0) {
    const allowed = [lower, upper].some(item => item && item.prerelease.length > 0 && item.major === version.major && item.minor === version.minor && item.patch === version.patch)
    if (!allowed) return false
  }
  return compareVersions(value, match[1]) >= 0 && compareVersions(value, match[2]) < 0
}

export function findVersion(text) {
  const matches = String(text).match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g)
  if (!matches || matches.length === 0) return null
  return matches[matches.length - 1]
}

export function resolveDshHome(homeFlag) {
  if (homeFlag) return resolve(homeFlag)
  if (process.env.DSH_HOME) return resolve(process.env.DSH_HOME)
  return join(homedir(), '.dsh')
}

export function profileDir(home, profile) {
  return join(home, 'profiles', profile)
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = path + '.tmp-' + process.pid + '-' + Date.now()
  writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n')
  try {
    renameSync(temporary, path)
  } catch (error) {
    rmSync(temporary, { force: true })
    throw error
  }
}

export function isSubpath(parent, child) {
  const resolvedParent = resolve(parent)
  const resolvedChild = resolve(child)
  const rel = relative(resolvedParent, resolvedChild)
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + sep))
}

export function sha256File(path) {
  const hash = createHash('sha256')
  hash.update(readFileSync(path))
  return hash.digest('hex')
}

export function listSkillNames(sourceRoot) {
  if (!existsSync(sourceRoot)) return []
  return readdirSync(sourceRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && existsSync(join(sourceRoot, entry.name, 'SKILL.md')))
    .map(entry => entry.name)
    .sort()
}
