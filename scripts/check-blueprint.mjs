#!/usr/bin/env node
/**
 * check-blueprint.mjs — visual acceptance check for a self-contained blueprint HTML.
 *
 * Launches local headless Chrome over CDP (no npm dependencies; needs Node 22+
 * built-in fetch/WebSocket), loads the blueprint via file://, then verifies:
 *   - no horizontal overflow at 1024 / 1440 / 1600 / 1920 CSS px
 *     (document.documentElement.scrollWidth <= window.innerWidth)
 *   - light/dark theme toggle via #theme (falls back to the data-theme attribute
 *     when the click path is unavailable and records that degraded path)
 *   - zero console errors (Runtime.exceptionThrown, Runtime.consoleAPICalled
 *     type=error, Log.entryAdded level=error)
 *   - 1440x900 light + dark viewport screenshots and full-page screenshots
 *
 * usage:
 *   node scripts/check-blueprint.mjs \
 *     --file prototype/release-install-blueprint.html \
 *     --slug release-install-blueprint
 *
 * options:
 *   --file <path>     blueprint HTML (required, resolved from cwd)
 *   --slug <name>     output basename, [A-Za-z0-9._-] (required)
 *   --out-dir <dir>   screenshot/report directory (default prototype/shots)
 *   --chrome <path>   Chrome binary (default $CHROME_PATH, else macOS Chrome)
 *   --timeout <ms>    overall budget, default 180000
 *   --keep-profile    keep the temporary Chrome profile for debugging
 *   --help            show this help
 *
 * exit codes: 0 pass, 1 check/fatal failure, 2 bad usage
 *
 * writes: <out-dir>/<slug>{,-full,-dark,-full-dark}.png and <slug>-report.json
 * read-only with respect to the blueprint HTML; never reports a fake PASS.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const repoRoot = resolve(import.meta.dirname, '..')
const DEFAULT_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const DEFAULT_OUT_DIR = join(repoRoot, 'prototype', 'shots')
const VIEWPORTS = Object.freeze([
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
  { width: 1600, height: 1000 },
  { width: 1920, height: 1080 }
])
const SHOT_VIEWPORT = Object.freeze({ width: 1440, height: 900 })
const CDP_CALL_TIMEOUT_MS = 45000
const PNG_SIGNATURE_HEX = '89504e470d0a1a0a'

function printUsage(stream = process.stderr) {
  stream.write([
    'usage: node scripts/check-blueprint.mjs --file <blueprint.html> --slug <name> [options]',
    '',
    '  --file <path>     blueprint HTML (required)',
    '  --slug <name>     output basename, e.g. release-install-blueprint (required)',
    '  --out-dir <dir>   output directory (default prototype/shots)',
    '  --chrome <path>   Chrome binary (default $CHROME_PATH or macOS Chrome)',
    '  --timeout <ms>    overall budget in ms (default 180000)',
    '  --keep-profile    keep the temporary Chrome profile for debugging',
    ''
  ].join('\n'))
}

function parseArgs(argv) {
  const options = {
    file: null,
    slug: null,
    outDir: DEFAULT_OUT_DIR,
    chromePath: process.env.CHROME_PATH || DEFAULT_CHROME_PATH,
    timeoutMs: 180000,
    keepProfile: false,
    help: false
  }
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index]
    const nextValue = () => {
      const value = argv[++index]
      if (value === undefined) throw new Error('missing value for ' + token)
      return value
    }
    if (token === '--file') options.file = nextValue()
    else if (token === '--slug') options.slug = nextValue()
    else if (token === '--out-dir') options.outDir = nextValue()
    else if (token === '--chrome') options.chromePath = nextValue()
    else if (token === '--timeout') {
      const value = Number(nextValue())
      if (!Number.isFinite(value) || value < 5000) throw new Error('--timeout must be a number >= 5000')
      options.timeoutMs = value
    } else if (token === '--keep-profile') options.keepProfile = true
    else if (token === '--help' || token === '-h') options.help = true
    else throw new Error('unknown argument: ' + token)
  }
  return options
}

function displayPath(absolutePath) {
  const rel = relative(repoRoot, absolutePath)
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel : absolutePath
}

function readPngSize(buffer) {
  if (buffer.length < 24) throw new Error('image is too small to be a PNG')
  if (buffer.subarray(0, 8).toString('hex') !== PNG_SIGNATURE_HEX) throw new Error('image is not a PNG (bad signature)')
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

function freePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createServer()
    server.unref()
    server.once('error', rejectPort)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolvePort(port))
    })
  })
}

async function waitForJson(url, timeoutMs, child, chromiumLog) {
  const deadline = Date.now() + timeoutMs
  let lastError = null
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error('Chrome exited before CDP was ready (code ' + child.exitCode + ')')
    }
    try {
      const response = await fetch(url)
      if (response.ok) return await response.json()
      lastError = new Error('HTTP ' + response.status)
    } catch (error) {
      lastError = error
    }
    await delay(200)
  }
  throw new Error('timeout waiting for ' + url + (lastError ? ': ' + lastError.message : '') +
    (chromiumLog ? '; chrome log: ' + chromiumLog().slice(-1200) : ''))
}

async function waitForChildExit(child, timeoutMs) {
  if (!child || child.exitCode !== null) return true
  return new Promise(resolveExit => {
    const timer = setTimeout(() => resolveExit(false), timeoutMs)
    child.once('exit', () => { clearTimeout(timer); resolveExit(true) })
  })
}

async function launchChrome(chromePath, keepProfile) {
  const port = await freePort()
  const userDataDir = mkdtempSync(join(tmpdir(), 'dsh-blueprint-check-'))
  const logChunks = []
  const appendLog = chunk => {
    logChunks.push(String(chunk))
    if (logChunks.length > 120) logChunks.shift()
  }
  const chromiumLog = () => logChunks.join('')
  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--mute-audio',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + userDataDir,
    '--allow-file-access-from-files',
    '--window-size=' + SHOT_VIEWPORT.width + ',' + SHOT_VIEWPORT.height,
    'about:blank'
  ]
  const child = spawn(chromePath, chromeArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.on('data', appendLog)
  child.stderr.on('data', appendLog)
  try {
    const version = await waitForJson('http://127.0.0.1:' + port + '/json/version', 25000, child, chromiumLog)
    if (!version.webSocketDebuggerUrl) {
      throw new Error('Chrome /json/version did not expose webSocketDebuggerUrl')
    }
    return { child, port, userDataDir, version, chromiumLog }
  } catch (error) {
    try { child.kill('SIGKILL') } catch { /* already gone */ }
    if (!keepProfile) {
      try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch { /* best effort */ }
    }
    throw new Error(error.message + '\nchrome log tail:\n' + chromiumLog().slice(-1500))
  }
}

