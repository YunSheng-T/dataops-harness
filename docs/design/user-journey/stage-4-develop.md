# Stage 4 开发与验证：详细设计

> 状态：设计稿 v1
> 日期：2026-10-27
> 关联：[用户旅程 v0](user-journey.md) · [Stage 3c 技术方案](stage-3c-tech-plan.md) · [DesignCard + DataMap](design-card-datamap.md) · [遗留事项](../../backlog.md)

## 1. 定位

Stage 4 不是“生成完代码就结束”，而是一个**开发 → 构建 → 扫描 → 部署验证 → 修复**的迭代循环。

```text
3c tech-plan 已签收
→ 生成代码/配置/脚本
→ build 编译构建
   ├ 失败 → 修复代码 → 重建
→ scan / 规范检查
   ├ 失败 → 修复代码/调度配置 → 重扫
→ deploy 到开发/联调环境
   ├ 失败 → 补数据源/运维脚本/配置 → 重部署
→ 人工测试（平台测试机制缺失）
→ SE 代码评审
→ Committer 外部评审 / 合入
→ develop 交付物
→ CICD 官方构建/测试/发布
```

它回答：

> 代码和配置能不能构建？规范能不能过？能不能部署？SE 和 Committer 能不能评审通过并合入？

不回答：

- 生产发布审批；
- 生产准入；
- 外部 Committer 的最终合入；
- 重新选方案或改设计。

> **Stage 4 vs Stage 5**：Stage 4 的 build/scan/deploy 是开发验证环境，结果用于反馈；Stage 5 的 CICD 是线上标准、可信的构建/扫描/部署流程。Stage 4 通过不等于 Stage 5 可信。

## 2. 角色

| 角色 | 职责 |
|---|---|
| Dev | 生成代码/配置/脚本，跑构建、扫描、部署验证，修复回流 |
| SE | 代码评审；检查逻辑、规范、调度配置、回滚 |
| BA / 需求方 | advisory；确认语义仍符合需求，不替代代码评审 |
| 构建/扫描/部署平台 | 给出编译、规范、部署的真实反馈 |
| ETL / 调度平台 | 提供数据源、作业/调度规则、并发/任务上限 |
| Committer / 外部平台 | 代码评审与合入；DataOps 只产合入报告和证据，不执行 merge |

## 3. 输入

- 3c `tech-plan.yaml`：任务、依赖、SLA、mustNotChange、rollback、评审清单
- design / analysis / solution / requirement
- DataMap：物理资产、字段、owner、assetType
- 独立血缘：上下游、ETL、调度、依赖
- 平台能力目录：operator、并发上限、任务作业数上限、队列/quota
- 仓库/工作区：现有代码、SQL 规范、模板
- 开发/联调环境：数据源、权限、部署目标
- mock fixture：测试数据、预期结果

## 4. 开发迭代循环

### 4.1 生成实现包

从 3c 任务生成：

- SQL / DDL / 对账 SQL / 回滚 SQL
- `etl.yaml`：ETL 作业定义
- `schedule.yaml`：调度任务/作业、依赖、并发、重试
- `data_consume_api.yaml`：数据消费 API 契约
- 运维脚本：部署、数据源、初始化
- 测试报告/样本

不是只产一个 `develop.yaml`；`develop.yaml` 是**清单和验证摘要**。

### 4.2 Build 循环

```text
build
 ├ pass → scan
 └ fail → build diagnostics
          → 修代码/依赖/类型/语法
          → rebuild
```

必须记录：

- attempt 次数
- 错误码/文件/行
- 构建日志
- 修复内容
- 产物版本

### 4.3 Scan / 规范检查循环

> 平台已有扫描系统，按作业类型配置扫描规则；DataOps 调用扫描器并消费结果，不在 DataOps 内维护一份规则目录。以下只是规则示例。

包括：

- 代码规范/SQL 规范；
- ETL 作业规范；
- 调度作业规范：
  - 单调度任务内作业数是否超过平台上限（例：50）；
  - 并发是否超过平台限制；
  - 依赖是否有环/孤立；
  - 周期、时区、重试、超时是否符合设计；
  - 调度实现是否与 3c 技术方案一致；
- 数据源/权限/队列/配额；
- 下游契约。

失败后修复代码或调度配置，重新扫描；不能被“忽略警告”绕过 blocking。

### 4.4 Deploy 验证循环

部署到开发/联调环境：

```text
deploy
 ├ pass → 人工测试
 └ fail → 分类
          ├ 代码/配置 → 修代码 → rebuild/scan/deploy
          ├ 数据源缺失 → 在 ETL 平台补数据源 → 改运维脚本 → redeploy
          └ 环境/权限/队列 → 找平台 owner → redeploy
```

部署失败不是“环境问题一句话带过”；必须记录：

- 环境
- 报错
- 缺失的数据源/权限/配置
- 修复动作
- 重部署结果

### 4.5 测试

当前平台数据作业测试机制缺失，因此：

