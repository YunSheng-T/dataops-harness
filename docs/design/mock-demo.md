# DataOps Mock 演示（6 阶段 + 排障）

> 目标：不连内网，用合成数据把 **需求 → 设计 → 方案 → 开发 → CICD → 复盘** 和一次排障完整跑通。
> 所有数据 `source: mock`；不写任何业务系统。
> 架构关系见 [`blueprint-v2.md`](blueprint-v2.md)。

## 0. 真实用法（用户不需要说工具名）

用户直接说业务目标即可：

```text
帮我把渠道日报从下单口径改成支付口径，走完需求到复盘；发布前停下来等我确认。
```

Agent 会按 `dataops-workflow` 技能判断阶段、选择内部能力、产出卡片/产物，并在发布审批前停止。**不要把工具名写进用户提示词**；下面的 12 步只是离线验收脚本。

## 1. 启动

```sh
node packages/dataops-client/scripts/build.mjs
node packages/dataops-brand/scripts/build.mjs
node scripts/install-dataops-profile.mjs
dsh --profile dataops
```

这是回归/演示用的确定性脚本，不是用户入口。用户入口见第 0 节。

## 2. 验收脚本（工具级，仅测试用）

```text
请按顺序调用以下 DataOps mock 工具，scenario 都用 channel-report：
1) dataops_requirement_extract_spec
2) dataops_design_compose_model
3) dataops_shared_read_profile
4) dataops_scheme_analyze_data
5) dataops_scheme_compose_solution
6) dataops_scheme_compose_tech_plan
7) dataops_develop_generate_code
8) dataops_cicd_scan
9) dataops_cicd_compile
10) dataops_cicd_test
11) dataops_cicd_release
12) dataops_review_write_postmortem
最后用一张表汇总每个阶段的关键结论、阻塞和产物；不要写文件。
```

预期：

| 阶段 | 子步骤 | 工具 | 卡片/标记 |
|---|---|---|---|
| 1 需求 | — | `dataops_requirement_extract_spec` | 需求卡；`需求 · 1/6` |
| 2 设计 | — | `dataops_design_compose_model` | 设计卡；`设计 · 2/6` |
| 3 方案 | 数据挖掘 | `dataops_shared_read_profile` | 画像卡；`方案 · 3/6 · 数据挖掘` |
| 3 方案 | 数据分析 | `dataops_scheme_analyze_data` | 分析卡；`方案 · 3/6 · 数据分析` |
| 3 方案 | 需求方案设计 | `dataops_scheme_compose_solution` | 需求方案卡；`需求方案设计` |
| 3 方案 | 技术方案输出 | `dataops_scheme_compose_tech_plan` | 技术方案卡；`技术方案输出` |
| 4 开发 | — | `dataops_develop_generate_code` | 开发卡；`开发 · 4/6` |
| 5 CICD | 扫描 | `dataops_cicd_scan` | 扫描卡；`CICD · 5/6 · 扫描` |
| 5 CICD | 编译构建 | `dataops_cicd_compile` | `schedule.yaml` / 诊断；`编译构建` |
| 5 CICD | 测试 | `dataops_cicd_test` | 测试卡；`测试` |
| 5 CICD | 发布/部署 | `dataops_cicd_release` | 发布卡；`发布/部署` |
| 6 复盘 | — | `dataops_review_write_postmortem` | 复盘卡；`复盘 · 6/6` |

轮末显示 6 段阶段简报；方案/CICD 显示子步骤。`dataops_cicd_compile` 在 mock 下返回**预编译的 schedule YAML + diagnostics**，不直接写调度系统。

第 11 步 `dataops_cicd_release` 会触发 **DSH 原生审批**。允许后才会完成 6/6；拒绝/取消/审批不可用会停在 CICD，不进入复盘。

截图：[real-dataops-story.png](../../prototype/shots/real-dataops-story.png)

## 3. 可选共享事实

按需调用，不会推进阶段：

```text
dataops_shared_read_table（表）
dataops_shared_read_lineage（血缘）
dataops_shared_read_evidence（证据）
```

## 4. 排障场景

另开会话：

```text
调用 dataops_incident_triage，scenario 用 channel-report，然后用一句话说明根因。
```

预期：排障卡显示时间线、根因、影响面、处置与证据；标题 chip 显示「排障」，不显示 6 段条。

## 5. 可点的交互

| 按钮 | 行为 |
|---|---|
| 设计卡「打开画布」 | 卡内展开来源→目标画布和加工步骤 |
| 设计卡/表卡「查看血缘」 | 打开右栏「血缘」工作台 |
| 需求/设计/方案「查看产物」 | 展开 JSON 产物，标注 Mock |
| `dataops_cicd_compile` 卡「复制 YAML」 | 复制 mock 编译产物 |
| CICD/开发/测试/发布/复盘 | Mock 提示，明确不会写业务系统 |

## 6. 场景数据

`packages/dataops-tools/src/mock.js`：

- `SCENARIOS` + `SCENARIO_EXTRAS`：需求、设计、方案、证据、画像、分析、需求方案、技术方案、CICD 扫描、编译
- `STAGE_FIXTURES`：开发、测试、发布、复盘、排障
- 两个场景：`channel-report`、`member-model`

新增场景时补齐对应数据即可，工具和卡片不用改。

## 7. 内网改造

真实 DataMap/调度/CICD 接入见 `docs/design/mock-to-real.md`。当前所有能力只读/草稿；`dataops_cicd_compile` 在真实模式接内部 `dataops compile` CLI。
