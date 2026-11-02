# Change Impact Review（P2.1）

> 状态：设计暂停；并入单一 code scan 的结果展示，不再作为独立 P2.1 能力。
> 路线图：`docs/design/dataops-plugin-roadmap.md`
> 边界：唯一代码扫描入口是 `dataops_code_scan`；DataOps 只展示其结果，不解析 SQL、不实现扫描。
> 蓝图：[全量](../../prototype/change-impact-review-blueprint.html) · [增量](../../prototype/change-impact-review-blueprint-delta.html)

## 1. 一句话

Change Impact Review 回答：**这次变更会影响哪些 package、资产、下游和发布风险。**

它不回答：SQL 语法对不对、DDL/DML/Rollback 配不配套。那是 code scan / CI 的职责。

## 2. 分工

```text
dataops_code_scan（唯一扫描入口）
  ├─ SQL 语法、DDL/DML/Rollback
  ├─ 删表、删字段、改类型、改分区、改索引
  ├─ 破坏性 SQL 变更
  ├─ changed files / changed assets
  ├─ downstream / criticality（扫描结果的一部分）
  └─ findings / evidence / asOf

DataOps（展示层）
  ├─ 读取 code scan 结果
  ├─ 按 package / asset / downstream 展示
  ├─ 展示继承的 findings
  └─ 不新增扫描规则，不重算影响
```

`dataops_cicd_scan` 是旧名字；收敛为 `dataops_code_scan` 别名/迁移期名称，不再作为第二个扫描入口。

## 3. 用户旅程

```text
用户/Agent 提交一组变更
→ DataOps 面板出现“本次变更”
→ 显示影响的 package / asset / downstream
→ 显示来自 code scan 的 findings
→ 给出 release 前需要确认的 gaps
```

入口：

```text
DataOps
├─ 概览
├─ 变更          ← P2.1
├─ 仓库
├─ 资产
├─ 血缘
├─ 证据
└─ 检查
```

`检查` 继续显示仓库规则；`变更` 只显示本次变更影响。

## 4. 输入契约

```text
ChangeSet
  source: git | ci | agent
  baseRef?: string
  headRef?: string
  files: ChangeFile[]
  assets?: ChangedAsset[]
  scanFindings?: ScanFinding[]
  asOf: string

ChangeFile
  path: string
  status: added | modified | deleted | renamed
  oldPath?: string

ChangedAsset
  kind: table | api | task
  id: string
  change: create | alter | drop
  package?: string
  columns?: string[]
  source: scan | change | manual

ScanFinding
  severity: blocking | warning | info
  code: string
  path?: string
  message: string
```

`assets` 和 `scanFindings` 只能由 code scan / CI / Agent 提供，DataOps 不从 SQL 文本反推。

## 5. 输出契约

```text
ImpactReport
  ok
  kind: change_impact
  changeSet
  summary
    files
    packages
    assets
    downstream
    scanBlocking
    scanWarning
  packages[]
  assets[]
  downstream[]
  findings[]
  gaps[]
  asOf
```

finding 规则：

| severity | code | 含义 |
|---|---|---|
| warning | `IMPACT_FILE_OUTSIDE_PACKAGE` | 变更文件不属于任何 package |
| warning | `IMPACT_PACKAGE_MULTI` | 同一文件被多个 package 覆盖 |
| warning | `IMPACT_ASSET_UNKNOWN` | 变更资产不在当前仓库索引 |
| warning | `IMPACT_DOWNSTREAM_CRITICAL` | 影响关键下游 |
| warning | `IMPACT_OWNER_MISSING` | 受影响 package / 资产没有 owner |
| warning | `IMPACT_SCAN_FINDING` | 继承自 code scan 的非阻断风险 |
| blocking | `IMPACT_SCAN_BLOCKING` | 继承自 code scan 的阻断风险 |
| info | `IMPACT_SCOPE` | 变更范围摘要 |

注意：

- `IMPACT_SCAN_BLOCKING` 是**继承**，不是 DataOps 自己判定 SQL 有问题。
- DataOps 不新增 `DDL_MISSING`、`ROLLBACK_MISSING`、`DROP_COLUMN` 这类扫描规则。
- scan findings 原样保留 `source` 和 `asOf`，便于追溯。

## 6. 面板

### 变更

- 当前变更来源 / asOf
- files / packages / assets / downstream / scan findings
- 影响 package 列表
- 影响资产列表
- 下游列表（包含 criticality / owner）
- 继承的 scan findings
- 空状态：当前没有待评估变更
- 错误状态：ChangeSet 无法读取 / 无法映射

### 概览

增加一条轻量入口：

```text
本次变更 · 3 files · 1 package · 查看影响
```

### 检查

继续显示仓库规则；可链接到 `变更`，不把 SQL 规则塞进 DataOps。

## 7. 运行方式

P2.1 先做**显式 ChangeSet**：

```text
Agent / CI 提供 ChangeSet
→ dataops_change_impact（Host tool，只读）
→ /api/dataops/change-impact（面板 route）
```

暂不实现：

- git 事件监听
- 文件 watcher
- 自动后台扫描
- CI 系统接入

后续事件源可用 `workspaceChanges` 或 CI 回调接入，但不改变输入契约。

## 8. 失败与边界

- ChangeSet 缺失：空状态，不自动扫描
- package/lineage 缺失：报告 `gaps`，不编造下游
- scan findings 缺失：只做 package/asset 影响，不假装已扫描
- 同一文件多 package：warning，不自动选一个
- 不允许任意 root：只评估当前 Session workspace

## 9. 非目标

- 不做 SQL parser / DDL diff / lint
- 不重新实现 code scan
- 不自动修 SQL
- 不执行 build/deploy
- 不读取真实凭据
- 不替代 CI、代码评审或发布审批

## 10. 验收

1. 没有 ChangeSet 时只显示空状态，不触发扫描。
2. 3 个变更文件正确映射到 1 个 package。
3. 变更资产不在索引时产生 `IMPACT_ASSET_UNKNOWN`。
4. 有下游关键资产时产生 `IMPACT_DOWNSTREAM_CRITICAL`。
5. code scan blocking 被继承为 `IMPACT_SCAN_BLOCKING`，DataOps 不重算。
6. 没有 scan findings 时显示“未提供扫描结果”，不显示通过。
7. 面板显示 package / asset / downstream / scan findings 四组信息。
8. 所有输入只来自当前 Session workspace。

## 11. 待拍板

- ChangeSet 第一版由 Agent tool 还是 CI payload 提供
- 资产索引和 lineage 的首个真实来源
- criticality 的判定由谁提供
- 是否允许手工补充 ChangeSet
