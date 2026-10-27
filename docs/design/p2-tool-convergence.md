# P2：工具收敛与 Deliverable Renderer

> 状态：P2 已完成。活动工具面 12；客户端 9 个 toolview；8 个旧内容工具保留为 registry/兼容 fixture，不再注册到活动 profile。
> 前置：[P1 总结](p1-summary.md)、[Agent 架构](agent-orchestration.md)、[ADR 0004](../decisions/0004-agent-workbench-orchestration.md)
> 可视化：[全量蓝图](../../prototype/p2-tool-convergence-blueprint.html) · [增量蓝图](../../prototype/p2-tool-convergence-blueprint-delta.html)

## 1. 决策摘要

P2 把工具面从 **16 个阶段/内容工具** 收敛为 **12 个原子能力**：

- 4 个事实读取
- 4 个 CICD 动作
- 2 个工作项读写
- 1 个排障信号读取
- 1 个 deliverable 展示桥

内容生成（需求/设计/方案/开发/复盘正文）由 **Agent + 技能**完成；卡片由 **DeliverableRenderer** 按 `kind` 分发。

**不做**：presenter 生成内容、presenter 代替审批、按阶段新增插件、P2 内做真实平台。

## 2. 目标工具面

| 类别 | 工具 | P2 动作 |
|---|---|---|
| 事实 | `dataops_shared_read_table` | 保留 |
| 事实 | `dataops_shared_read_lineage` | 保留 |
| 事实 | `dataops_shared_read_evidence` | 保留 |
| 事实 | `dataops_shared_read_profile` | 保留 |
| CICD | `dataops_cicd_scan` | 保留 |
| CICD | `dataops_cicd_compile` | 保留，调内部 CLI |
| CICD | `dataops_cicd_test` | 保留 |
| CICD | `dataops_cicd_release` | 保留，DSH approval 硬门禁 |
| 工作项 | `dataops_shared_read_workitem` | 新增，文件适配 |
| 工作项 | `dataops_shared_update_workitem` | 新增，校验 patch/阶段 |
| 排障 | `dataops_shared_read_logs` | 新增，只读日志/告警 |
| 展示 | `dataops_shared_present_deliverable` | 新增，deliverable → 卡片 |

迁出活动工具面：

- `dataops_requirement_extract_spec`
- `dataops_design_compose_model`
- `dataops_scheme_analyze_data`
- `dataops_scheme_compose_solution`
- `dataops_scheme_compose_tech_plan`
- `dataops_develop_generate_code`
- `dataops_review_write_postmortem`
- `dataops_incident_triage`

## 3. Deliverable 契约

> `Deliverable` 是阶段产物；`Artifact` 仅指 CICD 编译/构建制品，两者不混用。

```json
{
  "kind": "tech_plan",
  "stage": "scheme",
  "deliverable": "deliverables/tech-plan.yaml",
  "status": "draft",
  "payload": { "tasks": [], "estimate": "2 人日", "risks": [] },
  "source": "agent",
  "asOf": "2026-10-26T18:00:00+08:00",
  "gaps": []
}
```

允许的 content kind：

| kind | stage | 卡片 |
|---|---|---|
| `requirement` | requirement | RequirementCard |
| `design` | design | DesignCard |
| `analysis` | scheme | AnalysisCard |
| `solution` | scheme | SolutionCard |
| `tech_plan` | scheme | TechPlanCard |
| `develop` | develop | DevelopCard |
| `postmortem` | review | PostmortemCard |
| `incident` | incident | IncidentCard |

`profile/table/lineage/evidence` 仍由对应事实工具 + toolview 渲染，不走 presenter。

## 4. Presenter 契约

### 输入

```json
{
  "kind": "tech_plan",
  "stage": "scheme",
  "deliverable": "deliverables/tech-plan.yaml",
  "status": "draft",
  "payload": {},
  "source": "agent",
  "asOf": "2026-10-26T18:00:00+08:00",
  "gaps": []
}
```

### 输出

```json
{
  "kind": "tech_plan",
  "stage": "scheme",
  "deliverable": "deliverables/tech-plan.yaml",
  "status": "draft",
  "payload": {},
  "source": "agent",
  "asOf": "2026-10-26T18:00:00+08:00",
  "gaps": [],
  "presented": true
}
```

输出必须是 **payload 平铺 + kind 元数据**，这样现有卡片 `parseModel(block, kind)` 不改。

### 校验

presenter 只做结构校验：

