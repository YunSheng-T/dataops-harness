# Stage 0+1 设计：US 接单 + 需求

> 状态：设计稿 v0，已归档
> 日期：2026-10-26
> 关联：[用户旅程 v0](user-journey.md) · [泳道图](../../../prototype/user-journey-swimlane.html) · [遗留事项](../../backlog.md)

## 1. 结论

```text
US 分配
→ 读取 / 去重
→ 建或恢复 workitem
→ 需求澄清
→ requirement 交付物
→ BA/需求方签收
→ 交给设计阶段
```

第一版只接 EDevOps US；DTS、领导任务、自主探索后续再接。

已确认的四点：

1. v1 支持给 US ID；无 ID 时用 `USPicker` 列表选择；后续接 `edevops-cli`。
2. 工作项去重键：`source.system + source.id`；目录继续 `workitems/<date>-<slug>/`。
3. 需求签收：BA 主签收，需求方确认目标和验收。
4. 已推进的 US：按 US 状态映射到当前阶段继续，不从头重走。

## 2. 入口与 US 选择器

### 2.1 默认交互

- 用户给 US ID/链接 → 直接查详情；
- 用户说“处理 US / 我的 US / 选一个任务” → 拉取分配给当前用户的待处理 US；
- 默认显示**工作区卡片**；超过 5 条、用户点“查看全部”或主动筛选时，展开**悬浮选择器**；
- 后续再考虑常驻“我的 US”右栏 tab，v1 不新开独立页面。

### 2.2 USPicker 卡片

```text
┌─ 待我处理的 US · 8 ──────────────────────┐
│ [待分析] [设计中] [全部]     刷新   查看全部 │
│                                           │
│ US-3821  渠道日报改支付口径    P1  待分析  │
│ US-3827  会员模型补维度        P2  设计中  │
│ US-3830  渠道映射补齐          P1  开发中  │
│                                           │
│ 选中预览：目标/验收/影响资产/工作项状态     │
│ [开始处理]  [继续已有工作项]               │
└───────────────────────────────────────────┘
```

每条至少显示：

- US ID
- 标题
- 当前状态
- 优先级
- 指派人 / 角色
- 最近更新时间
- 关联资产
- 是否已有工作项
- 映射后的初始阶段

选中预览：

- 目标
- 验收
- 影响资产
- 是否已有 workitem
- 下一步建议

### 2.3 悬浮选择器

触发：

- US 超过 5 条；
- 用户说“看看我的 US / 我要选一个”；
- 用户点“查看全部”；
- 需要搜索、筛选或看更多字段。

能力：

- 搜索 US ID / 标题；
- 过滤状态、优先级、指派人；
- 列表 + 右侧预览；
- 键盘上下选择；
- 确认后回到对话。

### 2.4 状态

必须覆盖：

- loading
- 空列表：没有待处理 US，允许手工输入 ID
- 查询失败：重试 / 手工输入 ID
- 无权限：只显示当前用户可见范围
- US 已被别人领取
- US 已有 workitem
- US 已推进到后续阶段

### 2.5 选择结果

选择后必须形成**一次普通用户轮次**，例如“处理 US-3821”，由 Agent 继续：

```text
选择 US
→ 读取 US 详情
→ 检查 source.system + source.id 是否已有 workitem
   ├─ 有：恢复
   └─ 无：按 US 状态映射初始 stage，创建 workitem
```

不要由客户端直接调用 host tool 或直接创建 workitem；选择只产生用户意图，后续仍走 Agent/tool 边界，保证审计和可恢复。

## 3. 技术实现分层

| 层 | 负责什么 | 不负责什么 |
|---|---|---|
| `AGENTS.md` | 仓库级规则/不变量 | 不写功能实现、不写 UI、不写字段映射 |
| `SKILL.md`（`dataops-workflow` 或独立 `us-intake`） | 识别 US 意图、调用 US 读取、选择后继续、失败降级 | 不持有凭据、不渲染 UI、不直接跑 CLI |
| Host tool / provider（`dataops-tools`） | `edevops-cli` adapter：list/detail、权限、超时、字段归一化、只读 | 不做 UI、不写 US 状态 |
| Client plugin（`dataops-client`） | `USPickerCard`、悬浮选择器、卡片字段、选择动作 | 不直接调 host、不直接调 CLI、不写 workitem |
| Preset / profile patch | 挂载工具/技能、配置 provider | 不写业务判断 |
| Workitem tools | 建/恢复/更新工作项、去重检查 | 不替代 EDevOps |

### 3.1 Host 侧

建议新增一个只读 US adapter，概念上是：

```text
dataops_shared_read_us({
  id?, statuses?, assignee?, query?, limit?
})
```

- `id` 给定时返回详情；
- 不给 `id` 时返回当前用户可见的待处理列表；
- 只读，不写 US 状态/评论；
- 通过 provider seam 接 `edevops-cli`；命令、字段映射、超时、凭据走配置/credentials 服务；
- 不把 CLI 命令拼进 prompt，不允许 skill 直接执行 CLI。

