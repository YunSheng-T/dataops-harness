# 内网 Agent 操作手册

> 目标：同一套 `dataops` profile，从 mock 切到内网真实数据/命令。  
> 原则：先只读、再构建、最后部署；默认 mock 不删，保留回退。

## 0. 进入内网前先确认

需要拿到：

```text
DSH 安装路径 / DSH_HOME
ltsgen jar 或 scripts 路径
数据代码仓根目录
dataops CLI jar 路径
登录方式 / PAT / SSO
build / scan / deploy 命令样例
SIT / UAT / BETA / GAMMA 环境名称
```

不要把 token、工号、内网地址写进仓库。

## 1. 安装与基线验证

```bash
git branch --show-current
git log -1 --oneline

node packages/dataops-client/scripts/build.mjs
node packages/dataops-brand/scripts/build.mjs
node scripts/install-dataops-profile.mjs --home <DSH_HOME>
node scripts/install-dataops-skills.mjs
node scripts/verify-local.mjs
```

必须看到：

```text
local verification: PASS (16)
```

先不配置真实系统，确认 mock 工作台能启动。

## 2. 让内网 Agent 先读文档

让 Agent 先读：

```text
docs/design/internal-integration-contract.md
docs/design/handoff-20261102-assessment.md
docs/ops/intranet-agent-playbook.md
```

明确约束：

```text
不重写 UI
不改阶段模型
不改 workitem 账本
默认 provider 保持 mock
真实命令走 domains.*.kind=cli
凭据只从 credentials/env 读取
```

## 3. 第一步：只读接入

先只接 US / 表 / 血缘这类读接口：

```yaml
domains:
  us:
    kind: cli
    tokenRef: DATAOPS_US_TOKEN
    commands:
      list: [...]
      ticket: [...]
  catalog:
    kind: http
    baseUrlEnv: DATAOPS_CATALOG_BASE_URL
    tokenRef: DATAOPS_CATALOG_TOKEN
    paths: { ... }
  lineage:
    kind: http
    baseUrlEnv: DATAOPS_LINEAGE_BASE_URL
    paths: { ... }
```

验证：

```text
处理 US-3821
→ USPicker 显示真实 US
→ 读取表/血缘成功
→ 不写任何业务系统
```

如果读接口失败，不要继续接写操作。

## 4. 第二步：ltsgen

当前 `dataops_develop_generate_lts` 是 mock 实现。内网让 Agent：

```text
把 ltsgen 的 mock executor 替换成 lts-design-gen jar / scripts；
保持返回字段不变；
不要改 DevelopCard 和 Workitem 流程。
```

必须保持的返回：

```text
kind=ltsgen
taskName
codeRepoRoot
taskPath
artifact.package
artifact.digest
validation.ok
validation.checks
```

验收：

```text
ltsgen check 通过
lts_code/<task>/task.yaml 生成
没有把 ltsgen check 标成 Build passed
```

## 5. 第三步：Build / Scan / SIT 部署

当前 `packages/dataops-tools/src/repo/build.js` 和 `repo/deploy.js` 已有 CLI adapter，但还没有全部接到 Stage 4 工具。内网让 Agent 接：

```text
code.buildRun
code.scanRun
code.deploySit
```

配置原则：

```yaml
domains:
  code:
    kind: cli
    commands:
      buildRun: [...]
      scanRun: [...]
      deploySit: [...]
```

验收顺序：

```text
1. auth whoami
2. dataops build run --help
3. build 一个测试包，确认真实生成 zip
4. scan 只读
5. deploy execute --dry-run 预览 SIT
6. 用户确认后再真实部署 SIT
```

Build passed 判定：

```text
dataops build run 执行成功 + 新 zip 产生
```

不是：

```text
ltsgen check 通过
```

## 6. 第四步：CICD / 环境部署

CICD 已经是 opt-in：

```text
dataops_cicd_pipeline({ deploy: true })
```

默认 mock：

```text
只改 dev/sit/uat/beta/gamma 状态
```

内网配置：

```yaml
domains:
  cicd:
    kind: cli
    commands:
      run: [...]
      status: [...]
  release:
    kind: cli
    commands:
      deploy: [...]
```

注意：

- `deploy: false` 时不能调用真实部署。
- 真实部署前必须让用户确认。
- 外部环境失败如实记录，不阻断 Stage 5 pass。
- 失败不能静默回退 mock。

验收：

```text
pipeline 成功
artifact/manifest/checksum 可追溯
环境状态能回读
失败环境标记 failed，不伪造 deployed
```

## 7. 最后再跑一轮完整业务验收

```text
US 清单 → 选中 US
→ ensure_workitem
→ 需求 → 设计 → 3a → 3b → 3c
→ ltsgen → build → scan → SIT
→ SE / Committer
→ CICD pipeline
→ 环境状态回读
```

每一步检查：

```text
Workitem stage 是否正确
revision 是否归档
签收是否写入 approval
Build/Deploy 是否有真实输出
失败是否有 attempt
```

## 8. 回退

任何真实命令不可用时：

```text
domains.*.kind 改回 mock
重启 Host
硬刷新
```

不要删除 mock 分支。  
不要为了演示绕过 signoff、stage gate 或真实失败状态。
