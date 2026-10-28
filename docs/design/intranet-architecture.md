# 内网接入架构：从 Mock Demo 到真实系统

> 状态：架构整理稿 · 2026-10-28  
> 目标：进入内网后，用同一套 UI / Agent / Stage Runtime / Tool 契约接入真实 EDevOps、DataMap、血缘、画像、调度、代码平台和 CICD。  
> 非目标：不 fork 上游 DSH；不把真实发布/回滚放进 DataOps；不实现 Stage 6。

---

## 1. 一句话架构

```text
DSH Runtime
  ├─ Agent Preset / Skills        负责编排与判定口径
  ├─ Web Client Plugin            只渲染 payload、收集用户动作
  ├─ Host Tool Layer              稳定工具契约
  ├─ Domain Adapters              按域接真实系统（本文件重点）
  ├─ Stage Runtime + Workitem     门禁、签收、持久化
  └─ External Systems             EDevOps / DataMap / 血缘 / 画像 / 调度 / 代码 / CICD / 发布
```

不变量：

- **UI 不直连外部系统**；只通过 Host tool 返回的 payload 渲染。
- **Agent 不直连外部系统**；只通过工具和 provider adapter 取事实。
- **外部系统不出现在卡片组件里**；卡片只认 canonical DTO。
- **Provider 可替换**：mock / cli / http 同一接口，线上不靠改 UI 适配。
- **签收、合入、部署、回滚是不同权限域**；不能用一个 actionId 冒充。

---

## 2. 当前架构 vs 目标架构

### 2.1 当前已有的

```text
dataops-client
  ├─ 14 个 toolview / 卡片
  ├─ 阶段简报 / 阶段导航
  ├─ 签收确认层
  └─ 右栏血缘/资产/证据

dataops-tools
  ├─ 19 个活动工具
  ├─ stage runtime / workitem 文件存储
  ├─ provider seam：devops / catalog
  └─ mock / cli / http

dataops-preset + .agents/skills
  ├─ dataops-dev 角色
  ├─ 0+1 → Stage 5 workflow
  └─ 领域技能
```

当前 **真实 provider 只覆盖 devops 和 catalog**；DataMap、血缘、画像、调度、代码平台、CICD、外部环境仍是 fixture / 本地 mock。

### 2.2 目标分层

```text
┌──────────────────────────────────────────────────────────────┐
│ Web Client：卡片、阶段简报、签收确认、右栏、制品清单            │
├──────────────────────────────────────────────────────────────┤
│ Agent Preset + Skills：问什么、何时停、如何判定、如何汇报       │
├──────────────────────────────────────────────────────────────┤
│ Host Tool Layer：稳定 schema + canonical payload + 错误映射    │
├──────────────────────────────────────────────────────────────┤
│ Stage Runtime + Workitem：gate / approval / 持久化 / 审计       │
├──────────────────────────────────────────────────────────────┤
│ Domain Adapters：US / DataMap / Lineage / Profile / Scheduler    │
│                    Code / CICD / Artifact / Release / Identity  │
├──────────────────────────────────────────────────────────────┤
│ Internal Systems：EDevOps / 元数据 / 血缘 / 质量 / 调度 / 代码   │
│                    公司 CICD / 制品库 / 发布平台 / SSO           │
└──────────────────────────────────────────────────────────────┘
```

**关键边界**：Stage Runtime 不关心数据来自哪个 provider；Provider 不关心卡片长什么样。

---

## 3. Domain Adapter 目录

每个 adapter 只暴露**本域**能力；不要把所有能力塞进一个 `catalog`。