这会新增一个工具能力；当前 P2 目标工具面是 12，这是额外能力，实施前需要单独 ADR/蓝图确认工具数。

### 3.2 Client 侧

- 新增 `USPickerCard`，注册到该 US 读取工具的 `tool.call.toolview`；
- 卡片/悬浮窗共用同一数据契约和选择动作；
- 悬浮层优先用卡片内 modal；需要全局触发时再用 `shell.overlay` 这类原生 seat；
- 主题、字号、按钮使用 DSH 现有 token/组件，不新造一套 UI；
- 选择动作：优先发送一次用户消息；如果当前客户端没有稳定的 send API，降级为“填入输入框，由用户发送”，不要做隐藏 RPC。

### 3.3 为什么不能只靠 AGENTS 或 SKILL

- `AGENTS.md` 是仓库规则，不参与运行时；
- `SKILL.md` 能让 Agent 知道怎么用，但不能渲染卡片、拿凭据、做权限、调 CLI；
- DSH 插件/Host tool/Client plugin 才是运行时能力边界。

## 4. workitem 与 US 映射

### 4.1 来源字段

```yaml
source:
  system: edevops
  type: US
  id: US-3821
  url: ...
  status_at_intake: 待分析
  assignee: BA
  fetched_at: ...
```

### 4.2 初始 stage

| US 状态 | 初始 stage |
|---|---|
| 待分析 / 待设计 | requirement |
| 设计中 | design |
| 待方案 / 方案中 | scheme |
| 开发中 | develop |
| 待测试 / 测试中 / 待发布 | cicd |
| 验收中 / 已发布 | review |
| 已关闭 | 不新建，只读/归档 |

### 4.3 去重

- 键：`source.system + source.id`；
- 已有 → 恢复，不新建；
- 标题不作为去重键；
- v1 不写 US 状态/评论（见 [OPEN-006](../../backlog.md)）。

## 5. 需求阶段

### 5.1 主角色

- BA：owner、签收；
- 需求方：确认目标/范围/验收；
- SE：可选可行性预看，不作为需求签收人。

### 5.2 活动

1. 问题：解决什么、为什么现在、不做会怎样；
2. 范围：对象、边界、明确不做什么；
3. 验收：至少一条可验证标准；
4. 干系人：需求方、BA、后续 SE/Dev；
5. 影响资产：目标/来源/下游/API/任务；
6. 约束与风险：时间、环境、权限、数据可用性、合规/口径冲突；
7. 不明确项进 gaps，不编造。

### 5.3 产物

```text
deliverables/requirement/requirement.yaml
```

payload 至少：

```text
id / title / goal / scope / non_goals
acceptance / owner / requester
priority / impacts / constraints
gaps / evidence / source / asOf
```

同时产出需求卡、gaps、next、证据引用。

### 5.4 门禁

- BA 签收内容；
- 需求方确认目标、范围、验收；
- 缺目标/验收、范围冲突 → 不能进入设计；
- 当前是工作项内容门禁，不接 EDevOps 协同、不走 DSH 原生审批。

### 5.5 退出条件

- 目标一句话说清；
- 范围和非目标明确；
- 至少一条可验证验收；
- owner/requester 明确；
- 影响资产有清单或 gap；
- 没有未处理的 blocking gap。

```text
stages.requirement.status = done
stage = design
next = 交给设计阶段
```

### 5.6 交接给设计

```text
US 链接
+ requirement 交付物
+ acceptance
+ impacts
+ evidence
+ gaps
+ open questions
+ BA 签收记录
```

### 5.7 退回

- 需求不清 → 退回 BA；
- 验收不可验证 → 退回需求方；
- 范围冲突 → 停下来对齐；
- US 已到后续阶段 → 恢复对应 stage，不重走需求。

## 6. deliverables 目录

确认按阶段细分：

```text
workitems/<id>/
  item.yaml
  intent.md
  plan.md
  decision.md
  evidence/

  deliverables/
    requirement/requirement.yaml
    design/design.yaml
    scheme/
      analysis.yaml
      solution.yaml
      tech-plan.yaml
    develop/
      change.sql
      develop.yaml
    cicd/
      scan.json
      test-report.yaml
      release.yaml
      schedule.yaml
    review/
      acceptance.md
      postmortem.yaml
    incident/incident.yaml
```

规则：

- 一级目录用阶段名；
- `evidence/` 保留在根目录，跨阶段复用；
- 文件用稳定语义名，不用 `v1/v2/final`；
- 旧 `deliverables/*.yaml` 读取兼容，新写入阶段子目录；
- 不做批量迁移；P1 样例保留。

## 7. Agent 边界

Agent 可以：

- 读 US；
- 建/恢复 workitem；
- 提炼需求草稿；
- 标 gaps；
- 调 presenter 出需求卡；
- 更新 workitem。

Agent 不可以：

