# 架构治理：耦合、定制与低内聚清单

> 基线：`v0.1.0-mock`（2026-10-28）  
> 目的：进入内网前先认清哪些是演示代码、哪些可以保留、哪些必须先治理。  
> 原则：不为了“整洁”重写已验证的链路；先拆边界，再换 provider。

---

## 1. 结论先行

当前 Demo 链路是**可演示的**，但还不是**可长期维护的内网架构**。主要问题不是功能缺失，而是：

1. **演示语义和生产语义混在同一层**：fixture、stage runtime、真实 provider、UI 共用 tool payload。
2. **Host/Client 两边的阶段契约有重复**：阶段顺序、kind、gate、review 状态在多个文件各写一份。
3. **真实接入只完成 devops/catalog 两个域**，其余仍是 fixture；新增的 domain adapter 只是接口骨架，未接线。
4. **身份/签收仍是 mock**，不能带进真实内网；签收还依赖浏览器 DOM 点击发送按钮。
5. **部分历史能力未退出**：Stage 6 的 review 仍留在 host/template；legacy `release` 代码仍存在（profile 已禁用）。
6. **大文件低内聚**：`cards.js`、`index.js`、`workitem-store.js`、`brief.js` 都超过 500 行，且同时承担 UI、契约、存储、编排。

---

## 2. 问题清单

### P0 · 进入内网前必须处理

| # | 问题 | 证据 | 影响 | 处理 |
|---|---|---|---|---|
| P0-1 | 签收依赖 Agent 回合 | `window.__dataopsCompose` + 点击发送按钮 | 模型弱/慢时签收体验差；无法保证持久化 | 增加 Host 侧签收服务或明确“Agent 回合”契约；不要伪装成同步写 |
| P0-2 | 身份是 mock | stageSignoff 校验 `role` + `actionId` | 生产不可审计/可冒签 | SSO 身份 + Host 验证 + workitem approvals |
| P0-3 | Workitem 本地 YAML | `workitem-store.js` 文件读写 | 多人并发/丢写/无服务化 | WorkitemStore 接口；文件 adapter 保留；接服务 |
| P0-4 | 真实 provider 只有两个域 | `providers/devops.js`、`catalog.js` | DataMap/血缘/画像/调度/代码/CICD/发布仍是 mock | 按 `domain-adapters.js` 逐域接入 |
| P0-5 | Stage 4/5 执行仍是本地 mock | fixtures/develop.js、pipeline-package.js | 不能把 mock build/pipeline 当真实结果 | 接代码平台与 CICD；明确 mock 标记 |
| P0-6 | Legacy release 仍可注册 | `dataops_cicd_release` 代码/工具面 | 与 Stage 5 无 DSH approval 的边界冲突 | profile 已禁用；代码标记 legacy，禁止进入 Stage 5 |
| P0-7 | Stage 6 残留 | `STAGES` / template 仍有 review；UI 已隐藏 | 概念混淆 | 保留兼容字段但文档/模板标“不在本版” |

### P1 · 内网开发第一阶段治理

| # | 问题 | 证据 | 影响 | 处理 |
|---|---|---|---|---|
| P1-1 | 阶段契约重复 | `brief.js STAGES`、`workitem-store STAGES`、template、docs | 改阶段要改 4 处，容易不一致 | 定义共享 `stage-contract`（Host/Client 各自轻量镜像，由测试校验） |
| P1-2 | kind/gate 映射重复 | `DELIVERABLE_KINDS`、`KIND_STAGE`、`GATE_ROLES` | 新 kind 容易漏 | 同一契约表 + contract test |
| P1-3 | UI 直接做字段归一 | `DataMapPath` level 推断、review 合并 | provider 差异泄漏到组件 | 在 adapter 归一为 canonical DTO；客户端只渲染 |
| P1-4 | 卡片 CSS 内联 | `cards.js` 约 300 行 CSS | 难复用/主题治理 | 抽 `styles.js`；只保留 token/变体 |
| P1-5 | `window.__dataops*` 全局桥 | `index.js` DraftBridge/SignoffHost | 多 session/多插件易冲突；难测 | 改为显式 client service 或受限 bridge，集中在单一模块 |
| P1-6 | tool index 巨型 | `index.js` 781 行 | 工具/provider/presenter/seed 混在一起 | 按 domains / presenter / stage 拆模块 |
| P1-7 | 历史内容工具仍在 registry | legacy content tools | 模型可能误用 | 保持 disabled；在 registry 标 legacy，不进入活动面 |
| P1-8 | 文档计数/状态漂移 | README/部分旧设计写 16/6 段 | 交接误导 | 新增 `architecture-index` 状态标记；旧文档保留但标历史 |

### P2 · 上线前治理

| # | 问题 | 处理 |
|---|---|---|
| P2-1 | 依赖 DSH 内部 UI 插槽 | 固定 DSH 版本；升级清单；对 turnTail/input.dock/tabs 做兼容测试 |
| P2-2 | 卡片 UI 与 Stage 状态耦合 | 统一 StageViewModel；卡片只收 view model |
| P2-3 | 测试多为 fixture | 内网 adapter contract + 真实只读 smoke；脱敏 fixture |
| P2-4 | 无真实观测/requestId | provider/tool 统一 requestId、错误分类、延迟日志 |
| P2-5 | 离线安装未验证 | 内网 tarball/registry；无 CDN；Node/DSH 版本锁定 |
| P2-6 | 无数据分级/脱敏策略 | 表白名单、字段过滤、结果上限、日志脱敏 |

---

## 3. 哪些是“演示定制”，不要带进内网