| Adapter | 负责 | 不负责 | 首期权限 |
|---|---|---|---|
| `us` | US 列表/详情/状态/指派人 | 写回 US、改状态 | 只读 |
| `datamap` | 场景/主题/业务对象/逻辑实体/物理资产/字段/owner/行数 | 血缘、质量、查询 | 只读 |
| `lineage` | 表级/字段级上下游、任务节点 | 质量、画像 | 只读 |
| `profile` | 画像、分布、空值、join 覆盖、质量快照 | 血缘、调度 | 只读 |
| `scheduler` | 调度 spec / job / 实例 / 日志 / 编译 | 直接触发生产任务 | 只读或受限编译 |
| `code` | 分支/提交/构建/扫描/测试/评审/合入状态 | 代替 Committer 合入 | 只读或受限触发 |
| `cicd` | pipeline run / artifact / manifest / checksum | 代替发布平台部署 | 触发 mock/正式 pipeline（按权限） |
| `release` | dev→sit→uat→beta→gamma 状态、外部审批 ID | 发起公司审批、执行部署/回滚 | 只读 |
| `identity` | 当前用户、角色、组织 | 自造身份 | 只读 |

### 3.1 最小 canonical DTO

所有 adapter 返回**稳定 DTO**，不要泄漏供应商原始字段：

```ts
type SourceMeta = {
  provider: 'mock' | 'edevops' | 'datamap' | 'lineage' | 'profile' | 'scheduler' | 'code' | 'cicd' | 'release'
  mock: boolean
  asOf: string
  requestId?: string
}

type UsSummary = SourceMeta & { id, title, status, owner, priority, assets, acceptance, existingWorkitem? }
type DataMapPath = SourceMeta & { scenario, domain, objects, logicalEntities, assets }
type Asset = SourceMeta & { id, name, assetType: 'warehouse_table'|'lake_table'|'api'|'report', layer, owner, rowCount, fields[], partition, grain }
type LineageGraph = SourceMeta & { nodes[], edges[], direction, depth, truncated }
type ProfileSnapshot = SourceMeta & { table, grain, rowCount, columns[], joinCoverage[], findings[], quality? }
type SchedulerView = SourceMeta & { jobs[], instances[], logs?, timeband? }
type DevelopFacts = SourceMeta & { artifacts[], validation{build,scan,deploy,test}, review, merge }
type PipelineRun = SourceMeta & { runId, commit, stages[], artifact{package,digest,manifest,checksum}, externalDeployment? }
```

规则：

- 缺失字段用 `null` 或省略，不能编造。
- 每个 payload 必须带 `source` / `mock` / `asOf`。
- 大结果有界：最多 N 个节点、N 个字段、N KB；溢出截断并标记 `truncated`。
- 错误映射为 `AUTH | NOT_FOUND | TIMEOUT | RATE_LIMIT | UPSTREAM | INVALID`，UI 只显示可执行提示。

---

## 4. 配置与凭据

### 4.1 配置形状（建议）

```yaml
- id: dataops-tools
  config:
    provider: mock             # 默认安全；线上显式改 http/cli
    timeoutMs: 8000
    retry: 1
    workitemsDir: workitems
    domains:
      us:
        kind: http
        baseUrlEnv: DATAOPS_US_URL
        tokenRef: DATAOPS_US_TOKEN
        paths:
          list: /api/v1/us
          detail: /api/v1/us/{id}
      datamap:
        kind: http
        baseUrlEnv: DATAOPS_DATAMAP_URL
        tokenRef: DATAOPS_DATAMAP_TOKEN
      lineage:
        kind: http
        baseUrlEnv: DATAOPS_LINEAGE_URL
        tokenRef: DATAOPS_LINEAGE_TOKEN
      profile:
        kind: http
        baseUrlEnv: DATAOPS_PROFILE_URL
        tokenRef: DATAOPS_PROFILE_TOKEN
      scheduler:
        kind: cli
        commands:
          jobs: ['dataops', 'scheduler', 'jobs', '--table', '{table}', '--json']
      code:
        kind: cli
        commands:
          build: ['dataops', 'code', 'build', '--branch', '{branch}', '--json']
      cicd:
        kind: http
        baseUrlEnv: DATAOPS_CICD_URL
        tokenRef: DATAOPS_CICD_TOKEN
      release:
        kind: http
        baseUrlEnv: DATAOPS_RELEASE_URL
        tokenRef: DATAOPS_RELEASE_TOKEN
```

### 4.2 凭据规则

