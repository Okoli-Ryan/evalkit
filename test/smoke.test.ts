import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset } from '../src/evals/dataset.js';
import { runEval } from '../src/evals/runner.js';
import { runAssertions } from '../src/evals/assertions.js';
import type { Triage } from '../src/app/types.js';

test('dataset loads and is fully labeled', () => {
  const tickets = loadDataset();
  assert.ok(tickets.length >= 10, 'expected a non-trivial dataset');
  for (const t of tickets) {
    assert.ok(t.id && t.subject && t.body, `ticket ${t.id} missing fields`);
    assert.ok(t.gold.category && t.gold.priority, `ticket ${t.id} missing gold labels`);
    assert.equal(typeof t.gold.needs_human, 'boolean');
  }
});

test('assertions catch malformed triage output', () => {
  const bad: Triage = {
    category: 'nonsense',
    priority: 'whenever',
    needs_human: true,
    suggested_reply: '',
  };
  const checks = runAssertions(bad);
  assert.equal(checks.find((c) => c.name === 'category in enum')?.passed, false);
  assert.equal(checks.find((c) => c.name === 'priority in enum')?.passed, false);
  assert.equal(checks.find((c) => c.name === 'reply is non-empty')?.passed, false);
});

test('full eval run (replay) produces one result per ticket and all metrics', async () => {
  const tickets = loadDataset();
  const run = await runEval(tickets);

  assert.equal(run.cases.length, tickets.length);
  assert.equal(run.metrics.length, 5);
  for (const m of run.metrics) {
    assert.ok(m.rate >= 0 && m.rate <= 1, `${m.name} rate out of range`);
    // Denominators are bounded by the dataset; the judge metric excludes cases
    // that were gated out by Layer 1, so its total may be smaller.
    assert.ok(m.total > 0 && m.total <= tickets.length, `${m.name} total out of range`);
  }

  // A reply that failed assertions is never judged — it must not be counted as
  // a judged case (skipped ≠ judged-and-failed).
  const skipped = run.cases.filter((c) => c.judge.skipped);
  const judgeMetric = run.metrics.find((m) => m.name.startsWith('Judge'))!;
  assert.equal(judgeMetric.total, tickets.length - skipped.length);

  // The dataset ships with known defects — the suite must surface them, not
  // silently pass everything.
  const anyFail = run.metrics.some((m) => m.rate < 1);
  assert.ok(anyFail, 'expected the seeded defects to produce at least one failure');
});
