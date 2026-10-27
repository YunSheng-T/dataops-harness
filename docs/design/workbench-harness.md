# 数据开发工作台 Harness 设计

> 版本：v0.1（待评审） 日期：2026-10-24
> 总体框架（阶段模型、角色 Agent、四套方案）见 `docs/design/framework.md`。
> 前提：平台能力（MCP / CLI / 元数据 / 调度 / 查询）已在 Claude Code、OpenCode 等 harness 上验证可用；本文只讨论**工作台本身怎么设计**。

## 0. 一句话

把「一次数据开发任务」建模成**有状态、有证据、可审批、可复盘的工作项（WorkItem）**，agent 只是执行者；
**MCP/CLI 负责访问平台，SKILL 负责流程知识，Harness 负责状态、角色、审批与界面。**

---

## 1. 工作台不是聊天助手

聊天助手和工作台的差别不在模型，在**对象**：

| 维度 | 聊天助手 | 数据开发工作台 |
|---|---|---|
| 主体 | 一段对话 | 一个工作项（改表 / 排障 / 取数 / 发布） |
| 状态 | 在上下文里，关掉就没了 | 在磁盘/服务里，三天后还能接着做 |
| 产出 | 一段回答 | 可提交的 SQL、DDL、评审报告、影响清单 |
| 角色 | 一个助手 | 分析、开发、评审、发布，权限不同 |
| 证据 | 可选 | 强制：结论必须能追溯到查询与时间范围 |
| 协作 | 人机 | 人与人交接（谁提的、谁批的、谁执行） |

**设计含义**：先定对象模型和工作项生命周期，再定 agent 怎么干活。反过来做（先写 prompt / 先接工具）最后一定会退化成"更聪明的搜索框"。

---

## 2. 你们已经验证了什么，还缺什么

| 能力 | Claude Code / OpenCode | DSH | 自研 |
|---|---|---|---|
| MCP / CLI 接入 | ✅ 已验证 | ✅ 同一套 MCP | 重复投入 |
| SKILL 约束流程 | ✅ 已验证 | ✅ 且支持 bundled provider、按需加载 | 重复投入 |
| 单 agent 循环 | ✅ 成熟 | ✅ | 重复投入 |
| **跨会话工作项状态** | ❌ 靠文件约定 | ✅ session/artifact/workspace | 要自己写 |
| **多角色编排** | ⚠️ 弱（subagent 简单） | ✅ preset / subagent / workflow | 要自己写 |
| **审批与审计** | ⚠️ 粗粒度 | ✅ interaction / credentials / session log | 要自己写 |
| **UI 工作区** | ❌ 终端 | ✅ host/client + slot，可做编辑器/血缘图 | 成本最高 |
| **批量编排** | ⚠️ 手动 | ✅ workflow（脚本 fan-out） | 要自己写 |
| **分发与版本锁定** | ⚠️ 各自安装 | ✅ bundle / profile / upstream pin | 要自己写 |

**结论：能力层原地复用，工作台层新建。** 不要在"再接一个 MCP"上继续投入，那是已经验证过的部分。

同时保留一个战略对冲：**工作台协议（工作项目录、证据格式、技能集）设计成可移植的**，先不绑定任何宿主。DSH 只是第一个宿主；如果最终发现只需要单 agent，退回 CC/OpenCode 也不亏。

---

## 3. 数据域的五条硬约束

这五条决定了工作台和通用 coding harness 的差别，必须落到设计里，而不是写在 prompt 里。

| 约束 | 现实 | 设计要求 |
|---|---|---|
| **时间** | 数据有分区、有延迟、有回刷 | 任何结论必须带「数据时间范围 + 产出时间」；无时间范围的查询默认拒绝或告警 |
| **环境** | dev / prod / 不同集群，权限不同 | 工具必须显式带 `env`；默认 dev + 只读；prod 写操作走审批 |
| **成本** | 每次扫描都花钱、占队列 | 执行前先估算（EXPLAIN / 统计信息）；超过阈值要显式确认 |
| **所有权** | 表/任务/API 都有 owner | 写操作审批路由到 owner；影响面通知到 owner |
| **口径** | 同名不同义是最大的坑 | 指标定义是版本化资产，不是散落在文档里；口径变更 = 破坏性变更 |

---

## 4. 领域模型

```
Workspace（项目/域）
  └── WorkItem（工作项）  类型：explore | model | change | debug | publish
        ├── AssetRef[]   目标资产：table / job / pipeline / api（来自 catalog）
        ├── Artifact[]   产出：SQL、DDL、评审报告、影响清单、runbook
        ├── Evidence[]   证据：查询 + 时间范围 + 结果摘要 + schema 版本
        ├── Decision[]   决策：谁在什么时候批了什么
        └── Session[]    执行记录：agent 会话（可多个）
```

### 4.1 工作项生命周期

