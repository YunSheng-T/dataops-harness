/**
 * Read-only internal code repository index.
 *
 * Boundaries:
 * - manifest.yaml locates platform roots; build.yaml defines packages/files.
 * - `build.yaml.files` is repo-root relative and is the build authority.
 * - `${structure.ref...}` is parsed for a future CLI, but the current CLI does
 *   not expand it; callers must show unresolved paths instead of pretending.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parseWorkitem } from '../workitem-store.js'

const OPERATION_TYPES = new Set(['develop', 'offline'])
const SKIP_DIRS = new Set(['.git', 'node_modules', 'output', '.idea'])

function asArray(value) {
  return Array.isArray(value) ? value : (value === null || value === undefined || value === '' ? [] : [value])
}

function text(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function finding(code, message, path) {
  return { code, message, ...(path ? { path } : {}) }
}

function flattenManifestPlatforms(structure) {
  const platforms = []
  const ref = structure && structure.ref
  if (!ref || typeof ref !== 'object') return platforms
  function walk(node, keys) {
    if (typeof node === 'string') {
      platforms.push({ id: keys.join('.'), family: keys[0], platform: keys.slice(1).join('.'), path: node })
      return
    }
    if (!node || typeof node !== 'object' || Array.isArray(node)) return
    for (const [key, value] of Object.entries(node)) walk(value, keys.concat(key))
  }
  for (const [family, value] of Object.entries(ref)) walk(value, [family])
  return platforms
}

export function parseManifest(source) {
  const raw = typeof source === 'string' ? parseWorkitem(source) : (source || {})
  const findings = []
  if (String(raw.version) !== '1.2') findings.push(finding('MANIFEST_VERSION', 'manifest version should be 1.2'))
  const structure = raw.structure && typeof raw.structure === 'object' ? raw.structure : {}
  if (!structure.ref || typeof structure.ref !== 'object') findings.push(finding('MANIFEST_REF', 'manifest.structure.ref is required'))
  const platforms = flattenManifestPlatforms(structure)
  return { version: raw.version, raw, structure, config: raw.config || {}, platforms, findings }
}

export function resolveManifestExpression(expression, manifest) {
  const textValue = text(expression)
  if (!textValue) return undefined
  const match = textValue.match(/^\$\{([^}]+)\}(.*)$/u)
  if (!match) return textValue
  const value = match[1].split('.').reduce((node, key) => {
    if (!node || typeof node !== 'object') return undefined
    return node[key]
  }, manifest && manifest.raw)
  if (typeof value !== 'string') return undefined
  return value + match[2]
}

export function parseBuildConfig(source) {
  const raw = typeof source === 'string' ? parseWorkitem(source) : (source || {})
  const findings = []
  if (String(raw.version) !== '1.2') findings.push(finding('BUILD_VERSION', 'build.yaml version should be 1.2'))
  const packages = []
  const seen = new Set()
  for (const [index, item] of asArray(raw.packages).entries()) {
    if (!item || typeof item !== 'object') {
      findings.push(finding('PACKAGE_SHAPE', 'package #' + (index + 1) + ' must be an object'))
      continue
    }
    const packageName = text(item.packageName)
    if (!packageName) findings.push(finding('PACKAGE_NAME', 'package #' + (index + 1) + ' is missing packageName'))
    else if (seen.has(packageName)) findings.push(finding('PACKAGE_DUPLICATE', 'duplicate packageName: ' + packageName))
    else seen.add(packageName)
    for (const key of ['toolChain', 'serviceType', 'pipelineType', 'operationType']) {
      if (!text(item[key])) findings.push(finding('PACKAGE_REQUIRED', (packageName || '#' + (index + 1)) + ' is missing ' + key))
    }
    if (item.operationType && !OPERATION_TYPES.has(item.operationType)) findings.push(finding('PACKAGE_OPERATION', (packageName || '#' + (index + 1)) + ' has invalid operationType ' + item.operationType))
    const files = asArray(item.files).map((file, fileIndex) => {
      if (!file || typeof file !== 'object' || !text(file.path)) {
        findings.push(finding('PACKAGE_FILE', (packageName || '#' + (index + 1)) + ' file #' + (fileIndex + 1) + ' is missing path'))
        return null
      }
      return { path: file.path }
    }).filter(Boolean)
    if (!files.length) findings.push(finding('PACKAGE_EMPTY', (packageName || '#' + (index + 1)) + ' has no files'))
    packages.push({
      packageName,
      toolChain: item.toolChain,
      serviceType: item.serviceType,
      pipelineType: item.pipelineType,
      operationType: item.operationType,
      files
    })
  }
  return { version: raw.version, raw, packages, findings }
}

function globToRegExp(pattern) {
  let out = '^'
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    if (char === '*') {
      if (pattern[i + 1] === '*') { out += '.*'; i++ } else out += '[^/]*'
    } else if (char === '?') out += '[^/]'
    else out += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(out + '$')
}

function walkFiles(root, base, out) {
  if (!existsSync(base)) return
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walkFiles(root, join(base, entry.name), out)
    } else if (entry.isFile()) {
      out.push(relative(root, join(base, entry.name)).split('\\').join('/'))
    }
  }
}

function matchFiles(paths, pattern) {
  if (!pattern || pattern.includes('<') || pattern.includes('>')) return []
  const re = globToRegExp(pattern)
  return paths.filter(path => re.test(path))
}

function platformForPath(platforms, path) {
  return platforms
    .filter(item => path === item.path || path.startsWith(item.path.replace(/\/+$/, '') + '/'))
    .sort((a, b) => b.path.length - a.path.length)[0]
}

export function indexRepository(options = {}) {
  const root = resolve(options.root || '.')
  const manifestText = options.manifestText ?? readFileSync(join(root, options.manifestPath || '.dataops/manifest.yaml'), 'utf8')
  const buildText = options.buildText ?? readFileSync(join(root, options.buildPath || '.dataops/build.yaml'), 'utf8')
  const manifest = parseManifest(manifestText)
  const build = parseBuildConfig(buildText)
  const findings = manifest.findings.concat(build.findings.map(item => ({ ...item, source: 'build.yaml' })))
  const files = []
  walkFiles(root, root, files)
  const packages = build.packages.map(pkg => {
    const resolvedFiles = []
    const missing = []
    const unresolved = []
    for (const file of pkg.files) {
      const path = resolveManifestExpression(file.path, manifest)
      if (!path) {
        unresolved.push(file.path)
        continue
      }
      if (path.includes('<') || path.includes('>')) {
        unresolved.push(path)
        continue
      }
      const matched = matchFiles(files, path)
      if (!matched.length) missing.push(path)
      for (const match of matched) {
        if (!resolvedFiles.includes(match)) resolvedFiles.push(match)
      }
    }
    const platform = platformForPath(manifest.platforms, resolvedFiles[0] || '')
    return { ...pkg, files: resolvedFiles, missing, unresolved, platform: platform ? platform.id : null }
  })
  return { root, manifest, build, packages, findings }
}

export function readRepositoryConfig(root) {
  return {
    manifest: readFileSync(join(root, '.dataops', 'manifest.yaml'), 'utf8'),
    build: readFileSync(join(root, '.dataops', 'build.yaml'), 'utf8')
  }
}