- `kind` 在允许列表
- `stage` 与 `kind` 映射一致（incident 除外）
- `deliverable` 是安全相对路径；不允许 `..`
- `payload` 是 JSON object
- `status` 在 `draft/reviewed/approved/blocked`
- payload 大小上限（建议 256 KB）
- 缺 required 字段 → 返回结构化错误，不生成内容、不猜测

presenter **不**：
- 生成/改写 payload
- 读写 workitem
- 调 DSH approval
- 回调 Agent
- 访问外部平台

## 5. DeliverableRenderer

### 5.1 它是什么，为什么叫 Deliverable

`DeliverableRenderer` **不是一张新的业务卡**，也不是 deliverable 本身。它是 P2 新增的 **toolview 分发器**：只有一个 presenter 工具，需要把不同 `kind` 的交付物交给现有卡片渲染。

```text
deliverable（阶段交付物 + 结构化 payload）
  → DeliverableRenderer（按 kind 分发）
  → RequirementCard / DesignCard / TechPlanCard / ...
```

为什么叫 **Deliverable**，而不是 Artifact：

| 术语 | 用途 |
|---|---|
| **Artifact** | 只保留给 CICD 编译/构建产物（构建制品包）；内部已有稳定含义，不再拿来指阶段产物 |
| **Deliverable** | 阶段交付物：需求、设计、方案、技术方案、代码、复盘、排障 deliverable 的正文/规格 |
| **Payload** | deliverable 内部的结构化内容，供卡片渲染 |
| **WorkItem** | 整体工作项，包含多份 deliverable、evidence、approval |

为什么不用其他名字：
- `ResultCard`：所有 tool 结果都叫 result，太泛。
- `StageCard`：一个阶段有多份 deliverable（方案 4 步）。
- `WorkitemCard`：一个 workitem 有多份 deliverable。
- `Artifact`：会和 CICD 构建制品重名，语义冲突。
- `Document`：代码/排障产物不都是 document。

所以：
- 对外展示叫“交付物”；
- 工具叫 `dataops_shared_present_deliverable`；
- 内部组件叫 `DeliverableRenderer`，明确它是渲染/分发，不是新业务卡；
- 具体卡仍叫 `RequirementCard`、`DesignCard`、`TechPlanCard`。

client 新增一个分发器：

```text
dataops_shared_present_deliverable
        │
        ▼
DeliverableRenderer
  ├─ kind=requirement → RequirementCard
  ├─ kind=design      → DesignCard
  ├─ kind=analysis    → AnalysisCard
  ├─ kind=solution    → SolutionCard
  ├─ kind=tech_plan   → TechPlanCard
  ├─ kind=develop     → DevelopCard
  ├─ kind=postmortem  → PostmortemCard
  └─ kind=incident    → IncidentCard
```

- `TOOL_VIEWS` 注册 `presenter -> DeliverableRenderer`。
- P2.4 不再注册内容工具的 toolview。
- 现有卡片组件保留，输入契约不变。
- `stage brief` / `context-store` 继续按 `kind` 解析；presenter 输出含 kind。
- 卡片历史 payload 仍可解析，不删除旧展示逻辑。

## 6. 工作项工具

### `dataops_shared_read_workitem`

参数：`{ id? }`；不传 id 时读取当前工作项或返回可用列表，由 Agent 选择。

返回：`item.yaml` 的结构化字段、阶段、deliverables、gaps、approvals、next；不返回原始大文件。

### `dataops_shared_update_workitem`

参数：

```json
{
  "id": "2026-10-26-channel-report-pay-caliber",
  "patch": {
    "stage": "scheme",
    "substage": "analysis",
    "next": "补订单数基线",
    "gaps": [],
    "approvals": []
  }
}
```

规则：

- 只允许 patch：`stage/substage/status/stages/next/gaps/approvals/deliverables/evidence`。
- `stage` 只能是 6 阶段；`stages` 状态只能是 `pending/in_progress/blocked/awaiting_approval/done`。
- 非法 stage/status/未知字段 → 拒绝，不落盘。
- 路径只允许 `workitems/<id>/item.yaml`，拒绝 traversal。
- 写入原子化：临时文件 + rename；写前校验，失败不变更。
- 审批记录可以写，但**不构成权限**：release 仍由 DSH approval 决定。
- 每次成功更新追加 `plan.md` 一行（时间 + patch 摘要）。
- 写回是规范化 YAML；注释不保证保留，长叙述放 `plan.md`/`decision.md`。

P2 是文件适配；P3 服务化后 API 不变。

## 7. 排障与日志

`dataops_shared_read_logs`：

- 参数：`taskId?`、`timeRange?`、`scenario?`
- 只读返回：时间线、错误码、上下游任务、最近运行、证据摘要
- 不返回根因结论；根因叙述由 `pipeline-debug` 技能完成
- 结果通过 presenter 以 `incident` 卡展示

