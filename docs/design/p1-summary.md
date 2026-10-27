# P1 总结：从工具目录到需求驱动

> 状态：已完成。P1.1–P1.4 均通过验收。
> 术语说明：P1 阶段用 **artifact** 指阶段产物；P2.0 起统一改为 **deliverable**（交付物），**artifact** 只保留给 CICD 编译/构建制品。
> 相关：[agent-orchestration.md](agent-orchestration.md)、[Agent 架构蓝图](../../prototype/agent-architecture.html)、[ADR 0004](../decisions/0004-agent-workbench-orchestration.md)


## 1. 一句话

**用户说需求，数据开发模式接单；工作项记录阶段，DSH 原生审批守发布。**

P1 把“12 个工具名驱动的演示”改成了“业务入口 + 可恢复交付链”。

## 2. 已完成功能

### P1.1 数据开发模式（Agent preset）

- 新增 `@dataops/dsh-dataops-preset` profile bundle。
- preset id：`dataops-dev`；显示名：**数据开发模式**。
- 默认加载 DataOps Lead persona、`dataops-workflow`、`workitem-protocol`。
- 工具面包含 skill / fs / ask-user / todo / present / compaction，不接真实平台。
- profile 默认使用数据开发模式，可在模式菜单切回标准/PTC/极简/创造模式。

**价值**：用户面对的是一个 DataOps 角色，不是通用 coding agent，也不是工具目录。

### P1.2 工作项 v0

- 新增 `workitems/_template/`：`item.yaml`、`intent.md`、`plan.md`、`decision.md`、`artifacts/`、`evidence/`。
- `item.yaml` 同时记录：
  - 总生命周期 `status`（沿用 workitem-protocol）
  - 6 阶段 `stage` / `stages` / `substage`
  - `gaps`、`approvals`、`next`
- `workitem-protocol` 增加 delivery overlay；`dataops-workflow` 增加建/恢复工作项、阶段更新、恢复规则。
- 增补 `scripts/check-dataops-workitem.mjs`，校验模板、阶段字段、artifact/evidence 引用。

**价值**：关掉会话再回来，Agent 知道做到哪、下一步是什么；阶段产物可 diff、可审计。

### P1.3 发布审批硬门禁

- `dataops_cicd_release` 执行前调用 DSH 原生 `ctx.approval.request`。
- 只有 `allowed-once` 才执行 mock release；`rejected` / `cancelled` / `unavailable` / 无服务一律 fail closed。
- 不接受 Agent 自报 `approved: true` 或 mock token。
- `ReleaseCard` 支持待审批、审批不可用、已拒绝、已取消、已执行。
- 发布结果回写工作项 `approvals[release]` 和 `decision.md`。

**价值**：审批从“模型自觉”变成“工具层硬门禁”；拒绝路径可证明没有发布。

### P1.4 自然语言全流程验收

新增 [scripts/e2e/dataops-p1.4.mjs](../../scripts/e2e/dataops-p1.4.mjs)：

| 场景 | 结果 |
|---|---|
| `query` 只读影响面 | PASS，不建工作项 |
| `full-allow` 完整流程 + 原生审批允许 | PASS，released |
| `full-reject` 完整流程 + 原生审批拒绝 | PASS，rejected，不发布 |

断言覆盖：

- 用户提示词不含 `dataops_*`
- 自动建 delivery 工作项，六阶段字段齐全
- artifact / evidence 引用存在
- `approvals[release]` 与审批结果一致
- 最终回答不暴露工具名
- 拒绝后不出现“已发布”

**价值**：P1 不是纸上架构，有一条可重复的自然语言验收链。

## 3. 用户价值

1. **入口变了**：从“调用哪个工具”变成“我要解决什么”。
2. **上下文不断**：工作项落盘，跨轮/跨会话可恢复。
3. **审批可信**：DSH 原生审批决定发布，工作项只做记录。
4. **证据可追**：每个阶段产出 artifact/evidence/gaps，不把模型叙述当事实。
5. **边界可扩展**：preset 负责人格与工具面，skills 负责阶段知识，tools 负责原子能力。

## 4. P1 没做什么

- 仍有 16 个工具，内容生成（需求/设计/方案/复盘）还在 tool 里。
- 没有通用 artifact presenter；卡片仍按工具名挂载。
- 没有 workitem 读写工具，工作项靠 Agent 文件操作。
- 工具面仍是全局可见，preset 还不能按角色裁剪。
- 没有真实 DataMap/调度/CICD 接入；release 只执行 mock。
- 没有 Agent Team/子代理；P1 保持单 Lead。

## 5. P1 验收证据

- 架构：[agent-architecture.html](../../prototype/agent-architecture.html)
- 增量：[agent-architecture-delta.html](../../prototype/agent-architecture-delta.html)
- 设计与 ADR：[agent-orchestration.md](agent-orchestration.md)、[ADR 0004](../decisions/0004-agent-workbench-orchestration.md)
- P1.4 报告：[allow](../../prototype/shots/p1.4-full-allow-report.json)、[reject](../../prototype/shots/p1.4-full-reject-report.json)、[query](../../prototype/shots/p1.4-query-report.json)
- 检查：`check-dataops-preset.mjs`、`check-dataops-workitem.mjs`、tools/client/smoke 全部通过

## 6. P1 的结论

**P1 证明“需求优先 + 工作项状态 + 原生审批”这条链成立。**

下一步不是继续加工具，而是 P2：把内容生成从 tool 收回技能，用通用 DeliverableRenderer 保持卡片体验，并把工具面收敛到 12 个原子能力。
