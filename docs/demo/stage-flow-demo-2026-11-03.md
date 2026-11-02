# DataOps 阶段流转演示脚本

> 日期：2026-11-03  
> 目标：演示 US/需求 → 设计 → 3a 分析 → 3b 需求方案 → 3c 技术方案 → 开发验证 → 数据 CICD 的完整阶段推进。  
> 时长：18–22 分钟  
> 边界：平台数据为 mock；mock 只模拟部署状态，真实部署仅在内网配置下执行。

---

## 0. 演示前准备

```bash
node packages/dataops-client/scripts/build.mjs
node packages/dataops-brand/scripts/build.mjs
node scripts/verify-local.mjs
```

重启 3088 Host，关闭 DevTools，浏览器缩放 100%。

创建时用 source.id 去重，但后续必须使用 **创建的 Workitem ID**：

```text
source.id = DEMO-STAGEFLOW-001
workitemId = 创建后返回的 ID
```

不要把 source.id 当成 workitemId；也不要用历史工作项当主演示对象，避免旧 revision / 旧门禁干扰。

### 兜底种子

如果现场 Agent 流程卡住，切到已准备的工作项：

```bash
node scripts/seed-dataops-demo.mjs --stage develop
```

CICD 段再执行：

```bash
node scripts/seed-dataops-demo.mjs --stage cicd
```

然后让 Agent 读取 `2026-10-27-us-3821-demo`。

---

## 1. 开场：为什么看阶段

**展示**：空会话 + DataOps 工作台。

**讲述**：

> 今天演示的不是一张卡，而是一条阶段链。  
> 会话负责迭代，Workitem 负责沉淀；每个阶段都必须有交付物、门禁和签收。  
> 上一阶段没有签收，下一阶段不会启动。

---

## 2. 创建演示工作项

**输入**：

```text
创建一个 DataOps 演示工作项：
source.system=edevops
source.id=DEMO-STAGEFLOW-001
标题：渠道日报支付口径端到端演示
初始阶段：requirement

只创建/恢复工作项，不要生成交付物。
```

**预期**：

- 返回 workitem ID
- 阶段：`requirement`
- 没有交付物、没有当前 revision
- DataOps `交付物` 显示空态

**讲述**：

> 工作项先建立，不代表阶段已经开始。  
> 这样后面每个阶段产物都能挂到同一个 Workitem 上。

---

## 3. 需求阶段

**输入**：

```text
继续需求阶段：
读取刚创建/恢复的 Workitem ID，生成需求交付物并 stage prepare。
目标：渠道日报从下单口径改为支付成功口径。
范围：dws.trade_channel_daily + 3 个下游。
验收：自对账容差 0、下游口径一致、05:00 前产出。
生成后停下，等我签收，不要自动推进设计。
```

**预期卡**：

```text
需求 · 渠道日报支付口径
目标 / 范围 / 验收 / owner / requester / 影响资产 / gaps
```

**检查**：

```text
DataOps → 交付物
需求 · v1 · draft
currentIteration = requirement rev-0001
```

**操作**：

1. 点 `确认并继续`
2. 一次提交 BA + 需求方签收
3. 页面自动刷新，等待阶段推进

**预期状态**：

```text
requirement gate = approved
stage → design
```

**讲述**：

> 需求必须有两个角色签收。  
> 这里不是“点完按钮就消失”，签收会写入 workitem 的 approval 和 revision 绑定。

---

## 4. 设计阶段

**输入**：

```text
继续设计阶段：
读取需求、DataMap、独立血缘和基础画像，生成设计交付物并 stage prepare。
保留 target / 粒度 / 主键 / 来源 / 指标 / 影响面 / gaps。
生成后停下，等我确认设计。
```

**预期卡**：

```text
设计 · dws.trade_channel_daily
target / grain / PK / partition
sources / metrics / schedule / impact
DataMap 寻源 + 独立血缘/质量
gaps
```

**检查**：

```text
DataOps → 交付物
设计 · v1 · draft
currentIteration = design rev-0001
```

**操作**：

```text
确认并继续
```

**预期状态**：

```text
design gate = approved
stage → scheme.analysis
```

**讲述**：

> 设计阶段只回答“怎么建”。  
> DataMap、血缘、质量是三个独立来源，不能互相冒充。  
> 设计通过后才进入 3a。

---

## 5. 3a 数据分析

**输入**：

```text
继续 3a 数据分析：
读取设计、血缘、画像和证据，产分析交付物并 stage prepare。
做基线/对账、候选比较和可行性。
如果有 blocking gap 就停下，不要 pass。
生成后停下，等我签收。
```

**预期卡**：

```text
3a 分析
问题 / 基线 / 候选 / 可行性 / 证据 chips / gaps
```

**操作**：

```text
确认并继续
```

**预期状态**：

```text
scheme.analysis gate = approved
substage → solution
```

**讲述**：

> 3a 是可行性检查，不是方案选择。  
> blocking gap 没关闭，不允许进入 3b。

