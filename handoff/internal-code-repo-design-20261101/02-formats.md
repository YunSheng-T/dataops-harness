# 代码格式说明

## 1. LTS task.yaml

### 顶层

```yaml
formatVersion: 2
tasks:
  - itemName: "<PROJECT_NAME>"
    groupName: "<GROUP_NAME>"
    name: "channel_alert_trigger"
    type: "触发型任务"
    cronExp: null
    owner: "<OWNER>"
    taskParams: []
    jobs: [...]
```

### 任务字段

| 字段 | 含义 |
|---|---|
| `formatVersion` | 当前为 2 |
| `itemName` | 项目占位符 |
| `groupName` | 任务组占位符 |
| `name` | 任务名 |
| `type` | 周期任务 / 触发型任务 |
| `startTime` / `endTime` | 生效时间，触发型可为空 |
| `cronExp` | cron，触发型为 null |
| `depPrevious` / `isFullJob` 等 | 平台布尔字段，样例保留 |
| `taskParams` | 任务级参数，如 bizdate / env |
| `jobs` | 作业列表 |

### 作业字段

```yaml
- name: "calc_sql"
  path: "G_1006|calc_sql"
  jobType: open_gauss
  parentJobName: ["G_1006"]
  jobExecPath: "$$DB_EXEC$$"
  jobCallMethod: sql
  jobTimeout: 120
  jobRetryTimes: 1
  jobRetryInterval: 30
  jobExecNode: "<EXEC_NODE>"
  jobExceptionHandleType: "fail"
  jobInterruptHandle: "$$INTERRUPT_URL$$"
  jobMailNotice: "一次提醒"
  isCleanJob: "跟随任务"
  jobParam: {...}
```

- `parentJobName` 是 DAG 依赖；`["start"]` 表示入口
- `path` 中的 `|` 表示 `group|child` 层级
- `jobType` 样例覆盖：`url`、`shell`、`open_gauss`、`group`、`tskdep`
- `jobParam` 随类型不同：URL 参数、DB 参数、tskdep 上游信息等

### 作业类型

| 类型 | 用途 |
|---|---|
| `url` | HTTP GET/POST |
| `shell` | 脚本 |
| `open_gauss` | 数据库 SQL |
| `libra` | 数据库作业（样例未用） |
| `group` | 组内并行门控 |
| `tskdep` | 跨任务依赖 |

### 占位符

源码保留：

```text
$$ALERT_SHELL$$
$$ALERT_URL$$
$$INTERRUPT_URL$$
$$DB_EXEC$$
```

规则：

- build 不替换
- `parameters.properties` 按环境维护
- deploy 阶段才替换
- 预览只显示名称，不显示真实值
- 设计界面应把“占位符”当成一类可解释对象，而不是普通字符串

## 2. parameters.properties

```properties
# 环境参数，样例已脱敏
ALERT_SHELL=<SHELL_PATH>
ALERT_URL=<URL>
INTERRUPT_URL=<URL>
```

## 3. build.yaml

```yaml
version: "1.2"
packages:
  - packageName: lts_channel_daily
    toolChain: data_schedule
    serviceType: data_schedule_service
    pipelineType: his_data_schedule
    operationType: develop
    files:
      - path: lts_code/channel_daily/*
```

- package 至少是平台粒度
- 不混平台
- `files` 是构建实际范围
- `manifest.yaml` 只负责定位

## 4. SQL

```text
code/sql/<model>/
├── DDL/*.sql
├── DML/*.sql
└── Rollback/*.sql
```

- DDL/DML/Rollback 是样例目录习惯，不一定是平台强契约
- 平台扫描应识别 SQL 段类型
- schema、表名、字段值全部脱敏

## 5. ETL

### FlashSync

```text
code/etl/flashsync/channel_alert.csv
```

- 一表一文件
- `jobType: ELT`
- `transformJobFlows` 内嵌 BPMN
- 读端 / 写端 / schema 用占位符

### BDS

```text
code/etl/bds/hive/channel_rollup/
```

- 平台：BDS_HIVE
- 真实制品是 zip
- 样例只放 README，避免提交二进制

### SP

```text
code/etl/sp/calc_channel_summary.sql
```

- 存储过程骨架
- 不含生产正文

## 6. 数据服务

```text
code/data_service/
├── channel_metrics.api.yaml
├── channel_metrics.ofl
├── channel_detail.api.yaml
└── channel_detail.ofl
```

- API 定义由平台扫描发布
- `.ofl` 是下线脚本样例
- 域名、凭据、数据源均为占位符

## 7. 展示建议

设计时建议把文件类型和内容类型分开：

```text
文件后缀：yaml / sql / csv / properties
内容类型：LTS 调度 / build / manifest / SQL / ETL / API
```

不要只按后缀着色。
