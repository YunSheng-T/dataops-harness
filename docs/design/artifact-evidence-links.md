# Artifact Evidence Links

> 状态：P3.2 第一版已实现；evidenceRefs、DataOps chips、当前迭代 chips、revision evidence diff 已接入。
> 关联：[Stage Artifact Ledger](stage-artifact-ledger.md) · [Run Timeline](run-timeline.md)
> 蓝图：[全量](../../prototype/artifact-evidence-blueprint.html) · [增量](../../prototype/artifact-evidence-blueprint-delta.html)
> 目标：让每个 ArtifactRevision 能回答“依据是什么”，但不把证据正文塞进 revision。

## 1. 一句话

产物是可迭代的 revision，证据是引用；revision 保存 `evidenceRefs`，证据正文仍由扫描、部署、运行日志和查询各自管理。

## 2. 问题

P3.1 已经能管理阶段产物和 revision，但当前 revision 无法回答：

- 这版设计有没有关联 code scan？
- 这个结论依赖哪次部署？
- 运行日志对应哪个平台 run？
- SQL / 查询证据在哪里？
- 新 revision 是否还沿用旧证据？

现在的“可信度”只存在于 Agent 文字里，不在 Ledger 里。

## 3. 模型

```text
ArtifactRevision
  revisionId
  contentHash
  evidenceRefs[]
```

```text
EvidenceRef
  id
  kind: code_scan | deploy_log | runtime_log | query | catalog
  ref:
    scanId?          # code_scan
    deploymentId?    # deploy_log
    runtime?         # runtime_log: platform / project / group / task / job / runId
    query?           # query: id / asOf
    catalog?         # catalog: table / asOf
  status: pass | warn | fail | unknown
  summary
  asOf
  source: mock | real
```

约束：

- `evidenceRefs` 挂在 revision 上，不可变
- 证据正文不复制进 revision；只保存引用和摘要
- `status` / `asOf` 是引用时的快照，不是实时结论
- 新 revision 默认不继承旧 evidenceRefs；需要显式重新关联
- 没有证据不是失败，显示“未关联证据”
- 不按 package 查运行日志；runtime 仍用平台坐标 + runId
- deploy 仍用 `deploymentId`；scan 仍用 `scanId`

## 4. 写入路径

Agent 生成阶段 payload 时带：

```json
{
  "evidenceRefs": [
    { "kind": "code_scan", "ref": { "scanId": "scan-7f2" }, "status": "pass", "summary": "0 blocking" },
    { "kind": "deploy_log", "ref": { "deploymentId": "deploy-20261102-001" }, "status": "pass", "summary": "sit 健康检查通过" }
  ]
}
```

`stage prepare` 校验后写入 revision：

- 最多 20 条
- `kind` 必须受支持
- `ref` 至少包含该 kind 的必要坐标
- 不安全 URL / 内嵌凭据拒绝
- 不自动补证据，不把 `unknown` 当成 `pass`

## 5. Revision diff

切换 vN / vN-1 时，除了内容字段，还显示 evidence 变化：

```text
evidence + scan-7f2
         − deploy-old
```

证据增删与内容变更分开显示，避免把“内容没变”误判成“这一版没有变化”。

## 6. UI

### DataOps 交付物

每个阶段显示：

```text
设计  v3  review
      3 evidence · scan / deploy / runtime
```

点击 evidence chip 展开只读摘要；完整证据仍在 `证据` section。

### 当前迭代浮层

当前阶段展开时，增加：

```text
证据 3
[scan-7f2  pass] [deploy-…-001  pass] [lts/...  warn]
```

点击某个引用显示：

- 类型、引用坐标、asOf
- summary
- 来源 mock/real
- “在证据里打开”

没有引用时：

```text
未关联证据
让 Agent 在下一次 revision 里补充。
```

## 7. 和现有能力的关系

- code scan：引用 `scanId`，不复制 findings
- deploy log：引用 `deploymentId`，不复制 events
- runtime log：引用平台坐标 + `runId`，不按 package
- query/catalog：引用查询/表坐标，不复制正文
- 审批 gate：本版不强制 evidence 数量；先展示，后加门禁

## 8. 迁移

- 旧 revision 没有 `evidenceRefs`：显示“未关联证据”，不判失败
- 旧 deliverables 迁移成 rev-0001 时也不伪造证据
- 下一次 revision 由 Agent 显式关联

## 9. 非目标

- 不把日志正文嵌入 revision
- 不自动把最近一次部署/运行当成该 revision 的证据
- 不按 package 查运行日志
- 不做用户手动拖拽关联
- 不做证据自动过期/重算（只显示 asOf）
- 不改变现有 code scan / deploy / runtime 契约

## 10. 验收

1. revision 可保存 0–20 条 evidenceRefs。
2. refs 非法时 stage prepare 拒绝。
3. DataOps 交付物显示 evidence 数量。
4. 浮层当前阶段显示 evidence chips。
5. 点击 chip 显示摘要和 asOf。
6. 新 revision 不自动继承旧 refs。
7. 旧 revision 无 evidence 显示“未关联证据”。
8. code scan / deploy / runtime 的坐标规则不变。

## 11. 待确认

- evidence 详情用浮层内联展开，还是跳转 DataOps「证据」section
- gate 是否在下一版要求最少证据类型
- evidenceRefs 是否需要在 revision diff 里显示
