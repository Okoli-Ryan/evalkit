import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { loadDataset } from './evals/dataset.js';
import { runEval } from './evals/runner.js';
import type { EvalRun } from './evals/types.js';

const RESULTS_DIR = fileURLToPath(new URL('../results/', import.meta.url));
const LATEST = `${RESULTS_DIR}latest.json`;
const BASELINE = `${RESULTS_DIR}baseline.json`;

async function main(): Promise<void> {
  const tickets = loadDataset();
  console.log(
    `Running evals over ${tickets.length} tickets (mode: ${process.env.EVALKIT_MODE ?? 'replay'})\n`,
  );

  const run = await runEval(tickets);

  mkdirSync(dirname(LATEST), { recursive: true });
  writeFileSync(LATEST, `${JSON.stringify(run, null, 2)}\n`);

  printSummary(run);

  const failed = failingCaseCount(run);
  console.log(`\nWrote ${LATEST}`);
  console.log(`Run \`npm run report\` to open the dashboard.`);

  // In CI you'd gate the build on a threshold. We exit non-zero if any case
  // has a hard failure (a failed assertion or a failed judge verdict).
  if (failed > 0) {
    console.log(`\n${failed} case(s) have a hard failure.`);
    process.exitCode = 1;
  }
}

function printSummary(run: EvalRun): void {
  const baseline = existsSync(BASELINE)
    ? (JSON.parse(readFileSync(BASELINE, 'utf8')) as EvalRun)
    : null;

  console.log('Metric                         Pass    Rate    vs baseline');
  console.log('─'.repeat(60));
  for (const m of run.metrics) {
    const rate = `${(m.rate * 100).toFixed(0)}%`.padStart(4);
    const base = baseline?.metrics.find((b) => b.name === m.name);
    const delta = base ? formatDelta(m.rate - base.rate) : '—';
    console.log(
      `${m.name.padEnd(30)} ${`${m.passed}/${m.total}`.padEnd(7)} ${rate}    ${delta}`,
    );
  }
}

function formatDelta(d: number): string {
  if (Math.abs(d) < 0.005) return '±0';
  const pts = (d * 100).toFixed(0);
  return d > 0 ? `▲ +${pts}pt` : `▼ ${pts}pt`;
}

function failingCaseCount(run: EvalRun): number {
  return run.cases.filter((c) => !c.assertions.every((a) => a.passed) || !c.judge.passed)
    .length;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
