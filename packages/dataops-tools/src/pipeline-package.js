/**
 * Build a small, valid mock data artifact bundle for the Stage 5 demo.
 * This is deliberately a local tar.gz, not a real release artifact.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const FILES = [
  ['sql/etl.sql', '-- mock Stage 5 artifact\nselect 1;\n'],
  ['etl/etl_channel_pay.yaml', 'kind: etl\nname: channel_pay\nmock: true\n'],
  ['schedule/channel_pay_daily.yaml', 'kind: schedule\nname: channel_pay_daily\ncron: "0 5 * * *"\n'],
  ['api/channel_metrics_api.yaml', 'kind: data_consume_api\nname: channel_metrics\nmock: true\n'],
  ['ops/deploy.sh', '#!/bin/sh\necho mock artifact; no deployment performed\n'],
  ['tests/test-report.md', '# mock tests\n\n- manual: true\n- automated: false\n']
]

function sha256(buffer) {
  return 'sha256:' + createHash('sha256').update(buffer).digest('hex')
}

function tarHeader(name, size, mode = 0o644) {
  const header = Buffer.alloc(512, 0)
  const write = (value, offset, length) => header.write(value.slice(0, length), offset, length, 'utf8')
  write(name, 0, 100)
  write(mode.toString(8).padStart(7, '0') + '\0', 100, 8)
  write('0000000\0', 108, 8)
  write('0000000\0', 116, 8)
  write(size.toString(8).padStart(11, '0') + '\0', 124, 12)
  write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0', 136, 12)
  write('        ', 148, 8)
  header[156] = 0x30
  write('ustar\0', 257, 6)
  write('00', 263, 2)
  write('root', 265, 32)
  write('root', 297, 32)
  write('0000000\0', 329, 8)
  write('0000000\0', 337, 8)
  write('', 345, 155)
  let sum = 0
  for (const byte of header) sum += byte
  write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8)
  return header
}

function tarGz(files) {
  const chunks = []
  for (const file of files) {
    const data = Buffer.from(file.content, 'utf8')
    chunks.push(tarHeader(file.name, data.length), data)
    const pad = (512 - (data.length % 512)) % 512
    if (pad) chunks.push(Buffer.alloc(pad, 0))
  }
  chunks.push(Buffer.alloc(1024, 0))
  return gzipSync(Buffer.concat(chunks), { level: 9 })
}

export function buildPipelinePackage(root, workitemId, options = {}) {
  const version = options.version || '1.0.0'
  const target = options.target || 'dws.trade_channel_daily'
  const commit = options.commit || 'abc1234'
  const dir = join(root, workitemId, 'deliverables', 'cicd', 'artifact')
  const reportDir = join(root, workitemId, 'deliverables', 'cicd', 'reports')
  mkdirSync(dir, { recursive: true })
  mkdirSync(reportDir, { recursive: true })

  const files = FILES.map(([name, content]) => ({ name, content }))
  const checksums = files.map(file => sha256(Buffer.from(file.content, 'utf8')) + '  ' + file.name)
  const manifest = {
    kind: 'dataops-artifact-manifest',
    schemaVersion: 2,
    mock: true,
    target,
    version,
    commit,
    files: files.map((file, index) => ({ path: file.name, sha256: checksums[index].split('  ')[0] }))
  }
  const manifestText = JSON.stringify(manifest, null, 2) + '\n'
  const checksumText = checksums.join('\n') + '\n'
  const packageName = 'dataops-' + target + '-' + version + '.tar.gz'
  const packageBytes = tarGz([
    ...files,
    { name: 'manifest.json', content: manifestText },
    { name: 'checksums.txt', content: checksumText }
  ])
  writeFileSync(join(dir, packageName), packageBytes)
  writeFileSync(join(dir, 'manifest.json'), manifestText, 'utf8')
  writeFileSync(join(dir, 'checksums.txt'), checksumText, 'utf8')
  writeFileSync(join(reportDir, 'pipeline.log'), '[mock] pipeline build/scan/test/package completed\n', 'utf8')
  return {
    package: 'artifact/' + packageName,
    packagePath: join(dir, packageName),
    digest: sha256(packageBytes),
    manifest: 'artifact/manifest.json',
    checksum: 'artifact/checksums.txt',
    version,
    files: manifest.files
  }
}
