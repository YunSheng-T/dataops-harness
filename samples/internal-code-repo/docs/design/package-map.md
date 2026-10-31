# Package 映射设计

| package | toolChain | 平台 | 目的 |
|---|---|---|---|
| `lts_channel_daily` | `data_schedule` | LTS | 日报、回填、告警四个调度任务 |
| `sql_channel_models` | `data_models` | OfflineSQL | 渠道日报、渠道映射、会员维度 |
| `etl_channel_sync` | `extract_transform_load` | FlashSync-ETL | 渠道告警数据加工 |
| `etl_channel_bds` | `extract_transform_load` | BDS_HIVE | 渠道汇总作业制品 |
| `api_channel_metrics` | `data_service_type` | DataApi | 指标查询与下线脚本 |

- package 至少是平台粒度，不混平台。
- `files` 相对仓库根目录。
- `manifest.yaml` 只负责平台代码根目录，不作为构建实际路径。
- 真实环境用 `${structure.ref...}` 由未来 CLI 解析。
