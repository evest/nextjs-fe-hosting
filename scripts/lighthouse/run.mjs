#!/usr/bin/env node
// Lighthouse harness — runner.
//
// Runs the global `lighthouse` CLI against a URL (default: the Test2
// environment, whose PUBLIC hostname is test.contentgurus.no — NOT
// test2.contentgurus.no, which has no DNS record. The Test2 deploy carries the
// production-like caching we need for representative numbers — NOT localhost),
// N times, takes the MEDIAN run (Lighthouse scores are noisy;
// Google recommends 3–5 runs), saves the median run's JSON + HTML into a
// timestamped folder under results/, and appends one summary row to
// results/history.jsonl so we can track scores over time.
//
// Usage:
//   node scripts/lighthouse/run.mjs                         # test2 /en, mobile, 3 runs
//   node scripts/lighthouse/run.mjs --url https://test.contentgurus.no/no
//   node scripts/lighthouse/run.mjs --desktop               # desktop preset
//   node scripts/lighthouse/run.mjs --runs 5
//   node scripts/lighthouse/run.mjs --label "after-snippet-removed"
//
// Requires: the `lighthouse` CLI on PATH (npm i -g lighthouse) and Chrome.
//
// Why shell out to the CLI instead of importing lighthouse: it keeps this repo
// free of a heavy devDependency, and uses the exact CLI/Chrome the developer
// already runs by hand. The Chrome DevTools MCP (see .mcp.json) is the
// interactive complement — this script is the reproducible, stored-history half.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(HERE, 'results');

// ── args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}
// Default to the Test2 environment's actual public hostname. Note:
// test2.contentgurus.no does NOT resolve — the Test2 deploy is served at
// test.contentgurus.no. Override with --url for any other page/host.
const URL = flag('url', 'https://test.contentgurus.no/en');
const DESKTOP = !!flag('desktop', false);
const RUNS = Number(flag('runs', 3)) || 3;
const LABEL = flag('label', '');
const CATEGORIES = flag('categories', 'performance,accessibility,best-practices,seo');

const FORM_FACTOR = DESKTOP ? 'desktop' : 'mobile';

// Build a filesystem-safe timestamp WITHOUT Date in this module's hot path is
// impossible (we need wall-clock); harness scripts run outside the workflow
// sandbox, so Date is fine here.
function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function slugForUrl(u) {
  try {
    const { hostname, pathname } = new URL(u);
    const path = pathname.replace(/\/+$/, '').replace(/\//g, '-') || '-root';
    return `${hostname}${path}`.replace(/[^a-z0-9.\-]/gi, '_');
  } catch {
    return 'url';
  }
}

function runOnce(tmpPath) {
  const args = [
    URL,
    `--only-categories=${CATEGORIES}`,
    '--output=json',
    `--output-path=${tmpPath}`,
    '--quiet',
    '--chrome-flags=--headless --no-sandbox --disable-gpu',
  ];
  if (DESKTOP) args.push('--preset=desktop');
  // lighthouse CLI lives on PATH; on Windows it's lighthouse.cmd. execFileSync
  // with shell:true handles both.
  execFileSync('lighthouse', args, { stdio: ['ignore', 'ignore', 'inherit'], shell: true });
  return JSON.parse(readFileSync(tmpPath, 'utf8'));
}

function perfScore(lhr) {
  return lhr?.categories?.performance?.score ?? 0;
}

function scores(lhr) {
  const c = lhr.categories || {};
  const pct = (k) => (c[k]?.score == null ? null : Math.round(c[k].score * 100));
  return {
    performance: pct('performance'),
    accessibility: pct('accessibility'),
    'best-practices': pct('best-practices'),
    seo: pct('seo'),
  };
}

function metrics(lhr) {
  const a = lhr.audits || {};
  const num = (k) => a[k]?.numericValue ?? null;
  return {
    lcp_ms: num('largest-contentful-paint'),
    fcp_ms: num('first-contentful-paint'),
    tbt_ms: num('total-blocking-time'),
    cls: num('cumulative-layout-shift'),
    si_ms: num('speed-index'),
    tti_ms: num('interactive'),
  };
}

// ── run N times, pick median by performance score ───────────────────────────
console.log(`Lighthouse ▸ ${URL}  (${FORM_FACTOR}, ${RUNS} run${RUNS > 1 ? 's' : ''})`);
mkdirSync(RESULTS_DIR, { recursive: true });

const runsData = [];
for (let i = 0; i < RUNS; i++) {
  const tmp = join(tmpdir(), `lh-${process.pid}-${i}.json`);
  process.stdout.write(`  run ${i + 1}/${RUNS} … `);
  try {
    const lhr = runOnce(tmp);
    runsData.push(lhr);
    rmSync(tmp, { force: true });
    console.log(`perf ${Math.round(perfScore(lhr) * 100)}`);
  } catch (e) {
    console.log('FAILED');
    console.error(`    ${e.message?.split('\n')[0] ?? e}`);
  }
}
if (runsData.length === 0) {
  console.error('All runs failed. Is `lighthouse` on PATH and Chrome installed?');
  process.exit(1);
}

// Median by performance score (the metric we're optimizing). Odd N → middle;
// even N → the lower-middle (conservative).
runsData.sort((a, b) => perfScore(a) - perfScore(b));
const median = runsData[Math.floor((runsData.length - 1) / 2)];

// ── save median run ─────────────────────────────────────────────────────────
const ts = stamp();
const slug = slugForUrl(URL);
const labelPart = LABEL ? `_${String(LABEL).replace(/[^a-z0-9\-]/gi, '-')}` : '';
const dirName = `${ts}_${slug}_${FORM_FACTOR}${labelPart}`;
const outDir = join(RESULTS_DIR, dirName);
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, 'report.json'), JSON.stringify(median, null, 2));
// Also emit the human HTML by re-running the report generator from the saved
// JSON is non-trivial; instead point the user at the JSON + the trim summary.
// (Open the JSON in the Lighthouse Viewer at https://googlechrome.github.io/lighthouse/viewer/
// or use the Chrome app's own HTML if you want the visual report.)

const sc = scores(median);
const me = metrics(median);
const row = {
  ts,
  iso: new Date().toISOString(),
  url: URL,
  formFactor: FORM_FACTOR,
  label: LABEL || null,
  runs: runsData.length,
  scores: sc,
  metrics: me,
  dir: dirName,
};
appendFileSync(join(RESULTS_DIR, 'history.jsonl'), JSON.stringify(row) + '\n');

// ── print summary ────────────────────────────────────────────────────────────
const fmtMs = (n) => (n == null ? '   -' : `${Math.round(n)}ms`);
console.log('\n  Scores (median of ' + runsData.length + '):');
console.log(`    Performance    ${sc.performance ?? '-'}`);
console.log(`    Accessibility  ${sc.accessibility ?? '-'}`);
console.log(`    Best Practices ${sc['best-practices'] ?? '-'}`);
console.log(`    SEO            ${sc.seo ?? '-'}`);
console.log('  Metrics:');
console.log(`    LCP ${fmtMs(me.lcp_ms)}   FCP ${fmtMs(me.fcp_ms)}   TBT ${fmtMs(me.tbt_ms)}   CLS ${me.cls ?? '-'}   SI ${fmtMs(me.si_ms)}`);
console.log(`\n  Saved: scripts/lighthouse/results/${dirName}/report.json`);
console.log(`  History: scripts/lighthouse/results/history.jsonl`);
console.log(`  Next:  node scripts/lighthouse/trim.mjs ${join('scripts/lighthouse/results', dirName, 'report.json')}`);