- 开发自查 + mock/本地测试 + 人工验证；
- 不假装“自动化测试通过”；
- 测试状态必须是 `manual / mock / not-automated / skipped` 之一；
- 未自动化的风险写进 handoff 和 gaps；
- CICD 若也没有测试能力，Stage 5 只做构建/扫描/部署验证，不伪造测试。

### 4.6 SE 代码评审

SE 检查：

- 逻辑、字段、口径、时间语义；
- 主键、幂等、去重、分区；
- 调度配置：并发、作业数、依赖、周期；
- 部署脚本和数据源；
- 回滚材料；
- `mustNotChange`；
- 验证记录是否完整。

评审可以在 build/scan/deploy 之后进行；如果评审要求改代码，必须重新跑相关验证。

### 4.7 代码合入（外部 Committer）

SE 评审通过后，进入外部代码合入：

```text
DataOps 产出合入报告
→ Committer 评审代码
   ├ 通过 → 合入代码
   └ 拒绝 → 回开发修
→ 合入完成
→ Stage 4 才能进入 CICD
```

DataOps 不做 merge、不接管 Committer 权限；只记录：

- 合入报告版本
- Committer 评审结论
- 合入 commit / PR
- 合入时间
- 拒绝原因/回流

代码合入是 Develop 的第二个外部门禁，和 SE 代码评审分开记录：

```text
approvals:
  - gate: develop.code_review   # SE
  - gate: develop.merge         # Committer / external
```

## 5. 事实来源

| 验证 | 来源 |
|---|---|
| build | 构建/编译服务 |
| scan | 平台扫描系统（按作业类型配置规则） |
| deploy | 部署系统、ETL 平台、环境日志 |
| datasource | ETL 平台数据源管理 |
| query/test | 人工查询、mock fixture、测试报告 |
| code review | SE |
| code merge | Committer / 外部代码平台 |
| 资产/字段 | DataMap |
| 表/ETL/调度关系 | 独立血缘 |
| 运行约束 | 调度/运行观测 |

DataMap 不提供构建/扫描/部署结果；血缘不提供代码对错。

## 6. 交付物

### 目录

```text
deliverables/develop/
  develop.yaml
  sql/
    create_or_replace.sql
    etl.sql
    reconcile.sql
    rollback.sql
  etl/
    etl_channel_pay.yaml
  schedule/
    channel_pay_daily.yaml
  api/
    channel_metrics_api.yaml
  ops/
    datasource.yaml
    deploy.sh
  tests/
    test-report.md
```

实际可以有多个 SQL / ETL / schedule / API 文件。

### develop.yaml

`develop.yaml` 是**清单 + 验证摘要**：

```json
{
  "kind": "develop",
  "stage": "develop",
  "status": "fixing",
  "target": "dws.trade_channel_daily",
  "branch": "feat/channel-pay-caliber",
  "artifacts": [
    { "type": "sql", "path": "deliverables/develop/sql/etl.sql" },
    { "type": "sql", "path": "deliverables/develop/sql/reconcile.sql" },
    { "type": "etl_yaml", "path": "deliverables/develop/etl/etl_channel_pay.yaml" },
    { "type": "schedule_yaml", "path": "deliverables/develop/schedule/channel_pay_daily.yaml" },
    { "type": "data_consume_api_yaml", "path": "deliverables/develop/api/channel_metrics_api.yaml" },
    { "type": "ops_script", "path": "deliverables/develop/ops/deploy.sh" }
  ],
  "validation": {
    "build": { "status": "passed", "attempt": 2, "log": "evidence/ev-build-002.yaml" },
    "scan": { "status": "failed", "attempt": 1, "blocking": ["并发 8 > 平台 4", "任务作业数 52 > 50"] },
    "deploy": { "status": "blocked", "attempt": 1, "reason": "数据源 dwd.orders 未登记" },
    "test": { "status": "manual", "note": "平台测试机制缺失，人工验证" }
  },
  "tasks": ["T1", "T2", "T3", "T4", "T5", "T6"],
  "review": { "se": "pending", "committer": "waiting", "ba": "advisory" },
  "merge": { "status": "pending", "commit": null, "reviewer": null },
  "mustNotChange": [],
  "gaps": [],
  "rollback": {
    "artifact": "sql/rollback.sql + 调度回滚配置"
  }
}
```

## 7. 呈现：DevelopCard

```text
┌ 开发与验证 · dws.trade_channel_daily ────────────────────┐
│ 状态：修复中 · loop 2 · branch feat/...                  │
├───────────────────────────────────────────────────────────┤
│ 产物：3 SQL · 1 etl.yaml · 1 schedule.yaml · 1 API       │
├───────────────────────────────────────────────────────────┤
│ Build   ✓ 通过（attempt 2）                               │
│ Scan    ! 2 blocking：并发 8>4、作业数 52>50              │
│ Deploy  ✗ 数据源缺失：dwd.orders 未登记                   │
│ Test    manual / 平台测试机制缺失                         │
├───────────────────────────────────────────────────────────┤
│ 任务：T1 ✓  T2 ✓  T3 !  T4 !  T5 pending  T6 pending      │
│ SE review：pending                                       │
│ Committer merge：waiting                                 │
│ [查看日志] [查看产物] [重新验证] [提交评审] [退回]        │
└───────────────────────────────────────────────────────────┘
```

