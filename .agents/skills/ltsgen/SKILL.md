---
name: ltsgen
description: 技术方案进入开发验证时使用；把 LTS 技术设计转成 lts_code/<task>/task.yaml 和 output/<package>.zip。mock 用 dataops_develop_generate_lts，内网替换为 lts-design-gen jar；校验不等于 Build。
---

# LTS 任务生成（ltsgen）

## 何时使用

- 3c 技术方案已经确认，准备进入 Stage 4 开发验证。
- 需要把 LTS 技术设计文档转成调度平台可导入的 `lts.yaml`。
- 用户说“生成 lts 任务 / 生成调度代码 / 把技术方案转成调度任务”。

## 输入

- 3c 产出的 LTS 技术设计文档（front-matter Markdown，含元信息/调度/流程/资源映射）。
- 任务名、包名、目标表。
- mock 或内网模式。

## mock 模式

调用：

```text
dataops_develop_generate_lts({ workitemId, taskName, packageName })
```

工具会落到当前工作项：

```text
deliverables/develop/code-repo/
  lts_code/<task>/task.yaml
  lts_code/<task>/parameters.properties
  output/<package>.zip
```

同时返回：

```text
validation.ok
validation.checks
artifact.package / artifact.digest
codeRepoRoot
gaps
```

mock 产物必须被视为**模拟制品**，不能声称已进入真实数据代码仓。

## 内网模式

内网适配器替换同一 contract：

```text
技术设计文档
  → design.ir.yaml
  → lts-design-gen jar check
  → lts.yaml
  → 数据代码仓 lts_code/<task>/task.yaml
  → dataops build run
  → output/<package>.zip
```

工具返回字段必须和 mock 一致，只把 `source` 改成真实来源。

## 边界

- ltsgen 校验 **不是** Build。
- Build passed 必须由真实 `dataops build run` 产出新 zip 才能判定。
- 校验失败不产出 lts.yaml；最多重试 5 轮。
- 真实代码仓路径、jar、登录凭据只从配置/credentials 读取，不写进技能或提示词。
- mock 环境不执行真实部署，不伪造真实部署状态。
