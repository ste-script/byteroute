#!/usr/bin/env node
/**
 * Runs cucumber-js under c8 to collect e2e coverage.
 *
 * c8 stores raw V8 coverage files in coverage/e2e/tmp/ (driven by the
 * reportsDir in .c8rc.json).  Those files contain a `result` array (V8
 * format) plus a `source-map-cache` object with `lineLengths` for every
 * TypeScript file loaded by tsx — exactly what monocart-coverage-reports
 * needs to process them in "fake-source" mode without trying to parse
 * TypeScript directly.
 *
 * The coverage:merge step reads these raw V8 files via mcr.addFromDir().
 */
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Clean stale V8 temp files so the merge never sees data from a previous run.
const tmpDir = resolve(root, 'coverage/e2e/tmp');
rmSync(tmpDir, { recursive: true, force: true });

// Run c8 + cucumber.  c8 sets NODE_V8_COVERAGE → coverage/e2e/tmp, then
// runs v8-to-istanbul to produce coverage/e2e/coverage-final.json.
execSync(
  `node_modules/.bin/c8 cucumber-js 'test/features/**/*.feature' ` +
  `--import 'test/features/support/**/*.ts' ` +
  `--import 'test/features/step_definitions/**/*.ts'`,
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--import tsx' },
  },
);

