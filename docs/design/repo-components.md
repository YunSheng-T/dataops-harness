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

## 6. 后续

```text
C. BuildAdapter
C. DeployAdapter
UI: 仓库/package/LTS 只读检查器
真实 CLI：--json 或稳定 exit code/log contract
```
