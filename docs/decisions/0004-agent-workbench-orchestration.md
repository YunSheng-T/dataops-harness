# ADR 0004：需求入口、Lead preset 与工作项状态机

- 状态：提议
- 日期：2026-10-26
- 决策者：dataops-harness 项目组
> 术语：P1 中 artifact 指阶段产物；P2.0 起改为 deliverable，artifact 只指 CICD 构建制品（见 ADR 0005）。

- 相关：`docs/design/agent-orchestration.md`、`blueprint-v2.md`、`.agents/skills/dataops-workflow/SKILL.md`

## 背景

当前演示用工具名驱动 6 阶段流程。真实用户不会说工具名，产品入口应是需求/工单。现有实现只有 tool + card + skill，缺少：

- DataOps 角色 preset
- 持久工作项/阶段状态机
- 内容生成与原子能力的边界
- 发布审批的硬门禁

## 决策

1. **用户入口是需求/工单**，不是工具目录。
2. **单 Lead Agent preset（`dataops-dev`）** 负责接需求、路由阶段、汇总；子代理只在评审/血缘/排障时按需使用。
3. **工作项 + 阶段状态机**是硬骨架；P1 用 `workitems/<date>-<slug>/item.yaml` 文件协议，P2 服务化。
4. **技能只做阶段知识**，不承担状态持久化和权限。
5. **工具只做原子能力**：共享事实、CICD 动作、工作项接口、deliverable renderer；内容生成（需求/设计/方案/复盘正文）由 Agent + 技能完成。
6. **卡片从交付物来**；迁移期保留现有 toolview，P2 增加 `dataops_shared_present_deliverable` 作为展示桥（详见 ADR 0005）。
7. **发布/写平台必须 approval**；工具层校验，不靠 prompt。

## 备选方案

- **继续加 stage tools**：实现快，但用户面仍是工具目录，内容生成和原子能力混在一起。否决。
- **只靠 skill 编排**：没有持久状态和审批，无法保证阶段/门禁。否决。
- **直接上 Agent Team**：上下文隔离好，但交接协议/成本高，P1 过重。推迟。
- **workflow 做单需求**：适合批量 fan-out，不适合线性有人审流程。否决。

## 后果

- 正面：用户入口自然；阶段/产物/审批可恢复；工具面可收敛；角色权限可隔离。
- 负面：P1 需要新增 preset/workitem 协议；P2 有 breaking change（内容工具迁移）；文件状态机在 P1 不是强一致。
- 兼容：现有 mock tools、卡片、6 阶段演示保留为内部回归；不立即删除。

## 验收

- 自然语言提示词不含 `dataops_*`，仍能推进 6 阶段。
- 发布前停在 `awaiting_approval`；未确认不调 release。
- 只读/评审/排障不污染主链阶段。
- 阶段/产物/gaps/approvals 可从 `item.yaml` 恢复。
- 工具级回归仍通过。
