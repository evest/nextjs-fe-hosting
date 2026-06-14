#!/usr/bin/env node
// Lighthouse harness — history viewer.
//
// Prints results/history.jsonl as a table so you can see scores trend over
// time across runs/deploys. Each `run.mjs` invocation appends one row.
//
// Usage:
//   node scripts/lighthouse/history.mjs                 # all rows
//   node scripts/lighthouse/history.mjs --mobile        # filter form factor
//   node scripts/lighthouse/history.mjs --url .../en    # filter by URL substring

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, 'results', 'history.jsonl');

const argv = process.argv.slice(2);
const onlyMobile = argv.includes('--mobile');
const onlyDesktop = argv.includes('--desktop');
const urlIdx = argv.indexOf('--url');
const urlFilter = urlIdx !== -1 ? argv[urlIdx + 1] : null;

let rows;
try {
  rows = readFileSync(FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
} catch {
  console.error('No history yet. Run: node scripts/lighthouse/run.mjs');
  process.exit(1);
}

rows = rows.filter((r) => {
  if (onlyMobile && r.formFactor !== 'mobile') return false;
  if (onlyDesktop && r.formFactor !== 'desktop') return false;
  if (urlFilter && !r.url.includes(urlFilter)) return false;
  return true;
});

const pad = (s, n) => String(s ?? '-').padEnd(n);
const padL = (s, n) => String(s ?? '-').padStart(n);

console.log(
  pad('When', 17), pad('FF', 7), padL('Perf', 4), padL('A11y', 4), padL('BP', 4), padL('SEO', 4),
  padL('LCP', 7), padL('TBT', 6), padL('CLS', 5), ' Label',
);
console.log('-'.repeat(86));
let prev = null;
for (const r of rows) {
  const s = r.scores || {};
  const me = r.metrics || {};
  const lcp = me.lcp_ms != null ? `${Math.round(me.lcp_ms)}ms` : '-';
  const tbt = me.tbt_ms != null ? `${Math.round(me.tbt_ms)}ms` : '-';
  const cls = me.cls != null ? Number(me.cls).toFixed(3) : '-';
  // delta arrow on performance vs previous matching row
  let delta = '';
  if (prev && prev.scores?.performance != null && s.performance != null) {
    const d = s.performance - prev.scores.performance;
    delta = d > 0 ? ` ▲${d}` : d < 0 ? ` ▼${-d}` : '';
  }
  console.log(
    pad(r.ts, 17), pad(r.formFactor, 7),
    padL(s.performance, 4), padL(s.accessibility, 4), padL(s['best-practices'], 4), padL(s.seo, 4),
    padL(lcp, 7), padL(tbt, 6), padL(cls, 5),
    ` ${r.label || ''}${delta}`,
  );
  prev = r;
}
