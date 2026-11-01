# 一页总结

## 这是什么

DataOps 在 DSH 之上提供数据代码仓的结构化预览、血缘和调度视图。代码浏览复用 DSH 工作区 Files tab，不另造代码仓页面。

## 代码仓

```text
internal-code-repo/
├── .dataops/          manifest/build 事实源
├── lts_code/          4 个调度 task.yaml + parameters.properties
├── code/sql/          DDL / DML / Rollback
├── code/etl/          FlashSync / BDS / SP
├── code/data_service/ API / ofl
└── docs/design/       拓扑、package、占位符、ETL/服务
```

36 个文件，5 个 packages。

## 调度格式

- `formatVersion: 2`
- `tasks[].name / type / cronExp / taskParams`
- `jobs[].jobType / parentJobName / jobExecPath / jobParam`
- jobType：`url`、`shell`、`open_gauss`、`group`、`tskdep`
- `path` 中的 `G_1006|calc_sql` 表示 group 内子作业
- `$$KEY$$` 源码占位符，build 不替换，deploy 才替换
- `manifest.yaml` 只定位，`build.yaml.files` 是构建事实源

## 当前 UI

```text
task.yaml
├─ 左：LineageSurface 三视图卡
└─ 右：CodeMirror 只读源码
```

- 右栏血缘：设计 / 生产 / 调度
- compact / focus
- 文件 YAML 使用真实解析数据，不是静态 mock
- 卡片有边界，不 fixed 全屏
- 源码用分栏，不放抽屉

## 设计目标

1. 一张血缘卡，保留三视图
2. 文件 YAML 的真实调度数据与右侧源码对齐
3. 窄侧栏和宽面板都有稳定比例
4. 图、inspector、参数、占位符有清晰层级
5. 不再做第二套全宽工作台

## 设计输入

- `repo/`：可解压的脱敏样例仓
- `screenshots/`：当前卡、三视图、真实 YAML、原型
- `prototype/`：可交互 HTML
- `02-formats.md`：完整字段与示例
- `03-ui-context.md`：当前界面与问题
- `04-open-questions.md`：待设计判断
