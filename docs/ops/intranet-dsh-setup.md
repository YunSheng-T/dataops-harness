# 内网 DSH 接入与 Agent 迭代手册

> 目标：把当前 dataops-harness 搬到内网 DSH，并能持续让 Agent 迭代。  
> 本地基线：`v0.3.0-intranet-handoff` / `12d51ac`  
> 结论：**本地交付准备基本就绪；真实数据域接入尚未就绪。**

## 1. 准备工作结论

| 项 | 状态 |
|---|---|
| 阶段契约 / UI / Workitem / Signoff | 就绪 |
| 离线安装包 + sha256 | 就绪 |
| 安装自检 / health / config 校验 | 就绪 |
| DSH runtime | 内网需已有，包内不含 |
| US CLI / Code CLI / CICD CLI | 等内网命令和 JSON |
| DataMap / Lineage / Profile | 目前 mock，等真实接口 |
| SSO | mock 身份，等内网 claims |
| 真实部署/发布/回滚 | 明确不做，外部平台负责 |

## 2. 内网 DSH 是什么形态

先确认是哪种：

```sh
# A. 已有全局 dsh CLI
dsh --version

# B. DSH Desktop
# 打开 App，使用其内置终端；或从仓库使用
./scripts/dsh --version
```

兼容版本：

```text
>= 0.2.1-rc.2 < 0.3.0
```

如果版本不匹配，先升级/降级 DSH，不要改插件 engines 硬扛。

## 3. 离线包怎么进去

在可构建机器：

```sh
node scripts/pack-dataops-offline.mjs
```

当前产物：

```text
dist/dataops-harness-offline-2026-10-28.tar.gz
sha256: e0fd32c5226fdda1ccb0697478ac99912e4643683765b6f2b6cbf41bd46010e9
```

内网操作：

```sh
shasum -a 256 -c dataops-harness-offline-2026-10-28.tar.gz.sha256
mkdir -p /opt/dataops
tar -xzf dataops-harness-offline-2026-10-28.tar.gz -C /opt/dataops
cd /opt/dataops/dataops-harness-offline-2026-10-28
```

> 解压路径必须稳定。安装脚本用绝对路径 symlink 包；移动/删除这个目录会让 profile 断链。

## 4. 安装到内网 DSH

```sh
export DSH_HOME="$HOME/.dsh"          # 或内网实际 DSH_HOME
export DSH_AGENTS_HOME="$HOME/.agents"

node scripts/install-dataops-profile.mjs --home "$DSH_HOME"
node scripts/install-dataops-skills.mjs --agents-home "$DSH_AGENTS_HOME"
node scripts/install-harness-skills.mjs --agents-home "$DSH_AGENTS_HOME"
node scripts/check-install.mjs --home "$DSH_HOME"
node scripts/check-dataops-health.mjs
```

安装后：

```sh
DSH_HOME="$DSH_HOME" dsh --profile dataops
```

如果使用 DSH Desktop，重启 App，选择 `dataops` profile。

启动后确认：

- 顶部是 `5/5`，没有 Stage 6
- 新会话能显示 USPicker
- 能打开阶段简报
- 卡片不会因 payload 变体崩

## 5. 真实 provider 配置

不要直接把 token 写进 repo。

### 5.1 真实 US CLI

编辑稳定 checkout 里的：

```text
profiles/dataops/cordis.patch.yml
```

在 dataops-tools config 下加：

```yaml
domains:
  us:
    kind: cli
    tokenRef: DATAOPS_US_TOKEN
    commands:
      list: ['edevops', 'us', 'list', '--json']
      ticket: ['edevops', 'us', 'get', '--id', '{ticketId}', '--json']
```

真实命令必须替换成内网 CLI 的实际形式。

### 5.2 其他域

`docs/ops/provider-config.example.yml` 是模板：

- DataMap / Lineage / Profile：HTTP 或 CLI
- Scheduler / Code / CICD：CLI
- Release：HTTP
- Identity：HTTP