---

## 6. 3b 需求方案

**输入**：

```text
继续 3b 需求方案：
基于 3a 分析选择方案、备选和 tradeoff，生成需求方案交付物并 stage prepare。
不要跳过 3a 的 blocking gap。
生成后停下，等我签收。
```

**预期卡**：

```text
需求方案
方案选择 / 备选 / tradeoff / 影响 / 决策
```

**操作**：

```text
确认并继续
```

**预期状态**：

```text
scheme.solution gate = approved
substage → tech_plan
```

**讲述**：

> 3b 回答“为什么选这个方案”，不是直接写代码。

---

## 7. 3c 技术方案

**输入**：

```text
继续 3c 技术方案：
产任务、依赖、SLA、工时、风险和回滚，生成技术方案交付物并 stage prepare。
回滚和风险必须保留。
生成后停下，等我确认技术方案。
```

**预期卡**：

```text
技术方案
目标 / 周期 SLA / 工时 / 任务拆解 / 依赖 / 风险 / 回滚
设计血缘一层上游
```

**操作**：

```text
确认并继续
```

**预期状态**：

```text
scheme.tech_plan gate = approved
stage → develop
```

**讲述**：

> 3c 回答“怎么做、怎么回滚、谁来做”。  
> SE 签收后才允许进入开发。

---

## 8. 开发验证

**输入**：

```text
继续开发验证阶段：
读取技术方案和开发规范，生成 SQL/ETL/schedule/API/ops/tests 多产物；可选执行 ltsgen，生成 lts_code/<task>/task.yaml 和 output/<package>.zip；再执行 mock build/scan/deploy/test。
失败要记录 attempt 和修复动作。
生成后停下，等我评审和合入。
```

**预期卡**：

```text
开发验证
分支 / 产物数量 / build / scan / deploy / test
数据代码仓 / LTS 制品（如果执行了 ltsgen）
SE 通过 / 记录合入
```

**操作**：

1. 点 `SE 通过`
2. 页面自动刷新
3. 点 `记录合入`
4. 阶段推进到 CICD

**预期状态**：

```text
develop.code_review = approved
develop.merge = approved
stage → cicd
```

**讲述**：

> 开发阶段不只看“代码写完了”。  
> build/scan/deploy/test 的 attempt 和失败回流都要在卡上；SE 和 Committer 是两道理性门禁。

---

## 9. 数据 CICD

**输入**：

```text
继续数据 CICD：
确认已合入后，触发一次 dataops_cicd_pipeline。
展示 pipeline run、制品包、manifest、checksum 和外部环境状态。
mock 下只模拟 dev/sit/uat/beta/gamma 状态，不执行真实部署；不要接 DSH 原生 approval。
如果需要展示部署链，调用 `dataops_cicd_pipeline({ deploy: true })`，仍是 mock 状态。
```

**预期卡**：

```text
数据 CICD
pipeline run
package / manifest / checksum
外部环境只读
```

**预期状态**：

```text
cicd stage = done
```

**讲述**：

> mock 只生成和验证制品，并模拟环境状态，不执行真实部署。  
> internal 配置下才执行真实部署，且需要用户确认。  
> Stage 6 不在本版。

---

## 10. 回到 DataOps 看沉淀

演示完阶段链后，点：

```text
DataOps → 交付物
```

预期：

```text
需求       v1  approved
设计       v1  approved
数据挖掘   v1  approved
需求方案   v1  approved
技术方案   v1  approved
开发       v1  approved
CICD       v1  succeeded
currentIteration = cicd
```

点 `当前迭代`：

- 多阶段折叠
- 当前阶段展开
- revision 历史
- gate 与 revision 绑定
- evidenceRefs

**讲述**：

> 阶段卡是过程视图，Workitem Artifact Ledger 是结果。  
> 每个阶段的产物、门禁和证据都能回放。

---

## 11. 一句话收尾

> 这条链的核心不是七张卡，而是：  
> 需求、设计、方案、开发、CICD 每一阶段都有产物；  
> 每一版产物都有 revision；  
> 每一次审批都绑定 revision；  
> 每一步推进都必须过门禁。

---

## 12. 现场兜底

| 现象 | 处理 |
|---|---|
| Workitem 已存在 | 用创建时返回的 Workitem ID 恢复，不要把 source.id 当 workitemId |
| 阶段卡不出现 | 看轨迹是否调用 `stage prepare` |
| 签收后没推进 | 确认所有必需角色都已签；页面会自动刷新，等刷新完成 |
| 旧 revision 在 | 新 prepare 会生成新 rev，旧审批失效 |
| 设计卡没归档 | 必须调用 `stage prepare`，不能只展示卡 |
| CICD 卡未完成 | seed `--stage cicd`，或调用 `dataops_cicd_pipeline({ deploy: true })` 重试 |
| 页面数据旧 | 重建 client + 重启 Host + 硬刷新 |
