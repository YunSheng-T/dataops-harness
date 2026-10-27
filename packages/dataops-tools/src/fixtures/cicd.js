export const CICD_AS_OF = '2026-10-27T17:00:00+08:00'

export const CICD_PIPELINE = {
  kind: 'cicd',
  schemaVersion: 2,
  stage: 'cicd',
  source: 'mock-cicd',
  mock: true,
  asOf: CICD_AS_OF,
  target: 'dws.trade_channel_daily',
  status: 'succeeded',
  commit: 'abc1234',
  pipelineRunId: 'run-20261027-001',
  artifact: {
    package: 'artifact/dataops-dws.trade_channel_daily-1.0.0.tar.gz',
    digest: 'sha256:7f4a...mock',
    manifest: 'artifact/manifest.json',
    checksum: 'artifact/checksums.txt',
    version: '1.0.0'
  },
  pipeline: {
    build: 'passed',
    scan: 'passed',
    test: 'manual',
    package: 'passed',
    stages: [
      { id: 'build', name: 'Build', status: 'passed', startedAt: '16:40:01', endedAt: '16:40:18', log: 'reports/build.log' },
      { id: 'scan', name: 'Scan', status: 'passed', startedAt: '16:40:18', endedAt: '16:41:02', log: 'reports/scan.json', checks: ['作业数 48/50', '并发 4/4', '无阻断规则'] },
      { id: 'test', name: 'Test', status: 'manual', startedAt: '16:41:02', endedAt: '16:41:10', log: 'reports/test.md', note: '平台无自动化测试，人工记录' },
      { id: 'package', name: 'Package', status: 'passed', startedAt: '16:41:10', endedAt: '16:41:22', log: 'reports/package.log' }
    ]
  },
  externalDeployment: {
    platform: 'company-release-platform',
    approvalId: 'RLS-20261027-001',
    environments: [
      { name: 'dev', status: 'deployed', deployedAt: '17:02', approval: 'approved' },
      { name: 'sit', status: 'deployed', deployedAt: '17:18', approval: 'approved' },
      { name: 'uat', status: 'pending', deployedAt: null, approval: 'pending' },
      { name: 'beta', status: 'pending', deployedAt: null, approval: 'pending' },
      { name: 'gamma', status: 'pending', deployedAt: null, approval: 'pending' }
    ]
  },
  reports: [
    { type: 'log', path: 'reports/pipeline.log' },
    { type: 'scan', path: 'reports/scan.json' },
    { type: 'test', path: 'reports/test.md' }
  ],
  gaps: []
}