async function connectWebSocket(url) {
  const socket = new WebSocket(url)
  await new Promise((resolveOpen, rejectOpen) => {
    const timer = setTimeout(() => rejectOpen(new Error('timeout opening CDP websocket: ' + url)), 15000)
    socket.onopen = () => { clearTimeout(timer); resolveOpen() }
    socket.onerror = () => { clearTimeout(timer); rejectOpen(new Error('failed to open CDP websocket: ' + url)) }
  })
  return socket
}

function createCdp(socket) {
  let nextId = 0
  const pending = new Map()
  const listeners = new Map()

  socket.onmessage = event => {
    let message
    try {
      message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data))
    } catch {
      return
    }
    if (message.id !== undefined && pending.has(message.id)) {
      const entry = pending.get(message.id)
      pending.delete(message.id)
      clearTimeout(entry.timer)
      if (message.error) entry.reject(new Error(entry.method + ': ' + (message.error.message || 'CDP error')))
      else entry.resolve(message.result || {})
      return
    }
    if (message.method) {
      const handlers = listeners.get(message.method)
      if (handlers) for (const handler of [...handlers]) handler(message.params || {}, message.sessionId)
    }
  }

  socket.onclose = () => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer)
      entry.reject(new Error('CDP socket closed'))
    }
    pending.clear()
  }
  socket.onerror = () => { /* surfaced through close or per-call timeouts */ }

  const send = (method, params = {}, sessionId) => new Promise((resolveCall, rejectCall) => {
    const id = ++nextId
    const timer = setTimeout(() => {
      pending.delete(id)
      rejectCall(new Error(method + ': CDP call timed out'))
    }, CDP_CALL_TIMEOUT_MS)
    pending.set(id, { resolve: resolveCall, reject: rejectCall, method, timer })
    try {
      socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }))
    } catch (error) {
      clearTimeout(timer)
      pending.delete(id)
      rejectCall(error)
    }
  })

  const on = (method, handler) => {
    if (!listeners.has(method)) listeners.set(method, new Set())
    listeners.get(method).add(handler)
    return () => { listeners.get(method)?.delete(handler) }
  }

  const waitFor = (method, timeoutMs, sessionId) => new Promise((resolveEvent, rejectEvent) => {
    let off = () => {}
    const timer = setTimeout(() => {
      off()
      rejectEvent(new Error('timeout waiting for ' + method))
    }, timeoutMs)
    off = on(method, (params, eventSessionId) => {
      if (sessionId && eventSessionId && eventSessionId !== sessionId) return
      clearTimeout(timer)
      off()
      resolveEvent(params)
    })
  })

  return { send, on, waitFor, close: () => { try { socket.close() } catch { /* already closed */ } } }
}

