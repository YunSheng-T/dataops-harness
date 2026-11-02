# 2026-11-02 内网改造交接包评估

> 来源：`dataops-harness改造交接包-20261102.zip`  
> 结论：不是可直接 cherry-pick 的代码补丁；是需求说明、技能、模板和真实 CLI 样例。  
> 不建议直接覆盖当前分支，按阶段拆分接入。

## 1. 包内实际内容

```text
00-adaptation-handoff.md     改造说明、旧分支冲突面、合并建议
01-tech-plan/                ADR 0005、front-matter 模板、4 个示例
02-develop/                  4 个技能重写 + ltsgen 技能 + 代码仓结构说明
03-samples/                  dataops CLI build/deploy 真实输出、manifest、LTS task 样例
```

包内**没有**：

- `dataops-cli.js` provider 源码
- `workitem-store.js` front-matter 改动
- `cards.js` rollback 防御改动
- ltsgen 的 jar
- 内网 profile 的完整配置 diff

所以不能把包当 diff 合并，必须按说明重新实现。

## 2. 四个核心改动

### 3c 技术方案

- 交付物从纯 YAML 改为 **front-matter Markdown**：`---` 包结构化 YAML，正文写 SQL/DAG/资源说明。
- 3c 同时产 **LTS 技术设计文档**，作为 ltsgen 输入。
- `TechPlanCard` 消费 front matter；ltsgen 消费正文。
- rollback steps/materials 的对象元素必须文本化，不能泄漏 JSON。

### 4 开发验证

- 新增 `ltsgen`：LTS 技术设计文档 → IR → 校验 → `lts.yaml`。
- 新增 `dataops build run` 真实构建：产出 zip 才算 Build passed。
- `ltsgen check` **不等于** Build。
- 代码入仓到数据代码仓 `lts_code/<任务名>/task.yaml`。
- 部署到 SIT 属于开发验证，是远程写操作，需要登录 + 用户确认。
- SE / Committer 门禁仍然保留。

### 5 数据 CICD

- CICD 独立，但**包含部署**：dev → sit → uat → beta → gamma。
- 外部部署失败如实记录，不作为 DataOps pass 门禁。
- 不与 Stage 4 的 SIT 部署混为一谈。

### 支撑改造

- 新增 `dataops-cli` provider：`build get` + `scan result` + `deploy task` 组装 payload。
- 新增 mock 场景、US 场景、DataMap 场景。
- profile 指向真实 CLI / jar / 输出目录。
- ltsgen 技能 + scripts + IR 规范 + few-shot。

## 3. 与当前分支的冲突

当前分支是 mock-first，且已有：

- 新的血缘浏览器和 LineageGraph
- artifact ledger / evidence links
- 真实 task.yaml task DAG
- 阶段卡签收和当前门禁修复
- E2E / demo seed

交接包基于旧 `cd09a5f`，冲突点更多，不只它写的 6 个文件。

主要冲突：

1. **3c 产物格式**
   - 当前：`tech-plan.yaml`
   - 包：`tech-plan.md` front matter
   - 需要同时兼容旧 YAML 和新 md，不能直接替换。

2. **4 的 provider**
   - 当前：mock build/scan/deploy/test
   - 包：真实 `dataops-cli` + ltsgen + 数据代码仓
   - 新 provider 必须默认关闭，mock 仍是默认；内网只改同一个 profile 的配置，不能影响演示。

3. **5 的部署语义**
   - 当前：CICD 不执行部署，外部状态只读
   - 包：CICD 也执行部署
   - 这是重大产品语义变更，必须先拍板 + ADR，不能顺手改。

4. **技能可用性**
   - ltsgen 依赖内网 jar / PowerShell / 数据代码仓。
   - 如果直接安装到当前 dataops profile，Agent 会在 mock 演示中尝试调用不存在的 jar。
   - 必须做可用性检测；同一 profile 下 mock 配置走模拟流程，内网配置才调用 jar。

## 4. 建议处理顺序

### Phase 1：低风险兼容层

- `parseWorkitem` 支持 front matter，纯 YAML 行为不变。
- `serializeDeliverable` 对 tech_plan 输出 front matter；旧 YAML 继续可读。
- `TechPlanCard` rollback 对象文本化。
- 导入 ADR/template，但编号改为当前仓库的下一个 ADR。
- 测试：front matter 解析、旧 YAML 兼容、rollback 不泄漏 JSON、阶段卡渲染。

### Phase 2：文档与技能

- 新增 `ltsgen` 技能目录、IR 规范、few-shot、模板。
- 更新 tech-plan / develop / cicd / workflow 技能。
- **默认不启用内网脚本调用**，加 availability gate。
- 迁移交接包里的 samples 和代码仓结构说明。

### Phase 3：CLI provider（feature flag）

- 新增 `providers/dataops-cli.js`，使用现有 `providers/cli.js` 传输层。
- 配置驱动 jar、work-dir、output-dir、登录 home。
- 默认 `provider: mock`；`dataops-cli` 只在同一 profile 的 internal 配置段启用。
- 增加 fixture 测试，不跑真实写操作。

### Phase 4：CICD 部署语义

- 先做 ADR：CICD 是否执行部署，和外部发布平台边界。
- 若确认执行：只在真实 provider 模式暴露；mock 仍只读。
- 默认 mock 只模拟环境状态；只有内部配置打开真实部署。

### Phase 5：场景与安装

- 场景 mock（US / DataMap / lineage）按当前前端契约适配。
- profile installer 保留用户依赖/额外 bundles。
- 最后再更新 demo 脚本和验收。

## 4.1 已确认决策（2026-11-03）

- **同一个 `dataops` profile**，不新增 `dataops-internal` profile。
- 默认 `mode=mock`；内网自行修改 profile/config，把 provider 切到 `cli`，不改 UI/Agent 流程。
- mock ltsgen 按数据代码仓结构落盘：`lts_code/<task>/task.yaml` + `output/<package>.zip`。
- CICD mock 只模拟 `dev/sit/uat/beta/gamma` 状态，不执行真实部署；真实部署只在 internal 配置下由 CLI 执行。
- 交接包技能不默认污染 mock 流程；同一 profile 内通过能力开关和工具可用性降级。

## 5. 已确认（2026-11-03）

1. 同一个 `dataops` profile，内网自行改配置适配。
2. mock ltsgen 按 `lts_code/<task>/task.yaml + output/*.zip` 模拟落盘。
3. CICD mock 只模拟 `dev/sit/uat/beta/gamma` 状态，不执行真实部署。
4. 真实部署只在 internal 配置下由 CLI 执行；mock 保持只读状态。

## 5.1 单 profile 适配契约

配置层只改 provider 和命令，不复制一套 profile：

```yaml
# 默认（当前 demo）
provider: mock
domains:
  ltsgen: { kind: mock }
  code: { kind: mock }
  cicd: { kind: mock }

# 内网
provider: cli
domains:
  ltsgen:
    kind: cli
    commands: { check: [...] }
  code:
    kind: cli
    commands: { buildRun: [...], scanRun: [...], deploySit: [...] }
  cicd:
    kind: cli
    commands: { run: [...], status: [...], deploy: [...] }
```

工具内部只认 domain contract；mock 与 cli 返回同一 payload。

## 6. 结论

- 不直接合并交接包。
- 先做 Phase 1 的 front-matter 兼容和 rollback 防御；这两项不破坏当前演示。
- CLI、ltsgen、CICD 部署必须放到 internal/feature-flag 后面。
- 当前 mock 演示链路保持可用，不被内网依赖污染。
