import type { Ticket, Triage } from '../app/types.js';
import type { Check } from './types.js';

/**
 * Layer 2 — golden-dataset accuracy.
 *
 * Compare the model's structured decision against hand-labeled gold answers.
 * Exact-match works here because category / priority / needs_human are all
 * closed sets — the free-text reply is judged separately (Layer 3).
 */
export function scoreAccuracy(ticket: Ticket, triage: Triage): Check[] {
  return [
    {
      name: 'category matches gold',
      passed: triage.category === ticket.gold.category,
      detail: `predicted ${triage.category}, gold ${ticket.gold.category}`,
    },
    {
      name: 'priority matches gold',
      passed: triage.priority === ticket.gold.priority,
      detail: `predicted ${triage.priority}, gold ${ticket.gold.priority}`,
    },
    {
      name: 'needs_human matches gold',
      passed: triage.needs_human === ticket.gold.needs_human,
      detail: `predicted ${triage.needs_human}, gold ${ticket.gold.needs_human}`,
    },
  ];
}
