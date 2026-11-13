# Checks and decisions

## 2026-11-13 — initial inspection
- Read README, ASSMT.txt, and the full implementation plan. No AGENTS.md found. No app, lockfile, migration, tests, or deployment config existed.
- Git remote: https://github.com/tzisai/Docs_AJAAI. User reports Render and Supabase already set up.
- Local runtime: Node 26.13.0 / npm 12.2.2. Render pinned to Node 22.22.0; verify build compatibility there.
- API.env contains only a project URL and publishable key with Next-style names. Kept ignored; mapped to Vite names in ignored .env.local.
- Using requested React/Vite/TypeScript/Tiptap 3/Supabase stack. Text action labels; no optional icon or component library.
- Read current Tiptap StarterKit and Supabase RLS documentation and Edison Fang reference. Apply spacious typography, aligned metadata rows, restrained palette.
- Supabase and Render plugins discovered but not connected in this agent session. Dashboard migration/auth and deployment verification remain pending.
- No acceptance stage claimed complete yet.

## First local slice
- `npm run build`: PASS (TypeScript + Vite). Initial failure from missing Node types for fixture import fixed by adding @types/node.
- `npm test`: PASS, 7 import checks in one focused suite.
- Updated Vitest to current version after initial npm audit reported development dependency issues. `npm audit --omit=dev`: PASS, zero vulnerabilities; install audit also reports zero after update.
- Browser (Chromium/Playwright): PASS signed-out direct editor URL preserves `/docs/:id` in login `next`; no page errors; 390px login has no horizontal overflow.
- Real Supabase API: auth settings respond; public signups enabled (needs disabling); documents table not yet present (migration required). No real-user authorization claims yet.
- Git remote access: BLOCKED, `fatal: could not read Username for 'https://github.com': No such device or address`. User must authenticate Git and push main, or connect a repository integration.
- Product URL supplied: https://docs-ajaai.onrender.com. First probe returned 503 with `x-render-routing: suspend-by-user`. User reports resuming the site; recheck pending.
- Navigation: replaced a proposed ad hoc history guard with React Router useBlocker before browser acceptance checks. Keep drafts in memory only.

## Stage 0 — local build and deployed shell
- PASS: https://docs-ajaai.onrender.com now responds HTTP 200 with the Ajaia Vite shell after the user resumed the service. Initial 503/404 are resolved.
- Local first slice commit: 0846f7d. Agent git authentication is still unavailable; user-side push appears to have deployed the shell. Exact deployed commit not yet confirmed.
- Stage 0 is satisfied as an intermediate shell check. Final backend acceptance remains pending.

## SQL validation (temporary local PostgreSQL engine, not cloud acceptance)
- Applied the exact migration using PGlite with Supabase-style auth.uid(), authenticated/anon roles, and two seeded UUIDs. All checks passed.
- Alice create derives owner from session; invalid root/title rejected; owner_id and updated_at updates denied by column privileges.
- Bob private read/update: zero rows. Bob grant using Alice owner: RLS denial. Bob forged-owner grant: composite FK denial.
- Alice grant allows Bob SELECT; duplicate and self-sharing rejected. Bob shared UPDATE stays zero rows; share grant denied. Owner still has original data and can save.
- Anonymous SELECT denied on documents, shares, and directory. No policy recursion encountered.
- This validates schema behavior locally only. Real Supabase/API and independent browser sessions are still required.

## Focused UI QA and cloud setup follow-up
- Isolated local Chromium UI tests with mocked data (NOT real backend acceptance): PASS title/format persistence across reload, active toolbar states, Cmd/Ctrl+S, newer edits remaining dirty during an in-flight save, failed save retaining draft and successful retry.
- Found and fixed share picker label text including option content: use explicit external label. Found and fixed missing focus return on Escape: return focus to Share explicitly after closing.
- PASS after fixes: owner excluded from picker, grant UI, Escape dismissal/focus return, dirty Library navigation cancellation, literal fixture import, 390px toolbar wrapping with no horizontal overflow. No page errors. Inspected desktop/mobile editor screenshots for hierarchy/readability/focus.
- Live root browser rendered setup message: missing VITE Supabase env inputs at build time. Handed off exact Render Environment names and rebuild instruction.
- Live direct `/docs/:id` returned Not Found: missing SPA rewrite. Handed off `/*` → `/index.html` Rewrite instruction.
- Latest real anonymous API probe now returns 401/42501 permission denied for documents (table exists); full real-user RLS checks still pending. Auth settings still report disable_signup=false.
- Created ignored `.env.review.local` template for ordinary Alice/Bob review credentials. Permission script stops with an explicit missing-credential error rather than using privileged credentials or a mock.
- Draft package created and ZIP entries inspected: 33 entries, no local env, node_modules, build output, or browser artifacts. Video/Drive and live release claims remain explicitly incomplete.

