# DataOps 对话式验收脚本

> 用途：不跑终端断言，由验收人直接用业务语言和 Agent 对话，逐阶段看卡、签收、追问。
> 范围：Stage 0+1 → Stage 5；Stage 6 不验收、不展示。
> 前提：本地 mock profile 已启动；真实 EDevOps/Code/CICD/SSO 不在本轮验收。

## 0. 验收前 3 分钟

1. 新开一个 dataops 会话。
2. 关闭旧 tab，避免旧 bundle。
3. 确认顶部是 `5/5`，没有“复盘/Stage 6”。
4. Stage 4–5 使用预置 demo workitem：

```sh
node scripts/seed-dataops-demo.mjs --stage develop
```

> 如果验收只走 Stage 0–3，不需要 seed。

验收人角色建议：

- 业务验收人：模拟 BA/需求方
- 技术验收人：模拟 SE/Committer
- 记录人：记录实际结果和截图

---

## 1. US 接单

**验收人说：**

> 查看我的待处理 US。

**期望：**

- 出现 USPicker；
- 超过 5 条可展开；
- 有 US-3821；
- 显示状态、优先级、owner、资产；
- 不暴露工具名。

**追问：**

> 这些 US 是 mock 还是真实 EDevOps？

**期望回答：**

> mock，接真实 EDevOps CLI 后才会变成真实数据。

**通过标准：**

- [ ] USPicker 出现
- [ ] 能看到 US-3821
- [ ] 能说明 mock 边界

---

## 2. 需求

**验收人说：**

> 处理 US-3821，创建或恢复工作项，先只做需求阶段并出需求卡；缺口保留在卡里，不要直接进设计。

**期望：**

- RequirementCard；
- 目标、范围、非目标、验收、owner/requester、影响资产、gaps；
- 阶段简报显示需求；
- 卡片有 BA / 需求方签收。

**验收动作：**

1. 点 **BA 签收**；
2. 确认层出现完整回执；
3. 点 **签收并提交**；
4. 再点 **需求方确认**。

**追问：**

> 这次签收记录在哪里？谁签的？

**期望回答：**

> 记录在 workitem 的 approvals/audit；当前是 mock 身份，真实 SSO 接入后才代表生产身份。

**通过标准：**

- [ ] 需求卡字段完整
- [ ] 签收确认层可见
- [ ] 两位签完进入设计
- [ ] 能说明 mock 身份边界

---

## 3. 设计 + DataMap

**验收人说：**

> 继续设计阶段，用 mock DataMap、独立血缘和画像，出设计卡；缺口保留。

**期望：**

- DesignCard；
- target / grain / PK / partition / source / metrics / impact；
- DataMap 路径：

```text
场景 → 主题 → 业务对象 → 逻辑实体 → 物理资产
```

- 资产字段、owner、行数；
- 独立血缘入口；
- 独立质量/画像；
- BA 签收，SE advisory/deferred。

**追问：**

> DataMap、血缘、质量是一套数据吗？

**期望回答：**

> 不是，DataMap 只做寻源和元数据；血缘、质量分别来自独立 mock provider。

**通过标准：**

- [ ] 设计卡完整
- [ ] DataMap 路径/资产正确
- [ ] 三个来源分开
- [ ] BA 签收

---

## 4. 3a 分析

**验收人说：**

> 继续 3a 分析，做数据挖掘、基线/对账、候选比较和可行性；有 blocking gap 就停住。

**正向验收：**

> 读取 closed 证据，关闭 mock blockers，重新出 passed 的分析卡。

**期望：**

- AnalysisCard；
- 证据 chip：查询、时间范围、env、as_of；
- passed / blocked / returned；
- BA 签收。

**反向验收（可选）：**

> 展示一个 blocking 未关闭的 3a，然后尝试签收。

**期望：**

> 签收被拒绝，不能进 3b。

**通过标准：**

- [ ] 分析卡有证据
- [ ] blocking 门禁真实
- [ ] BA 签收后进 3b

---

## 5. 3b 需求方案

**验收人说：**

> 继续 3b，消费 3a 的结论，出需求方案卡；给方案、备选、tradeoff、影响和约束。

**期望：**

- SolutionCard；
- 不重新做分析；
- solution-blocking=0；
- BA 签收；需求方 advisory。

**通过标准：**

- [ ] 方案卡完整
- [ ] 消费 3a 而非重复分析
- [ ] BA 签收

---

## 6. 3c 技术方案 + 设计血缘

**验收人说：**

> 继续 3c，出技术方案卡，并展示一层设计血缘和时间带；不要递归上游的上游。

**期望：**

- TechPlanCard：任务、依赖、SLA、工时、风险、回滚；
- 一层直接上游表；
- 每张上游表有 ETL + 调度 job；
- 目标表有目标 ETL + 调度；
- observed / planned / diff；
- 时间带：上游就绪 → ETL → SLA → 余量；
- SE 签收。

**追问：**

> 这是生产血缘吗？

