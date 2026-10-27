# 数据开发工作台：DSH 用户面设计（只加不改）

> 修订：v2.2（2026-10-25 真机）。上一版把 Harness 的三栏壳换掉了，方向错了；这一版的原则是**保留 DSH 原生界面，数据开发能力只做追加**。
> 运行时差异：当前桌面端/原生命令是 **0.2.1-rc.2**，它没有 `sidebar.session.row.trailing`（源码 rc.3 才有）。因此**会话行徽标暂缓**，阶段信息用标题旁 chip + 轮末简报；不为了塞徽标去挤标题。
> 已拍板：对话头小标签、右栏按会话记标签保留；**不做「数据工作台」总览页**（跨会话查找用原生工作区/会话列表）。
> 原型：`prototype/dsh-native-workbench.html`（可直接打开，支持标注新增）。
> 关联：`docs/design/framework.md`（阶段与角色）、`docs/design/product-blueprint.md`（产品形态）、[`blueprint-v2.md`](blueprint-v2.md)（v2 阶段/组件蓝图）。
>
> **阶段目标 v2**：6 段（需求 → 设计 → 方案 → 开发 → CICD → 复盘）；当前运行时已按 6 段投影；标题 chip / 简报显示 6 段和方案/CICD 子步骤。

---

## 0. 三个结论

1. **壳不换。** 左侧原生侧栏（品牌 / 新会话 / 工作区 / 会话）、中间原生对话头 + 对话流 + 输入框、右侧原生右栏，全部保留；我们只在原生提供的"座位（slot）"里放东西。
2. **工作项不是新概念，就是原生 Session。** 一个工作项 = 一个会话；分组用原生 Workspace（例如"数据开发"）。不再另造左侧工作项列表。
3. **追加项一共 7 个**，每个都对应一个 DSH 原生 extension seat（见 §2）；没有 seat 的能力不做，或者先用 turnTail 卡片兜底。

---

## 1. 设计原则：只加不改

| # | 原则 | 含义 |
|---|---|---|
| 1 | **不新增列** | 不造第四条栏、不替换左侧导航、不改三栏比例 |
| 2 | **不重画头** | 对话头的标题、模式、对话/轨迹 tab、Session log 保持原样，阶段信息只做一个小 chip |
| 3 | **不加新输入框** | 继续用原生 composer；数据开发命令走原生 slash / 技能 |
| 4 | **能力寄居在 seat 里** | 卡片走 toolview，上下文走右栏 tab，阶段标记走标题旁 chip（rc.2 没有行尾 seat） |
| 5 | **没有 seat 就不硬塞** | 例如"全屏工作台"没有合适 seat，就用原生 Modal，不新开 route |

判断标准：**把我们的插件全禁用，界面应该和原版 DSH 一模一样。**

---

## 2. 原生结构 + 我们加在哪

```
┌───────────────┬──────────────────────────────────────┬──────────────┐
│ 原生侧栏       │ 原生对话                              │ 原生右栏      │
│ 品牌/新会话    │ 标题 · 模式 · [阶段 chip] · Session log│ 指南/文件/…   │
│ 工作区/会话     │ 对话 | 轨迹                           │ [资产][血缘]  │
│ · 会话行        │ ┌ 消息 ────────────────────────────┐ │ [证据]        │
│               │ │ [需求卡] [设计卡] [证据] …        │ │              │
│               │ │ [阶段简报 turnTail]               │ │ 表卡/血缘/证据 │
│               │ └──────────────────────────────────┘ │              │
│               │ 原生 composer                        │              │
└───────────────┴──────────────────────────────────────┴──────────────┘
   ↑ 方括号 = 我们追加的
```

