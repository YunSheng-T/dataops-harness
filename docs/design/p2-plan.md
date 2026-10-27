# P2 实施计划：工具收敛与 Deliverable Renderer

> 状态：P2 已完成。P2.1/P2.2/P2.3 已实现；活动工具面 12，客户端 9 toolview。
> 前置：[P1 总结](p1-summary.md)、[Agent 编排架构](agent-orchestration.md)、[ADR 0004](../decisions/0004-agent-workbench-orchestration.md)
> P2.0：[设计](p2-tool-convergence.md) · [ADR 0005](../decisions/0005-deliverable-renderer-tool-convergence.md) · [全量蓝图](../../prototype/p2-tool-convergence-blueprint.html) · [增量蓝图](../../prototype/p2-tool-convergence-blueprint-delta.html)

> 术语：Deliverable = 阶段交付物；Artifact = CICD 构建制品，二者不混用。

## 1. 目标

把 16 个“阶段/内容工具”收敛为 12 个原子能力：

- 事实：4
- CICD 动作：4
- 工作项：2
- 排障信号：1
- 展示桥：1

同时保持：

- 用户仍然从需求开始，不报工具名
- 阶段卡、阶段 brief、右栏体验不退化
- 发布仍需 DSH 原生审批
- 工作项可恢复、可审计

## 2. 目标工具面

| 类别 | 工具 | 说明 |
|---|---|---|
| 保留 | `dataops_shared_read_table` | 表元数据 |
| 保留 | `dataops_shared_read_lineage` | 血缘 |
| 保留 | `dataops_shared_read_evidence` | 证据 |
| 保留 | `dataops_shared_read_profile` | 画像 |
| 保留 | `dataops_cicd_scan` | 扫描 |
| 保留 | `dataops_cicd_compile` | 编译，调内部 CLI |
| 保留 | `dataops_cicd_test` | 测试 |
| 保留 | `dataops_cicd_release` | 发布，DSH approval |
| 新增 | `dataops_shared_read_workitem` | 读工作项/阶段/审批 |
| 新增 | `dataops_shared_update_workitem` | 更新工作项，校验 schema/状态 |
| 新增 | `dataops_shared_read_logs` | 排障日志/告警只读信号 |
| 新增 | `dataops_shared_present_deliverable` | 把结构化 deliverable 渲染成卡片 |

迁出/替换：

- `dataops_requirement_extract_spec`
- `dataops_design_compose_model`
- `dataops_scheme_analyze_data`
- `dataops_scheme_compose_solution`
- `dataops_scheme_compose_tech_plan`
- `dataops_develop_generate_code`
- `dataops_review_write_postmortem`
- `dataops_incident_triage`（拆成 `read_logs` + 排障技能）

## 3. 关键契约

### 3.1 Deliverable

```json
{
  "kind": "tech_plan",
  "stage": "scheme",
  "deliverable": "deliverables/tech-plan.yaml",
  "status": "draft",
  "payload": {},
  "source": "agent",
  "asOf": "2026-10-26T...",
  "gaps": []
}
```

### 3.2 Presenter

`dataops_shared_present_deliverable` 只做：

1. 校验 `kind` / `stage` / `deliverable` / `payload` 的基本结构；
2. 把同一 payload 交给 client 的 `DeliverableRenderer` dispatcher；
3. 更新上下文/阶段 brief；
4. 不生成内容、不判断业务、不写平台。

client 新增：

- `DeliverableRenderer`：按 `kind` 分发到现有 Requirement/Design/Solution/TechPlan/Develop/Postmortem 等卡。
- `TOOL_VIEWS` 只注册 presenter + 事实/动作工具，不再注册内容工具。
- 旧卡片组件保留，输入契约不变。

### 3.3 Workitem tools

P2 先文件适配：

- `read_workitem(id?)`：返回 `item.yaml`、阶段、approvals、deliverables；
- `update_workitem(id, patch)`：校验允许字段/阶段枚举/状态迁移，写回并追加 `plan.md`；
- 非法阶段/审批字段拒绝；
- 不把 `approvals` 当权限来源；release 仍由 DSH approval 决定。

P3 再服务化。

## 4. 工作切片

### P2.0 设计定稿（先不写运行时）

