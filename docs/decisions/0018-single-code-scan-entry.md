# 0018 单一代码扫描入口

- 日期：2026-11-02
- 状态：accepted
- 关联：[Code Scan Integration](../design/code-scan-integration.md)

## 决策

代码扫描只有一个工具入口：

```text
dataops_code_scan
```

它通过 dataops CLI 触发扫描，返回 scanId；扫描结果和鉴权由扫描服务/CLI 管理。

## 兼容

旧 `dataops_cicd_scan` 不再注册为独立工具。CICD 旧调用方改走：

```text
dataops_code_scan({ scenario: "...", mode: "cicd" })
```

返回旧的 CICD scan payload，保持阶段卡兼容。

## 边界

- DataOps 不实现 SQL parser / DDL / Rollback / impact 规则
- DataOps 只保存 scanId 引用
- 文件级 scope 先做，package scope 后续扩展
- 不提供 latest 查询

## 影响

- 活动工具数从 22 回到 21
- 客户端 toolview key 从 `dataops_cicd_scan` 改为 `dataops_code_scan`
- 旧 CICD 调用必须迁移到 `scenario` 兼容模式
