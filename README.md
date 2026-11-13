# Ajaia Documents

A small document workspace: write and save rich text, import plain text, and give a demo teammate read access.

Product URL: https://docs-ajaai.onrender.com

**Release status:** local build/import tests pass. Live deployment, database migration, and real Alice/Bob flow are not yet verified. See [CHECKS.md](CHECKS.md) for actual outcomes and [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) for pending dashboard actions. Do not treat the URL above as a verified release until those checks pass.

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

There is no configured lint script. TypeScript strict checking runs as part of build. The focused Vitest suite uses `samples/team-notes.txt`, also the walkthrough input.

## Database and demo users

Run `supabase/migrations/202611130001_documents.sql` **once** in the existing project's SQL Editor. It creates the schema, constraints, column grants, update trigger, and row policies in one transaction. Create two auto-confirmed password users through Supabase Authentication → Users. Disable public signups. Seed only their aliases and UUIDs into `public.demo_users`:

```sql
insert into public.demo_users (id, alias) values
  ('ALICE_AUTH_USER_UUID', 'Alice'),
  ('BOB_AUTH_USER_UUID', 'Bob');
```

Replace those placeholders with actual Auth UUIDs. Users cannot modify this directory. It does not expose Auth emails or the Auth users table. See [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) for dashboard details.

Disposable reviewer accounts: **pending provisioning/confirmation**. Provide the actual emails and passwords privately in the submission folder's reviewer guide before submitting. Use sample content only. Do not reuse real passwords; rotate or remove the demo accounts after review.

## Render

Use a **Static Site** on the connected GitHub repository. Build: `npm ci && npm run build`. Publish: `dist`. Pin Node 22.22.0. Set the two VITE variables before build. Add a **Rewrite** `/*` → `/index.html` so direct editor URLs survive refresh. `render.yaml` records the intended Blueprint configuration; verify existing service settings manually. Supabase hosts Auth and Postgres; Render hosts the frontend.

## Reviewer script — two independent sessions

Use Alice in a normal browser window and Bob in a separate browser/profile or private window. Two tabs in one profile share an auth session.

1. Alice signs in. Select **New document**, rename the inline title, and type some text. Use Bold, Italic, Underline, heading styles, and both lists. Toolbar buttons show pressed states; Tab reaches all controls. Standard Tiptap shortcuts work.
2. Select **Save** or Ctrl/Cmd+S. Wait for **Saved**. Refresh the direct `/docs/:id` URL. Title and formatting should persist.
3. Copy the direct URL into Bob's separate session. Sign in as Bob. Before sharing he should see an unavailable/no-access message, not the document.
4. Alice selects **Share**, picks Bob, and grants read access. The picker excludes Alice and existing recipients. Escape closes the dialog and returns focus. Repeated grants are harmless.
5. Bob refreshes. He can read the document; **Read-only** is visible and editing/Save/Share controls are absent. In his library it appears under **Shared with me**, labeled with Alice as owner. Alice sees it under **My documents**.
6. Alice returns to the library and imports `samples/team-notes.txt`. Title becomes `team-notes`; blank lines and `<strong>literal markup</strong>` remain literal text. Refresh to confirm persistence. Invalid or oversized files show a clear error without replacing any library entries.
7. Alice edits again, goes offline using browser devtools, and selects Save. The error must retain the draft. Reconnect and retry Save. Wait for Saved and refresh.
8. At 390px width, confirm formatting controls wrap, remain keyboard reachable, and have visible focus. While dirty, Library, browser Back, sign out, and refresh must warn before discarding changes (browser refresh warnings depend on browser support and user interaction).
9. Open a direct document URL signed out: it should require sign-in and restore the requested destination afterward.

The save path is explicit and one request at a time. Edits made while saving stay dirty. Failed saves keep the in-memory draft for retry. Navigation discards a draft only after confirmation. No autosave or local draft recovery is implemented. Two owner tabs use **last-save-wins**; there is no simultaneous-edit conflict resolution.

## File import limits

Only **UTF-8 `.txt` files up to 100 KiB (102,400 bytes)** are accepted. Empty/whitespace-only files, invalid UTF-8, null bytes, wrong extensions, and oversized files fail before document creation. The filename stem becomes the title (trimmed, maximum 120 characters). CRLF/CR are normalized; every line becomes a Tiptap paragraph containing literal text nodes, with empty paragraphs preserving blank lines. Only converted JSON is persisted. The original binary is discarded; there is no attachment or storage bucket.

## Permission and browser checks

After configuring demo accounts, put `ALICE_EMAIL`, `ALICE_PASSWORD`, `BOB_EMAIL`, `BOB_PASSWORD`, and `PRODUCT_URL` in ignored `.env.review.local`. The scripts also read `.env.local`. These must be ordinary demo credentials.

```sh
node scripts/check-permissions.mjs
npx playwright install chromium
node scripts/browser-check.mjs
```

The first script checks real API reads, denied writes/grants, immutable columns, constraints, duplicate grants, owner preservation, and anonymous denial. A zero-row update is a denial, not a success. It leaves a labeled permission-check document. The second uses two independent browser sessions against the real backend and leaves walkthrough/import sample documents. Neither script accepts an admin key. Browser screenshots go into ignored `artifacts/`.

## Deliberate scope

Owner-only editing and read sharing. No shared editing, realtime sync, comments, version history, email invites, export, other import formats, autosave, or local drafts. Text action labels avoid an extra icon dependency. See [ARCHITECTURE.md](ARCHITECTURE.md), [AI_WORKFLOW.md](AI_WORKFLOW.md), and [SUBMISSION.md](SUBMISSION.md).
