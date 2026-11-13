# AI workflow

This note records the actual sequence. The latest correction below supersedes the earlier preview-column/Storage-gallery implementation.

## Tools actually used

OpenAI Codex in the repository was used to inspect the assignment and implementation plan, write React/TypeScript/CSS and SQL, run commands, and prepare review materials. Its web tool checked the Tiptap StarterKit and Supabase RLS primary documentation and the Edison Fang design reference. Its plugin discovery located Supabase and Render integrations; discovery alone did not establish account access. No subagents, image generator, or optional UI kit were used.

## Concrete acceleration

Codex built the UTF-8 import converter and a fixture-driven Vitest suite together. The realistic multiline fixture includes blank lines, Unicode, a trailing newline, and literal `<strong>` markup. Reusing the exact sample for tests and walkthrough preparation removed a separate demo-data task and checked a common unsafe import shortcut: interpreting text as HTML.

It also prepared ordinary-session API checks from the SQL policy model, including zero-row denied updates and the owner's original-data check after Bob's denied attempts.

## Suggestion changed or rejected

During implementation, an initial proposed navigation guard used manual history entries and a popstate confirmation. That patch was replaced before acceptance with React Router's data-router `useBlocker`, because a manual history guard can let the route change before confirmation. Explicit sign-out confirmation and `beforeunload` remain separate for those lifecycle paths.

The initial dependency choice used Vitest 3. npm audit identified development dependency advisories; this was changed to the current release and the suite rerun. No automatic force-update was applied to unrelated runtime packages.

## Evidence and limits

Actual command and browser results live in CHECKS.md. The first strict TypeScript build caught a missing Node type declaration for the test fixture's filesystem import; it was fixed and the build passed. Seven focused import checks passed. Chromium verified the signed-out direct URL redirect and mobile login without page errors or horizontal overflow. Isolated UI checks with mocked API responses then exercised save concurrency, failed-save draft retention/retry, dirty navigation, toolbar wrapping, and the native dialog. Those checks found two real accessibility issues: an ambiguous select label and missing focus restoration after Escape. Both were fixed and the checks passed. These UI checks are recorded separately from real-backend acceptance. npm audit after the test-runner update reported zero vulnerabilities.

Live Supabase initially responded that the documents table was missing; a later anonymous probe returned permission denied, confirming table existence. Auth settings still showed signups enabled. Render initially returned a suspended-service 503; the user resumed it. Those observations are setup blockers, not passing product checks. Ordinary demo sessions subsequently confirmed Alice creation, Bob private read/write/grant denial, and anonymous denial. The local browser against real Supabase passed owner editing/save/refresh and Bob’s pre-share direct-link denial. Sharing stopped at the missing demo-directory seed. Complete real-user sharing and deployed results will be recorded only when run. AI-authored code is not evidence that a cloud policy or live flow works.

## Later Reader/Writer request

The user subsequently requested editable shared access. This replaced the original owner-only scope. The change uses an additive migration, preserves existing Reader grants, and restricts role management to the owner. The previous client owner filter on Save was removed so valid Writers can save; database RLS remains authoritative. Local PostgreSQL-role checks and isolated UI checks verified promotion, Writer saves, forbidden sharing/ownership changes, and immediate downgrade denial. Cloud verification remains pending until the additive migration is applied; it is not inferred from the local checks.

## Later cards, images, and draft-import request

Codex inspected the requested David Estrada reference in Chromium, then adapted its typography/contrast into a card library with visible actions and reduced-motion support. A useful engineering choice was generating short previews in Postgres instead of fetching every JSON body for cards. Images use a private document-scoped bucket rather than public links or base64 in the rich-text document.

A regression test deliberately delayed text file decoding, changed the draft during the delay, and verified that the newer text survives the append. That tests the failure mode of taking an early AI-generated draft snapshot. Browser QA found an accessible-name issue in the search label; it was replaced with an explicit external label. The UI fixture also verified that oversized image input never triggers an upload request.

All 21 unit checks passed, and the real ordinary-account role suite passed 35 checks. Local SQL and mocked browser checks validate the new file/card implementation separately from cloud Storage acceptance; migration 003 must be applied before that final check can run. Tests and reviewer commands are now in tests/ and tests/README.md.

## Correction after the user reported missing documents

The first card patch introduced a dependency on an unapplied generated preview column, and image uploads were interpreted as a separate attachment gallery. The user reported the resulting missing-column error and clarified that images must be inside the document. Both decisions were changed: card listing now projects existing JSON text leaves without the extra column, and supported image bytes become Tiptap image nodes saved atomically with the body. The storage/migration dependency was removed from the runtime.

Verification used actual ordinary Supabase sessions, not only generated tests: create/save/reopen worked; the new metadata query returned existing rows; image bytes and surrounding text survived reopen; Reader writes were denied; Writer title/text/image saves appeared to the owner; and a full 2 MiB payload saved/reopened successfully. The browser exercised actual image rendering after refresh, owner-card visibility, direct-link sharing, role transitions, offline recovery, imports, downloads, and narrow layouts. All 26 unit checks pass, including missing-column compatibility and embedded-byte regressions.

A further injected directory outage exposed that waiting for optional sharing requests delayed the entire library. Those requests were separated from core metadata loading, with stale-response guards, so directory failures cannot hold saved documents offscreen. The release must still be pushed/deployed before claiming the live app is fixed.

## Final registration request

The user then explicitly requested a Create account button, reversing the earlier demo-only signup restriction. Registration reuses Supabase Auth rather than adding a custom password store or browser admin key. Tests distinguish an immediate session from an email-confirmation response, verify that mismatched passwords send no request, and check that a new user absent from the seeded directory can use a private workspace. The mocked browser flow covered visible buttons, confirmation/back navigation, auto-session routing, create/save, and mobile layout. Local SQL role checks confirmed that an unseeded Auth user can own documents while existing private documents stay hidden. Actual registration remains dependent on enabling Supabase's signup toggle; that blocker is recorded rather than called a passing live check.
