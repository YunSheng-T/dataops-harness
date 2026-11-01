# DataOps 插件聚合设计

> 状态：P0 已实现第一版（DataOps 单面板 + `/dataops` 命令）。
> 关联：`docs/design/dataops-plugin-roadmap.md`、`docs/design/repo-doctor.md`

## 1. 问题

后续插件会越来越多。如果每个插件都：

- 往对话里塞一张结果卡
- 往右栏新增一个独立 tab
- 注册一个自己的 slash command
- 在 composer 加一个自己的 chip

界面会很快碎片化，结果也会随着对话滚动丢失。

## 2. 结论

**插件不再拥有自己的用户入口；插件向 DataOps 工作面板贡献 section。**

```text
DSH Files tab       继续由 DSH 管文件浏览
DataOps 面板        一个固定右栏 tab
  ├─ 概览
  ├─ 仓库
  ├─ 资产
  ├─ 血缘
  ├─ 证据
  └─ 检查
```

插件只提供数据和 section 视图，不直接向 `sidebar.right.pane.tab` 塞多个 tab。

## 2.1 DSH 命令语法的现实

DSH 原生命令只注册一个名字：

```text
/dataops
```

名字只能是小写字母、数字、`_`、`-`，**不能包含空格**。
空格后的内容全部进入 `rawInput`，由命令 handler 自己解析：

```text
/dataops repo index
  name: dataops
  rawInput: " repo index"
```

因此：

- `/dataops repo index` 是**一个命令 + 自有子命令 grammar**
- 命令面板只会显示 `/dataops`，不会显示 `/dataops repo index`
- 参数提示用 `input.hint`，例如：

```text
<repo index|validate|check | open>
```

- 没有原生的二级命令树、自动补全和结构化参数校验
- 空白符、引号、`--package` 等都要由 handler 自己解析
- 如果以后需要更好的补全，可以在 client `commandUi` 做 popup，但 Host 仍然只看到 `/dataops`

这也是为什么不再注册 `/dataops-repo-index` 这类分散命令。

## 2.2 谁使用这个命令

`/dataops` 是**人用的命令**，不是 Agent 调用入口。

| 使用者 | 入口 | 用途 |
|---|---|---|
| 数据开发 | DataOps 面板 | 主流程：看仓库、改文件、跑检查 |
| 数据开发 | `/dataops` | 用键盘快速打开面板 |
| 数据运维 | `/dataops repo check` | 拉取变更后强制检查当前 workspace |
| Agent | `dataops_repo_index` / `dataops_repo_validate` 工具 | 读取结构化结果，不能调用 slash command |
| CI / 脚本 | Host 工具或 CLI | 不经过聊天命令 |

主入口是面板，命令是快捷键和诊断入口，不是唯一入口。

推荐公开程度：

```text
公开：/dataops            打开面板
公开：/dataops repo check 强制检查
高级：/dataops repo index  只刷新索引
高级：/dataops repo validate 只跑规则
```

`index` / `validate` 可以保留，但不应该成为普通用户必须记住的命令。

## 3. 位置

### 右栏 DataOps tab

一个固定入口：

```text
右侧栏
[文件] [DataOps]
```

`DataOps` tab 内部再分组：

```text
概览 / 仓库 / 资产 / 血缘 / 证据 / 检查
```

这样右栏不会随着插件增长变成一排 tab。

### Composer

只保留一个聚合状态入口：

```text
[DataOps · 2]   // 未读 findings 数
```

点击打开 DataOps 面板。
不再每个插件一个 chip。

### 命令

只保留一个命名空间：

```text
/dataops
├─ open [section]
├─ scan
├─ validate
└─ check
```

不再注册 `/repo-check`、`/lts-check`、`/env-check` 等命令。

### 对话

持久信息优先在 DataOps 面板，不再为每个插件造一张对话卡。

Agent 需要回答时用普通文字；工具结果可以只返回摘要和面板入口。对话里最多出现一行紧凑的工具状态，不出现大卡片。

## 4. 面板 section 契约

插件注册 section，而不是 tab：

```text
dataopsPanels.register({
  id: 'repo.doctor',
  group: 'checks',
  title: '仓库检查',
  order: 20,
  icon: ...,
  badge: () => number,
  render: (context) => ...
})
```

面板 shell 负责：

- 位置、分组、排序
- 当前 workspace / repo 上下文
- loading / empty / error
- tab 切换
- 刷新和缓存
- 统一视觉

section 负责：

- 自己的数据
- 自己的空状态
- 自己的操作
- 不抢占全局入口

## 5. 分组

| group | 内容 |
|---|---|
| overview | 当前仓库 / workspace 一页概览 |
| repo | package、制品、文件覆盖 |
| assets | 表、模型、API 等资产 |
| lineage | 设计 / 生产 / 调度三视图 |
| evidence | 证据、查询、时间范围 |
| checks | findings、扫描结果、警告 |

## 6. 刷新模型

面板内部：

```text
open panel
  → detection
  → if repo detected: scan（索引）
  → if checks section: validate（规则）
```

规则：

- 打开面板不自动执行重规则
- scan 结果可缓存
- validate 需要显式触发或发现 index 失效
- agent 工具调用只返回摘要，不负责渲染 UI
- 面板刷新不依赖对话卡生命周期

## 7. 迁移

### Phase 1

- 新增 DataOps panel shell
- 把现有资产 / 血缘 / 证据三个 tab 迁入
- 保留 `DataOps` 单 tab

### Phase 2

- Repo Doctor 作为 `overview` / `checks` section 接入
- 增加 `/dataops` 命令
- 移除对话卡

### Phase 3

- 后续插件统一注册 section
- 不再允许新增独立右栏 tab

## 8. 设计约束

- 面板不能铺满整个页面
- 在右栏宽度 620–720 下可用
- section 内不重复做第二套导航
- 不使用 `sidebar.right.pane.tab` 作为插件扩展点
- 不与 DSH Files / 编辑器竞争
- 不把 panel 状态存在单次对话卡片里

## 9. 已确认

- DataOps 面板**替代**现有资产 / 血缘 / 证据三个独立 tab。
- 面板是右栏固定 tab，不新开主区页面。
- 插件的持久结果只进入面板 section，不进入对话大卡。
- composer 状态 chip 是可选后续项，不作为 P0 依赖。
- 设置入口可以后续收进 DataOps 设置页；P0 不强制做设置 UI。

## 10. 命令盘点

当前仓库**没有已实现的 DSH slash 子命令**。

已有的是 CLI：

```text
dataops-install       安装
dataops-doctor        安装/profile 诊断
dataops-uninstall     卸载
```

以及 Agent tools：

```text
dataops_shared_*
dataops_cicp_*
...
```

这些都不是 `/dataops` 的子命令，不能直接复用为聊天命令。

因此 P0 的 `/dataops` 是**新命令命名空间**，不是迁移旧命令。
