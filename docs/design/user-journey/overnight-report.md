# 0–3 阶段通宵实现报告

日期：2026-10-27  
目标：把 Stage 0+1 / Stage 2 / Stage 3a/3b/3c 做成连续 mock 演示，不接真实平台，不实现 Stage 4/5/6。

## 结论

- USPicker → 接单 → requirement → design → 3a → 3b → 3c 的完整 mock 链路已跑通。
- 关键门禁：requirement（BA+需求方）、design（BA）、3a（BA）、3b（BA）、3c（SE）。
- 3a 走了 blocked → 显式补 mock 证据 → passed，不是静默 pass。
- 全链路结果：workitem 五个 gate 全部 approved，五个交付物落盘，stage=`scheme`，scheme 状态 done。

## 实现

### 入口

- 8 条 mock US；USPicker 首 5 条 + 查看全部 modal + 搜索/状态筛选。
- “开始处理”只生成一条普通用户消息，不隐藏 RPC。
- `ensure_workitem` 按 source 去重创建/恢复。
- Intake 卡展示 US → workitem → 初始阶段。

### 阶段卡

- Requirement / Design + DataMap / Analysis / Solution / TechPlan。
- DataMap、独立血缘、独立质量分开；设计血缘与时间带在 3c 卡内。
- LineageCard v2 保留旧 v1 兼容。
- 签收按钮固定在卡片底部，不发隐藏调用。

### 编排

- 活动工具 16；客户端 toolview 11。
- 新增 `dataops_shared_stage`：
  - prepare：写交付物 + 更新 workitem + 出卡
  - signoff：校验 UI actionId/角色/gate 顺序，全部角色签收后推进 stage
  - status：读取工作项
- ADR 0006：[stage runtime](../../decisions/0006-stage-runtime.md)
- Agent/Skill 采用逻辑混合：Lead + BA/SE/Dev owner + activity worker；Agent Teams 后置。

## 验证

- tools check / smoke：24 注册项 / 16 活动工具 PASS
- client check / smoke：11 toolview PASS
- `p1.4 us-picker` E2E PASS
- `p1.4 stage-flow` E2E PASS：
  - requirement BA + requester
  - design BA
  - 3a blocked → closed → passed
  - 3b BA
  - 3c SE
- 蓝图 1024/1440/1600/1920 无横向溢出、明暗正常、0 console error
- 最终截图：`prototype/shots/p3-stage0-3-final.png`
- 工作项：`workitems/2026-10-27-workitem/`（mock 演示状态）

## 自主决策

1. 逻辑混合，不启用实验 Agent Teams。
2. 工具扩到 16；不新增内容生成工具，stage runtime 只做确定性编排。
3. 新旧交付物路径兼容读。
4. UI 签收消息 → stage runtime；mock actionId 不是真实身份认证。
5. 3a 默认 blocked，closed 补证明确标 mock。
6. Stage 4/5/6 不做，release 不接真实平台。

## 已知缺口

- 完整 E2E 用等价 UI 用户消息（`【签收】gate=...`）驱动；卡片按钮和 compose 桥有单测 + USPicker live 覆盖，但没有逐阶段点击真实按钮重跑整条 0–3。
- 多视口截图目前覆盖蓝图，不覆盖每个阶段卡的明暗/宽度。
- DataMap/血缘/质量/平台仍是 mock。
- 软门禁、审批矩阵完整交互待补。