### 5.3 旧 provider seam 仍然存在

当前代码里：

- `domains.us` 已接 `dataops_shared_read_us`
- 需求/设计/表/血缘/画像等仍走旧的 `devops`/`catalog`/mock fixture
- Code / CICD 只有 adapter 骨架，等真实 CLI

所以真实数据接入不是“只改一个 domains 就完成”，需要按域逐个替换，并跑通 health + 一个真实查询上下文。

## 6. 怎么让 Agent 继续迭代

### 6.1 先准备开发 checkout

不要把“离线安装包目录”当唯一开发目录。推荐：

```text
/opt/dataops-harness/        # 稳定开发 checkout（可 git）
/opt/dataops/profile-dist/   # 安装包解压目录（可重建）
```

安装 profile 的 symlink 指向开发 checkout；以后只重建/重启，不再重装。

### 6.2 给 Agent 的启动提示词

新开一个 DSH 会话，把下面整段发给 Agent：

```text
你是 dataops-harness 的内网维护 Agent。

工作区：/opt/dataops-harness
运行环境：内网 DSH，版本 0.2.1-rc.x，无公网 npm。

先读：
1. AGENTS.md
2. docs/ops/intranet-handoff.md
3. docs/ops/intranet-dsh-setup.md
4. docs/design/card-payload-contract.md
5. docs/design/identity-sso.md

硬约束：
- 不修改 deepseek-harness/ 上游源码。
- 不 npm install，不访问公网。
- 不把 token 写进代码、日志、fixture、prompt。
- 不执行真实 merge/deploy/release/rollback。
- 默认只读；写操作必须外部审批。
- 不改阶段模型和 5/5 UI，除非先写设计/ADR。
- 每次改动一个域，先加 fixture/测试，再改代码。

当前目标：
先接 EDevOps US CLI 只读，验证从 USPicker 到需求卡的真实数据链路。

工作方式：
1. 先运行 node scripts/verify-local.mjs，记录基线。
2. 读内网 CLI --help 和样例 JSON。
3. 在 packages/dataops-tools/src/providers 里加/改 adapter。
4. 加离线 fixture 和单测。
5. 改 profiles/dataops/cordis.patch.yml 配置。
6. 运行 health、真实只读查询、浏览器验证。
7. 更新 docs/design 和 docs/ops。
8. 一个提交一件事，最后报告改了什么、证据、未验证项。

不要一次接所有域。先 US，再 DataMap/Lineage/Profile，再 Code/CICD，最后 SSO。
```

### 6.3 每轮迭代的标准动作

```sh
node scripts/verify-local.mjs
node packages/dataops-client/scripts/build.mjs
node packages/dataops-brand/scripts/build.mjs
# 重启 dataops / 硬刷新页面
```

每次新增/修改卡片 payload：

1. 在 client check 加 malformed fixture
2. 在 `docs/design/card-payload-contract.md` 记变体
3. 不直接在生产数据上试错

## 7. 进入内网后的推荐顺序

```text
1. DSH runtime / profile / 启动验证
2. EDevOps US CLI 只读
3. DataMap / Lineage / Profile
4. Code CLI → Stage 4
5. CICD CLI → Stage 5
6. SSO claims / 角色映射
7. Workitem Service / 审计落盘
```

每步的完成标准：

- 有真实 CLI/API 样例
- 有离线 fixture
- health 通过
- 一个真实只读查询成功
- UI 卡片不崩
- 证据和时间范围可追溯

## 8. 当前不要做的事

- 不要用 mock 身份当生产 SSO
- 不要把 mock CICD 产物当真实制品
- 不要在未接 Code/CICD 前演示“真实合入”
- 不要让 Agent 直接 deploy/release
- 不要修改 upstream
- 不要 `npm install` 试图补依赖

## 9. 验收入口

```sh
node scripts/verify-local.mjs
```

当前通过：

```text
local verification: PASS (11 checks)
```
