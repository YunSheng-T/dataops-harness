# DataOps 内网对接交接说明

> 时间：2026-10-28  
> 本地基线：`v0.2.0-local-ready`  
> 适用范围：把当前 mock-first DataOps 工作台接入内网真实系统  
> 不包含：Stage 6；真实部署、发布、回滚；上游 DSH 修改

## 1. 一句话状态

本地 P0–P2 已完成并通过 11 项验收；P3/P6/P7/P9 的真实系统接入尚未验证，已有 adapter/config/CLI 骨架，等内网 CLI 与 SSO 参数。

## 2. 当前实现范围

| 层 | 状态 |
|---|---|
| Stage 0+1 US/需求 | mock 完整；US 已支持 `domains.us` CLI 读取路径 |
| Stage 2 设计/DataMap | mock 完整 |
| Stage 3a/3b/3c | mock 完整 |
| Stage 4 开发验证 | mock 多产物 + 失败回流 + SE/Committer 门禁 |
| Stage 5 CICD | mock pipeline + 真实 tar.gz/manifest/checksum + 外部环境只读 |
| Stage 6 | 不实现、不展示 |
| 签收 | Host route + mock identity + audit；不依赖 Agent |
| Workitem | 本地 YAML + 文件锁 + revision CAS |
| Provider | domains 9 域骨架；devops/catalog 旧 seam；US CLI 路径已接 |
| 离线安装 | 离线包 + 安装自检 + health/config 校验 |

## 3. 关键目录

```text
packages/dataops-client/       UI 卡片、阶段简报、签收确认、右栏
packages/dataops-tools/        Host 工具、provider、stage runtime、workitem
packages/dataops-preset/       Agent preset
profiles/dataops/              profile patch
.agents/skills/                DataOps 技能
contracts/stage-contract.json  阶段/kind/gate 单一来源
docs/design/                  架构与阶段设计
docs/decisions/               ADR
docs/ops/                     内网安装/provider 配置/交接
scripts/                      构建、离线包、检查、demo seed、e2e
```

## 4. 内网启动步骤

```sh
# 1. 构建
node packages/dataops-client/scripts/build.mjs
node packages/dataops-brand/scripts/build.mjs

# 2. 安装 profile（自动安装用户级 skills 并自检）
node scripts/install-dataops-profile.mjs --home /path/to/DSH_HOME
node scripts/install-dataops-skills.mjs

# 3. 启动
DSH_HOME=/path/to/DSH_HOME dsh --profile dataops
```

离线包：

```sh
node scripts/pack-dataops-offline.mjs
```

## 5. 真实接入顺序

### P3 EDevOps US CLI

配置：

```yaml
domains:
  us:
    kind: cli
    tokenRef: DATAOPS_US_TOKEN
    commands:
      list: ['edevops', 'us', 'list', '--json']
      ticket: ['edevops', 'us', 'get', '--id', '{ticketId}', '--json']
```

需要内网确认：

- CLI 命令/参数
- list/detail JSON
- token 注入环境变量
- 退出码

接好后 USPicker 的 `source` 应为 `edevops`、`mock=false`。

### P6 Code / Stage 4

当前 `dataops_shared_read_develop` 仍返回 mock。需要：

- build / scan / test / review / merge status CLI
- branch/commit 参数
- JSON 与退出码
- Committer 只记录外部合入，不执行 merge

### P7 CICD CLI / Stage 5

当前有 CLI runner 和 `cicd.kind=cli` 分支：

```yaml
domains:
  cicd:
    kind: cli
    tokenRef: DATAOPS_CICD_TOKEN
    commands:
      run: ['dataops', 'cicd', 'run', '--target', '{target}', '--commit', '{commit}', '--json']
      status: ['dataops', 'cicd', 'status', '--run-id', '{runId}', '--json']
      artifact: ['dataops', 'cicd', 'artifact', '--run-id', '{runId}', '--json']
      logs: ['dataops', 'cicd', 'logs', '--run-id', '{runId}', '--json']
```

需要：

- `run` 是同步还是异步
- status 枚举
- artifact 路径/manifest/checksum 格式
- 超时/失败退出码
- 不允许静默回退 mock

### P9 SSO

设计见 [identity-sso.md](../design/identity-sso.md)。

当前：

- `createSignoffService` 可注入 identity
- `createAdapterIdentity` 可把 `identity` 域转成签收身份
- `GET /api/dataops/identity`
- `POST /api/dataops/signoff`
- approvals + audit

需要内网提供：

- SSO 协议/claims
- BA/requester/SE/Dev/Committer 角色来源
- Host 获取身份方式
- 审计落盘位置

## 6. 安全边界

- 不 fork 上游 DSH。
- token 不进 prompt、日志、卡片、fixture。
- 默认只读；真实写操作必须外部审批。
- Stage 5 不使用 DSH 原生 approval；外部审批归发布平台。
- DataOps 不执行 merge/deploy/release/rollback。
- mock 不得冒充生产事实。
- Stage 6 不实现、不展示。

## 7. 验证入口

```sh
node scripts/verify-local.mjs
```

覆盖：

```text
client/tools check + smoke
stage contract
preset/workitem
provider config/health
offline surface
stage0-5 contract
```

浏览器验证：

```sh
node scripts/e2e/dataops-p1.4.mjs --scenario stage4-ui --keep
node scripts/e2e/dataops-p1.4.mjs --scenario stage4-failed-ui --keep
node scripts/e2e/dataops-p1.4.mjs --scenario stage5-ui --keep
node scripts/e2e/dataops-p1.4.mjs --scenario committer-ui --keep
node scripts/e2e/dataops-p1.4.mjs --scenario journey-ui --keep
```

## 8. 已知未完成

- 真实 EDevOps US CLI 未验证
- 真实 Code CLI / Stage 4 未接
- 真实 CICD CLI / Stage 5 未验证
- 真实 SSO/角色映射未接
- 外部发布环境只读未接
- Workitem Service/多用户未接
- P1 UI 仍有空态/密度细节可继续
- 本轮部分 Git 提交因网络未推送到远端

## 9. 内网材料清单

请提供：

```text
edevops us --help
edevops us list --json 样例
edevops us get --id ... --json 样例

code CLI build/scan/test/review/merge 的 --help 与 JSON
cicd CLI run/status/artifact/logs 的 --help 与 JSON
成功/失败 pipeline 各一份输出
artifact / manifest / checksum 样例
SSO claims / 角色映射 / Host 身份注入方式
DSH runtime 版本与网络策略
```

拿到这些后按 P3 → P6 → P7 → P9 顺序接，不改 UI/payload 主契约。
