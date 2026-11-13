# Submission — Ajaia Documents

Product URL: https://docs-ajaai.onrender.com

**Status: release verification incomplete.** The implementation is locally buildable with passing import tests. The owner flow passes against real Supabase locally, and Bob is denied before sharing. The user reports the original deployed flow works, and the deployed sign-in shell is now verified. The new Reader/Writer extension requires its additive SQL migration and a new deployment before cloud role acceptance can be recorded. CHECKS.md records verified outcomes; the product URL is not yet a tested release candidate.

## Folder contents

The reviewer package contains:

- `ajaia-source.zip`: clean source including `src/`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.env.example`, `.gitignore`, `.node-version`, `render.yaml`, `supabase/migrations/202611130001_documents.sql`, `supabase/migrations/202611130002_share_roles.sql`, `supabase/seed-demo.sql`, `scripts/`, `samples/team-notes.txt`, `LICENSE`, and the Markdown/text docs listed below.
- `README.md`: setup, environment variables, migration/seed instructions, .txt constraints, and two-user reviewer script.
- `ARCHITECTURE.md`: data flow, database enforcement, deployment, and tradeoffs.
- `AI_WORKFLOW.md`: actual tools, concrete acceleration, changed AI patch, and verification evidence.
- `SUBMISSION.md`: this inventory, status, and remaining work.
- `CHECKS.md`: actual check/decision log, including pending cloud verification.
- `DASHBOARD_SETUP.md`: exact dashboard steps needed to unblock the demo.
- `WALKTHROUGH_SCRIPT.md`: preparation and a 3–5 minute recording plan.
- `WALKTHROUGH_URL.txt`: **missing video URL until the user records/uploads**.
- `PACKAGE_MANIFEST.txt`: packaging timestamp, source HEAD, and verified ZIP entry inventory.
- `REVIEWER_ACCOUNTS.md`: disposable demo login instructions, generated outside the source ZIP; generated from supplied ordinary demo credentials.

The ZIP excludes node_modules, dist, local env files, API.env, browser artifacts, test credentials, and privileged credentials. `scripts/package.mjs` produces the ZIP and readable docs in ignored `artifacts/submission/` and verifies the archive list.

## Disposable reviewer accounts

Alice and Bob both sign in successfully. Their disposable credentials are in `REVIEWER_ACCOUNTS.md` alongside the source ZIP. The directory now includes both accounts. Keep public signups disabled. `supabase/seed-demo.sql` documents the configured IDs. Do not include cloud admin credentials. Use separate browser sessions to review sharing.

## Working locally

Implemented: sign-in/auth restoration and deep-link return; owned/shared metadata library; create/rename; rich-text controls with pressed states; explicit atomic title/body save with retry and dirty tracking; UTF-8 text import; native Share dialog; owner/Writer editing, Reader rendering, and owner-only sharing/role management. SQL migration includes constraints, column grants, nonrecursive RLS, and immutable ownership. Automated import tests pass. This list describes implementation; it does not substitute for live acceptance evidence.

## Missing / incomplete

- The Reader/Writer build must be pushed from an authenticated Git terminal and deployed after applying its SQL migration. The existing sign-in shell is live and routing correctly.
- Supabase owner path works with the initial schema. The requested Reader/Writer extension requires the second migration before deploying this build; cloud role checks are pending until it is applied.
- Real API private-read/write/grant denial and the local browser owner-save/refresh flow pass. Complete sharing and deployed browser checks remain pending, including offline retry and mobile toolbar/dialog focus.
- Tested release commit and verified product URL must be recorded after those checks.
- User records/uploads the 3–5 minute walkthrough; actual unlisted link goes into WALKTHROUGH_URL.txt.
- User uploads this package to a Google Drive folder; folder and video links must be checked signed out.

## With another 2–4 hours

First finish any pending deployment, account setup, and live acceptance checks. Then tighten rich-text JSON schema validation, add metadata pagination, and consider optimistic concurrency for owner tabs. Realtime merging, comments, email invites, version history, additional formats, autosave/local drafts, and optional icon/UI libraries are deliberately excluded. Owners may now grant Writer access; concurrent saves use last-save-wins.

## Final links

- Product: https://docs-ajaai.onrender.com — verification pending.
- Drive folder: **MISSING — user uploads reviewer package and supplies link**.
- Walkthrough: **MISSING — user records/uploads and supplies unlisted link**.
