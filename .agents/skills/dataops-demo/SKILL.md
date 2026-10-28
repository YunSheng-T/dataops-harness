---
name: dataops-demo
description: 用户要演示 DataOps 工作台 Stage 0–5 或排障场景时使用；按已确认的 mock/seed 路径演示，不写业务系统，不展示 Stage 6。
---

# DataOps Demo（Stage 0–5）

## 何时用

用户说「跑一遍完整演示」「走 0 到 5」「演示开发验证」「演示数据 CICD」「演示排障」「用 mock 数据看看」时。

## 主线

1. **US**：`dataops_shared_read_us` → USPicker；选中 US-3821；`dataops_shared_ensure_workitem`。
2. **需求**：需求卡；BA + 需求方签收。
3. **设计**：DesignCard + DataMap 路径/资产；独立血缘/画像。
4. **3a/3b/3c**：Analysis → Solution → TechPlan；3a blocking 不能进 3b；3c 只展开一层设计血缘。
5. **Stage 4**：`dataops_shared_read_develop` 产多产物；Build/Scan/Deploy/Test attempt；SE review + Committer merge；DataOps 不执行 merge。
6. **Stage 5**：`dataops_cicd_pipeline` 一条 pipeline + 制品包 + manifest/checksum + 外部环境只读。
7. **停止**：Stage 5 完成即停；Stage 6 不实现、不展示。

## 快速演示

- 固定 demo：`node scripts/seed-dataops-demo.mjs --stage develop`
- 只读历史卡：`dataops_shared_read_stage` 按 stage 读取。
- 契约彩排：`node scripts/e2e/dataops-stage0-5-contract.mjs`
- 浏览器旅程：`node scripts/e2e/dataops-p1.4.mjs --scenario journey-ui --keep`

## 失败/回流

- 3a：blocking 未关不能签收。
- Stage 4：build/scan failed → 隐藏合入 → 修复后重新编译。
- Stage 5：pipeline 失败回 Stage 4；外部环境 pending/拒绝不改变 DataOps pass。

## 边界

- 所有数据是 mock；明确说不是生产结论。
- 不使用 `dataops_cicd_release`；Stage 5 不接 DSH 原生 approval。
- 不执行真实部署、发布、回滚、US 写回。
- 不展示 Stage 6 假页面。
- 不逐条复述工具名；用户看阶段、卡片、证据和 gaps。
