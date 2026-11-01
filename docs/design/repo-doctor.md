# Repo Doctor 详细设计

> 状态：方案评审中，不实施。
> 路线图：`docs/design/dataops-plugin-roadmap.md`
> 工作项：`workitems/2026-11-01-dataops-plugin-roadmap/`

## 1. 一句话

Agent 在改内部代码仓前，先让 Repo Doctor 扫描一遍：它告诉 Agent 这个仓库有哪些 package、task、artifact，以及哪里会阻断构建或部署。

用户看到的不是“又一个 IDE”，而是一张可读的**仓库体检卡**。

## 2. 用户感知

### 入口 A：对话里的体检卡

Agent 调用 `dataops_repo_scan` 后，Turn 内出现一张卡：

```text
┌──────────────────────────────────────────────┐
│ ● 仓库体检   internal-code-repo     [通过]    │
│   dataops-harness / lts_code + code          │
│                                              │
│   5 packages   4 tasks   6 findings           │
│   0 blocking   2 warnings   4 info            │
│                                              │
│   ⚠ 占位符缺失                        2 项    │
│     DB_EXEC · channel_backfill/task.yaml:44  │
│     ALERT_URL · channel_alert/task.yaml:31   │
│                                              │
│   ● package 文件覆盖                   全部通过 │
│   ● task parent / group               全部通过 │
│                                              │
│   只读扫描 · 2026-11-01 23:40                 │
│   [重新检查]  [复制摘要]  [让 Agent 处理]      │
└──────────────────────────────────────────────┘
```

### 入口 B：`/dataops-check` 命令

用户在 composer 输入：

```text
/dataops-check
/dataops-check --package lts_channel_daily
/dataops-check --task channel_backfill
```

执行一次只读扫描，在对话里插入同一张体检卡。

### 入口 C：composer 状态 chip

仓库被识别且最近扫描过一次时，在 composer dock 显示：

```text
[ 仓库 5 pkg · 2 issues ]   [重扫]
```

- 不自动扫描
- 点击 chip 打开/展开最近一次体检卡
- 没有仓库时不显示
- 不影响普通对话输入

### 入口 D：设置

在 DataOps 设置页增加：

```text
DataOps Repo

仓库根目录   <workspace>/internal-code-repo     [只读/路径]
扫描范围     manifest + build + lts_code + code
忽略目录     output, .git, node_modules
检查级别     基础 / 严格
```

P0 可以先用 workspace 当前目录，设置页作为可选阶段。

## 3. 用户旅程

### 场景 1：Agent 准备改 task

1. 用户说“把 channel_alert 的告警 URL 改一下”。
2. Agent 调 `dataops_repo_scan`。
3. 卡片显示 2 个 warning：`ALERT_URL` 未在 parameters.properties 声明，`send_alert` 的父依赖正常。
4. Agent 先补齐参数，再生成修改。
5. 修改后再扫描一次，卡片变绿。

### 场景 2：用户主动检查

1. 用户输入 `/dataops-check`。
2. 卡片显示 5 packages、4 tasks、findings。
3. 用户点“让 Agent 处理”，卡片把 findings 摘要作为普通用户消息发给 Agent。

### 场景 3：没有仓库

```text
当前 workspace 不是 DataOps 代码仓
缺少 .dataops/manifest.yaml
[打开 Files]  [选择仓库根目录]
```

## 4. 卡片结构

### 4.1 Header

- 左侧状态点 + “仓库体检”
- 当前 workspace / repo 名
- 状态 chip：`通过` / `警告` / `阻断` / `扫描中` / `错误`

### 4.2 概览

```text
packages / tasks / jobs / artifacts
blocking / warning / info
```

数字使用 `b` 标签 + 小标签；不要用大面积彩色块。

### 4.3 Findings

按严重度分组：

```text
阻断（blocking）
  REPO_FILE_MISSING  文件不存在    lts_code/foo/task.yaml
  TASK_PARENT_MISSING 父作业不存在  channel_daily/task.yaml:42

警告（warning）
  PLACEHOLDER_MISSING 参数缺失 ...
  PACKAGE_NO_FILES  package 没有命中文件 ...

提示（info）
  ...
```

每行显示：

- 严重度
- code（monospace）
- 人类可读信息
- file:line
- 可选 task / job / package
- “打开文件”动作

### 4.4 Footer

```text
只读扫描 · as_of
[重新检查] [复制摘要] [让 Agent 处理]
```

## 5. 视觉

- 使用 DSH 的 `--dsw-alias-*` token
- 卡片最大宽度约 720，不铺满整页
- 标题 13px，正文 11px，路径 10px monospace
- 状态色：通过绿、警告琥珀、阻断红、信息中性
- 不展示源码正文；只展示摘要和 file:line
- findings 超过 5 条时折叠为“还有 N 条”
- 空状态简洁，不画大插图

## 6. 交互

