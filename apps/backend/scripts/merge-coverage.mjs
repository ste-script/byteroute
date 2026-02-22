#!/usr/bin/env node
/**
 * Merges Istanbul coverage JSON files from vitest (unit) and c8 (e2e) into a
 * single combined HTML + LCOV report at coverage/merged/.
 *
 * Run via: pnpm coverage:merge
 */
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import allReports from 'istanbul-reports';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { createCoverageMap } = libCoverage;
const { createContext } = libReport;
const reports = allReports;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const sources = [
  resolve(root, '../../coverage/apps-backend/coverage-final.json'),
  resolve(root, 'coverage/e2e/coverage-final.json'),
];

const map = createCoverageMap({});

for (const file of sources) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    map.merge(data);
    console.log(`✔ merged ${file}`);
  } catch (e) {
    console.warn(`⚠ skipped ${file}: ${e.message}`);
  }
}

const outDir = resolve(root, 'coverage/merged');
mkdirSync(outDir, { recursive: true });

const context = createContext({
  dir: outDir,
  coverageMap: map,
  defaultSummarizer: 'nested',
});

for (const reporter of ['lcov', 'html']) {
  reports.create(reporter).execute(context);
}

console.log('\n→ merged HTML report: ' + outDir + '/index.html');
console.log(
  '  (line-level coverage is accurate; aggregate % intentionally omitted\n' +
  '   because vitest/V8 and c8/tsx produce different statement granularities\n' +
  '   for the same source files — see coverage/apps-backend/ and coverage/e2e/ for individual totals)',
);
