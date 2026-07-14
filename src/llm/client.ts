import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

/**
 * A pluggable model client with two modes:
 *
 *   - `replay` (default): read a committed fixture from `fixtures/<key>.json`
 *     and return its recorded response. No network, no API key, fully
 *     deterministic — this is what lets the eval suite run in CI.
 *   - `record`: call the real Claude API, then write the response to a fixture
 *     so future replay runs reproduce it exactly.
 *
 * Fixtures are keyed by a human-meaningful path (e.g. `triage/T-001`) rather
 * than a hash of the prompt, so they are easy to read, diff, and hand-author.
 */
export type Mode = 'replay' | 'record';

export interface CompleteRequest {
  /** Fixture path relative to the fixtures dir, without extension. */
  fixtureKey: string;
  model: string;
  system: string;
  user: string;
  /** JSON schema the response must conform to (structured outputs). */
  schema: Record<string, unknown>;
  maxTokens?: number;
}

export interface CompleteResult<T> {
  value: T;
  usage: { input_tokens: number; output_tokens: number };
}

interface Fixture {
  request: { model: string; system: string; user: string };
  response: unknown;
  usage: { input_tokens: number; output_tokens: number };
}

const FIXTURES_DIR = fileURLToPath(new URL('../../fixtures/', import.meta.url));

export class ModelClient {
  private readonly mode: Mode;
  private readonly anthropic: Anthropic | null;

  constructor(mode: Mode = (process.env.EVALKIT_MODE as Mode) ?? 'replay') {
    this.mode = mode;
    this.anthropic = mode === 'record' ? new Anthropic() : null;
  }

  async complete<T>(req: CompleteRequest): Promise<CompleteResult<T>> {
    const path = join(FIXTURES_DIR, `${req.fixtureKey}.json`);

    if (this.mode === 'replay') {
      if (!existsSync(path)) {
        throw new Error(
          `Missing fixture "${req.fixtureKey}". Run with EVALKIT_MODE=record and a valid ANTHROPIC_API_KEY to record it.`,
        );
      }
      let fixture: Fixture;
      try {
        fixture = JSON.parse(readFileSync(path, 'utf8')) as Fixture;
      } catch (err) {
        throw new Error(`Corrupt fixture "${req.fixtureKey}": ${(err as Error).message}`);
      }
      return { value: fixture.response as T, usage: fixture.usage };
    }

    // record mode — call the real API, then persist the result as a fixture.
    const anthropic = this.anthropic!;
    const message = await anthropic.messages.create({
      model: req.model,
      max_tokens: req.maxTokens ?? 1024,
      system: req.system,
      output_config: { format: { type: 'json_schema', schema: req.schema } },
      messages: [{ role: 'user', content: req.user }],
    });

    const text = message.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') {
      throw new Error(`No text block in response for "${req.fixtureKey}"`);
    }
    const value = JSON.parse(text.text) as T;
    const usage = {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    };

    const fixture: Fixture = {
      request: { model: req.model, system: req.system, user: req.user },
      response: value,
      usage,
    };
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(fixture, null, 2)}\n`);

    return { value, usage };
  }
}