function themeProbe() {
  const root = document.documentElement
  const body = document.body || root
  const bodyStyle = getComputedStyle(body)
  const rootStyle = getComputedStyle(root)
  return {
    theme: root.getAttribute('data-theme'),
    hasThemeAttribute: root.hasAttribute('data-theme'),
    bodyBackground: bodyStyle.backgroundColor,
    rootBackground: rootStyle.backgroundColor,
    bodyColor: bodyStyle.color,
    hasThemeButton: Boolean(document.getElementById('theme')),
    prefersDark: window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : null
  }
}

function overflowProbe() {
  const viewportWidth = window.innerWidth
  const found = []
  const nodes = document.body ? document.body.querySelectorAll('*') : []
  for (const element of nodes) {
    if (found.length >= 8) break
    const rect = element.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) continue
    if (rect.right <= viewportWidth + 1 && rect.left >= -1) continue
    let clippedByAncestor = false
    for (let parent = element.parentElement; parent && parent !== document.body && parent !== document.documentElement; parent = parent.parentElement) {
      if (getComputedStyle(parent).overflowX !== 'visible') {
        clippedByAncestor = true
        break
      }
    }
    if (clippedByAncestor) continue
    const className = typeof element.className === 'string' ? element.className : ''
    found.push({
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      className: className.slice(0, 80) || null,
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
    })
  }
  return found
}

function documentProbe() {
  return {
    title: document.title,
    readyState: document.readyState,
    bodyTextLength: (document.body ? document.body.innerText || '' : '').length,
    bodyChildren: document.body ? document.body.children.length : 0,
    hasThemeButton: Boolean(document.getElementById('theme')),
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    url: location.href,
    externalResources: performance.getEntriesByType('resource')
      .map(entry => entry.name)
      .filter(name => /^https?:/i.test(name))
  }
}

function expressionOf(fn) {
  return '(' + fn.toString() + ')()'
}

function backgroundColorChanged(before, after) {
  return before.bodyBackground !== after.bodyBackground || before.rootBackground !== after.rootBackground
}

function formatConsoleArgs(args) {
  return (args || []).map(arg => {
    if (arg === null || arg === undefined) return ''
    if (arg.value !== undefined) return String(arg.value)
    if (arg.description !== undefined) return String(arg.description)
    return arg.type || ''
  }).join(' ')
}

async function persistScreenshot(context) {
  const { check, screenshots, outDir, fileName, kind, theme, observedTheme, viewport, base64, expected } = context
  const buffer = Buffer.from(base64 || '', 'base64')
  if (!buffer.length) throw new Error('screenshot ' + fileName + ': Chrome returned no image data')
  mkdirSync(outDir, { recursive: true })
  const absolutePath = join(outDir, fileName)
  writeFileSync(absolutePath, buffer)
  const size = readPngSize(buffer)
  const tolerance = kind === 'full' ? 2 : 0
  const dimensionsMatch = Math.abs(size.width - expected.width) <= tolerance && Math.abs(size.height - expected.height) <= tolerance
  const tallerThanViewport = kind === 'full' ? size.height > viewport.height + 100 : null
  const ok = dimensionsMatch && size.width > 100 && size.height > 100 && (kind !== 'full' || tallerThanViewport)
  const entry = {
    kind,
    theme,
    observedTheme,
    viewport: viewport.width + 'x' + viewport.height,
    file: displayPath(absolutePath),
    absolutePath,
    bytes: buffer.length,
    width: size.width,
    height: size.height,
    expected,
    dimensionsMatch,
    tallerThanViewport,
    ok
  }
  screenshots.push(entry)
  const okMessage = 'screenshot ' + fileName + ': ' + size.width + 'x' + size.height + ', ' + buffer.length + ' bytes' +
    (kind === 'full' ? ' (full page taller than viewport ' + viewport.height + ')' : '')
  const failMessage = 'screenshot ' + fileName + ': got ' + size.width + 'x' + size.height +
    ', expected ' + expected.width + 'x' + expected.height +
    (kind === 'full' && !tallerThanViewport ? '; full-page capture is not taller than the ' + viewport.height + 'px viewport' : '') +
    (kind === 'viewport' && observedTheme !== theme ? '; expected ' + theme + ' theme but page reports ' + observedTheme : '')
  check(ok, okMessage, failMessage)
  return entry
}

