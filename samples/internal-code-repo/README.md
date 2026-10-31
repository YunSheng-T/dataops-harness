# 内部数据代码仓（脱敏样例）

这不是一份“空样例”，而是一个按真实平台组织方式构造的最小代码仓：

```text
四类制品
├── 调度      lts_code/
├── SQL/建模  code/sql/
├── ETL       code/etl/{flashsync,bds,sp}/
└── 数据服务  code/data_service/
```

- `.dataops/manifest.yaml`：平台代码位置映射
- `.dataops/build.yaml`：可构建的 package 和文件范围
- 所有 URL、工号、schema、数据源、任务 UUID 均为占位符或 mock
- 每个平台目录下都有 `README.md` 说明设计口径

## 打开方式

在 DSH 的 **Files** tab 打开本 workspace，然后点：

- `lts_code/channel_daily/task.yaml`：看 LTS 任务/作业/DAG
- `lts_code/channel_alert/task.yaml`：看触发型任务
- `.dataops/build.yaml`：看 package 和 toolChain
- `.dataops/manifest.yaml`：看平台映射
- `code/sql/channel_report/DDL/dws_channel_daily.sql`：看 SQL 结构
- `code/etl/flashsync/channel_alert.csv`：看 ETL 作业定义
- `code/data_service/channel_metrics.api.yaml`：看数据服务契约
