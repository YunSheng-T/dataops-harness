# Mock → 真实平台：内网改造清单

> 现在仓库里跑的是 mock；内网拉仓后只改数据访问层和配置，**客户端、工具名、payload kind 不动**。
> 真实接入设计见 `docs/design/integration.md`。

## 1. 不要改的东西

- `packages/dataops-client` 全部：卡片、右栏、阶段 chip、简报、交互。
- 16 个工具名和参数。
- payload 的 `kind`：`requirement` / `design` / `table` / `lineage` / `tech_plan` / `evidence` / `develop` / `test` / `release` / `postmortem` / `incident`。
- 右栏三个 tab 的 id：`@dataops/dsh-dataops-client/asset|lineage|evidence`。
- 只读默认；写操作仍走现有变更/CICD/审批系统。

## 2. 要改的四个点

### 2.1 配置

`~/.dsh/.env`：

```sh
DATAOPS_DEVOPS_URL=...
DATAOPS_DEVOPS_TOKEN=...
DATAOPS_CATALOG_URL=...
DATAOPS_CATALOG_TOKEN=...
```

`~/.dsh/profiles/dataops/cordis.patch.yml` 的 `dataops-tools.config`：

```yaml
provider: http   # 或 cli
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

### 2.2 需求/表/血缘

- 字段映射在 `packages/dataops-tools/src/providers/devops.js` / `catalog.js`。
- 平台字段对不上时只改别名表，不改工具。
- 新增字段（比如真实变更单、SLA）进 payload 前先保证 `lossless JSON`：可选字段用 `null` 或省略。

### 2.3 开发 / CICD / 复盘 + 排障

当前方案/CICD/复盘/排障工具直接读 mock fixtures。内网按实际系统替换：

| 工具 | 真实来源建议 | 需要的字段 |
|---|---|---|
| `dataops_shared_read_profile` | 查询引擎/数据画像 | 行数、空值、重复、候选键、join 覆盖 |
| `dataops_scheme_analyze_data` | 查询引擎/指标平台 | 基线、差异、发现、证据 |
| `dataops_scheme_compose_solution` | 无外部系统（组合上游产物） | 范围、决策、替代方案、验收映射 |
| `dataops_develop_generate_code` | ETL/调度平台任务实例 | 任务名、平台、owner、状态、进度、阻塞 |
| `dataops_cicd_scan` | 代码扫描/策略平台 | SQL/YAML/安全/策略检查 |
| `dataops_cicd_compile` | 内部 CLI `dataops compile` | YAML、诊断、exitCode、编译产物 |
| `dataops_cicd_test` | 质量平台/对账任务 | 用例、结论、差异、质量、SLA |
| `dataops_cicd_release` | 变更/CICD | changeId、窗口、策略、审批、回滚 |
| `dataops_review_write_postmortem` | 复盘文档/指标平台 | 目标/实际、问题、行动项 |
| `dataops_incident_triage` | 告警/值班/工单 | 时间线、根因、影响面、处置、证据 |

替换方式：在 `src/index.js` 里把对应 `run*` 从 `mock.get*` 换成新的 provider 调用；payload 结构保持不变即可。

### 2.4 测试 fixture

- 把 `packages/dataops-tools/tests/fixtures/` 换成脱敏真实返回。
- 不要提交生产数据；用合成/脱敏样例。
- `npm run check` 必须仍然通过，特别是：
  - `every mock tool payload is lossless JSON`
  - `six-stage mock and incident payloads are complete`
  - provider-check 的 401/404/超时/token 脱敏

## 3. 内网落地顺序

1. 拉仓，`node packages/dataops-client/scripts/build.mjs`、`node packages/dataops-brand/scripts/build.mjs`。
2. `node scripts/install-dataops-profile.mjs`（默认 `~/.dsh/profiles/dataops`）。
3. 配 `.env` 和 `dataops-tools.config`，先 `provider: mock` 确认能启动。
4. 切 `http` 或 `cli`，用只读账号跑 `dataops_requirement_extract_spec` / `dataops_shared_read_table`。
5. 换真实 fixture，跑 `packages/dataops-tools && npm run check`。
6. 真机：一条真实需求 → 设计卡；一张真实表 → 表卡；一次血缘 → 右栏。
7. 再逐阶段接方案/开发/CICD/复盘/排障；每接一个只改 provider，不动客户端。

## 4. 验收清单

- [ ] mock 模式下 6 阶段和排障仍可演示（离线）。
- [ ] 真实 provider 下 401/404/超时提示可执行，token 不出现在 payload/日志。
- [ ] 需求卡字段缺失进 `gaps`，不编造。
- [ ] 设计卡来源 owner/行数/影响来自真实目录。
- [ ] 客户端不改一行，卡片和右栏正常。
- [ ] 只读；写操作没有新增入口。
- [ ] 新机器安装后 `dsh --profile dataops` 可启动，不碰 desktop profile。
