# Architecture

The product is three surfaces: login, document library, and document editor with a native modal Share dialog. React, TypeScript, and Vite run as a static SPA on Render. Tiptap 3 with StarterKit supplies document structure and required formatting, including underline. Instrument Sans is bundled locally; the writing body uses Georgia. The first visual reference was Edison Fang Workshop. A later requested refresh uses [David Estrada’s approach section](https://david-estrada.dev/#approach): dark/light contrast, large editorial headings, a warm orange accent, interactive preview cards, and short transitions. Reduced-motion settings disable animation; the writing page remains white and readable. Text labels keep controls understandable and avoid icon licensing/setup work.

## Data flow

The browser initializes Supabase Auth before choosing a route. Email/password sessions use the publishable key; Supabase adds the user's session to data requests. Signed-out deep links become `/login?next=/docs/:id` and return after sign-in. There is no privileged server or secret key in the frontend.

The library selects only `id, owner_id, title, updated_at, preview`, never every body. The third migration adds a generated 240-character plain-text preview using an immutable recursive SQL function; previews update with content and cannot be independently forged. Card Download fetches just one document after permission checks, serializes readable plain text, and creates a local download Blob. Opening one document retrieves its JSON. Creation and import share `createDocument`. Import validates bytes, decodes UTF-8 strictly, converts lines to paragraph/text JSON, and discards the binary. It never inserts imported markup as HTML.

The editor keeps title/body in memory and compares them with a last-saved snapshot. Save captures both in one database update, locks requests with a ref, and changes the saved baseline only after a returned row confirms success. A newer edit during the request differs from that snapshot and remains dirty. A missing returned row is an explicit failure. A 15-second timeout and readable retry error preserve drafts on failure. Title normalization does not overwrite a newer title edit.

React Router's blocker handles internal and browser-history navigation. Sign-out explicitly confirms dirty state, and `beforeunload` requests browser support for refresh/tab-close warnings. There is no autosave or local recovery, and browser warnings cannot prevent every OS/browser termination. Owner and Writer sessions use last-save-wins; simultaneous edits are not merged.

## Database authorization

Three versioned transactional SQL migrations are the source of truth. The third adds generated card previews and a private image bucket with Storage policies. The initial migration established owner-only editing; the second implements the user-requested Reader/Writer extension without changing existing shares from Reader. Apply them in order; never rerun the initial migration on an existing installation. `documents` contains UUID ID, owner derived from `auth.uid()`, trimmed-length-constrained title, Tiptap JSONB content with a doc/array root constraint, and a database timestamp. INSERT grants only title/content; UPDATE grants only title/content. IDs, owner, and timestamps cannot be changed through the browser role. The trigger sets updated_at.

`document_shares` has a `(document_id, recipient_id)` primary key, prevents self-sharing, and references seeded demo recipients. A composite `(document_id, owner_id)` foreign key targets a unique key on documents. This prevents a user from fabricating ownership of someone else's document.

RLS enforces:

- Documents SELECT: owner, or an existing share for the current recipient.
- Documents INSERT: owner must equal the current session user.
- Documents UPDATE: owner or a current Writer grant; only title/content are writable.
- Share UPDATE: owner only, with column privileges restricted to role. Reader/Writer is constrained in SQL; share identities remain immutable.
- Shares SELECT: owner or recipient, checked directly on the share row.
- Shares INSERT: owner equals the current user; the composite FK proves document ownership.
- Demo directory SELECT: authenticated users see only manually seeded aliases/IDs.

These policies do not mutually recurse: document reads may consult shares, but share policies never consult documents. Anonymous roles have no table grants. Browser users cannot delete data or modify the directory. Only the owner can create shares or update their role; Readers/Writers cannot manage sharing or take ownership. Existing grants default to Reader. Duplicate shares raise unique violation 23505; the UI treats that as an already-completed grant. Public signups are disabled in dashboard configuration, not via a client-side restriction. Auth users are not exposed.

The JSON root constraint protects the storage contract but is not a complete Tiptap schema validator. Content from the UI/importer uses known Tiptap nodes. A future server boundary could validate a stricter document schema and impose a rich-text body size limit.

## Attachments and importing into a draft

Image attachments use the private `document-images` bucket. The path `<document UUID>/<random UUID>--<safe filename>` associates each object with a document; there is no public bucket, permanent public URL, or separate metadata table. Storage metadata supplies display names and byte sizes. Policies consult the document and share rows without adding recursion: any permitted document reader can read images; only owners/Writers can insert or delete. There is no overwrite UPDATE policy. The bucket enforces a 2 MiB cap and PNG/JPEG/WebP MIME allowlist. The browser additionally validates file signatures, decodes the image, and limits each side to 4096 pixels.

Uploads and removal persist immediately, separately from explicit document Save. Image previews use five-minute signed URLs; refreshing images renews them. Current-session download uses Storage authorization again. A previously issued signed URL remains usable until expiry; this is a deliberate short-lived-link tradeoff. A removal must return an affected object and a follow-up list must confirm absence; a zero-row denial is not reported as success. Unexpected upload failures retain existing attachments. General attachments, rich-text inline images, thumbnails/transcoding, and per-document total quotas are deferred.

Text import into an existing draft decodes/validates first and reads the current editor state afterward, then appends paragraph/text nodes and marks the document dirty. This avoids overwriting edits made during asynchronous file reading. Existing formatting and the title stay intact; Save persists the combined content. Invalid input never touches the draft. The original text binary is discarded.

## Deployment and verification

Render builds the committed lockfile with npm ci and serves dist over HTTPS; a catch-all rewrite serves direct routes. Supabase provides Auth, the REST data API, RLS enforcement, and durable Postgres. Client-only architecture keeps deployment small while enforcement stays in the database. VITE environment values are public build inputs; privileged keys stay outside app/test clients.

Actual check outcomes are recorded in CHECKS.md. Import tests exercise the same text fixture used in the walkthrough. `tests/integration/check-permissions.mjs` is a real ordinary-account API probe, and `tests/integration/browser-check.mjs` uses isolated Alice/Bob browser contexts against the configured product URL. Pending checks are explicitly marked, not inferred from code review.

## Tradeoffs and next 2–4 hours

The priority is a reproducible create/save/reopen/import/share flow. Reader/Writer permissions were added at the user’s explicit request. Realtime merging, comments, history, email invitations, extra file formats, Watermelon, and custom icons remain cut. Role changes require recipient refresh/reopen to update controls; authorization changes take effect immediately in Postgres. A stale writer’s denied save retains the in-memory draft. Only the owner sees Share. With another 2–4 hours: complete any outstanding live acceptance checks first, add pagination to the metadata list, consider a stricter server-side document-body validator, and then add optimistic concurrency/version checks for owner tabs. Do not add those at the expense of reviewer access and the walkthrough.
