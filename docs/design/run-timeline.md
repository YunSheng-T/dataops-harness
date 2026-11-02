# Run Timeline（P2.2）

> 状态：设计稿，待评审。
> 路线图：`docs/design/dataops-plugin-roadmap.md`
> 数据来源：现有 `dataops_shared_read_logs`；P2.2 先做 mock timeline，不接真实日志服务。
> 蓝图：[全量](../../prototype/run-timeline-blueprint.html) · [增量](../../prototype/run-timeline-blueprint-delta.html)

## 1. 一句话

Run Timeline 把一次任务运行的日志信号整理成**可读时间线**，回答“先发生了什么、卡在哪、影响了谁”，不下根因结论。

## 2. 入口

不新增右栏 tab，不新增对话大卡。放在现有 `证据` section 内部：

```text
DataOps
├─ 概览
├─ 仓库
├─ 资产
├─ 血缘
├─ 证据
│   ├─ 证据
│   └─ 运行时间线    ← P2.2
└─ 检查
```

`dataops_shared_read_logs` 是唯一数据入口；DataOps 只展示它的结构化结果。

## 2.1 对象模型

```text
RunTarget（运行对象）
  kind: lts_task | etl_job
  ref: 调度 task / LTS task / ETL job
        │ 1:N
        ▼
run 运行实例
  runId + bizDate + status
        │ 1:N
        ▼
job / group / dependency 事件
```

主键是 **runId**，不是 LTS task 定义。

- `RunTarget` 是时间线的入口
- `runId` 才是一次运行的归属对象
- `job` 是 run 内的事件维度
- LTS task 和 ETL job 是两种不同对象，不能混成一个“task list”
- 同一对象的多次运行各自独立，不合并
- P2.2 不做跨 run 聚合；跨 run 汇总属于后续 Task Health

```text
RunTarget
  kind: lts_task | etl_job
  id: 调度 task / ETL job ID
  name: LTS task name / ETL job name
  path?: lts_code/.../task.yaml
  package?: packageName
  owner?
runId
bizDate?
```

调度 task ID 和 LTS task name 可能不同；ETL job 也可能不属于 LTS。映射不到时保留 `RunTarget` 和 gap，不伪造。

## 2.2 切换运行对象

时间线顶部必须有“运行对象”选择器，而不只是当前 task 的 recentRuns：

```text
运行对象
  [LTS Task] [ETL Job]
  搜索 task / job
  最近失败
  channel_daily_mixed       LTS
  order_daily_serial        LTS
  etl_channel_sync          ETL
  etl_channel_bds           ETL
```

选择后：

```text
RunTarget
→ 查询该对象的 recentRuns
→ 选择一个 runId
→ 展示 RunTimeline
```

约束：

- 切换 RunTarget 不是切换 section，不新增面板
- recentRuns 只属于当前 RunTarget
- LTS 和 ETL 的日志源不同，selector 只发起查询，不伪造数据
- 某个对象没有日志适配时显示“日志源未配置”，不显示空时间线为正常

## 3. 输入

沿用 `dataops_shared_read_logs` 的输出，补充 RunTarget 和时间线视图。`dataops_shared_read_logs` 的 `taskId` 兼容参数继续保留，新调用建议传 `target`。

```text
RunTimeline
  target { kind, id, name, path?, package? }
  runId
  bizDate?
  status: success | failed | running | partial
  startedAt
  finishedAt
  durationMs
  source: mock | logs
  asOf
  events[]
  errorCodes[]
  recentRuns[]
  upstream[]
  downstream[]
```

`events[]`：

```text
seq
at
phase: schedule | start | job | retry | error | end
level: info | warn | error
job
message
code?
evidenceRef?
```

约束：

- 时间线是日志信号的投影，不是重新解析原始日志
- 根因判断仍由 `pipeline-debug` / 用户完成
- 不展示完整原始日志，只保留可定位事件
- 没有事件时显示空状态，不显示“正常”

## 4. 面板

### 证据 section

内部子视图：

```text
[证据] [运行时间线]
```

### 运行时间线

- 顶部：taskId / runId / status / 时间范围 / asOf
- 摘要：duration、失败事件数、错误码数
- 时间线：按 seq/时间排列的事件
- 错误码：可复制
- 最近运行：可切换 runId，切换后只读取已有结果
- 上游 / 下游：只展示引用，不展开血缘卡

### 状态

- 无 runId：尚未读取运行日志
- running：显示进行中，不推测结果
- partial：保留已返回事件，标“不完整”
- error：显示错误和重试入口
- stale：保留旧时间线，标 asOf

## 5. 交互

- 点击事件只展开 message / evidenceRef
- 错误码可复制
- 最近运行切换只切换已读取的 runId
- 不提供 rerun / kill / deploy
- 不自动轮询真实日志服务

## 6. 非目标

- 不做日志搜索引擎
- 不解析原始日志格式
- 不做根因结论
- 不替代告警/调度平台
- 不新增 `dataops_run_timeline` 工具

## 7. 验收

1. mock `channel-report` 能显示 taskId、runId、duration 和事件序列。
2. 失败事件和 errorCode 可见。
3. 无事件时显示空状态，不显示成功。
4. running / partial / error / stale 有明确状态。
5. 只能读取已有运行结果，不触发 rerun。
6. 不出现对话大卡。

## 8. 待确认

- ContextStore 是否直接承载 `RunTimeline`，还是 Host route 读取 logs provider
- recentRuns 的切换是否需要跨 Session
- 错误码到 evidenceRef 的映射格式
