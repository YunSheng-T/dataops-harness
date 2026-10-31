# 调度拓扑设计

## channel_daily_mixed

```text
start
 ├── load_check (url GET)
 ├── G_1006 (group)
 │    ├── calc_sql (open_gauss, SQL)
 │    └── export_shell (shell)
 ├── wait_upstream (tskdep，等上游 end)
 └── notify (url POST，多父汇聚)
```

| 作业 | 类型 | 父节点 | 设计目的 |
|---|---|---|---|
| load_check | url GET | start | 检查上游数据是否就绪 |
| G_1006 | group | start | 组内并行门控 |
| calc_sql | open_gauss | G_1006 | 执行数据库 SQL |
| export_shell | shell | G_1006 | 导出/落盘 |
| wait_upstream | tskdep | load_check | 跨任务依赖，不是普通 URL |
| notify | url POST | load_check + G_1006 | 多父汇聚后通知 |

- 任务参数：`bizdate`、`env`
- 所有 URL、数据库、脚本路径：`$$KEY$$`
- 失败处理：fail + 重试；中断回调使用占位符

## order_daily_serial

```text
start → fetch_order (GET) → aggregate_order (POST) → notify_order (POST)
```

用于验证最简单的串行 URL 形态，便于和混合拓扑比较。

## channel_backfill

```text
start → backfill_sql (open_gauss, 180m timeout) → archive_partition (shell)
```

- 回填起止日期来自 taskParams
- 长超时 + 重试
- 归档 shell 失败不影响已写入数据

## channel_alert_trigger

```text
start → prep (shell) → send_alert (url POST)
```

- `type: 触发型任务`
- `cronExp: null`
- shell + url 混排

## 统一约束

- `formatVersion: 2`
- `isFullJob: "是"`
- owner、项目、任务组、执行节点均使用占位符
- `parameters.properties` 是环境替换清单，build 不替换
