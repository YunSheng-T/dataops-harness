# ETL 与数据服务设计

## FlashSync-ETL

`code/etl/flashsync/channel_alert.csv`：

- 一表一文件
- `jobType: ELT`
- `transformJobFlows` 内嵌 BPMN reader/writer + 字段映射
- 读端/写端的数据源、schema、表名均为占位符
- 写入模式 Merge / Update

## BDS_HIVE

`code/etl/bds/hive/channel_rollup/README.md` 说明制品的平台形态。真实 zip 不入样例仓。

## SP

`code/etl/sp/calc_channel_summary.sql` 只保留存储过程骨架，不包含生产正文。

## 数据服务

- `channel_metrics.api.yaml`：指标查询
- `channel_detail.api.yaml`：明细查询
- `.ofl`：下线脚本
- 接口路径、数据源、凭据均为占位符
