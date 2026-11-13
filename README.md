# Ajaia Documents

A focused document workspace with rich text, images inside the writing page, preview cards, text import, downloads, and Reader/Writer sharing.

Product URL: https://docs-ajaai.onrender.com

The latest fix works with the existing database: **no `documents.preview` column or Storage bucket is required**. The earlier migration-dependent card view has been replaced. Apply only the initial document schema and Reader/Writer migration for a new installation. See [CHECKS.md](CHECKS.md) for actual results and release status.

## Run locally

Use Node 22.22.0 (`.node-version`) and npm:

```sh
npm ci
cp .env.example .env.local
# Fill in the two public Supabase values.
npm run dev
```

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key; never a service-role/secret key |

Vite embeds these public values at build time. Rebuild after changing them. Local env files, supplied API.env, and test credentials are ignored by git and excluded from the source ZIP.

```sh
npm test
npm run build
npm run preview
```

All **26 unit checks in 4 suites** are in [tests/](tests/README.md). The delayed-import regression test proves that edits made while a file is being decoded survive. Library tests cover missing preview columns and image-only documents. Image tests check validation and exact embedded bytes. Build includes strict TypeScript checking of the app. No lint script is configured.

## Database and demo accounts

For a new project, run these SQL files once, in order:

1. `supabase/migrations/202611130001_documents.sql`: documents, demo aliases, sharing, constraints, grants, and RLS.
2. `supabase/migrations/202611130002_share_roles.sql`: Reader/Writer roles and owner-only role changes.

**Existing demo project:** these two migrations already work; no new SQL is needed for this fix. `202611130003_previews_attachments.sql` is retained as a legacy optional migration from the earlier attachment implementation. The current app does not use its generated column or bucket. Do not run it to fix saving or images, and do not rerun the initial schema. If already applied, it can remain installed.

Create two disposable email/password users in Supabase Authentication → Users with Auto Confirm enabled, disable public signups, and seed only their UUIDs and aliases:

```sql
insert into public.demo_users (id, alias) values
  ('ALICE_AUTH_USER_UUID', 'Alice'),
  ('BOB_AUTH_USER_UUID', 'Bob');
```

For the configured project, `supabase/seed-demo.sql` contains IDs verified using ordinary Alice/Bob sign-in. The directory already contains both accounts. The browser cannot modify it or query Auth users. Disposable login details are generated into `REVIEWER_ACCOUNTS.md` next to the source ZIP, outside git and the ZIP. Use sample content only and rotate credentials after review.

## Render

Use a Static Site: build `npm ci && npm run build`, publish `dist`, Node 22.22.0, and the two VITE variables above. Add Rewrite `/*` → `/index.html`. Push the latest source and deploy it; no database dashboard action is needed for this fix. `render.yaml` records the intended settings, but an existing service must be checked in Render. Supabase provides Auth/Postgres; Render serves the frontend.

## Reviewer flow — two independent sessions

Use Alice in a normal window and Bob in a separate browser profile/private window. Tabs in the same profile share auth.

1. Alice signs in, creates a document, renames it, and uses bold, italic, underline, headings, bullets and numbered lists. Save or Ctrl/Cmd+S; wait for Saved.
2. Select **Insert image into document +** and choose `samples/idea-board.png`. The image appears inside the white writing page. It is an unsaved change until Save. Save, refresh, and confirm the title, text, and image remain.
3. Return to Library: the saved card must appear in My documents. Open it again. Card actions are Edit, owner-only Share, and Download. Search filters title/text previews.
4. Bob opens the private direct URL, signs in, and is denied. Alice opens Share, selects Bob as Reader, and grants access. Bob refreshes: text/images are visible, editing and sharing controls are absent, and his card appears under Shared with me.
5. Alice changes Role for Bob to Writer under Who has access. Bob refreshes/reopens, edits/saves, and Alice refreshes to see the result. Only Alice can manage sharing. Downgrade Bob to Reader: database writes are denied immediately; refresh updates his controls.
6. Import `samples/team-notes.txt` from the library to create a new document. Filename stem becomes title; blank lines and literal markup remain text. In the editor, **Import text into draft** appends to existing work without changing the title. Save the combined draft and refresh. Invalid input must leave existing work intact.
7. Card Download exports a UTF-8 `.txt` copy. It preserves readable text/list prefixes; images become `[Image: filename]` labels and rich formatting is not retained.
8. Edit, go offline in devtools, and Save. The retryable error must keep the draft. Reconnect, retry Save, refresh. While dirty, Library/browser Back/sign-out/refresh warn before discarding work (browser unload support varies).
9. At 390px, check toolbar wrapping and visible keyboard focus. Share traps focus, Escape dismisses it, and focus returns to Share. Direct editor URLs work after sign-in and refresh.

