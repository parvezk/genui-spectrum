# GenUI Spectrum

One prompt, rendered four ways, side by side.

| Panel | What the model writes | Rendered with |
| --- | --- | --- |
| **Text** | Markdown | `react-markdown` |
| **A2UI** | An A2UI v0.9.1 surface using only the basic catalog | `@a2ui/react` |
| **Freeform HTML** | One self-contained interactive page | `<iframe srcdoc sandbox="allow-scripts">` |
| **AG-UI** | A `generateUserInterface` tool call `{description, data, output}` and a UI `{schema, uiSchema, initialData}` | `@jsonforms/react` (Material renderers) |

There are 25 prompts: six answers, six comparisons, six data views and seven input-collecting tasks. Each also has one note per approach on what it could or couldn't express.

- `/` is the gallery.
- `/p/[id]` shows one prompt's four renderings side by side, each with a Rendered/Source toggle.
- `/findings` lists validation failures, the browser check and all the notes.

## How it works

The app reads only `/fixtures`. It makes no model or API calls, at build time or at runtime, and needs no environment variables.

```
prompts/prompts.json      the 25 prompts
generation/<id>/          the saved output for each prompt
  text.md  a2ui.json  page.html  agui.json  notes.json
scripts/build-fixtures.mjs   validates each output and writes fixtures/<id>.json
scripts/browser-check.mjs    opens every page in Chromium and writes fixtures/browser-check.json
fixtures/                 what the app renders
```

The renderings were written by Claude directly in an agent session. Each was validated after it was written and none was changed after validation; a rendering that fails stays in its fixture with its errors and the app shows the failure in its place. The exact pre-validation corrections are recorded in the `generation.method` field of every fixture and shown on `/findings`.

### Validation

- **A2UI:** every message declares `v0.9.1` and matches the server-to-client schema; one surface on the basic catalog; every component passes its catalog schema; `MessageProcessor` accepts the surface under `STRICT_VALIDATION`. These are the same schemas and processor `@a2ui/react` renders with.
- **HTML:** one complete document; no external references, network APIs or navigation; nothing the sandbox blocks (storage, modals, popups, parent access); every script parses; some script handles input.
- **AG-UI:** the tool call has exactly `{description, data, output}`; both JSON Schemas compile; every `uiSchema` scope resolves; `initialData` has no type errors; the form can produce every required output property. On submit the panel validates the data against the tool call's `output` schema and shows it.

### Sandbox

Model-written HTML never enters the app DOM. It is shown only through `srcdoc` in an iframe whose sandbox is exactly `allow-scripts`, with a deny-all Content-Security-Policy prepended at render time (`lib/sandbox.ts`), so the browser refuses any network request the page attempts.

## Commands

```bash
pnpm install
pnpm dev             # local development
pnpm build           # production build
pnpm lint
pnpm fixtures        # rebuild /fixtures from /generation and re-validate

# Browser check (needs Chromium: pnpm exec playwright install chromium)
pnpm build && pnpm start -p 3111 &
pnpm check:browser
```

Deployed on Vercel from `main`.
