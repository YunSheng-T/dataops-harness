# @dataops/dsh-dataops-client

数据开发工作台的 DSH 客户端插件：把**阶段产物**渲染成对话内的卡片。

它把数据开发能力挂到 DSH 的原生 seat 上，工具结果长什么样由 Host 侧决定，客户端只负责呈现。

**不改变 DSH 原生布局**：不新增侧栏、不改对话头、不加输入框。当前注册 4 类 seat：

| seat | 内容 |
|---|---|
| `tool.call.toolview` | US / 表 / 血缘 / 证据 / 画像 / CICD 扫描 / 编译 / 测试 / 发布 / DeliverableRenderer / StageResultCard（按 kind 分发 8 类交付物） |
| `conversation.session.header.actions` | 标题旁阶段 chip「设计 · 2/6」 |
| `sidebarRightTabs` + `sidebar.right.pane.tab` | 右栏「资产 / 血缘 / 证据」三个标签（按会话记忆）；血缘是 SVG 节点/边图谱 |
| `conversation.chat.turnTail` | 轮末阶段简报（6 段进度 + 子步骤 + 下一步 + 留档） |

阶段状态由 turnTail 的定义从 `dataops_*` 工具结果里解析，写进 `stage-store`；同一轮的所有 payload 也写进 `context-store`，右栏三个标签从这里读。

> 运行时说明：桌面端/原生命令是 0.2.1-rc.2，它没有 `sidebar.session.row.trailing`，所以**不做会话行徽标**；阶段信息用标题旁 chip + 轮末简报。rc.3 再评估行尾座位。
没有在 `TOOL_VIEWS` 里注册的工具，DSH 会退回通用卡片；所以"平时是普通 Agent，需要具体能力才出现卡片"是默认行为，不需要额外开关。

## 卡片与工具对应

| 工具（wire name） | 卡片 | 产物 |
|---|---|---|
| `dataops_shared_read_us` | `USPickerCard` | US 列表 / 详情 |
| `dataops_shared_read_table` | `TableCard` | `table` |
| `dataops_shared_read_lineage` | `LineageCard` | `lineage` |
| `dataops_shared_read_evidence` | `EvidenceCard` | `evidence/ev-*.yaml` |
| `dataops_shared_read_profile` | `ProfileCard` | `profile.yaml` |
| `dataops_cicd_scan` | `CicdCard` | `scan-report.yaml` |
| `dataops_cicd_compile` | `ScheduleCard` | `schedule.yaml` |
| `dataops_cicd_test` | `TestCard` | `test-report.yaml` |
| `dataops_cicd_release` | `ReleaseCard`（awaiting/released/rejected） | `release.yaml` |
| `dataops_shared_present_deliverable` | `DeliverableRenderer`（按 kind 分发） | `deliverables/*` |

旧内容卡组件（Requirement/Design/Analysis/Solution/TechPlan/Develop/Postmortem/Incident）仍保留在 `cards.js` 供兼容与测试，但 P2.4 不再注册对应 toolview；内容交付物统一走 presenter。

工具结果约定：**最后一段文本必须是 JSON**，带 `kind` 字段（`requirement` / `design` / `table` / `lineage` / `tech_plan` / `evidence` / `develop` / `test` / `release` / `postmortem` / `incident`），且必须是 lossless JSON（可选字段用 `null` 或省略，不能是 `undefined`）。卡片用这个 payload 渲染，其余文本照常显示。

## 目录

```
src/
  cards.js        卡片工厂（React.createElement，无 JSX、无构建依赖）
  stage-store.js  按 sessionId 存阶段，供 chip / 简报共用
  header-stage.js  标题旁 chip
  tabs.js          右栏三个标签（类型 + body）
  brief.js         轮末阶段简报（ConversationNodeDefinition + turnTail）
  index.js         浏览器入口：apply(ctx) 注册全部 seat
  host.js          Host 入口：当前为空插件，仅为让 profile 能挂载
scripts/
  build.mjs        把 src 内联成 lib/client.js（window.__ModuleLoader__ 格式）
  check.mjs        19 条离线断言（卡片 / store / 简报 / 标签 / 交互）
  smoke-apply.mjs  用假 ctx 执行构建产物，断言 11 个 toolview + 其他 seat 都注册
lib/               生成物：client.js / index.js
```

## 构建与检查

```sh
node scripts/build.mjs
node --check lib/index.js && node --check lib/client.js
```

没有运行时依赖：`react` 由宿主提供，`--dsw-*` token 由 `ui-theme` 提供。
样式只用 `--dsw-alias-*` 语义 token，不写字面色值——这是 `docs/web-styling.md` 的硬规则。

## 挂载

P2 的 bundle 里插入一行即可（`cordis.patch.yml`）：

```yaml
- insert:
    - id: dataops-client
      name: '@dataops/dsh-dataops-client'
```

`package.json` 的 `dsh.client` 告诉浏览器半边加载 `./client`；`engines.dsh` 让启动器在版本不匹配时明确拒绝，而不是悄悄跑坏。

## 设计边界

- 卡片是**产物的视图**，不是独立状态。所有数据来自工具结果，卡片不自己发请求、不缓存。
- 不在卡片里做审批：审批走 `interaction` seam，卡片最多提供"打开审批"的入口。
- 不做全屏工作台：复杂编辑（设计画布、变更单）用卡内面板或 web route，卡片只负责"看见 + 进入"。
- 设计卡「打开画布」是卡内展开面板；「查看血缘」发 `dataops:open-tab` 事件，由入口层调用 `ctx.sidebarRight.openTab`。
