# 占位符设计

- 源码保留 `$$KEY$$`，不写真实 URL、数据源、脚本路径。
- `parameters.properties` 由开发维护，按环境替换。
- build 只校验并打包，不替换参数。
- `dataops deploy execute` 才在目标环境替换。
- `APP_ID`、工号、任务组等平台字段必须在部署/导入前满足格式校验。
- 预览只展示占位符名称，不显示真实值。
