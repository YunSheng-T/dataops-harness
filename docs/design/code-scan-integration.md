# Code Scan Integration（P2.1）

> 状态：设计稿，待评审。
> 单一入口：`dataops_code_scan`
> 扫描服务负责执行、规则、结果存储；DataOps 只触发和展示。
> 旧命名：`dataops_cicd_scan` 进入兼容/迁移期，不能成为第二个入口。

## 1. 边界

```text
Code Scan Service
  ├─ 接收 ScanRequest
  ├─ 选择/结构化代码
  ├─ 执行可扩展算子
  ├─ 产出 findings / impacts
  └─ 管理 ScanResultStore

DataOps
  ├─ 通过 dataops CLI 触发 ScanRequest
  ├─ 按 scanId 读取 ScanResult
  ├─ 不管理扫描鉴权或凭据
  └─ 展示 findings / impacts，不重算
```

DDL / DML / Rollback、SQL 语法、破坏性变更、下游影响和 criticality 都由扫描服务产出。DataOps 不解析 SQL，不做第二套规则。

## 2. 单一入口与多个调用方

```text
dataops_code_scan（唯一能力）
  ├─ Agent tool
  ├─ DataOps 检查 section 的“运行代码扫描”
  └─ CI / 外部调用
        │
        ▼
  dataops CLI
        │  鉴权、配置、服务地址由 CLI 自己处理
        ▼
  Code Scan Service
```

它们是同一个扫描服务的不同调用方，不是三个扫描实现。  
DataOps Host / Client 不保存扫描服务凭据，也不实现鉴权。
`dataops_cicd_scan` 只保留旧名兼容，不再新增独立入口。

## 3. 扫描范围

当前：

```text
scope.kind = files
```

文件级输入，支持：

- 当前 workspace 的受支持文件
- 显式文件列表
- 后续由 change set 提供文件列表

后续扩展：

```text
scope.kind = packages
```

包粒度由扫描服务解析 package，不由 DataOps 推断。DataOps 只展示 `scope` 和结果。

## 4. 协议

### 触发

```text
ScanRequest
  scope:
    kind: workspace | files
    files?: string[]
  profile?: string
  source: panel | agent | ci
  requestId?: string
```

`kind=packages` 预留给后续扩展。

```text
ScanAccepted
  scanId: string
  status: queued | running
  acceptedAt: string
```

扫描是异步的。DataOps 不能把长时间扫描挂在一次 HTTP 请求上。

### 读取

```text
GET /api/dataops/code-scan?sessionId=...&scanId=...
```

只支持按 scanId 读取，不提供 latest 查询。
scanId 和结果保留策略由扫描服务管理。

### scanId 归谁保存

DataOps 不管理扫描结果，但需要保存**当前 scanId 的引用**：

- 面板触发后，当前 view 持有 scanId
- Agent 工具返回 scanId，可写入 workitem / evidence
- 页面刷新后，如果没有 scanId，就显示“没有当前扫描”
- 不提供“最近一次扫描”自动恢复，因为扫描服务没有 latest 查询

DataOps 保存的是引用，不是 ScanResult 本体。

### 结果

```text
ScanResult
  schemaVersion
  scanId
  status: pass | warn | block | error | partial
  engine: { name, version }
  profile
  scope
  findings[]
  impacts:
    packages[]
    assets[]
    downstream[]
  metrics
  asOf
  error?
```

`findings[].severity` 和 `impacts` 都由扫描服务提供，DataOps 不重新定级。

## 5. DataOps 面板

不再新增“变更”或“影响”扫描引擎。入口放在 `检查` section：

```text
检查
├─ 仓库规则       Repo Doctor
└─ 代码扫描       dataops_code_scan
     ├─ 运行扫描
     ├─ queued / running / complete / error
     ├─ findings
     └─ impacts
```

### 概览

如果当前有 scanId，显示该扫描：

```text
代码扫描 · scan-... · warn · 3 files · as of 12:30
```

没有 scanId 时不显示“最近扫描”，只显示“尚未选择代码扫描”。

### 运行中

- 触发后立即返回 `scanId`
- 面板轮询 `scanId`
- 显示 queued / running
- 不阻塞对话，不自动重试出重复扫描

### 没有结果

- 不显示“通过”
- 显示“尚未运行代码扫描”
- 不自动扫描

### 包粒度

后续版本在 scope 里显示：

```text
扫描范围：packages / sql_channel_models
```

但 package 解析仍由扫描服务完成。

## 6. 失败

- 触发失败：显示错误，不生成假 scanId
- 运行失败：保留 `scanId` 和 `error`
- partial：保留已产出的 findings，标记不完整
- 结果过期：按扫描服务的 asOf 显示 stale，不偷偷重扫
- 无权限：提示需要扫描服务权限，不在面板里兜底

## 7. 不做

- 不在 DataOps 里实现 SQL parser / lint / impact
- 不把 scan result 塞进对话大卡
- 不做 commit 列表、diff、staged 状态
- 不新增第二个扫描入口
- 不自动修复、不自动发布

## 8. 验收

1. 只有一个 `dataops_code_scan` 入口。
2. 面板能通过 dataops CLI 触发扫描并拿到 `scanId`。
3. 轮询只按 scanId 查询，能显示 queued / running / complete / error。
4. 结果由扫描服务管理，DataOps 只保存 scanId 引用。
5. 文件级 scope 可用。
6. package scope 作为后续扩展，不提前实现。
7. findings / impacts 原样展示，不重新定级。
8. 没有结果时显示“未运行”，不显示通过。

## 9. 待确认

- `dataops CLI` 的触发/查询子命令和 JSON 输出约定
- scanId 写入 workitem / evidence 的格式
- package scope 的首个版本和 package 解析责任

## 10. 关联

- [DataOps 插件路线图](dataops-plugin-roadmap.md)
- [DataOps 聚合面板](dataops-plugin-surface.md)
- 历史方案：[Change Impact Review](change-impact-review.md)（暂停，不再作为独立引擎）