| 区域 | 原生所有者 | 我们追加什么 | 用的 seat |
|---|---|---|---|
| 侧栏 · 会话行 | `ui-workspace` / `ui-sidebar` | 不加：rc.2 没有行尾 seat，硬塞会挤标题 | —（rc.3 的 `sidebar.session.row.trailing` 暂不使用） |
| 对话头 | `ui-conversation` | 标题旁的小 chip：`设计 · 2/6` | `conversation.session.header.actions`（已验证） |
| 对话流 · 工具卡 | `ui-tool` | 需求卡 / 设计卡 / 方案卡 / 证据卡 | `tool.call.toolview`（按工具名 keyed） |
| 对话流 · 轮末 | `ui-conversation` | 阶段简报（6 段进度 + 子步骤 + 下一步 + 留档） | `conversation.chat.turnTail` |
| 右栏 | `ui-sidebar-right` | 资产 / 血缘 / 证据 三个标签页 | `ctx.sidebarRightTabs.register()` + `sidebar.right.pane.tab` |
| 右栏入口 | `ui-sidebar-right` | 不加（用原生展开按钮） | — |
| 全屏设计画布 | `ui-primitives` | 设计画布 Modal（ETL 方案视图） | 原生 `Modal`，从设计卡"打开画布"进入 |
| 输入框 | `ui-conversation` | 不加；后续可加 slash 命令（原生 command） | `ui-commands`（P2） |

> 这张表就是实现清单：每一项都先确认 seat 存在，再写插件。

---

## 3. 明确不改的东西

- 侧栏宽度、折叠行为、新会话按钮、工作区分组、会话搜索/筛选。
- 对话头的标题层级、`对话 / 轨迹` tab、`Session log`、右栏展开按钮。
- 消息气泡、Markdown 渲染、工具调用树、错误/重试行、token 统计行。
- composer 的 `+ / Full access / 模型选择 / 停止 / 发送` 布局与快捷键。
- 主题、字体、圆角、描边、明暗切换（全部走 `--dsw-*` token）。

---

## 4. 七个追加项

| # | 追加项 | 长什么样 | 优先级 |
|---|---|---|---|
| 1 | 会话阶段徽标 | 会话行尾部 6px 胶囊："设计"/"排障"/"完成" | P1 · **rc.2 暂缓**（无行尾 seat） |
| 2 | 阶段 chip | 对话头标题旁 "设计 · 2/6" | P1 · 已实现 |
| 3 | 需求卡 | 对话内工具卡：目标/范围/验收/影响资产 | P0 |
| 4 | 设计卡 | 对话内工具卡：粒度/来源/加工/调度/口径 + 打开画布 | P0 |
| 5 | 证据卡 | 行内 `证据 N` 胶囊 → 浮层（SQL/时间/环境/成本） | P0 |
| 6 | 阶段简报 | 轮末 turnTail 卡：6 段进度 + 子步骤 + 下一步 + 留档 | P1 · 已实现 |
| 7 | 右栏三标签 | 资产 / 血缘 / 证据；每个会话各自记住自己的标签 | P1 · 已实现 |

**P0 只做 4 个**：需求卡、设计卡、证据浮层、阶段简报。它们已经能讲清"工作台和聊天框的区别"。

**明确不做**：不做「数据工作台」总览页（2026-10-25 拍板）。工作项就是会话，跨会话查找用原生工作区列表和搜索；等真有跨会话汇总需求时再加。

---

## 5. 卡片规范（工具卡，不是页面）

### 5.1 结构

```
┌ ● 数据设计 · dws.trade_channel_daily   [进行中]             收起 ┐
│  粒度 / 来源 / 分区 / 调度                                        │
│  加工逻辑 1 2 3                                                    │
│  口径                                                              │
├ design.yaml · 未提交          [打开画布] [查看血缘] [提交技术方案] ┤
└───────────────────────────────────────────────────────────────────┘
```

- 和原生工具卡同高密度：标题 12.5px、正文 12px、元信息 10.5px。
- 圆角 `--dsw-radius-md`（12px），描边 `--dsw-alias-border-l1`，不再用大卡片。
- 主 CTA 每卡最多 1 个；其余用 ghost。
- 状态点四态：进行中（蓝）/ 通过（绿）/ 待确认（黄）/ 失败（红）。