**期望回答：**

> 不是，这是设计态一层血缘；生产血缘由独立系统提供，不塞进技术方案。

**通过标准：**

- [ ] 技术方案卡完整
- [ ] 一层血缘 + ETL/调度
- [ ] 时间带
- [ ] SE 签收
- [ ] 进入 Stage 4

---

## 7. Stage 4 开发验证

> 推荐使用已 seed 的 `2026-10-27-us-3821-demo`，现场更稳。

**验收人说：**

> 读取 demo 工作项的开发验证交付物，展示开发验证卡；只读展示，不签收。

**期望：**

- DevelopCard；
- 10 个产物；
- Build / Scan / Deploy / Test；
- attempt 回流；
- Test = manual；
- SE 已签收；
- Committer 待处理；
- “记录合入”可见。

**追问：**

> 开发测试是自动通过的吗？

**期望回答：**

> 不是，平台没有自动化测试机制，所以明确写 manual；不伪造自动化。

**签收动作：**

1. 点 **记录合入**；
2. 确认层显示 `develop.merge / committer`；
3. 点 **签收并提交**；
4. 观察 toast：`签收已记录`；
5. 阶段进入 CICD。

**通过标准：**

- [ ] 多产物
- [ ] attempt 回流
- [ ] Test manual
- [ ] Committer 直连签收
- [ ] 不执行真实 merge
- [ ] 进入 Stage 5

### 失败分支（可选）

```sh
node scripts/seed-dataops-demo.mjs --stage develop --mode build-failed
```

**验收人说：**

> 展示 build 失败的开发卡。

**期望：**

- Build failed；
- 没有“记录合入”；
- 有“重新编译”；
- 修复后才允许合入。

---

## 8. Stage 5 数据 CICD

**准备：**

```sh
node scripts/seed-dataops-demo.mjs --stage cicd
```

**验收人说：**

> 展示 demo 工作项的数据 CICD 制品卡；只读，不部署、不回滚。

**期望：**

- 一条 pipeline：Build → Scan → Test → Package；
- 制品包 `dataops-dws.trade_channel_daily-1.0.0.tar.gz`；
- digest / manifest / checksums；
- 外部环境 dev → sit → uat → beta → gamma 只读；
- 无 DSH approval；
- 无发布/回滚按钮。

**追问：**

> 外部环境完成了吗？Stage 5 什么时候算通过？

**期望回答：**

> 外部环境只读，不参与 DataOps 门禁；Stage 5 以 pipeline 成功 + 制品包生成为界。

**通过标准：**

- [ ] 单条 pipeline
- [ ] 制品包 + manifest/checksum
- [ ] 外部环境只读
- [ ] 无 DSH approval / 发布 / 回滚
- [ ] 停在 Stage 5，无 Stage 6

---

## 9. 收尾追问

验收人可任选：

> 现在整体停在哪个阶段？

> 哪些是 mock？哪些是真实？

> 这次签收是谁签的？记录在哪？

> 下一阶段是什么？为什么本版没有？

**期望：**

- 明确停在 Stage 5；
- 明确 mock/真实边界；
- 明确签收记录位置；
- 明确 Stage 6 不在本版。

---

## 10. 验收记录模板

| 项 | 记录 |
|---|---|
| 阶段 | 0+1 / 2 / 3a / 3b / 3c / 4 / 5 |
| 验收人输入 | 原话 |
| 实际卡/回答 | 摘要 |
| 是否 mock | 是/否 |
| 门禁/签收 | 通过/拒绝/未触发 |
| 证据 | 截图/文件路径 |
| 结论 | 通过 / 有条件通过 / 不通过 |
| 问题 | 具体问题 + 复现步骤 |

## 11. 本轮验收边界

- 所有平台数据是 mock；
- 真实 EDevOps US CLI、Code CLI、CICD CLI、SSO 未接；
- 签收是 mock 身份 + Host route；
- 不执行真实 merge/deploy/release/rollback；
- 不展示 Stage 6。

## 12. 如果卡住

| 现象 | 处理 |
|---|---|
| 卡片不出现 | 新会话/重启 dataops/硬刷新 |
| 阶段计数不是 5/5 | 旧 bundle，重建重启 |
| 签收只填输入框 | 旧 bundle；最新版应 Host 直连 |
| 签收被拒绝 | 检查当前 mock 身份角色/阶段 |
| Agent 不按预期出卡 | 用“只读展示当前阶段卡”兜底 |
| Stage 5 显示原始 JSON | 旧 bundle，重建重启 |

## 13. 最小通过集

时间不够时，只验这 8 条：

1. USPicker 出现 US-3821
2. 需求卡 + BA/需求方签收
3. 设计卡 + DataMap
4. 3a 证据 + blocking 门禁
5. 3c 一层血缘 + 时间带 + SE 签收
6. Stage 4 多产物 + 记录合入
7. Stage 5 pipeline + 制品包 + 环境只读
8. 顶部 5/5，无 Stage 6
