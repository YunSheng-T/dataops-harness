# 内网 Stage 0–5 分阶段实施计划

> 基线：`v0.1.0-mock`  
> 原则：**先契约、后适配；先只读、后执行；每一阶段独立提交并可回滚。**  
> 本计划覆盖本地治理和进入内网后的真实系统接入；Stage 6 不在范围。

## 1. 阶段总览

| 阶段 | 目标 | 依赖 | 验收 |
|---|---|---|---|
| P0 本地契约 | 阶段/gate/kind、签收接口、WorkitemStore 接口 | 无 | contract tests；mock 全通过 |
| P1 本地 UI | 阶段简报、卡密度、失败态、弱模型可读性 | P0 | 1440/1600/1920、暗色、0 console |
| P2 离线交付 | 内网安装包、profile、无公网依赖、健康检查 | P1 | 断网安装演练 |
| P3 US 只读 | EDevOps US list/detail → USPicker/workitem | 内网 API | 真实 US 卡；无 mock 回退 |
| P4 元数据只读 | DataMap / lineage / profile 三域分开 | 内网 API | 路径/资产/血缘/画像可追 |
| P5 调度只读 | jobs/instances/logs/compile | 内网 API/CLI | 3c 时间带/日志真实 |
| P6 代码平台 | build/scan/test/review/merge 状态 | 代码平台 | Stage 4 真实回流 |
| P7 CICD CLI | pipeline run/status/artifact/logs | CICD CLI | Stage 5 制品可校验 |
| P8 发布只读 | dev→sit→uat→beta→gamma 状态 | 发布平台 | 只读、不执行 |
| P9 SSO/Workitem | 真实身份、审计、并发 | 内网服务 | 签收可审计 |
| P10 内网 e2e | US → Stage 5 真实只读/受控执行 | P3–P9 | 一条内网验收用例 |

## 2. P0 本地契约（先行）

### P0-A 阶段契约

> 当前：`contracts/stage-contract.json` + `scripts/check-stage-contract.mjs` 已加入；运行时仍保留 Host/Client 镜像，下一步再迁移到生成/单源。

唯一来源（建议）：

```text
stage order: requirement → design → scheme → develop → cicd
kind → stage: intake/requirement/design/analysis/solution/tech_plan/develop/cicd
gate → roles: requirement[BA,requester] ... develop[code_review,merge]
```

Host 与 Client 各自保留轻量镜像，但由同一 contract fixture 校验；禁止再在 `brief.js`、`workitem-store.js`、template、docs 各写一份。

### P0-B 签收服务

不依赖 Agent 回合和 DOM 发送按钮：

```text
UI action → Host signoff service → identity/role/gate validation → workitem store → UI optimistic state
```

本地先用 mock identity；真实 SSO 在 P9 替换。

### P0-C WorkitemStore

```ts
interface WorkitemStore {
  get(id): Workitem
  list(filter): Workitem[]
  create(input): Workitem
  update(id, revision, patch): Workitem
  signoff(id, gate, role, actionId, actor): Approval
  audit(id): AuditEvent[]
}
```

本地文件 adapter 必须加锁、原子写、revision CAS；service adapter 后接。

## 3. CICD CLI 对接（P7，本次重点）

### 3.1 约束

- CLI 是内网唯一 CICD 入口；DataOps 不直接执行部署/发布/回滚。
- 不拼 shell；命令是参数数组，模型不能传命令/URL。
- token 只从 credentials/env 注入子进程环境。
- 支持同步和异步两种 CLI：
  - 同步：`run` 阻塞到终态；
  - 异步：`run` 返回 runId，DataOps 轮询 `status`。
- 失败必须 fail closed：非零退出、非 JSON、超时、状态 failed、制品缺 manifest/checksum 都不能 pass。

### 3.2 配置

```yaml
cicd:
  kind: cli
  tokenRef: DATAOPS_CICD_TOKEN
  timeoutMs: 30000
  pipelineTimeoutMs: 900000
  pollIntervalMs: 3000
  commands:
    run:    ['dataops', 'cicd', 'run', '--target', '{target}', '--commit', '{commit}', '--json']
    status: ['dataops', 'cicd', 'status', '--run-id', '{runId}', '--json']
    artifact: ['dataops', 'cicd', 'artifact', '--run-id', '{runId}', '--json']
    logs:   ['dataops', 'cicd', 'logs', '--run-id', '{runId}', '--json']
```

### 3.3 输出契约

`run` 或 `status` 的 stdout 必须是 JSON：

```json
{
  "pipelineRunId": "run-...",
  "status": "queued|running|succeeded|failed|blocked|cancelled",
  "commit": "abc1234",
  "target": "dws.trade_channel_daily",
  "artifact": {
    "package": "dataops-dws.trade_channel_daily-1.0.0.tar.gz",
    "digest": "sha256:...",
    "manifest": "manifest.json",
    "checksum": "checksums.txt"
  },
  "stages": [{ "id": "build", "status": "passed" }]
}
```

- `status=succeeded` 才允许 pass；
- `artifact.package`、`manifest`、`checksum` 缺一 → blocked/failed；
- 不要求 DataOps 复制制品；只记录路径/摘要；
- 外部环境状态由 `release` 域单独读取，不混入 CICD pass。

### 3.4 进程/超时

- `execFile`，`windowsHide`，无 shell；
- `timeoutMs` 单次命令；`pipelineTimeoutMs` 总轮询；
- 输出上限 1 MB；
- 轮询使用指数退避/固定间隔，可取消；
- stderr 不直接进模型；转 bounded log/report。

### 3.5 迁移

1. 先实现 CLI adapter runner + fake CLI 测试；
2. `dataops_cicd_pipeline` 增加 `provider` 分支；
3. mock profile 继续走 fixture；
4. 真实 profile `cicd.kind=cli`；不静默回退；
5. P8 再接 release 只读。

## 4. 本地可做 vs 内网可做

### 现在可做

- P0-A/B/C
- P1 UI
- P2 离线包
- P7 CLI runner（用 fake CLI）
- P8 contract/健康检查骨架

### 需要内网

- P3/P4/P5/P6/P9/P10 的真实 adapter、凭据、网络和权限。

## 5. 时间估算（工作量，不是承诺日期）

```text
P0 本地契约        2–4 天
P1 UI              2–3 天
P2 离线交付        1–2 天
P7 CLI runner      1–2 天（不含真实 CICD 参数）
内网 P3 US         第 1 周
内网 P4 元数据     第 2 周
内网 P5/P6         第 3 周
内网 P7/P8         第 3–4 周
内网 P9/P10        并行/最后收口
```

## 6. 提交与验收规则

- 每阶段一个 commit/tag；不把真实 adapter 和 UI 重排混在一起。
- mock 测试必须一直通过。
- 真实模式不允许回退 mock。
- 每次接真实系统前，先补 provider contract test。
- 内网验收前不宣称“已接入真实系统”。

## 7. 本轮立即开始

1. 实现 CICD CLI runner + fake CLI 测试。
2. 下一轮做 P0-A/P0-B 最小契约。
3. UI 只做增量，不重写已验证链路。
