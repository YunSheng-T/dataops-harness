# 血缘卡片 v2：从「表血缘」到「数据链路图谱」

> 结论先说：血缘卡片不是一张表，而是**同一张卡片的不同视图**。
> 卡片内用轻量 SVG 做预览；复杂图谱用 Canvas 图引擎做全屏探索。
> SVG 不是不能画，是不适合承担 100+ 节点、任务/作业嵌套和交互。

---

## 1. 三个视图，回答三个不同问题

| 视图 | 谁用 | 回答的问题 | 默认展示 |
|---|---|---|---|
| **设计视图** | 需求分析、方案设计 | 我要产出的这张表，从哪个业务对象/逻辑实体/物理表来？继承什么？谁调度、什么周期？ | 目标表 + 直接上游 + 调度 + 加工摘要 |
| **生产视图** | 数据开发、运维 | 这张主题/集市表是怎么加工出来的？经过哪些集成、ETL、调度、报表/API？ | 完整内部血缘链路 |
| **调度视图** | 运维、排障 | 哪个 schedule-task 包含哪些 job？执行顺序、周期、依赖是什么？ | schedule-task → schedule-job → 作业 |

ETL 加工逻辑不单独做一张卡，作为**节点详情面板**出现：点 ETL job，右侧/下方展示 SQL、输入输出、字段映射。

---

## 2. 设计视图：需求/方案阶段到底看什么

### 2.1 资产地图映射条

图上方先给一条“从业务到物理”的链路，不塞进图里：

```
业务对象：交易订单
  → 逻辑实体：订单事实
    → 物理表：dwd.orders（dwd 层 · 交易域 · 日分区）
```

同时显示元数据状态：

- 元数据是否已登记、owner、粒度、分区、更新周期
- 字段是否完整、是否有口径说明
- 没有登记时明确标“元数据缺失”，不猜

### 2.2 图的主体

- 目标表：本次要产出的 `dws.xxx` / `ads.xxx`
- 上游物理表：直接依赖，边上标继承的字段/度量、过滤条件、join key
- 调度：产出目标表的 `schedule-task` / `schedule-job`，标周期（日/小时）、依赖窗口（T-1）、SLA
- 加工摘要：聚合/过滤/关联的关键步骤，点开看完整 ETL 逻辑
- 下游影响：默认只显示数量，点“展开影响面”再看

设计视图默认**只展开一层上游**，避免把整张数仓图铺开。每个直接上游表要展示：**它由哪个 ETL 产出、由哪个调度作业调度**；不再递归追溯上游表的上游表。需要看全链路时点“查看生产视图”。

集成/内部加工/服务更新统一为 `etl_job` 节点，用 `jobKind=integration|batch_etl|service` 区分；节点展开时再看工具、SQL、字段映射。

设计态默认展示“目标表 + 一层直接上游表 + 上游产出 ETL/调度 + 目标 ETL/调度 + SLA 时间带”，不是完整生产图。

---

## 3. 生产视图：内部血缘链路

典型链路：

```
源系统表
  → 集成作业（贴源）
    → ODS 表
      → ETL 作业
        → DWD 表
          → ETL 作业
            → DWS/ADS 表
              → 报表 / API / 缓存
```

节点不只表，还包括：

- 表：ODS / DWD / DWS / ADS / 维表
- 作业：集成作业、ETL 作业、API 调用作业
- 调度：schedule-task、schedule-job
- 消费端：报表、API、缓存

边区分：

- 数据流：`reads` / `writes` / `derives`
- 控制流：`triggers` / `depends_on` / `contains`
- 调用：`calls` / `caches`

支持按层、节点类型、周期过滤；点击节点看 owner、元数据、最近运行状态。

---

## 4. 调度视图：task / job 粒度

调度模型按你们平台定义：

```
schedule-task（调度任务）
  ├─ schedule-job（调度作业，有顺序/依赖）
  │    ├─ 集成作业：贴源表
  │    ├─ ETL 作业：加工层
  │    └─ API 作业：调用报表系统，更新缓存
  └─ 周期：daily / hourly
     依赖窗口：T-1
     SLA：05:00
```

- `schedule-task` 用**复合节点**包住多个 `schedule-job`
- job 节点显示类型、顺序、状态、最近运行时间
- 边是 `triggers` / `depends_on`，不是数据流
- 点 job 展开 ETL/SQL/API 详情
- 跨 task 依赖用虚线，避免和 task 内部顺序混淆

---

## 5. 图模型：节点、边、复合

### 5.1 节点类型

