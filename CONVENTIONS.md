# Conventions

Small, readable modules — this code is meant to be excerpted in an article.

- **TypeScript, ESM, strict.** `noUncheckedIndexedAccess` is on; use `.js`
  extensions in relative imports (NodeNext/bundler resolution).
- **One responsibility per module.** Each eval layer (`assertions`, `accuracy`,
  `judge`) is its own file and returns plain data — no side effects, no I/O.
  The `runner` is the only thing that orchestrates them.
- **The model is behind one interface.** All model calls go through
  `ModelClient` so the suite can run in `replay` mode (fixtures, no API key) or
  `record` mode (real API). Nothing else imports `@anthropic-ai/sdk`.
- **Determinism first.** Evals must produce identical results on every run in
  replay mode; never introduce `Date.now()`, randomness, or network into the
  scoring path.
- **Formatting/linting:** `npm run format` (Prettier) and `npm run lint`
  (ESLint, typescript-eslint) must pass. Single quotes, semicolons, 90 cols.
- **Naming:** files and identifiers use the domain language (`triage`,
  `ticket`, `judge`, `gold`), not generic terms (`handler`, `data`, `process`).
