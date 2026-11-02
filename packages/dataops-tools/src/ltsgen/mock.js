/**
 * Mock LTS generator.
 *
 * This is deliberately a deterministic local stand-in for the internal
 * lts-design-gen jar. It produces the same two observable outputs:
 *
 *   <code-repo>/lts_code/<task>/task.yaml
 *   <code-repo>/output/<package>.zip
 *
 * The real internal adapter must implement the same result shape. It must not
 * be wired into the default profile.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

function zipStore(files) {
  const chunks = []
  const central = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const data = Buffer.from(file.content, 'utf8')
    const crc = crc32(data)
    const { time, day } = dosTime(new Date())
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(day, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    chunks.push(local, name, data)
    const entry = Buffer.alloc(46)
    entry.writeUInt32LE(0x02014b50, 0)
    entry.writeUInt16LE(20, 4)
    entry.writeUInt16LE(20, 6)
    entry.writeUInt16LE(0, 8)
    entry.writeUInt16LE(0, 10)
    entry.writeUInt16LE(time, 12)
    entry.writeUInt16LE(day, 14)
    entry.writeUInt32LE(crc, 16)
    entry.writeUInt32LE(data.length, 20)
    entry.writeUInt32LE(data.length, 24)
    entry.writeUInt16LE(name.length, 28)
    entry.writeUInt16LE(0, 30)
    entry.writeUInt16LE(0, 32)
    entry.writeUInt16LE(0, 34)
    entry.writeUInt16LE(0, 36)
    entry.writeUInt32LE(0, 38)
    entry.writeUInt32LE(offset, 42)
    central.push(entry, name)
    offset += local.length + name.length + data.length
  }
  const centralBuffer = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBuffer.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)
  return Buffer.concat([...chunks, centralBuffer, end])
}

function taskYaml(taskName, packageName) {
  const safe = String(taskName || 'channel_pay_daily').replace(/[^A-Za-z0-9_.-]/g, '_')
  return `formatVersion: 2
tasks:
  - itemName: "DEMO_PROJECT"
    groupName: "DEMO_GROUP"
    name: "${safe}"
    type: "周期任务"
    startTime: "2026/10/20 00:00:00"
    endTime: null
    cronExp: "0 0 2 * * ?"
    depPrevious: "否"
    isCleanTask: "否"
    isMultitonal: "否"
    isParallel: "否"
    isCleanExceptionTask: "否"
    isFullJob: "是"
    scheduleHistory: "否"
    owner: "<OWNER>"
    taskParams: []
    jobs:
      - name: "job_1"
        path: "job_1"
        jobType: shell
        parentJobName: ["start"]
        jobExecPath: "$$JOB_1_SCRIPT$$"
        jobTimeout: 60
        jobRetryTimes: 3
        jobRetryInterval: 60
        jobExecNode: "任一节点"
        jobExceptionHandleType: "fail"
        isCleanJob: "跟随任务"
        parameterEmptyVerify: "否"
        componentResources: "未设置"
`
}

export function generateMockLts(input = {}) {
  const taskName = String(input.taskName || 'channel_pay_daily').replace(/[^A-Za-z0-9_.-]/g, '_')
  const packageName = String(input.packageName || taskName).replace(/[^A-Za-z0-9_.-]/g, '_')
  const base = input.codeRepoRoot
    ? resolve(input.codeRepoRoot)
    : resolve(input.workitemDir || '.', 'deliverables/develop/code-repo')
  const taskPath = join(base, 'lts_code', taskName, 'task.yaml')
  const propertiesPath = join(base, 'lts_code', taskName, 'parameters.properties')
  const outputDir = join(base, 'output')
  const zipPath = join(outputDir, packageName + '.zip')
  const task = taskYaml(taskName, packageName)
  const parameters = 'JOB_1_SCRIPT=<SCRIPT_PATH>\n'
  const manifest = JSON.stringify({
    schemaVersion: 1,
    mock: true,
    packageName,
    taskName,
    taskFile: 'lts_code/' + taskName + '/task.yaml',
    generatedBy: 'dataops-tools/mock-ltsgen'
  }, null, 2) + '\n'
  mkdirSync(dirname(taskPath), { recursive: true })
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(taskPath, task, 'utf8')
  writeFileSync(propertiesPath, parameters, 'utf8')
  const zip = zipStore([
    { name: 'lts_code/' + taskName + '/task.yaml', content: task },
    { name: 'lts_code/' + taskName + '/parameters.properties', content: parameters },
    { name: 'manifest.json', content: manifest }
  ])
  writeFileSync(zipPath, zip)
  const digest = 'sha256:' + createHash('sha256').update(zip).digest('hex')
  return {
    kind: 'ltsgen',
    mode: 'mock',
    source: 'mock',
    taskName,
    packageName,
    codeRepoRoot: base,
    taskPath,
    propertiesPath,
    artifact: { package: zipPath, bytes: zip.length, digest, manifest: 'manifest.json' },
    validation: { ok: true, checks: ['formatVersion=2', 'isFullJob=是', 'cronExp present', 'placeholder preserved'] },
    gaps: []
  }
}

export { zipStore }
