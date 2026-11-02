# 内网接入契约（mock → internal）

> 当前数据全部 mock；真实数据、真实命令只在内网提供。  
> 内网只替换 provider/config，不改 UI、阶段卡、workitem 流程。

## 1. 保持不变

```text
阶段模型：需求 → 设计 → 3a → 3b → 3c → 开发 → CICD
工具名：dataops_develop_generate_lts / dataops_shared_read_develop / dataops_cicd_pipeline
交付物路径：deliverables/...
卡片：DevelopCard / PipelineCard / TechPlanCard
签收：DevelopCard 的 SE / Committer
```

## 2. 内网替换点

### 2.1 ltsgen

mock 工具：

```text
dataops_develop_generate_lts({ workitemId, taskName, packageName })
```

mock 输出：

```text
deliverables/develop/code-repo/lts_code/<task>/task.yaml
deliverables/develop/code-repo/output/<package>.zip
```

内网替换：

```text
把 ltsgen 的 mock 实现换成 lts-design-gen jar / PowerShell
保证返回字段不变：
  kind=ltsgen
  codeRepoRoot
  taskPath
  artifact.package / artifact.digest
  validation.ok / validation.checks
```

### 2.2 数据代码仓

```text
config.codeRepoRoot
```

mock 默认：

```text
workitems/<id>/deliverables/develop/code-repo
```

内网改为真实数据代码仓根目录。

### 2.3 Build / Scan / Deploy SIT

开发阶段的内网命令建议映射：

```text
code.buildRun     dataops build run ...
code.scanRun      dataops scan run ...
code.deploySit    dataops deploy execute --env sit ...
```

mock 对应：

```text
build/scan/deploy 只产生 attempt 和状态，不调用真实 CLI
```

内网替换命令时保持 payload 字段：

```text
validation.build.status / attempt / attempts
validation.scan.status / blocking
validation.deploy.status / env / attempts
```

### 2.4 CICD

mock：

```text
dataops_cicd_pipeline({ deploy: true })
→ dev/sit/uat/beta/gamma 只改状态
```

内网：

```text
cicd.run / cicd.status  → pipeline
release.deploy          → 环境部署
```

只有 `deploy: true` 且 `domains.release.kind=cli` 才调用真实部署；失败记录 environment failed，不阻断 Stage 5 pass。

## 3. 配置边界

同一个 `dataops` profile，默认：

```yaml
provider: mock
domains:
  ltsgen: { kind: mock }
  code: { kind: mock }
  cicd: { kind: mock }
  release: { kind: mock }
```

内网只改：

```yaml
codeRepoRoot: <real-repo-root>
domains:
  ltsgen: { kind: cli, commands: ... }
  code: { kind: cli, commands: ... }
  cicd: { kind: cli, commands: ... }
  release: { kind: cli, commands: ... }
```

凭据只走 `credentials` / env，不写进仓库、技能、提示词。

## 4. 内网验收

```text
1. 技术设计 → lts_code/task.yaml 生成
2. dataops build run 产出新 zip
3. develop.yaml 有 codeRepo / artifact
4. SIT 部署有真实 deploymentId/status
5. SE / Committer 签收
6. CICD pipeline + 制品包
7. deployment 状态可回读，失败不伪造
```

## 5. 明确不做

- 不在 mock 里伪造真实部署成功。
- 不把外部环境状态当 Stage 5 门禁。
- 不在未确认时执行真实写操作。
- 不要求用户改工具名或阶段流程。