- 只通过 `ctx.credentials.resolve(tokenRef)` 或环境变量按次解析。
- token 不进 prompt、卡、日志、错误信息、fixture。
- CLI 传 token 只通过子进程 env，不通过 argv。
- URL 只来自 config/env；模型不能传 URL。
- 内网 TLS / 代理 / CA 由 launcher 环境统一设置；不把证书写进插件。
- 真实模式 `provider` 不允许静默回退到 mock；mock 只在显式配置或 demo profile 使用。

### 4.3 健康检查

启动时做只读 `health()`：

```text
us / datamap / lineage / profile / scheduler / code / cicd / release
```

- 未配置或不可达：UI 显示“未接入”，不显示假数据。
- 401/403：显示权限错误，不提示重试。
- 超时/5xx：有界重试，保留 requestId。

---

## 5. 权限与安全

### 5.1 默认只读

| 动作 | DataOps | 外部系统 |
|---|---|---|
| 读 US/DataMap/血缘/画像/日志 | 允许 | 只读账号 |
| 触发 pipeline | 允许（按权限） | 公司 CICD |
| 合入代码 | 只记录状态 | 代码平台 / Committer |
| 部署/晋级 | 只读状态 | 发布平台 |
| 发布/回滚 | **禁止** | CICD/发布平台 |
| 写 US 状态 | 本版不写 | EDevOps |

### 5.2 Tool 层强制

- 表/资产白名单；
- 查询行数、字节、超时上限；
- 查询必须带时间范围；
- 结果默认汇总，敏感字段脱敏；
- 大结果 spill，返回摘要 + 句柄；
- 不返回任意用户输入的 SQL 拼接（参数化）。

### 5.3 签收与身份

当前：mock actionId + 角色字符串。

内网必须：

```text
SSO user -> session identity
   -> UI signoff action
   -> Host verifies session + role + stage gate
   -> workitem approvals (actor, role, at, actionId, requestId)
```

- `actionId` 不能由模型生成/自签。
- 外部合入/部署审批使用外部系统 ID，不伪造。
- Stage 5 不使用 DSH 原生 approval；公司发布平台负责外部审批。

---

## 6. Workitem 与状态机

当前：`workitems/<id>/item.yaml` 本地文件。

内网选择：

### A. 本地文件（单人/演示）

- 共享卷；
- 原子写 + 文件锁；
- 备份；
- 不适合多人并发。

### B. Workitem Service（推荐多人）

```text
GET/POST /workitems
PATCH /workitems/{id} (revision CAS)
POST /workitems/{id}/approvals
GET /workitems/{id}/audit
```

- `item.yaml` 仍可作为导出格式；
- `revision` 乐观锁；
- 签收幂等（actionId）；
- 审计：谁、何时、什么角色、哪个 gate、哪个 commit；
- 状态迁移只由 Stage Runtime 执行。

迁移：

1. 保持本地文件 adapter；
2. 加 `WorkitemStore` 接口；
3. 文件 adapter 先兼容；
4. 接 service 后切换配置；
5. 不改变 UI/payload。

---

## 7. 内网部署架构

### 7.1 运行形态

```text
用户浏览器
  └─ 内网 DSH Web（profile=dataops）
       ├─ Host plugin: dataops-tools
       ├─ Client plugin: dataops-client
       └─ Agent preset: dataops-dev
```

或桌面端 DSH Desktop，同样加载 profile。

### 7.2 离线安装

- 不依赖公网 npm；
- 打包 `dataops-client` / `dataops-brand` / `dataops-tools` / preset；
- 锁定 DSH 版本（`0.2.1-rc.2/rc.3`）；
- 用内部 registry 或离线 tarball；
- `scripts/install-dataops-profile.mjs` 在内网执行；
- 无 CDN / 外部字体 / 外部图片。

### 7.3 网络

- 只开必要域名/端口；
- 代理、TLS、CA 由环境提供；
- 每个 adapter 独立 baseUrl/timeout；
- 禁止模型传入 URL。

---

## 8. 观测与错误

最低要求：