### 5.2 空态与错误

| 情况 | 表现 |
|---|---|
| payload 解析失败 | 显示原始文本 + "查看原始结果"，不白屏 |
| 缺字段 | 该行显示"待补充"，不编造 |
| 权限不足 | 卡内提示"需要 prod 只读授权"+ 申请入口 |
| 执行失败 | 保留已生成内容，顶部红条写"哪一步失败 + 下一步" |

### 5.3 token 映射

| 用途 | token |
|---|---|
| 卡片底 / 页面底 | `--dsw-alias-bg-layer-1` / `--dsw-alias-bg-base` |
| 标题 / 次要 / 元信息 | `--dsw-alias-label-primary` / `secondary` / `tertiary` |
| 描边 | `--dsw-alias-border-l1`（0.5px） |
| 主按钮 | `--dsw-alias-button-primary-fill` |
| 强调/链接 | `--dsw-alias-state-business-primary` / `--dsw-alias-link` |
| 圆角 | `--dsw-radius-xs/sm/md/lg/xl/panel` |

**禁止**：字面色值、Tailwind、第二套组件库、在功能包里写主题选择器。

---

## 6. 数据契约

工具结果最后一段文本是 JSON，带 `kind`：

```json
{ "kind": "design", "status": "draft",
  "target": { "table": "dws.trade_channel_daily", "grain": "渠道 × 日期", "partition": "dt" },
  "sources": [{ "table": "dwd.orders" }, { "table": "dim.channel" }],
  "steps": [{ "title": "过滤有效订单", "logic": "status in ('paid','shipped')" }],
  "schedule": { "cron": "0 3 * * *", "sla": "05:00" },
  "metrics": [{ "name": "order_cnt", "definition": "支付订单数（去重）" }] }
```

阶段简报用 turnTail 的结构化数据（`stage`, `next`, `artifact`），不解析自然语言。

---

## 7. 代码目录

```
packages/dataops-client/
├── package.json            # dsh.client.platform=web；engines.dsh 锁版本
├── src/
│   ├── host.js             # Host 半边：空插件，保证 profile 能挂载
│   ├── index.js            # 注册：6 个 toolview、标题 chip、右栏 tab、turnTail
│   ├── cards.js            # 6 张卡 + 卡片 CSS（P0/P1 已实现）
│   ├── header-stage.js     # 标题旁阶段 chip（conversation.session.header.actions）
│   ├── stage-store.js      # 按 sessionId 存阶段，供 chip / 简报共用
│   ├── context-store.js    # 按 sessionId 存 requirement/design/table/lineage/evidence
│   ├── tabs.js             # 资产 / 血缘 / 证据（sidebarRightTabs + sidebar.right.pane.tab）
│   └── brief.js            # 轮末简报 + 工具结果 ingest（conversation.chat.turnTail）
├── scripts/
│   ├── build.mjs           # 内联成 lib/client.js（__ModuleLoader__ 格式）
│   ├── check.mjs           # 13 条离线渲染断言
│   └── smoke-apply.mjs     # 假 ctx 验证注册面
├── lib/                    # 生成物
└── README.md
```

每个 seat 一个文件，`index.js` 只做注册；某个 seat 变化时只改一个文件。
**不实现会话行徽标**：rc.2 的 slot 目录里没有 `sidebar.session.row.trailing`，只有 leading/hover；等运行时升到 rc.3 再评估。

## 8. 生态里有什么可复用

