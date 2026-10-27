# DataOps Stage 0–5 领导演示脚本

> **版本**：2026-10-27 · mock-first  
> **范围**：US 接单 → 需求 → 设计 + DataMap → 3a → 3b → 3c → 开发验证 → 数据 CICD  
> **不包含**：Stage 6 验收/复盘；真实 EDevOps、DataMap、血缘、调度、质量、代码平台、部署平台  
> **推荐时长**：25–35 分钟；完整版 45 分钟  
> **窗口**：1440×900，浏览器 100% 缩放

---

## 0. 演示前准备（10 分钟）

### 0.1 构建与安装

在仓库根目录执行：

```sh
node packages/dataops-client/scripts/build.mjs
node packages/dataops-brand/scripts/build.mjs

node scripts/install-dataops-profile.mjs
node scripts/install-dataops-skills.mjs
node scripts/check-dataops-preset.mjs
node scripts/check-dataops-workitem.mjs
```

说明：

- `install-dataops-profile.mjs` 会重新链接本地插件，并把 DataOps skills 安装到用户级 skill root。
- 客户端 bundle 是构建产物；**改过代码或拉过新提交后必须重建并重启**，不能只刷新页面。

### 0.2 启动/重启 dataops profile

先停止旧的 dataops 进程，再启动：

```sh
dsh --profile dataops
```

打开新会话。不要用普通 `desktop` profile。

### 0.3 准备 demo workitem

**推荐现场路径**：先 seed 到 Stage 4，显示 Stage 4 卡；再 seed 到 Stage 5，显示 CICD 卡。

```sh
# Stage 4：SE 已通过，Committer 待合入
node scripts/seed-dataops-demo.mjs --stage develop

# 需要展示 Stage 5 时再执行（覆盖同一个 demo workitem）
node scripts/seed-dataops-demo.mjs --stage cicd
```

seed 会创建/重建：

```text
workitems/2026-10-27-us-3821-demo/
```

它不会覆盖 P1 样例工作项。

### 0.4 预检（可选）

```sh
# 契约链：0→5，含签收与制品包
node scripts/e2e/dataops-stage0-5-contract.mjs

# 真实浏览器只读旅程：USPicker → Stage 5 卡
node scripts/e2e/dataops-p1.4.mjs --scenario journey-ui --keep

# Stage 4 / Stage 5 独立浏览器检查
node scripts/e2e/dataops-p1.4.mjs --scenario stage4-ui --keep
node scripts/e2e/dataops-p1.4.mjs --scenario stage5-ui --keep
```

### 0.5 演示兜底开关

| 现场问题 | 处理 |
|---|---|
| 卡片不出现 | 确认当前是新会话；仍不行则重启 dataops 进程并硬刷新 |
| 阶段计数还是 5/6 | 客户端 bundle 旧，重建 + 重启 |
| 签收层没有出现 | 点卡片按钮后等 500ms；确认没有旧 bundle |
| 点击签收只填了输入框 | 当前自动提交失败时，手动按 Enter；或直接把回执发出去 |
| Agent 不按预期出卡 | 用后面的“内部兜底提示词”明确要求读取 demo workitem；不要在现场解释工具名 |
| Stage 5 卡显示原始 JSON | 旧 bundle；重建并重启 |
| 页面横向滚动 | 用 1440；检查是否浏览器缩放不是 100% |

---

## 1. 开场（1 分钟）

**展示**：DataOps 新会话空白页。

**讲述**：

> 今天演示的不是一个工具目录，而是一条 US 驱动的数据交付链：  
> 从业务 US 进来，落到工作项，经过需求、设计、分析、方案、技术方案、开发验证，最后产出一个可交付的数据制品包。  
> 所有平台数据是 mock，重点看流程、门禁、证据和制品边界；Stage 6 不在本版。

**操作**：不急着发提示词，先让观众看左侧工作区和会话入口。

---

## 2. US 接单（3 分钟）

**输入**：

```text
查看待处理 US
```

**预期**：

- 出现 `USPicker` 卡；
- 显示待处理 US，超过 5 条可展开；
- 列表包含 **US-3821 · 渠道日报从下单口径改为支付口径**；
- 卡内显示 US 摘要、owner、优先级、资产、已有工作项。

**操作**：

- 点开/展开列表，指出超过 5 条的悬浮选择器；
- 选中/继续 US-3821。

**讲述**：

> 入口是业务 US，不是“新建一个流程”。US 会先判断是否已有工作项，避免重复接单；  
> workitem 是跨轮次的承载，阶段卡是每个阶段的交付面。

**如果自动列表没出现**：

```text
列出我的待处理 US，只列出来，不要接单。
```

---

## 3. 需求（4 分钟）

**输入**：