```
draft ──► planning ──► executing ──► review ──► approved ──► applied ──► verified
  │            │            │            │                        │
  └────────────┴────────────┴────────────┴──► abandoned ◄─────────┘
```

- `draft`：只有意图和验收标准。
- `planning`：已收集事实，产出方案。
- `executing`：在 dev 环境试跑、生成 artifact。
- `review`：等待人或 agent 评审。
- `approved`：审批记录落盘（含审批人、范围、时间窗）。
- `applied`：已作用到目标环境。
- `verified`：验证数据/影响面符合预期。

状态机的意义：**它让 agent 知道"现在该干什么"，也让人知道"这件事卡在哪"。**

### 4.2 Evidence 的结构（最关键）

```yaml
id: ev-20261024-001
claim: "dwd.orders 的 user_id 在近 7 天有 0.3% 为 NULL"
query: "select count(*) ... where dt between ..."
time_range: { from: 2026-10-17, to: 2026-10-24 }
env: prod-ro
as_of: 2026-10-24T17:30:00+08:00
schema_version: "dwd.orders@v12"
result_digest: "rows=1000000, nulls=3000"
tool_call: "sql.query#abc123"
```

**没有 Evidence 的结论不允许进入 artifact。** 这条是工作台和聊天助手的分水岭。

---

## 5. 工作项协议：先用文件，后上服务

### 5.1 目录约定（M0 就能用，不依赖 DSH）

```
workitems/
  2026-10-24-user-id-bigint/
    item.yaml          # 类型、目标资产、状态、owner、验收标准
    intent.md          # 谁提的、要解决什么、不做什么
    plan.md            # 步骤、当前进度、阻塞
    evidence/
      ev-20261024-001.yaml
    artifacts/
      change.sql
      review.md
      impact.md
    decision.md        # 审批记录
```

- 全部 markdown/yaml，**可 git、可 review、可交接**。
- agent 通过一个 `workitem-protocol` 技能读写；任何宿主（CC / OpenCode / DSH）都能跑。
- 人可以直接改文件，agent 下次读到的就是最新状态。

### 5.2 什么时候升级成服务

触发条件（满足任意两条）：
1. 并发用户 > 10，文件锁开始打架；
2. 需要跨工作项检索（"上周所有改表的影响面"）；
3. 需要和工单/发布系统双向同步；
4. 需要权限隔离（不同团队看不到彼此的工作项）。

升级路径：`WorkItem` 变成 Host service（DSH 的 `storage` + `session` + 自写 provider），文件协议保留为导入/导出格式。**先文件后服务，避免一开始就写后台。**

---

## 6. 四层架构

```
┌─ Surface（人看得到）──────────────────────────────────────┐
│ 对话 · 资产浏览 · SQL 编辑器 · 证据时间线 · 影响图 · 审批   │
├─ Capability（能干什么）───────────────────────────────────┤
│ MCP 适配器（catalog/lineage/scheduler）· CLI 包装 · 原生工具 │
├─ Knowledge（怎么干）──────────────────────────────────────┤
│ SKILL（流程）· AGENTS.md（组织约定）· 指标定义 · schema card │
├─ Governance（能不能干）───────────────────────────────────┤
│ 环境隔离 · 只读默认 · 审批 · 审计 · 成本预算 · 凭据          │
└──────────────────────────────────────────────────────────┘
```

| 层 | DSH 对应 | 你们要做的 |
|---|---|---|
| Surface | `packages/host` + `packages/client`（slot / sidebar tab / conversation node） | 3 个 client 插件：资产浏览、SQL 编辑器、证据/影响视图 |
| Capability | `packages/mcp`、`packages/shell`、`packages/tools` | MCP 配置 + 少量原生工具（高频、低延迟） |
| Knowledge | `packages/skill`、`packages/context/agent-instructions` | 技能库 + AGENTS.md + 指标定义 |
| Governance | `interaction`、`credentials`、`sandbox`、`session` | 审批预设 + 工具级白名单 + 审计查询 |

---

## 7. Agent 拓扑

### 7.1 默认：单 lead + 按需子代理

| 角色 | 职责 | 工具面 | 输出 |
|---|---|---|---|
| `data-dev`（lead） | 接单、规划、调度、汇总 | 全部只读 + 提案 | 工作项状态 + artifact |
| `sql-reviewer` | 评审 SQL/DDL | 只读 + EXPLAIN | 结构化评审（阻断/风险/必改） |
| `lineage-analyst` | 影响面 | 只读 + 血缘 | 影响清单 |
| `pipeline-debugger` | 排障 | 只读 + 日志 | 时间线 + 根因 |

**规则**：子代理不直接写平台，只返回结构化结论；写操作由 lead 汇总后走审批。这样权限面收敛在一个地方。

### 7.2 什么时候用 workflow 而不是 subagent

