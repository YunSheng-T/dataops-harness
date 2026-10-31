/**
 * Client cards for the dataops workbench plugin.
 *
 * Plain factory (no JSX, no bundler): the build script inlines this file into
 * lib/client.js, and the same code can be rendered in Node for preview checks.
 * Styling follows the DSH web-client rules: semantic --dsw-alias-* tokens only,
 * no palette literals in feature code.
 */
export function createDataopsCards(React) {
  function safeChild(value) {
    if (Array.isArray(value)) return value.map(safeChild)
    if (value && typeof value === 'object' && !value.$$typeof && !(value.type && value.props)) return displayValue(value)
    return value
  }

  var h = function (type, props) {
    var children = Array.prototype.slice.call(arguments, 2).map(safeChild)
    return React.createElement.apply(React, [type, props].concat(children))
  }

  var STYLE_ID = 'dataops-cards-styles'

  var CSS = [
    '.do-card{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));border-radius:var(--dsw-radius-lg,16px);background:var(--dsw-alias-bg-layer-1,#fff);padding:11px 14px;margin:6px 0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary,#0f1115)}',
    '.do-card[data-state=running]{border-style:dashed}',
    '.do-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.do-title{font-weight:600;font-size:13px}',
    '.do-spacer{flex:1}',
    '.do-sub{font-size:12px;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-muted{font-size:11px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-dot{width:7px;height:7px;border-radius:50%;flex:none;background:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-dot[data-tone=pass]{background:var(--dsw-alias-state-success-primary,#22c55e)}',
    '.do-dot[data-tone=warn]{background:var(--dsw-alias-state-warn-primary,#f59e0b)}',
    '.do-dot[data-tone=fail]{background:var(--dsw-alias-state-error-primary,#ec1313)}',
    '.do-dot[data-tone=muted]{background:var(--dsw-alias-label-quaternary,#b6bbc3)}',
    '.do-pill{font-size:11px;line-height:17px;padding:0 7px;border-radius:999px;background:var(--dsw-alias-bg-overlay,#eef0f5);color:var(--dsw-alias-label-secondary,#61666b);white-space:nowrap}',
    '.do-pill[data-tone=brand]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4176e6) 12%,transparent);color:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-pill[data-tone=pass]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 12%,transparent);color:var(--dsw-alias-state-success-primary,#16a34a)}',
    '.do-pill[data-tone=warn]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#f59e0b) 14%,transparent);color:var(--dsw-alias-state-warn-label,#b45309)}',
    '.do-grid{display:grid;grid-template-columns:56px minmax(0,1fr);gap:7px 10px;font-size:12px}',
    '.do-grid dt{color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-grid dd{margin:0;min-width:0}',
    '.do-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;background:var(--dsw-alias-bg-overlay,#eef0f5);padding:1px 5px;border-radius:var(--dsw-radius-xs,4px);color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-label{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,#81858c);margin:12px 0 5px}',
    '.do-step{display:flex;gap:8px;padding:7px 0;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}',
    '.do-step:first-child{border-top:0}',
    '.do-idx{width:16px;height:16px;border-radius:50%;flex:none;margin-top:2px;display:grid;place-items:center;font-size:10px;font-weight:700;font-family:ui-monospace,Menlo,monospace;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4176e6) 10%,transparent);color:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-step-title{font-size:12px}',
    '.do-logic{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--dsw-alias-label-tertiary,#81858c);word-break:break-word}',
    '.do-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));margin:10px -14px -11px;padding:10px 14px;background:var(--dsw-alias-bg-base,#f9fafb)}',
    '.do-foot .do-meta{margin-right:auto}',
    '.do-btn{height:28px;padding:0 10px;border-radius:var(--dsw-radius-sm,8px);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#0f1115);font-size:12px;font-weight:500;cursor:pointer}',
    '.do-btn[data-variant=primary]{background:var(--dsw-alias-state-business-primary,#4176e6);color:var(--dsw-alias-label-primary-foreground,#fff);border-color:transparent}'
    ,'.do-btn:hover{background:var(--dsw-alias-bg-l2,#f4f5f7)}'
    ,'.do-btn[data-variant=primary]:hover{background:var(--dsw-alias-state-business-primary,#315efb);filter:brightness(1.04)}'
    ,'.do-btn[data-variant=ghost]{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-kv{display:flex;gap:6px;flex-wrap:wrap;align-items:center}',
    '.do-empty{padding:8px 0;font-size:12px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-ctx{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));border-radius:var(--dsw-radius-md,12px);padding:10px 11px;margin:6px 0;background:var(--dsw-alias-bg-layer-1,#fff)}',
    '.do-ctx-head{display:flex;align-items:center;gap:6px}',
    '.do-ctx-title{font-size:12px;font-weight:600}',
    '.do-ctx-sub{font-size:11px;color:var(--dsw-alias-label-tertiary,#81858c);margin-top:2px}',
    '.do-fields{margin-top:7px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}',
    '.do-field{display:flex;justify-content:space-between;gap:8px;padding:4px 0;font-size:11px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}',
    '.do-field:last-child{border-bottom:0}',
    '.do-field .do-fn{font-family:ui-monospace,Menlo,monospace}',
    '.do-field .do-ft{color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-lin{display:flex;flex-direction:column;gap:6px}',
    '.do-lin-node{display:flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));border-radius:8px;padding:6px 8px;font-size:11px;background:var(--dsw-alias-bg-layer-1,#fff)}',
    '.do-lin-node[data-target=true]{border-color:var(--dsw-alias-state-business-primary,#4176e6);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4176e6) 8%,transparent)}',
    '.do-lin-node .do-fn{font-family:ui-monospace,Menlo,monospace}',
    '.do-lin-arrow{color:var(--dsw-alias-label-quaternary,#b6bbc3);font-size:10px;padding-left:8px}',
    '.do-ev{display:flex;gap:7px;padding:7px 0;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));font-size:11px}',
    '.do-ev:first-child{border-top:0}',
    '.do-ev .do-et{font-size:12px}',
    '.do-ev .do-es{color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-sample{font-size:10px;color:var(--dsw-alias-label-quaternary,#b6bbc3);margin-top:8px}',
    '.do-brief{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));border-radius:var(--dsw-radius-md,12px);padding:11px 13px;margin:8px 0;background:var(--dsw-alias-bg-layer-1,#fff)}',
    '.do-brief-head{display:flex;align-items:center;gap:7px}',
    '.do-brief-title{font-size:12px;font-weight:600}',
    '.do-brief-sub{margin-left:auto;font-size:10.5px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-stages{display:flex;align-items:center;margin:9px 0 7px;flex-wrap:wrap}',
    '.do-stage{display:flex;align-items:center;gap:4px;font-size:10.5px;color:var(--dsw-alias-label-tertiary,#81858c);white-space:nowrap}',
    '.do-stage .do-sd{width:12px;height:12px;border-radius:50%;border:1.5px solid var(--dsw-alias-label-quaternary,#b6bbc3);display:grid;place-items:center;font-size:8px;color:transparent}',
    '.do-stage[data-s=done]{color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-stage[data-s=done] .do-sd{background:var(--dsw-alias-state-success-primary,#22c55e);border-color:var(--dsw-alias-state-success-primary,#22c55e);color:var(--dsw-alias-label-primary-foreground,#fff)}',
    '.do-stage[data-s=active]{color:var(--dsw-alias-label-primary,#0f1115);font-weight:600}',
    '.do-stage[data-s=active] .do-sd{border-color:var(--dsw-alias-state-business-primary,#4176e6);box-shadow:0 0 0 2.5px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4176e6) 12%,transparent)}',
    '.do-stage-line{width:14px;height:1px;background:var(--dsw-alias-border-l2,rgba(0,0,0,.1));margin:0 4px}',
    '.do-brief-next{font-size:11.5px;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-brief-next b{color:var(--dsw-alias-label-primary,#0f1115)}',
    '.do-brief-foot{margin-top:7px;padding-top:7px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));font-size:10.5px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-turn-tail{display:flex;flex-direction:column;gap:8px;width:100%;max-width:var(--dsh-chat-content-width,920px);margin:0 auto}',
    '.do-turn-card-cap{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#81858c);margin:2px 0 -3px}',
    '.do-turn-card{width:100%;max-width:var(--dsh-chat-content-width,920px);margin:0 auto}',
    '.do-turn-card .do-card{margin:0}',
    '.do-current-card{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);margin:8px 0 6px;overflow:hidden;display:flex;flex-direction:column;max-height:54vh}',
    '.do-current-card-head{display:flex;align-items:center;gap:7px;padding:8px 11px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));background:var(--dsw-alias-bg-l2,#f7f8fa);flex:none}',
    '.do-current-card-title{font-size:11px;font-weight:600;color:var(--dsw-alias-label-primary,#0f1115)}',
    '.do-current-card-meta{margin-left:auto;font-size:10px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-current-card-body{overflow:auto;min-height:0;padding:0 2px}',
    '.do-current-card-body .do-card{border:0;border-radius:0;margin:0}',
    '.do-current-card-foot{padding:5px 11px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));font-size:9.5px;color:var(--dsw-alias-label-tertiary,#81858c);background:var(--dsw-alias-bg-l2,#f7f8fa);flex:none}',
    '.do-stagebar{width:min(100%,var(--dsh-chat-content-width,920px));margin:6px auto;padding:6px 9px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);box-sizing:border-box}',
    '.do-stagebar-head{display:flex;align-items:center;gap:7px;min-height:20px;width:100%;border:0;background:transparent;padding:0;font:inherit;text-align:left;color:inherit;cursor:pointer}',
    '.do-stagebar-head:hover .do-stagebar-title{color:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-stagebar-title{font-size:11px;font-weight:600;color:var(--dsw-alias-label-primary,#0f1115);flex:none}',
    '.do-stagebar-hint{font-size:9.5px;color:var(--dsw-alias-label-tertiary,#8b93a2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.do-stagebar-caret{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none;border-radius:5px;background:var(--dsw-alias-bg-l2,#f4f5f7);color:var(--dsw-alias-label-tertiary,#81858c);font-size:11px;line-height:1;transition:transform .15s ease,background .15s ease}',
    '.do-stagebar-head:hover .do-stagebar-caret{background:var(--dsw-alias-brand-primary-bg,rgba(77,107,254,.08));color:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-stagebar-caret[data-expanded="true"]{transform:rotate(180deg)}',
    '.do-stagebar-view{margin-left:auto;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.14));border-radius:6px;background:transparent;font-size:9.5px;line-height:20px;padding:0 7px;color:var(--dsw-alias-label-secondary,#61666b);cursor:pointer}',
    '.do-stagebar-stages{display:flex;gap:6px;margin-top:5px;overflow:auto;padding-bottom:1px;justify-content:flex-start}',
    '.do-stagebar-node{flex:0 0 auto;min-width:68px;display:flex;flex-direction:column;align-items:flex-start;gap:1px;border:1px solid transparent;border-radius:6px;background:transparent;padding:2px 7px;cursor:pointer;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-stagebar-node[data-current="true"]{border-color:var(--dsw-alias-brand-primary,#4d6bfe);background:var(--dsw-alias-brand-primary-bg,rgba(77,107,254,.07))}',
    '.do-stagebar-node-label{font-size:10px;font-weight:600;white-space:nowrap}',
    '.do-stagebar-node-meta{font-size:8.5px;color:var(--dsw-alias-label-tertiary,#8b93a2);line-height:12px}',
    '.do-stagebar-node-meta{font-size:8.5px;color:var(--dsw-alias-label-tertiary,#8b93a2)}',
    '.do-stagebar-node-dot{width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-label-quaternary,#b6bbc3)}',
    '.do-stagebar-node[data-state="done"] .do-stagebar-node-dot{background:var(--dsw-alias-state-success-primary,#22c55e)}',
    '.do-stagebar-node[data-state="blocked"] .do-stagebar-node-dot{background:var(--dsw-alias-state-warning-primary,#d97706)}',
    '.do-stagebar-node[data-state="draft"] .do-stagebar-node-dot{background:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-stagebar-subs{display:flex;gap:12px;align-items:center;margin-top:3px;flex-wrap:wrap}',
    '.do-stagebar-subgroup{display:flex;align-items:center;gap:3px;flex-wrap:wrap}',
    '.do-stagebar-sublabel{font-size:8px;font-weight:700;color:var(--dsw-alias-label-tertiary,#8b93a2);margin-right:2px}',
    '.do-stagebar-sub{font-size:8.5px;line-height:16px;padding:0 4px;border-radius:3px;color:var(--dsw-alias-label-tertiary,#8b93a2);background:var(--dsw-alias-bg-l2,#f4f5f7)}',
    '.do-stagebar-sub[data-active="true"]{color:var(--dsw-alias-state-business-primary,#4176e6);background:var(--dsw-alias-brand-primary-bg,rgba(77,107,254,.08));font-weight:600}',
    '.do-stagebar-tools{display:flex;justify-content:flex-end;margin-top:3px}',
    '.do-stagebar-cards{margin-top:6px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));padding-top:5px}',
    '.do-stagebar-cards-head{font-size:9px;font-weight:700;color:var(--dsw-alias-label-tertiary,#8b93a2);margin-bottom:3px}',
    '.do-stagebar-card{display:flex;align-items:center;gap:6px;font-size:10px;line-height:22px;color:var(--dsw-alias-label-primary,#171a20)}',
    '.do-stagebar-card-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-quaternary,#b6bbc3);flex:none}',
    '.do-stagebar-card-dot[data-state="approved"]{background:var(--dsw-alias-state-success-primary,#22c55e)}',
    '.do-stagebar-card-dot[data-state="blocked"]{background:var(--dsw-alias-state-warning-primary,#d97706)}',
    '.do-stagebar-card-dot[data-state="reviewed"]{background:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-stagebar-card-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.do-stagebar-card-status{font-size:9px;color:var(--dsw-alias-label-tertiary,#8b93a2)}',
    '.do-stagebar-card-open{border:0;background:transparent;color:var(--dsw-alias-state-business-primary,#4176e6);font-size:9.5px;cursor:pointer;padding:0 2px}'
    ,'.do-stagebar-card{width:100%;border:0;background:transparent;text-align:left;cursor:pointer;padding:1px 0}',
    '.do-turn-tail .do-stagebar{width:100%;max-width:var(--dsh-chat-content-width,920px);margin:0}',
    '.do-stagebar-empty{font-size:9.5px;color:var(--dsw-alias-label-tertiary,#8b93a2)}',
    '.do-stagebar-gate{display:flex;align-items:center;gap:5px;margin-top:4px;padding-top:4px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));font-size:9.5px;line-height:16px;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-stagebar-gate-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-stagebar-gate-dot[data-state="blocked"]{background:var(--dsw-alias-state-warning-primary,#d97706)}',
    '.do-stagebar-gate-meta{color:var(--dsw-alias-label-tertiary,#8b93a2)}',
    '.do-turn-card-hint{font-size:10.5px;color:var(--dsw-alias-brand-primary,#4d6bfe);background:var(--dsw-alias-brand-primary-bg,rgba(77,107,254,.08));border:1px solid var(--dsw-alias-brand-primary-border,rgba(77,107,254,.2));border-radius:6px;padding:5px 8px;margin-top:-2px}',
    '.do-gatedock{border:1px solid var(--dsw-alias-state-business-primary,#4176e6);border-radius:var(--dsw-radius-md,12px);padding:10px 12px;margin:8px 0;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4176e6) 6%,var(--dsw-alias-bg-layer-1,#fff))}',
    '.do-gatedock-head{display:flex;align-items:center;gap:7px;min-width:0}',
    '.do-gatedock-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#0f1115)}',
    '.do-gatedock-meta{margin-left:auto;font-size:10.5px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-gatedock-roles{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px}',
    '.do-gatedock-btn{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.14));border-radius:7px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#0f1115);font-size:11px;line-height:26px;padding:0 10px;cursor:pointer}',
    '.do-gatedock-btn[data-variant=primary]{background:var(--dsw-alias-state-business-primary,#4176e6);border-color:var(--dsw-alias-state-business-primary,#4176e6);color:var(--dsw-alias-label-primary-foreground,#fff)}',
    '.do-gatedock-btn:hover{filter:brightness(.97)}',
    '.do-prov{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-gap{display:flex;gap:6px;align-items:flex-start;padding:3px 0;font-size:11px;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-gap .do-dot{margin-top:5px;flex:none}',
    '.do-impact{display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:7px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));font-size:11.5px;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-impact b{color:var(--dsw-alias-label-primary,#0f1115);font-weight:600}',
    '.do-cols{margin-top:8px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}',
    '.do-modal{margin-top:10px;max-height:62vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-l2,#f7f8fa);color:var(--dsw-alias-label-primary,#0f1115);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:10px;overflow:auto}',
    '.do-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}',
    '.do-modal-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,#0f1115)}',
    '.do-modal-x{border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#81858c);font-size:18px;line-height:1;cursor:pointer;padding:2px 6px}',
    '.do-modal-body{padding:14px 16px 18px;overflow:auto}',
    '.do-canvas{display:flex;align-items:center;gap:12px;margin-bottom:12px}',
    '.do-canvas-col{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}',
    '.do-canvas-node{padding:8px 10px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:8px;background:var(--dsw-alias-bg-l2,#f7f8fa);font-size:11.5px;color:var(--dsw-alias-label-primary,#0f1115)}',
    '.do-canvas-target{border-color:var(--dsw-alias-brand-primary,#4d6bfe);background:var(--dsw-alias-brand-primary-bg,rgba(77,107,254,.08))}',
    '.do-canvas-arrow{color:var(--dsw-alias-label-tertiary,#81858c);font-size:18px;flex:none}',
    '.do-artifact{margin:0;padding:10px;border-radius:8px;background:var(--dsw-alias-bg-l2,#f7f8fa);font-size:11px;line-height:1.6;white-space:pre-wrap;word-break:break-word;max-height:52vh;overflow:auto}',
    '.do-timeline{display:flex;flex-direction:column;gap:6px;margin-top:6px}',
    '.do-timeline-row{display:flex;gap:8px;font-size:11px;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-timeline-time{flex:none;width:42px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-task{display:flex;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.05));font-size:11.5px}',
    '.do-task:first-child{border-top:0}',
    '.do-task-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.do-progress{width:64px;height:5px;border-radius:999px;background:var(--dsw-alias-bg-l3,#eef0f3);overflow:hidden;flex:none}',
    '.do-progress > i{display:block;height:100%;background:var(--dsw-alias-brand-primary,#4d6bfe)}',
    '.do-task-meta{flex:none;font-size:10.5px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-copy{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#81858c);margin-left:6px}',
    '.do-graph-scroll{margin-top:8px;max-height:360px;overflow:auto;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));border-radius:8px;background:var(--dsw-alias-bg-l2,#f7f8fa)}',
    '.do-graph{display:block}',
    '.do-graph-edge{fill:none;stroke:var(--dsw-alias-border-l2,rgba(0,0,0,.18));stroke-width:1.2}',
    '.do-graph-arrow{fill:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-graph-node rect{fill:var(--dsw-alias-bg-overlay,#fff);stroke:var(--dsw-alias-border-l1,rgba(0,0,0,.12));stroke-width:1}',
    '.do-graph-node[data-target="true"] rect{fill:var(--dsw-alias-brand-primary-bg,rgba(77,107,254,.08));stroke:var(--dsw-alias-brand-primary,#4d6bfe)}',
    '.do-graph-label{font-size:9.5px;font-weight:600;fill:var(--dsw-alias-label-primary,#0f1115)}',
    '.do-graph-sub{font-size:8px;fill:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-graph-legend{display:flex;gap:10px;align-items:center;margin-top:6px;font-size:10px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-substages{display:flex;gap:4px;flex-wrap:wrap;margin-top:7px}',
    '.do-substage-groups{display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px}',
    '.do-substage-group{display:flex;align-items:center;gap:4px;flex-wrap:wrap}',
    '.do-substage-label{font-size:9px;font-weight:700;color:var(--dsw-alias-label-tertiary,#8b93a2);margin-right:2px}',

    '.do-substage{font-size:9px;line-height:18px;padding:0 6px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));color:var(--dsw-alias-label-tertiary,#8b93a2);background:var(--dsw-alias-bg-l2,#f4f5f7)}',
    '.do-substage[data-s="done"]{color:var(--dsw-alias-success-primary,#067647);background:var(--dsw-alias-success-bg,#ecfdf3);border-color:var(--dsw-alias-success-border,#bbf7d0)}',
    '.do-substage[data-s="active"]{color:var(--dsw-alias-brand-primary,#4f5ed7);background:var(--dsw-alias-brand-primary-bg,#eef0ff);border-color:var(--dsw-alias-brand-primary-border,#dde2ff);font-weight:600}',

    '.do-doc{height:100%;overflow:auto;padding:16px 18px;box-sizing:border-box;color:var(--dsw-alias-label-primary,#171a20);font-size:12px;line-height:1.55;background:var(--dsw-alias-bg-layer-1,#fff);container-type:inline-size}',
    '.do-doc-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}',
    '.do-doc-badge{font-size:10px;line-height:18px;padding:0 6px;border-radius:5px;background:var(--dsw-alias-brand-primary-bg,rgba(77,107,254,.08));color:var(--dsw-alias-state-business-primary,#4176e6);font-weight:600}',
    '.do-doc-name{font-size:13px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.do-doc-meta{font-size:10px;color:var(--dsw-alias-label-tertiary,#8b93a2)}',
    '.do-doc-toggle{margin-left:auto;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#61666b);font-size:10px;line-height:22px;padding:0 7px;cursor:pointer}',
    '.do-doc-toggle:hover{border-color:var(--dsw-alias-state-business-primary,#4176e6);color:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-doc-summary{margin-top:10px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));border-radius:8px;background:var(--dsw-alias-bg-l2,#f7f8fa)}',
    '.do-doc-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
    '.do-doc-facts > div{min-width:0}',
    '.do-doc-facts b{display:block;font-size:18px;line-height:22px;font-weight:700}',
    '.do-doc-facts span{display:block;font-size:9px;color:var(--dsw-alias-label-tertiary,#8b93a2)}',
    '.do-doc-jobs{display:flex;flex-direction:column;gap:3px;margin-top:6px;max-height:190px;overflow:auto}',
    '.do-doc-job{display:flex;align-items:center;gap:6px;font-size:10px;line-height:17px;min-width:0}',
    '.do-doc-jobtype{flex:none;font-size:8px;line-height:15px;padding:0 4px;border-radius:3px;background:var(--dsw-alias-bg-overlay,#eef0f5);color:var(--dsw-alias-label-secondary,#61666b);font-family:ui-monospace,Menlo,monospace}',
    '.do-doc-job b{font-weight:600;color:var(--dsw-alias-label-primary,#171a20);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.do-doc-jobparent{font-size:9px;color:var(--dsw-alias-label-tertiary,#8b93a2);margin-left:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.do-doc-line{grid-column:1/-1;font-size:10px;color:var(--dsw-alias-label-secondary,#61666b);word-break:break-word}',
    '.do-doc-props{display:flex;flex-direction:column;gap:2px;max-height:220px;overflow:auto}',
    '.do-doc-prop{display:flex;gap:10px;font-size:10px;padding:2px 0;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.04))}',
    '.do-doc-prop code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-state-business-primary,#4176e6);flex:none}',
    '.do-doc-prop span{color:var(--dsw-alias-label-secondary,#61666b);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.do-doc-muted{font-size:10px;color:var(--dsw-alias-label-tertiary,#8b93a2)}',
    '.do-doc-types{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}',
    '.do-doc-type{font-size:8px;line-height:15px;padding:0 5px;border-radius:3px;background:var(--dsw-alias-bg-overlay,#eef0f5);color:var(--dsw-alias-label-secondary,#61666b);font-family:ui-monospace,Menlo,monospace}',
    '.do-lineage-inline{display:flex;justify-content:center;padding:12px 10px 16px;background:var(--dsw-alias-bg-l2,#f7f8fa)}',
    '.do-lineage-inline > .do-label{margin-bottom:7px}',
    '.do-sched-card{display:grid;grid-template-columns:minmax(0,1fr);gap:7px;margin-top:4px;min-width:0}',
    '.do-sched-card[data-density="focus"]{grid-template-columns:minmax(0,1fr) 210px;align-items:stretch;min-height:330px}',
    '.do-sched-graph{min-width:0;min-height:0;overflow:hidden}',
    '.do-sched-side{min-width:0;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));padding-top:7px}',
    '.do-sched-card[data-density="focus"] .do-sched-side{border-top:0;border-left:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));padding:0 0 0 10px}',
    '.do-sched-card .do-doc-lts-meta{grid-column:1/-1}',
    '.do-sched-inspector{min-width:0}',
    '.do-sched-name{font-size:12px;font-weight:700;line-height:17px;margin:1px 0 3px;overflow-wrap:anywhere}',
    '.do-sched-kv{display:grid;grid-template-columns:42px minmax(0,1fr);gap:3px 6px;margin-top:8px;font-size:9px}',
    '.do-sched-kv span{color:var(--dsw-alias-label-tertiary,#8b93a2)}',
    '.do-sched-extra{display:flex;flex-direction:column;gap:3px;margin-top:8px;padding-top:7px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.05))}',
    '.do-sched-extra div{display:flex;gap:5px;font-size:9px;min-width:0}',
    '.do-sched-extra span{color:var(--dsw-alias-label-tertiary,#8b93a2);flex:none}',
    '.do-sched-extra b{font-weight:500;color:var(--dsw-alias-label-secondary,#61666b);overflow-wrap:anywhere}',
    '.do-sched-kv b{font-weight:500;color:var(--dsw-alias-label-secondary,#61666b);overflow-wrap:anywhere}',
    '.do-sched-group-frame rect{fill:color-mix(in srgb,var(--dsw-alias-state-success-bg,#eaf7f1) 45%,transparent);stroke:var(--dsw-alias-state-success-line,#c5e8d9);stroke-dasharray:4 3;rx:9}',
    '.do-sched-group-label{font-size:9px;font-weight:700;fill:var(--dsw-alias-state-success-primary,#17835c);letter-spacing:.02em}',
    '.do-doc-dag-node[data-selected="true"] rect{stroke:var(--dsw-alias-state-business-primary,#4176e6);stroke-width:1.5}',
    '.do-doc-dag-node[role="button"]{cursor:pointer}',
    '.do-doc-dag-node[role="button"]:focus rect{stroke:var(--dsw-alias-state-business-primary,#4176e6);stroke-width:1.5}',
    '.do-doc-split[data-focus="true"] .do-doc-panes{grid-template-columns:1fr}',
    '.do-doc-split[data-focus="true"] .do-doc-editor{display:none}',
    '.do-doc-lts-meta{display:flex;flex-wrap:wrap;gap:3px 8px;margin:4px 0 2px;font-size:9px;color:var(--dsw-alias-label-tertiary,#8b93a2)}',
    '.do-doc-types-inline{font-family:ui-monospace,Menlo,monospace;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-doc-graph{margin-top:8px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));border-radius:9px;background:var(--dsw-alias-bg-layer-1,#fff)}',
    '.do-doc-graph-head{display:flex;align-items:center;gap:7px;min-width:0;margin-bottom:2px}',
    '.do-doc-graph-title{font-size:10px;font-weight:700;color:var(--dsw-alias-label-primary,#171a20);flex:none}',
    '.do-doc-graph-task{font-family:ui-monospace,Menlo,monospace;font-size:9px;color:var(--dsw-alias-state-business-primary,#4176e6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.do-doc-graph-meta{margin-left:auto;font-size:8.5px;color:var(--dsw-alias-label-tertiary,#8b93a2);flex:none}',
    '.do-doc-dag-node[data-kind="group"] rect{stroke:var(--dsw-alias-state-success-primary,#22c55e)}',
    '.do-doc-dag-node[data-kind="tskdep"] rect{stroke:var(--dsw-alias-state-warn-primary,#f59e0b)}',
    '.do-doc-dag-node[data-kind="url"] rect{stroke:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-doc-dag-node[data-kind="start"] rect{fill:var(--dsw-alias-brand-primary-bg,rgba(77,107,254,.08));stroke:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-doc-dag-scroll{margin-top:5px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));border-radius:6px;overflow:auto;background:var(--dsw-alias-bg-layer-1,#fff)}',
    '.do-doc-dag{display:block;min-width:100%;max-width:none}',
    '.do-doc-dag-edge{fill:none;stroke:var(--dsw-alias-label-quaternary,#b6bbc3);stroke-width:1}',
    '.do-doc-dag-node rect{fill:var(--dsw-alias-bg-l2,#f7f8fa);stroke:var(--dsw-alias-border-l2,rgba(0,0,0,.12));stroke-width:1}',
    '.do-doc-dag-node[data-type="url"] rect{stroke:var(--dsw-alias-state-business-primary,#4176e6)}',
    '.do-doc-dag-node[data-type="tskdep"] rect{stroke:var(--dsw-alias-state-warn-primary,#f59e0b)}',
    '.do-doc-dag-node[data-type="group"] rect{stroke:var(--dsw-alias-state-success-primary,#22c55e)}',
    '.do-doc-dag-name{font-size:8px;fill:var(--dsw-alias-label-primary,#171a20);font-family:ui-monospace,Menlo,monospace}',
    '.do-doc-dag-type{font-size:6.5px;fill:var(--dsw-alias-label-tertiary,#8b93a2);font-family:ui-monospace,Menlo,monospace}',
    '.do-doc-source-wrap{margin-top:10px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));border-radius:8px;overflow:hidden}',
    '.do-doc-source{margin:0;padding:12px 14px;max-height:58vh;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;line-height:1.65;white-space:pre;color:var(--dsw-alias-label-secondary,#61666b);background:var(--dsw-alias-bg-l2,#f7f8fa)}',
    '@media(max-width:640px){.do-doc{padding:12px}.do-doc-facts{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '.do-workbench-entry{display:flex;flex-direction:column;gap:4px;padding:2px 0 0}',
    '.do-workbench-line{display:flex;justify-content:space-between;gap:10px;font-size:10px;line-height:18px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-workbench-line b{font-weight:500;color:var(--dsw-alias-label-primary,#171a20);text-align:right;max-width:210px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.do-workbench-open{margin-top:6px;align-self:flex-start}',

    '.do-graph-legend span{display:inline-flex;align-items:center;gap:4px}',
    '.do-dev-validation{margin-top:8px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));padding-top:6px}',
    '.do-dev-row{display:flex;align-items:center;gap:6px;font-size:10.5px;line-height:23px;min-width:0}',
    '.do-dev-label{width:46px;flex:none;font-weight:600;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-dev-attempt{font-size:9px;color:var(--dsw-alias-label-tertiary,#8b93a2);flex:none}',
    '.do-dev-detail{min-width:0;color:var(--dsw-alias-label-secondary,#61666b);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.do-dev-attempts{margin-top:4px;padding-top:4px;border-top:1px dashed var(--dsw-alias-border-l2,rgba(0,0,0,.12))}',
    '.do-dev-attempt-line{font-size:9px;line-height:16px;color:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-dev-gates{margin-top:8px;padding-top:7px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}',
    '.do-dev-gate-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:5px}',
    '.do-dev-warning{display:flex;align-items:center;gap:8px;justify-content:space-between;margin-top:7px;padding:6px 8px;border-radius:6px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#f59e0b) 10%,transparent);color:var(--dsw-alias-state-warn-primary,#b45309);font-size:10px}',
    '.do-dev-artifacts{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-top:7px}',
    '.do-cicd-pipeline{display:flex;gap:5px;flex-wrap:wrap;margin:7px 0;padding:7px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.07));border-radius:8px;background:var(--dsw-alias-bg-l2,#f7f8fa)}',
    '.do-cicd-step{display:flex;align-items:center;gap:4px;padding:2px 6px;border-radius:5px;background:var(--dsw-alias-bg-overlay,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.07))}',
    '.do-cicd-step[data-state="passed"]{border-color:var(--dsw-alias-state-success-primary,#22c55e)}',
    '.do-cicd-step[data-state="failed"]{border-color:var(--dsw-alias-state-warning-primary,#d97706)}',
    '.do-cicd-step-name{font-size:10px;font-weight:600}',
    '.do-cicd-artifact{margin-top:7px;padding:8px;border:1px solid var(--dsw-alias-state-business-primary,#4176e6);border-radius:7px;background:var(--dsw-alias-brand-primary-bg,rgba(77,107,254,.06))}',
    '.do-cicd-env{margin-top:8px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));padding-top:6px}',
    '.do-cicd-envs{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}',
    '.do-cicd-envnode{display:flex;flex-direction:column;gap:1px;min-width:58px;padding:4px 6px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:5px;background:var(--dsw-alias-bg-l2,#f7f8fa)}',
    '.do-cicd-envname{font-size:9px;font-weight:600;text-transform:uppercase;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-cicd-envstatus{font-size:8.5px;color:var(--dsw-alias-label-tertiary,#8b93a2)}',
    '.do-cicd-envnode[data-state="deployed"] .do-cicd-envstatus{color:var(--dsw-alias-state-success-primary,#22c55e)}',
    '.do-cicd-envnode[data-state="pending"] .do-cicd-envstatus{color:var(--dsw-alias-state-warning-primary,#d97706)}',
    '.do-map-path{display:flex;align-items:stretch;gap:5px;flex-wrap:wrap;margin:7px 0;padding:8px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.07));border-radius:8px;background:var(--dsw-alias-bg-l2,#f7f8fa)}',
    '.do-map-node{display:flex;flex-direction:column;gap:2px;min-width:92px;max-width:190px;padding:5px 8px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:7px;background:var(--dsw-alias-bg-overlay,#fff);font-size:10.5px;color:var(--dsw-alias-label-primary,#0f1115);overflow:hidden}',
    '.do-map-node b{font-size:8px;font-weight:700;color:var(--dsw-alias-label-tertiary,#8b93a2);text-transform:uppercase;letter-spacing:.04em}',
    '.do-map-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10.5px}',
    '.do-map-arrow{display:flex;align-items:center;color:var(--dsw-alias-label-tertiary,#9aa0a8);font-size:11px}',
    '.do-assets{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:6px;margin-top:6px}',
    '.do-asset{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:7px;background:var(--dsw-alias-bg-l2,#f7f8fa);padding:7px 8px;min-width:0}',
    '.do-asset-head{display:flex;align-items:center;gap:5px;min-width:0}',
    '.do-asset-name{font-size:10.5px;font-weight:600;color:var(--dsw-alias-label-primary,#0f1115);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.do-asset-meta{font-size:9px;color:var(--dsw-alias-label-tertiary,#81858c);margin-top:3px}',
    '.do-asset-fields{display:flex;gap:3px;flex-wrap:wrap;margin-top:5px}',
    '.do-asset-fields .do-chip{font-size:8.5px;padding:1px 4px}',
    '.do-signoff-toast[data-tone="error"]{border-color:var(--dsw-alias-state-error-primary,#dc2626);color:var(--dsw-alias-state-error-primary,#b91c1c)}',
    '.do-signoff-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:150;border:1px solid var(--dsw-alias-state-success-primary,#22c55e);background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#0f1115);border-radius:8px;padding:7px 12px;font-size:11px;box-shadow:0 6px 24px rgba(15,23,42,.16)}',
    '.do-signoff-host-mask{position:fixed;inset:0;z-index:140;background:rgba(15,23,42,.42);display:flex;align-items:center;justify-content:center;padding:24px}',
    '.do-signoff-host{width:min(560px,calc(100vw - 32px));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#0f1115);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));border-radius:12px;box-shadow:0 18px 60px rgba(15,23,42,.28);padding:14px}',
    '.do-signoff-host-head{display:flex;align-items:center;gap:8px}',
    '.do-signoff-host-title{font-size:14px;font-weight:600}',
    '.do-signoff-host-x{margin-left:auto;border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#81858c);font-size:11px;cursor:pointer}',
    '.do-signoff-host-meta{margin-top:5px;font-size:11px;color:var(--dsw-alias-label-secondary,#61666b)}',
    '.do-signoff-host-label{margin-top:12px;font-size:10px;color:var(--dsw-alias-label-tertiary,#8b93a2)}',
    '.do-signoff-host-preview{margin:6px 0 0;padding:9px;border-radius:7px;background:var(--dsw-alias-bg-l2,#f7f8fa);color:var(--dsw-alias-label-primary,#0f1115);font-size:11px;line-height:1.6;white-space:pre-wrap;word-break:break-word;max-height:150px;overflow:auto}',
    '.do-signoff-host-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:12px;flex-wrap:wrap}',
    '.do-signoff-host-btn{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.14));border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary,#0f1115);font-size:11px;line-height:28px;padding:0 10px;cursor:pointer}',
    '.do-signoff-host-primary{background:var(--dsw-alias-state-business-primary,#4176e6);border-color:var(--dsw-alias-state-business-primary,#4176e6);color:var(--dsw-alias-label-primary-foreground,#fff)}',
    '.do-card-modal-mask{position:fixed;inset:0;z-index:120;background:rgba(15,23,42,.38);display:flex;align-items:center;justify-content:center;padding:24px}',
    '.do-card-modal{width:min(920px,calc(100vw - 48px));max-height:min(86vh,900px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));border-radius:12px;box-shadow:0 18px 60px rgba(15,23,42,.25);overflow:hidden}',
    '.do-card-modal-head{display:flex;align-items:center;gap:8px;padding:10px 13px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));flex:none}',
    '.do-card-modal-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#0f1115)}',
    '.do-card-modal-close{margin-left:auto;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.14));border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#61666b);font-size:10px;line-height:22px;padding:0 8px;cursor:pointer}',
    '.do-card-modal-body{overflow:auto;min-height:0;padding:0 2px 4px}',
    '.do-card-modal-body .do-card{border:0;border-radius:0;margin:0}',
    '.do-graph-v2{margin-top:8px}',
    '.do-graph-v2-scroll{overflow-x:auto;overflow-y:hidden;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.07));border-radius:9px;background:var(--dsw-alias-bg-l2,#f7f8fa)}',
    '.do-graph-v2-svg{display:block;width:100%;min-width:0;height:auto}',
    '.do-graph-v2-col-label{font-size:8px;font-weight:700;letter-spacing:.05em;fill:var(--dsw-alias-label-quaternary,#9aa0a8)}',
    '.do-graph-v2-node rect{fill:var(--dsw-alias-bg-overlay,#fff);stroke:var(--dsw-alias-border-l2,rgba(0,0,0,.16));stroke-width:1}',
    '.do-graph-v2-node[data-target="true"] rect{fill:var(--dsw-alias-brand-primary-bg,rgba(77,107,254,.1));stroke:var(--dsw-alias-brand-primary,#4d6bfe);stroke-width:1.5}',
    '.do-graph-v2-node[data-kind="etl_job"] rect{fill:var(--dsw-alias-bg-layer-2,#f2f4f8)}',
    '.do-graph-v2-node[data-planned="true"] rect{stroke-dasharray:3 2}',
    '.do-graph-v2-label{font-size:9px;font-weight:600;fill:var(--dsw-alias-label-primary,#0f1115)}',
    '.do-graph-v2-meta{font-size:7.5px;fill:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-graph-v2-edge{fill:none;stroke:var(--dsw-alias-border-l2,rgba(0,0,0,.25));stroke-width:1.1}',
    '.do-graph-v2-edge[data-planned="true"]{stroke-dasharray:3 2}',
    '.do-graph-v2-arrow{fill:var(--dsw-alias-label-tertiary,#81858c)}',
    '.do-graph-v2-legend{display:flex;gap:12px;align-items:center;margin-top:6px;font-size:9.5px;color:var(--dsw-alias-label-tertiary,#81858c);flex-wrap:wrap}',
    '.do-graph-v2-legend span{display:inline-flex;align-items:center;gap:4px}',
    '.do-legend-line{display:inline-block;width:14px;height:0;border-top:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.3))}',
    '.do-legend-line[data-planned="true"]{border-top-style:dashed}',
    '.do-legend-dot{display:inline-block;width:7px;height:7px;border-radius:2px;background:var(--dsw-alias-brand-primary-bg,rgba(77,107,254,.2));border:1px solid var(--dsw-alias-brand-primary,#4d6bfe)}',
    '.do-cicd-pipeline{background:color-mix(in srgb,var(--dsw-alias-label-primary,#0f1115) 5%,var(--dsw-alias-bg-layer-1,#fff))}',
    '.do-cicd-step,.do-cicd-envnode{background:color-mix(in srgb,var(--dsw-alias-label-primary,#0f1115) 3%,var(--dsw-alias-bg-layer-1,#fff))}',
    '.do-cicd-artifact{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4176e6) 9%,var(--dsw-alias-bg-layer-1,#fff))}',
    '.do-pill{background:color-mix(in srgb,var(--dsw-alias-label-primary,#0f1115) 8%,var(--dsw-alias-bg-layer-1,#fff))}',
    '@media (prefers-color-scheme:dark){',
    '  .do-cicd-step,.do-cicd-envnode{background:var(--dsw-alias-bg-layer-2,#20242c);border-color:var(--dsw-alias-border-l2,#353b47)}',
    '  .do-cicd-artifact{background:var(--dsw-alias-brand-primary-bg,#182238);border-color:var(--dsw-alias-state-business-primary,#4d6bfe)}',
    '  .do-signoff-host-preview,.do-map-path,.do-map-node,.do-asset,.do-gatedock{background:var(--dsw-alias-bg-layer-2,#20242c);border-color:var(--dsw-alias-border-l2,#353b47)}',
    '  .do-pill{background:var(--dsw-alias-bg-overlay,#2a303b);color:var(--dsw-alias-label-secondary,#c7ccd6)}',
    '  .do-pill[data-tone=brand]{background:rgba(77,107,254,.18)}',
    '  .do-pill[data-tone=pass]{background:rgba(34,197,94,.16)}',
    '  .do-pill[data-tone=warn]{background:rgba(245,158,11,.16)}',
    '  .do-cicd-envname{color:var(--dsw-alias-label-secondary,#c7ccd6)}',
    '}',
    '@media(max-width:640px){.do-grid{grid-template-columns:1fr;gap:2px}}'
  ].join('\n')

  function installStyles(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null)
    if (!doc || doc.getElementById(STYLE_ID)) return
    var style = doc.createElement('style')
    style.id = STYLE_ID
    style.setAttribute('data-plugin', '@dataops/dsh-dataops-client')
    style.textContent = CSS
    doc.head.appendChild(style)
  }

  function textParts(block) {
    if (!block) return []
    var c = block.content
    if (typeof c === 'string') return [c]
    if (!Array.isArray(c)) return []
    var out = []
    for (var i = 0; i < c.length; i++) if (c[i] && typeof c[i].text === 'string') out.push(c[i].text)
    return out
  }

  function normalizePayload(model) {
    if (!model || typeof model !== 'object') return model
    var kind = String(model.kind || '')
    var listFields = {
      requirement: ['nonGoals', 'acceptance', 'impacts', 'constraints', 'gaps', 'evidence'],
      design: ['sources', 'metrics', 'quality', 'designEvidence', 'evidenceTrace', 'evidence', 'gaps', 'steps'],
      analysis: ['questions', 'findings', 'baseline', 'candidates', 'gaps', 'evidence'],
      solution: ['options', 'decisions', 'alternatives', 'dependencies', 'constraints', 'risks', 'gaps'],
      tech_plan: ['tasks', 'dependencies', 'risks', 'gaps'],
      develop: ['artifacts', 'tasks', 'gaps'],
      cicd: ['reports', 'checks', 'gaps'],
      table: ['columns', 'gaps'],
      lineage: ['nodes', 'edges', 'downstream', 'gaps'],
      profile: ['candidateKeys', 'joinCoverage', 'columns', 'findings', 'gaps'],
      evidence: ['gaps'],
      release: ['steps', 'approvals', 'gaps'],
      postmortem: ['metrics', 'issues', 'actions', 'gaps'],
      incident: ['timeline', 'actions', 'gaps'],
      stage: ['approvals', 'gaps'],
      'us-picker': ['items'],
      'us': ['items']
    }
    var fields = listFields[kind] || []
    fields.forEach(function (field) { model[field] = asArray(model[field]) })
    if (kind === 'requirement') model.scope = displayValue(model.scope, '—')
    if (kind === 'design') {
      model.target = model.target && typeof model.target === 'object' ? model.target : {}
      model.target.primaryKey = asArray(model.target.primaryKey)
      var dm = model.dataMap && typeof model.dataMap === 'object' ? model.dataMap : (model.datamap && typeof model.datamap === 'object' ? model.datamap : {})
      dm.path = asPath(dm.path || model.dataMapPath || [])
      dm.assets = asArray(dm.assets)
      model.dataMap = dm
    }
    if (kind === 'analysis') {
      model.candidates = asArray(model.candidates).map(function (candidate) {
        if (candidate && typeof candidate === 'object') candidate.pros = asArray(candidate.pros)
        return candidate
      })
      model.recommendation = model.recommendation && typeof model.recommendation === 'object' ? model.recommendation : {}
      model.recommendation.rationale = asArray(model.recommendation.rationale)
    }
    if (kind === 'solution') {
      model.options = asArray(model.options).map(function (option) {
        if (option && typeof option === 'object') option.pros = asArray(option.pros)
        return option
      })
      model.scope = model.scope && typeof model.scope === 'object' ? displayValue(model.scope, '—') : model.scope
    }
    if (kind === 'tech_plan' && model.rollback && typeof model.rollback === 'object') {
      model.rollback.steps = asArray(model.rollback.steps)
      model.rollback.materials = asArray(model.rollback.materials)
    }
    if (kind === 'develop' && model.validation && typeof model.validation === 'object') {
      Object.keys(model.validation).forEach(function (key) {
        var item = model.validation[key]
        if (item && typeof item === 'object') {
          item.attempts = asArray(item.attempts)
          item.blocking = asArray(item.blocking)
        }
      })
    }
    if (kind === 'us-picker' || kind === 'us') {
      var items = asArray(model.items)
      if (model.item && typeof model.item === 'object') items = items.concat([model.item])
      items.forEach(function (item) {
        if (!item || typeof item !== 'object') return
        item.acceptance = asArray(item.acceptance)
        item.assets = asArray(item.assets)
        item.impacts = asArray(item.impacts)
      })
      if (kind === 'us-picker') model.items = items
    }
    return model
  }

  function parseModel(block, kind) {
    var parts = textParts(block)
    for (var i = parts.length - 1; i >= 0; i--) {
      var s = String(parts[i]).trim()
      if (s.charAt(0) !== '{') continue
      try {
        var o = JSON.parse(s)
        if (o && typeof o === 'object' && (!kind || o.kind === kind || o.kind === kind.replace(/_/g, '-'))) return normalizePayload(o)
      } catch (e) { /* not the payload */ }
    }
    return null
  }

  // ---------- atoms ----------

  function Dot(props) { return h('span', { className: 'do-dot', 'data-tone': props.tone || 'brand' }) }
  function Pill(props) { return h('span', { className: 'do-pill', 'data-tone': props.tone || 'default' }, props.children) }
  function Btn(props) {
    return h('button', {
      type: 'button',
      className: 'do-btn',
      'data-variant': props.variant || 'outline',
      onClick: props.onClick || undefined
    }, props.children)
  }

  function Frame(props) {
    return h('div', { className: 'do-card', 'data-state': props.state || 'ok' },
      h('div', { className: 'do-head' },
        h(Dot, { tone: props.tone || 'brand' }),
        h('span', { className: 'do-title' }, props.title),
        props.pills || null,
        h('span', { className: 'do-spacer' }),
        props.actions || null
      ),
      props.children,
      props.footer ? h('div', { className: 'do-foot' }, props.footer) : null
    )
  }

  function Fallback(props) {
    var txt = textParts(props.block).join('\n') || '（无结果）'
    return h('div', { className: 'do-card' }, h('div', { className: 'do-muted' }, txt))
  }

  function Gaps(props) {
    var gaps = props.gaps || []
    if (!gaps.length) return null
    return h('div', null,
      h('div', { className: 'do-label' }, '待补充（' + gaps.length + '）'),
      gaps.map(function (item, i) {
        return h('div', { key: i, className: 'do-gap' },
          h('span', { className: 'do-dot', 'data-tone': item.severity === 'blocking' ? 'fail' : 'warn' }),
          h('span', null, item.message))
      })
    )
  }

  function Impact(props) {
    var impact = props.impact
    if (!impact) return null
    return h('div', { className: 'do-impact' },
      h('span', { className: 'do-dot' }),
      h('span', null, '影响 ', h('b', null, impact.count), ' 个下游'),
      impact.truncated ? h('span', { className: 'do-muted' }, '（已截断）') : null
    )
  }

  function deliverablePath(m) {
    return m && (m.deliverable || m.artifact) || null
  }

  function composeMessage(text) {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('dataops:compose', { detail: { text: String(text) } }))
    }
  }

  function actionId() {
    var n = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    return 'ui-' + n
  }

  function signoff(gate, role, actor, comment) {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('dataops:signoff-request', { detail: { gate: gate, role: role, actor: actor || role, comment: comment || null } }))
      return
    }
    // Headless/legacy fallback: keep the same user-message contract.
    return composeMessage('【签收】gate=' + gate + ' role=' + role + ' actionId=' + actionId() + ' actor=' + (actor || role) + (comment ? ' comment=' + comment : ''))
  }

  function returnGate(gate, role, reason) {
    return composeMessage('【退回】gate=' + gate + ' role=' + role + ' actionId=' + actionId() + ' reason=' + (reason || '内容需要修改'))
  }

  function statusText(status) {
    if (status && typeof status === 'object') return displayValue(status, '—')
    return ({ pending: '待处理', in_progress: '进行中', blocked: '已阻塞', awaiting_approval: '待签收', done: '已完成', approved: '已签收', rejected: '已退回', draft: '草稿', reviewed: '已复核', returned: '已退回', passed: '已通过', deferred: '待评审', advisory_pending: '待确认', advisory_ok: '已确认', advisory_object: '有异议', signed: '已签收' })[status] || status || '—'
  }

  function evidenceChips(ids) {
    var arr = Array.isArray(ids) ? ids : []
    if (!arr.length) return null
    return h('div', { className: 'do-kv', style: { marginTop: '5px' } }, arr.slice(0, 8).map(function (item, i) {
      var label = typeof item === 'string' ? item : (item && (item.id || item.evidenceId || item.asOf || item.query || item.title)) || 'evidence'
      return h('span', { key: i, className: 'do-chip', title: typeof item === 'object' && item ? JSON.stringify(item).slice(0, 240) : '' }, String(label))
    }))
  }

  function SignoffPanel(props) {
    var m = props.model || {}
    var review = m.review || {}
    var gate = props.gate
    var roles = props.roles || []
    if (!roles.length) return null
    return h('div', { className: 'do-signoff' },
      h('span', { className: 'do-signoff-title' }, '签收'),
      roles.map(function (role) {
        var key = role.key
        var current = review[key]
        var st = typeof current === 'string' ? current : (current && current.status) || (key === 'se' || key === 'dev' ? 'deferred' : 'pending')
        return h('span', { key: key, className: 'do-kv', style: { gap: '4px' } },
          h('span', { className: 'do-pill', 'data-tone': st === 'approved' || st === 'signed' || st === 'advisory_ok' ? 'pass' : st === 'rejected' || st === 'advisory_object' ? 'warn' : undefined }, role.label + ' · ' + statusText(st)),
          (st === 'pending' || st === 'advisory_pending' || (role.key === 'committer' && st === 'waiting'))
            ? h(Btn, { variant: role.key === 'requester' ? 'primary' : 'ghost', onClick: function () { signoff(gate, role.key, role.actor, role.comment) } }, role.action || '签收')
            : null
        )
      })
    )
  }

  function asArray(value) {
    if (Array.isArray(value)) return value
    if (value === null || value === undefined || value === '') return []
    return [value]
  }

  function asPath(value) {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') return value.split(/\s*(?:→|->)\s*/).map(item => item.trim()).filter(Boolean)
    return value ? [value] : []
  }

  function DataMapPath(props) {
    var path = props.path
    if (!Array.isArray(path)) path = path && typeof path === 'object' ? [path] : []
    if (!path.length) return null
    function levelOf(item, index, total) {
      var raw = String(item && (item.level || item.type || item.kind || item.role) || '').toLowerCase()
      if (raw === 'physical_asset' || raw === 'asset' || raw === 'table') return '资产'
      if (raw === 'logical_entity' || raw === 'entity') return '实体'
      if (raw === 'business_object' || raw === 'bo') return '对象'
      if (raw === 'domain' || raw === 'theme') return '主题'
      if (raw === 'scenario' || raw === 'scene') return '场景'
      if (item && (item.assetType || item.layer || item.platform) && (item.id || item.name)) return '资产'
      var defaults = ['场景', '主题', '对象', '实体', '资产']
      return defaults[Math.min(index, defaults.length - 1)]
    }
    return h('div', { className: 'do-map-path' }, path.map(function (item, i) {
      var source = typeof item === 'string' ? { name: item } : (item || {})
      return h(React.Fragment, { key: i },
        i ? h('span', { className: 'do-map-arrow' }, '→') : null,
        h('span', { className: 'do-map-node' },
          h('b', null, levelOf(source, i, path.length)),
          h('span', { className: 'do-map-name' }, source.name || source.label || source.id || '—'))
      )
    }))
  }

  function AssetCards(props) {
    var assets = props.assets || []
    if (!assets.length) return null
    return h('div', { className: 'do-assets' }, assets.map(function (asset, i) {
      var fields = asset.fields
      var fieldList = Array.isArray(fields) ? fields : []
      var fieldCount = typeof fields === 'number' ? fields : fieldList.length
      return h('div', { key: i, className: 'do-asset' },
        h('div', { className: 'do-asset-head' },
          h('span', { className: 'do-dot', 'data-tone': 'brand' }),
          h('span', { className: 'do-asset-name' }, asset.id || asset.name || asset.table || '—'),
          h('span', { className: 'do-pill' }, asset.assetType || 'asset'),
          asset.layer ? h('span', { className: 'do-pill' }, asset.layer) : null
        ),
        h('div', { className: 'do-asset-meta' }, [asset.owner, asset.rowCount == null ? null : Number(asset.rowCount).toLocaleString() + ' 行', asset.platform].filter(Boolean).join(' · ')),
        fieldList.length ? h('div', { className: 'do-asset-fields' }, fieldList.slice(0, 6).map(function (f, j) { return h('span', { key: j, className: 'do-chip', title: f.description || '' }, f.name) })) : (fieldCount ? h('div', { className: 'do-asset-meta' }, fieldCount + ' 个字段') : null)
      )
    }))
  }

  function Timeband(props) {
    var t = props.timeband
    if (!t) return null
    var points = t.points || []
    return h('div', null,
      h('div', { className: 'do-timeband' }, points.map(function (p, i) {
        var pos = points.length > 1 ? (i / (points.length - 1)) * 94 + 3 : 50
        return h('span', { key: i, className: 'do-timeband-mark', style: { left: pos + '%' } }, p.label + ' ' + p.at, h('i'))
      })),
      h('div', { className: 'do-timeband-foot' }, h('span', null, '上游就绪 ' + (t.upstreamReadyAt || '—')), h('span', null, 'SLA ' + (t.sla || '—')), h('span', null, '余量 ' + (t.buffer || '—')))
    )
  }

  function LineageV2Preview(props) {
    var l = props.lineage || props.model || {}
    var graph = l.graph || { nodes: l.nodes || [], edges: l.edges || [] }
    var nodes = graph.nodes || []
    var edges = graph.edges || []
    var tables = nodes.filter(function (n) { return n.type === 'physical_table' })
    var target = tables.filter(function (n) { return String(n.label || n.id || '').indexOf(l.table || '') >= 0 }).pop() || tables[tables.length - 1]
    var columns = [[], [], [], [], []]
    function colOf(n) {
      if (n.type === 'schedule_task') return 0
      if (n.type === 'physical_table' && n === target) return 3
      if (n.type === 'physical_table') return 1
      if (n.type === 'etl_job') return 2
      return 4
    }
    nodes.forEach(function (n) { columns[colOf(n)].push(n) })
    if (!edges.length) {
      var jobs = nodes.filter(function (n) { return n.type === 'etl_job' })
      var upstream = nodes.filter(function (n) { return n.type === 'physical_table' && n !== target })
      nodes.filter(function (n) { return n.type === 'schedule_task' }).forEach(function (n) { edges.push({ from: n.id, to: (jobs[0] || {}).id, type: 'triggers' }) })
      upstream.forEach(function (n) { edges.push({ from: n.id, to: (jobs[0] || {}).id, type: 'reads' }) })
      jobs.forEach(function (n) { if (target) edges.push({ from: n.id, to: target.id, type: 'writes' }) })
    }
    var NODE_W = 148, NODE_H = 42, COL_GAP = 18, ROW_GAP = 18, LEFT = 18, TOP = 34
    var positions = {}
    var maxRows = 1
    columns.forEach(function (list, col) {
      maxRows = Math.max(maxRows, list.length)
      list.forEach(function (n, row) {
        positions[n.id] = { x: LEFT + col * (NODE_W + COL_GAP), y: TOP + row * (NODE_H + ROW_GAP), col: col, row: row, node: n }
      })
    })
    var height = Math.max(220, TOP + maxRows * (NODE_H + ROW_GAP) + 18)
    var marker = 'do-lin-arrow-' + String(l.table || 'target').replace(/[^a-z0-9_-]/gi, '')
    function truncate(value, n) { var text = String(value || ''); return text.length > n ? text.slice(0, n - 1) + '…' : text }
    function node(n) {
      var p = positions[n.id]
      if (!p) return null
      var isTarget = target && String(n.id) === String(target.id)
      return h('g', {
        key: n.id,
        className: 'do-graph-v2-node',
        transform: 'translate(' + p.x + ',' + p.y + ')',
        'data-kind': n.type,
        'data-target': isTarget ? 'true' : undefined,
        'data-planned': n.planned ? 'true' : undefined
      },
        h('rect', { width: NODE_W, height: NODE_H, rx: 8 }),
        h('text', { x: 10, y: 17, className: 'do-graph-v2-label' }, truncate(n.label || n.id, 21)),
        h('text', { x: 10, y: 31, className: 'do-graph-v2-meta' }, truncate([n.type === 'etl_job' ? (n.jobKind || 'job') : n.type, n.layer || n.cycle, n.owner].filter(Boolean).join(' · '), 26))
      )
    }
    function edgePath(e) {
      var a = positions[e.from], b = positions[e.to]
      if (!a || !b) return null
      var forward = b.x >= a.x
      var x1 = forward ? a.x + NODE_W : a.x
      var y1 = a.y + NODE_H / 2
      var x2 = forward ? b.x : b.x + NODE_W
      var y2 = b.y + NODE_H / 2
      var mid = (x1 + x2) / 2
      return h('path', {
        key: String(e.from) + '>' + String(e.to),
        className: 'do-graph-v2-edge',
        'data-planned': e.planned ? 'true' : undefined,
        'marker-end': 'url(#' + marker + ')',
        d: 'M ' + x1 + ' ' + y1 + ' C ' + mid + ' ' + y1 + ' ' + mid + ' ' + y2 + ' ' + x2 + ' ' + y2
      })
    }
    if (!nodes.length) return h('div', { className: 'do-empty' }, '暂无血缘')
    return h('div', { className: 'do-graph-v2' },
      h('div', { className: 'do-graph-v2-scroll' },
        h('svg', { viewBox: '0 0 900 ' + height, className: 'do-graph-v2-svg', role: 'img', 'aria-label': '设计血缘图：调度、上游、加工任务、目标与下游' },
          h('defs', null, h('marker', { id: marker, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', className: 'do-graph-v2-arrow' }))),
          ['调度', '上游', '加工', '目标', '下游'].map(function (label, i) { return h('text', { key: 'c' + i, x: LEFT + i * (NODE_W + COL_GAP), y: 17, className: 'do-graph-v2-col-label' }, label) }),
          edges.map(edgePath),
          nodes.map(node)
        )
      ),
      h('div', { className: 'do-graph-v2-legend' },
        h('span', null, h('i', { className: 'do-legend-line' }), '实线 = 已确认'),
        h('span', null, h('i', { className: 'do-legend-line', 'data-planned': 'true' }), '虚线 = planned'),
        h('span', null, h('i', { className: 'do-legend-dot' }), '高亮 = 本次目标')
      ),
      l.timeband ? h(Timeband, { timeband: l.timeband }) : null,
      l.diff && l.diff.length ? h('div', { className: 'do-kv', style: { marginTop: '5px' } }, l.diff.map(function (d, i) { return h('span', { key: i, className: 'do-pill', 'data-tone': 'warn' }, d.type + ' · ' + d.label) })) : null
    )
  }

  function metaLine(m, artifact) {
    return [artifact || deliverablePath(m), m.source, m.asOf].filter(Boolean).join(' · ')
  }


  function openTab(kind) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
    window.dispatchEvent(new CustomEvent('dataops:open-tab', { detail: { kind: kind } }))
  }

  function Modal(props) {
    if (!props.open) return null
    return h('div', { className: 'do-modal' },
      h('div', { className: 'do-modal-head' },
        h('span', { className: 'do-modal-title' }, props.title),
        h('button', { type: 'button', className: 'do-modal-x', 'aria-label': '关闭', onClick: props.onClose }, '×')),
      h('div', { className: 'do-modal-body' }, props.children))
  }

  function ArtifactModal(props) {
    return h(Modal, { open: props.open, onClose: props.onClose, title: '产物 · ' + (props.artifact || 'artifact') },
      h('pre', { className: 'do-artifact' }, JSON.stringify(props.value, null, 2)),
      h('div', { className: 'do-muted', style: { marginTop: '8px' } }, 'Mock 产物；内网接入后替换为工作区真实文件。'))
  }

  function MockNotice(props) {
    return h(Modal, { open: props.open, onClose: props.onClose, title: 'Mock 模式' },
      h('div', { style: { fontSize: '12px', lineHeight: '1.7' } }, props.text || '这个动作在 Mock 模式下不会写入业务系统。'))
  }

  function DesignCanvas(props) {
    var m = props.design || {}
    var target = m.target || {}
    return h(Modal, { open: props.open, onClose: props.onClose, title: '设计方案 · ' + (target.table || '') },
      h('div', { className: 'do-canvas' },
        h('div', { className: 'do-canvas-col' },
          h('div', { className: 'do-label' }, '来源'),
          (m.sources || []).map(function (source) {
            return h('div', { key: source.table, className: 'do-canvas-node' },
              source.table,
              source.owner ? h('span', { className: 'do-muted' }, ' · ' + source.owner) : null)
          })),
        h('div', { className: 'do-canvas-arrow' }, '→'),
        h('div', { className: 'do-canvas-col' },
          h('div', { className: 'do-label' }, '目标'),
          h('div', { className: 'do-canvas-node do-canvas-target' },
            target.table || '未命名',
            target.grain ? h('div', { className: 'do-muted' }, target.grain + ' · 分区 ' + (target.partition || '—')) : null))),
      h('div', { className: 'do-label' }, '加工逻辑'),
      (m.steps || []).map(function (step, i) {
        return h('div', { key: i, className: 'do-step' },
          h('span', { className: 'do-idx' }, String(i + 1)),
          h('div', null,
            h('div', { className: 'do-step-title' }, step.title || step.name || ''),
            h('div', { className: 'do-logic' }, step.logic || '')))
      }))
  }

  function displayValue(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback || '—'
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (Array.isArray(value)) return value.map(item => displayValue(item, '')).filter(Boolean).join('；') || (fallback || '—')
    if (typeof value === 'object') {
      var parts = []
      if (Array.isArray(value.in) && value.in.length) parts.push('范围：' + value.in.join('；'))
      if (Array.isArray(value.out) && value.out.length) parts.push('非目标：' + value.out.join('；'))
      if (parts.length) return parts.join('；')
      return JSON.stringify(value)
    }
    return String(value)
  }

  function joinText(value, separator) {
    if (Array.isArray(value)) return value.map(item => displayValue(item, '')).filter(Boolean).join(separator || '；')
    if (value === null || value === undefined) return ''
    return displayValue(value, '')
  }

  // ---------- cards ----------

  function USPickerCard(props) {
    var m = parseModel(props.block)
    if (!m) return h(Fallback, props)
    var detail = m.kind === 'us' ? [m.item] : (m.items || [])
    var selectedState = React.useState(detail[0] ? detail[0].id : null)
    var showAllState = React.useState(false)
    var queryState = React.useState('')
    var statusState = React.useState('全部')
    var selected = selectedState[0]
    var all = detail
    var selectedItem = all.filter(function (x) { return x.id === selected })[0] || all[0]
    var statuses = ['全部'].concat(all.map(function (x) { return x.status }).filter(function (v, i, a) { return a.indexOf(v) === i }))
    var filtered = all.filter(function (x) {
      var okStatus = statusState[0] === '全部' || x.status === statusState[0]
      var q = queryState[0].trim().toLowerCase()
      var okQuery = !q || x.id.toLowerCase().indexOf(q) >= 0 || String(x.title).toLowerCase().indexOf(q) >= 0
      return okStatus && okQuery
    })
    var inline = filtered.slice(0, 5)
    function row(item) {
      return h('div', { key: item.id, className: 'do-uprow', 'data-selected': selectedItem && selectedItem.id === item.id ? 'true' : undefined, onClick: function () { selectedState[1](item.id) } },
        h('span', { className: 'do-upid' }, item.id),
        h('span', { className: 'do-uptitle' }, item.title),
        h('span', { className: 'do-pill', 'data-tone': item.priority === 'P1' ? 'warn' : undefined }, item.priority || '—'),
        h('span', { className: 'do-upmeta' }, item.status + (item.existingWorkitem ? ' · 已有工作项' : ''))
      )
    }
    function preview(item) {
      if (!item) return null
      return h('div', { className: 'do-preview' },
        h('div', { className: 'do-preview-title' }, item.id + ' · ' + item.title),
        h('div', { className: 'do-preview-row' }, '目标：' + (item.goal || '—')),
        h('div', { className: 'do-preview-row' }, '验收：' + ((item.acceptance || []).join('；') || '—')),
        h('div', { className: 'do-preview-row' }, '影响：' + ((item.assets || item.impacts || []).join('、') || '—')),
        h('div', { className: 'do-preview-row' }, '初始阶段：' + (item.initialStage || 'requirement') + ' · 负责人：' + (item.assignee || '—') + (item.existingWorkitem ? ' · 工作项 ' + item.existingWorkitem : '')),
        h('div', { className: 'do-kv', style: { marginTop: '8px' } },
          h(Btn, { variant: 'primary', onClick: function () {
            composeMessage(item.existingWorkitem ? '处理 ' + item.id + '，继续已有工作项 ' + item.existingWorkitem : '处理 ' + item.id)
          } }, item.existingWorkitem ? '继续已有工作项' : '开始处理'),
          h(Btn, { variant: 'ghost', onClick: function () { showAllState[1](true) } }, '查看全部')
        )
      )
    }
    var modal = showAllState[0] ? h(Modal, { open: true, onClose: function () { showAllState[1](false) }, title: '待我处理的 US' },
      h('div', { className: 'do-upfilters' },
        h('input', { className: 'do-upsearch', value: queryState[0], placeholder: '搜索 US ID / 标题', onChange: function (e) { queryState[1](e.target.value) } }),
        h('select', { className: 'do-dropdown', value: statusState[0], onChange: function (e) { statusState[1](e.target.value) } }, statuses.map(function (st) { return h('option', { key: st, value: st }, st) }))
      ),
      h('div', { className: 'do-uplist' }, filtered.map(row)),
      preview(selectedItem)
    ) : null
    return h(Frame, {
      title: '待我处理的 US · ' + all.length,
      state: 'done',
      tone: 'brand',
      pills: [h(Pill, { key: 'src', tone: 'brand' }, m.source || 'mock-edevops'), h(Pill, { key: 'mock' }, 'mock')],
      footer: [h('span', { key: 'meta', className: 'do-muted do-meta' }, 'USPicker · ' + (m.asOf || '')), h(Btn, { key: 'all', variant: 'ghost', onClick: function () { showAllState[1](true) } }, '查看全部')]
    },
      h('div', { className: 'do-uplist' }, inline.map(row)),
      preview(selectedItem),
      modal
    )
  }

  function IntakeCard(props) {
    var m = parseModel(props.block, 'intake')
    if (!m) return h(Fallback, props)
    var us = m.us || {}
    var workitem = m.workitem || {}
    return h(Frame, {
      title: '接单 · ' + (us.id || 'US'),
      state: 'done',
      tone: 'pass',
      pills: [h(Pill, { key: 'src', tone: 'brand' }, '已建/恢复工作项'), h(Pill, { key: 'mock' }, 'mock')],
      footer: [h('span', { key: 'meta', className: 'do-muted do-meta' }, '接单摘要 · ' + (m.asOf || ''))]
    },
      h('dl', { className: 'do-grid' },
        h('dt', null, 'US'), h('dd', null, (us.id || '—') + ' · ' + (us.title || '')),
        h('dt', null, '工作项'), h('dd', null, h('span', { className: 'do-code' }, workitem.id || '—')),
        h('dt', null, '初始阶段'), h('dd', null, (m.initialStage || workitem.stage || 'requirement') + ' · ' + (m.created ? '新建' : '恢复')),
        h('dt', null, '来源'), h('dd', null, (workitem.source && workitem.source.system ? workitem.source.system + ' / ' + workitem.source.id : '—'))
      ),
      m.next ? h('div', { className: 'do-muted', style: { marginTop: '7px' } }, '下一步：' + m.next) : null,
      h('div', { className: 'do-kv', style: { marginTop: '8px' } },
        h(Btn, { variant: 'primary', onClick: function () { composeMessage('开始需求 ' + (us.id || '')) } }, '进入需求阶段'),
        h(Btn, { variant: 'ghost', onClick: function () { composeMessage('继续工作项 ' + (workitem.id || '')) } }, '查看工作项')
      )
    )
  }

  function RequirementCard(props) {
    var m = parseModel(props.block, 'requirement')
    var artifact = React.useState(false)
    if (!m) return h(Fallback, props)
    var source = m.source && typeof m.source === 'object' ? (m.source.system + ' / ' + (m.source.id || '')) : (m.source || 'mock')
    return h(Frame, {
      title: (m.id ? m.id + ' · ' : '') + (m.title || '需求'),
      state: 'done',
      tone: m.gaps && m.gaps.some(function (g) { return g.severity === 'blocking' }) ? 'warn' : 'pass',
      pills: [
        h(Pill, { key: 'src', tone: 'brand' }, source),
        m.priority ? h(Pill, { key: 'p' }, m.priority) : null,
        h(Pill, { key: 'st' }, statusText(m.status || 'draft')),
        m.partial ? h(Pill, { key: 'partial', tone: 'warn' }, '待补充') : null
      ],
      footer: [
        h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'requirement.yaml')),
        h(Btn, { key: 'open', variant: 'ghost', onClick: function () { artifact[1](true) } }, '查看产物')
      ]
    },
      h('dl', { className: 'do-grid' },
        h('dt', null, '来源'), h('dd', null, (source || '—') + (m.requester ? ' · 需求方 ' + m.requester : '')),
        h('dt', null, '目标'), h('dd', null, displayValue(m.goal)),
        h('dt', null, '范围'), h('dd', null, displayValue(m.scope)),
        h('dt', null, '非目标'), h('dd', null, (m.nonGoals || []).join('；') || '—'),
        h('dt', null, '验收'), h('dd', null, (m.acceptance || []).join('；') || '—'),
        h('dt', null, '负责人'), h('dd', null, (m.owner || '—') + (m.requester ? ' · 需求方 ' + m.requester : ''))
      ),
      (m.impacts || []).length ? h('div', null, h('div', { className: 'do-label' }, '影响资产'), h('div', { className: 'do-kv' }, m.impacts.map(function (x, i) { return h(Pill, { key: i }, typeof x === 'string' ? x : (x.name || x.id || '未命名')) }))) : null,
      (m.constraints || []).length ? h('div', { className: 'do-muted', style: { marginTop: '7px' } }, '约束：' + m.constraints.join('；')) : null,
      evidenceChips(m.evidence),
      h(Gaps, { gaps: m.gaps }),
      (m.gaps || []).some(function (g) { return g.severity === 'blocking' })
        ? h('div', { className: 'do-signoff' }, h('span', { className: 'do-signoff-title' }, '缺口'), h(Btn, { variant: 'ghost', onClick: function () { composeMessage('补充 mock 证据：用 closed 证据重新评估需求缺口，并按 mock 假设记录 execution-blocking') } }, '补充 mock 证据'))
        : null,
      h(SignoffPanel, { model: m, gate: 'requirement', roles: [
        { key: 'ba', label: 'BA', actor: (m.review && m.review.ba && m.review.ba.approver) || m.owner || '陈璐', action: 'BA 签收' },
        { key: 'requester', label: '需求方', actor: (m.review && m.review.requester && m.review.requester.approver) || m.requester || '渠道运营', action: '需求方确认', comment: '接受 mock 假设与阈值，后续阶段复核' }
      ] }),
      h(ArtifactModal, { open: artifact[0], onClose: function () { artifact[1](false) }, artifact: deliverablePath(m), value: m })
    )
  }

  function DesignCard(props) {
    var m = parseModel(props.block, 'design')
    var canvas = React.useState(false)
    var artifact = React.useState(false)
    if (!m) return h(Fallback, props)
    var status = m.status || 'draft'
    var target = m.target || {}
    var primaryKey = asArray(target.primaryKey).map(String)
    var dm = m.dataMap || m.datamap || {}
    var assets = asArray(dm.assets || m.assets)
    var path = asPath(dm.path || m.dataMapPath || [])
    var evidence = asArray(m.designEvidence || m.evidenceTrace || m.evidence)
    var review = m.review || {}
    var se = review.se
    return h(Frame, {
      title: '数据设计 · ' + (m.target && m.target.table ? m.target.table : '未命名'),
      state: status === 'draft' ? 'running' : 'done',
      tone: m.gaps && m.gaps.some(function (g) { return g.severity === 'blocking' }) ? 'warn' : 'pass',
      pills: [
        h(Pill, { key: 's', tone: status === 'draft' ? 'brand' : 'pass' }, statusText(status)),
        m.partial ? h(Pill, { key: 'partial', tone: 'warn' }, '有缺口') : null,
        m.source && m.source.id ? h(Pill, { key: 'src' }, m.source.id) : null
      ],
      footer: [
        h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'design.yaml')),
        h(Btn, { key: 'artifact', variant: 'ghost', onClick: function () { artifact[1](true) } }, '查看交付物'),
        h(Btn, { key: 'canvas', variant: 'ghost', onClick: function () { canvas[1](true) } }, '打开画布'),
        h(Btn, { key: 'lineage', variant: 'ghost', onClick: function () { openTab('dataops-lineage') } }, '查看血缘'),
        h(Btn, { key: 'sign', variant: 'primary', onClick: function () { signoff('design', 'ba', (review.ba && review.ba.approver) || m.owner || '陈璐') } }, '确认设计'),
        h(Btn, { key: 'back', variant: 'ghost', onClick: function () { returnGate('design', 'ba', '设计需要修改') } }, '退回修改')
      ]
    },
      h('dl', { className: 'do-grid' },
        h('dt', null, '粒度'), h('dd', null, target.grain || '—'),
        h('dt', null, '主键'), h('dd', null, h('span', { className: 'do-code' }, primaryKey.join(' + ') || '—')),
        h('dt', null, '分区'), h('dd', null, h('span', { className: 'do-code' }, target.partition || '—')),
        h('dt', null, '产出/SLA'), h('dd', null, ((m.schedule && m.schedule.sla) || '—') + (m.schedule && m.schedule.cron ? ' · ' + m.schedule.cron : '')),
        h('dt', null, '来源'), h('dd', null, asArray(m.sources).map(function (s, i) { return h('span', { key: i }, i ? ' ⋈ ' : '', h('span', { className: 'do-code' }, s.table)) }))
      ),
      path.length ? h('div', null, h('div', { className: 'do-label' }, 'DataMap 寻源'), h(DataMapPath, { path: path }), h(AssetCards, { assets: assets })) : null,
      evidence.length ? h('div', null,
        h('div', { className: 'do-label' }, '设计证据链'),
        evidence.slice(0, 8).map(function (ev, i) {
          var title = ev.title || ev.claim || ev.step || ('证据 ' + (i + 1))
          var detail = ev.detail || ev.summary || ev.message || ''
          return h('div', { key: i, className: 'do-ev' },
            h('span', { className: 'do-dot', 'data-tone': ev.status === 'warn' || ev.severity === 'warning' ? 'warn' : ev.status === 'fail' ? 'fail' : 'pass' }),
            h('div', null, h('div', { className: 'do-et' }, title), detail ? h('div', { className: 'do-es' }, detail) : null, evidenceChips(ev.evidence || ev.evidenceId))
          )
        })
      ) : null,
      asArray(m.metrics).length ? h('div', null, h('div', { className: 'do-label' }, '口径'), h('div', { className: 'do-kv' }, asArray(m.metrics).map(function (x, i) { return h(Pill, { key: i, tone: 'brand' }, x.name + ' · ' + (x.definition || '')) }))) : null,
      asArray(m.quality).length ? h('div', null, h('div', { className: 'do-label' }, '质量/约束'), h('div', { className: 'do-kv' }, asArray(m.quality).map(function (q, i) { return h(Pill, { key: i, tone: q.status === 'warn' ? 'warn' : q.status === 'fail' ? 'warn' : 'pass' }, q.item + ' · ' + (q.expectation || statusText(q.status))) }))) : null,
      h(Impact, { impact: m.impact }),
      h(Gaps, { gaps: m.gaps }),
      (m.gaps || []).some(function (g) { return g.severity === 'blocking' })
        ? h('div', { className: 'do-signoff' }, h('span', { className: 'do-signoff-title' }, '缺口'), h(Btn, { variant: 'ghost', onClick: function () { composeMessage('补充 mock 证据：用 closed 证据重新评估设计缺口') } }, '补充 mock 证据'))
        : null,
      h('div', { className: 'do-review' },
        h('span', { className: 'do-review-label' }, '评审'),
        h(Pill, { key: 'ba', tone: review.ba === 'signed' || review.ba === 'approved' ? 'pass' : undefined }, 'BA · ' + statusText(review.ba || 'pending')),
        h(Pill, { key: 'se', tone: se === 'approved' ? 'pass' : se === 'rejected' ? 'warn' : undefined }, 'SE · ' + statusText(se || 'deferred'))
      ),
      h(SignoffPanel, { model: m, gate: 'design', roles: [{ key: 'ba', label: 'BA', actor: (review.ba && review.ba.approver) || m.owner || '陈璐', action: 'BA 签收' }] }),
      h(DesignCanvas, { open: canvas[0], onClose: function () { canvas[1](false) }, design: m }),
      h(ArtifactModal, { open: artifact[0], onClose: function () { artifact[1](false) }, artifact: deliverablePath(m), value: m })
    )
  }

  function TableCard(props) {
    var m = parseModel(props.block, 'table')
    if (!m) return h(Fallback, props)
    return h(Frame, {
      title: '表 · ' + (m.table || '未命名'),
      state: 'done',
      tone: m.partial ? 'warn' : 'pass',
      pills: [h(Pill, { key: 'src', tone: 'brand' }, m.source || 'catalog')],
      footer: [
        h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'table')),
        h(Btn, { key: 'lineage', variant: 'ghost', onClick: function () { openTab('dataops-lineage') } }, '查看血缘')
      ]
    },
      h('dl', { className: 'do-grid' },
        h('dt', null, 'owner'), h('dd', null, m.owner || '—'),
        h('dt', null, '分层'), h('dd', null, m.layer || '—'),
        h('dt', null, '粒度'), h('dd', null, m.grain || '—'),
        h('dt', null, '分区'), h('dd', null, m.partition || '—'),
        h('dt', null, '行数'), h('dd', null, m.rowCount === null || m.rowCount === undefined ? '—' : String(m.rowCount))
      ),
      (m.columns || []).length ? h('div', { className: 'do-cols' },
        h('div', { className: 'do-label' }, '字段（' + m.columns.length + '）'),
        m.columns.map(function (column, i) {
          return h('div', { key: i, className: 'do-field' },
            h('span', { className: 'do-fn' }, column.name),
            h('span', { className: 'do-ft' }, column.type + (column.comment ? ' · ' + column.comment : '')))
        })
      ) : null,
      h(Gaps, { gaps: m.gaps })
    )
  }

  function ScheduleDag(props) {
    var schedule = props.schedule || {}
    var selected = props.selected || ''
    var onSelect = props.onSelect
    var jobs = schedule.jobs || []
    var taskName = schedule.taskName || 'task'
    if (!jobs.length) return h('div', { className: 'do-empty' }, '暂无调度作业')
    var nodes = [{ id: '__start', label: '开始', type: 'start', parents: [] }].concat(jobs.map(function (job) {
      return { id: job.name, label: job.name, type: job.type, parents: job.parents || [] }
    }))
    var names = {}
    nodes.forEach(function (node) { names[node.id] = node })
    var levels = {}
    nodes.forEach(function (node) { levels[node.id] = 0 })
    for (var pass = 0; pass < nodes.length; pass++) {
      nodes.forEach(function (node) {
        (node.parents || []).forEach(function (parent) {
          if (names[parent]) levels[node.id] = Math.max(levels[node.id], (levels[parent] || 0) + 1)
        })
      })
    }
    var groups = {}
    nodes.forEach(function (node) {
      var level = levels[node.id] || 0
      if (!groups[level]) groups[level] = []
      groups[level].push(node)
    })
    var levelKeys = Object.keys(groups).map(Number).sort(function (a, b) { return a - b })
    var labels = ['开始', '前置', '并行', '加工', '汇聚', '通知']
    var NODE_W = 148, NODE_H = 42, COL_GAP = 18, ROW_GAP = 18, LEFT = 18, TOP = 34
    var positions = {}
    var maxRows = 1
    nodes.forEach(function (node) {
      var level = levels[node.id] || 0
      var same = groups[String(level)] || []
      positions[node.id] = { x: LEFT + level * (NODE_W + COL_GAP), y: TOP + same.indexOf(node) * (NODE_H + ROW_GAP) }
      maxRows = Math.max(maxRows, same.length)
    })
    var height = Math.max(220, TOP + maxRows * (NODE_H + ROW_GAP) + 18)
    var marker = 'do-schedule-arrow'
    function truncate(value, n) { var text = String(value || ''); return text.length > n ? text.slice(0, n - 1) + '…' : text }
    function nodeView(node) {
      var point = positions[node.id]
      return h('g', { key: node.id, className: 'do-graph-v2-node do-doc-dag-node', transform: 'translate(' + point.x + ',' + point.y + ')', 'data-kind': node.type, 'data-selected': selected === node.id ? 'true' : undefined, role: node.id === '__start' ? undefined : 'button', tabIndex: node.id === '__start' ? undefined : 0, onClick: node.id === '__start' ? undefined : function () { if (onSelect) onSelect(node.id) }, onKeyDown: node.id === '__start' ? undefined : function (event) { if ((event.key === 'Enter' || event.key === ' ') && onSelect) { event.preventDefault(); onSelect(node.id) } } },
        h('rect', { width: NODE_W, height: NODE_H, rx: 8 }),
        h('text', { x: 10, y: 17, className: 'do-graph-v2-label' }, truncate(node.label, 21)),
        h('text', { x: 10, y: 31, className: 'do-graph-v2-meta' }, truncate(node.type === 'start' ? 'task start' : node.type, 26)))
    }
    var edges = []
    nodes.forEach(function (node) {
      if (node.id === '__start') return
      var parents = (node.parents || []).filter(function (parent) { return names[parent] })
      if (!parents.length) parents = ['__start']
      parents.forEach(function (parent) { edges.push({ from: parent, to: node.id }) })
    })
    function edgeView(edge) {
      var a = positions[edge.from], b = positions[edge.to]
      if (!a || !b) return null
      var x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2
      var mid = (x1 + x2) / 2
      return h('path', { key: edge.from + '>' + edge.to, className: 'do-graph-v2-edge', 'marker-end': 'url(#' + marker + ')', d: 'M ' + x1 + ' ' + y1 + ' C ' + mid + ' ' + y1 + ' ' + mid + ' ' + y2 + ' ' + x2 + ' ' + y2 })
    }
    var width = Math.max(900, levelKeys.length * (NODE_W + COL_GAP) + LEFT * 2)
    var jobPoints = nodes.filter(function (node) { return node.id !== '__start' && positions[node.id] }).map(function (node) { return positions[node.id] })
    var groupFrame = null
    if (jobPoints.length) {
      var groupLeft = Math.min.apply(null, jobPoints.map(function (point) { return point.x })) - 8
      var groupTop = Math.min.apply(null, jobPoints.map(function (point) { return point.y })) - 18
      var groupRight = Math.max.apply(null, jobPoints.map(function (point) { return point.x + NODE_W })) + 8
      var groupBottom = Math.max.apply(null, jobPoints.map(function (point) { return point.y + NODE_H })) + 8
      groupFrame = h('g', { className: 'do-sched-group-frame' },
        h('rect', { x: groupLeft, y: groupTop, width: groupRight - groupLeft, height: groupBottom - groupTop, rx: 9 }),
        h('text', { x: groupLeft + 9, y: groupTop + 14, className: 'do-sched-group-label' }, taskName))
    }
    return h('div', null,
      h('div', { className: 'do-doc-graph-head' },
        h('span', { className: 'do-doc-graph-title' }, '调度血缘'),
        h('span', { className: 'do-doc-graph-task' }, taskName),
        h('span', { className: 'do-doc-graph-meta' }, nodes.length + ' 节点 · ' + edges.length + ' 依赖')),
      h('div', { className: 'do-graph-v2-scroll' },
        h('svg', { viewBox: '0 0 ' + width + ' ' + height, className: 'do-graph-v2-svg', role: 'img', 'aria-label': '调度血缘图' },
          h('defs', null, h('marker', { id: marker, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', className: 'do-graph-v2-arrow' }))),
          labels.slice(0, levelKeys.length).map(function (label, index) { return h('text', { key: label, x: LEFT + index * (NODE_W + COL_GAP), y: 17, className: 'do-graph-v2-col-label' }, label) }),
          groupFrame,
          edges.map(edgeView),
          nodes.map(nodeView))),
      h('div', { className: 'do-graph-v2-legend' },
        h('span', null, h('i', { className: 'do-legend-line' }), '实线 = 依赖'),
        h('span', null, h('i', { className: 'do-legend-dot' }), '节点 = 作业')))
  }

  function ScheduleInspector(props) {
    var schedule = props.schedule || {}
    var job = (schedule.jobs || []).filter(function (item) { return item.name === props.selected })[0] || (schedule.jobs || [])[0]
    if (!job) return h('div', { className: 'do-muted' }, '选择一个作业查看详情')
    return h('div', { className: 'do-sched-inspector' },
      h('div', { className: 'do-label' }, job.type === 'open_gauss' || job.type === 'libra' ? '数据库作业' : job.type === 'group' ? '组作业' : job.type === 'tskdep' ? '跨任务依赖' : job.type === 'url' ? 'HTTP 作业' : '脚本作业'),
      h('div', { className: 'do-sched-name' }, job.name),
      h('div', { className: 'do-muted' }, '类型 ' + job.type + ' · 父依赖 ' + ((job.parents || []).join(' / ') || '入口')),
      h('div', { className: 'do-sched-kv' },
        h('span', null, '参数'), h('b', null, (schedule.taskParams || []).join('、') || '无'),
        h('span', null, '占位符'), h('b', { className: 'mono' }, (schedule.placeholders || []).slice(0, 3).join('、') || '无')),
      h('div', { className: 'do-sched-extra' },
        schedule.cron ? h('div', null, h('span', null, 'cron'), h('b', null, schedule.cron)) : null,
        schedule.sla ? h('div', null, h('span', null, 'SLA'), h('b', null, schedule.sla)) : null,
        schedule.retries ? h('div', null, h('span', null, '重试'), h('b', null, String(schedule.retries))) : null,
        (schedule.dependsOn || []).length ? h('div', null, h('span', null, '依赖'), h('b', { className: 'mono' }, schedule.dependsOn.join('、'))) : null))
  }

  function LineageV2Card(props) {
    var focusState = React.useState(false)
    var selectedState = React.useState('')
    var m = parseModel(props.block, 'lineage')
    if (!m) return h(Fallback, props)
    var schedule = m.view === 'schedule' && m.schedule ? m.schedule : null
    var jobs = schedule && Array.isArray(schedule.jobs) ? schedule.jobs : []
    var defaultJob = jobs.filter(function (job) { return job.type === 'open_gauss' || job.type === 'libra' })[0] || jobs[0]
    var selected = selectedState[0] || (defaultJob ? defaultJob.name : '')
    var selectedJob = jobs.filter(function (job) { return job.name === selected })[0] || jobs[0]
    var focus = focusState[0]
    return h(Frame, {
      title: (schedule ? '调度血缘 · ' : '设计血缘 · ') + (m.table || ''),
      state: 'done',
      tone: m.partial ? 'warn' : 'pass',
      pills: schedule
        ? [
          h(Pill, { key: 'view', tone: 'brand' }, '调度视图'),
          h(Pill, { key: 'taskCount' }, (schedule.taskCount || 1) + ' 任务'),
          h(Pill, { key: 'type' }, schedule.taskType || '任务'),
          h(Pill, { key: 'cron' }, schedule.cron || '—')
        ]
        : [
          h(Pill, { key: 'view', tone: 'brand' }, m.view || 'design'),
          h(Pill, { key: 'mode' }, m.mode || 'planned'),
          h(Pill, { key: 'depth' }, '一层上游')
        ],
      footer: schedule
        ? [
          h('span', { key: 'meta', className: 'do-muted do-meta' }, (schedule.taskName || '') + ' · ' + (schedule.jobCount || jobs.length) + ' 作业' + (selectedJob ? ' · ' + selectedJob.name : '')),
          h(Btn, { key: 'focus', variant: focus ? 'primary' : 'ghost', onClick: function () { var next = !focus; focusState[1](next); if (props.onFocusChange) props.onFocusChange(next) } }, focus ? '退出聚焦' : '聚焦')
        ]
        : [h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'lineage'))]
    },
      schedule
        ? h('div', { className: 'do-sched-card', 'data-density': focus ? 'focus' : 'compact' },
          h('div', { className: 'do-sched-graph' }, h(ScheduleDag, { schedule: schedule, selected: selected, onSelect: function (id) { selectedState[1](id) } })),
          h('div', { className: 'do-sched-side' }, h(ScheduleInspector, { schedule: schedule, selected: selected })),
          h('div', { className: 'do-doc-lts-meta' },
            schedule.typeCounts ? h('span', { className: 'do-doc-types-inline' }, Object.keys(schedule.typeCounts).map(function (type) { return type + ' × ' + schedule.typeCounts[type] }).join(' · ')) : null,
            schedule.taskParams && schedule.taskParams.length ? h('span', null, '参数：' + schedule.taskParams.join('、')) : null,
            schedule.placeholders && schedule.placeholders.length ? h('span', null, '占位符：' + schedule.placeholders.join('、')) : null))
        : h(LineageV2Preview, { lineage: m }),
      (m.downstream || []).length ? h('div', null, h('div', { className: 'do-label' }, '下游影响'), h('div', { className: 'do-kv' }, m.downstream.map(function (d, i) { return h(Pill, { key: i }, (d.id || d.asset) + ' · ' + (d.owner || d.type || '')) }))) : null,
      h(Gaps, { gaps: m.gaps })
    )
  }

  function LineageCard(props) {
    var m = parseModel(props.block, 'lineage')
    if (!m) return h(Fallback, props)
    if (m.schemaVersion >= 2 || m.graph) return h(LineageV2Card, props)
    var shown = (m.nodes || []).slice(0, 12)
    return h(Frame, {
      title: '血缘 · ' + (m.table || ''),
      state: 'done',
      tone: m.partial ? 'warn' : 'pass',
      pills: [
        h(Pill, { key: 'dir' }, m.direction === 'up' ? '上游' : m.direction === 'down' ? '下游' : '上下游'),
        h(Pill, { key: 'depth' }, '深度 ' + (m.depth || 1))
      ],
      footer: [
        h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'lineage')),
        m.truncated ? h('span', { key: 'trunc', className: 'do-muted' }, '已截断') : null
      ]
    },
      h('div', { className: 'do-lin' }, shown.map(function (node) {
        var target = node.table === m.table
        return h('div', { key: node.table, className: 'do-lin-node', 'data-target': target ? 'true' : undefined },
          h('span', { className: 'do-dot', 'data-tone': target ? 'brand' : 'muted' }),
          h('span', { className: 'do-fn' }, node.table),
          target ? h('span', { className: 'do-pill', 'data-tone': 'brand' }, '本次') : null,
          node.type ? h('span', { className: 'do-pill' }, node.type) : null)
      })),
      (m.nodes || []).length > shown.length
        ? h('div', { className: 'do-muted', style: { marginTop: '6px' } }, '还有 ' + ((m.nodes || []).length - shown.length) + ' 个节点')
        : null,
      h(Gaps, { gaps: m.gaps })
    )
  }

  function TechPlanCard(props) {
    var m = parseModel(props.block, 'tech_plan')
    var artifact = React.useState(false)
    if (!m) return h(Fallback, props)
    var lineage = m.lineage || m.designLineage || null
    var blocked = m.status === 'blocked' || (m.gaps || []).some(function (g) { return g.severity === 'blocking' && (!g.blockingFor || g.blockingFor === 'execution') })
    var tasks = m.tasks || []
    var review = m.review || {}
    return h(Frame, {
      title: '技术方案 · ' + displayValue(m.target && typeof m.target === 'object' ? m.target.table : m.target, '') + ' · ' + tasks.length + ' 个任务',
      state: 'done',
      tone: blocked ? 'warn' : 'pass',
      pills: [h(Pill, { key: 's', tone: blocked ? 'warn' : 'pass' }, statusText(m.status || 'draft')), h(Pill, { key: 'owner' }, 'SE ' + ((review.se && review.se.approver) || m.owner || '王工'))],
      footer: [
        h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'tech-plan.yaml')),
        h(Btn, { key: 'open', variant: 'ghost', onClick: function () { artifact[1](true) } }, '查看交付物'),
        lineage ? h(Btn, { key: 'lineage', variant: 'ghost', onClick: function () { openTab('dataops-lineage') } }, '查看完整血缘') : null,
        h(Btn, { key: 'sign', variant: 'primary', onClick: function () { signoff('scheme.tech_plan', 'se', (review.se && review.se.approver) || '王工') } }, 'SE 确认')
      ]
    },
      h('dl', { className: 'do-grid' },
        h('dt', null, '目标'), h('dd', null, displayValue(m.target && typeof m.target === 'object' ? (m.target.table || m.target) : m.target, '—')),
        h('dt', null, '周期/SLA'), h('dd', null, (m.sla && (m.sla.scheduleConstraints && m.sla.scheduleConstraints.cron || m.sla.outputBy)) || '—'),
        h('dt', null, '工时'), h('dd', null, displayValue(m.estimate && typeof m.estimate === 'object' ? m.estimate.total : m.estimate, '—')),
        h('dt', null, '签收'), h('dd', null, 'SE ' + statusText((review.se && review.se.status) || 'pending') + ' · Dev ' + statusText((review.dev && review.dev.status) || 'deferred'))
      ),
      lineage ? h('div', null, h('div', { className: 'do-label' }, '设计血缘 · 一层直接上游'), h(LineageV2Preview, { lineage: lineage })) : h('div', { className: 'do-muted', style: { marginTop: '7px' } }, '血缘待补：未取得独立血缘 payload'),
      tasks.length ? h('div', null, h('div', { className: 'do-label' }, '任务拆解'), tasks.slice(0, 10).map(function (t, i) { return h('div', { key: i, className: 'do-task' }, h('span', { className: 'do-dot', 'data-tone': t.status === 'blocked' ? 'warn' : 'pass' }), h('span', { className: 'do-task-name' }, (t.id ? t.id + ' · ' : '') + (t.name || t.title || '')), h('span', { className: 'do-task-meta' }, [t.platform, t.owner, t.sla].filter(Boolean).join(' · '))) })) : null,
      (m.dependencies || []).length ? h('div', { className: 'do-muted', style: { marginTop: '7px' } }, '依赖：' + m.dependencies.map(function (d) { return (d.id || '') + ' ' + (d.from || d.need || '') + ' → ' + (d.to || '') }).join('；')) : null,
      (m.risks || []).length ? h('div', null, h('div', { className: 'do-label' }, '风险'), m.risks.map(function (r, i) { return h('div', { key: i, className: 'do-gap' }, h('span', { className: 'do-dot', 'data-tone': 'warn' }), h('span', null, (r.id ? r.id + ' · ' : '') + (r.description || r.risk || '') + (r.mitigation ? ' · 缓解：' + r.mitigation : ''))) })) : null,
      (m.rollback && (m.rollback.steps || m.rollback.materials)) ? h('div', { className: 'do-muted', style: { marginTop: '7px' } }, '回滚：' + ((m.rollback.steps || []).join(' → ') || m.rollback.materials.join('、'))) : null,
      h(Gaps, { gaps: m.gaps }),
      (m.gaps || []).some(function (g) { return g.severity === 'blocking' })
        ? h('div', { className: 'do-signoff' }, h('span', { className: 'do-signoff-title' }, '缺口'), h(Btn, { variant: 'ghost', onClick: function () { composeMessage('补充 mock 证据：用 closed 证据重新评估设计缺口') } }, '补充 mock 证据'))
        : null,
      h('div', { className: 'do-review' },
        h('span', { className: 'do-review-label' }, '评审'),
        h(Pill, { key: 'se', tone: review.se === 'approved' ? 'pass' : undefined }, 'SE · ' + statusText((review.se && review.se.status) || 'pending')),
        h(Pill, { key: 'dev', tone: review.dev === 'approved' ? 'pass' : undefined }, 'Dev · ' + statusText((review.dev && review.dev.status) || 'deferred'))
      ),
      h(SignoffPanel, { model: m, gate: 'scheme.tech_plan', roles: [{ key: 'se', label: 'SE', actor: (review.se && review.se.approver) || '王工', action: 'SE 确认' }] }),
      h(ArtifactModal, { open: artifact[0], onClose: function () { artifact[1](false) }, artifact: deliverablePath(m), value: m })
    )
  }

  function EvidenceCard(props) {
    var m = parseModel(props.block, 'evidence')
    var copied = React.useState(false)
    var notice = React.useState(false)
    if (!m) return h(Fallback, props)
    function copy() {
      if (typeof navigator === 'undefined' || !navigator.clipboard) return
      navigator.clipboard.writeText(m.query || '').then(function () { copied[1](true) })
    }
    return h(Frame, {
      title: '证据 · ' + (m.claim || ''),
      state: 'done',
      tone: m.tone || 'pass',
      pills: [h(Pill, { key: 'env' }, m.env || 'prod 只读')],
      footer: [
        h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'evidence') + (m.cost ? ' · ' + m.cost : '')),
        h(Btn, { key: 'copy', variant: 'ghost', onClick: copy }, copied[0] ? '已复制' : '复制 SQL'),
        h(Btn, { key: 'open', onClick: function () { notice[1](true) } }, '在编辑器打开')
      ]
    },
      m.query ? h('pre', { className: 'do-logic', style: { margin: '0', whiteSpace: 'pre-wrap' } }, m.query) : null,
      m.timeRange ? h('div', { className: 'do-muted', style: { marginTop: '6px' } }, '范围 ' + m.timeRange) : null,
      h(Gaps, { gaps: m.gaps }),
      h(MockNotice, { open: notice[0], onClose: function () { notice[1](false) }, text: 'Mock 模式：不会打开真实 SQL 编辑器。' })
    )
  }

  function DevelopCard(props) {
    var m = parseModel(props.block, 'develop')
    var artifact = React.useState(false)
    if (!m) return h(Fallback, props)
    var artifacts = Array.isArray(m.artifacts) ? m.artifacts : []
    var validation = m.validation || {}
    var tasks = Array.isArray(m.tasks) ? m.tasks : []
    var review = m.review || {}
    var merge = m.merge || {}
    var status = m.status || 'in_progress'
    var counts = {}
    artifacts.forEach(function (a) { var t = a.type || 'artifact'; counts[t] = (counts[t] || 0) + 1 })
    function stateTone(value) { return value === 'passed' || value === 'pass' || value === 'done' || value === 'merged' ? 'pass' : value === 'failed' || value === 'blocked' || value === 'rejected' ? 'fail' : value === 'manual' || value === 'not-automated' || value === 'fixing' ? 'warn' : 'brand' }
    function stageRow(key, label) {
      var v = validation[key]
      if (!v) return null
      var blockers = v.blocking || v.blockers || []
      var detail = v.reason || v.note || (blockers.length ? blockers.join('；') : '') || v.log || '—'
      return h('div', { key: key, className: 'do-dev-row' },
        h('span', { className: 'do-dev-label' }, label),
        h('span', { className: 'do-pill', 'data-tone': stateTone(v.status) }, statusText(v.status)),
        h('span', { className: 'do-dev-attempt' }, v.attempt ? 'attempt ' + v.attempt : ''),
        h('span', { className: 'do-dev-detail' }, detail)
      )
    }
    var buildFailed = Boolean(validation.build && validation.build.status !== 'passed')
    var gateReady = !buildFailed && (!validation.scan || (validation.scan.status !== 'failed' && !(validation.scan.blocking || []).length))
    function retryBuild() {
      composeMessage('重新编译构建并验证开发产物：先修复 build/scan 的失败项，再重新生成 attempt 记录；不要直接合入。')
      window.setTimeout(function () {
        try {
          var button = Array.prototype.slice.call(document.querySelectorAll('button')).reverse().find(function (candidate) {
            var label = ((candidate.getAttribute('aria-label') || '') + ' ' + (candidate.textContent || '')).trim()
            return /发送|send/i.test(label) && !candidate.disabled
          })
          if (button) button.click()
        } catch (error) { /* leave draft for manual send */ }
      }, 140)
    }
    return h(Frame, {
      title: '开发验证 · ' + (m.target || ''),
      state: status === 'done' ? 'done' : 'running',
      tone: stateTone(status),
      status: status,
      pills: [
        h(Pill, { key: 'loop', tone: 'brand' }, 'loop ' + (m.loop || m.attempt || 1)),
        h(Pill, { key: 'branch' }, m.branch || '—'),
        m.merge && m.merge.commit ? h(Pill, { key: 'commit' }, m.merge.commit) : null
      ],
      footer: [h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'develop.yaml')),
        h(Btn, { key: 'open', variant: 'ghost', onClick: function () { artifact[1](true) } }, '查看产物')]
    },
      h('dl', { className: 'do-grid' },
        h('dt', null, '目标'), h('dd', null, displayValue(m.target && typeof m.target === 'object' ? (m.target.table || m.target) : m.target, '—')),
        h('dt', null, '分支'), h('dd', null, h('span', { className: 'do-code' }, m.branch || '—')),
        h('dt', null, '产物'), h('dd', null, artifacts.length + ' 个 · ' + Object.keys(counts).map(function (k) { return counts[k] + ' ' + k }).join(' / ')),
        h('dt', null, '任务'), h('dd', null, tasks.filter(function (t) { return t.status === 'done' }).length + '/' + tasks.length + ' 完成')
      ),
      h('div', { className: 'do-dev-gates' },
        h('div', { className: 'do-label' }, '评审与合入'),
        h('div', { className: 'do-dev-gate-row' },
          h(Pill, { key: 'se', tone: (review.se && review.se.status === 'approved') ? 'pass' : 'warn' }, 'SE 评审 · ' + statusText((review.se && review.se.status) || 'pending')),
          gateReady && (!review.se || review.se.status !== 'approved')
            ? h(Btn, { key: 'se-action', variant: 'ghost', onClick: function () { signoff('develop.code_review', 'se', (review.se && review.se.approver) || '王工') } }, 'SE 通过')
            : null,
          h(Pill, { key: 'committer', tone: merge.status === 'merged' ? 'pass' : 'warn' }, 'Committer · ' + statusText(merge.status || (review.committer && review.committer.status) || 'waiting')),
          gateReady && (!merge.status || merge.status === 'pending') && (!review.committer || ['pending', 'waiting'].includes(review.committer.status))
            ? h(Btn, { key: 'merge-action', variant: 'primary', onClick: function () { signoff('develop.merge', 'committer', (review.committer && review.committer.approver) || '代码平台') } }, '记录合入')
            : null,
          merge.commit ? h('span', { className: 'do-muted do-meta' }, merge.commit) : null
        ),
        h('div', { className: 'do-muted', style: { marginTop: '3px' } }, '合入由外部代码平台/Committer 执行；DataOps 只记录状态')
      ),
      artifacts.length ? h('div', { className: 'do-dev-artifacts' },
        h('div', { className: 'do-label' }, '实现包'),
        artifacts.slice(0, 5).map(function (a, i) { return h('span', { key: i, className: 'do-chip', title: a.path || '' }, (a.type || 'artifact') + ' · ' + (a.path || '').split('/').pop()) }),
        artifacts.length > 5 ? h('span', { className: 'do-muted' }, '+' + (artifacts.length - 5) + ' 个，查看产物') : null
      ) : null,
      Object.keys(validation).length ? h('div', { className: 'do-dev-validation' },
        h('div', { className: 'do-label' }, '验证循环'),
        stageRow('build', 'Build'), stageRow('scan', 'Scan'), stageRow('deploy', 'Deploy'), stageRow('test', 'Test'),
        h('div', { className: 'do-dev-attempts' }, ['build', 'scan', 'deploy', 'test'].map(function (key) {
          var v = validation[key]
          if (!v || !Array.isArray(v.attempts)) return null
          var failed = v.attempts.filter(function (a) { return a.status !== 'passed' }).slice(0, 1)
          if (!failed.length) return null
          return h('div', { key: key, className: 'do-dev-attempt-line' }, failed.map(function (a, i) {
            return h('div', { key: i }, '此前 attempt ' + (a.attempt || i + 1) + ' · ' + statusText(a.status) + ' · ' + (a.error || a.reason || a.note || a.action || '—'))
          }))
        }))
      ) : null,
      buildFailed ? h('div', { className: 'do-dev-warning' }, h('span', null, 'Build 未通过：CICD/合入前必须先修复并重新验证。'), h(Btn, { key: 'retry', variant: 'primary', onClick: retryBuild }, '重新编译')) : null,
      tasks.length ? h('div', null,
        h('div', { className: 'do-label' }, '任务'),
        tasks.map(function (task, i) {
          return h('div', { key: i, className: 'do-task' },
            h('span', { className: 'do-dot', 'data-tone': task.status === 'done' ? 'pass' : task.status === 'running' ? 'brand' : 'warn' }),
            h('span', { className: 'do-task-name' }, task.id ? task.id + ' · ' + task.name : task.name),
            h('span', { className: 'do-progress' }, h('i', { style: { width: (task.progress || 0) + '%' } })),
            h('span', { className: 'do-task-meta' }, task.owner || ''))
        })
      ) : null,
      (m.gaps || []).length ? h(Gaps, { gaps: m.gaps }) : null,
      h(ArtifactModal, { open: artifact[0], onClose: function () { artifact[1](false) }, artifact: deliverablePath(m), value: m })
    )
  }

  function TestCard(props) {
    var m = parseModel(props.block, 'test')
    if (!m) return h(Fallback, props)
    return h(Frame, {
      title: '测试 · ' + (m.conclusion === 'pass' ? '通过' : '有风险'),
      state: 'done',
      tone: m.conclusion === 'pass' ? 'pass' : 'warn',
      pills: [h(Pill, { key: 's', tone: m.conclusion === 'pass' ? 'pass' : 'warn' }, m.status || '')],
      footer: [h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'test-report.yaml'))]
    },
      h('dl', { className: 'do-grid' },
        h('dt', null, '对账差异'), h('dd', null, m.summary && m.summary.diff || '—'),
        h('dt', null, '质量'), h('dd', null, m.summary && m.summary.quality || '—'),
        h('dt', null, '性能'), h('dd', null, m.summary && m.summary.performance || '—'),
        h('dt', null, 'SLA'), h('dd', null, m.summary && m.summary.sla || '—')
      ),
      (m.cases || []).length ? h('div', null,
        h('div', { className: 'do-label' }, '用例'),
        m.cases.map(function (item, i) {
          return h('div', { key: i, className: 'do-task' },
            h('span', { className: 'do-dot', 'data-tone': item.status === 'pass' ? 'pass' : 'warn' }),
            h('span', { className: 'do-task-name' }, item.name + ' · ' + item.detail),
            h('span', { className: 'do-task-meta' }, item.type))
        })
      ) : null,
      h(Gaps, { gaps: m.gaps })
    )
  }

  function ReleaseCard(props) {
    var m = parseModel(props.block, 'release')
    if (!m) return h(Fallback, props)
    var status = m.status || ''
    var executed = m.executed === true || status === 'released'
    var blocked = !executed && (status === 'blocked' || status === 'awaiting_approval' || status === 'rejected' || status === 'cancelled')
    var tone = executed ? 'pass' : 'warn'
    var state = blocked ? 'running' : 'done'
    return h(Frame, {
      title: '发布 · ' + (m.changeId || m.target || ''),
      state: state,
      tone: tone,
      pills: [
        h(Pill, { key: 's', tone: tone }, executed ? '已执行' : (status === 'awaiting_approval' ? '待审批' : status === 'blocked' ? '审批不可用' : status === 'rejected' ? '已拒绝' : status === 'cancelled' ? '已取消' : status))
      ],
      footer: [h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'release.yaml'))]
    },
      h('dl', { className: 'do-grid' },
        h('dt', null, '目标'), h('dd', null, h('span', { className: 'do-code' }, m.target || '—')),
        h('dt', null, '窗口'), h('dd', null, m.window || '—'),
        h('dt', null, '策略'), h('dd', null, m.strategy || '—')
      ),
      (m.steps || []).length ? h('div', null,
        h('div', { className: 'do-label' }, '发布步骤'),
        m.steps.map(function (step, i) {
          return h('div', { key: i, className: 'do-step' }, h('span', { className: 'do-idx' }, String(i + 1)), h('div', { className: 'do-step-title' }, step))
        })
      ) : null,
      h('div', { className: 'do-label' }, '审批'),
      h('div', { className: 'do-kv' }, (m.approvals || []).map(function (item, i) {
        return h(Pill, { key: i, tone: item.status === 'approved' ? 'pass' : 'warn' }, item.role + ' · ' + item.status)
      })),
      m.approval ? h('div', { className: 'do-muted', style: { marginTop: '7px' } },
        'DSH 审批：' + (m.approval.outcome || 'unknown') + (m.approval.reason ? ' · ' + m.approval.reason : '')) : null,
      executed ? h('div', { className: 'do-muted', style: { marginTop: '7px' } }, '已提交发布（mock，不写生产）') : h('div', { className: 'do-muted', style: { marginTop: '7px' } }, blocked ? '未执行：等待审批通过' : '未执行'),
      h('div', { className: 'do-muted', style: { marginTop: '8px' } }, '回滚：' + (m.rollback || '—')),
      h(Gaps, { gaps: m.gaps })
    )
  }

  function PostmortemCard(props) {
    var m = parseModel(props.block, 'postmortem')
    if (!m) return h(Fallback, props)
    return h(Frame, {
      title: '复盘 · ' + (m.target || ''),
      state: 'done',
      tone: 'pass',
      pills: [h(Pill, { key: 's', tone: 'pass' }, '已完成')],
      footer: [h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'postmortem.yaml'))]
    },
      m.summary ? h('div', { className: 'do-muted', style: { marginBottom: '8px' } }, displayValue(m.summary, '—')) : null,
      asArray(m.metrics).length ? h('dl', { className: 'do-grid' },
        m.metrics.map(function (metric, i) {
          return h(React.Fragment, { key: i },
            h('dt', null, metric.name),
            h('dd', null, metric.actual + '（目标 ' + metric.target + '）'))
        })
      ) : null,
      (m.issues || []).length ? h('div', null,
        h('div', { className: 'do-label' }, '问题'),
        m.issues.map(function (issue, i) {
          return h('div', { key: i, className: 'do-task' },
            h('span', { className: 'do-dot', 'data-tone': 'warn' }),
            h('span', { className: 'do-task-name' }, issue.title),
            h('span', { className: 'do-task-meta' }, issue.severity))
        })
      ) : null,
      (m.actions || []).length ? h('div', null,
        h('div', { className: 'do-label' }, '行动项'),
        m.actions.map(function (action, i) {
          return h('div', { key: i, className: 'do-task' },
            h('span', { className: 'do-dot', 'data-tone': 'muted' }),
            h('span', { className: 'do-task-name' }, action.action),
            h('span', { className: 'do-task-meta' }, action.owner + ' · ' + action.due))
        })
      ) : null,
      h(Gaps, { gaps: m.gaps })
    )
  }

  function IncidentCard(props) {
    var m = parseModel(props.block, 'incident')
    if (!m) return h(Fallback, props)
    return h(Frame, {
      title: '排障 · ' + (m.severity || '') + ' · ' + (m.title || ''),
      state: 'done',
      tone: 'warn',
      pills: [h(Pill, { key: 's', tone: 'warn' }, m.status || '')],
      footer: [h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'incident.yaml'))]
    },
      h('dl', { className: 'do-grid' },
        h('dt', null, '目标'), h('dd', null, h('span', { className: 'do-code' }, m.target || '—')),
        h('dt', null, '开始'), h('dd', null, m.startedAt || '—'),
        h('dt', null, '现象'), h('dd', null, m.symptom || '—')
      ),
      (m.timeline || []).length ? h('div', null,
        h('div', { className: 'do-label' }, '时间线'),
        h('div', { className: 'do-timeline' }, m.timeline.map(function (item, i) {
          return h('div', { key: i, className: 'do-timeline-row' },
            h('span', { className: 'do-timeline-time' }, item.time),
            h('span', null, item.event))
        }))
      ) : null,
      m.cause ? h('div', { style: { marginTop: '8px' } }, h('span', { className: 'do-label' }, '根因'), h('div', { className: 'do-muted' }, displayValue(m.cause, '—'))) : null,
      m.impact ? h(Impact, { impact: m.impact }) : null,
      (m.actions || []).length ? h('div', null,
        h('div', { className: 'do-label' }, '处置'),
        m.actions.map(function (action, i) {
          return h('div', { key: i, className: 'do-task' },
            h('span', { className: 'do-dot', 'data-tone': action.status === '已完成' ? 'pass' : 'brand' }),
            h('span', { className: 'do-task-name' }, action.action),
            h('span', { className: 'do-task-meta' }, action.owner + ' · ' + action.status))
        })
      ) : null,
      m.evidence && m.evidence.query ? h('div', { style: { marginTop: '8px' } },
        h('div', { className: 'do-label' }, '证据'),
        h('pre', { className: 'do-logic', style: { margin: '0', whiteSpace: 'pre-wrap' } }, m.evidence.query),
        h('div', { className: 'do-muted' }, [m.evidence.timeRange, m.evidence.env, m.evidence.cost].filter(Boolean).join(' · '))) : null,
      h(Gaps, { gaps: m.gaps })
    )
  }

  function ProfileCard(props) {
    var m = parseModel(props.block, 'profile')
    if (!m) return h(Fallback, props)
    var columns = m.columns || []
    return h(Frame, {
      title: '数据画像 · ' + (m.table || ''),
      state: 'done',
      tone: m.partial ? 'warn' : 'pass',
      pills: [h(Pill, { key: 'rows', tone: 'brand' }, (m.rowCount || 0) + ' 行')],
      footer: [h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'profile.yaml'))]
    },
      h('dl', { className: 'do-grid' },
        h('dt', null, '粒度'), h('dd', null, m.grain || '—'),
        h('dt', null, '候选键'), h('dd', null, (m.candidateKeys || []).join(', ') || '—'),
        h('dt', null, 'join 覆盖'), h('dd', null, (m.joinCoverage || []).map(function (j) { return j.from + ' → ' + j.to + ' ' + j.coverage }).join('；') || '—')
      ),
      columns.length ? h('div', null,
        h('div', { className: 'do-label' }, '列画像'),
        h('div', { className: 'do-grid' }, columns.slice(0, 6).map(function (c, i) {
          return h(React.Fragment, { key: 'c' + i },
            h('dt', null, c.name),
            h('dd', null, (c.type || '') + ' · 空值 ' + (c.nullRate || '—') + ' · distinct ' + (c.distinct === undefined ? '—' : c.distinct)))
        }))
      ) : null,
      (m.findings || []).length ? h('div', { style: { marginTop: '7px' } },
        h('div', { className: 'do-label' }, '发现'),
        m.findings.map(function (finding, i) {
          return h('div', { key: i, className: 'do-task' }, h('span', { className: 'do-dot', 'data-tone': 'brand' }), h('span', { className: 'do-task-name' }, finding))
        })
      ) : null,
      h(Gaps, { gaps: m.gaps })
    )
  }

  function AnalysisCard(props) {
    var m = parseModel(props.block, 'analysis')
    var artifact = React.useState(false)
    if (!m) return h(Fallback, props)
    var blocked = m.status === 'blocked' || (m.gaps || []).some(function (g) { return g.severity === 'blocking' })
    var dm = m.dataMap || m.datamap || {}
    var candidates = m.candidates || []
    return h(Frame, {
      title: '方案 · 数据分析 · ' + (m.question || m.title || ''),
      state: blocked ? 'done' : 'done',
      tone: blocked ? 'warn' : 'pass',
      pills: [h(Pill, { key: 's', tone: blocked ? 'warn' : 'pass' }, statusText(m.status || 'draft')), h(Pill, { key: 'n' }, (m.findings || []).length + ' 个发现')],
      footer: [
        h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'analysis.yaml')),
        h(Btn, { key: 'open', variant: 'ghost', onClick: function () { artifact[1](true) } }, '查看交付物')
      ]
    },
      h('div', { className: 'do-muted' }, '问题：' + displayValue(m.question, '—')),
      dm.path || dm.assets ? h('div', null, h('div', { className: 'do-label' }, 'DataMap 寻源'), h(DataMapPath, { path: dm.path || [] }), h(AssetCards, { assets: dm.assets || [] })) : null,
      (m.questions || []).length ? h('div', null, h('div', { className: 'do-label' }, '分析问题'), m.questions.map(function (q, i) { return h('div', { key: i, className: 'do-task' }, h('span', { className: 'do-dot', 'data-tone': q.status === 'blocked' ? 'warn' : 'pass' }), h('span', { className: 'do-task-name' }, q.id ? q.id + ' · ' + q.text : q.text), h('span', { className: 'do-task-meta' }, statusText(q.status))) })) : null,
      (m.findings || []).length ? h('div', null, h('div', { className: 'do-label' }, '发现'),
        m.findings.map(function (f, i) { return h('div', { key: i, className: 'do-ev' }, h('span', { className: 'do-dot', 'data-tone': f.severity === 'blocking' ? 'fail' : f.severity === 'warning' ? 'warn' : 'pass' }), h('div', null, h('div', { className: 'do-et' }, displayValue(f.title || f.claim, '—')), h('div', { className: 'do-es' }, displayValue(f.claim || f.detail, '')), evidenceChips(f.evidence || (f.evidenceId ? [f.evidenceId] : null)))) })) : null,
      (m.baseline || []).length ? h('div', null, h('div', { className: 'do-label' }, '基线 / 对账'), h('div', { className: 'do-cols' }, m.baseline.map(function (b, i) { return h('div', { key: i, className: 'do-task' }, h('span', { className: 'do-dot', 'data-tone': b.status === 'blocked' ? 'warn' : 'pass' }), h('span', { className: 'do-task-name' }, b.metric + ' · ' + (b.old || b.before || '—') + ' → ' + (b.new || b.after || '—')), h('span', { className: 'do-task-meta' }, b.status === 'blocked' ? 'blocked' : (b.delta || 'measured'))) }))) : null,
      candidates.length ? h('div', null, h('div', { className: 'do-label' }, '候选比较'), h('table', { className: 'do-opt-table' }, h('thead', null, h('tr', null, h('th', null, '候选'), h('th', null, '资产'), h('th', null, '结论'))), h('tbody', null, candidates.map(function (c, i) { return h('tr', { key: i }, h('td', null, c.id + (c.fit ? ' · ' + c.fit : '')), h('td', null, c.source || c.datamapAsset || '—'), h('td', null, joinText(c.pros, '；') || displayValue(c.reason, '—'))) })))) : null,
      m.recommendation ? h('div', { style: { marginTop: '7px' } }, h('span', { className: 'do-label' }, '建议'), h('div', { className: 'do-muted' }, '候选 ' + (m.recommendation.candidate || '—') + '：' + (joinText(m.recommendation.rationale, '；') || '—'))) : null,
      m.conclusion ? h('div', { style: { marginTop: '7px' } }, h('span', { className: 'do-label' }, '结论'), h('div', { className: 'do-muted' }, displayValue(m.conclusion, '—'))) : null,
      evidenceChips(m.evidence),
      h(Gaps, { gaps: m.gaps }),
      blocked ? h('div', { className: 'do-signoff' }, h('span', { className: 'do-signoff-title' }, '阻塞'), h('span', { className: 'do-muted' }, 'blocking gap 未关闭，不能 pass'),
        h(Btn, { variant: 'primary', onClick: function () { composeMessage('补充 mock 证据：用 closed 证据重新评估 3a，并保留 mock 标记') } }, '补充 mock 证据')
      ) : null,
      h(SignoffPanel, { model: m, gate: 'scheme.analysis', roles: blocked ? [] : [{ key: 'ba', label: 'BA', actor: (m.review && m.review.ba && m.review.ba.approver) || '陈璐', action: 'BA 签收' }] }),
      h(ArtifactModal, { open: artifact[0], onClose: function () { artifact[1](false) }, artifact: deliverablePath(m), value: m })
    )
  }

  function SolutionCard(props) {
    var m = parseModel(props.block, 'solution')
    var artifact = React.useState(false)
    if (!m) return h(Fallback, props)
    var blocked = m.status === 'blocked' || (m.gaps || []).some(function (g) { return g.blockingFor === 'solution' || (g.severity === 'blocking' && !g.blockingFor) })
    var options = m.options || []
    return h(Frame, {
      title: '需求方案 · ' + (m.target || m.title || ''),
      state: 'done',
      tone: blocked ? 'warn' : 'pass',
      pills: [h(Pill, { key: 's', tone: blocked ? 'warn' : 'pass' }, statusText(m.status || 'draft')), h(Pill, { key: 'd' }, (m.decisions || []).length + ' 个决策')],
      footer: [h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'solution.yaml')), h(Btn, { key: 'open', variant: 'ghost', onClick: function () { artifact[1](true) } }, '查看交付物')]
    },
      m.summary || m.scope ? h('div', { className: 'do-muted' }, displayValue(m.summary || m.scope, '')) : null,
      options.length ? h('div', null, h('div', { className: 'do-label' }, '方案选择'),
        h('table', { className: 'do-opt-table' },
          h('thead', null, h('tr', null, h('th', null, '方案'), h('th', null, '范围/影响'), h('th', null, 'Tradeoff'), h('th', null, '结论'))),
          h('tbody', null, options.map(function (opt, i) {
            var chosen = opt.id === m.chosenOption || opt.chosen === true
            return h('tr', { key: i, 'data-chosen': chosen ? 'true' : undefined },
              h('td', null, (chosen ? '● ' : '') + (opt.id || '') + ' · ' + (opt.name || '')),
              h('td', null, displayValue(opt.scopeDelta || opt.summary, '') + (opt.impactCount != null ? ' · 影响 ' + opt.impactCount : '')),
              h('td', null, joinText(opt.pros, '；') || displayValue(opt.tradeoff, '—')),
              h('td', null, chosen ? '采用' : (opt.rejectedReason || '未采用')))
          }))
        )) : null,
      (m.decisions || []).length ? h('div', null, h('div', { className: 'do-label' }, '关键决策'), m.decisions.map(function (d, i) { return h('div', { key: i, className: 'do-ev' }, h('span', { className: 'do-dot', 'data-tone': 'pass' }), h('div', null, h('div', { className: 'do-et' }, displayValue(d.question || d.decision, '—')), h('div', { className: 'do-es' }, displayValue(d.reason || d.tradeoff, '')), evidenceChips(d.evidence))) })) : null,
      (m.impacts && (m.impacts.assets || []).length) ? h('div', null, h('div', { className: 'do-label' }, '影响'), h('div', { className: 'do-kv' }, m.impacts.assets.map(function (a, i) { return h(Pill, { key: i }, (a.id || a.name) + (a.change ? ' · ' + a.change : '')) }))) : null,
      (m.dependencies || []).length ? h('div', { className: 'do-muted', style: { marginTop: '7px' } }, '依赖：' + m.dependencies.map(function (d) { return (d.id || '') + ' ' + (d.need || d.from || '') }).join('；')) : null,
      (m.constraints || []).length ? h('div', { className: 'do-muted', style: { marginTop: '5px' } }, '约束：' + m.constraints.map(function (c) { return displayValue(c && c.text || c, '') }).join('；')) : null,
      (m.risks || []).length ? h('div', { className: 'do-muted', style: { marginTop: '5px' } }, '风险：' + m.risks.map(function (r) { return displayValue(r && (r.risk || r.description), '') }).join('；')) : null,
      h(Gaps, { gaps: m.gaps }),
      h(SignoffPanel, { model: m, gate: 'scheme.solution', roles: blocked ? [] : [{ key: 'ba', label: 'BA', actor: (m.review && m.review.ba && m.review.ba.approver) || '陈璐', action: 'BA 签收' }] }),
      h(ArtifactModal, { open: artifact[0], onClose: function () { artifact[1](false) }, artifact: deliverablePath(m), value: m })
    )
  }

  function CicdCard(props) {
    var m = parseModel(props.block, 'cicd')
    if (!m) return h(Fallback, props)
    var phase = m.phase || 'scan'
    return h(Frame, {
      title: 'CICD · ' + (phase === 'scan' ? '扫描' : phase),
      state: m.status === 'pass' ? 'done' : 'running',
      tone: m.status === 'pass' ? 'pass' : 'warn',
      pills: [h(Pill, { key: 'run' }, m.runId || 'run')],
      footer: [h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'scan-report.yaml'))]
    },
      (m.checks || []).length ? h('div', null,
        h('div', { className: 'do-label' }, '检查项'),
        m.checks.map(function (check, i) {
          return h('div', { key: i, className: 'do-task' },
            h('span', { className: 'do-dot', 'data-tone': check.status === 'pass' ? 'pass' : 'warn' }),
            h('span', { className: 'do-task-name' }, check.name),
            h('span', { className: 'do-task-meta' }, check.detail || check.status))
        })
      ) : null,
      m.summary ? h('div', { className: 'do-muted', style: { marginTop: '6px' } }, '错误 ' + m.summary.errors + ' · 警告 ' + m.summary.warnings) : null,
      h(Gaps, { gaps: m.gaps })
    )
  }

  function PipelineCard(props) {
    var m = parseModel(props.block, 'cicd')
    var artifact = React.useState(false)
    if (!m) return h(Fallback, props)
    var pipe = m.pipeline || {}
    var pkg = m.artifact || {}
    var ext = m.externalDeployment || {}
    var environments = ext.environments || []
    var stages = [
      ['build', 'Build'], ['scan', 'Scan'], ['test', 'Test'], ['package', 'Package']
    ]
    function tone(v) { return v === 'passed' || v === 'pass' || v === 'succeeded' || v === 'deployed' ? 'pass' : v === 'failed' || v === 'blocked' ? 'fail' : v === 'manual' || v === 'pending' ? 'warn' : 'brand' }
    return h(Frame, {
      title: '数据 CICD · ' + (m.target || '制品流水线'),
      state: m.status === 'succeeded' || m.status === 'done' ? 'done' : 'running',
      tone: tone(m.status),
      pills: [h(Pill, { key: 'run', tone: 'brand' }, m.pipelineRunId || 'run'), h(Pill, { key: 'status', tone: tone(m.status) }, statusText(m.status || 'running')), m.commit ? h(Pill, { key: 'commit' }, m.commit) : null],
      footer: [h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'cicd.yaml')),
        h(Btn, { key: 'open', variant: 'ghost', onClick: function () { artifact[1](true) } }, '查看制品清单')]
    },
      h('div', { className: 'do-cicd-pipeline' }, stages.map(function (pair) {
        return h('div', { key: pair[0], className: 'do-cicd-step', 'data-state': pipe[pair[0]] || 'queued' },
          h('span', { className: 'do-cicd-step-name' }, pair[1]),
          h('span', { className: 'do-pill', 'data-tone': tone(pipe[pair[0]]) }, statusText(pipe[pair[0]] || 'queued')))
      })),
      pkg.package ? h('div', { className: 'do-cicd-artifact' },
        h('div', { className: 'do-label' }, '制品包'),
        h('div', { className: 'do-code' }, pkg.package),
        h('div', { className: 'do-muted' }, 'digest ' + (pkg.digest || '—') + ' · manifest ' + (pkg.manifest || '—') + ' · checksum ' + (pkg.checksum || '—'))
      ) : null,
      environments.length ? h('div', { className: 'do-cicd-env' },
        h('div', { className: 'do-label' }, '外部环境（只读）'),
        h('div', { className: 'do-cicd-envs' }, environments.map(function (env) {
          return h('div', { key: env.name, className: 'do-cicd-envnode', 'data-state': env.status },
            h('span', { className: 'do-cicd-envname' }, env.name),
            h('span', { className: 'do-cicd-envstatus' }, env.status || 'pending'))
        })),
        h('div', { className: 'do-muted', style: { marginTop: '5px' } }, '部署与审批由 ' + (ext.platform || '外部发布平台') + ' 负责；DataOps 只记录状态' + (ext.approvalId ? ' · 外部审批 ' + ext.approvalId : ''))
      ) : null,
      (m.reports || []).length ? h('div', { className: 'do-dev-artifacts' }, h('div', { className: 'do-label' }, '流水线报告'), m.reports.map(function (r, i) { return h('span', { key: i, className: 'do-chip' }, r.type + ' · ' + r.path) })) : null,
      h(Gaps, { gaps: m.gaps }),
      h(ArtifactModal, { open: artifact[0], onClose: function () { artifact[1](false) }, artifact: deliverablePath(m) || pkg.manifest, value: m })
    )
  }

  function ScheduleCard(props) {
    var m = parseModel(props.block, 'schedule')
    var copied = React.useState(false)
    if (!m) return h(Fallback, props)
    function copy() {
      if (typeof navigator === 'undefined' || !navigator.clipboard) return
      navigator.clipboard.writeText(m.yaml || '').then(function () { copied[1](true) })
    }
    return h(Frame, {
      title: 'CICD · 编译 · schedule.yaml',
      state: m.status === 'validated' ? 'done' : 'running',
      tone: m.status === 'validated' ? 'pass' : 'warn',
      pills: [h(Pill, { key: 'd', tone: 'brand' }, m.dialect || 'mock')],
      footer: [
        h('span', { key: 'meta', className: 'do-muted do-meta' }, metaLine(m, 'schedule.yaml')),
        h(Btn, { key: 'copy', variant: 'ghost', onClick: copy }, copied[0] ? '已复制' : '复制 YAML')
      ]
    },
      m.compile ? h('div', { className: 'do-muted', style: { marginBottom: '6px' } }, 'CLI · ' + m.compile.command + ' · exit ' + m.compile.exitCode + ' · ' + m.compile.durationMs + 'ms') : null,
      (m.diagnostics || []).length ? h('div', null,
        h('div', { className: 'do-label' }, '诊断'),
        m.diagnostics.map(function (d, i) {
          return h('div', { key: i, className: 'do-task' },
            h('span', { className: 'do-dot', 'data-tone': d.severity === 'error' ? 'warn' : 'brand' }),
            h('span', { className: 'do-task-name' }, d.code),
            h('span', { className: 'do-task-meta' }, d.message))
        })
      ) : null,
      h('pre', { className: 'do-logic', style: { margin: '7px 0 0', maxHeight: '190px', overflow: 'auto', whiteSpace: 'pre-wrap' } }, m.yaml || ''),
      h(Gaps, { gaps: m.gaps })
    )
  }

  var CardBoundary = typeof React.Component === 'function'
    ? class CardBoundary extends React.Component {
      constructor(props) { super(props); this.state = { error: null } }
      static getDerivedStateFromError(error) { return { error: error } }
      render() {
        if (this.state.error) {
          return h('div', { className: 'do-card', 'data-state': 'error' },
            h('div', { className: 'do-head' }, h('span', { className: 'do-dot', 'data-tone': 'fail' }), h('span', { className: 'do-title' }, '卡片渲染失败')),
            h('div', { className: 'do-muted' }, String(this.state.error && this.state.error.message || this.state.error || 'unknown error')),
            h('div', { className: 'do-muted' }, '其他卡片和阶段导航仍可用；请检查 payload 字段。')
          )
        }
        return this.props.children
      }
    }
    : function CardBoundaryFallback(props) { return props.children }

  function DeliverableRenderer(props) {
    var m = parseModel(props.block)
    if (!m || !m.kind) return h(Fallback, props)
    var cards = {
      intake: IntakeCard,
      requirement: RequirementCard,
      design: DesignCard,
      analysis: AnalysisCard,
      solution: SolutionCard,
      tech_plan: TechPlanCard,
      develop: DevelopCard,
      cicd: PipelineCard,
      postmortem: PostmortemCard,
      incident: IncidentCard
    }
    var Card = cards[m.kind]
    if (!Card) return h(Fallback, props)
    return h(CardBoundary, null, h(Card, props))
  }

  function StageResultCard(props) {
    var m = parseModel(props.block)
    if (!m) return h(Fallback, props)
    if (m.kind === 'workitem') {
      return h(Frame, {
        title: '阶段状态 · ' + (m.stage || '') + (m.substage ? ' / ' + m.substage : ''),
        state: 'done',
        tone: 'pass',
        pills: [h(Pill, { key: 'id' }, m.id || ''), h(Pill, { key: 'st', tone: 'brand' }, statusText(m.status || ''))]
      },
        h('dl', { className: 'do-grid' },
          h('dt', null, '阶段'), h('dd', null, (m.stage || '—') + (m.substage ? ' / ' + m.substage : '')),
          h('dt', null, '下一步'), h('dd', null, m.next || '—')
        ),
        (m.approvals || []).length ? h('div', { className: 'do-kv', style: { marginTop: '7px' } }, m.approvals.map(function (a, i) { return h(Pill, { key: i, tone: a.status === 'approved' ? 'pass' : undefined }, a.gate + ' · ' + statusText(a.status)) })) : null
      )
    }
    return h(DeliverableRenderer, props)
  }

  return {
    installStyles: installStyles,
    USPickerCard: USPickerCard,
    IntakeCard: IntakeCard,
    RequirementCard: RequirementCard,
    DesignCard: DesignCard,
    TableCard: TableCard,
    LineageCard: LineageCard,
    LineageV2Card: LineageV2Card,
    TechPlanCard: TechPlanCard,
    EvidenceCard: EvidenceCard,
    ProfileCard: ProfileCard,
    AnalysisCard: AnalysisCard,
    SolutionCard: SolutionCard,
    CicdCard: CicdCard,
    PipelineCard: PipelineCard,
    ScheduleCard: ScheduleCard,
    DevelopCard: DevelopCard,
    TestCard: TestCard,
    ReleaseCard: ReleaseCard,
    PostmortemCard: PostmortemCard,
    IncidentCard: IncidentCard,
    DeliverableRenderer: DeliverableRenderer,
    StageResultCard: StageResultCard,
    _internals: { parseModel: parseModel, textParts: textParts, Modal: Modal, DesignCanvas: DesignCanvas, ArtifactModal: ArtifactModal }
  }
}
