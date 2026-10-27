# 用户旅程设计组

> 状态：设计稿 + 实现中（P3 mock 主线）
> 范围：用户旅程、Stage 0+1、审批矩阵、US 选择与交接
> 目的：把这组仍在讨论的设计从 `docs/design/` 根目录收进来，避免和其他会话的文档混在一起。
> 约定：每个阶段文档末尾必须有“案例”一节，用同一个 **渠道日报支付口径（US-3821）** 故事串起来。

## 本组文档

- [总体设计](overall-design.md)

- [领导汇报版概要](leadership-summary.md)

| 文档 | 内容 | 状态 |
|---|---|---|
| [user-journey.md](user-journey.md) | 用户旅程 v0：角色、主旅程、审批矩阵、Done 定义、Agent Team 讨论 | 讨论稿 |
| [stage-0-1-us-intake-requirement.md](stage-0-1-us-intake-requirement.md) | Stage 0+1：US 接单、USPicker、需求阶段、目录结构、交付物与 Pass | 设计稿 v0 |
| [stage-2-design.md](stage-2-design.md) | Stage 2：设计阶段、设计交付物、呈现、门禁、Pass、交接 | 设计稿 v0 |
| [design-card-datamap.md](design-card-datamap.md) | DesignCard 信息架构、DataMap 来源、设计证据链、Pass | 设计稿 v0 |
| [stage-3-scheme.md](stage-3-scheme.md) | Stage 3 方案总览：3a/3b/3c 边界、跨阶段决议、案例 | 详细设计 v0 |
| [stage-3a-analysis.md](stage-3a-analysis.md) | 3a 分析：数据挖掘/探索/基线/候选、AnalysisCard、Pass | 详细设计 v0 |
| [stage-3b-solution.md](stage-3b-solution.md) | 3b 需求方案：业务选择/备选/tradeoff、SolutionCard、Pass | 详细设计 v0 |
| [stage-3c-tech-plan.md](stage-3c-tech-plan.md) | 3c 技术方案：任务/平台/依赖/SLA/回滚、TechPlanCard、Pass | 详细设计 v0 |
| [agent-skill-design.md](agent-skill-design.md) | Stage 0–3 的逻辑混合 Agent/Skill 角色、加载、签收、交接 | 设计稿 v0 |
| [implementation-status.md](implementation-status.md) | 已实现卡片/工具/mock、已验证与未完成项 | 实现中 |
| [overnight-report.md](overnight-report.md) | 2026-10-27 通宵实现报告与决策记录 | 汇报 |
| [ADR 0006 · Stage runtime](../../decisions/0006-stage-runtime.md) | 出卡 + 工作项 + 签收的确定性 runtime 决策 | 已实施 |
| [ADR 0007 · Current gate dock](../../decisions/0007-current-gate-dock.md) | 正文完整卡 + 底部阶段简报/导航 | 已实施 |
| [ADR 0008 · User-level skills](../../decisions/0008-user-level-skills.md) | 把 DataOps skills 安装到用户级 root，解除 workspace 依赖 | 已实施 |
| [ADR 0009 · Signoff commit](../../decisions/0009-signoff-commit.md) | 签收确认后自动提交普通用户消息，workitem 持久化 | 已实施 |
| [stage-4-develop.md](stage-4-develop.md) | Stage 4 开发：实现/自查/测试/代码评审、DevelopCard、交接 CICD | 设计稿 v0 |
| [stage-5-cicd.md](stage-5-cicd.md) | Stage 5 CICD：官方构建/扫描/测试/部署/发布、CICDCard、发布审批 | 设计稿 v0 |

## 外部关联

- [泳道图](../../../prototype/user-journey-swimlane.html)
- [泳道图截图](../../../prototype/shots/user-journey-swimlane.png)
- [DesignCard 视觉稿](../../../prototype/design-card-datamap.html)
- [TechPlanCard 设计血缘视觉稿](../../../prototype/tech-plan-lineage.html)
- [TechPlanCard 截图](../../../prototype/shots/tech-plan-lineage.png)
- [DesignCard 截图](../../../prototype/shots/design-card-datamap.png)
- [遗留事项](../../backlog.md)
- [设计索引](../README.md)

## 当前边界

- 本组只讨论设计，不改运行时。
- EDevOps 跨人签收、生产发布准入、US 状态回写等未决事项在 [backlog](../../backlog.md)。
- `USPicker` 的 Host tool + Client card 还没实现；技术分层和选择边界见 Stage 0+1 文档。
- 审批矩阵是 v0，不是最终审批系统。

## 迁移说明

`docs/design/` 根目录保留了两个**同内容符号链接**：

- `docs/design/user-journey.md` → `user-journey/user-journey.md`
- `docs/design/stage-0-1-us-intake-requirement.md` → `user-journey/stage-0-1-us-intake-requirement.md`

这样其他会话的旧链接不会断；新内容统一写在本目录。等迭代冻结后再决定是否移除旧链接。

- [Stage 4–5 实现映射](stage-4-5-implementation.md)
