#!/usr/bin/env node
// Lighthouse harness — trimmer.
//
// Raw Lighthouse JSON is 500KB+ (embedded screenshots, full DOM, network logs)
// and blows an LLM's context. This extracts the SIGNAL: category scores, the
// throttling profile, and every sub-0.9 audit with its offender rows and
// estimated savings — ranked by impact. Output is markdown, ready to paste to
// Claude (or pipe into a CLAUDE-style fix plan).
//
// Usage:
//   node scripts/lighthouse/trim.mjs <path-to-report.json>
//   node scripts/lighthouse/trim.mjs                # uses the latest in results/

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(HERE, 'results');

function latestReport() {
  const dirs = readdirSync(RESULTS_DIR)
    .map((d) => join(RESULTS_DIR, d))
    .filter((p) => {
      try { return statSync(p).isDirectory(); } catch { return false; }
    })
    .sort();
  for (const d of dirs.reverse()) {
    const r = join(d, 'report.json');
    try { statSync(r); return r; } catch { /* keep looking */ }
  }
  return null;
}

const path = process.argv[2] || latestReport();
if (!path) {
  console.error('No report.json given and none found in results/. Run run.mjs first.');
  process.exit(1);
}

const lhr = JSON.parse(readFileSync(path, 'utf8'));
const A = lhr.audits || {};
const cfg = lhr.configSettings || {};
const out = [];

out.push(`# Lighthouse summary`);
out.push('');
out.push(`- **URL:** ${lhr.finalDisplayedUrl || lhr.finalUrl}`);
out.push(`- **Fetched:** ${lhr.fetchTime}`);
out.push(`- **Form factor:** ${cfg.formFactor} | throttling: ${cfg.throttlingMethod}`);
out.push('');

out.push('## Scores');
for (const [k, c] of Object.entries(lhr.categories || {})) {
  const s = c.score == null ? 'n/a' : Math.round(c.score * 100);
  out.push(`- ${c.title}: **${s}**`);
}
out.push('');

// Core metrics
const m = (k) => A[k]?.displayValue || '-';
out.push('## Core metrics');
out.push(`- LCP ${m('largest-contentful-paint')} | FCP ${m('first-contentful-paint')} | TBT ${m('total-blocking-time')} | CLS ${m('cumulative-layout-shift')} | SI ${m('speed-index')}`);
out.push('');

// LCP element + phase breakdown if present
const lcpEl = A['largest-contentful-paint-element']?.details?.items || [];
for (const it of lcpEl) {
  const node = it.node || (Array.isArray(it.items) ? it.items.find((x) => x.node)?.node : null);
  if (node) {
    out.push('## LCP element');
    out.push('```');
    out.push(`selector: ${node.selector}`);
    if (node.snippet) out.push(`snippet:  ${node.snippet.slice(0, 200)}`);
    out.push('```');
    out.push('');
    break;
  }
}

// Failing / improvable audits, per category, ranked by savings then score.
function savings(a) {
  const d = a.details || {};
  return d.overallSavingsMs || 0;
}
function offenders(a, limit = 6) {
  const items = (a.details && a.details.items) || [];
  const rows = [];
  for (const it of items.slice(0, limit)) {
    const url = it.url || it.source || (it.node && it.node.selector) || '';
    const ms = it.wastedMs != null ? `${Math.round(it.wastedMs)}ms` : '';
    const kb = it.wastedBytes != null ? `${Math.round(it.wastedBytes / 1024)}KiB` : (it.totalBytes != null ? `${Math.round(it.totalBytes / 1024)}KiB` : '');
    // legacy-javascript style sub-items (feature names)
    let sub = '';
    if (it.subItems && Array.isArray(it.subItems.items)) {
      sub = ' [' + it.subItems.items.map((s) => s.signal || s.reason || s.name || '').filter(Boolean).slice(0, 8).join(', ') + ']';
    }
    const tag = [ms, kb].filter(Boolean).join(' / ');
    rows.push(`    - ${tag ? tag + '  ' : ''}${String(url).slice(0, 110)}${sub}`);
  }
  return rows;
}

for (const [catKey, cat] of Object.entries(lhr.categories || {})) {
  const refs = cat.auditRefs || [];
  const failing = refs
    .map((r) => A[r.id])
    .filter((a) => a && a.score != null && a.score < 0.9)
    .sort((a, b) => savings(b) - savings(a) || a.score - b.score);
  if (failing.length === 0) continue;
  out.push(`## ${cat.title} — ${failing.length} item(s) to fix`);
  for (const a of failing) {
    const sav = savings(a);
    const savTag = sav ? `  (~${Math.round(sav)}ms)` : '';
    out.push(`- **[${Math.round(a.score * 100)}] ${a.id}** — ${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}${savTag}`);
    out.push(...offenders(a));
  }
  out.push('');
}

// "Do not regress" — currently-passing perf audits with prior savings potential.
out.push('## Do not regress (currently passing)');
const passing = (lhr.categories?.performance?.auditRefs || [])
  .map((r) => A[r.id])
  .filter((a) => a && a.score === 1 && (a.details?.items?.length || 0) >= 0 && /image|javascript|cache|render|font|cls|lcp|blocking/i.test(a.id))
  .map((a) => a.id);
out.push(passing.length ? '- ' + passing.join(', ') : '- (none flagged)');
out.push('');

console.log(out.join('\n'));
