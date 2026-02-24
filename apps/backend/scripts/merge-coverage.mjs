#!/usr/bin/env node
/**
 * Merges raw V8 coverage from vitest (unit) and cucumber/c8 (e2e) using
 * monocart-coverage-reports, keeping everything in the V8 domain so
 * statement-granularity is consistent and the merged % never drops below
 * the higher of the two individual suite values.
 *
 * Unit side  → coverage/unit/raw/
 *   MCR cache files ({id, type:'v8', data:[...]}) written by
 *   vitest-monocart-coverage.  Read via inputDir.
 *
 * E2E side  → coverage/e2e/tmp/
 *   Raw V8 files ({result:[...], source-map-cache:{...}}) written by c8's
 *   NODE_V8_COVERAGE mechanism.  The source-map-cache contains lineLengths
 *   for every tsx-loaded TypeScript file, so MCR processes them in
 *   "fake-source" mode without parsing TypeScript from disk.
 *   Read via mcr.addFromDir().
 *
 * Run via: pnpm coverage:merge
 */
import { CoverageReport } from 'monocart-coverage-reports';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const mcr = new CoverageReport({
  name: 'Merged Coverage (unit + e2e)',
  inputDir: [
    resolve(root, 'coverage/unit/raw'),
  ],
  outputDir: resolve(root, 'coverage/merged'),
  // entryFilter is applied to raw V8 entries (used by addFromDir for e2e).
  // Without this, all node_modules loaded by cucumber would inflate the totals.
  entryFilter: (entry) => {
    const url = entry.url || '';
    return url.includes('/apps/backend/src/') && !url.includes('/node_modules/');
  },
  sourceFilter: {
    '**/node_modules/**': false,
    '**/src/**': true,
  },
  reports: [
    ['v8'],
    ['console-summary'],
    ['html'],
    ['lcov'],
    ['json'],
    ['json-summary'],
    ['cobertura'],
  ],
});

// Add e2e raw V8 files (c8 temp dir: {result:[...], source-map-cache:{...}})
await mcr.addFromDir(resolve(root, 'coverage/e2e/tmp'));

await mcr.generate();

