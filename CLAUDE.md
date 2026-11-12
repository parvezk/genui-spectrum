# genui-spectrum

POC 3 of the ai-ux-poc GenUI prototypes: **one prompt, rendered at three points on the generative UI spectrum**, then measured side by side.

| Mode | What the model produces | Who owns the look |
| --- | --- | --- |
| **A. Fixed components** | A tool call that picks a prebuilt React component and fills its props | The app |
| **B. A2UI** | A2UI v0.9.1 messages against the POC 2 custom catalog (Chart, StatTile, Legend) | The catalog and renderer |
| **C. Full HTML** | A whole HTML/CSS/JS document, shown in a sandboxed iframe (the Gemini dynamic view / AI Mode approach) | The model |

Metrics for every run: time to first paint, total generation time, style consistency and failure rate. Little published work compares these directly, so the results may become a Design Logic post.

## Status and sources

- The repo is empty apart from config. Nothing is scaffolded yet.
- ADR-001 puts the three-way comparison in the backlog and has no decision for it. Write ADR-002 (scope, prompt set, metrics, stack) in the workspace `planning/` folder before building. It becomes the source of truth for this repo.
- Background is in the parent workspace (`../`): `CLAUDE.md` (A2UI spec and catalog notes), `planning/adr-001-genui-poc-scope-and-stack.md`, and the POC 3 section of `planning/claude-poc-proposal.md`.
- Sibling repos: `res-finder` (POC 1, the bare A2UI loop) and InveX (POC 2, generative viz with the custom catalog). Reuse their route, renderer, validation loop and catalog instead of rewriting them.

## Expected stack (confirm in ADR-002)

- Same as res-finder: Next.js 16 App Router, TypeScript, pnpm, Tailwind 4.
- Vercel AI SDK through AI Gateway, model Claude Opus 5.5 (`claude-opus-5-5`). Key in `.env.local` as `AI_GATEWAY_API_KEY`. Never commit it.
- Mode B uses `@a2ui/react` on `@a2ui/web_core` and `@a2ui/agent`, A2UI **v0.9.1 only**. Don't build a custom renderer.
- Next.js 16 has breaking changes from older versions. Read `node_modules/next/dist/docs/` before writing Next code. `next dev` writes an `AGENTS.md` block, so commit it rather than fight it.

## Rules for a fair comparison

- All three modes get the same user prompt, the same model and settings, and the same data. Only the output contract and its system prompt change.
- Use fixed fixture data, not live APIs, so differences come from the mode and not the data.
- Measure every mode with the same harness and the same clock points (request sent, first byte, first paint, stream done). Record failures, don't hide them. A run that fails validation or renders blank counts against its mode.
- Save each run's raw model output so results can be replayed and re-scored without new model calls.

## Security for Mode C

- Model-written HTML runs only in an `<iframe sandbox="allow-scripts">` loaded through `srcdoc`. Never add `allow-same-origin`, and never put model HTML into the app DOM (no `dangerouslySetInnerHTML`).
- Give the iframe a strict CSP (no network access, or an explicit allowlist) and talk to it only through `postMessage` with a checked message shape.

## Open decisions

- Whether CopilotKit / AG-UI come in here. ADR-001 parks them "until POC 3".
- How to score style consistency (visual diff across runs, design-token checks, or a rubric graded by a person or an LLM).
- The prompt set: how many prompts and which data domains.
- The chart grammar is inherited from POC 2 (a Vega-Lite subset or a custom minimal schema).

## What is built so far

The first build follows a narrower brief than the plan above, so read this before assuming the plan describes the code. See `README.md` for the layout.

- **Four panels, not three modes:** Text (react-markdown), A2UI, Freeform HTML and AG-UI (`generateUserInterface` + JSON Forms). There is no fixed-components mode yet.
- **A2UI uses the basic catalog only**, not the POC 2 custom catalog (no Chart, StatTile or Legend).
- **Fixtures only.** The app reads `/fixtures` and makes no model calls. The 25 prompts' renderings were written by Claude in an agent session and saved under `/generation`; there is no AI SDK route, no `AI_GATEWAY_API_KEY` and no timing harness, so time to first paint and generation time are not measured.
- **Failures are recorded, never repaired.** `pnpm fixtures` validates each saved output and stores the result beside it. Do not edit a file under `/generation` to make it pass.
- **ADR-002 has not been written.** It belongs in the parent workspace, which this repo's work did not touch.
- Mode C security is implemented as described above, except that the iframe is not messaged at all (no `postMessage` channel).

## Commands

- `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`
- `pnpm fixtures`: rebuild `/fixtures` from `/generation` and re-validate every rendering.
- `pnpm check:browser`: open every prompt page in headless Chromium against a running production build (`pnpm build && pnpm start -p 3111`) and write `fixtures/browser-check.json`. Needs `pnpm exec playwright install chromium` once.
- There is no test runner or eval runner yet.
