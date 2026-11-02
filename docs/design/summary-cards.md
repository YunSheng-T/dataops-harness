# Summary Cards

> 状态：第一版已实现；三张 summary 卡与 DataOps focus CTA 已接入。
> 关联：OPEN-011 · [Stage Artifact Ledger](stage-artifact-ledger.md) · [Artifact Evidence Links](artifact-evidence-links.md)
> 蓝图：[全量](../../prototype/summary-cards-blueprint.html) · [增量](../../prototype/summary-cards-blueprint-delta.html)
> 目标：对话里的 Table / Evidence / Profile 只保留判断摘要，完整内容回到 DataOps 资产和证据。

## 1. 一句话

对话卡回答“这张表能不能用 / 这条证据说明了什么 / 这个画像有什么问题”；
DataOps 回答“完整字段、SQL、列画像是什么”。

## 2. 问题

现在 TableCard / EvidenceCard / ProfileCard 在对话里重复展示：

- 完整字段列表
- 完整 SQL
- 列画像、空值率、distinct
- 候选键、join 覆盖、findings

结果：

- 一条回答被大卡撑长
- 同一份内容在对话和 DataOps 各一份
- 用户要翻很久才能看到结论
- 详情卡的更新和右栏可能不一致

## 3. 三个 summary 卡

### TableCard

保留：

```text
表名 / owner / 分层 / 分区
行数 / 字段数 / asOf
partial / gaps
```

移除对话内：

- 字段列表
- 完整 schema
- 字段注释

CTA：

```text
在 DataOps 资产里打开
```

### EvidenceCard

保留：

```text
claim
时间范围 / 环境 / cost
status
结果摘要（行数、空值率等）
gaps
```

移除对话内：

- 完整 SQL 正文
- 完整查询结果

CTA：

```text
在 DataOps 证据里打开
```

### ProfileCard

保留：

```text
表名 / 行数 / 字段数
候选键
质量结论（findings 数量、最高严重级别）
asOf / partial / gaps
```

移除对话内：

- 每列画像
- 全量 join coverage
- 长 findings 列表

CTA：

```text
在 DataOps 资产里打开
```

## 4. UI 约束

- 卡片高度不超过约 220px
- 一屏最多连续出现 3 张 summary 卡
- 数字和状态优先于字段枚举
- 空值显示“待补充”，不显示空 grid
- 卡片保留 `partial` / `asOf` / `gaps`，不隐藏风险
- CTA 只切到已有 DataOps section，不新建页面
- 不显示完整 SQL；需要 SQL 时进 DataOps 证据

## 5. 数据与契约

本版不改 Host tool 契约：

- 仍使用现有 `table` / `evidence` / `profile` payload
- 只改客户端 renderer
- 详情仍可从 DataOps 读取

深链：

```text
Table / Profile → DataOps 资产
Evidence        → DataOps 证据
```

## 6. 非目标

- 不改 Lineage
- 不改 CICD 五张卡
- 不改 USPicker / Intake
- 不删除详情能力
- 不在对话里做完整数据浏览器
- 不做新的右栏 section

## 7. 迁移

1. 先改 renderer，payload 不变
2. 旧对话卡仍按旧渲染历史；新回答使用 summary
3. CTA 先打开默认资产/证据 section，后续可带选中对象

## 8. 验收

1. TableCard 不再渲染字段列表。
2. EvidenceCard 不再渲染完整 SQL。
3. ProfileCard 不再渲染列画像表。
4. 三张卡都保留结论、asOf、gaps。
5. CTA 打开正确 DataOps section。
6. 长内容进入 DataOps 后仍可用。
7. 空值/partial 不丢失。
8. 卡片高度受限，连续多卡不形成长墙。

## 9. 已确认

- EvidenceCard 不保留复制 SQL；完整 SQL 在 DataOps 证据里复制。
- CTA 带表名 / evidence id，通过 `dataops:panel-focus` 定位到对应 section。
- ProfileCard 保留候选键。

## 10. 待确认

- EvidenceCard 是否保留一个“复制 SQL”小动作，还是只提供跳转
- 深链是否带表名/证据 ID，还是先打开 section
- 是否保留 Profile 的候选键