默认展示验证状态；展开看每次 attempt、错误、修复动作和证据。

不显示 `dataops_*` 工具名。

### 状态

```text
in_progress
→ validating
→ awaiting_review   # SE
→ awaiting_merge    # Committer
→ done
```

异常出口：

```text
returned  # build/scan/deploy/test/review 退回
blocked   # 环境/数据源/权限/回滚不可执行
```

SE review 通过但尚未合入时，`stages.develop.status=awaiting_merge`，不能进入 CICD。

## 8. 门禁与 Pass

必须同时满足：

- Build 通过；
- Scan 无 blocking；
- Deploy 到开发/联调环境通过，或外部前置已关闭；
- Test 有 manual/mock 记录，或明确未自动化风险；
- SE 代码评审 `approved`；
- Committer 评审通过并完成合入；
- 所有 3c 任务有实现或关闭；
- `mustNotChange` 未违反；
- 交付物完整；
- 没有 blocking gap。

不能 pass：

- build/scan/deploy 有未解决 blocking；
- 调度任务作业数超平台上限；
- 并发超限；
- 数据源缺失未补；
- SE rejected；
- Committer rejected；
- 测试声称通过但无记录；
- 回滚不可用。

Pass 后：

```text
stages.develop.status = done
stage = cicd
approvals[gate=develop.code_review] = approved
approvals[gate=develop.merge] = merged
```

## 9. 交接给 CICD

```text
develop.yaml
+ SQL / etl.yaml / schedule.yaml / data_consume_api.yaml / ops
+ build/scan/deploy 证据
+ manual test 结果/风险
+ SE review approval
+ Committer merge record
+ open/warn gaps
+ rollback
+ branch/commit
```

CICD 官方重新构建/扫描/测试/部署；不信任开发自测。

## 10. 失败与退回

| 情况 | 回流 |
|---|---|
| build 失败 | 修代码/依赖 → 重建 |
| scan 失败 | 修代码/调度 → 重扫 |
| 调度作业数 > 平台上限 | 拆 task/合并 job → 重扫 |
| 并发超限 | 调并发/队列 → 重扫 |
| deploy 缺数据源 | ETL 平台补数据源 → 改 ops → 重部署 |
| deploy 权限/环境 | 平台 owner 修复 → 重部署 |
| 测试问题 | 人工修 → 重新验证 |
| SE rejected | 修代码 → 重跑验证 |
| Committer rejected | 修代码 → 重跑验证 → 重新提交合入 |
| mustNotChange 违反 | 回 3c/设计 |
| 数据/口径不成立 | 回 3a/3b/设计 |

## 11. 案例：US-3821

> 前提：3a 的 blocking gaps 已关闭或明确接受；否则不进 4。

### 产物

```text
sql/etl.sql
sql/reconcile.sql
sql/rollback.sql
etl/etl_channel_pay.yaml
schedule/channel_pay_daily.yaml
api/channel_metrics_api.yaml
ops/datasource.yaml
ops/deploy.sh
tests/test-report.md
develop.yaml
```

### 迭代

1. Build：第一次类型不匹配失败；修复后 attempt 2 通过。
2. Scan：
   - 第一次发现调度任务 52 个 job > 50，并发 8 > 4；
   - 拆分/合并后 49 个 job，并发降到 4；
   - 重扫通过。
3. Deploy：
   - 第一次失败：`dwd.orders` 数据源未登记；
   - 在 ETL 平台补 datasource，更新 `ops/datasource.yaml` 和 `deploy.sh`；
   - 重部署通过。
4. Test：人工验证主键、空值、join、去重/不去重双列；平台无自动化测试，标 manual。
5. SE review：approved。
6. Committer 评审通过并合入；记录 PR/commit、合入时间。
7. 交接 CICD。

### 这一阶段没有做什么

- 没有生产发布；
- 没有代码合入；
- 没有真实数据作业测试；
- 没有把部署成功当发布审批。

## 12. 已确认

1. Stage 4 的 build/scan/deploy 是开发验证环境；Stage 5 是线上标准 CICD，可信。
2. SE 评审在 build/scan/deploy 之后；改代码后重跑验证。
3. 平台缺少自动化测试，Stage 4 接受 manual/mock 记录，不阻塞，但必须标风险。
4. `develop.yaml` 作为清单 + 验证摘要，实际产物为多文件。
5. 扫描规则由平台扫描系统按作业类型配置，DataOps 不维护规则目录。
6. 代码合入由外部 Committer 评审/合入；Stage 4 记录合入结果，不执行 merge。
