---
name: dataops-cicd
description: Stage 5 数据 CICD 使用；触发一条 pipeline，展示制品包/manifest/checksum 与外部环境只读状态，不执行部署或回滚。
---

# 数据 CICD owner

## 输入

- develop.yaml + 多产物
- SE review approval + Committer merge record
- commit / 版本

## 产出

`deliverables/cicd/cicd.yaml` 是索引；实际交付物：

```text
deliverables/cicd/
  cicd.yaml
  artifact/dataops-<target>-<version>.tar.gz
  artifact/manifest.json
  artifact/checksums.txt
  reports/pipeline.log
  reports/scan.json
  reports/test.md
  release/deployment-status.yaml
```

## 活动

1. 确认 Stage 4 已合并，否则不触发。
2. 调 `dataops_cicd_pipeline` 一次跑 build/scan/test/package；用 `workitemId` 让工具记录 Stage 5 完成。
3. 展示 pipeline run、制品包、digest、manifest/checksum、日志。
4. mock：只模拟 dev→sit→uat→beta→gamma 状态；internal：显式 `deploy=true` 才调用 release CLI，部署是远程写操作，需用户确认。
5. 外部审批 ID/状态只记录，不伪造审批。

## 门禁

- pipeline 成功；
- 制品包生成、manifest/checksum 完整；
- 官方 scan 无 blocking；测试有 manual/automated 记录；
- 无 blocking gap；commit/包/digest 可追溯。
- Stage 5 pass 以 pipeline 成功 + 制品包生成为界；**外部环境状态不是 DataOps 门禁**。

## 禁止

- 不使用 DSH 原生 approval；
- mock 不执行真实部署；internal 仅在用户确认后执行部署，不执行回滚；
- 不展示 DataOps 发布/回滚按钮；
- 不把 Stage 4 开发产物冒充 Stage 5 官方制品；mock 状态不冒充真实部署。
