# Stage 5 CICD：数据制品流水线

> 状态：设计稿 v1
> 日期：2026-10-27
> 关联：[用户旅程 v0](user-journey.md) · [Stage 4 开发验证](stage-4-develop.md) · [Stage 3c 技术方案](stage-3c-tech-plan.md) · [遗留事项](../../backlog.md)

## 1. 定位

Stage 5 不是让人逐个点 build、scan、test、deploy 的向导，而是**跑一条数据 pipeline，最终产出一个可交付的制品包**。

```text
Stage 4：开发验证 + SE/Committer 合入
→ Stage 5：一条数据 CICD pipeline
   → 官方 build / scan / test / package
   → 制品包 + 制品清单 + 流水线记录
→ 外部发布平台：dev → sit → uat → beta → gamma
→ 后续验收/复盘：暂不设计
```

Stage 5 的 DataOps 侧只负责：

- 触发/记录一条 pipeline；
- 看 pipeline 结果；
- 产出/登记制品包；
- 展示外部发布平台的环境状态；
- 不替代公司部署系统审批，不执行生产发布，不执行回滚。

## 2. 关键边界

| 事项 | 归属 |
|---|---|
| 代码合入 | Stage 4，Committer |
| 数据 pipeline 运行 | Stage 5 |
| 制品包生成 | Stage 5 |
| 开发/测试/预发/生产环境部署 | **外部发布平台** |
| 部署审批 | **公司部署系统** |
| 生产发布执行 | 外部发布平台 |
| 回滚 | CICD/发布平台；DataOps 不执行 |
| 验收/复盘 | Stage 6，暂不处理 |

- 不使用 DSH 原生 approval 做发布审批；
- DataOps 只记录外部审批 ID/状态；
- 不把 Stage 4 的开发产物冒充官方制品。

## 3. 角色

| 角色 | 职责 |
|---|---|
| Dev | 触发/查看 pipeline，处理失败回流 |
| SE | 技术问题裁决；必要时回 Stage 4 |
| Platform / CICD | pipeline 运行、制品包、构建/扫描环境 |
| 公司部署系统 | 环境部署审批 |
| 外部发布平台 | dev → sit → uat → beta → gamma 部署执行 |
| BA / 需求方 | 后续验收衔接；本阶段不签发布 |

## 4. 入口

- Stage 4 done；
- Committer 合入 commit；
- `develop.yaml` + SQL/ETL/schedule/API/ops 清单；
- 无 blocking gap；
- 目标制品版本/包名；
- 外部发布平台的部署配置/环境信息（只读）。

## 5. 一条 pipeline

用户只需要触发一次 pipeline，不需要逐环节操作。

```text
trigger
→ checkout merged commit
→ build
→ scan
→ test（有则跑；没有则 manual/not-automated）
→ package
→ artifact package + manifest + checksum
```

### 5.1 Pipeline 运行

记录：

- pipeline run id；
- commit SHA；
- 触发人；
- 开始/结束时间；
- 日志；
- 每一步状态；
- 失败原因；
- 重试次数。

内部可以有阶段，但 CICDCard 默认展示**一次运行的整体状态**，不是逐个环节按钮。

### 5.2 制品包

最终产物是一个制品包，而不是散落的 SQL/ETL/schedule 文件。

```text
dataops-<target>-<version>.tar.gz
  manifest.json
  checksums.txt
  sql/
  etl/
  schedule/
  api/
  ops/
  tests/
```

- manifest 记录文件清单、类型、来源、版本；
- checksum 用于发布平台校验；
- 同一个包可以被外部发布平台按环境晋级。

### 5.3 外部环境晋级

外部发布平台负责：

```text
dev → sit → uat → beta → gamma
```

DataOps 只读展示：

- 当前环境；
- 部署状态；
- 外部审批 ID/状态；
- 部署时间；
- 失败原因/链接。

DataOps 不发起公司部署审批，不执行部署命令，不执行回滚。

### 5.4 测试

- 有自动化测试则随 pipeline 跑；
- 当前平台数据作业测试机制缺失，记录 `manual / not-automated`；
- 人工测试结果作为制品包附件/记录；
- 不伪造“自动化通过”。

## 6. 交付物

