import type { ModelClient } from '../llm/client.js';
import { TRIAGE_SCHEMA, TRIAGE_SYSTEM, triageUserPrompt } from './prompt.js';
import type { Ticket, Triage } from './types.js';

/** The model the triage feature runs on — cheap and fast. */
export const TRIAGE_MODEL = 'claude-haiku-4-5';

/** The system under test: send a ticket to Claude, get a triage decision back. */
export async function triageTicket(client: ModelClient, ticket: Ticket): Promise<Triage> {
  const { value } = await client.complete<Triage>({
    fixtureKey: `triage/${ticket.id}`,
    model: TRIAGE_MODEL,
    system: TRIAGE_SYSTEM,
    user: triageUserPrompt(ticket.subject, ticket.body),
    schema: TRIAGE_SCHEMA,
  });
  return value;
}