| 资产 | 位置 | 能复用什么 |
|---|---|---|
| `ui-tool` | `packages/client/ui-tool` | toolview keyed slot、通用卡兜底 |
| `ui-primitives` | `packages/client/ui-primitives` | Button / Tag / Pill / StateDot / Modal / Menu / CodeBlock |
| `ui-slots` | `packages/client/ui-slots` | 四类 slot + 注册生命周期 |
| `ui-conversation` | `packages/client/ui-conversation` | ConversationNodeDefinition、turnTail |
| `ui-sidebar` | `packages/client/ui-sidebar` | rc.2 只有 leading/hover；`sidebar.session.row.trailing` 是 rc.3 才有的行尾 seat |
| `ui-sidebar-right` | `packages/client/ui-sidebar-right` | tab 类型注册 + `sidebar.right.pane.tab` |
| `ui-theme` | `packages/client/ui-theme` | 全部 `--dsw-*` token、明暗主题 |
| `@dpt/dsh-process-guide` | 本机 profile | **最完整的第三方范例**：4 个 toolview + turnTail + 离线 preview |
| `dsh-plugin-desktop` | `dsh-desktop/dsh-plugin-desktop` | 桌面壳 Host/Client 双 face |
| `dsh-community-market` | `dsh-desktop/dsh-community-market` | 插件市场 UI 与 bundle 安装交互 |

**没有专门的"界面设计插件"**：DSH 的设计系统就是 `ui-theme` + `ui-primitives`，可复用的是**注册机制**和**卡片范式**。`ui-dockkit` 标注 Internal engine，P1 不做分屏依赖。

---

## 9. SKILL 能不能做到？

| 能力 | SKILL | Client 插件 |
|---|---|---|
| 约束模型"什么时候用哪个工具/流程" | ✅ | — |
| 生成静态 HTML 原型 | ✅（开发期） | — |
| 注册 `tool.call.toolview` / turnTail / sidebar seat | ❌ | ✅ |
| 渲染 React、响应点击、跟随主题 | ❌ | ✅ |

- SKILL 是**模型侧指令**，卡片是**浏览器侧代码**，不在一个进程。佐证：`@dpt/dsh-process-guide` 明确"不做 skill"；`ui-tool` 的注册是 `slots.register({name,key}, Component)`，必须是代码。
- 但 SKILL 可以加速原型：这次原型就是按 `--dsw-*` token 手写 + 截图迭代的，评审通过再落插件。
- **结论：原型用 SKILL，交付用插件。** 下一步可以写一个 `dsh-ui-prototype` 技能，把"读 token → 出 HTML → 截图"固化成流程。

---

## 10. 原型说明

- 文件：`prototype/dsh-native-workbench.html`（单文件、无依赖）
- 截图：`prototype/shots/native-*.png`（light / closed / dark / annotate / brief / canvas / evidence）
- 参数：
  - `?theme=dark` 深色
  - `?rightbar=0` 关闭右栏（看纯原生布局）
  - `?annotate=1` 标注所有追加项（8 处）
  - `?scroll=bottom` 滚到轮末（看阶段简报）
  - `?canvas=1` 打开设计画布
  - `?ev=1` 打开证据浮层
- 右下角"标注新增"按钮可随时切换标注，用来评审"哪些是原生的、哪些是我们加的"。

---

## 10.5 品牌替换

如果要把产品名/Logo 换成自己的，见 `docs/design/rebranding.md`：侧栏 brand slot 可换，主题与 `@deepseek-ai/*` 包名不动。

## 10.6 真机验证（2026-10-25）

独立 `dataops` profile 已在桌面端自带的 DSH 运行时（0.2.1-rc.2）上启动：

- 侧栏显示 **∞ DataOps**，空会话 Hero 显示 **∞ 探索未至之境**（`prototype/shots/real-dataops-shell.png`）
- `dataops-brand` / `dataops-client` 都出现在 `window.__DSH_BOOT__`，console 无错误
- 真实会话验证（2026-10-25）：
  - 需求卡、设计卡能渲染；标题旁出现 `需求 · 1/7` / `设计 · 2/6`
  - 6 阶段跑通：`复盘 · 6/6`，轮末显示完整阶段简报；排障场景显示「排障」chip + 排障简报
  - 右栏「开始」页出现资产 / 血缘 / 证据三个入口，点开后按会话保留
  - 设计卡「打开画布」卡内展开；「查看血缘」打开右栏血缘 tab，并以 SVG 图谱展示节点/边
  - 截图：`prototype/shots/real-dataops-stages.png`、`prototype/shots/real-dataops-7stage.png`、`prototype/shots/real-dataops-lineage.png`
