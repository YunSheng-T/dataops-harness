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

RuntimeLog 不从 package 查。它属于平台运行维度：

```text
代码中的平台坐标
  platform
  project
  taskGroup
  task
  job?
        │
        ▼
RuntimeLocator
        │  清单查询
        ▼
RuntimeRef[]  platformRunId / status / startedAt
        │  详情查询
        ▼
RuntimeRun  events / errorCodes / asOf
```

主键是一次平台运行实例：

```text
RuntimeRef
  platform
  runId
  status
  startedAt
  finishedAt
  durationMs
```

坐标来自代码 / RepoIndex：

```text
RuntimeLocator
  platform: lts | etl
  project
  group
  task
  job?
  sourcePath
```

- LTS：项目 / 任务组 / task name
- ETL：平台 / 项目 / 作业 / job
- 坐标不完整时显示 gap，不猜
- 不按 package 查 RuntimeLog
- 不把多个平台的 run 合成一个时间线

## 2.2 查询流程

```text
1. 从代码或仓库对象拿到 RuntimeLocator
2. runtime list(locator, timeRange)
   → 最近运行列表
3. 选择 platformRunId
4. runtime detail(platform, runId)
   → 单次运行时间线
```

面板顶部显示坐标：

```text
lts · project-a · channel_daily · channel_daily_mixed
```

不是 package/version。

## 2.3 DeployLog 与 RuntimeLog

```text
DeployLog
  deploymentId
  package / version / environment
  build / upload / activate / health

RuntimeLog
  RuntimeLocator
  platform run list
  platform run detail
```

两者没有统一 ID：

- 部署日志按统一 `deploymentId` 查询
- 运行日志按平台坐标 + 平台 runId 查询
- 可以在 UI 上做“从部署查看关联运行”，但不合并时间线

## 3. 输入

沿用 `dataops_shared_read_logs` 的输出，补充 RuntimeLocator、运行列表和单次运行详情。`dataops_shared_read_logs` 的 `taskId` 兼容参数继续保留，新调用传平台坐标。

```text
RuntimeRun
  locator { platform, project, group, task, job?, sourcePath }
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
