# Ajaia Documents

A small document workspace: write and save rich text, browse preview cards, import text, attach images, download documents, and give a teammate Reader or Writer access.

Product URL: https://docs-ajaai.onrender.com

**Release status:** local build/import tests pass. The owner flow and pre-share denial pass against real Supabase from local browsers. Real Reader/Writer API checks now pass (35 checks). Images/card previews are a later extension: apply the third migration before deploying this version. See [CHECKS.md](CHECKS.md) for actual outcomes and [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) for pending dashboard actions. Do not treat the URL above as a verified release until those checks pass.

## Run locally

Use Node 22.22.0 (see `.node-version`) and npm. The lockfile is committed.

```sh
npm ci
cp .env.example .env.local
# Fill in the two public Supabase values in .env.local.
npm run dev
```

Environment variables:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key; never a secret or service-role key |

Vite embeds these public values at build time. Rebuild after changing them. Local env files and the supplied API.env are ignored. No privileged credentials belong in source, the browser, or test clients.

```sh
npm test
npm run build
npm run preview
```

There is no configured lint script. TypeScript strict checking runs as part of build. All automated tests live in `tests/`, with reviewer instructions in [tests/README.md](tests/README.md). `npm test` currently runs 21 checks across 3 suites, including a regression test protecting edits made while a text file is being decoded. The walkthrough uses the same `samples/team-notes.txt` and `samples/idea-board.png` fixtures as the tests.

## Database and demo users

Run `supabase/migrations/202611130001_documents.sql` **once** in the existing project's SQL Editor. Then run `supabase/migrations/202611130002_share_roles.sql` **once** to enable roles (existing shares default to Reader). Then run `supabase/migrations/202611130003_previews_attachments.sql` once for card previews and private image attachments. On an existing installation, apply only migrations not already applied; do not rerun the initial schema. The third migration creates the private Storage bucket and its policies; no additional key is needed. The migrations are versioned and transactional; together they establish constraints, column grants, triggers, previews, and row policies. Create two auto-confirmed password users through Supabase Authentication → Users. Disable public signups. Seed only their aliases and UUIDs into `public.demo_users`:

```sql
insert into public.demo_users (id, alias) values
  ('ALICE_AUTH_USER_UUID', 'Alice'),
  ('BOB_AUTH_USER_UUID', 'Bob');
```

Replace those placeholders with actual Auth UUIDs. For this configured demo project, `supabase/seed-demo.sql` contains the IDs verified through ordinary Alice/Bob sign-in; run that file instead of copying placeholders. Users cannot modify this directory. It does not expose Auth emails or the Auth users table. See [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) for dashboard details.

Both disposable Alice/Bob accounts have successfully signed in. `REVIEWER_ACCOUNTS.md` next to the source ZIP contains their login details after packaging; credentials stay outside git and the source ZIP. The demo directory includes both accounts; keep the seed SQL for reproducible setup. Use sample content only. Do not reuse real passwords; rotate or remove the demo accounts after review.

## Render

Use a **Static Site** on the connected GitHub repository. Build: `npm ci && npm run build`. Publish: `dist`. Pin Node 22.22.0. Set the two VITE variables before build. Add a **Rewrite** `/*` → `/index.html` so direct editor URLs survive refresh. `render.yaml` records the intended Blueprint configuration; verify existing service settings manually. Supabase hosts Auth and Postgres; Render hosts the frontend.

## Reviewer script — two independent sessions

Use Alice in a normal browser window and Bob in a separate browser/profile or private window. Two tabs in one profile share an auth session.

1. Alice signs in. The library shows document cards with a title, generated preview, and Edit/Share/Download actions. Search filters titles and excerpts. Select **New document**, rename the inline title, and type some text. Use Bold, Italic, Underline, heading styles, and both lists. Toolbar buttons show pressed states; Tab reaches all controls. Standard Tiptap shortcuts work.
2. Select **Save** or Ctrl/Cmd+S. Wait for **Saved**. Refresh the direct `/docs/:id` URL. Title and formatting should persist.
3. Copy the direct URL into Bob's separate session. Sign in as Bob. Before sharing he should see an unavailable/no-access message, not the document.
4. Alice selects **Share**, picks Bob, chooses **Reader**, and grants access. The picker excludes Alice and existing recipients. Escape closes the dialog and returns focus. Repeated grants are harmless.
5. Bob refreshes. As Reader he can read the document; **Read-only** is visible and editing/Save/Share controls are absent. In his library it appears under **Shared with me**, labeled with Alice as owner. Alice sees it under **My documents**. In Share → Who has access, Alice changes **Role for Bob** to **Writer**. Bob refreshes/reopens, edits title/body, and saves; Alice refreshes to see the result. Writers cannot manage sharing. Change Bob back to Reader to remove write access.
6. In the editor, **Import text into draft** appends UTF-8 .txt text without changing the title or replacing existing work. It remains unsaved until Save; invalid input leaves the draft intact. **Attach image** saves a document attachment immediately. Test with `samples/idea-board.png`; refresh to confirm it persists. Readers can view/download attachments; owners and Writers can add/remove them. Back in the library, **Download** exports a UTF-8 .txt copy with readable lists (rich formatting is not retained). Alice returns to the library and imports `samples/team-notes.txt`. Title becomes `team-notes`; blank lines and `<strong>literal markup</strong>` remain literal text. Refresh to confirm persistence. Invalid or oversized files show a clear error without replacing any library entries.
7. Alice edits again, goes offline using browser devtools, and selects Save. The error must retain the draft. Reconnect and retry Save. Wait for Saved and refresh.
8. At 390px width, confirm formatting controls wrap, remain keyboard reachable, and have visible focus. While dirty, Library, browser Back, sign out, and refresh must warn before discarding changes (browser refresh warnings depend on browser support and user interaction).
9. Open a direct document URL signed out: it should require sign-in and restore the requested destination afterward.