```text
处理 US-3821，创建或恢复工作项，先只完成需求阶段并出需求卡；用 mock 数据，缺口保留在卡片里，不要推进设计。
```

**预期**：

- `RequirementCard`；
- 目标、范围、非目标、验收、owner/requester、影响资产、gaps；
- 底部 `阶段简报` 显示当前阶段 = 需求；
- 卡片底部有 BA / 需求方签收。

**操作**：

1. 点 **BA 签收**；
2. 确认层显示完整 `【签收】...` 回执；
3. 点 **签收并提交**；
4. 等 Agent 处理，阶段状态变为 awaiting/部分签收；
5. 点 **需求方确认**，重复确认层；
6. 两位签完后，卡片/简报显示进入设计。

**讲述**：

> 需求不是一段自然语言，而是可验证的交付物：目标、范围、验收、影响面、缺口。  
> 签收不是“点一下消失”：确认层展示将提交的回执，提交后由 Agent 写入 workitem 的 approvals。  
> 最后一位必需角色签完，阶段 runtime 才推进。

**注意**：

- BA 和需求方是两个必需角色；
- 不要代签、不要由 Agent 自签；
- 签收是 mock 身份，不是生产认证。

---

## 4. 设计 + DataMap（4 分钟）

**输入**：

```text
继续设计阶段：读取需求、DataMap、独立血缘和基础画像，产设计交付物并出设计卡；用 mock 数据，缺口保留，不要直接进入方案。
```

**预期**：

- `DesignCard`：
  - target / grain / PK / partition / source / metrics / impact；
  - DataMap 寻源；
  - 独立血缘入口；
  - 独立质量/画像；
  - 设计证据链；
  - gaps；
  - BA 签收；SE advisory/deferred。
- DataMap 路径：

```text
场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产
```

- 物理资产统一节点 `assetType=warehouse_table` / `lake_table`；
- 资产显示字段、owner、行数。

**操作**：

- 滚动到 DataMap 区，指出路径和资产卡；
- 展开一条证据（查询 / 时间范围 / env / as_of）；
- 点 **确认设计**；
- SE 如出现，只作为 advisory/deferred，不冒充生产可行性签字。

**讲述**：

> DataMap 只做寻源和元数据；血缘、质量分别来自独立 mock provider。  
> 这三件事在卡上是分开的，避免把 DataMap 当成血缘/质量系统。

---

## 5. 3a 分析（3 分钟）

**输入**：

```text
继续 3a 分析：做数据挖掘、基线/对账、候选比较和可行性，产分析卡；如果有 blocking gap 就停住，不要 pass。
```

**正向 fixture（默认演示）**：

```text
补 mock 证据：读取 closed 证据，重新计算 G-PAYTIME / G-DATAMAP-PAY，确保 analysis status=passed、blocking gaps=[]，用 stage prepare 更新，保留 mock 标记。
```

**预期**：

- `AnalysisCard`：
  - 问题、基线、探索、候选比较、可行性；
  - 证据 chip：查询、时间范围、env、as_of；
  - passed / blocked / returned 三态；
  - BA 硬签收。
- blocked 时签收按钮不可用/被拒绝。

**操作**：

- 先展示 blocked 状态（如果分支可用），讲“blocking 不能进 3b”；
- 再补 closed 证据，展示 passed；
- 点 **BA 签收**。

**讲述**：

> 3a 是分析结论，不是设计正文。  
> 默认正向 fixture 是 blockers 已关闭；blocked 分支不是装饰，签收会被门禁挡住。

**兜底**：

- 如果 Agent 没有更新为 passed，直接说“展示 blocked 分支，证明门禁”；不要把 blocked 说成通过。

---

## 6. 3b 需求方案（2 分钟）

**输入**：

```text
继续 3b 需求方案：消费 3a，产 solution 卡，给出方案、备选、tradeoff、影响/依赖/约束；用 mock，不重做分析。
```

**预期**：

- `SolutionCard`：
  - 选择方案；
  - 备选方案；
  - tradeoff；
  - 影响 / 依赖 / 约束；
  - solution-blocking=0；
  - execution-blocking 带 mustCloseBefore；
  - BA 签收；需求方 advisory。

**操作**：

- 点 **BA 签收**。

**讲述**：

> 3b 是业务方案，不重新挖数据；3a 的结论被消费，不是被复制。

---

## 7. 3c 技术方案 + 设计血缘（4 分钟）

**输入**：

```text
继续 3c 技术方案：产任务、依赖、SLA、工时、风险、回滚，并展示一层设计血缘和时间带；用 mock，不递归上游的上游。
```

**预期**：