`dataops_incident_triage` 退出活动工具面。

## 8. 内容技能

- `dataops-workflow` 保留：入口、路由、阶段、门禁、恢复。
- 新增 `dataops-deliverable-templates`：需求/设计/分析/方案/技术方案/开发/复盘/排障的 deliverable 模板、必填项、质量清单。
- 领域技能继续复用：`sql-review`、`model-review`、`lineage-impact`、`pipeline-debug`、`schedule-yaml`、`workitem-protocol`。
- 不把内容模板拆成 8 个工具；先一个模板技能，若上下文压力大再按阶段拆。

## 9. 工具面与 preset

P2 先做**静态 12 工具面**：

- 内容工具从 profile 注册中移除；代码保留到兼容期结束。
- `dataops-dev` 看到 12 个原子能力。
- 按角色/阶段动态裁剪（`dataops-review`、`batch` 等）推迟到 P3；P2.0 不假装已经实现。

这是对 ADR 0004 中“preset 工具面”的阶段性实现：P2 先做到“内容工具不在活动面”，角色隔离后续补。

## 10. 迁移

### P2.1 Presenter + DeliverableRenderer（已实现）

- 新增 `dataops_shared_present_deliverable`、`DeliverableRenderer`、TOOL_VIEWS。
- 过渡期工具面为 17；旧内容工具仍注册，做 golden 对比。
- 不改变用户入口、工作项、审批。

### P2.2 工作项 / 日志工具（已实现）

- 新增 `dataops_shared_read_workitem`、`dataops_shared_update_workitem`、`dataops_shared_read_logs`。
- 新工作项写 `deliverables/`；旧 `artifacts/` 可读。
- 更新 workflow/workitem 技能；旧内容工具仍注册。
- 测试非法 patch、路径 traversal、非法 stage。

### P2.3 内容迁移（全部阶段已实现）

- 已迁移 requirement/design/scheme/develop/review：`dataops-deliverable-templates` + `pipeline-debug` 产 deliverable → presenter → 卡；profile 隐藏 8 个旧内容工具。
- 旧工具代码保留为兼容/测试 fixture，但不在 P2.3 活动工具面。
- P1.4 full-allow / full-reject 已验证：需求/设计/方案/开发 deliverables、presenter 卡片、审批和最终回答都通过；复盘卡由 renderer 单测覆盖；incident e2e 通过。
- 排障：`dataops_shared_read_logs` + `pipeline-debug` + incident presenter；`incident_triage` 退出活动面。

### P2.4 收口（已实现）

- 从 profile 移除 8 个旧内容工具注册；客户端移除 8 个内容 toolview。
- `tool-registry` 目标 12；旧实现保留为 compatibility fixture。
- 更新 docs/blueprints/mock-demo。
- 重跑 P1.4 三场景。

## 11. 测试

- Presenter：合法/非法 kind、stage 不匹配、payload 非 object、路径 traversal、超限。
- DeliverableRenderer：8 个 kind 的 golden payload → 现有卡 DOM 断言。
- Workitem：read/update、非法字段、非法迁移、原子写、plan 追加。
- Logs/incident：只读、无根因结论、presenter 渲染。
- Tool surface：活动注册恰好 12；旧内容工具不注册（代码存在）。
- E2E：query / full-allow / full-reject / incident 通过；用户提示词不含工具名。
- Stage brief/context 按 kind 更新。

## 12. 验收

- 12 个活动工具。
- 不再有内容生成 tool。
- 8 类 deliverable 经 presenter 渲染，视觉与 P1 一致。
- 工作项由工具维护；非法变更 fail closed。
- release 仍只 `allowed-once`。
- P1.4 三场景 PASS。
- 蓝图/增量/ADR 与实现一致。
- 旧的 8 个工具退出活动面，无别名误导模型。

## 13. 风险

| 风险 | 对策 |
|---|---|
| presenter 变成内容生成 | 只校验/透传；禁止修改 payload |
| DeliverableRenderer 分发回归 | 8 类 golden + 现有卡测试 |
| 技能生成质量下降 | 先 requirement/design pilot，与旧卡对比 |
| workitem 工具写坏文件 | patch allowlist + 原子写 + 失败关闭 |
| 旧工具消失导致演示断 | 兼容期代码保留；P2.4 才退出注册 |
| 角色工具面仍未隔离 | P3 做；P2 文档明确边界 |

## 14. P2.0 出口

本设计、ADR 0005、全量蓝图和增量蓝图评审通过后，才进入 P2.1。
