# @dataops/dsh-dataops-tools

Host 侧工具：把对话意图变成结构化阶段产物，客户端卡片负责渲染。
数据访问在 provider seam 之后：`mock`（默认）/ `cli` / `http`。

| 工具 | 输入 | 产物 `kind` | 卡片 |
|---|---|---|---|
| `dataops_requirement_extract_spec` | `ticketId?` | `requirement` | 需求卡 |
| `dataops_design_compose_model` | `ticketId?`、`targetTable?`、`sources?`、`withImpact?` | `design` | 设计卡 |
| `dataops_shared_read_table` | `table` | `table` | 表卡 |
| `dataops_shared_read_lineage` | `table`、`direction?`、`depth?` | `lineage` | 血缘卡 |
| `dataops_scheme_compose_tech_plan` | `scenario?` | `tech_plan` | 技术方案卡 |
| `dataops_shared_read_evidence` | `scenario?` | `evidence` | 证据卡 |
| `dataops_shared_read_profile` | `scenario?`、`table?` | `profile` | 数据画像卡 |
| `dataops_scheme_analyze_data` | `scenario?` | `analysis` | 分析卡 |
| `dataops_scheme_compose_solution` | `scenario?` | `solution` | 需求方案卡 |
| `dataops_cicd_scan` | `scenario?` | `cicd` | CICD 扫描卡 |
| `dataops_cicd_compile` | `scenario?` | `schedule` | 编译/YAML 卡 |
| `dataops_develop_generate_code` | `scenario?` | `develop` | 开发卡（mock） |
| `dataops_cicd_test` | `scenario?` | `test` | 测试卡（mock） |
| `dataops_cicd_release` | `scenario?` | `release` | P2 legacy；**Stage 5 不使用**，不接 DSH approval |
| `dataops_shared_read_develop` | — | `develop` | 开发验证多产物/attempt fixture |
| `dataops_cicd_pipeline` | `workitemId?` | `cicd` | 一条 mock pipeline + 制品包 + 外部环境只读 |
| `dataops_review_write_postmortem` | `scenario?` | `postmortem` | 复盘卡（mock） |
| `dataops_incident_triage` | `scenario?` | `incident` | 排障卡（mock） |
| `dataops_shared_present_deliverable` | `kind`/`stage`/`deliverable`/`payload` | 交付物 payload | `DeliverableRenderer` |
| `dataops_shared_read_us` | `id?`/`statuses?`/`query?` | `us-picker` / `us` | `USPickerCard` |
| `dataops_shared_read_datamap` | `usId?`/`asset?` | `datamap` | 无卡片（DataMap 数据） |
| `dataops_shared_ensure_workitem` | `source`/`initialStage`/`title?` | `workitem` | 无卡片（去重创建/恢复） |
| `dataops_shared_stage` | `action=prepare/signoff/status` | 阶段 payload / `workitem` | `StageResultCard` |
| `dataops_shared_read_workitem` | `id?` | `workitem` / `workitem-list` | 无卡片（Agent 读取） |
| `dataops_shared_update_workitem` | `id`、`patch`、`dryRun?` | `workitem` | 无卡片（本地原子写） |
| `dataops_shared_read_logs` | `scenario?`、`taskId?`、`timeRange?` | `logs` | 无卡片（排障信号） |

## 工具命名

工具名按 `dataops_<scope>_<action>_<object>`，scope 是 `shared` 或阶段名。

- 共享事实：`dataops_shared_read_table` / `_lineage` / `_evidence`
- 阶段能力：`dataops_requirement_extract_spec`、`dataops_scheme_compose_tech_plan`、`dataops_develop_generate_code`
- CICD：`dataops_cicd_scan`、`dataops_cicd_compile`、`dataops_cicd_test`、`dataops_cicd_release`
- 工作项：`dataops_shared_read_workitem` / `dataops_shared_update_workitem`
- 排障旁路：`dataops_incident_triage` / `dataops_shared_read_logs`

完整 registry（含 planned）见 `src/tool-registry.js`，命名测试见 `scripts/check.mjs`。
`dataops_cicd_compile` 只调用内部 CLI `dataops compile <artifact>`；Agent + SKILL 负责产 spec，tool 不回调 Agent。

`dataops_cicd_release` 执行前调用 DSH 原生 approval；只有 `allowed-once` 才执行 mock release。拒绝/取消/不可用/无服务都 fail closed。

## 数据流

```
模型 -> dataops_design_compose_model({ticketId})
     <- { kind:'design', target:{...}, sources:[...], impact:{...}, asOf, partial, gaps }
客户端 -> tool.call.toolview['dataops_design_compose_model'] -> DesignCard
右栏   -> context-store（轮末定义写入）-> 资产/血缘/证据 tab
```

工具返回两段文本：摘要 + JSON；客户端解析**最后一段 JSON**。

## Provider 配置

默认 `provider: mock`，离线可用。真实接入二选一：

```yaml
# CLI
provider: cli
devops:
  tokenRef: DATAOPS_DEVOPS_TOKEN
  commands:
    ticket: ['dataops', 'ticket', 'get', '--id', '{ticketId}', '--json']
catalog:
  commands:
    table: ['dataops', 'catalog', 'table', '{table}', '--json']
    lineage: ['dataops', 'catalog', 'lineage', '--table', '{table}', '--direction', '{direction}', '--depth', '{depth}', '--json']
```

```yaml
# HTTP
provider: http
devops:
  baseUrlEnv: DATAOPS_DEVOPS_URL
  tokenRef: DATAOPS_DEVOPS_TOKEN
  paths: { ticket: '/api/v1/tickets/{ticketId}' }
catalog:
  baseUrlEnv: DATAOPS_CATALOG_URL
  tokenRef: DATAOPS_CATALOG_TOKEN
  paths:
    table: '/api/v1/tables/{table}'
    lineage: '/api/v1/lineage?table={table}&direction={direction}&depth={depth}'
```

详细字段映射、错误语义、内网验证步骤见 `docs/design/integration.md`。

## Mock 场景

`channel-report`（默认）和 `member-model`；`ticketId` / `targetTable` / `sources` 可覆盖。
开发/测试/发布/复盘/排障数据在 `src/mock.js` 的 `STAGE_FIXTURES`；6 阶段演示见 `docs/design/mock-demo.md`。

## 接真实平台时改哪里

- 优先只改配置，不改代码。
- 如果平台字段名不在别名表里，改 `src/providers/devops.js` / `catalog.js` 的映射。
- 需要新数据源时加一个 provider（`mock`/`cli`/`http` 同接口），工具层和卡片不用动。

## 验证

```sh
cd packages/dataops-tools
npm run check
```

契约断言（含 6 阶段/排障、presenter、workitem 和 lossless JSON）+ 26 个注册项 / 18 个活动工具 smoke + provider-check（本地 HTTP stub、fake CLI、401/404/超时、token 脱敏）。

## 边界

- 读工具只读：不建表、不触发任务、不写工单；`update_workitem` 只写本地工作项，不写平台。
- token 只经 credentials/env；不进 payload、日志、argv。
- 真实 design 的加工逻辑/调度/指标为空并标 gap，不编造。
- `develop/test/release/postmortem/incident` 目前是 mock-only，内网按 `docs/design/mock-to-real.md` 替换。