- 替 BA/需求方签收；
- 编造验收/影响面；
- 写 US 状态；
- 需求未确认时推进 stage；
- 一次问十个问题；
- 直接调 CLI。

## 8. 待后续处理

- 设计/技术方案跨角色签收：EDevOps 协同，见 OPEN-001；
- 生产发布准入：外部系统，见 OPEN-002；
- 代码合入/制品发布报告：外部 Committer/发布系统，见 OPEN-003；
- US 状态回写：见 OPEN-006；
- US 列表 adapter 的新工具/蓝图/工具数：实施前单独定。

## 9. 0+1 的交付物、呈现、Pass

### 9.1 交付物

**Stage 0（US 接单）**：

- 工作项：`workitems/<id>/`
- `item.yaml`：source、owner、初始 stage、approvals
- `intent.md`：US 原文摘要、目标、不做什么
- `plan.md`：接单日志

Stage 0 没有业务交付物，用户看到的是“已接单”摘要；真正的业务交付物从需求阶段开始。

**Stage 1（需求）**：

```text
deliverables/requirement/requirement.yaml
```

- 需求卡：目标 / 范围 / 验收 / owner / 影响资产 / gaps
- 证据引用：`evidence/ev-*.yaml`
- `item.yaml` 的 `stages.requirement.deliverable`
- 签收记录：`approvals[gate=requirement]`
- 下一阶段建议：`next`

### 9.2 怎么呈现给用户

```text
USPicker（选择 US）
→ 接单摘要卡（US、owner、初始阶段、是否已有工作项）
→ RequirementCard（目标/范围/验收/影响面/gaps）
→ 签收面板（BA 签收 + 需求方确认）
→ 已确认状态 + “进入设计”
```

- 卡片是 toolview，不是新页面。
- RequirementCard 增加 footer 动作：“确认需求 / 退回修改 / 查看交付物”。
- 退回必须带 comment；退回后 stage 仍停在 requirement。
- 不显示 `dataops_*` 工具名。
- `查看交付物` 打开 requirement 文件/结构化 payload。
- 签收结果同时回写工作项，不只存在 UI 状态里。

### 9.3 Pass 条件

需求阶段必须同时满足：

- 目标一句话说清；
- 范围 + 非目标明确；
- 至少一条可验证验收；
- owner/requester 明确；
- 影响资产有清单或 gap；
- 无未处理的 blocking gap；
- BA 签收；
- 需求方确认目标/验收。

仅 Agent 生成内容、无人签收 → **不 pass**。

### 9.4 签收记录

建议在 `item.yaml` 增加：

```yaml
approvals:
  - gate: requirement
    status: approved
    signoffs:
      - role: BA
        approver: <name>
        at: <timestamp>
      - role: requester
        approver: <name>
        at: <timestamp>
    comment: <optional>
```

规则：

- 两个 signoff 都齐，`status=approved`；
- 只差需求方确认时，stage 保持 `awaiting_approval`；
- 退回时 `status=rejected`，并写 comment；
- 跨人通知/邀请走 EDevOps，当前先记录、后置（OPEN-001）。

### 9.5 状态推进

Pass 后：

```text
stages.requirement.status = done
stage = design
next = 设计阶段：补目标表/粒度/来源/分区/指标/影响面
```

同时：

- 追加 `plan.md` 一行；
- 记录 requirement gate 的 approvals；
- 交接包给设计阶段。

### 9.6 0+1 的最终 Pass

0+1 合并验收只看四件事：

1. US 被正确读取/选择，workitem 新建或恢复正确；
2. `requirement` 交付物完整，关键字段不缺失；
3. BA + 需求方签收记录落盘；
4. `stage=design`，下一步明确。

不满足就不算 0+1 完成。

## 10. 案例：渠道日报支付口径（US-3821）

- US：`US-3821`，分配给 BA
- 工作项：[2026-10-26-channel-report-pay-caliber](../../../workitems/2026-10-26-channel-report-pay-caliber/item.yaml)
- 触发：US 进入待分析，BA 选择处理

### 0. US 接单

- 读取 US：渠道日报从下单口径改为支付口径；
- 建 workitem，记录 `source.system=edevops`、`source.id=US-3821`；
- 初始 `stage=requirement`；
- 不是重复工单，没有另建。

### 1. 需求

- goal：渠道日报核心指标改为支付成功口径，可对账；
- scope：`dws.trade_channel_daily` + `ads.channel_report` / `rpt.funnel` / `api.channel_metrics`；
- acceptance：支付口径可对账、下游字段和粒度不变、05:00 前产出；
- impacts：3 个下游资产；
- gaps：缺 `pay_time`、status 枚举未登记、渠道映射未补齐；
- BA 签收 + 需求方确认（requirement 阶段仍保留需求方确认）；
- 产物：`deliverables/requirement/requirement.yaml`。

### 进入设计

- `stages.requirement.status=done`
- `stage=design`
- 交接包：US + requirement + acceptance + impacts + gaps。