- `TechPlanCard`：
  - 任务、依赖、SLA、工时、风险、回滚；
  - 设计态血缘：
    - 一层直接上游表；
    - 每张上游表显示产出 ETL + 调度 job；
    - 目标表显示目标 ETL + schedule job；
    - 不递归上游表的上游；
    - 集成/内部加工统一为 `etl_job`，jobKind = integration / batch_etl / service；
    - observed / planned / diff；计划节点虚线；
  - 时间带：上游就绪 → ETL 开始/结束 → SLA → 余量。
- SE 签收；Dev 可落地 deferred 只限协同项。

**操作**：

- 打开血缘/设计视图；
- 指一层上游和两条 job；
- 指时间带余量（案例里上游 03:12 → ETL 03:30–04:38 → SLA 05:00，buffer 22 分钟）；
- 点 **SE 确认**。

**讲述**：

> 这是设计态血缘，不是递归生产血缘。  
> 一层上游足够回答“目标表依赖谁、何时就绪、SLA 还剩多少”；再往上展开属于生产血缘，不塞进技术方案卡。

---

## 8. Stage 4 开发验证（6 分钟）

### 8.1 切到 demo workitem

先确认已经 seed：

```sh
node scripts/seed-dataops-demo.mjs --stage develop
```

**输入（现场口语版）**：

```text
读取工作项 2026-10-27-us-3821-demo 的开发验证交付物，展示开发验证卡；只读展示，不签收、不合并、不执行 pipeline。
```

**预期**：

- `DevelopCard`：
  - 10 个产物：4 SQL、1 etl、1 schedule、1 API、2 ops、1 test；
  - Build / Scan / Deploy / Test；
  - attempt 2 通过；
  - Test = manual，不伪造自动化；
  - 任务 T1–T6；
  - SE = 已签收；
  - Committer = 待处理；
  - 查看产物 / 日志。

### 8.2 讲解回流

**讲述**：

> 开发不是“提交一张表单”：  
> Build 第一次类型不匹配，第二次通过；  
> Scan 第一次并发 8 > 4、作业数 52 > 50，拆依赖段后通过；  
> Deploy 第一次数据源未登记，补 datasource 后重部署；  
> Test 平台没有自动化机制，所以明确写 manual，不伪造“全自动通过”。

### 8.3 合入门禁

**操作**：

- 点 Committer 的 **记录合入**（如果卡片显示该动作）；
- 确认层显示 `develop.merge` 回执；
- 提交后，workitem 才进入 Stage 5。

**讲述**：

> SE 评审和 Committer 合入是两道门禁；DataOps 不执行真实 merge。  
> 未合入不能触发 CICD。

### 8.4 兜底

如果现场 Agent 没有展示卡片，用内部兜底提示词：

```text
用 dataops_shared_stage prepare 展示 workitems/2026-10-27-us-3821-demo 的 develop 交付物；只展示，不修改状态。
```

> 内部提示词只给操作人使用，不向观众念出工具名。

---

## 9. Stage 5 数据 CICD（5 分钟）

### 9.1 准备 Stage 5 卡

```sh
node scripts/seed-dataops-demo.mjs --stage cicd
```

**输入（现场口语版）**：

```text
读取工作项 2026-10-27-us-3821-demo 的 cicd 交付物，展示数据 CICD 制品卡；只读展示，不触发外部部署、不签收。
```

**预期**：

- `PipelineCard`：
  - pipelineRunId / commit / status；
  - Build → Scan → Test → Package；
  - 制品包 `dataops-dws.trade_channel_daily-1.0.0.tar.gz`；
  - digest / manifest / checksums；
  - 流水线日志 / scan / manual test；
  - 外部环境 dev → sit → uat → beta → gamma 只读；
  - 外部审批 ID 只读；
  - 无 DSH approval、发布、回滚按钮。

### 9.2 讲解边界

**讲述**：

> Stage 5 不是逐环节按钮，而是一条 pipeline：build / scan / test / package 一次跑完。  
> DataOps 的 pass 以 pipeline 成功 + 制品包生成为界；  
> 外部环境由公司发布平台负责，DataOps 只展示状态，不执行部署、不执行回滚，也不使用 DSH 原生 approval。

### 9.3 可选：真实触发 mock pipeline

如果要从 Stage 4 现场走一次：

```text
基于已合入的开发产物触发一条 mock 数据 CICD pipeline，产出制品包；展示 pipeline 结果和外部环境只读状态，不要部署。
```

**兜底**：如果 Agent 没有触发，回到 seed 的 Stage 5 卡展示；不要在台上排障超过 30 秒。

---

## 10. 收尾（1 分钟）

**讲述**：

> 到这里停在 Stage 5。  
> 没有 Stage 6 假页面，没有真实发布、部署、回滚，也没有把 mock 制品说成生产制品。  
> 这条链路证明的是：US → 工作项 → 阶段交付物 → 签收 → 开发验证 → 制品包，是一条可恢复、可审计的流程。

