# AI workflow

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
