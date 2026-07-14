import type { ModelClient } from '../llm/client.js';
import type { Ticket, Triage } from '../app/types.js';
import type { JudgeVerdict } from './types.js';

/** A reply must score at least this to pass. */
export const JUDGE_THRESHOLD = 3;

export const JUDGE_MODEL = 'claude-sonnet-5';

const JUDGE_SYSTEM = `You are a strict QA reviewer scoring a support agent's draft reply.
Score the reply from 1 to 5 against this rubric:

- 5: helpful, correct tone, directly addresses the ticket, invents nothing.
- 3: acceptable but generic, or slightly off-tone.
- 1: unhelpful, wrong tone, or hallucinates facts/promises not supported by the ticket.

Penalize any invented account details, refund promises, or made-up specifics harshly.
Return your integer score and a one-sentence rationale.`;

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer', enum: [1, 2, 3, 4, 5] },
    rationale: { type: 'string' },
  },
  required: ['score', 'rationale'],
  additionalProperties: false,
} as const;

/**
 * Layer 3 — LLM-as-judge.
 *
 * The free-text `suggested_reply` cannot be exact-matched, so a stronger model
 * scores it against a rubric. The judge is deliberately a different, more
 * capable model than the one under test, and it never sees the gold labels —
 * only the ticket and the reply.
 */
export async function judgeReply(
  client: ModelClient,
  ticket: Ticket,
  triage: Triage,
): Promise<JudgeVerdict> {
  const user = `Ticket subject: ${ticket.subject}
Ticket body:
${ticket.body}

Draft reply to score:
${triage.suggested_reply}`;

  const { value } = await client.complete<{ score: number; rationale: string }>({
    fixtureKey: `judge/${ticket.id}`,
    model: JUDGE_MODEL,
    system: JUDGE_SYSTEM,
    user,
    schema: JUDGE_SCHEMA,
  });

  return {
    score: value.score,
    passed: value.score >= JUDGE_THRESHOLD,
    rationale: value.rationale,
  };
}
