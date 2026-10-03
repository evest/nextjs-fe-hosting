#!/usr/bin/env node
// CMS schema drift check.
//
// Compares the content types and display templates defined in code
// (optimizely.config.mjs) with what is currently in the CMS. Editors and
// other teams can change types in the CMS UI; a later `cms:push-config` then
// fails as a "breaking change" (or, with --force, silently drops their
// changes). The CLI stops at the first offending type, so this shows all
// drift in one pass.
//
// Read-only: runs `config pull --json` and `config push --dryRun --output`,
// nothing is sent to the CMS.
//
// Usage:
//   node scripts/cms-diff.mjs           # human-readable report
//   node scripts/cms-diff.mjs --json    # machine-readable
//
// Exit code: 0 = in sync, 1 = drift found, 2 = CLI failure.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'node_modules', '@optimizely', 'cms-cli', 'bin', 'run.js');
const asJson = process.argv.includes('--json');

function runCli(args) {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) {
    console.error(`optimizely-cms-cli ${args.join(' ')} failed:\n${res.stderr || res.stdout}`);
    process.exit(2);
  }
  return res.stdout;
}

function loadManifests() {
  const dir = mkdtempSync(join(tmpdir(), 'cms-diff-'));
  try {
    const localFile = join(dir, 'local.json');
    runCli(['config', 'push', './optimizely.config.mjs', '--dryRun', '--output', localFile]);
    const local = JSON.parse(readFileSync(localFile, 'utf8'));
    const pulled = runCli(['config', 'pull', '--json']);
    // Tolerate any banner/log lines before the JSON document.
    const remote = JSON.parse(pulled.slice(pulled.indexOf('{')));
    return { local, remote };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// --- Normalisation -----------------------------------------------------------
// The CLI omits defaults locally (isLocalized: false, empty constraint lists)
// while the CMS returns them explicitly, and array constraints live on
// `items`. Normalise both sides to the fields that matter for drift.

const sorted = (xs) => [...(xs ?? [])].sort().join(', ');

function normProperty(p) {
  return {
    type: p.type,
    itemsType: p.items?.type ?? '',
    contentType: p.contentType ?? p.items?.contentType ?? '',
    isLocalized: !!p.isLocalized,
    isRequired: !!p.isRequired,
    format: p.format ?? p.items?.format ?? '',
    enum: (p.enum ?? p.items?.enum ?? []).map((e) => e.value).join(', '),
    allowedTypes: sorted(p.items ? p.items.allowedTypes : p.allowedTypes),
    restrictedTypes: sorted(p.items ? p.items.restrictedTypes : p.restrictedTypes),
    displayMode: p.displayMode ?? 'available',
  };
}

function normType(t) {
  return {
    baseType: t.baseType,
    compositionBehaviors: sorted(t.compositionBehaviors),
    mayContainTypes: sorted(t.mayContainTypes),
  };
}

function normSettings(dt) {
  const out = {};
  for (const [key, s] of Object.entries(dt.settings ?? {})) {
    out[key] = `${s.editor ?? ''}: ${sorted(Object.keys(s.choices ?? {}))}`;
  }
  return out;
}

function diffFields(a, b) {
  return Object.keys(a)
    .filter((f) => a[f] !== b[f])
    .map((field) => ({ field, code: a[field], cms: b[field] }));
}

// --- Compare -----------------------------------------------------------------

function compare(local, remote) {
  const drift = [];
  const remoteTypes = new Map((remote.contentTypes ?? []).map((t) => [t.key, t]));

  for (const lt of local.contentTypes ?? []) {
    const rt = remoteTypes.get(lt.key);
    if (!rt) {
      drift.push({ kind: 'type', key: lt.key, change: 'only in code (new type)' });
      continue;
    }
    for (const d of diffFields(normType(lt), normType(rt))) {
      drift.push({ kind: 'type', key: lt.key, change: 'differs', ...d });
    }
    const props = new Set([...Object.keys(lt.properties ?? {}), ...Object.keys(rt.properties ?? {})]);
    for (const name of props) {
      const lp = lt.properties?.[name];
      const rp = rt.properties?.[name];
      const key = `${lt.key}.${name}`;
      if (!rp) drift.push({ kind: 'property', key, change: 'only in code (new property)' });
      else if (!lp) drift.push({ kind: 'property', key, change: 'only in CMS (push would delete it)' });
      else {
        for (const d of diffFields(normProperty(lp), normProperty(rp))) {
          drift.push({ kind: 'property', key, change: 'differs', ...d });
        }
      }
    }
  }

  const remoteTemplates = new Map((remote.displayTemplates ?? []).map((t) => [t.key, t]));
  for (const ld of local.displayTemplates ?? []) {
    const rd = remoteTemplates.get(ld.key);
    if (!rd) {
      drift.push({ kind: 'template', key: ld.key, change: 'only in code (new template)' });
      continue;
    }
    const a = normSettings(ld);
    const b = normSettings(rd);
    for (const s of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[s] === b[s]) continue;
      drift.push({ kind: 'template', key: `${ld.key}.${s}`, change: 'differs', field: 'setting', code: a[s] ?? '(none)', cms: b[s] ?? '(none)' });
    }
  }

  // Types/templates that exist only in the CMS are untouched by a push (it
  // only upserts what the config declares), so they are informational:
  // usually built-ins (BlankExperience, ImageMedia, ...) or types owned elsewhere.
  const localTypeKeys = new Set((local.contentTypes ?? []).map((t) => t.key));
  const localTemplateKeys = new Set((local.displayTemplates ?? []).map((t) => t.key));
  const cmsOnly = [
    ...(remote.contentTypes ?? []).filter((t) => !localTypeKeys.has(t.key)).map((t) => `${t.key} (${t.baseType})`),
    ...(remote.displayTemplates ?? []).filter((t) => !localTemplateKeys.has(t.key)).map((t) => `${t.key} (display template)`),
  ];

  return { drift, cmsOnly, remoteTypes };
}

// --- Report ------------------------------------------------------------------

const { local, remote } = loadManifests();
const { drift, cmsOnly, remoteTypes } = compare(local, remote);

if (asJson) {
  console.log(JSON.stringify({ inSync: drift.length === 0, drift, cmsOnly }, null, 2));
} else {
  if (drift.length === 0) {
    console.log('✔ Code and CMS are in sync.');
  } else {
    console.log(`✖ ${drift.length} difference(s) between code and CMS:\n`);
    let lastType;
    for (const d of drift) {
      const typeKey = d.key.split('.')[0];
      if (typeKey !== lastType) {
        const rt = remoteTypes.get(typeKey);
        const who = rt?.lastModifiedBy ? ` — last changed in CMS ${rt.lastModified?.slice(0, 10)} by ${rt.lastModifiedBy}` : '';
        console.log(`${typeKey}${who}`);
        lastType = typeKey;
      }
      const detail = d.field ? ` ${d.field}: code=${JSON.stringify(d.code)} cms=${JSON.stringify(d.cms)}` : '';
      console.log(`  ${d.key}  ${d.change}${detail}`);
    }
  }
  if (cmsOnly.length) {
    console.log(`\nIn CMS only (not managed by this repo, a push leaves these alone):\n  ${cmsOnly.join('\n  ')}`);
  }
}

process.exit(drift.length === 0 ? 0 : 1);
