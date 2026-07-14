# evalkit

A tiny, **runnable** LLM eval harness. It tests one small "AI app" — a
support-ticket triage function — using the three eval strategies you actually
need, layered from cheap to expensive:

1. **Assertion / code-based evals** — deterministic checks (valid enum values,
   non-empty reply, length budget). Catch the dumb failures for free.
2. **Golden-dataset accuracy** — exact-match the model's structured decision
   (`category`, `priority`, `needs_human`) against hand-labeled answers.
3. **LLM-as-judge** — a stronger model scores the free-text `suggested_reply`
   against a rubric, because you can't exact-match prose.

The whole thing runs **offline, deterministically, without an API key** via
recorded fixtures — so it works in CI without burning tokens or flaking. A small
web dashboard visualizes pass rates, per-case drill-downs, and regressions
against a baseline.

```
┌────────────┐   ┌──────────────────────────────┐   ┌───────────────┐
│  tickets   │──▶│ triage()  → structured JSON  │──▶│ 3 eval layers │──▶ results/latest.json ──▶ dashboard
│  (+ gold)  │   │  (system under test)         │   │ assert/acc/judge│
└────────────┘   └──────────────────────────────┘   └───────────────┘
```

## Quick start

```bash
npm install
npm run eval      # runs the suite in replay mode (no API key needed)
npm run report    # serve the dashboard at http://localhost:5173
```

`npm run eval` prints a summary, writes `results/latest.json`, and exits
non-zero if any case has a hard failure — so you can gate a build on it.

The bundled dataset ships with five **intentional defects** (a misrouted
security ticket, an under-triaged priority, a misclassified category, a
hallucinated reply, and an over-long reply) so you can see the harness catch
real failures instead of a wall of green.

## Modes: replay vs record

`ModelClient` has two modes, selected by `EVALKIT_MODE`:

- `replay` (default) — reads committed fixtures from `fixtures/<key>.json`.
  No network, no key, fully deterministic. This is what CI runs.
- `record` — calls the real Claude API and writes the responses as fixtures.

To regenerate fixtures against the live models:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
EVALKIT_MODE=record npm run eval
```

The system under test uses **Claude Haiku 4.5** (`claude-haiku-4-5`) for triage;
the judge uses **Claude Sonnet 5** (`claude-sonnet-5`) — deliberately a stronger,
different model than the one being graded, and it never sees the gold labels.

## Layout

| Path                 | What                                                        |
| -------------------- | ----------------------------------------------------------- |
| `src/app/`           | The system under test: the triage prompt + `triageTicket()` |
| `src/llm/client.ts`  | The pluggable model client (replay/record + fixtures)       |
| `src/evals/`         | The three eval layers + the runner that aggregates them     |
| `src/report/`        | Dependency-free static server for the dashboard             |
| `data/tickets.jsonl` | The labeled dataset (ticket text + gold answers)            |
| `fixtures/`          | Recorded model + judge responses (committed)                |
| `public/`            | The dashboard (vanilla HTML/CSS/JS)                         |
| `results/`           | Generated run + committed baseline for the regression view  |

## Scripts

| Command                           | Does                                                        |
| --------------------------------- | ----------------------------------------------------------- |
| `npm run eval`                    | Run the suite, write `results/latest.json`, print a summary |
| `npm run report`                  | Serve the dashboard                                         |
| `npm test`                        | Smoke tests (dataset integrity, assertions, full run)       |
| `npm run lint` / `npm run format` | ESLint / Prettier                                           |

## License

MIT
