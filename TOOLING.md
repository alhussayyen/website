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

### Bug found + fixed while wiring up the contact-form test

`js/forms.js` — the file that validates and submits both the project
inquiry and careers forms — was **never included in `index.html`**. No
`<script src="js/forms.js">` tag existed, in this commit or any earlier
one. That means the contact form currently has no JS behind it at all:
submitting it just does a native page reload, no validation, no honeypot
check, no email ever sent.

On top of that, even once loaded, `forms.js` hardcoded
`SIIRAH_FORMS_CONFIG.endpoint` to `""`, ignoring the real Apps Script URL
already sitting in `js/config.js` (`window.SIIRAH_FORMS_ENDPOINT`).

Both are fixed now:
1. Added `<script src="js/forms.js" defer></script>` to `index.html`.
2. `forms.js` now reads `endpoint: (window.SIIRAH_FORMS_ENDPOINT || "")`
   instead of a hardcoded empty string.

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
