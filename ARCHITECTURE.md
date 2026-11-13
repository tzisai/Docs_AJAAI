# Architecture

The product is three surfaces: login, document library, and document editor with a native modal Share dialog. React, TypeScript, and Vite run as a static SPA on Render. Tiptap 3 with StarterKit supplies document structure and required formatting, including underline. Instrument Sans is bundled locally; the writing body uses Georgia. The visual reference is [Edison Fang Workshop](https://edisonfangworkshop.com/): alignment, small metadata labels, restrained typography, and whitespace. Text labels keep controls understandable and avoid icon licensing/setup work.

## Data flow

The browser initializes Supabase Auth before choosing a route. Email/password sessions use the publishable key; Supabase adds the user's session to data requests. Signed-out deep links become `/login?next=/docs/:id` and return after sign-in. There is no privileged server or secret key in the frontend.

The library selects only `id, owner_id, title, updated_at`, never every body. Opening one document retrieves its JSON. Creation and import share `createDocument`. Import validates bytes, decodes UTF-8 strictly, converts lines to paragraph/text JSON, and discards the binary. It never inserts imported markup as HTML.

The editor keeps title/body in memory and compares them with a last-saved snapshot. Save captures both in one database update, locks requests with a ref, and changes the saved baseline only after a returned row confirms success. A newer edit during the request differs from that snapshot and remains dirty. A missing returned row is an explicit failure. A 15-second timeout and readable retry error preserve drafts on failure. Title normalization does not overwrite a newer title edit.

React Router's blocker handles internal and browser-history navigation. Sign-out explicitly confirms dirty state, and `beforeunload` requests browser support for refresh/tab-close warnings. There is no autosave or local recovery, and browser warnings cannot prevent every OS/browser termination. Owner sessions in multiple tabs use last-save-wins.

## Database authorization

One versioned transactional SQL migration is the source of truth. `documents` contains UUID ID, owner derived from `auth.uid()`, trimmed-length-constrained title, Tiptap JSONB content with a doc/array root constraint, and a database timestamp. INSERT grants only title/content; UPDATE grants only title/content. IDs, owner, and timestamps cannot be changed through the browser role. The trigger sets updated_at.

`document_shares` has a `(document_id, recipient_id)` primary key, prevents self-sharing, and references seeded demo recipients. A composite `(document_id, owner_id)` foreign key targets a unique key on documents. This prevents a user from fabricating ownership of someone else's document.

RLS enforces:

- Documents SELECT: owner, or an existing share for the current recipient.
- Documents INSERT/UPDATE: owner must equal the current session user.
- Shares SELECT: owner or recipient, checked directly on the share row.
- Shares INSERT: owner equals the current user; the composite FK proves document ownership.
- Demo directory SELECT: authenticated users see only manually seeded aliases/IDs.

These policies do not mutually recurse: document reads may consult shares, but share policies never consult documents. Anonymous roles have no table grants. Browser roles cannot delete data, modify the directory, update shares, or grant edit access. Duplicate shares raise unique violation 23505; the UI treats that as an already-completed grant. Public signups are disabled in dashboard configuration, not via a client-side restriction. Auth users are not exposed.

The JSON root constraint protects the storage contract but is not a complete Tiptap schema validator. Content from the UI/importer uses known Tiptap nodes. A future server boundary could validate a stricter document schema and impose a rich-text body size limit.

## Deployment and verification

Render builds the committed lockfile with npm ci and serves dist over HTTPS; a catch-all rewrite serves direct routes. Supabase provides Auth, the REST data API, RLS enforcement, and durable Postgres. Client-only architecture keeps deployment small while enforcement stays in the database. VITE environment values are public build inputs; privileged keys stay outside app/test clients.

Actual check outcomes are recorded in CHECKS.md. Import tests exercise the same text fixture used in the walkthrough. `scripts/check-permissions.mjs` is a real ordinary-account API probe, and `scripts/browser-check.mjs` uses isolated Alice/Bob browser contexts against the configured product URL. Pending checks are explicitly marked, not inferred from code review.

## Tradeoffs and next 2–4 hours

The priority is a reproducible create/save/reopen/import/read-share flow. Shared editing, realtime sync, comments, history, email invitations, extra file formats, Watermelon, and custom icons were cut. With another 2–4 hours: complete any outstanding live acceptance checks first, add pagination to the metadata list, consider a stricter server-side document-body validator, and then add optimistic concurrency/version checks for owner tabs. Do not add those at the expense of reviewer access and the walkthrough.
