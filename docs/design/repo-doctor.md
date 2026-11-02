# Repo Doctor 详细设计

> 状态：P0-B 蓝图完成，待实现验收；只做 Repo Doctor。
> 路线图：`docs/design/dataops-plugin-roadmap.md`
> 聚合方案：`docs/design/dataops-plugin-surface.md`
> P0-B 全量蓝图：[dataops-repo-doctor-blueprint.html](../../prototype/dataops-repo-doctor-blueprint.html)
> P0-B 增量：[dataops-repo-doctor-blueprint-delta.html](../../prototype/dataops-repo-doctor-blueprint-delta.html)

## 1. 一句话

Repo Doctor 是 DataOps 工作面板里的**仓库体检 section**，不是对话卡，也不是新的代码仓页面。

它告诉 Agent 和用户：

- 当前 workspace 是不是 DataOps 代码仓
- 有哪些 package、task、artifact
- 哪些地方会阻断构建/导入
- 哪些只是部署前风险

## 2. 用户感知

### 唯一入口：DataOps 面板

```text
右侧栏
[文件] [DataOps]
          │
          ├─ 概览
          ├─ 仓库
          └─ 检查
```

旧资产 / 血缘 / 证据 tab 在 P0 保持原样。

打开 DataOps 面板，默认显示 `概览`：

```text
┌──────────────────────────────────────────────┐
│ DataOps                                      │
│ internal-code-repo                 [已识别]   │
│                                              │
│ 仓库体检                                     │
│ 5 packages · 4 tasks · 13 jobs · 36 files    │
│ 0 blocking · 2 warnings · 4 info             │
│                                              │
│ [运行检查]  [刷新索引]                        │
├──────────────────────────────────────────────┤
│ 检查                                         │
│ ⚠ PLACEHOLDER_MISSING                 2 项   │
│   DB_EXEC · channel_backfill/task.yaml:44     │
│   ALERT_URL · channel_alert/task.yaml:31      │
│ ● package 覆盖                          通过  │
│ ● task parent / group                   通过  │
└──────────────────────────────────────────────┘
```

### 不是对话卡

- Agent 调用工具后，不在对话里插入大卡片
- 面板有固定位置，不随对话滚动丢失
- 对话里最多出现一行“已更新 DataOps 面板”
- 用户可以随时重新打开面板查看当前状态

### 命令

#### 使用者

```text
人：
  DataOps 面板
  /dataops
  /dataops repo check

Agent：
  dataops_repo_index
  dataops_repo_validate

CI / 脚本：
  Host 工具或 CLI
```

slash command 是 DSH 的人类命令面，Agent 不会调用它。Agent 的入口始终是 tool。


只注册一个 `/dataops`。
DSH 的命令名不能包含空格，`repo index` 是 `rawInput`，不是原生命令层级：

```text
/dataops
  name: dataops
  input.hint: "open [section] | repo <index|validate|check>"
  rawInput: " repo check"
```

命令面板只显示 `/dataops`；二级动作由 handler 解析。P0 不依赖原生补全。



```text
/dataops                打开 DataOps 面板
/dataops open checks    打开检查 section
/dataops repo index      只做索引扫描
/dataops repo validate   只做规则校验
/dataops repo check      索引 + 校验
```

P0 四个子命令一起做：

```text
/dataops              打开面板
/dataops repo index   只做索引
/dataops repo validate 只做规则校验
/dataops repo check   索引 + 校验
```

`scan` / `validate` 不是两个功能重复项，区别见第 4 节。

### Composer chip

可选，后续再加：

```text
[DataOps · 2]   // 未读 findings 数
```

- 全局面板只有一个聚合 chip
- 不为每个插件加 chip
- 点击打开面板
- 没有 repo 或没有结果时不显示

## 3. 检测：当前 workspace 是不是数据代码仓

默认根目录：**当前 Session 的 workspace root**。
不递归搜索整个 workspace，不扫描 `$HOME`，不猜子目录。