| type | 说明 | 关键字段 |
|---|---|---|
| `business_object` | 业务对象 | name、domain、owner |
| `logical_entity` | 逻辑实体 | name、objectId、grain |
| `physical_table` | 物理表 | db、table、layer、partition、owner、cycle |
| `field` | 字段（P2） | table、name、type、comment |
| `schedule_task` | 调度任务 | id、cycle、cron、sla |
| `schedule_job` | 调度作业 | id、taskId、jobType、order、status |
| `etl_job` | 集成/内部加工/服务更新统一作业；jobKind 区分 | source、inputs、outputs、tool/operator、logic |
| `api` | API/服务 | name、method、owner |
| `cache` | 缓存 | name、target |
| `report` | 报表/看板 | name、owner |

### 5.2 边类型

| type | 含义 |
|---|---|
| `derives` | 逻辑实体/字段派生 |
| `reads` / `writes` | 作业读写表 |
| `triggers` | 调度触发作业 |
| `depends_on` | 作业/任务依赖 |
| `contains` | task 包含 job |
| `calls` | 作业调用 API |
| `caches` | 作业更新缓存 |
| `maps_to` | 业务对象/逻辑实体映射到物理表 |

边可带 `fields[]`、`expression`、`cycle`、`condition`，用于“继承了哪些字段、哪个周期”。

### 5.3 ID 约定

- `table:<db.table>`
- `task:<taskId>`
- `job:<jobId>`
- `api:<service>`
- `bo:<objectId>` / `le:<entityId>`

稳定 ID 是跨视图、跨工具关联的关键。

---

## 6. Payload 契约（v2）

保持现有 `kind: 'lineage'` 和 `nodes/edges` 兼容，新增字段可选：

```json
{
  "kind": "lineage",
  "schemaVersion": 2,
  "view": "design",
  "views": ["design", "production", "schedule"],
  "scope": { "target": "dws.trade_channel_daily", "direction": "up", "depth": 1 },
  "assetMap": {
    "businessObject": { "id": "bo.trade_order", "name": "交易订单" },
    "logicalEntity": { "id": "le.order_fact", "name": "订单事实" },
    "physicalTable": { "id": "table:dwd.orders", "name": "dwd.orders", "layer": "dwd" },
    "metadataStatus": "complete"
  },
  "graph": {
    "nodes": [
      { "id": "table:dwd.orders", "type": "physical_table", "label": "dwd.orders", "layer": "dwd", "owner": "交易组" },
      { "id": "job:etl_001", "type": "etl_job", "label": "渠道聚合", "parent": "task:daily_001" },
      { "id": "task:daily_001", "type": "schedule_task", "label": "渠道日报", "cycle": "daily" }
    ],
    "edges": [
      { "from": "table:dwd.orders", "to": "job:etl_001", "type": "reads", "fields": ["channel_id", "amount"] },
      { "from": "job:etl_001", "to": "table:dws.trade_channel_daily", "type": "writes" }
    ]
  },
  "schedule": {
    "taskId": "task:daily_001",
    "cycle": "daily",
    "dependsOn": ["table:dwd.orders@T-1"],
    "cron": "0 3 * * *",
    "sla": "05:00"
  },
  "transforms": [
    { "jobId": "job:etl_001", "type": "SQL", "logic": "count(distinct order_id) ...", "inputs": ["table:dwd.orders"] }
  ],
  "source": "catalog",
  "asOf": "2026-10-25 15:10",
  "partial": false,
  "gaps": []
}
```

设计卡打开血缘时，直接用 design payload 里的 `assetMap`/`schedule`/`transforms` 渲染设计视图；单独调 `dataops_shared_read_lineage` 时按 `view` 返回对应子图。

---

## 7. 工具面（建议）

```text
dataops_shared_read_lineage({
  table?: string,
  taskId?: string,
  view?: 'design' | 'production' | 'schedule',
  direction?: 'up' | 'down' | 'both',
  depth?: number,
  cycle?: 'daily' | 'hourly'
})
```

- `view=design`：目标表 + 直接上游 + 调度 + 加工摘要
- `view=production`：完整内部血缘
- `view=schedule`：task/job 链路（可只传 taskId）
- 真实 provider 分别映射资产地图、元数据、调度平台、ETL 平台、API 网关

---

## 8. 图技术栈：卡片预览 + 全屏引擎

### 8.1 对比

