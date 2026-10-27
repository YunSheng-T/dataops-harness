# Vendored graph assets (prototype only)

Not yet bundled into the DSH client plugin. The DSH integration should reuse the host React and load only React Flow + CSS.

## React Flow rich-node prototype (`lineage-flow.html`)

| File | Version | License | Source |
|---|---|---|---|
| `react.production.min.js` | 18.3.1 | MIT | https://unpkg.com/react@18.3.1/umd/react.production.min.js |
| `react-dom.production.min.js` | 18.3.1 | MIT | https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js |
| `reactflow.umd.js` | 12.3.5 | MIT | `@xyflow/react` package, `dist/umd/index.js` |
| `reactflow.css` | 12.3.5 | MIT | `@xyflow/react` package, `dist/style.css` |

Load order: React → ReactDOM → `window.jsxRuntime` shim → React Flow UMD.

## Legacy Cytoscape prototype (`lineage-graph.html`)

| File | Version | License | Source |
|---|---|---|---|
| `cytoscape.min.js` | 3.30.4 | MIT | https://unpkg.com/cytoscape@3.30.4/dist/cytoscape.min.js |
| `dagre.min.js` | 0.8.5 | MIT | https://unpkg.com/dagre@0.8.5/dist/dagre.min.js |
| `cytoscape-dagre.js` | 2.5.0 | MIT | https://unpkg.com/cytoscape-dagre@2.5.0/cytoscape-dagre.js |

## Icons

`icons/*.svg` are from [Simple Icons](https://simpleicons.org/) 13.21.0 (CC0), used only as mock brand markers:

MySQL, Hive, ClickHouse, Kafka, Redis, PostgreSQL, Spark, Airflow.

The extra `db/job/api/report/schedule/bo/le.svg` are local generic glyphs for internal platforms and non-brand nodes.
