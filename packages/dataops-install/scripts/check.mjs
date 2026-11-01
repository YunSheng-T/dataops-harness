import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compareVersions, findVersion, isSubpath, listSkillNames, parseVersion, satisfiesRange } from '../src/lib.mjs'

assert.equal(parseVersion('0.2.1-rc.2').prerelease.join('.'), 'rc.2')
assert.ok(compareVersions('0.2.1-rc.2', '0.2.1-rc.3') < 0)
assert.ok(compareVersions('0.2.1-rc.3', '0.2.1') < 0)
assert.ok(compareVersions('0.2.1', '0.2.2') < 0)
assert.ok(compareVersions('0.2.1-rc.2', '0.2.1') < 0)
assert.ok(satisfiesRange('0.2.1-rc.2'))
assert.ok(satisfiesRange('0.2.1-rc.3'))
assert.ok(satisfiesRange('0.2.1'))
assert.ok(satisfiesRange('0.2.9'))
assert.ok(!satisfiesRange('0.2.1-rc.1'))
assert.ok(!satisfiesRange('0.3.0'))
assert.ok(!satisfiesRange('0.3.0-alpha.1'))
assert.ok(!satisfiesRange('0.2.2-alpha.1'))
assert.ok(!satisfiesRange('0.1.9'))
assert.equal(findVersion('dsh: 0.2.1-rc.2'), '0.2.1-rc.2')

const root = mkdtempSync(join(tmpdir(), 'dataops-install-check-'))
try {
  mkdirSync(join(root, 'alpha'), { recursive: true })
  writeFileSync(join(root, 'alpha', 'SKILL.md'), '# alpha\n')
  mkdirSync(join(root, 'beta'), { recursive: true })
  writeFileSync(join(root, 'beta', 'README.md'), 'not a skill\n')
  assert.deepEqual(listSkillNames(root), ['alpha'])
  assert.ok(isSubpath(root, join(root, 'alpha')))
  assert.ok(!isSubpath(root, join(root, '..', 'outside')))
} finally {
  rmSync(root, { recursive: true, force: true })
}

console.log('dataops install check: PASS')