| 演示实现 | 位置 | 内网替代 |
|---|---|---|
| `fixtures/*` 固定数据 | `packages/dataops-tools/src/fixtures` | Domain adapter |
| `seed-dataops-demo.mjs` | `scripts/` | 只保留为演示/回归，不用于生产 |
| Stage 4 attempt fixture | `fixtures/develop.js` | Code/CICD adapter |
| Stage 5 本地 tar.gz | `pipeline-package.js` | 公司 CICD/制品库 |
| 外部环境 mock | `fixtures/cicd.js` | Release adapter 只读 |
| 浏览器 DOM 发送按钮 | `index.js` | Host signoff service |
| 本地 `item.yaml` | `workitem-store.js` | Workitem service |
| 5 段阶段导航 | `brief.js` | 共享阶段契约 |

---

## 4. 目标边界

```text
Client cards
  ← StageViewModel (canonical)
Stage runtime
  ← WorkitemStore + Identity
Tools
  ← DomainAdapter (canonical DTO)
DomainAdapter
  ← HTTP/CLI/MCP transport
External systems
```

禁止：

- UI 组件里出现供应商字段名。
- Agent 自己判断权限/自签。
- provider 静默回退 mock。
- Stage 5 使用 DSH 原生 approval。
- 卡片直接把 fixture 当生产事实。

---

## 5. 已完成的治理动作

- [x] `v0.1.0-mock` 基线 tag
- [x] 新增 `providers/domain-adapters.js`：9 个域、mock/http/cli 骨架
- [x] 清理 `dataops-demo` 的 6 阶段/release 过时说明
- [x] workflow 删除 `approvals[gate=release]` 旧规则
- [x] profile 禁用 legacy `dataops_cicd_release`
- [x] Stage 4 评审/合入从重复两个签收 panel 收敛为一条 gate row
- [x] 阶段契约单一来源生成 + host/client 生成文件 + contract test
- [x] WorkitemStore seam + 文件锁 + revision CAS + 审计基础
- [x] Host signoff service + exact route + client fetch（mock identity；SSO 后置）
- [x] Stage 4 build failure 分支、重编译入口、build/scan 门禁
- [x] Stage 4/5 1024/1440/1600/1920、暗色、0 console error
- [x] Stage 6 从阶段导航移除，5/5
- [x] 内网接入架构/ADR 0012

## 6. 下一步治理顺序

1. **P0-1/P0-2**：Host 签收服务/身份 — 不依赖模型回合。
2. **P0-3**：WorkitemStore 接口 + 文件 adapter 锁定/审计。
3. **P1-1/P1-2**：共享 stage/gate/kind 契约 + 测试。
4. **P0-4**：US → DataMap/Lineage/Profile 只读 adapter。
5. **P0-5**：Code → Stage 4；CICD → Stage 5。
6. **P1-3/P1-4/P1-5**：UI view model、CSS 拆分、bridge 收敛。
7. **P2**：观测、数据分级、离线部署。

## 7. 验收标准

- 任何 provider 切换不要求改卡片/Agent skill。
- 真实模式失败时 UI 不显示 mock 结果。
- 签收身份可审计，模型不能自签。
- Stage 5 无 DSH approval、无发布/回滚。
- 阶段/kind/gate 只有一张契约表通过测试。
- `cards.js`/`index.js`/`workitem-store.js` 拆分后单文件职责可一句话说明。
- 内网 e2e 至少覆盖 US 只读、DataMap、Stage 4 失败回流、Stage 5 制品包。

---

## 8. 处理节奏：现在做 vs 内网后做

### 现在就能做（不依赖内网）

| 项 | 预计 | 产出 |
|---|---|---|
| 阶段/gate/kind 共享契约 + contract test | 1–2 迭代 | 消除 `brief.js` / `workitem-store.js` / template / docs 四处重复 |
| `cards.js` CSS/卡片拆分，`index.js` 拆分 | 2–3 迭代 | 单文件职责可一句话说明；降低改 UI 碰 Host 的风险 |
| `WorkitemStore` 接口 + 文件 adapter 锁/CAS/审计 | 2–3 迭代 | 可切换 service 而不改 UI/payload |
| Host 签收服务接口 + mock 身份 | 2–3 迭代 | 不再依赖 Agent 回合/DOM 点击；SSO 后续替换 |
| UI view model + 阶段简报/失败态/窄屏打磨 | 1–2 迭代 | 弱模型下更自解释；不增加 Agent 负担 |
| 离线打包/内网安装脚本 + 无公网依赖检查 | 1–2 迭代 | 进入内网可直接部署 |
| contract/lossless/权限边界测试 | 持续 | 防回归 |

### 需要内网/凭据/接口后才能做

| 项 | 依赖 |
|---|---|
| US 真实只读 adapter | EDevOps API/CLI、认证、网络 |
| DataMap / Lineage / Profile adapter | 各平台 API/权限/字段映射 |
| Scheduler adapter | 调度平台接口/权限 |
| Code / Stage 4 真实 build/scan/deploy/test | 代码平台/环境/Committer 权限 |
| CICD / 制品包 / 外部环境 | 公司 CICD、制品库、发布平台 |
| SSO/组织角色 | 内网身份系统 |
| Workitem Service | 内网存储/并发/权限 |
| 真实脱敏/数据分级 | 内网数据策略 |

### 建议排期

```text
第 1 轮（本地）：阶段契约 + 签收服务设计 + UI 简报/失败态
第 2 轮（本地）：卡片/CSS/工具文件拆分 + WorkitemStore 接口
第 3 轮（本地）：离线打包与内网安装演练
第 4 轮（内网）：US 只读 → DataMap → Lineage → Profile
第 5 轮（内网）：Scheduler → Code/Stage4 → CICD/Stage5 → Release 只读
第 6 轮（内网）：SSO/Workitem Service → 内网 e2e/验收
```

每轮独立提交；升级上游/接真实 provider 不混在一个 commit。