| 方案 | 适合 | 优点 | 限制 |
|---|---|---|---|
| 自研 SVG | ≤30 节点卡片预览 | 无依赖、快、样式可控 | 节点/边一多就卡；复合节点/缩放/筛选要自己写 |
| **Cytoscape.js** | 50–500 节点 DAG、复合节点 | Canvas 渲染、compound、dagre/elk 布局、事件完整、MIT、无 React 依赖 | 需要引入约数百 KB；布局要选插件 |
| AntV G6 | 复杂关系图、中文生态 | combo、DAG 布局、交互丰富、文档好 | 包更大、API 更重 |
| React Flow | React 自定义节点 | React 开发体验好、节点可定制 | 大图/复合/自动布局要额外投入；包也不小 |
| ECharts graph | 快速出图、较大图 | Canvas、简单 | 复合节点/调度语义弱，定制成本高 |
| Sigma.js | 1000+ 节点 | WebGL 性能好 | 复合/布局/交互要自己补 |

### 8.2 选择：React Flow 富节点

用户反馈“方框加名字、没有详情入口、和 Harness 格格不入”，因此最终选择 **React Flow**，而不是继续用 Canvas 文本节点：

- 节点就是 React DOM：左侧放图标/Logo（MySQL、Hive、ClickHouse、Kafka、Redis、Spark、Airflow…），右侧放名称、引擎/owner、类型徽标
- 样式直接用 DSH 语义 token，和 Harness 的紧凑密度一致
- `parentId` 表达 `schedule-task` 包含 `schedule-job`
- 20 个节点以内很轻；100 个节点做 DOM 压测，仍可缩放/平移
- MIT，可 vendor UMD + CSS；DSH 客户端复用宿主 React，不重复打包 React

Cytoscape 原型保留作为对比：它适合更大图/更复杂布局，但富节点不是它的强项；G6 作为 P2 的备选。

- **布局**：设计视图 2 行、生产视图 4 行分层、调度视图 group + 手动位置；后续可换 dagre/elk 自动布局
- **打包**：React Flow 12.3.5 UMD + CSS；独立原型带 React 18 UMD，DSH 内只带 React Flow
- **交互**：缩放/平移、fit、点击节点打开详情抽屉、字段/调度/加工 tab、100 节点压测

### 8.3 布局算法：为什么不能靠手摆坐标

血缘是有向无环图（DAG），业界成熟做法是 **Sugiyama 分层布局**，基本四步：

1. **去环 / 分层**：按依赖算 rank（最长路径、network simplex），把源表、ODS、DWD、DWS、ADS、消费端分到不同层
2. **层内排序**：用 barycenter / median 多轮扫描，减少相邻层之间的边交叉
3. **坐标分配**：Brandes-Köpf、priority method，保证节点不重叠、边尽量直
4. **边路由**：正交路由、端口、长边拆分/虚拟节点

常用实现：

| 引擎 | 特点 |
|---|---|
| Graphviz dot | 经典 Sugiyama，静态图最稳，浏览器里要服务端 / WASM |
| **ELK Layered** | 浏览器可用，支持复合节点、端口、正交边、分层约束；适合复杂血缘 |
| Dagre | JS 版 Sugiyama，简单、和 React Flow 集成多，复合/端口弱 |
| G6 layered / compactBox | 国内生态，combo 和 DAG 布局完整 |
| yFiles | 商业，自动布局最强，成本高 |

关键认知：**React Flow 只是渲染器，不带布局算法**。节点重叠不是 React Flow 的 bug，而是之前用固定 x/y 摆位、没有把节点宽高纳入间距计算。正式版本应该：

- 由布局引擎输出坐标，React Flow 只负责画和交互
- 把“阶段/层”作为**约束**传给布局（而不是让通用布局随意排）
- 长链路用**分层折返/包裹**（lineage 产品常见做法），而不是无限拉宽
- 超过 50–100 节点时用**焦点 + 展开**、分组折叠，而不是一次画全图

当前原型为了 20 节点以内的可读性，用**约束蛇形分层**：阶段行带 + 奇偶行反向 + 固定单元格间距（节点宽 240、水平间距 30、垂直间距 58），并加了行带标签（接入/加工/服务/消费）。节点四向 handle 按相对位置选上下/左右，边用 smoothstep 正交路由。DOM 实测：设计 8 节点、生产 16 节点、调度 7 个 rich 节点，**0 重叠**；剩余问题是少量跨行边。

下一版如果要做任意图/更大规模，接 **ELK Layered**：`elk.direction=RIGHT`、`elk.edgeRouting=ORTHOGONAL`、`elk.layered.crossingMinimization=LAYER_SWEEP`、`elk.layered.nodePlacement=BRANDES_KOEPF`，并把阶段 row 作为 `elk.layered` 的层约束。React Flow 仍只做渲染。


