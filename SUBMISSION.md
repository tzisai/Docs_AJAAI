# Submission — Ajaia Documents

Product URL: https://docs-ajaai.onrender.com

**Status: corrected source is verified locally against real Supabase; deployment/video/Drive verification remain pending.** The library no longer depends on `documents.preview`, and images now save inside the document JSON. No new SQL or Storage setup is needed for this fix. All 26 unit checks pass; real file/persistence checks confirm saved cards, Reader/Writer permissions, and a maximum-size 2 MiB image save/reopen. The real two-session local browser flow passes create/format/save/refresh, embedded images, role changes, offline retry, import and download. CHECKS.md records actual outcomes; do not treat the deployed URL as the corrected release until it is redeployed and checked.

## Folder contents

The reviewer package contains:

- `ajaia-source.zip`: clean source including `src/`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.env.example`, `.gitignore`, `.node-version`, `render.yaml`, `supabase/migrations/202611130001_documents.sql`, `supabase/migrations/202611130002_share_roles.sql`, `supabase/migrations/202611130003_previews_attachments.sql` (optional legacy history; not used), `supabase/seed-demo.sql`, `scripts/`, `tests/` (unit and real-backend integration checks, plus tests/README.md), `samples/team-notes.txt`, `samples/idea-board.png`, `LICENSE`, and the Markdown/text docs listed below.
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

Implemented: auth restoration and direct-link return; owned/shared document cards; create/rename; rich-text formatting; explicit atomic title/body/image Save with dirty tracking and retry; text import as a new document or appended to an existing draft; images inside the writing page; plain-text Download; Reader/Writer roles with owner-only sharing. The library projects text leaves instead of querying a missing preview column or fetching image payloads. Optional sharing-detail failures cannot hide the document list. All 26 unit checks pass. The ordinary-account role suite passes 35 real checks; file/API checks verify exact embedded image persistence, current permissions, and a 2 MiB payload without new SQL.

## Missing / incomplete

- Push and deploy the corrected source from an authenticated Git terminal. Agent GitHub HTTPS credentials are unavailable. **No new migration is required.**
- Repeat release acceptance against https://docs-ajaai.onrender.com and record its tested commit. Local UI with real Supabase has passed; that is distinct from verifying the deployed corrected bundle.
- User records/uploads the 3–5 minute walkthrough; actual unlisted URL belongs in WALKTHROUGH_URL.txt.
- User uploads the prepared folder to Drive, supplies the folder link, and verifies the folder/video signed out.

## With another 2–4 hours

First finish any pending deployment, account setup, and live acceptance checks. Then tighten rich-text JSON schema validation, add server-side image budgets/schema validation and metadata pagination, and consider optimistic concurrency for owner tabs. Realtime merging, comments, email invites, version history, additional formats, autosave/local drafts, and optional icon/UI libraries are deliberately excluded. Owners may now grant Writer access; concurrent saves use last-save-wins.

## Final links

- Product: https://docs-ajaai.onrender.com — verification pending.
- Drive folder: **MISSING — user uploads reviewer package and supplies link**.
- Walkthrough: **MISSING — user records/uploads and supplies unlisted link**.
