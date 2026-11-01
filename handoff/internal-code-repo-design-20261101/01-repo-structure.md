# 内部代码仓结构

## 1. 目录

```text
internal-code-repo/
├── README.md
├── .dataops/
│   ├── manifest.yaml
│   ├── build.yaml
│   └── README.md
├── docs/design/
│   ├── task-topology.md
│   ├── package-map.md
│   ├── placeholder-policy.md
│   └── etl-and-service.md
├── lts_code/
│   ├── channel_daily/
│   ├── channel_alert/
│   ├── order_daily/
│   └── channel_backfill/
│       ├── task.yaml
│       └── parameters.properties
├── code/
│   ├── sql/
│   │   ├── channel_report/
│   │   ├── channel_mapping/
│   │   └── member_profile/
│   ├── etl/
│   │   ├── flashsync/
│   │   ├── bds/
│   │   └── sp/
│   └── data_service/
└── ...
```

样例共 36 个文件，LTS 任务 4 个，packages 5 个。

## 2. 四类制品

| 类 | 目录 | 形态 |
|---|---|---|
| 调度 | `lts_code/` | `task.yaml` + `parameters.properties` |
| SQL / 建模 | `code/sql/` | `.sql`，按模型分目录 |
| ETL | `code/etl/` | FlashSync CSV、BDS 目录/zip、SP SQL |
| 数据服务 | `code/data_service/` | `.api.yaml` + `.ofl` 下线脚本 |

## 3. LTS 任务

| 任务 | job 数 | 重点 |
|---|---:|---|
| `channel_daily_mixed` | 6 | group、open_gauss、shell、tskdep、多父汇聚 |
| `channel_alert_trigger` | 2 | 触发型、shell + POST、空 cron |
| `order_daily_serial` | 3 | 串行 URL |
| `channel_backfill` | 2 | 回填参数、长超时、重试 |

## 4. package 映射

| package | 平台 | 文件范围 |
|---|---|---|
| `lts_channel_daily` | LTS | `lts_code/channel_daily/*` 等 |
| `sql_channel_models` | OfflineSQL | `code/sql/**/*.sql` |
| `etl_channel_sync` | FlashSync-ETL | `code/etl/flashsync/*` |
| `etl_channel_bds` | BDS_HIVE | `code/etl/bds/**/*` |
| `api_channel_metrics` | DataApi | `code/data_service/*` |

## 5. 两个事实源

- `manifest.yaml`：平台代码根目录定位
- `build.yaml`：package 与构建文件范围，是构建事实源

`build.yaml` 的 `files` 相对**仓库根目录**，不是 manifest 路径。当前 CLI 尚未实现 `${structure.ref...}` 变量展开，设计时不要把“定位”和“构建路径”混在一起。

## 6. 设计上要表达的结构

代码仓浏览不是普通文件树，应该让用户看出：

1. 这是哪个平台制品
2. 它属于哪个 package
3. 文件之间是否有同一条数据链路
4. 是否有源码、产物、参数、血缘

完整文件树见 `repo-tree.txt`。
