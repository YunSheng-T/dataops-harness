---
name: dataops-analysis
description: Stage 3a 分析使用；做数据挖掘、探索、基线、候选比较和可行性，3a blocked 不能 pass。
---

# 3a 分析 owner（BA）

## 输入

- design 已 approved；
- `dataops_shared_read_datamap`；
- `dataops_shared_read_evidence`（默认 `resolution=pending`）；
- 独立 `read_lineage` / `read_profile`。

## 产出

`deliverables/scheme/analysis.yaml`：question/questions、datamap、独立 lineage、findings、baseline、candidates、comparison、feasibility、recommendation、conclusion、gaps、review.ba、handoff。
优先调 `dataops_shared_stage`：`action=prepare`、`kind=analysis`、`stage=scheme`、`substage=analysis`，由它写交付物、更新 workitem 并出卡。

## 3a 分支

- 初始 `G-STATUS` / `G-DUPKEY` blocking → `status=blocked`，卡片只显示“补充 mock 证据”，不显示 BA 签收入口。
- 用户点击“补充 mock 证据”后，收到明确用户消息，才用 `read_evidence({ resolution:'closed' })` 读取明确标注 mock 的关闭证据，重算分析。
- 关闭证据齐 + blocking=0 才可 `passed`；BA 签收。
- 不得无证据直接 pass；不得自己降级 blocking。

## 门禁

BA 签收；blocking gap=0；否则停 3a。
