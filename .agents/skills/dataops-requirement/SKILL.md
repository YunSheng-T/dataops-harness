---
name: dataops-requirement
description: Stage 1 需求阶段使用；把 US 转成可签收的需求交付物，准备 BA + 需求方 gate。
---

# Requirement owner（BA）

## 输入

- workitem（`dataops_shared_read_workitem`）
- US 详情（`dataops_shared_read_us`）
- requirement 模板（`dataops-deliverable-templates`）

## 产出

`deliverables/requirement/requirement.yaml`：

- id/title/goal/scope/nonGoals/acceptance/owner/requester
- priority/impacts/constraints
- source（edevops US）、evidence、gaps
- review.ba / review.requester

优先调 `dataops_shared_stage`：`action=prepare`、`kind=requirement`、`stage=requirement`，由它写交付物、更新 workitem 并出卡；presenter 是兼容 fallback。

## 门禁

- BA 签收 + 需求方确认目标/验收；
- requirement 只拦“目标/范围/验收/owner”缺失；数据执行缺口可标 `execution-blocking`，但不能伪装成已关闭。
- 没有 BA+需求方签收不能把 stage 推到 design。
- 签收只认用户轮次里的 `【签收】gate=requirement ...`；不要自签。

## mock 补证

US-3821 初始需求可能带 `G-PAYTIME/G-STATUS/G-DUPKEY`。这些是后续 execution/3a 缺口，不阻塞 requirement 签收；卡片显示“补充 mock 证据”时，收到明确用户消息后用 `read_evidence({ resolution:'closed' })` 读取 mock 关闭证据，重出 requirement 卡，并把缺口降为 warning/execution-blocking，保留 mock 标记。不要静默删除缺口。

## 失败

缺目标/验收 → 保持 requirement，列一个最关键问题；不要编造。