Saving writes title and JSON body together, with one request in flight. Edits made during a request remain dirty; failures keep the draft. No autosave or local draft persistence. Owner/Writer sessions use **last-save-wins**, without realtime merging.

## File limits

**Text import:** UTF-8 `.txt`, up to **100 KiB (102,400 bytes)**. Wrong extensions, empty/whitespace-only files, invalid UTF-8, null bytes, and oversized files fail before document mutation. Lines become literal Tiptap paragraph/text nodes; CRLF/CR normalize to LF. Only converted JSON is stored, not the original text binary. Existing-draft import appends; Save is explicit.

**Images inside documents:** PNG, JPEG, WebP; up to **2 MiB per image**, **4096 × 4096 pixels**, and **6 MiB of embedded image bytes per document** in the UI. Extension, MIME, signature, decoding, dimensions, and total image bytes are checked. SVG/GIF are excluded. Select an image in the editor and press Delete to remove it; Save persists removal. Readers cannot change images.

Images are stored as data URLs in Tiptap image nodes inside `documents.content`, alongside text. They are authorized by the same document RLS and saved atomically. There is no separate attachment gallery, public URL, signed-link expiry, or bucket setup. This simple demo choice increases JSON payloads; a production version would use private object storage and durable references. Browser limits are not a complete server-side JSON validator.

**Card previews:** the list projects a few text leaves from JSON with PostgREST, never image payloads or full document bodies. No `preview` database column is queried. The displayed excerpt is capped at 240 characters; image-only pages show an image-document label. Optional sharing-directory failures cannot hide successfully loaded documents.

## Automated acceptance checks

Put the ordinary demo `ALICE_EMAIL`, `ALICE_PASSWORD`, `BOB_EMAIL`, `BOB_PASSWORD`, and `PRODUCT_URL` in ignored `.env.review.local` or `users.env.review.local`. The scripts also read `.env.local`.

```sh
npm run test:permissions
npm run test:files
npx playwright install chromium
npm run test:browser
```

The permission suite tests real document RLS and role changes (35 checks). The file suite tests real text/image atomic persistence, owner library projections, Reader/Writer access, anonymous denial, and a 2 MiB image save/reopen, without new SQL. The browser suite uses two isolated sessions. Use `PRODUCT_URL=http://localhost:5173` for local UI with real Supabase or the live URL for release acceptance. Tests create labeled sample documents and never edit an existing user document. Screenshots/download artifacts are ignored.

## Scope and handoff

Reader/Writer sharing, cards, downloads, and embedded images were added at the user's request. Realtime merging, comments, version history, email invites, rich-format export, extra text formats, autosave/local recovery, and generic attachments are deferred. Visual references: [Edison Fang Workshop](https://edisonfangworkshop.com/) and the requested [David Estrada approach](https://david-estrada.dev/#approach). Actions remain visible without hover; focus and reduced motion are supported.

See ARCHITECTURE.md, AI_WORKFLOW.md, SUBMISSION.md, and CHECKS.md. Run `node scripts/package.mjs` to regenerate the clean source ZIP and readable docs in `artifacts/submission/`. Video/Drive links are explicitly marked missing until supplied and checked signed out.
