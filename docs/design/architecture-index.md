# 架构文档索引

> 目的：把“当前 canonical”与“历史/局部参考”分开，避免内网开发读错版本。  
> 更新时间：2026-10-31

## 1. 当前 canonical

| 文档 | 说明 |
|---|---|
| [内网接入架构](intranet-architecture.md) | Domain Adapter、配置、凭据、权限、部署、迁移顺序 |
| [架构治理清单](architecture-governance.md) | 耦合/定制/低内聚/历史死代码与治理顺序 |
| [Stage 4–5 实现映射](user-journey/stage-4-5-implementation.md) | Stage 4/5 代码与设计映射 |
| [Stage 4 设计](user-journey/stage-4-develop.md) | 多产物与验证循环 |
| [Stage 5 设计](user-journey/stage-5-cicd.md) | pipeline、制品包、外部环境 |
| [血缘卡设计](lineage-card.md) | 设计态/生产态/调度视图 |
| [用户旅程索引](user-journey/README.md) | 0+1 → Stage 5 文档入口 |
| [ADR 0011](../decisions/0011-stage-4-5-implementation.md) | Stage 4/5 实现决策 |
| [ADR 0012](../decisions/0012-real-provider-boundary.md) | 真实系统接入边界 |
| [发布与安装](release-install.md) | 自包含 bundle、独立 profile、registry/离线、生命周期 |
| [ADR 0013](../decisions/0013-release-install-unit.md) | 发布与安装单元（已确认，待实施） |
| [内部代码仓组件](repo-components.md) | manifest/build.yaml 索引与 LTS 源解析 |
| [卡 Payload 契约](card-payload-contract.md) | 卡片渲染安全与 schema 变体 |
| [P9 SSO 身份](identity-sso.md) | 身份、角色映射、签收审计 |
| [领导演示脚本](../demo/stage0-5-leadership-demo.md) | 现场 runbook |

## 2. 当前实现事实

```text
Stage 0+1 → Stage 5: mock/demo 已实现
Stage 6: 不实现、不展示
活动工具: 19
客户端 toolview: 14
真实 provider: devops / catalog（其余 mock）
真实域 adapter 骨架: providers/domain-adapters.js（未接线）
Workitem: 本地 YAML（无 SSO/并发锁）
签收: mock actionId + UI 回执（非生产身份）
发布/安装: 设计稿，关键决策已定；bundle / registry / receipt 未实现；dev symlink 安装仍可用，M4 验收后退役
```

## 3. 历史/局部参考

以下文档仍有价值，但不是当前完整架构；内网接入不要直接照抄。

| 文档 | 状态 | 读法 |
|---|---|---|
| [integration.md](integration.md) | 历史/局部 | 只覆盖 devops + catalog 的早期 provider seam；新的 9 域见 intranet-architecture |
| [agent-orchestration.md](agent-orchestration.md) | 历史 | 早期 Agent 拓扑/工具体系；其中工具数、release 审批已过时 |
| [p1-summary.md](p1-summary.md) | 历史 | P1 阶段验收记录 |
| [p2-plan.md](p2-plan.md) / [p2-tool-convergence.md](p2-tool-convergence.md) | 历史 | P2 工具收敛记录 |
| [blueprint-v2.md](blueprint-v2.md) | 历史 | v2 视觉/阶段蓝图；当前实现以本索引为准 |
| [user-journey/overnight-report.md](user-journey/overnight-report.md) | 历史 | 通宵实现记录；Stage 4/5 已后续实现 |
| [mock-to-real.md](mock-to-real.md) | 局部 | 平台映射参考；真实边界以 ADR 0012 为准 |

## 4. 旧文档处理原则

- **不删除**：保留决策历史。
- **加状态横幅**：标注“历史/局部”，指向 canonical。
- **不再更新数字**：工具数、阶段数、approval 以当前索引/registry 为准。
- **迁移时统一更新链接**：避免断链。