async function runChecks(context) {
  const {
    options, page, evaluate, settle, readTheme, clickThemeButton, setThemeAttribute,
    setViewport, failures, warnings, consoleErrors, viewportResults, screenshots, report, check
  } = context

  const doc = await evaluate(expressionOf(documentProbe))
  report.page = doc
  if (doc.externalResources.length > 0) {
    warnings.push('external resources referenced: ' + doc.externalResources.slice(0, 5).join(', '))
  }
  check(doc.readyState === 'complete',
    'page loaded: readyState=' + doc.readyState + ' title=' + JSON.stringify(doc.title),
    'page did not finish loading: readyState=' + doc.readyState)
  check(doc.bodyTextLength >= 100,
    'page has content (body text ' + doc.bodyTextLength + ' chars)',
    'page body text is nearly empty (' + doc.bodyTextLength + ' chars)')
  if (!doc.hasThemeButton) warnings.push('#theme button not found; theme fallback to data-theme attribute will be used')

  for (const viewport of VIEWPORTS) {
    await setViewport(viewport)
    const metrics = await evaluate('({ innerWidth: window.innerWidth, innerHeight: window.innerHeight, ' +
      'scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, ' +
      'scrollHeight: document.documentElement.scrollHeight, ' +
      'bodyScrollWidth: document.body ? document.body.scrollWidth : null, devicePixelRatio: window.devicePixelRatio })')
    const overflowingElements = await evaluate(expressionOf(overflowProbe))
    const widthOk = metrics.scrollWidth <= metrics.innerWidth
    const emulationOk = Math.abs(metrics.innerWidth - viewport.width) <= 1
    viewportResults.push({
      requested: { width: viewport.width, height: viewport.height },
      innerWidth: metrics.innerWidth,
      innerHeight: metrics.innerHeight,
      scrollWidth: metrics.scrollWidth,
      clientWidth: metrics.clientWidth,
      scrollHeight: metrics.scrollHeight,
      bodyScrollWidth: metrics.bodyScrollWidth,
      devicePixelRatio: metrics.devicePixelRatio,
      widthOk,
      emulationOk,
      pass: widthOk && emulationOk,
      overflowingElements
    })
    if (!emulationOk) warnings.push('requested width ' + viewport.width + ' produced innerWidth ' + metrics.innerWidth)
    const overflowHint = overflowingElements.length > 0
      ? '; overflowing elements: ' + overflowingElements.map(item => item.tag + (item.className ? '.' + item.className.split(/\s+/)[0] : '') + ' right=' + item.right).join(', ')
      : ''
    check(widthOk && emulationOk,
      'viewport ' + viewport.width + 'x' + viewport.height + ': scrollWidth ' + metrics.scrollWidth + ' <= innerWidth ' + metrics.innerWidth,
      'horizontal overflow at ' + viewport.width + 'px: scrollWidth ' + metrics.scrollWidth + ' > innerWidth ' + metrics.innerWidth + overflowHint)
  }

  await setViewport(SHOT_VIEWPORT)
  const initialTheme = await readTheme()
  report.theme = { initial: initialTheme, normalization: null, light: null, dark: null, toggle: null, roundTrip: null }
  if (initialTheme.prefersDark) warnings.push('headless Chrome prefers-color-scheme reports dark before any toggle')

  // Treat "no data-theme + prefers-color-scheme: light" as an effective light
  // baseline; only mark the data-theme fallback as degraded when a click that
  // should have produced light did not actually work.
  const isEffectiveLight = state => state.theme === 'light' ||
    (state.theme === null && state.prefersDark === false)
  let lightState = initialTheme
  let normalizeMechanism = 'already-light'
  if (!isEffectiveLight(initialTheme)) {
    if (initialTheme.hasThemeButton) {
      await clickThemeButton()
      const afterClick = await readTheme()
      if (isEffectiveLight(afterClick)) {
        lightState = afterClick
        normalizeMechanism = 'click'
      }
    }
    if (normalizeMechanism !== 'click') {
      await setThemeAttribute('light')
      lightState = await readTheme()
      normalizeMechanism = 'fallback-setAttribute'
    }
  } else if (initialTheme.theme !== 'light') {
    // Already visually light via the system/default path; materialize the
    // attribute so the screenshots are deterministic (not a degraded toggle).
    await setThemeAttribute('light')
    lightState = await readTheme()
    normalizeMechanism = 'initial-light-attribute'
  }
  report.theme.normalization = { mechanism: normalizeMechanism, from: initialTheme, to: lightState }
  if (normalizeMechanism === 'fallback-setAttribute') {
    warnings.push('light theme normalized via data-theme="light" instead of #theme click (degraded path)')
  }
  check(lightState.theme === 'light',
    'light theme ready via ' + normalizeMechanism,
    'could not establish the light theme (data-theme=' + JSON.stringify(lightState.theme) + ')')
  report.theme.light = lightState

  const captureViewport = async (fileName, themeName) => {
    await setViewport(SHOT_VIEWPORT)
    await evaluate('window.scrollTo(0, 0)')
    await settle()
    const observed = await readTheme()
    if (observed.theme !== themeName) {
      failures.push('screenshot ' + fileName + ': expected ' + themeName + ' theme, page reports ' + observed.theme)
      console.error('FAIL screenshot ' + fileName + ': expected ' + themeName + ' theme, page reports ' + observed.theme)
    }
    const capture = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    return persistScreenshot({
      check, screenshots, outDir: context.outDir, fileName, kind: 'viewport',
      theme: themeName, observedTheme: observed.theme, viewport: SHOT_VIEWPORT,
      base64: capture.data, expected: { width: SHOT_VIEWPORT.width, height: SHOT_VIEWPORT.height }
    })
  }

  const captureFullPage = async (fileName, themeName) => {
    await setViewport(SHOT_VIEWPORT)
    await evaluate('window.scrollTo(0, 0)')
    await settle()
    const observed = await readTheme()
    if (observed.theme !== themeName) {
      failures.push('screenshot ' + fileName + ': expected ' + themeName + ' theme, page reports ' + observed.theme)
      console.error('FAIL screenshot ' + fileName + ': expected ' + themeName + ' theme, page reports ' + observed.theme)
    }
    const metrics = await page('Page.getLayoutMetrics')
    const content = metrics.cssContentSize || metrics.contentSize
    if (!content || !(content.width > 0) || !(content.height > 0)) {
      throw new Error('Page.getLayoutMetrics returned no usable cssContentSize for the full-page screenshot')
    }
    const clip = {
      x: 0,
      y: 0,
      width: Math.max(1, Math.ceil(content.width)),
      height: Math.max(1, Math.ceil(content.height)),
      scale: 1
    }
    const capture = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip })
    return persistScreenshot({
      check, screenshots, outDir: context.outDir, fileName, kind: 'full',
      theme: themeName, observedTheme: observed.theme, viewport: SHOT_VIEWPORT,
      base64: capture.data, expected: { width: clip.width, height: clip.height }
    })
  }

  await captureViewport(options.slug + '.png', 'light')
  await captureFullPage(options.slug + '-full.png', 'light')

  const toggleStartState = await readTheme()
  const toggle = {
    mechanism: 'none',
    clickAttempted: false,
    clickResult: null,
    from: toggleStartState,
    to: null,
    backgroundChanged: false,
    verified: false
  }
  if (toggleStartState.hasThemeButton) {
    toggle.clickAttempted = true
    await clickThemeButton()
    toggle.clickResult = await readTheme()
  }
  let darkState = toggle.clickResult || toggleStartState
  if (darkState.theme === 'dark' && backgroundColorChanged(toggleStartState, darkState)) {
    toggle.mechanism = 'click'
  } else {
    warnings.push('click #theme did not produce a verified dark theme; falling back to data-theme="dark" (degraded path)')
    await setThemeAttribute('dark')
    darkState = await readTheme()
    toggle.mechanism = 'fallback-setAttribute'
  }
  toggle.to = darkState
  toggle.backgroundChanged = backgroundColorChanged(toggleStartState, darkState)
  toggle.verified = darkState.theme === 'dark' && toggle.backgroundChanged
  report.theme.dark = darkState
  report.theme.toggle = toggle
  check(toggle.verified,
    'theme light->dark verified via ' + toggle.mechanism + ' (background ' + toggleStartState.bodyBackground + ' -> ' + darkState.bodyBackground + ')',
    'theme light->dark failed via ' + toggle.mechanism + ' (data-theme=' + JSON.stringify(darkState.theme) +
      ', background ' + toggleStartState.bodyBackground + ' -> ' + darkState.bodyBackground + ')')

  await captureViewport(options.slug + '-dark.png', 'dark')
  await captureFullPage(options.slug + '-full-dark.png', 'dark')

  const roundTrip = { attempted: false, mechanism: 'none', verified: false, state: null }
  if (darkState.hasThemeButton) {
    roundTrip.attempted = true
    roundTrip.mechanism = 'click'
    await clickThemeButton()
    const after = await readTheme()
    roundTrip.state = after
    roundTrip.verified = after.theme === 'light' &&
      after.bodyBackground === toggleStartState.bodyBackground &&
      after.rootBackground === toggleStartState.rootBackground
    if (!roundTrip.verified) {
      warnings.push('click #theme did not restore the light theme; restoring data-theme="light" (degraded path)')
      await setThemeAttribute('light')
    }
  } else {
    await setThemeAttribute('light')
    warnings.push('no #theme button; skipped the dark->light click round-trip')
  }
  report.theme.roundTrip = roundTrip
  if (toggle.mechanism === 'click') {
    check(roundTrip.verified,
      'theme dark->light verified via click #theme',
      'theme dark->light via click #theme did not restore the light theme')
  }

  check(screenshots.length === 4,
    '4 screenshots captured',
    'expected 4 screenshots, got ' + screenshots.length)
  const badShots = screenshots.filter(shot => !shot.ok)
  check(badShots.length === 0,
    'all screenshots have valid PNG dimensions',
    badShots.length + ' screenshot(s) have unexpected dimensions or a short full-page capture')

  if (consoleErrors.length === 0) {
    console.log('ok   0 console errors')
  } else {
    const message = 'console errors: ' + consoleErrors.length + ' (see report.consoleErrors)'
    failures.push(message)
    console.error('FAIL ' + message)
    for (const error of consoleErrors) console.error('  [' + error.source + '] ' + error.text)
  }
}

