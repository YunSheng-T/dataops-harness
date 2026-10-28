# 真实数据接入：devops + 元数据/血缘

> **历史/局部参考**：本文件只覆盖早期 devops + catalog provider seam。当前 9 域接入、凭据/身份/部署边界见 [内网接入架构](intranet-architecture.md) 与 [ADR 0012](../decisions/0012-real-provider-boundary.md)。

> 状态：已实现 provider seam、HTTP/CLI 适配、6 个工具、客户端上下文与卡片增量；内网只需填配置。
> 工具包：`packages/dataops-tools`；客户端：`packages/dataops-client`。

---

## 1. 工具面

| 工具 | 输入 | 输出 `kind` | 数据源 |
|---|---|---|---|
| `dataops_requirement_extract_spec` | `ticketId?` | `requirement` | devops |
| `dataops_design_compose_model` | `ticketId?`、`targetTable?`、`sources?`、`withImpact?` | `design` | devops + catalog |
| `dataops_shared_read_table` | `table` | `table` | catalog |
| `dataops_shared_read_lineage` | `table`、`direction?`、`depth?` | `lineage` | catalog |
| `dataops_scheme_compose_tech_plan` | `scenario?` | `tech_plan` | 仍为 mock（等设计平台接口） |
| `dataops_shared_read_evidence` | `scenario?` | `evidence` | 仍为 mock（等查询接口） |

每个工具返回两段文本：人读摘要 + JSON payload；客户端解析最后一段 JSON 渲染卡片。

> `develop` / `test` / `release` / `postmortem` / `incident` 当前是 mock-only；内网映射到 ETL/调度、质量平台、变更/CICD、复盘、告警/值班，见 `docs/design/mock-to-real.md`。

---

## 2. Provider seam

```
dataops_* ─► providers.devops / providers.catalog
              ├─ mock  离线 fixture（默认）
              ├─ cli   execFile + 参数模板，stdout 必须是 JSON
              └─ http  fetch + Bearer token + 超时/重试
```

- 全局 `provider` 选默认，`devops.kind` / `catalog.kind` 可按域覆盖。
- 默认 `mock`，离线演示和测试不受影响。
- MCP 不包进组合工具：已有 MCP server 继续用原生 `mcp-client` 行挂载给模型做临时查询；组合工具需要确定性 JSON，v1 走 CLI/HTTP。后续可加 `kind: mcp`。

### 2.1 CLI 配置

```yaml
- id: dataops-tools
  name: '@dataops/dsh-dataops-tools'
  config:
    provider: cli
    timeoutMs: 8000
    devops:
      tokenRef: DATAOPS_DEVOPS_TOKEN
      commands:
        ticket: ['dataops', 'ticket', 'get', '--id', '{ticketId}', '--json']
    catalog:
      tokenRef: DATAOPS_CATALOG_TOKEN
      commands:
        table: ['dataops', 'catalog', 'table', '{table}', '--json']
        lineage: ['dataops', 'catalog', 'lineage', '--table', '{table}', '--direction', '{direction}', '--depth', '{depth}', '--json']
```

- 命令是数组，**不走 shell**；`{ticketId}` / `{table}` / `{direction}` / `{depth}` 只接受标量并校验。
- token 通过子进程环境变量传入（变量名 = `tokenRef`），不出现在 argv。
- stdout 必须是 JSON；stderr 不进入模型可见错误；超时 8s，输出上限 1 MB。

### 2.2 HTTP 配置

```yaml
- id: dataops-tools
  name: '@dataops/dsh-dataops-tools'
  config:
    provider: http
    timeoutMs: 8000
    retry: 1
    devops:
      baseUrlEnv: DATAOPS_DEVOPS_URL
      tokenRef: DATAOPS_DEVOPS_TOKEN
      paths:
        ticket: '/api/v1/tickets/{ticketId}'
    catalog:
      baseUrlEnv: DATAOPS_CATALOG_URL
      tokenRef: DATAOPS_CATALOG_TOKEN
      paths:
        table: '/api/v1/tables/{table}'
        lineage: '/api/v1/lineage?table={table}&direction={direction}&depth={depth}'
```

- URL 只来自 config/env，模型不能传 URL。
- `Authorization: Bearer <token>`；token 由 `ctx.credentials.resolve(tokenRef)` 按次解析，缺失回退 `process.env[tokenRef]`。
- 仅 GET；网络错误/5xx 重试 1 次；401/403、404、超时、非 JSON 分别映射为可执行错误。
- DSH 的 `fetch` 已由 launcher 安装全局代理，`HTTPS_PROXY` 等自动生效。