```json
{
  "requestId": "...",
  "domain": "datamap",
  "operation": "asset",
  "status": "ok|error",
  "errorClass": "AUTH|NOT_FOUND|TIMEOUT|UPSTREAM|INVALID",
  "latencyMs": 123,
  "truncated": false
}
```

- 不记录 token、完整 SQL、生产行数据、用户敏感信息。
- 工具错误带对象、阶段、下一步；不吞异常。
- 每个外部调用有超时/重试/熔断阈值。
- /healthz 只读检查。

---

## 9. 测试策略

| 层 | Mock | 内网 |
|---|---|---|
| Adapter contract | fixture + fake transport | 真实只读接口 |
| Tool | lossless JSON + schema | provider-check |
| Stage runtime | temp workitem | 共享存储 |
| UI | 截图 + 浏览器 e2e | 内网浏览器 |
| 安全 | token 不泄漏 | 真实凭据/权限 |

- 所有真实响应先脱敏再进 fixture；
- mock/live 同一 canonical DTO；
- 先用只读账号，禁止生产写；
- Stage 4/5 真实执行前，必须接外部审批/Committer 权限。

---

## 10. 迁移顺序

```text
0. 冻结当前 mock demo（tag/commit）
1. 建 Domain Adapter 接口 + canonical DTO + config 形状
2. 接 US 只读（EDevOps）
3. 接 DataMap + Lineage + Profile 只读
4. 接 Scheduler 只读/编译
5. 接 Code 平台（build/scan/test/review/merge 状态）
6. 接 CICD pipeline + artifact + manifest/checksum
7. 接 Release 环境只读（dev→gamma）
8. 接 SSO + Workitem Service
9. 关闭 mock fallback（生产 profile）
10. 内网 e2e / 验收 / 运维手册
```

每一步都必须保持：

- 卡片 payload 不变或向后兼容；
- mock 测试继续通过；
- 真实失败能定位；
- 不把 mock 结果说成生产事实。

---

## 11. 进入内网前必须确认

1. DSH 是桌面端还是 Web？Node/runtime 版本？
2. EDevOps 提供 API 还是 CLI？认证方式？只读账号？
3. DataMap / 血缘 / 画像是否同一网关？字段/权限？
4. 调度平台是否允许读取 job/实例/编译？是否允许 DataOps 触发？
5. 代码平台如何取 build/scan/test/review/merge？谁是 Committer？
6. CICD pipeline 如何触发？制品包由谁生成/存储？manifest/checksum 格式？
7. 发布平台只读 API 与外部审批 ID 字段？
8. Workitem 是共享卷还是服务？多人并发要求？
9. SSO/角色映射？BA/SE/Dev/Committer 如何对应组织角色？
10. 哪些表/字段禁止出内网或禁止进模型上下文？

---

## 12. 当前明确缺口

- `dataops-tools` 只有 devops/catalog 两个真实 adapter；
- DataMap、lineage、profile、scheduler、code、cicd、release 仍为 fixture/mock；
- stage 4/5 的 build/scan/deploy/test/pipeline 是本地 mock；
- workitem 是本地 YAML，无并发锁/SSO；
- signoff 是 mock actionId，不是生产身份；
- CICD legacy release 仍走 DSH approval，但 Stage 5 流程不使用；
- 客户端 toolview 当前 14 个，README/部分旧设计文档计数未完全同步；
- 真实部署/发布/回滚未接，且不应由 DataOps 执行。

---

## 13. 架构原则（给内网开发）

1. **先只读，后写**；先元数据，后执行。
2. **一个域一个 adapter**；不要做万能 `catalog`。
3. **DTO 稳定，UI 不变**；内部字段差异在 adapter 归一。
4. **权限在工具层**，不靠 prompt。
5. **签收在 Host 验证**，不靠模型自报。
6. **外部审批/合入/部署不替代**；DataOps 只记录。
7. **失败可诊断**：对象、阶段、requestId、下一步。
8. **mock 与 live 同一合同**；不维护两套卡。
9. **无公网依赖**；离线可安装。
10. **Stage 6 不提前做**。
