import { ModelClient } from '../llm/client.js';
import { triageTicket } from '../app/triage.js';
import type { Ticket } from '../app/types.js';
import { runAssertions } from './assertions.js';
import { scoreAccuracy } from './accuracy.js';
import { judgeReply, JUDGE_MODEL } from './judge.js';
import type { CaseResult, EvalRun, MetricSummary } from './types.js';

/** Run all three eval layers over every ticket and aggregate the metrics. */
export async function runEval(tickets: Ticket[]): Promise<EvalRun> {
  const client = new ModelClient();
  const cases: CaseResult[] = [];

  for (const ticket of tickets) {
    const triage = await triageTicket(client, ticket);
    const assertions = runAssertions(triage);
    const accuracy = scoreAccuracy(ticket, triage);
    // Only judge the reply if it structurally passed — no point scoring garbage.
    const judge = assertions.every((c) => c.passed)
      ? await judgeReply(client, ticket, triage)
      : { score: 0, passed: false, rationale: 'skipped — failed assertions' };

    cases.push({
      id: ticket.id,
      subject: ticket.subject,
      triage,
      gold: ticket.gold,
      assertions,
      accuracy,
      judge,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    model: 'claude-haiku-4-5',
    judgeModel: JUDGE_MODEL,
    cases,
    metrics: summarize(cases),
  };
}

/** Roll per-case checks up into headline pass rates, one per eval dimension. */
function summarize(cases: CaseResult[]): MetricSummary[] {
  const metric = (name: string, predicate: (c: CaseResult) => boolean): MetricSummary => {
    const passed = cases.filter(predicate).length;
    return {
      name,
      passed,
      total: cases.length,
      rate: cases.length ? passed / cases.length : 0,
    };
  };

  return [
    metric('Assertions pass', (c) => c.assertions.every((a) => a.passed)),
    metric('Category accuracy', (c) =>
      checkPassed(c, 'accuracy', 'category matches gold'),
    ),
    metric('Priority accuracy', (c) =>
      checkPassed(c, 'accuracy', 'priority matches gold'),
    ),
    metric('needs_human accuracy', (c) =>
      checkPassed(c, 'accuracy', 'needs_human matches gold'),
    ),
    metric('Judge pass (reply quality)', (c) => c.judge.passed),
  ];
}

function checkPassed(
  c: CaseResult,
  layer: 'assertions' | 'accuracy',
  name: string,
): boolean {
  return c[layer].find((check) => check.name === name)?.passed ?? false;
}
