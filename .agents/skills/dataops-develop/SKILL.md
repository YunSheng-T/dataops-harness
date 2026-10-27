---
name: dataops-develop
description: Stage 4 开发验证使用；生成多产物并跑 build/scan/deploy/test 回流，SE 评审与 Committer 合入后再进 CICD。
---

# 开发验证 owner（Dev）

## 输入

- tech-plan / design / analysis
- workitem
- 代码平台、开发/联调环境、数据源状态

## 产出

`deliverables/develop/develop.yaml` 是清单 + 验证摘要，实际产物必须分开：

```text
deliverables/develop/
  develop.yaml
  sql/*.sql
  etl/*.yaml
  schedule/*.yaml
  api/*.yaml
  ops/*
  tests/*
```

`develop.yaml` 至少包含 `target/branch/status/loop/artifacts/validation/tasks/review/merge/mustNotChange/rollback/gaps`。

## 活动

1. 先调 `dataops_shared_read_develop` 读 mock 事实；真实模式只读代码平台/环境。
2. 生成多产物；`develop.yaml` 不是唯一产物。
3. Build → 失败改代码重跑；Scan → blocking 回流；Deploy 到开发/联调 → 数据源/权限问题补 ops；Test → 有自动化记录，否则标 manual/not-automated，禁止伪装通过。
4. 每轮 attempt 记录：status/error/action/evidence。
5. SE 评审通过后调 `dataops_shared_stage` 的 `signoff`，gate=`develop.code_review`，role=`SE`。
6. 外部 Committer 完成合入后记录 gate=`develop.merge`，role=`Committer`，并写 merge.commit/reviewer；DataOps 不执行 merge。

## 门禁

- Build 通过；Scan 无 blocking；Deploy 到开发/联调通过或前置关闭；Test 有 manual/mock 记录；
- SE 评审 approved；Committer 合入记录 merged；
- 所有 3c 任务有实现/关闭；mustNotChange 未违反；
- 无 blocking gap；回滚可用。
- 未合入不能进 CICD。

## 呈现

`DevelopCard`：产物清单、Build/Scan/Deploy/Test attempt、SE/Committer、日志；不要在正文复述工具名。
