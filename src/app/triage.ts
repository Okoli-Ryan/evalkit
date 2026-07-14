import type { ModelClient } from '../llm/client.js';
import { TRIAGE_SCHEMA, TRIAGE_SYSTEM, triageUserPrompt } from './prompt.js';
import type { Ticket, Triage } from './types.js';

/** The system under test: send a ticket to Claude, get a triage decision back. */
export async function triageTicket(client: ModelClient, ticket: Ticket): Promise<Triage> {
  const { value } = await client.complete<Triage>({
    fixtureKey: `triage/${ticket.id}`,
    model: 'claude-haiku-4-5',
    system: TRIAGE_SYSTEM,
    user: triageUserPrompt(ticket.subject, ticket.body),
    schema: TRIAGE_SCHEMA,
  });
  return value;
}
