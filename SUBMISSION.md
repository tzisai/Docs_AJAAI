# Submission — Ajaia Documents

Product URL: https://docs-ajaai.onrender.com

**Status: release verification incomplete.** The implementation is locally buildable with passing import tests. The live app and two-user acceptance checks require deployment, migration, and demo credentials. CHECKS.md records verified outcomes; the product URL is not yet a tested release candidate.

## Folder contents

The reviewer package contains:

- `ajaia-source.zip`: clean source including `src/`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.env.example`, `.gitignore`, `.node-version`, `render.yaml`, `supabase/migrations/202611130001_documents.sql`, `scripts/`, `samples/team-notes.txt`, `LICENSE`, and the Markdown/text docs listed below.
- `README.md`: setup, environment variables, migration/seed instructions, .txt constraints, and two-user reviewer script.
- `ARCHITECTURE.md`: data flow, database enforcement, deployment, and tradeoffs.
- `AI_WORKFLOW.md`: actual tools, concrete acceleration, changed AI patch, and verification evidence.
- `SUBMISSION.md`: this inventory, status, and remaining work.
- `CHECKS.md`: actual check/decision log, including pending cloud verification.
- `DASHBOARD_SETUP.md`: exact dashboard steps needed to unblock the demo.
- `WALKTHROUGH_SCRIPT.md`: preparation and a 3–5 minute recording plan.
- `WALKTHROUGH_URL.txt`: **missing video URL until the user records/uploads**.
- `PACKAGE_MANIFEST.txt`: packaging timestamp, source HEAD, and verified ZIP entry inventory.
- `REVIEWER_ACCOUNTS.md`: disposable demo login instructions, generated outside the source ZIP; currently flags missing credentials.

The ZIP excludes node_modules, dist, local env files, API.env, browser artifacts, test credentials, and privileged credentials. `scripts/package.mjs` produces the ZIP and readable docs in ignored `artifacts/submission/` and verifies the archive list.

## Disposable reviewer accounts

**Missing: confirmed Alice and Bob emails/passwords.** Provision two disposable password users, disable public signups, and seed their IDs/aliases as documented in README. Supply only their demo credentials in the Drive folder reviewer guide. Do not include cloud admin credentials. Use separate browser sessions to review sharing.

## Working locally

Implemented: sign-in/auth restoration and deep-link return; owned/shared metadata library; create/rename; rich-text controls with pressed states; explicit atomic title/body save with retry and dirty tracking; UTF-8 text import; native Share dialog; owner-only editing and read-only recipient rendering. SQL migration includes constraints, column grants, nonrecursive RLS, and immutable ownership. Automated import tests pass. This list describes implementation; it does not substitute for live acceptance evidence.

## Missing / incomplete

- Live build must be pushed from an authenticated Git terminal and deployed to the resumed Render site.
- Supabase migration, demo-user seed, and signup disabling need confirmation.
- Real Alice/Bob API and deployed browser checks remain pending, including offline retry, direct-link refresh, and mobile toolbar/dialog focus.
- Tested release commit and verified product URL must be recorded after those checks.
- User records/uploads the 3–5 minute walkthrough; actual unlisted link goes into WALKTHROUGH_URL.txt.
- User uploads this package to a Google Drive folder; folder and video links must be checked signed out.

## With another 2–4 hours

First finish any pending deployment, account setup, and live acceptance checks. Then tighten rich-text JSON schema validation, add metadata pagination, and consider optimistic concurrency for owner tabs. Shared editing, comments, realtime collaboration, email invites, version history, additional formats, autosave/local drafts, and optional icon/UI libraries are deliberately excluded from this release.

## Final links

- Product: https://docs-ajaai.onrender.com — verification pending.
- Drive folder: **MISSING — user uploads reviewer package and supplies link**.
- Walkthrough: **MISSING — user records/uploads and supplies unlisted link**.
