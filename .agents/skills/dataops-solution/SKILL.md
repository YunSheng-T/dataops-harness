---
name: dataops-solution
description: Stage 3b 需求方案使用；基于 3a 选方案、备选和 tradeoff，solution-blocking=0 才能 pass。
---

# 3b 需求方案 owner（BA）

## 输入

- analysis approved；
- design/requirement 只读；
- DataMap/血缘/证据用于影响和依赖核对。

## 产出

`deliverables/scheme/solution.yaml`：inputs、summary、chosenOption、options（≥2）、alternatives、decisions、impacts/dependencies/constraints/risks/rollback/assumptions、acceptanceMapping、gaps、review.ba、handoff。
优先调 `dataops_shared_stage`：`action=prepare`、`kind=solution`、`stage=scheme`、`substage=solution`，由它写交付物、更新 workitem 并出卡。

## 门禁

- 消费 3a，不重做分析；
- `solution-blocking` gap=0；
- `execution-blocking` 必须有 `mustCloseBefore`；
- BA 签收；需求方 advisory 不阻断 v1；
- 签收只认 `【签收】gate=scheme.solution ...`。

## 失败

如果决策需要改 design/target/grain/source/metric，停止并回 design，不在 3b 里静默改。