- 更新全量架构蓝图 + P2 增量蓝图（16→12、content→skills、presenter 契约）。
- 新增/更新 ADR：工具收敛、Deliverable Renderer、旧内容工具兼容期。
- 明确 stage skill 切分：先评估一个 `dataops-delivery` 技能还是按阶段拆。
- 明确旧工具下线策略：从 profile 移除注册或 config 关闭，代码保留到兼容期结束。

**验收**：蓝图、增量、ADR、契约先评审通过；不改工具/客户端。

> P2.0 已确认，P2.1/P2.2 已落地；P2.3 全阶段已迁到技能+presenter，活动工具面 12，P2.4 做代码/卡片收口。

### P2.1 Presenter + 卡片 dispatcher（已实现）

- 新增 `DeliverableRenderer` 和 `TOOL_VIEWS` 新映射。
- 旧卡片组件不改视觉，只接受 presenter payload。
- 用 mock deliverable 做非回归：需求/设计/方案/开发/复盘卡片逐张对比。
- 这是一个“并存”切片：旧工具仍可用，presenter 也可用。

**验收**：同一 payload 经 presenter 渲染出的卡与旧卡一致；stage brief 更新；0 console error。

### P2.2 工作项 + 排障信号工具（已实现）

- 新增 read/update workitem、read logs。
- `workitem-protocol`/`dataops-workflow` 改用工具而不是直接 fs。
- 增加非法迁移、缺失字段、approval 只读等测试。
- `incident_triage` 拆为 read_logs + pipeline-debug 技能；旧 incident 卡保留兼容。

**验收**：工作项工具能恢复/更新；非法更新 fail closed；排障不污染主链阶段。

### P2.3 内容迁移（全部阶段已实现）

顺序建议：

1. 需求/设计/方案：技能生成正文 → presenter 渲染；5 个旧内容工具退出活动工具面（已实现）。
2. 开发/复盘：已迁移；复盘卡有 renderer 单测。
3. 排障：已迁移（read_logs + pipeline-debug + incident presenter）。
4. P2.4：注册表/客户端 toolview 收口。

每个阶段都保留旧工具作为兼容，直到卡片/技能/e2e 全通过。

### P2.4 收口（已实现）

- 从 profile 移除旧内容工具注册，保留代码/测试 fixture 到下一个版本。
- 工具注册表目标 12；更新 naming/registry 测试。
- 更新 preset 文案、README、mock-demo、agent blueprint。
- 重跑 P1.4 e2e：query / full-allow / full-reject。

## 5. 验收标准

- 目标工具面 12 个；不再有内容生成 tool。
- 卡片全部通过 presenter 渲染，视觉与 P1 一致。
- 用户提示词不含工具名；最终回答不暴露工具名。
- 工作项由 read/update 工具维护；非法状态迁移被拒绝。
- release 仍只有 `allowed-once` 才执行；拒绝路径无发布。
- P1.4 三个场景 PASS。
- 旧工具退出活动面；兼容期策略有文档。
- 蓝图/增量/ADR 与实现一致。

## 6. 风险与对策

| 风险 | 对策 |
|---|---|
| presenter 成为“万能工具” | 只做 schema 校验 + 展示，不生成内容；限制字段 |
| 卡片 dispatcher 回归 | 每个 kind 做 golden payload 对比测试 |
| 技能替代工具后模型质量下降 | 先一个阶段 pilot，保留旧工具对比 |
| 工具面收敛导致 preset 不可用 | P2.0 决定静态 allowlist/tool policy；先保留旧工具回退 |
| workitem 工具写坏状态 | schema + 允许字段 + 状态迁移校验；写前备份/失败关闭 |
| 旧会话/旧卡片断裂 | 兼容期保留旧工具和组件；不删除历史 payload 解析 |
| e2e 受模型波动 | 状态断言优先；固定 mock scenario；不要把措辞当契约 |

## 7. 不在 P2

- 真实 DataMap/调度/CICD/审批接入（P3）
- workitem 服务化/并发/权限（P3）
- Agent Team/子代理编排（P3+）
- UI 重做、阶段模型改动
- 新工具命名/新阶段插件

## 8. P2 首个动作

**先写 P2.0 蓝图与增量，不写运行时。**

产物：

- `prototype/p2-tool-convergence-blueprint.html`
- `prototype/p2-tool-convergence-blueprint-delta.html`
- `docs/design/p2-tool-convergence.md`
- ADR：presenter / 工具收敛 / 兼容期

确认后再进入 P2.1 Presenter。
