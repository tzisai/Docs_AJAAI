# Architecture

React, TypeScript, Vite, and Tiptap 3 run as a static SPA on Render. Supabase provides email/password Auth and Postgres with RLS. The app has login, a document card library, and an editor with Share. Instrument Sans is bundled locally, with Georgia for the writing body. The requested David Estrada reference informs the dark/light contrast, warm orange accent, large headings, and card interactions. The page remains white, controls retain visible focus, and reduced-motion settings disable animation.

## Authentication and data flow

The app restores the initial Supabase session before routing. Signed-out editor links retain `/docs/:id` through login. The publishable key and current user's session are the only browser credentials. There is no privileged frontend service or exposed Auth users table.

Creation, text import, editing, and images use `documents.content` JSONB. Save captures title/body together and permits one request in flight. A returned row confirms success; zero rows are failure. Successful requests update the baseline snapshot without discarding edits made during the request. Failures and 15-second timeouts keep the in-memory draft. Router blocking, sign-out confirmation, and supported beforeunload warnings protect dirty work. No autosave/local recovery; owner/Writer tabs use last-save-wins.

## Library regression and correction

The previous card implementation required an unapplied generated `documents.preview` column, causing the library query to fail and saved documents to appear absent. Real create/save/reopen checks confirmed persistence still worked. The current list selects id/owner/title/timestamp plus a few text leaves using PostgREST JSON-path projections. It never requests the optional preview column or image data URLs. Excerpts are capped at 240 characters for display. Image-only/empty documents stay visible. Directory/role-label failures cannot suppress successfully retrieved documents.

A selected document's full JSON is fetched only when opening/downloading it. Download serializes readable UTF-8 text and list prefixes; image nodes become descriptive labels. Search operates on metadata/excerpts, not every body.

## Database authorization

The initial document/share schema and Reader/Writer migrations support editing/sharing. Owner-only Delete additionally uses migration 004; it is independent of optional migration 003. The third, earlier preview/Storage migration is retained as optional legacy history but is no longer used by the app; this fix does not require it or a rollback if it was applied.

Documents have UUID ID, session-derived immutable owner, trimmed title constraints, JSON doc/array root shape, and a database timestamp. Browser INSERT/UPDATE privileges permit only title/content. RLS allows SELECT to the owner or a granted recipient, and UPDATE to the owner or a current Writer. Reader writes and stale downgraded Writer writes return zero rows and are not treated as saves.

Shares have a unique document/recipient pair, seeded-recipient FK, no self-sharing, and a composite document/owner FK proving ownership. SELECT checks owner/recipient directly; INSERT checks owner; UPDATE is owner-only and column privileges permit only role. This avoids policy recursion. Writer access never permits ownership changes or share management. Anonymous roles have no document/directory/share grants. Public signups remain disabled in dashboard settings. Migration 004 grants DELETE with a policy requiring the current user to be the owner. Readers/Writers cannot delete, even though they can read. The UI asks for permanent confirmation and removes a card only after DELETE returns an affected ID. Zero rows or errors preserve the card. The existing FK cascades sharing-grant deletion; embedded images disappear with the same document row.

The JSON root constraint is not a full Tiptap schema/body-size validator. A production boundary should validate allowed nodes and resource limits server-side. The demo uses manually provisioned ordinary accounts and UI validation.

## Images inside the document

Images are actual Tiptap image nodes in the white page, not gallery attachments. PNG/JPEG/WebP bytes are validated, decoded, converted to a data URL, and inserted at the editor selection. The draft becomes dirty; the same explicit Save stores text, title, and images atomically. Reopen reconstructs the image node; Reader mode renders it without edit controls. Selecting the image and pressing Delete removes the node, with removal persisted on Save.

The UI limits each file to 2 MiB and 4096px per side, and embedded image bytes to 6 MiB per document. Only supported image data URLs render; remote and SVG image sources are excluded. No Storage bucket, signed URL renewal, or extra SQL setup is necessary. This is a deliberate demo tradeoff: base64 increases JSON size and editor-open payloads, but it avoids broken image references and split persistence. The real API check saves/reopens the maximum 2 MiB single-image payload, then restores a small sample. A production implementation would store private objects and stable document references with coordinated cleanup.

## Text import and verification

UTF-8 .txt conversion validates extension/size/content/encoding, preserves blank lines as empty paragraphs, and treats markup literally. New-document import uses the filename stem as title. Existing-draft import decodes first, reads the latest draft afterward, and appends nodes so asynchronous reads cannot overwrite newer edits. Invalid input never changes the draft. The original text binary is discarded.

The runnable tests/ folder contains 29 unit checks in 5 suites, integration API checks, and a real two-session browser walkthrough. The delayed-import regression and missing-preview-column compatibility tests exercise observed failure modes. CHECKS.md distinguishes real cloud/API/browser results from historical mocked checks. Browser QA covers Save/reopen, owner-card visibility, inline image persistence, sharing/downgrade, offline retry, import, download, and narrow layouts.

Render builds with npm ci on Node 22.22.0 and serves dist with an SPA rewrite. VITE values are public build inputs. A corrected local build must still be pushed and deployed before it is claimed as the live release candidate.

## Tradeoffs and next 2–4 hours

Finish deployed acceptance and reviewer links before extras. Next improvements: a strict server-side document schema and image budget, object-storage references with cleanup if larger images are needed, metadata pagination, and optimistic concurrency for owner/Writer tabs. Realtime merging, comments, history, email invitations, generic attachments, rich-format export, and local drafts remain deferred.