The save path is explicit and one request at a time. Edits made while saving stay dirty. Failed saves keep the in-memory draft for retry. Navigation discards a draft only after confirmation. No autosave or local draft recovery is implemented. Owner and Writer sessions use **last-save-wins**; there is no simultaneous-edit conflict resolution.

## File import limits

Only **UTF-8 `.txt` files up to 100 KiB (102,400 bytes)** are accepted. Empty/whitespace-only files, invalid UTF-8, null bytes, wrong extensions, and oversized files fail before document creation. The filename stem becomes the title (trimmed, maximum 120 characters). CRLF/CR are normalized; every line becomes a Tiptap paragraph containing literal text nodes, with empty paragraphs preserving blank lines. Only converted JSON is persisted. For text import the original binary is discarded; only the converted document is stored. Image attachments use the separate private Storage bucket described below.

## Permission and browser checks

After configuring demo accounts, put `ALICE_EMAIL`, `ALICE_PASSWORD`, `BOB_EMAIL`, `BOB_PASSWORD`, and `PRODUCT_URL` in ignored `.env.review.local`. The scripts also read `.env.local`; the supplied `users.env.review.local` filename is supported too. These must be ordinary demo credentials.

```sh
npm run test:permissions
npm run test:files
npx playwright install chromium
npm run test:browser
```

The first script checks real API reads, Reader write denial, Writer saves, owner-only role changes, downgrade enforcement, immutable columns, constraints, duplicate grants, and anonymous denial. A zero-row update is a denial, not a success. It leaves a labeled permission-check document. The file suite checks real private Storage permissions, server limits, and preview generation, then removes its own images. The browser suite uses two independent sessions against the real backend and leaves walkthrough/import sample documents. These checks use only the publishable key and ordinary accounts. Browser screenshots go into ignored `artifacts/`.

## Images, attachments, and downloads

Images attach to an existing document in a private Supabase Storage bucket. Allowed types: **PNG, JPEG, WebP**. Maximum **2 MiB (2,097,152 bytes) per image**, and **4096 × 4096 pixels** in the browser. The client checks extension, MIME, file signature, decoding, and dimensions; Storage also enforces the MIME allowlist and 2 MiB cap. SVG, GIF, arbitrary files, and inline rich-text image nodes are excluded from this demo.

Object names use the document UUID plus a random filename. RLS checks the associated document: Readers can view/download; owners and current Writers can upload/remove; anonymous users cannot access it. Uploads never overwrite. Images appear below the writing page, persist immediately, and do not depend on Save. Preview links are signed for five minutes; **Refresh images** renews them. Downloads check the current session again. A signed link already issued remains valid until expiry.

Library previews are generated in Postgres from document JSON (up to 240 characters); metadata listing never fetches every body. **Download** fetches only the selected accessible document and exports plain UTF-8 `.txt`, preserving words, blank lines, and list prefixes. It does not preserve rich formatting or bundle attachments.

The visual refresh references [David Estrada’s approach section](https://david-estrada.dev/#approach): bold editorial hierarchy, dark/light contrast, warm orange accents, and responsive cards. Focus is visible, actions stay visible without hovering, and reduced-motion preferences disable animations.

## Deliberate scope

Owners and explicitly granted Writers can edit title and body. Readers can view; only owners manage access. Role changes appear in a recipient’s UI after refresh/reopen; the database enforces downgrades immediately, including stale open tabs. Simultaneous edits use last-save-wins: there is no realtime merging or conflict resolution. No realtime sync, comments, version history, email invites, rich-format export, extra text import formats, autosave, or local drafts. Text action labels avoid an extra icon dependency. See [ARCHITECTURE.md](ARCHITECTURE.md), [AI_WORKFLOW.md](AI_WORKFLOW.md), and [SUBMISSION.md](SUBMISSION.md).
