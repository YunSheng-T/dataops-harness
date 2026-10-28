# Design 文档索引

> 目的：`docs/design/` 不再按“谁先写谁放这里”使用。新文档先判断属于哪一类，再放对应位置。
> 本文件是入口；用户旅程/Stage 0+1 已收进 `user-journey/`，旧路径保留符号链接。其他旧文档的物理归档待迭代冻结后再做，避免打断其他会话。

## 当前事实源

按这个顺序读：

| 顺序 | 文档 | 说明 |
|---|---|---|
| 1 | [用户旅程设计组](user-journey/README.md) | 用户旅程 v0、Stage 0+1、审批矩阵 |
| 2 | [Stage 0+1](user-journey/stage-0-1-us-intake-requirement.md) | US 接单 + 需求详细设计 |
| 3 | [agent-orchestration.md](agent-orchestration.md) | Agent/工作项/技能/工具总体架构 |
| 4 | [p2-tool-convergence.md](p2-tool-convergence.md) | P2 工具收敛与 DeliverableRenderer |
| 5 | [p2-plan.md](p2-plan.md) | P2 实施计划 |

## 当前主题分组

### 产品与用户旅程

- [用户旅程设计组](user-journey/README.md)
  - [user-journey.md](user-journey/user-journey.md)
  - [stage-0-1-us-intake-requirement.md](user-journey/stage-0-1-us-intake-requirement.md)
  - [stage-2-design.md](user-journey/stage-2-design.md)
  - [design-card-datamap.md](user-journey/design-card-datamap.md)
  - [stage-3-scheme.md](user-journey/stage-3-scheme.md)
  - [stage-3a-analysis.md](user-journey/stage-3a-analysis.md)
  - [stage-3b-solution.md](user-journey/stage-3b-solution.md)
  - [stage-3c-tech-plan.md](user-journey/stage-3c-tech-plan.md)
  - [stage-4-develop.md](user-journey/stage-4-develop.md)
  - [stage-5-cicd.md](user-journey/stage-5-cicd.md)
  - [领导汇报版概要](user-journey/leadership-summary.md)
  - [总体设计](user-journey/overall-design.md)

### 架构

- [agent-orchestration.md](agent-orchestration.md)
- [blueprint-v2.md](blueprint-v2.md)（历史蓝图，作为背景）
- [product-blueprint.md](product-blueprint.md)（产品蓝图，部分内容待合并）
- [workbench-harness.md](workbench-harness.md)（工作台背景）
- [framework.md](framework.md)（框架背景）
- [user-surface.md](user-surface.md)（用户面历史设计）

### P1 / P2 工程

- [p1-summary.md](p1-summary.md)（P1 历史总结）
- [p2-plan.md](p2-plan.md)
- [p2-tool-convergence.md](p2-tool-convergence.md)

### 领域与接入

- [integration.md](integration.md)
- [mock-demo.md](mock-demo.md)
- [mock-to-real.md](mock-to-real.md)
- [lineage-card.md](lineage-card.md)
- [rebranding.md](rebranding.md)

### 生命周期其他目录

- 决策：[docs/decisions](../decisions/)
- 遗留事项：[docs/backlog.md](../backlog.md)
- 验收：[docs/verification](../verification/)
- 技能：[.agents/skills](../../.agents/skills/)

## 文档状态约定

新文档开头尽量写：

```md
> 状态：讨论稿 | 设计稿 | 已归档 | 历史
> 日期：YYYY-MM-DD
> 关联：...
```

- **讨论稿**：可以改，不能当最终事实。
- **设计稿**：边界已确认，可进入实现。
- **历史**：保留背景，不作为当前事实源。
- **ADR**：只记已拍板/提议的决策，不写长篇背景。

## 清理计划（待迭代冻结后做）

1. 合并重叠的历史蓝图：`blueprint-v2` / `product-blueprint` / `workbench-harness` / `framework` / `user-surface`。
2. 把 P1/P2 已完成文档移到 `docs/design/archive/`。
3. 把阶段设计移到 `docs/design/stages/`，例如 `stages/0-1-us-intake-requirement.md`。
4. 保持 `README.md` 只放索引，不堆正文。
5. 迁移时统一更新链接，避免断链。

> 现在不物理搬家：其他会话还在迭代，先靠索引和状态标记降低混乱；冻结后再做一次链接完整的归档。

- [内网接入架构](intranet-architecture.md)

- [架构治理清单](architecture-governance.md)

- [架构文档索引](architecture-index.md)