async function main(options) {
  const startedAt = new Date().toISOString()
  const startedMs = Date.now()
  const filePath = resolve(process.cwd(), options.file)
  const outDir = isAbsolute(options.outDir) ? options.outDir : resolve(process.cwd(), options.outDir)
  const reportPath = join(outDir, options.slug + '-report.json')
  const failures = []
  const warnings = []
  const consoleErrors = []
  const viewportResults = []
  const screenshots = []
  const report = {
    schemaVersion: 1,
    tool: 'scripts/check-blueprint.mjs',
    slug: options.slug,
    file: displayPath(filePath),
    fileUrl: null,
    startedAt,
    finishedAt: null,
    durationMs: null,
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    chrome: { path: options.chromePath, exists: false },
    mode: 'cdp-file',
    criteria: {
      widthCheck: {
        viewports: VIEWPORTS.map(viewport => viewport.width),
        expression: 'document.documentElement.scrollWidth <= window.innerWidth'
      },
      consoleErrors: 0,
      theme: 'click #theme light<->dark, fallback to data-theme recorded as degraded path',
      screenshots: ['<slug>.png', '<slug>-full.png', '<slug>-dark.png', '<slug>-full-dark.png'],
      fullPageTallerThanViewport: true
    },
    page: null,
    viewports: viewportResults,
    theme: null,
    consoleErrors,
    screenshots,
    pass: false,
    failures,
    warnings
  }
  const check = (ok, okMessage, failMessage = okMessage) => {
    if (ok) {
      console.log('ok   ' + okMessage)
    } else {
      failures.push(failMessage)
      console.error('FAIL ' + failMessage)
    }
  }
  let chrome = null
  let cdp = null
  let watchdogTimer = null
  let reportWritten = false

  const cleanup = async () => {
    if (watchdogTimer) clearTimeout(watchdogTimer)
    try {
      if (cdp) await Promise.race([cdp.send('Browser.close'), delay(3000)])
    } catch { /* chrome may already be gone */ }
    try { cdp?.close() } catch { /* already closed */ }
    if (chrome) {
      const exited = await waitForChildExit(chrome.child, 3000)
      if (!exited) {
        try { chrome.child.kill('SIGKILL') } catch { /* already gone */ }
      }
      if (options.keepProfile) {
        console.log('kept chrome profile: ' + chrome.userDataDir)
      } else {
        try { rmSync(chrome.userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch { /* best effort */ }
      }
    }
  }

  try {
    if (typeof fetch !== 'function' || typeof WebSocket === 'undefined') {
      throw new Error('Node 22+ with built-in fetch and WebSocket is required')
    }
    mkdirSync(outDir, { recursive: true })
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      throw new Error('blueprint HTML not found: ' + filePath)
    }
    report.chrome = { path: options.chromePath, exists: existsSync(options.chromePath) }
    if (!report.chrome.exists) {
      throw new Error('Chrome binary not found at ' + options.chromePath + '; set CHROME_PATH or pass --chrome')
    }

    const watchdog = new Promise((_, rejectWatchdog) => {
      watchdogTimer = setTimeout(() => {
        rejectWatchdog(new Error('check timed out after ' + options.timeoutMs + 'ms'))
      }, options.timeoutMs)
    })

    const run = (async () => {
      chrome = await launchChrome(options.chromePath, options.keepProfile)
      report.chrome = {
        path: options.chromePath,
        exists: true,
        version: chrome.version.Browser || null,
        protocolVersion: chrome.version['Protocol-Version'] || null,
        userAgent: chrome.version['User-Agent'] || null,
        port: chrome.port,
        headless: true
      }
      const socket = await connectWebSocket(chrome.version.webSocketDebuggerUrl)
      cdp = createCdp(socket)
      const browserVersion = await cdp.send('Browser.getVersion')
      report.chrome.product = browserVersion.product || null
      report.chrome.protocolVersion = browserVersion.protocolVersion || report.chrome.protocolVersion

      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
      if (!targetId) throw new Error('Chrome did not create a page target')
      const attached = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
      const sessionId = attached.sessionId
      if (!sessionId) throw new Error('Chrome did not attach a CDP session to the page target')
      const page = (method, params = {}) => cdp.send(method, params, sessionId)

      cdp.on('Runtime.exceptionThrown', (params, eventSessionId) => {
        if (eventSessionId && eventSessionId !== sessionId) return
        const details = params.exceptionDetails || {}
        consoleErrors.push({
          source: 'exception',
          type: 'uncaught',
          text: (details.exception && details.exception.description) || details.text || 'uncaught exception',
          url: details.url || null,
          lineNumber: details.lineNumber === undefined ? null : details.lineNumber,
          columnNumber: details.columnNumber === undefined ? null : details.columnNumber,
          at: new Date().toISOString()
        })
      })
      cdp.on('Runtime.consoleAPICalled', (params, eventSessionId) => {
        if (eventSessionId && eventSessionId !== sessionId) return
        if (params.type !== 'error') return
        const frame = params.stackTrace && params.stackTrace.callFrames && params.stackTrace.callFrames[0]
        consoleErrors.push({
          source: 'console',
          type: params.type,
          text: formatConsoleArgs(params.args),
          url: (frame && frame.url) || null,
          lineNumber: (frame && frame.lineNumber !== undefined) ? frame.lineNumber : null,
          columnNumber: (frame && frame.columnNumber !== undefined) ? frame.columnNumber : null,
          at: new Date().toISOString()
        })
      })
      cdp.on('Log.entryAdded', (params, eventSessionId) => {
        if (eventSessionId && eventSessionId !== sessionId) return
        const entry = params.entry || {}
        if (entry.level !== 'error') return
        consoleErrors.push({
          source: 'log',
          type: entry.source || 'log',
          text: entry.text || 'log error',
          url: entry.url || null,
          lineNumber: entry.lineNumber === undefined ? null : entry.lineNumber,
          at: new Date().toISOString()
        })
      })

      await page('Page.enable')
      await page('Runtime.enable')
      await page('Log.enable')

      const evaluate = async expression => {
        const result = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
        if (result.exceptionDetails) {
          const detail = (result.exceptionDetails.exception && result.exceptionDetails.exception.description) ||
            result.exceptionDetails.text || 'evaluation failed'
          throw new Error('page evaluation failed: ' + detail)
        }
        return result.result ? result.result.value : undefined
      }

      const settle = async () => {
        await evaluate('new Promise(resolve => {' +
          'const done = () => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 60)));' +
          'if (document.readyState === "complete") done();' +
          'else { addEventListener("load", done, { once: true }); setTimeout(done, 4000); }' +
          '})')
      }

      const readTheme = async () => evaluate(expressionOf(themeProbe))
      const clickThemeButton = async () => {
        const clicked = await evaluate('(() => { const button = document.getElementById("theme"); if (!button) return false; button.click(); return true })()')
        await settle()
        return clicked
      }
      const setThemeAttribute = async theme => {
        await evaluate('document.documentElement.setAttribute("data-theme", ' + JSON.stringify(theme) + ')')
        await settle()
      }
      const setViewport = async viewport => {
        await page('Emulation.setDeviceMetricsOverride', {
          width: viewport.width,
          height: viewport.height,
          screenWidth: viewport.width,
          screenHeight: viewport.height,
          deviceScaleFactor: 1,
          mobile: false
        })
        await settle()
      }

      const fileUrl = pathToFileURL(filePath).href
      report.fileUrl = fileUrl
      const loadEvent = cdp.waitFor('Page.loadEventFired', 30000, sessionId)
      const navigation = await page('Page.navigate', { url: fileUrl })
      if (navigation.errorText) throw new Error('navigation to ' + fileUrl + ' failed: ' + navigation.errorText)
      try {
        await loadEvent
      } catch (error) {
        warnings.push('load event not observed: ' + error.message)
      }
      await settle()

      await runChecks({
        options,
        outDir,
        page,
        evaluate,
        settle,
        readTheme,
        clickThemeButton,
        setThemeAttribute,
        setViewport,
        failures,
        warnings,
        consoleErrors,
        viewportResults,
        screenshots,
        report,
        check
      })
    })()

    await Promise.race([run, watchdog])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(message)
    console.error('FAIL ' + message)
  } finally {
    await cleanup()
    report.finishedAt = new Date().toISOString()
    report.durationMs = Date.now() - startedMs
    report.pass = failures.length === 0
    try {
      mkdirSync(outDir, { recursive: true })
      writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
      reportWritten = true
      console.log('')
      console.log('report: ' + displayPath(reportPath))
      console.log((report.pass ? 'PASS' : 'FAIL') + ' ' + options.slug +
        ' — viewports ' + viewportResults.filter(item => item.pass).length + '/' + VIEWPORTS.length +
        ', console errors ' + consoleErrors.length +
        ', screenshots ' + screenshots.filter(item => item.ok).length + '/' + screenshots.length +
        ', failures ' + failures.length + ', warnings ' + warnings.length)
    } catch (error) {
      console.error('FAIL could not write report ' + reportPath + ': ' + error.message)
    }
  }
  return report.pass && reportWritten ? 0 : 1
}

let options
try {
  options = parseArgs(process.argv.slice(2))
} catch (error) {
  console.error('check-blueprint: ' + error.message)
  printUsage()
  process.exit(2)
}

if (options.help) {
  printUsage(process.stdout)
  process.exit(0)
}
if (!options.file || !options.slug) {
  console.error('check-blueprint: --file and --slug are required')
  printUsage()
  process.exit(2)
}
if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(options.slug)) {
  console.error('check-blueprint: --slug must match [A-Za-z0-9._-] (got ' + JSON.stringify(options.slug) + ')')
  process.exit(2)
}

main(options).then(code => {
  process.exit(code)
}).catch(error => {
  console.error('FAIL unhandled: ' + (error instanceof Error ? error.stack || error.message : String(error)))
  process.exit(1)
})
