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
  ├─ 触发同一个 ScanRequest
  ├─ 按 scanId 读取 ScanResult
  └─ 展示 findings / impacts，不重算
```

DDL / DML / Rollback、SQL 语法、破坏性变更、下游影响和 criticality 都由扫描服务产出。DataOps 不解析 SQL，不做第二套规则。

## 2. 单一入口与多个调用方

```text
dataops_code_scan（唯一能力）
  ├─ Agent tool
  ├─ DataOps 检查 section 的“运行代码扫描”
  └─ CI / 外部调用
```

它们是同一个扫描服务的不同调用方，不是三个扫描实现。  
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
GET /api/dataops/code-scan?sessionId=...&latest=1
```

DataOps 只做结果读取；scanId 和结果保留策略由扫描服务管理。

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

只显示最近一次扫描：

```text
代码扫描 · scan-... · warn · 3 files · as of 12:30
```

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
2. 面板能触发扫描并拿到 `scanId`。
3. 轮询能显示 queued / running / complete / error。
4. 结果由扫描服务读取，DataOps 不写扫描结果。
5. 文件级 scope 可用。
6. package scope 作为后续扩展，不提前实现。
7. findings / impacts 原样展示，不重新定级。
8. 没有结果时显示“未运行”，不显示通过。

## 9. 待确认

- 扫描服务触发接口是同步受理还是直接返回 scanId
- 结果保留时间和 latest 查询粒度
- 鉴权和 DataOps 调用扫描服务的凭据放置
- package scope 的首个版本和 package 解析责任

## 10. 关联

- [DataOps 插件路线图](dataops-plugin-roadmap.md)
- [DataOps 聚合面板](dataops-plugin-surface.md)
- 历史方案：[Change Impact Review](change-impact-review.md)（暂停，不再作为独立引擎）
