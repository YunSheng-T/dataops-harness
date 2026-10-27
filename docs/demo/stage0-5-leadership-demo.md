# Stage 0–5 领导演示脚本

> 本地 mock 演示 · 不接真实 EDevOps/DataMap/血缘/调度/质量/发布平台 · Stage 6 不展示

## 0. 准备

```sh
node packages/dataops-client/scripts/build.mjs
node scripts/install-dataops-profile.mjs
node scripts/check-dataops-preset.mjs

# 清空/重建专用 demo workitem（不覆盖 P1 样例）
node scripts/seed-dataops-demo.mjs --stage develop
# 若要从 Stage 4 继续到 Stage 5：
# node scripts/seed-dataops-demo.mjs --stage cicd
```

打开 dataops profile 的新会话，窗口 1440×900，暗色/亮色任选。

可选彩排（真实浏览器、只读）：

```sh
node scripts/e2e/dataops-p1.4.mjs --scenario journey-ui --keep
```

它会在同一会话里从 USPicker 走到 Stage 5 卡，并截图；不代替真实签收。

## 1. US 接单

输入：

> 查看待处理 US

预期：

- USPicker 显示全部待处理 US；
- 可展开超过 5 条；
- 选中 **US-3821 · 渠道日报从下单口径改为支付口径**；
- 卡片展示 US → workitem → 初始阶段。

讲述：

> 工作台不是工具目录；US 是入口，workitem 是承载，阶段卡是交付面。

## 2. 需求

预期：

- RequirementCard：目标/范围/验收/影响面/gaps；
- 底部阶段简报：当前 stage = requirement；
- 签收：BA + 需求方；
- 签收确认层显示完整回执，提交后写 workitem；
- 最后一位签完进入设计。

## 3. 设计 + DataMap

预期：

- DesignCard：target/grain/PK/partition/source/metrics/impact；
- DataMap 路径：场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产；
- 物理资产统一节点 `assetType=warehouse_table`；
- 资产卡显示字段/owner/行数；
- 独立血缘、独立画像分开展示；
- BA 签收；SE advisory/deferred。

讲述：

> DataMap 只做寻源和元数据；血缘、质量分别来自独立 mock provider，不混在一起。

## 4. 3a 分析

预期：

- AnalysisCard：问题、基线、探索、候选比较、可行性；
- 证据 chip：查询/时间范围/env/as_of；
- passed / blocked / returned 三态；
- 默认正向 fixture blockers 已关闭；可切换 blocked 分支展示门禁。

讲述：

> 3a 是分析结论，不是设计正文；blocking 未关不能进 3b。

## 5. 3b 需求方案

预期：

- SolutionCard：方案选择、备选、tradeoff、影响/依赖/约束；
- 消费 3a，不重做分析；
- BA 签收；需求方 advisory。

## 6. 3c 技术方案 + 设计血缘

预期：

- TechPlanCard：任务、依赖、SLA、工时、风险、回滚；
- LineageCard：
  - 只展开一层直接上游表；
  - 每个上游表显示 ETL + 调度 job；
  - 目标表显示目标 ETL + 调度；
  - observed / planned / diff；计划节点虚线；
  - 时间带：上游就绪 → ETL → SLA → 余量；
- SE 签收；Dev 可落地 deferred 只限协同项。

讲述：

> 这是设计态血缘，不是递归生产血缘；一层上游足够回答“目标表依赖谁、何时就绪”。

## 7. Stage 4 开发验证

切到已 seed 的 demo workitem（或按 workflow 继续）：

预期：

- DevelopCard：多产物 SQL / etl / schedule / API / ops / tests；
- Build / Scan / Deploy / Test 状态；
- attempt 回流：类型不匹配、并发/作业数、数据源缺失；
- Test 标 manual；不伪造自动化；
- SE review approved；
- Committer merge waiting/pending；
- 合入后才进 Stage 5。

讲述：

> 开发不是一次表单提交，而是验证循环；DataOps 不执行 merge。

## 8. Stage 5 数据 CICD

预期：

- 一条 pipeline：Build → Scan → Test → Package；
- 制品包 `dataops-dws.trade_channel_daily-1.0.0.tar.gz`；
- digest / manifest / checksums；
- pipeline 日志 / scan 报告 / manual test 记录；
- 外部环境 dev → sit → uat → beta → gamma 只读；
- 无 DSH approval、无发布/回滚按钮。

讲述：

> Stage 5 的 DataOps pass 只看 pipeline + 制品包；外部环境由公司发布平台负责，DataOps 不冒充部署结果。

## 9. 结束

Stage 5 结束即停；Stage 6（验收/复盘）本版不实现，不展示假页面。

## 失败路径演示（可选）

- 3a blocking：切到 blocked fixture，点击签收应被门禁拒绝；
- Stage 4 build/scan 失败：展开 attempt，展示回流；
- Stage 5 pipeline 失败：回 Stage 4 修后重新合入，再触发新 pipeline；
- 外部环境 pending：只读展示，不改变 DataOps pipeline pass。


## 证据截图

- `prototype/shots/stage-0-us-picker.png`
- `prototype/shots/stage-0-5-journey.png`
- `prototype/shots/stage-4-live.png` / `stage-4-live-dark.png`
- `prototype/shots/stage-5-live.png` / `stage-5-live-dark.png`
