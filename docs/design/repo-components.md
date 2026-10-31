# 内部代码仓组件：A + B

> 当前只做只读索引和 LTS 源文件解析；不接 UI、不接构建/部署 CLI。  
> 目标：先把“仓库里有什么、属于哪个平台、调度结构是否正确”建准。

## 1. 边界

### 已做

```text
A. RepoIndex
   manifest.yaml / build.yaml 解析
   平台根目录定位
   package / files / glob 索引

B. LTS Source Model
   task.yaml formatVersion 2
   task / jobs / parentJobName
   url / shell / database / group / tskdep
   占位符声明检查
   parameters.properties
```

### 不做

```text
不调用 dataops build run
不调用 dataops deploy execute
不写代码仓
不解析构建产物 task.json
不接 UI
不处理 group 模型
不处理 offline 包
```

## 2. 路径规则

```yaml
# manifest.yaml
structure:
  ref:
    data-schedule:
      lts: lts_code
```

```yaml
# build.yaml
files:
  - path: lts_code/<任务目录>/*
```

规则：

- manifest 只做平台定位
- build.yaml 的 `files` 相对仓库根
- 实际构建按 build.yaml
- `${structure.ref.data-schedule.lts}` 是未来变量语法
  - 当前 CLI 不支持
  - 组件可以解析，但必须把 unresolved 显示出来，不能假装 CLI 已支持

## 3. A 的 API

```js
import { parseManifest, parseBuildConfig, indexRepository } from './repo/index.js'

const manifest = parseManifest(text)
const build = parseBuildConfig(text)
const index = indexRepository({ root, manifestText, buildText })
```

返回：

```text
manifest.platforms[]
build.packages[]
index.packages[].files[]
index.packages[].missing[]
index.packages[].unresolved[]
index.packages[].platform
index.findings[]
```

## 4. B 的 API

```js
import { parseLtsTask, parseProperties } from './lts.js'

const properties = parseProperties(text)
const model = parseLtsTask(yamlText, { parameters: properties })
```

返回：

```text
model.tasks
model.parameters
model.placeholders
model.findings
model.ok
```

校验：

- formatVersion
- type / cronExp
- isFullJob
- jobType
- url GET/POST/exec
- tskdep 必填
- parent 缺失
- 环
- 占位符是否在 parameters.properties 声明
- owner 形态（占位符允许）

## 5. 测试

```sh
node packages/dataops-tools/scripts/repo-check.mjs
node scripts/verify-local.mjs
```

当前覆盖：

```text
manifest / build / glob / manifest expression
LTS task / jobs / placeholders
缺失 parent
缺失占位符声明
```

## 6. C1/C2 适配器

### BuildAdapter

```js
import { createBuildAdapter } from '@dataops/dsh-dataops-tools/repo/build'

const build = createBuildAdapter({
  root,
  enterpriseId,
  projectId,
  execFileImpl // 测试/内网可注入
})

const result = await build.run({ packageName: 'lts_demo_01' })
```

执行：

```sh
dataops build run --package <pkg> --config .dataops/build.yaml --output-dir output --enterprise-id <ENT> --project-id <PROJ>
```

行为：

- 先按 A 校验 package 存在
- 参数数组执行，不拼 shell
- 不替换 `$$KEY$$`
- 成功判定：exit 0 + `output/<package>.zip` 存在
- 返回 `artifact/buildInfo/exitCode/logExcerpt/errors`

### DeployAdapter

```js
import { createDeployAdapter } from '@dataops/dsh-dataops-tools/repo/deploy'

const deploy = createDeployAdapter({ root, enterpriseId, projectId })
const result = await deploy.run({ packageName: 'lts_demo_01' })
```

执行：

```sh
dataops deploy execute --package <pkg> --artifact <zip> --config .dataops/build.yaml --target-env sit --mode execute --enterprise-id <ENT> --project-id <PROJ>
```

当前范围：

- only sit
- explicit `--mode execute`
- no approval-id
- no dry-run
- no deployment receipt

## 6.1 UI 代码仓 tab

右侧栏新增 `代码仓` tab，直接读取 Host `GET /api/dataops/repo`：

- 只读，不需要 Agent 回合
- 需要 dataops-tools config 配置 `repoRoot`
- 未配置时显示未就绪
- 展示平台/包/文件数/待处理项
- 展示 LTS 任务数、作业数、占位符和 findings
- 不展示源码正文、token、绝对路径

## 7. 后续

```text
UI: 仓库/package/LTS 只读检查器
Agent tool: 暴露 A/B/C 只读入口
真实 CLI：--json 或稳定 exit code/log contract
```