## Local verification checkpoint
- Exact Node 22.22.0 binary (temporary official Node download): TypeScript build, Vite build, and all 7 import tests PASS. Initial npm-exec attempt selected the system Node, so it was not counted as Node 22 evidence.
- Extended isolated UI checks: PASS canceled browser Back preserves URL/draft; dialog Tab/Shift+Tab cycles inside modal. Added a small explicit boundary loop after observing native dialog Tab could move focus to browser chrome at its last control.
- No further optional visual work planned. Required live flow remains blocked on Render VITE env/rewrite and ordinary demo credentials, not on local build.
- Latest local app source will be checkpointed with documentation and scripts. No deployed release commit has been verified yet.

## Real-backend verification started
- Ordinary Alice and Bob credentials supplied in ignored users.env.review.local. Both sign in successfully. Loader supports this filename and the original .env.review.local; both are ignored.
- Real API PASS: Alice creates a document with owner_id derived from session; Bob private SELECT returns zero rows; anonymous read denied; Bob private UPDATE denied/zero rows; Bob grants using Alice owner ID denied; forged ownership grant denied.
- First sharing attempt BLOCKED by recipient FK because public.demo_users is empty. Generated supabase/seed-demo.sql from verified ordinary account IDs; handed off exact SQL file to run. No privileged key used.
- Real backend via local browser PASS: Alice creates/renames, applies heading/bold/italic/underline, saves using keyboard, refreshes direct URL and sees title/formatting; Bob follows same URL through sign-in and is denied before share.
- Live Render browser still shows missing VITE config; direct editor HTTP probe still 404. Local real-backend results do not count as deployed acceptance.
- Extended the real-backend local owner browser check to save/reload both bulleted and numbered lists as well as heading/marks: PASS. Full browser script still stops at the absent Bob picker option until the seed SQL is run.
- Supplied review credentials remain outside source ZIP/git. Packaging now generates REVIEWER_ACCOUNTS.md alongside the ZIP and readable docs, without printing passwords.
- scripts/check-permissions.mjs now checks seeded directory membership before creating a test doc, and checks public signup disabling before declaring full success. Its session cleanup uses local sign-out to avoid revoking unrelated reviewer sessions.

## Requested extension — Reader and Writer roles
- User explicitly requested editable shared access and the ability to change existing recipients' roles. This supersedes the original owner-only editing scope. Keep realtime merging deferred; concurrent owner/Writer saves use last-save-wins.
- Added additive migration 202611130002_share_roles.sql. Existing shares default to Reader; role is constrained to reader/writer. Owners alone can update only the role column. Document title/content UPDATE permits owners or current Writers. Ownership/share identity grants remain immutable; policies remain nonrecursive.
- UI: choose Reader/Writer for a new share; change Role for Bob under Who has access; Writer can rename, format, save, and retain dirty drafts on failure. Only owners see Share. Library and editor label access. Refresh/reopen updates recipient controls; database downgrade enforcement is immediate.
- `npm run build` and all 7 import tests PASS after role changes.
- Temporary local PostgreSQL/PGlite checks PASS: initial shares remain Reader; Reader cannot save/self-promote; owner promotion enables Writer save; Writer cannot take ownership, grant access, or manage roles; invalid roles and share-identity changes denied; downgrade blocks stale Writer saves and preserves saved data.
- Isolated Chromium UI checks (mocked data, not cloud acceptance) PASS Reader→Writer→Reader, Writer title/body save visible to owner, no Writer Share action, role persistence on dialog reopen, downgrade error preserving stale draft, refresh read-only, Escape/focus return, and 390px dialog without overflow/page errors.
- Extended ordinary-account API and browser scripts with role checks. First live probe stops explicitly because document_shares.role does not exist; handed off exact second migration file for Supabase SQL Editor. Cloud role acceptance is pending that action.
- Updated README, architecture, submission, dashboard and walkthrough guidance for the explicit scope change. Previous source checkpoint preserved at 22f7944 and artifacts/ajaia-before-roles-22f7944.zip; no deployment initiated before migration.
- Node 22.22.0 build and all 7 import tests also PASS for this extension. Git remote remains inaccessible to the agent (no HTTPS credentials), so user-side push is required.
- Verified the existing deployed sign-in shell now opens with correct routing. This resolves the earlier Render variable/rewrite blockers for the original release; the new role build is not yet deployed.
