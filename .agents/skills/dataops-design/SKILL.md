---
name: dataops-design
description: Stage 2 设计阶段使用；把需求落成 target/grain/PK/source/metrics/impact，并展示 DataMap 寻源和设计证据链。
---

# Design owner（BA）

## 输入

- requirement 已 approved；
- `dataops_shared_read_datamap`：场景→主题→业务对象→逻辑实体→物理资产；
- `dataops_shared_read_lineage`（独立血缘）；
- `dataops_shared_read_profile` / `read_evidence`（独立质量）。

## 产出

`deliverables/design/design.yaml`，至少包含：

- target.table/grain/primaryKey/partition/lifecycle
- sources/fields/join/filter
- steps/metrics/schedule
- dataMap path/assets（assetType、owner、rowCount、fields）
- designEvidence（设计所需核验，不做完整数据挖掘）
- quality/impact/gaps/review

DataMap、血缘、质量必须分开标注；不要把血缘塞进 DataMap，也不要用 DataMap 冒充质量。
优先调 `dataops_shared_stage`：`action=prepare`、`kind=design`、`stage=design`，由它写交付物、更新 workitem 并出卡。

## 门禁

- BA 硬签收；
- SE 可行性：`approved` 或 `deferred` 可推进，`rejected` 不可；
- dataMap 路径/独立证据；执行/数据缺口标 `execution-blocking`，不阻塞设计签收，但必须进 handoff。
- 签收只认 `【签收】gate=design ...`。

## mock 补证

设计阶段的来源缺口可先记 `execution-blocking`；卡片显示“补充 mock 证据”时，收到明确用户消息后读取 `read_evidence({ resolution:'closed' })`，重出设计卡。blocking 不能静默消失。

## 失败

需求范围变化 → 回 requirement；来源/字段缺失 → gap，不硬做 3a/3c。
