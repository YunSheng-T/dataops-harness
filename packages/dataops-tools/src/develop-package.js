/**
 * Materialize the Stage 4 multi-artifact bundle for the local demo.
 * These are mock files; they are not a real code merge.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const FILES = [
  ['sql/create_or_replace.sql', 'create or replace table dws.trade_channel_daily as\nselect 1 as mock;\n'],
  ['sql/etl.sql', '-- mock paid-order ETL\nselect 1;\n'],
  ['sql/reconcile.sql', '-- mock reconciliation\nselect 1;\n'],
  ['sql/rollback.sql', '-- mock rollback\nselect 1;\n'],
  ['etl/etl_channel_pay.yaml', 'kind: etl\nname: channel_pay\nmock: true\n'],
  ['schedule/channel_pay_daily.yaml', 'kind: schedule\nname: channel_pay_daily\ncron: "0 5 * * *"\n'],
  ['api/channel_metrics_api.yaml', 'kind: data_consume_api\nname: channel_metrics\nmock: true\n'],
  ['ops/datasource.yaml', 'kind: datasource\nsource: mock\n'],
  ['ops/deploy.sh', '#!/bin/sh\necho mock deploy to dev; no real deployment\n'],
  ['tests/test-report.md', '# mock Stage 4 test report\n\n- main key: pass\n- empty channel: manual\n- automated: false\n']
]

export function buildDevelopArtifacts(root, workitemId) {
  const base = join(root, workitemId, 'deliverables', 'develop')
  const files = []
  for (const [name, content] of FILES) {
    const path = join(base, name)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, content, 'utf8')
    files.push({ type: name.split('/')[0], path: `deliverables/develop/${name}` })
  }
  const evidence = join(root, workitemId, 'evidence')
  mkdirSync(evidence, { recursive: true })
  writeFileSync(join(evidence, 'ev-develop-attempts.yaml'), 'kind: evidence\nsource: mock\nbuild: passed@2\nscan: passed@2\ndeploy: passed@2\ntest: manual\n', 'utf8')
  return files
}
