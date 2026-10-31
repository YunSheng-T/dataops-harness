# 调度拓扑设计

`lts_code/channel_daily/task.yaml` 是一个真实的混合拓扑：

```text
start
 ├── load_check (url GET)
 ├── G_1006 (group)
 │    ├── calc_sql (open_gauss)
 │    └── export_shell (shell)
 ├── wait_upstream (tskdep，等上游 end)
 └── notify (url POST，多父汇聚)
```

- `G_1006` 是组内并行；
- `notify` 是 `load_check` 与 `G_1006` 的多父汇聚；
- `wait_upstream` 是跨任务依赖，不是普通 URL；
- 所有 URL、数据库和脚本路径均为 `$$KEY$$`，部署时替换。

`lts_code/channel_alert/task.yaml` 是触发型任务，覆盖 shell + url 混排和空 cronExp。