## 9. 分期

| 阶段 | 内容 | 验收 |
|---|---|---|
| P0 | v2 payload + React Flow 富节点设计视图 | 节点有数据库/中间件/平台图标；表可看库/schema/字段 |
| P1 | 全屏 React Flow 生产/调度视图 | 表+作业+task/job 链路可缩放、可点详情 |
| P2 | ETL 节点详情、字段级血缘、过滤/路径高亮 | 能从目标表追到字段和作业 |

---

## 10. 需要你确认

1. **资产地图**：业务对象/逻辑实体/物理表由哪个系统提供？有没有稳定 ID 和字段清单？
2. **调度模型**：schedule-task/job 的接口、层级、周期、依赖字段是什么？job 类型有哪些（集成/ETL/API/其他）？
3. **第一版范围**：先做设计视图，还是设计+生产+调度三个视图一起？
4. **图规模**：典型多少节点？要不要字段级？
5. **技术选型**：React Flow + vendor 静态文件可以吗？内网允许直接提交 vendor 包吗？

---

## 11. 原型（2026-10-25）

### 富节点三视图（当前版本）

- 页面：`prototype/lineage-flow.html`
- 设计视图：`?view=design`
- 生产视图：`?view=production`
- 调度视图：`?view=schedule`（group 内 job 顺序依赖 + task 产出依赖 + 依赖窗口）
- 截图：`prototype/shots/flow-design.png`、`flow-production.png`、`flow-schedule.png`

节点内部左侧是图标/Logo：

- 表：MySQL / Hive / ClickHouse / PostgreSQL / 通用 DB
- 中间件：Kafka / Redis
- 作业平台：Spark / Airflow / API / DB 脚本
- 业务对象/逻辑实体：DataMap 图标

点击节点打开右侧详情抽屉：

- 表：数据库、库、schema、表名、粒度、分区、周期、行数、owner、字段清单
- 作业：平台、输入/输出、SQL、owner
- 调度任务：周期、cron、SLA、依赖窗口、包含的 job 顺序
- 默认选中目标表，表默认打开「字段」；ETL 默认打开「加工」

其他：

- 设计视图 8 个节点，生产视图 16 个节点（含 Kafka），调度视图 9 个节点 + 2 个 group
- 采用**蛇形分层布局**：设计 2 行；生产 4 行（接入 → 加工 → 服务），奇数行反向排列，减少长边交叉
- 生产视图按“接入 → 集成/ODS → ETL/DWD/DWS → ADS/API/缓存/报表”排列；Kafka 在接入段
- 100 节点按钮：React Flow DOM 节点压测
- 旧版 Cytoscape 原型保留：`prototype/lineage-graph.html`

### DSH 全宽血缘工作台（native，已接入）

- 右栏「血缘」标签只保留入口卡：当前上下文摘要 + 「打开全宽血缘工作台」
- 工作台是**宿主内原生 React 组件**，不是 iframe：
  - 宿主 React / ReactDOM
  - React Flow 与图标 vendor 在 `assets/lineage/vendor`，构建时内联
  - 原型 CSS 已 scope 到 `.do-workbench-overlay`，不污染 DSH 宿主
- 设计 8 / 生产 16 / 调度 7 个节点；三视图可切；节点类型、图标、右侧详情、调度依赖都保留
- 调度视图：group 内 job 顺序轨道 `1→2 → 2→3 → 3→4`，task 产出依赖、依赖窗口提示
- 数据目前仍是 channel-report 静态 mock；真实 DataMap/调度数据等内网接入时替换数据适配层
- 截图：`prototype/shots/real-dataops-workbench-native.png`

### 当前仍不够的地方

- 图标是 Simple Icons 的品牌 Logo，内部平台（DataMap、调度、ETL 平台）还需要自己的图标
- 蛇形布局已消除节点重叠（设计 8 / 生产 16 / 调度 7 个 rich 节点，DOM 实测 0 重叠），跨行边 `dws → etl_ads`、`api → cache` 仍有；后续接 ELK layered + 层约束/正交边，或加分组折叠
- 右栏图谱的节点详情仍走 mock；DataMap/调度/ETL 接口接上后换真实字段
- 全宽工作台数据仍是 channel-report mock；内网接入时替换数据适配层

### 还没接的

- DataMap 的真实字段/API、调度平台的 task/job 字段
- 工作台已 native 化；还差真实 DataMap/调度数据接入（等内网）
- ETL 节点详情里的真实 SQL/字段映射
- 字段级血缘