- **未验证/不可用**：会话行徽标——运行中的 rc.2 没有 `sidebar.session.row.trailing`，所以不渲染；不是样式问题。

## 10.7 Mock 工具（可用于真机验证卡片）

`packages/dataops-tools` 已提供 16 个 Host 工具，返回与卡片契约一致的 JSON：

| 工具 | 主要参数 | 产物 |
|---|---|---|
| `dataops_requirement_extract_spec` | `ticketId?`、`scenario?` | `requirement` |
| `dataops_design_compose_model` | `ticketId?`、`targetTable?`、`sources?`、`withImpact?` | `design` |
| `dataops_shared_read_table` | `table` | `table` |
| `dataops_shared_read_lineage` | `table`、`direction?`、`depth?` | `lineage` |
| `dataops_scheme_compose_tech_plan` | `scenario?` | `tech_plan` |
| `dataops_shared_read_profile` | `scenario?`、`table?` | `profile` |
| `dataops_scheme_analyze_data` | `scenario?` | `analysis` |
| `dataops_scheme_compose_solution` | `scenario?` | `solution` |
| `dataops_shared_read_evidence` | `scenario?` | `evidence` |
| `dataops_develop_generate_code` | `scenario?` | `develop` |
| `dataops_cicd_scan` | `scenario?` | `cicd` |
| `dataops_cicd_compile` | `scenario?` | `schedule` |
| `dataops_cicd_test` | `scenario?` | `test` |
| `dataops_cicd_release` | `scenario?` | `release` |
| `dataops_review_write_postmortem` | `scenario?` | `postmortem` |
| `dataops_incident_triage` | `scenario?` | `incident` |

provider 默认 `mock`，可切 `cli` / `http`；真实接入与字段映射见 `docs/design/integration.md`。
mock 场景：`channel-report`（默认）、`member-model`。

右栏三个标签改为读 `context-store`：工具跑过之后自动填充，没跑过显示空状态。

真机试法：

```sh
dsh --profile dataops
# 新会话里说：请按顺序调用 dataops_requirement_extract_spec、dataops_design_compose_model、
# dataops_scheme_compose_tech_plan、dataops_develop_generate_code、dataops_cicd_test、dataops_cicd_release、
# dataops_review_write_postmortem，scenario 都用 channel-report
# 另开会话说：调用 dataops_incident_triage，scenario 用 channel-report
```

完整演示脚本见 `docs/design/mock-demo.md`；内网替换清单见 `docs/design/mock-to-real.md`。

工具返回后，卡片、标题 chip、轮末阶段简报会一起出现（简报从 `dataops_*` 结果里解析阶段）。会话行徽标在 rc.2 不会出现。

## 11. 落地顺序

| 阶段 | 内容 | 验收 |
|---|---|---|
| M0 | 原型评审（本文件 + HTML + 标注模式） | 确认 7 个追加项与 seat 映射 |
| M1 | 需求卡 + 设计卡 + 证据浮层 + 阶段简报 | 真实 DSH 里触发工具能看到卡片；明暗主题正常；Esc/键盘可达 |
| M2 | 标题 chip + 右栏三标签 | 标题旁出现阶段 chip；右栏 tab 可开可关；不影响原生 tab。会话行徽标等 rc.3 |
| M3 | 方案卡 + 开发/测试/发布/复盘/排障卡 | Mock 6 阶段 + 排障走完；内网只换 provider |

---

## 12. 待确认真机 seat

1. 标题 chip 用 `conversation.session.header.actions`（已验证），不用 `conversation.header.leading`。
2. `sidebar.session.row.trailing` 在 rc.2 不存在，rc.3 才有；因此行尾徽标暂缓，避免挤标题。
3. `sidebarRightTabs` 的 guide 入口 + `sidebar.right.pane.tab` 按会话保留（已验证）。
