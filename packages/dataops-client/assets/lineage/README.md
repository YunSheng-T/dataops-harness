# Native lineage workbench assets

- `vendor/`: React Flow 12.3.5 UMD/CSS (MIT) and node icons
- `workbench.css`: prototype workbench CSS scoped to `.do-workbench-overlay`
- Graph data and card/detail components live in `src/flow.js` (ported from the approved prototype)

The workbench is a native host React component; there is no iframe. Data is the
channel-report mock snapshot until the intranet DataMap/scheduler APIs are wired.
