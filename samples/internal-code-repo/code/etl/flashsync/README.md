# FlashSync / FlashSync-ETL

本目录是一表一文件样例。真实文件未加引号，且 `transformJobFlows` 单元格内嵌 BPMN XML。

- 文件：`channel_alert.csv`
- 作业类型：`ELT`
- 读端：`<DB_SOURCE>` / `<SCHEMA>` / `<TABLE_NAME>`
- 写端：渠道告警临时表
- 写入模式：Merge