### 强信号

同时满足：

1. `.dataops/manifest.yaml` 存在且可解析
2. `.dataops/build.yaml` 存在且可解析
3. `manifest.structure.ref` 至少一个平台根目录存在
4. `build.packages` 至少一个 package

### 三态

```text
detected       强信号满足，进入扫描
partial        有 .dataops 但配置/平台根目录有缺失；显示诊断，不宣称正常仓库
not-detected   不是 DataOps 代码仓；显示说明，不自动扫描
```

### 反例

- 只有 `task.yaml`，没有 `.dataops/`：`not-detected`
- `.dataops/manifest.yaml` 存在但没有 build：`partial`

### 错误态

扫描失败不是空状态，面板必须显示可定位的错误：

```text
code        REPO_DOCTOR_FAILED
stage       detect | index | validate
workspace   internal-code-repo
message     当前 Session 的 workspace 无法解析
next        确认 cwd / 重新打开 workspace / 重试
```

错误 code 至少覆盖：

- `SESSION_NOT_FOUND`
- `WORKSPACE_UNAVAILABLE`
- `REPO_SCAN_FAILED`
- `REPO_VALIDATE_FAILED`
- `TRANSPORT_FAILED`

不允许只显示“扫描失败”；不允许把错误渲染成空白指标。
- workspace 内有 `samples/internal-code-repo` 子目录：默认不递归，用户应打开该子目录作为 workspace
- 未来支持 `dataops.repoRoots` 配置，但 P0 只做当前 workspace

### 输出

```json
{
  "detected": true,
  "confidence": "strong",
  "root": "internal-code-repo",
  "signals": [".dataops/manifest.yaml", ".dataops/build.yaml", "lts_code", "code"]
}
```

## 4. scan 与 validate

### scan：发现，不下结论

- 读取 manifest / build
- 遍历 package 文件范围
- 解析 LTS tasks/jobs
- 识别 artifact 类型
- 构建 RepoIndex
- 不产生 severity
- 可以缓存；文件变化后失效

输出：

```text
RepoIndex
  repo, root, asOf, digest
  detection
  packages[]
  tasks[]
  artifacts[]
  files[]
```

### validate：规则，产生 findings

- 读取 RepoIndex
- 执行规则
- 产生 `blocking / warning / info`
- 不重新遍历全仓，除非 index 失效
- 可被 Agent、面板、CI 共用

输出：

```text
ValidationResult
  indexDigest
  status: pass | warn | block | error
  findings[]
```

### check：组合

```text
/dataops repo check = index（若过期）+ validate
```

### 工具契约

Host 只暴露两个 Agent 工具：

```text
dataops_repo_scan
dataops_repo_validate
```

P0 的 `check` 是面板/命令层组合，不新增第三个 agent 工具。

## 5. 严重度

### blocking

确定会阻断构建/导入/解析：

- manifest/build 解析失败
- package 必填字段缺失
- package 文件路径不命中
- task/job 解析失败
- parentJobName 指向不存在的 job
- 存在 parent cycle
- group path 与 parent 不一致
- jobType 非法

### warning

无法确定外部环境，但部署前必须确认：

- `$$KEY$$` 未在 `parameters.properties` 声明
- parameters 文件缺失
- package 没有命中文件以外的覆盖缺口
- 任务/作业命名 warning
- 依赖目标无法静态确认

### info

- 覆盖率建议
- 命名风格
- 可优化项

### 关于占位符

已确认：`$$KEY$$` 缺失默认是 **warning**，不是 blocking：

- build 不替换
- deploy 才替换
- 可能由目标环境提供
- 但不能宣称通过；应显示“部署前确认”

只有以下情况可升级为 blocking：

- 配置要求所有占位符必须由本地 properties 声明
- 该 key 被标记为 required
- validate 明确运行在 deploy-ready 模式

## 6. P0 规则

### 仓库

