import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Ticket } from '../app/types.js';

const DATASET_PATH = fileURLToPath(new URL('../../data/tickets.jsonl', import.meta.url));

/** Load the labeled ticket dataset from JSONL (one ticket per line). */
export function loadDataset(): Ticket[] {
  const lines = readFileSync(DATASET_PATH, 'utf8').split('\n');
  const tickets: Ticket[] = [];
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line.length === 0) return;
    try {
      tickets.push(JSON.parse(line) as Ticket);
    } catch (err) {
      throw new Error(
        `Malformed JSON in ${DATASET_PATH} at line ${i + 1}: ${(err as Error).message}`,
      );
    }
  });
  return tickets;
}