- **subagent**：一次委派、一个结论（"审这条 SQL"）。
- **workflow**：批量、同一模板跑 N 次（"扫 200 张表找没有分区的"、"给 30 个指标补口径"），脚本里 fan-out，返回结构化数组。
- **单 agent**：线性任务（"帮我查个数"）。

### 7.3 preset

| preset | 场景 | 差异 |
|---|---|---|
| `dataops-dev` | 日常开发 | 全工具，写操作需审批 |
| `dataops-review` | 评审模式 | 只读 + EXPLAIN，禁止执行 |
| `dataops-batch` | 批量巡检 | 只读 + workflow，禁止交互式提问 |

preset 的价值：**同一个仓库、同一套技能，换角色只换工具面**，不用维护多套 prompt。

---

## 8. 工具契约

### 8.1 能力分层

| 层 | 能力 | 默认 | 审批 |
|---|---|---|---|
| T0 | 元数据：catalog、schema、血缘、owner | 允许 | 否 |
| T1 | 读数据：受限查询、采样、EXPLAIN | 允许（有上限） | 否 |
| T2 | 写本地：artifact、工作项文件 | 允许 | 否 |
| T3 | 写平台：提交任务、改配置、建表 | 拒绝 | 是 |
| T4 | 破坏性：删表、删分区、改类型、下线 | 拒绝 | 是 + 双人 |

### 8.2 契约形状

```yaml
name: catalog.search
tier: T0
input:
  query: string
  type: table | job | api        # 可选
  limit: int (<=20, default 10)
output:
  items: [{ id, name, type, owner, grain?, row_count?, updated_at }]
  truncated: bool
  as_of: timestamp               # 必填：数据/元数据的时间点
errors: [NOT_FOUND, FORBIDDEN, UPSTREAM_TIMEOUT]
```

硬规则：

1. **所有读都带 `as_of`**，没有时间点的返回视为不合格。
2. **所有列表都分页**，默认小 limit；大结果走 spill，返回句柄。
3. **所有写都返回 proposal**，执行必须带 `approval_id`；重试要幂等键。
4. **错误码有限且稳定**，错误信息包含对象、阶段、下一步。
5. **环境是必填参数**，默认 `dev`；`prod` 的写操作直接进审批。

### 8.3 MCP 还是原生工具

| 场景 | 选择 |
|---|---|
| 平台已有 OpenAPI/SDK，调用频率低 | MCP server（一次封装，多宿主复用） |
| 高频、低延迟、需要结构化输出（EXPLAIN、schema） | 原生 Cordis 工具插件 |
| 已有 CLI 且输出稳定 | CLI 包装（注意解析与超时） |
| 需要人工确认的写操作 | 原生工具 + 审批 seam（MCP 难做审批） |

---

## 9. 技能体系

### 9.1 三层，各管一件事

| 层 | 内容 | 放哪 | 例子 |
|---|---|---|---|
| 工作台协议 | 工作项怎么读写、证据怎么记、什么时候找人 | `workitem-protocol` 技能 | 状态迁移、artifact 命名 |
| 领域流程 | 一类任务怎么做 | 6 个领域技能 | `sql-review`、`pipeline-debug` |
| 组织事实 | 分层、命名、时区、环境名、指标索引 | `AGENTS.md` | `dwd_` 前缀、`dt` 分区、Asia/Shanghai |

**分工原则**：技能写"步骤和判定"，AGENTS.md 写"事实和约定"，工具写"怎么访问"。三者不要互相复制。

### 9.2 技能的验收

每个技能至少配 3 个真实任务：
- 1 个标准场景（必须触发、产出合规）；
- 1 个边界场景（信息不全，必须主动问）；
- 1 个反例（诱导模型跳过证据，必须拒绝）。

跑不通就改技能，不要靠加 prompt。

---

## 10. 上下文工程

数据域最大的上下文杀手是 schema。策略：

1. **Schema card 而非 DDL**：每张表一张卡（粒度、分区、行数量级、owner、关键字段 ≤ 10 个），≤ 200 token，按需取。
2. **证据用 ID 引用**：工具返回摘要 + `evidence_id`，需要细节时再取，不把整份结果塞进上下文。
3. **一次最多 5 张表**：超过就分批或让用户指定。
4. **AGENTS.md 只放稳定事实**：易变的放 catalog，别写死在提示词里。
5. **技能正文 ≤ 8000 字符**，大材料进 `references/`。

---

## 11. 工作台循环（产品主线）

