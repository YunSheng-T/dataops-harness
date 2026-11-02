/**
 * Mock DeployLog service.
 *
 * DeployLog is keyed by the company-wide deploymentId. It is deliberately
 * separate from RuntimeLog, which is addressed by platform coordinates.
 */
const DEPLOYMENTS = {
  'deploy-20261102-001': {
    deploymentId: 'deploy-20261102-001',
    packageName: 'channel_daily_pkg',
    version: '1.4.0',
    environment: 'sit',
    status: 'success',
    startedAt: '2026-11-02T10:00:00+08:00',
    finishedAt: '2026-11-02T10:06:40+08:00',
    events: [
      { seq: 1, at: '2026-11-02T10:00:00+08:00', phase: 'build', level: 'info', message: '读取制品包 manifest' },
      { seq: 2, at: '2026-11-02T10:01:20+08:00', phase: 'upload', level: 'info', message: '上传制品到 sit 仓库', code: 'PKG_UPLOADED' },
      { seq: 3, at: '2026-11-02T10:03:10+08:00', phase: 'activate', level: 'info', message: '激活制品包 channel_daily_pkg@1.4.0' },
      { seq: 4, at: '2026-11-02T10:06:40+08:00', phase: 'health', level: 'info', message: '部署健康检查通过' }
    ]
  },
  'deploy-20261102-002': {
    deploymentId: 'deploy-20261102-002',
    packageName: 'etl_channel_sync',
    version: '2.1.0',
    environment: 'uat',
    status: 'failed',
    startedAt: '2026-11-02T11:10:00+08:00',
    finishedAt: '2026-11-02T11:12:30+08:00',
    events: [
      { seq: 1, at: '2026-11-02T11:10:00+08:00', phase: 'build', level: 'info', message: '读取制品包 manifest' },
      { seq: 2, at: '2026-11-02T11:11:05+08:00', phase: 'upload', level: 'info', message: '上传制品到 uat 仓库' },
      { seq: 3, at: '2026-11-02T11:12:30+08:00', phase: 'activate', level: 'error', message: '激活失败，目标环境已存在冲突版本', code: 'DEPLOY_CONFLICT' }
    ]
  }
}

function shape(value) {
  return { ...value, events: value.events.map(event => ({ ...event })), source: 'mock', asOf: '2026-11-02T11:15:00+08:00' }
}

export function createMockDeployLogService() {
  function get(deploymentId) {
    const item = DEPLOYMENTS[String(deploymentId || '')]
    if (!item) return { ok: false, error: 'DEPLOYMENT_NOT_FOUND' }
    return { ok: true, kind: 'deploy_log', ...shape(item) }
  }
  return { get }
}