- 默认折叠 info
- 点击 finding 行可展开 hint
- “打开文件”复用 DSH Files / workspace file 打开
- “重新检查”不直接调用工具；它发送一条普通用户消息 `/dataops-check`，保持 Agent 回合和审计链
- “让 Agent 处理”把 findings 摘要发送为普通消息，不自动修改
- 扫描中显示 skeleton / 进行中，不阻塞对话
- 错误显示可诊断 code，不吞异常

## 7. 工具契约

### `dataops_repo_scan`

输入：

```json
{
  "root": "optional workspace-relative path",
  "scope": "all | packages | lts | code",
  "package": "optional package name",
  "task": "optional task name",
  "maxFindings": 100
}
```

输出：

```json
{
  "schemaVersion": 1,
  "repo": "internal-code-repo",
  "asOf": "2026-11-01T23:40:00+08:00",
  "status": "pass | warn | block | error",
  "metrics": {
    "packages": 5,
    "tasks": 4,
    "jobs": 13,
    "artifacts": 36,
    "blocking": 0,
    "warning": 2,
    "info": 4
  },
  "packages": [],
  "tasks": [],
  "findings": [
    {
      "severity": "warning",
      "code": "PLACEHOLDER_MISSING",
      "message": "ALERT_URL 未在 parameters.properties 声明",
      "path": "lts_code/channel_alert/task.yaml",
      "line": 31,
      "task": "channel_alert_trigger",
      "job": "send_alert",
      "hint": "在参数文件中补充 key，或在作业中移除引用"
    }
  ],
  "truncated": false
}
```

### `dataops_repo_validate`

- 与 scan 共用同一套 rules
- 只返回 findings / pass 状态
- 用于 Agent 修改后的快速复检

### `/dataops-check`

- 参数：`--package`、`--task`
- 执行只读 scan
- 结果进入同一张卡
- 不写工作项、不改文件

## 8. 检查规则 P0

### 仓库

- `manifest.yaml` 版本 1.2
- `build.yaml` 版本 1.2
- package 必填：packageName/toolChain/serviceType/pipelineType/operationType
- package 文件范围命中
- package 之间不重复

### LTS

- `formatVersion: 2`
- task name 非空且不重复
- job name 非空且 task 内唯一
- `parentJobName` 引用存在
- 无 parent cycle
- `path` 的 group 层级与 parent 一致
- jobType 在允许集合
- 触发型任务 cron 为空
- tskdep 必须具备上游 task/job
- `$$KEY$$` 在 parameters.properties 中存在

### 产物覆盖

- SQL/ETL/DataService 文件至少属于一个 package
- package 不混平台
- 文件路径不得逃逸仓库根目录

P0 不执行 build，不调用外部平台。

## 9. 架构放置

### 推荐 P0

先落在现有包：

```text
packages/dataops-tools/
  src/repo/                现有 index + parser
  src/repo-doctor/         新规则和 scan 结果
  index.js                 注册 dataops_repo_scan/validate

packages/dataops-client/
  src/repo-doctor-card.js  卡片
  src/index.js             tool.call.toolview 注册
```

理由：

- 复用现有 repo index，避免两套扫描
- 不分拆 npm 包，减少发布和依赖成本
- 仍然是一个独立的能力边界，可在后续抽取

### 后续

如果 IDE Agent 或别的 profile 也要用，再抽成独立插件：

```text
@dataops/dsh-repo-doctor
```

抽离条件：出现第二个消费者，或需要独立版本节奏。

## 10. 非目标

- 不自动修改代码
- 不执行 build
- 不部署
- 不读取真实凭据
- 不做文件树/编辑器
- 不做全宽工作台
- 不在工作区后台自动频繁扫描

## 11. 失败与边界

- 非 DataOps 仓库：明确提示缺少 manifest，不猜
- 大仓库：限制文件数、扫描时间、findings 数量
- 超过上限：返回 `truncated: true` 和提示
- parser 失败：返回 `error` finding，不崩溃
- 路径逃逸：`PATH_OUTSIDE_ROOT`
- 权限/文件系统错误：返回可诊断 code

## 12. 验收

1. `samples/internal-code-repo` 扫描到 5 packages、4 tasks。
2. 删除一个 package 文件路径，返回 `REPO_FILE_MISSING`。
3. 修改一个 parent 为不存在的 job，返回 `TASK_PARENT_MISSING`。
4. 增加一个未声明的占位符，返回 `PLACEHOLDER_MISSING`。
5. 扫描只读，不改变仓库文件。
6. 卡片支持 pass / warn / block / scanning / error 五态。
7. `/dataops-check` 能生成同一张卡。

## 13. 待确认

1. P0 是否同时做 `/dataops-check` 和 composer chip，还是只做 tool card？
2. 默认扫描 workspace 当前目录，还是要求配置 repoRoot？
3. `blocking` 是否包含 placeholder 缺失，还是 warning？
4. “让 Agent 处理”发摘要，还是发送固定修复指令？
5. 卡片是否允许展示最多 3 个文件路径，其余折叠？
