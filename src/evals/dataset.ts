import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Ticket } from '../app/types.js';

const DATASET_PATH = fileURLToPath(new URL('../../data/tickets.jsonl', import.meta.url));

/** Load the labeled ticket dataset from JSONL (one ticket per line). */
export function loadDataset(): Ticket[] {
  return readFileSync(DATASET_PATH, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Ticket);
}