```text
deliverables/cicd/
  cicd.yaml
  artifact/
    dataops-<target>-<version>.tar.gz
    manifest.json
    checksums.txt
  reports/
    pipeline.log
    scan.json
    test.md
  release/
    deployment-status.yaml
```

`cicd.yaml` 是索引 + 状态摘要：

```json
{
  "kind": "cicd",
  "stage": "cicd",
  "status": "succeeded",
  "commit": "abc1234",
  "pipelineRunId": "run-20261027-001",
  "artifact": {
    "package": "artifact/dataops-dws.trade_channel_daily-1.0.0.tar.gz",
    "digest": "sha256:...",
    "manifest": "artifact/manifest.json"
  },
  "pipeline": {
    "build": "passed",
    "scan": "passed",
    "test": "manual",
    "package": "passed"
  },
  "externalDeployment": {
    "platform": "company-release-platform",
    "environments": [
      { "name": "dev", "status": "deployed" },
      { "name": "sit", "status": "deployed" },
      { "name": "uat", "status": "pending" },
      { "name": "beta", "status": "pending" },
      { "name": "gamma", "status": "pending" }
    ]
  },
  "gaps": []
}
```

## 7. 呈现：CICDCard

默认展示：

- pipeline run id / commit
- 整体状态
- 制品包名 / digest
- build / scan / test / package 结果
- 外部环境晋级状态：dev → sit → uat → beta → gamma
- 外部审批状态（只读）
- gaps

展开：

- pipeline 日志
- 制品 manifest
- 扫描报告
- 人工测试记录
- 外部部署详情链接

动作：

- 触发 pipeline
- 查看制品包
- 查看日志
- 打开外部发布平台
- 刷新外部部署状态

**没有**：

- 手动执行 build/scan/test/deploy 的按钮；
- DSH 发布审批按钮；
- DataOps 回滚按钮。

### 状态

```text
queued
→ running
→ succeeded
```

异常：

```text
failed
```

外部部署状态单独展示，不混入 DataOps pipeline 状态。

## 8. 门禁与 Pass

DataOps 侧 Pass：

- pipeline 成功；
- 制品包生成；
- manifest/checksum 完整；
- 官方 scan 无 blocking；
- 测试有 manual/automated 记录；
- 无 blocking gap；
- commit/包/digest 可追溯。

外部部署不是 DataOps 的 Pass 条件：

- 环境晋级/审批由公司部署系统/外部发布平台负责；
- DataOps 只展示状态。

Pass 后：

```text
stages.cicd.status = done
stage = review（后续阶段暂不设计）
```

## 9. 失败与回流

| 情况 | 处理 |
|---|---|
| pipeline build/scan 失败 | 回 Stage 4 修 → 重新合入 → 新 pipeline |
| 制品 manifest/checksum 失败 | 修 package → 重跑 |
| 测试缺失/失败 | 记录 manual/风险；失败回 Stage 4 |
| 外部部署失败 | 外部发布平台处理；DataOps 只记录/展示 |
| 外部审批拒绝 | 外部部署系统处理；DataOps 记录状态 |
| 回滚 | CICD/发布平台负责；DataOps 不执行 |

## 10. 事实来源

| 内容 | 来源 |
|---|---|
| commit / merge | 代码平台 |
| pipeline | CICD |
| build/scan/test/package | CICD pipeline |
| 制品包/digest | 制品库 |
| 环境部署/审批 | 公司部署系统/外部发布平台 |
| 回滚 | CICD/发布平台 |
| 业务验收 | Stage 6（暂不处理） |

## 11. 案例：US-3821

> 前提：3a blockers 已关闭，Stage 4 已 review/merge。

1. 触发 Stage 5 pipeline；
2. build/scan/test/package 一次跑完；
3. 产出 `dataops-dws.trade_channel_daily-1.0.0.tar.gz` + manifest + checksum；
4. 外部发布平台按 dev → sit → uat → beta → gamma 晋级；
5. DataOps 记录环境状态和外部审批 ID；
6. Stage 5 done，等待后续验收（暂不设计）。

## 12. 待确认

1. Stage 5 pass 是否以“制品包生成”为界，而不是等外部 gamma 部署完成？建议是。
2. 制品包格式/命名是否按 `dataops-<target>-<version>.tar.gz`？
3. 外部部署状态是轮询、回调还是手工刷新？建议先手工/轮询。
4. 后面 Stage 6 先不设计，保持边界。