| 步骤 | Agent 动作 | 工具 | 产出 | 界面 | 守卫 |
|---|---|---|---|---|---|
| 1 接单 | 澄清意图、建 work item | workitem | `item.yaml` + `intent.md` | 新建工作项 | 验收标准必填 |
| 2 取事实 | 查 catalog / 血缘 / schema card | T0 | `evidence/` | 资产面板 | 每个结论要有证据 |
| 3 出方案 | 写 plan + artifact 草稿 | T2 | `plan.md` + `change.sql` | SQL 编辑器 | 不写平台 |
| 4 验证 | EXPLAIN / 采样 / dry-run | T1 | 验证证据 | 结果表 | 成本阈值 |
| 5 交付 | 汇总 diff + 证据 + 影响面 | T2 | `review.md` | 审批卡 | 缺证据不交付 |
| 6 沉淀 | 更新指标定义 / 复盘 / 技能 | T2 | 知识条目 | 知识库 | 人工确认 |

这个循环就是工作台的"产品骨架"：**每一步都有对应的界面、工具和守卫**，而不是只有对话框。

---

## 12. 权限、审批与审计

- **环境**：`dev` 默认；`prod` 读需显式声明，写必须审批。
- **审批内容**：对象、语句、影响面、时间窗、回滚方案——缺一不批。
- **双人规则**：T4 操作（删表/删分区/改类型/下线）需要 owner + 另一方。
- **审计**：每次工具调用进 session log；每次审批进 `decision.md`；两者用 `work_item_id` 关联。
- **凭据**：只在工具层解析，永远不进上下文；工具用专用只读账号，模型拿不到口令。

---

## 13. 评测

| 指标 | 定义 | 目标 |
|---|---|---|
| 任务完成率 | 工作项到达 `verified` 的比例 | ≥ 70% |
| 证据覆盖率 | artifact 中的结论有 Evidence 的比例 | 100%（硬指标） |
| 误阻断率 | 正确方案被评审驳回的比例 | ≤ 5% |
| 人工修改率 | artifact 被人工改动的行数占比 | ≤ 20% |
| 首次可用时间 | 从接单到产出可评审 artifact | ≤ 15 min |

方法：30 个 golden tasks（取数/建模/改表/排障各 7-8 个），可重放；每个技能 3 个回归任务。

---

## 14. 分期路线

| 期 | 内容 | 验收 | 依赖 |
|---|---|---|---|
| **M0**（1 周） | 工作项协议 + 6 技能 + AGENTS.md + 证据规则 | 在现有 harness（CC/OpenCode）跑通 3 个真实任务 | 无 |
| **M1**（3 周） | 只读工作台：catalog/lineage/sql 适配 + 证据 + 资产面板 | 15 分钟产出一份带证据的评审 | MCP/CLI |
| **M2**（3 周） | 写路径：proposal → 审批 → 执行 → 验证 | T3 操作全部经审批，审计可查 | 审批 seam |
| **M3**（3 周） | 多角色 + 批量：preset、subagent、workflow | 一次巡检 100 张表，产出结构化清单 | DSH preset/workflow |
| **M4**（持续） | 知识沉淀：指标定义、复盘、技能迭代 | 技能月更，误阻断率下降 | 评测体系 |

M0 刻意不依赖 DSH：**先用最小成本验证工作台协议本身**。M1 起再用 DSH 的 UI / 编排 / 审批能力。

---

## 15. 反模式

1. **聊天框里接 20 个 MCP 工具**——模型选不对工具，用户也不知道能干什么。
2. **把表结构全量塞进上下文**——前 3 轮很聪明，第 10 轮开始胡编。
3. **让模型判断权限**——它只会说"我有权限"，工具必须自己拒绝。
4. **没有证据的结论**——看起来专业，复核时全崩。
5. **一次改五个变量**——排障和优化都失效。
6. **技能写成百科**——触发不了，还占上下文。
7. **先做 UI 再做协议**——界面很好看，但没有状态，关掉就丢。
8. **所有任务都用 workflow**——线性任务用编排是浪费。

---

## 16. 待拍板的四个决策

| # | 决策 | 选项 | 建议 |
|---|---|---|---|
| 1 | 工作项状态放哪 | 文件 / 服务 | 先文件（M0），满足 5.2 的条件再上服务 |
| 2 | 单角色还是多角色 | 单 lead / lead+子代理 | M1 单 lead，M3 再拆子代理 |
| 3 | 第一块界面做什么 | 资产面板 / SQL 编辑器 / 证据视图 | 证据视图（最能体现工作台差异，成本最低） |
| 4 | 是否绑定 DSH | 绑定 / 可移植 | 协议可移植，宿主先 DSH；保留回退 CC 的可能 |

---

## 附：和现有 6 个技能的关系

`sql-review`、`sql-optimize`、`model-review`、`pipeline-debug`、`lineage-impact`、`data-service-contract` 是**领域流程层**（第 9.1 节的第二层）；
本文新增的是**工作台协议层**（第一层）和**组织事实层**（第三层）。
M0 要补的技能只有一个：`workitem-protocol`——它定义工作项怎么建、证据怎么记、状态怎么迁。
