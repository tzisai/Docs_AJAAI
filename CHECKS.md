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

## Requested extension — preview cards, downloads, images, draft import, and UI
- User requested images with a demo size limit, document cards with previews/actions, associated attachments, text import into an existing draft, a reviewer-visible tests folder, and a visual refresh. Clarified the repeated card action: user chose Download.
- Inspected https://david-estrada.dev/#approach using Chromium after web-reader access failed. Applied editorial headings, dark/light contrast, a warm orange accent, hover/focus card interactions, and reduced-motion support; no copied artwork or extra UI package.
- Added migration 202611130003_previews_attachments.sql: generated 240-character plain-text preview column and private document-images bucket. 2 MiB limit and PNG/JPEG/WebP allowlist enforced by Storage. Document UUID paths associate attachments with documents; SELECT checks document access, INSERT/DELETE checks owner or Writer, no overwrite policy.
- Browser validates extension/MIME/signature/decoding and max 4096px per side. Attachments save immediately, separately from draft Save. Previews use 5-minute signed links; current-session download checks access again. Already-issued signed URLs stay valid until expiry.
- Cards list metadata/preview only; Edit/Open, owner-only Share, and Download. Download fetches one permitted body on demand, exporting readable UTF-8 .txt with list markers. Search filters titles/previews without another full-body query.
- Import into draft validates/decodes before reading the latest draft, then appends literal paragraphs without replacing title or existing formatting. Explicit Save required. Invalid input preserves draft. Delayed-read regression test verifies edits made during reading survive.
- Tests moved to tests/ with tests/README.md and integration/ scripts. npm test: PASS 21 checks in 3 suites. Added npm run test:permissions, test:files, and test:browser. Source packaging explicitly includes tests/ and both sample fixtures.
- Real Supabase Reader/Writer API suite: PASS all 35 checks, including promotion/save/downgrade and denied grants/ownership changes. Timestamp 2026-11-13T21:25:16.787Z; test doc 04cdbae9-3bbc-422d-b158-e203dcef7e4a. This confirms migration 002 and signup disabling are in effect.
- Local PostgreSQL/PGlite migration/policy checks: PASS generated literal preview, protected generated column, private bucket configuration, no access before share, Reader read-only image access, Writer insert/delete, rejected nested paths/overwrites, immediate downgrade denial, and anonymous storage denial. Cloud Storage size/type checks still require migration 003.
- Isolated Chromium UI checks with mocked API: PASS card previews with zero full-body list reads, search, Share modal from card/focus return, actual text download, import into unsaved draft/title preservation/Save/reload, real PNG decode/render, image upload/reload/removal, oversize rejection before upload, and 390px cards/editor without horizontal overflow or page errors.
- Found/fixed an ambiguous search field label during UI QA. Image list requests now discard stale responses. Removal requires an affected object and verifies absence, so a zero-row denial is not success.
- Initial real attachment probe blocked explicitly: documents.preview missing. Handed off migration 003 SQL file. No cloud attachment claims inferred from mocks/local SQL.
- Previous source preserved at 0543840 and artifacts/ajaia-before-attachments-0543840.zip. Deploy only after applying migration 003; agent GitHub HTTPS authentication remains unavailable.
- Final application build and all 21 tests also PASS under exact Node 22.22.0. Visually inspected final desktop/mobile cards and the white editor with attachment panel. Screenshots fast-forward CSS entry animations so they show the settled interface.
- Final cloud attachment preflight still reports missing documents.preview; no image data was uploaded by that failed preflight. Migration 003 remains the sole new backend prerequisite.