- manifest/build 版本 1.2
- package 必填：packageName/toolChain/serviceType/pipelineType/operationType
- package 文件范围命中
- package 不重复
- package 不混平台

### LTS

- formatVersion 2
- task name 非空且唯一
- job name 非空且 task 内唯一
- parent 引用存在
- 无 cycle
- path 的 group 层级与 parent 一致
- jobType 白名单
- 触发型任务 cron 为空
- tskdep 上游字段齐全
- 占位符引用可追踪

### 产物

- SQL/ETL/DataService 文件至少属于一个 package
- package 不混平台
- 文件路径不逃逸 root

## 7. 面板布局

### 概览

- detection 状态
- repo root / workspace
- metrics
- blocking/warning/info
- 最近扫描 as_of
- 操作：运行检查 / 刷新索引

### 检查

- 按 severity 分组
- 每条 finding 显示 code、message、file:line
- 可展开 hint
- 点击路径打开 DSH Files
- 空状态：`当前没有发现问题`
- 不显示源码正文

### 仓库

- package 列表
- 每个 package 的文件覆盖和平台
- 点击 package 查看包含文件
- 不放文件树编辑器

### 资产 / 血缘 / 证据

P0 不迁入、不重做；继续使用旧 tab。P1 再聚合。

## 8. 交互

- 打开面板时只做 detection + 轻量 scan
- 重规则 validate 需要显式触发
- 刷新按钮只刷新当前 section
- 文件变化后 badge 标“索引过期”
- 不自动弹出提示
- 不写文件，不执行 build，不部署

## 9. 视觉

- 使用 DSH token
- 右栏内单列，宽度 620–720 可用
- findings 行高约 44–56
- code 用 monospace
- 状态用点 + 文本，不用大面积色块
- 分组标签克制，不做卡片套卡片
- 面板本身可滚动，section 不争抢整个视口

## 10. 架构放置

### P0

先扩展现有包，不新增独立 npm 包：

```text
dataops-tools/
  src/repo/                 现有 index
  src/repo-doctor/          新 rules + scan/validate
  index.js                  注册 dataops_repo_scan/validate

dataops-client/
  src/dataops-panel/        panel shell + sections
  src/repo-doctor-section.js
  src/index.js              注册 DataOps tab
```

### 后续抽离条件

出现第二个消费者，或 IDE/其他 profile 需要独立版本时，再抽：

```text
@dataops/dsh-repo-doctor
```

## 11. 非目标

- 不做文件树/编辑器
- 不做对话大卡
- 不做全宽工作台
- 不做自动修复
- 不执行 build/deploy
- 不读取真实凭据
- 不递归扫描任意目录

## 12. 验收

1. 当前 workspace 有合法 `.dataops` 时检测为 `detected`。
2. 只有 task.yaml 没有 `.dataops` 时检测为 `not-detected`。
3. 有 manifest 无 build 时检测为 `partial`。
4. 样例仓 scan 得到 5 packages、4 tasks。
5. 删除 package 文件后 validate 返回 `PACKAGE_FILE_MISSING`。
6. parent 指向不存在 job 时返回 `TASK_PARENT_MISSING`。
7. 未声明占位符返回 warning，不返回 blocking。
8. 面板有 loading / empty / error / stale 状态。
9. `/dataops repo check` 能刷新面板，不产生对话大卡。
10. 全程只读。

## 13. 已确认

- P0 只做 Repo Doctor 面板，现有资产 / 血缘 / 证据 tab 保持原样。
- P1 再决定是否合并成一个 DataOps 面板。
- P0 一起实现 `/dataops`、`/dataops repo index`、`/dataops repo validate`、`/dataops repo check`。
- placeholder 缺失统一 warning。
- 当前 workspace 不是 repo 时只提示打开正确 workspace，不递归搜索，不在 P0 做目录选择器。
- P0 仍需补全一次 blueprint 和增量说明后再进入实现。
