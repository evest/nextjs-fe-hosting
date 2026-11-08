#!/usr/bin/env node
// Runs a command with the "current environment" loaded, .NET-style:
//
//   .env           common settings + APP_ENV (the current environment)
//   .env.<APP_ENV> settings for that environment: CMS credentials, Graph key,
//                  CMS URL, NEXT_PUBLIC_SITE_URL, App Insights, ...
//
// Precedence: shell environment > .env.<APP_ENV> > .env. So
// `APP_ENV=prod npm run cms:diff` targets prod for one run without editing
// .env. Every tool we run (CMS CLI, opticloud, next dev) loads .env itself
// through dotenv/Next, but neither overrides a variable that is already set,
// so the values loaded here win.
//
// Fail-safe: the CMS credentials must live in .env.<APP_ENV>, never in .env.
// Running the CMS CLI directly (without this wrapper) then fails with
// "missing credentials" instead of silently using whichever CMS .env pointed at.
//
// Don't name the files .env.development / .env.production / .env.test: Next.js
// auto-loads those by NODE_ENV (a local `next build` would pick up prod keys).
//
// Usage: node scripts/env.mjs [--confirm-prod] <command> [args...]
//   --confirm-prod  ask for confirmation before running against prod
//                   (non-interactive: requires CONFIRM_PROD=1)

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RESERVED = ['development', 'production', 'test', 'local'];
const ENV_ONLY_KEYS = ['OPTIMIZELY_CMS_CLIENT_ID', 'OPTIMIZELY_CMS_CLIENT_SECRET'];

function fail(message) {
  console.error(`\x1b[31m[env] ${message}\x1b[0m`);
  process.exit(1);
}

function readEnvFile(name) {
  const path = join(ROOT, name);
  return existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : null;
}

function availableEnvs() {
  return readdirSync(ROOT)
    .map((f) => /^\.env\.([a-z0-9-]+)$/i.exec(f)?.[1])
    .filter((e) => e && e !== 'template' && !RESERVED.includes(e));
}

let args = process.argv.slice(2);
const confirmProd = args[0] === '--confirm-prod';
if (confirmProd) args = args.slice(1);
if (args.length === 0) fail('usage: node scripts/env.mjs [--confirm-prod] <command> [args...]');

const base = readEnvFile('.env') ?? {};
const appEnv = process.env.APP_ENV || base.APP_ENV;
if (!appEnv) {
  fail(`APP_ENV is not set. Add APP_ENV=<env> to .env (available: ${availableEnvs().join(', ') || 'none'}).`);
}
if (RESERVED.includes(appEnv)) {
  fail(`APP_ENV=${appEnv} is reserved by Next.js (.env.${appEnv} is auto-loaded). Use dev, stage or prod.`);
}
const specific = readEnvFile(`.env.${appEnv}`);
if (!specific) {
  fail(`.env.${appEnv} not found (APP_ENV=${appEnv}). Available: ${availableEnvs().join(', ') || 'none'}.`);
}
const leaked = ENV_ONLY_KEYS.filter((k) => base[k]);
if (leaked.length > 0) {
  fail(`${leaked.join(', ')} must be in .env.<env>, not .env — otherwise the CMS CLI run without this wrapper targets that CMS.`);
}

for (const vars of [specific, base]) {
  for (const [key, value] of Object.entries(vars)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
process.env.APP_ENV = appEnv;

const target = process.env.OPTIMIZELY_CMS_URL ? ` → ${process.env.OPTIMIZELY_CMS_URL}` : '';
const color = appEnv === 'prod' ? '\x1b[41;97m' : '\x1b[44;97m';
console.error(`${color} APP_ENV=${appEnv} \x1b[0m .env.${appEnv} + .env${target}`);
const empty = Object.keys(specific).filter((k) => !specific[k] && !process.env[k]);
if (empty.length > 0) console.error(`\x1b[33m[env] empty in .env.${appEnv}: ${empty.join(', ')}\x1b[0m`);

if (confirmProd && appEnv === 'prod' && process.env.CONFIRM_PROD !== '1') {
  if (!process.stdin.isTTY) fail('Refusing to run against prod non-interactively. Set CONFIRM_PROD=1.');
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await rl.question(`This runs "${args.join(' ')}" against PRODUCTION. Type "prod" to continue: `);
  rl.close();
  if (answer.trim() !== 'prod') fail('Aborted.');
}

// npm puts node_modules/.bin on PATH for scripts. Windows needs a shell to
// resolve the .cmd shims, and a shell takes one command string, so quote args.
const quote = (a) => (/^[\w@%+=:,./\\-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);
const child =
  process.platform === 'win32'
    ? spawn(args.map(quote).join(' '), { stdio: 'inherit', shell: true })
    : spawn(args[0], args.slice(1), { stdio: 'inherit' });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