---

# 附录 A：30 秒快速自动彩排

适合上台前检查环境和截图：

```sh
node scripts/e2e/dataops-stage0-5-contract.mjs
node scripts/e2e/dataops-p1.4.mjs --scenario journey-ui --keep
node scripts/e2e/dataops-p1.4.mjs --scenario stage4-ui --keep
node scripts/e2e/dataops-p1.4.mjs --scenario stage5-ui --keep
```

通过标准：

```text
stage0-5 contract: PASS
journey-ui: PASS
stage4-ui: PASS
stage5-ui: PASS
```

---

# 附录 B：演示数据与证据

## US

- US-3821 · 渠道日报从下单口径改为支付口径
- 目标：`dws.trade_channel_daily` 改为支付成功口径
- 下游：`ads.channel_report` / `rpt.funnel` / `api.channel_metrics`

## DataMap

```text
场景：渠道日报支付口径
主题：渠道运营 / 交易
业务对象：订单 / 渠道
逻辑实体：订单事实 / 渠道维度
物理资产：dwd.orders / dim.channel / dws.trade_channel_daily
```

## Stage 4

- 4 SQL
- 1 etl.yaml
- 1 schedule.yaml
- 1 data_consume_api.yaml
- 2 ops（datasource + deploy）
- 1 test report
- Build/Scan/Deploy attempt 2 pass；Test manual
- SE approved；Committer 合入是外部动作

## Stage 5

- pipeline：Build / Scan / Test / Package
- artifact：`dataops-dws.trade_channel_daily-1.0.0.tar.gz`
- manifest + checksums + digest
- env：dev / sit / uat / beta / gamma
- Stage 5 pass 不等外部环境完成

## 截图

- `prototype/shots/stage-0-us-picker.png`
- `prototype/shots/stage-0-5-journey.png`
- `prototype/shots/stage-4-live.png`
- `prototype/shots/stage-4-live-1600.png`
- `prototype/shots/stage-4-live-1920.png`
- `prototype/shots/stage-4-live-dark.png`
- `prototype/shots/stage-5-live.png`
- `prototype/shots/stage-5-live-full.png`
- `prototype/shots/stage-5-live-1600.png`
- `prototype/shots/stage-5-live-1920.png`
- `prototype/shots/stage-5-live-dark.png`

---

# 附录 C：失败路径台词（可选）

## 3a blocking

**输入**：

```text
展示一个 blocking 未关闭的 3a 分析分支，尝试 BA 签收，证明门禁会拒绝。
```

**台词**：

> 这不是 happy path 装饰：blocking gap 未关闭，签收被 stage runtime 拒绝，3b 不会开始。

## Stage 4 回流

- Build 失败：类型不匹配 → 改代码 → attempt 2
- Scan 失败：并发/作业数超限 → 拆依赖段 → attempt 2
- Deploy 失败：数据源未登记 → 补 datasource → 重部署
- Test：平台无自动化 → manual，不伪造自动化

## Stage 5 失败

- pipeline 失败 → 回 Stage 4 修 → 重新合入 → 新 pipeline
- 外部环境 pending / 审批拒绝 → 只记录，不改变 DataOps pipeline pass
- DataOps 不执行回滚

---

# 附录 D：边界与 Q&A

**Q：这是真实 EDevOps 吗？**  
A：不是，US、DataMap、血缘、质量、调度、CICD 都是 mock；真实接入需要 adapter 和权限。

**Q：为什么 Stage 5 不直接用 DSH 审批？**  
A：发布审批属于公司部署系统/外部发布平台；DataOps 只记录外部审批 ID/状态，不伪造审批。

**Q：为什么没有 Stage 6？**  
A：本版只到 Stage 5；Stage 6 不实现、不展示假页面。

**Q：开发产物和 CICD 制品是什么关系？**  
A：Stage 4 产物是开发验证包；Stage 5 pipeline 重新 build/scan/test/package，生成正式 mock 制品包。不能用 Stage 4 产物冒充 Stage 5 制品。

**Q：签收是真的吗？**  
A：mock 身份 + UI actionId + stage runtime 门禁；不是生产认证。

## 已知限制（如实说明）

- 当前 `journey-ui` 是只读的 USPicker → Stage 5 卡旅程；逐阶段签收由契约 e2e 覆盖。
- 现场逐阶段签收依赖 Agent 和 UI 自动提交；网络/模型慢时使用 seed + 只读展示兜底。
- P1/P2 的 client/tool 检查通过；完整 P1/P2 浏览器回归未在本次演示前重跑。
- GitHub 推送曾因网络失败；演示前确认 `git status` 和远端状态。
