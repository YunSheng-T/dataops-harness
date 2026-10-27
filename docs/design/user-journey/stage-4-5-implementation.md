# Stage 4–5 实现映射

> 本文件只记录实现映射；业务/门禁设计以 [Stage 4](stage-4-develop.md)、[Stage 5](stage-5-cicd.md) 为准。

## Stage 4

| 设计 | 实现 |
|---|---|
| 多产物 | `fixtures/develop.js` + `DevelopCard` |
| 验证循环 | `validation.build/scan/deploy/test` attempt |
| SE 评审 | `SignoffPanel gate=develop.code_review`、stage runtime role SE |
| Committer 合入 | `SignoffPanel gate=develop.merge`、role Committer；不执行 merge |
| 进入 CICD | `advanceAfterSignoff` 只在该 gate approved 后 stage=cicd |
| 工具 | `dataops_shared_read_develop`（mock 事实） |

## Stage 5

| 设计 | 实现 |
|---|---|
| 一条 pipeline | `dataops_cicd_pipeline` / `PipelineCard` |
| 制品包 | fixture `artifact.package/manifest/checksum` |
| 外部环境 | `externalDeployment.environments` 只读 |
| 无 DSH approval | 无 release gate/按钮；`dataops_cicd_release` legacy 不进入流程 |
| pass | pipeline succeeded + artifact；tool `workitemId` 调 `stageComplete` |
| Stage 6 | 不实现，stage 停在 cicd done |

## 已知待补

- 真实 tar.gz 制品生成（当前 manifest/checksum 为 mock fixture，不冒充生产包）；
- 连续 UI e2e、截图、领导演示脚本；
- Stage 0–3 与 Stage 4–5 的连续 workitem seed；
- 1440/1600/1920 宽度与明暗截图验证。
