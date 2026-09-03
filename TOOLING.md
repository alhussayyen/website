# Dev tooling setup (2026-09-01)

Notes on the tools set up for this project, and what's still needed on a
real machine (this was configured from a sandboxed VM with no Docker and
restricted egress, so a few things could only be scaffolded, not run).

## Playwright — done, tests written but not yet run here

- `npm install` pulls in `@playwright/test` (see `package.json`).
- Config: `playwright.config.js` — serves the site with
  `python3 -m http.server 4173` and runs against Chromium.
- Tests: `tests/smoke.spec.js` — homepage load/RTL, nav sections, the
  language switch, and the `#inquiryForm` contact form (validation +
  a mocked-success submit).
- Run with `npm test` (or `npx playwright test`).
- **First-time setup needed on your machine:** `npx playwright install
  chromium`. This sandbox's network allowlist blocks
  `cdn.playwright.dev` / `playwright.download.prss.microsoft.com`, so the
  browser binary couldn't be downloaded here — the config and tests are
  written and syntax-checked (`npx playwright test --list` passes, 5
  tests found) but never actually executed.

### `js/forms.js` was dead code causing a console error — removed (2026-09-03)

The note below (2026-09-01) about wiring up `js/forms.js` predates a later
form redesign. The contact section was rebuilt with trimmed fields under
`car*`/`inq*`-prefixed ids and its own validation/submit logic written
directly into `js/script.js` (search for `SIIRAHForms`, `#careersForm`,
`#inquiryForm`) — that is the code that actually runs the homepage's two
forms today, and it works correctly end-to-end.

`js/forms.js` was never updated to match: it still targeted the old
`jf-*`/`pf-*`/`.rf-*` markup (a `#projectForm` id, `.rf-submit`,
`.rf-honeypot`, a `careersStatus` status element — none of which exist
in the current HTML). Because `#careersForm` itself does still exist,
`forms.js`'s `initForm()` didn't just no-op — it got past its `if
(!form) return` guard, then crashed on `statusEl.querySelector(...)`
with `statusEl` null (no `#careersStatus` in the DOM), throwing an
uncaught `TypeError` on every single page load. It never touched the
real forms; `js/script.js`'s own handlers had already been doing the
actual validation/submission the whole time.

Fixed by removing `<script src="js/forms.js" defer></script>` from
`index.html` and deleting the now-unused `js/forms.js` file. No
behavior change — the site's forms were already running on
`js/script.js`; this only removed the console error and the dead file.
`js/project-brief.js` is unrelated and untouched — it's the separate,
self-contained form engine for `project-brief.html` and never depended
on `forms.js`.

Worth deploying this fix soon — the site's lead-gen form has effectively
been non-functional in production.

## Supabase CLI — scaffolded, not started

- Installed as a devDependency (`npm install`).
- `npx supabase init` has been run — `supabase/config.toml` exists.
- `npx supabase start` needs Docker (or Podman), which isn't available in
  this sandbox. Install Docker Desktop (or Podman/Rancher/OrbStack) on
  your machine, then `npx supabase start` from this folder.
- Not wired into the site yet — this only makes sense if/when the
  contact-form backend (or something else) moves off Google Apps Script
  and onto a real database. Nothing currently calls it.

## Strix — not installed here, needs a real machine

Strix (usestrix.com) needs:
- Docker running (pulls a sandbox image on first run)
- Python >= 3.12 if installed via `pip install strix-agent` (this
  sandbox has 3.10, and has no sudo to upgrade it) — or use the official
  installer: `curl -sSL https://strix.ai/install | bash`
- An LLM API key: `export STRIX_LLM="openai/gpt-5.4"` and
  `export LLM_API_KEY="..."` (or Anthropic/Google equivalents)

Once set up: `strix --target .` from this folder, or point it at
`https://siirah.sa` directly for a live-site scan. None of this could run
in this sandbox (no Docker, old Python, no API key) — it needs to be done
on your own machine.

## Context7 MCP — configured

- `.mcp.json` added at the project root with the `context7` server
  (`npx -y @upstash/context7-mcp`). Claude Code will prompt to approve
  it the first time you open this project.
- Optional: get a free API key at context7.com/dashboard and put it in
  `.mcp.json`'s `env.CONTEXT7_API_KEY` for higher rate limits — fine
  without one for normal use.