### 2.3 token

放在 `~/.dsh/.env`：

```sh
DATAOPS_DEVOPS_TOKEN=...
DATAOPS_CATALOG_TOKEN=...
DATAOPS_DEVOPS_URL=https://devops.internal
DATAOPS_CATALOG_URL=https://catalog.internal
```

不要在 patch、日志、卡片 payload 里写 token；错误信息也做了脱敏。

---

## 3. 字段映射

devops 票据用别名容忍不同接口：

| 目标 | 别名 |
|---|---|
| id | `id` / `ticketId` / `code` |
| title | `title` / `name` |
| goal | `description` / `detail` / `summary` |
| priority | `priority` / `level` |
| owner | `owner` / `assignee.name` / `assignee` |
| status | `status` / `state` |
| acceptance | `acceptance` / `acceptanceCriteria`（数组或换行/分号文本） |
| impacts | `assets` / `tables` / `impactedAssets` |
| links | `links` / `url` |

catalog 表字段别名：`tableName/name`、`ownerName`、`zone`、`granularity`、`partitionColumn`、`rowCount/rows`、`fields/columns`。

缺失字段不编造：`partial: true` + `gaps[]`，卡片显示“待补充”。

---

## 4. 设计组合流程

`dataops_design_compose_model`：

1. 有 `ticketId` → 先取需求；目标表取需求里的第一个表资产，或显式 `targetTable`。
2. 取目标表元数据（粒度/分区/owner）。
3. 来源表：显式 `sources`，否则取血缘上游 depth 1；最多 5 个，并行取元数据。
4. `withImpact !== false` 时取下游 depth 1，生成 `design.impact`。
5. 单个子请求失败 → 记 gap，已取到的字段照常返回。
6. 真实模式下加工逻辑/调度/指标暂时为空，并写入 3 条 gap（等设计平台接口）；mock 模式仍是完整示例。

`dataops_shared_read_table` / `dataops_shared_read_lineage` 分别返回表卡和血缘卡；样例见 `docs/design/user-surface.md`。

---

## 5. 客户端行为

- 新增 `TableCard`、`LineageCard` 两个 toolview；现有卡片增加 `source/asOf/partial/gaps/impact` 展示。
- 新增 `context-store`（按 sessionId）：轮末定义把本 turn 的所有 `dataops_*` payload 写进 store。
- 右栏「资产/血缘/证据」改为读 store：有数据展示真实内容，没有则显示空状态“还没有上下文”，不再用静态示例。
- 每个会话的右栏标签仍由 DSH 原生按 session 记忆。
- 卡片和 tab 只读 store，不发请求、不缓存业务数据。

---

## 6. 验证

```sh
cd packages/dataops-tools && npm run check
# 11 条契约断言（含 lossless JSON）+ 6 工具注册 smoke + provider-check
# provider-check：本地 HTTP stub + fake CLI，覆盖 requirement/design/table/lineage、
# 401/404/超时、token 不泄露
```

真机（内网）：

1. 在 `~/.dsh/.env` 配 URL/token（或 CLI 命令）。
2. 改 `~/.dsh/profiles/dataops/cordis.patch.yml` 的 `dataops-tools.config` 为对应 provider。
3. `dsh --profile dataops`，新会话说：
   > 调用 dataops_requirement_extract_spec，ticketId=REQ-xxxx
   > 再调用 dataops_design_compose_model，ticketId=REQ-xxxx
4. 需求卡出现真实标题/验收/影响；设计卡出现真实来源 owner/行数和下游影响；右栏资产/血缘填充。
5. 错 token / 不存在的表应显示授权或未找到提示，不出现 token。

---

## 7. 边界与已知缺口

- 只读：不写工单、不建表、不触发任务。
- `dataops_scheme_compose_tech_plan` / `dataops_shared_read_evidence` 仍是 mock，等设计平台和查询接口。
- tool payload 必须是无损 JSON：可选字段用 `null` 或省略，不能是 `undefined`；`check.mjs` 有专门的 lossless 断言。
- 真实 design 的加工逻辑/调度/指标为空并标 gap，由数据开发补充；这是有意的“不编造”。
- 血缘先做表级；字段级后续扩展 `lineage` DTO 和卡片。
- CLI 依赖宿主机 PATH；HTTP 依赖内网可达和 token。
- MCP 仍以原生 server 挂载，不作为组合工具后端。
