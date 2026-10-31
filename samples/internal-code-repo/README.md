# 内部数据代码仓（脱敏样例）

这不是“一个 task.yaml 的示例”，而是按真实平台组织方式构造的最小代码仓。

```text
四类制品
├── 调度      lts_code/
├── SQL/建模  code/sql/
├── ETL       code/etl/{flashsync,bds,sp}/
└── 数据服务  code/data_service/
```

- `.dataops/manifest.yaml`：平台代码位置映射
- `.dataops/build.yaml`：package 与文件范围
- `docs/design/`：任务拓扑、package 映射、占位符策略
- 所有 URL、工号、schema、数据源、任务 UUID 均为占位符或 mock

## 调度

| 文件 | 任务 | 设计重点 |
|---|---|---|
| `lts_code/channel_daily/task.yaml` | channel_daily_mixed | group / open_gauss / shell / tskdep / 多父汇聚 |
| `lts_code/channel_alert/task.yaml` | channel_alert_trigger | 触发型、shell + POST、空 cron |
| `lts_code/order_daily/task.yaml` | order_daily_serial | 3 段串行 URL、GET→POST |
| `lts_code/channel_backfill/task.yaml` | channel_backfill | 回填参数、数据库作业、长超时、重试 |

## SQL / 数据建模

- `channel_report`：DWS 渠道日报事实表
- `channel_mapping`：渠道维表 MERGE
- `member_profile`：会员维度 MERGE
- DDL / DML / Rollback 仅作为样例可读性分组，不作为平台契约

## ETL

- `flashsync/channel_alert.csv`：FlashSync-ETL 一表一文件，`transformJobFlows` 内嵌 BPMN
- `bds/hive/channel_rollup/`：BDS_HIVE 制品说明（真实形态为 zip）
- `sp/calc_channel_summary.sql`：存储过程代码

## 数据服务

- `channel_metrics.api.yaml` / `channel_detail.api.yaml`
- `.ofl` 为下线脚本样例

## 打开方式

在 DSH 的 **Files** tab 打开本 workspace：

- `lts_code/channel_daily/task.yaml`：任务名、cron、6 作业 DAG、参数、占位符
- `.dataops/build.yaml`：package 表
- `.dataops/manifest.yaml`：平台映射
- `code/sql/**/*.sql`：DDL/DML 分段
- `lts_code/*/parameters.properties`：键值表

## 物化独立 workspace

```sh
node scripts/create-internal-code-repo-workspace.mjs
```

默认目标：`~/code/internal-code-repo`。脚本不会修改 DSH workspace store；在 DSH 中“添加工作区”即可。
