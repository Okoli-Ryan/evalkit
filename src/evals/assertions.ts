import { CATEGORIES, PRIORITIES, type Triage } from '../app/types.js';
import type { Check } from './types.js';

/**
 * Layer 1 — assertion / code-based evals.
 *
 * These are cheap, deterministic checks that catch the dumb failures for free:
 * malformed output, out-of-range enums, empty replies. No model, no labels.
 * If these fail, nothing downstream is worth measuring.
 */
export function runAssertions(triage: Triage): Check[] {
  // Coerce to a safe string up front: a malformed fixture (or a future schema
  // change) could hand us a non-string reply, and Layer 1 must *report* that as
  // a failed check, not throw while building the list.
  const reply = typeof triage.suggested_reply === 'string' ? triage.suggested_reply : '';

  return [
    {
      name: 'category in enum',
      passed: (CATEGORIES as readonly string[]).includes(triage.category),
      detail: triage.category,
    },
    {
      name: 'priority in enum',
      passed: (PRIORITIES as readonly string[]).includes(triage.priority),
      detail: triage.priority,
    },
    {
      name: 'needs_human is boolean',
      passed: typeof triage.needs_human === 'boolean',
    },
    {
      name: 'reply is non-empty',
      passed: reply.trim().length > 0,
    },
    {
      name: 'reply within length budget',
      passed: reply.length <= 600,
      detail: `${reply.length} chars`,
    },
  ];
}
