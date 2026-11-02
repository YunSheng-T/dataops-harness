# Lineage Model

> 状态：第一版实现中；三类 graph、代码仓对象列表、半屏图已接入。
> 关联：OPEN-011 · [Lineage Surface](lineage-surface.md) · [Summary Cards](summary-cards.md)
> 蓝图：[全量](../../prototype/lineage-browser-blueprint.html) · [增量](../../prototype/lineage-browser-blueprint-delta.html)
> 目标：把“三种视图”改成三种业务血缘，把 DataOps 血缘做成代码仓浏览器。

## 1. 修正

`design / production / schedule` 不是同一张图的三个 view。

它们是三种不同的业务问题、不同的图：

```text
TableLineage     表 → 表
DataFlowLineage  表 ↔ ETL ↔ 调度
TaskDag          Task.yaml → Job 依赖
```

`production` 这个名字不再使用，改为 `data_flow`，界面叫 **数据链路**。

## 2. 三种血缘

### table_lineage

```text
问题：这张表从哪来、改它影响谁？
节点：table
边：feeds / derives
入口：TableCard、分析、影响评估
```

### data_flow

```text
问题：一次数据流经过哪些表、ETL、调度？
节点：table / etl_job / schedule_task
边：reads / writes / runs / schedules
入口：TechPlanCard、技术方案评审
```

### task_dag

```text
问题：Task.yaml 内 Job 的依赖顺序是什么？
节点：task / job
边：depends_on
入口：ScheduleCard、调度代码 review、开发者自检
```

三种图不共享 view 切换。

## 3. LineageGraph 契约

```text
LineageGraph
  graphId
  kind: table_lineage | data_flow | task_dag
  title
  focus
  nodes[]
  edges[]
  source { system, asOf }
  partial
  gaps[]
```

节点：

```text
LineageNode
  id
  type: table | etl_job | schedule_task | task | job
  label
  owner?
  meta?
```

边：

```text
LineageEdge
  from
  to
  kind: feeds | reads | writes | runs | schedules | depends_on
```

`LineageRenderer` 只负责：

```text
graph + kind + compact/full + interactive
```

不负责三 view 状态。

## 4. DataOps 血缘 Tab

不是“当前一条血缘”，而是**代码仓血缘浏览器**。

```text
血缘
├─ 搜索表 / 任务 / 作业
├─ 对象列表
│   ├─ 表
│   ├─ 数据链路
│   └─ 调度 DAG
└─ 选中对象的 LineageRenderer
```

没有选择时显示代码仓概览：

```text
表 12
数据链路 4
调度任务 6
```

选择后只显示该对象对应的那一种图，不出现三视图 tab。

当前 Session 只作为默认 focus，不是 Tab 的数据边界。

## 5. 卡片入口

| 卡片 | 打开的图 | focus |
|---|---|---|
| TableCard / 分析卡 | table_lineage | table |
| TechPlanCard | data_flow | pipeline / target |
| ScheduleCard / task review | task_dag | task |

CTA 文案：

```text
查看表血缘
查看数据链路
查看调度 DAG
```

不再出现“生产视图”。

## 6. 半屏弹窗

对话卡片仍可打开当前图的半屏弹窗：

- table_lineage → 表血缘
- data_flow → 数据链路
- task_dag → 调度 DAG

弹窗只渲染当前 graph，不带 view 切换。

## 7. 迁移

| 旧 | 新 |
|---|---|
| `view=design` | `table_lineage` |
| `view=production` | `data_flow` |
| schedule payload | `task_dag` |
| `LineageCard` v1 nodes/edges | `table_lineage` |

旧 payload 只做适配，不继续维护独立渲染器。

## 8. DataOps 数据来源

```text
表血缘          catalog / lineage 服务
数据链路        ETL / pipeline 定义 + task.yaml + catalog
调度 DAG        task.yaml 解析
```

缺少来源时显示 `partial` / `gaps`，不伪造边。

## 9. 非目标

- 不做一个包含全部对象的巨图
- 不保留 design/production/schedule 三 tab
- 不把 task DAG 和表血缘混成一张图
- 不改 Host tool 契约
- 不做真实平台写入

## 10. 验收

1. 三种 kind 使用不同 graph 渲染。
2. 不再出现 `生产视图`。
3. DataOps 血缘有代码仓对象列表和搜索。
4. 没有选择时显示概览，不是空图。
5. 选择对象后只显示一种图。
6. 卡片 CTA 带 kind + focus。
7. 旧 payload 能适配。
8. 半屏弹窗只渲染当前 graph。

## 11. 待确认

- 数据链路的 ETL/调度关系由哪个现有服务提供
- DataOps 血缘对象列表是否需要按 package 分组
- 默认 focus 是当前 Session 资产还是代码仓最近对象
