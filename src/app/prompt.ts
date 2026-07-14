import { CATEGORIES, PRIORITIES } from './types.js';

/**
 * The triage prompt. This is the "app" being evaluated — deliberately small so
 * the evals, not the feature, are the star of the show.
 */
export const TRIAGE_SYSTEM = `You are a support-ticket triage assistant for a SaaS product.
Read the customer's ticket and return a structured triage decision.

- category: the single best fit from ${CATEGORIES.join(', ')}.
- priority: ${PRIORITIES.join(', ')}. "urgent" is reserved for outages, data loss,
  or security issues. Billing disputes are usually "high". General questions are "low".
- needs_human: true when the ticket needs a human agent (refunds, legal, angry
  customers, anything you cannot resolve with a templated reply).
- suggested_reply: a concise, friendly first response to the customer. Never invent
  facts, account details, or promises you cannot keep.`;

/** The JSON schema the model output must conform to (structured outputs). */
export const TRIAGE_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: [...CATEGORIES] },
    priority: { type: 'string', enum: [...PRIORITIES] },
    needs_human: { type: 'boolean' },
    suggested_reply: { type: 'string' },
  },
  required: ['category', 'priority', 'needs_human', 'suggested_reply'],
  additionalProperties: false,
} as const;

export function triageUserPrompt(subject: string, body: string): string {
  return `Subject: ${subject}\n\nBody:\n${body}`;
}
