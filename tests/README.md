# Tests — start here

The tests are included in the source ZIP. Run commands from the project root.

## Fast automated tests — no account needed

```sh
npm ci
npm test
```

Vitest runs all `tests/*.test.ts` files and prints each suite's pass/fail count. At present there are **36 checks in 6 suites**:

- `account.test.ts`: registration validation before network requests, trimmed email/safe confirmation return URL, immediate-session versus confirm-email outcomes, disabled-provider handling, and propagated errors.
- `importText.test.ts`: the actual multiline walkthrough fixture, Unicode, blank lines, literal markup, line endings, empty/wrong/oversized/invalid UTF-8 files.
- `documentFiles.test.ts`: importing into an existing unsaved rich-text draft, preserving formatting, protecting edits made during asynchronous decoding, invalid-input nonmutation, readable list export, safe filenames.
- `deleteDocument.test.ts`: returned-row confirmation, document/owner request scoping, and rejection of zero-row or error responses so failed deletion cannot hide a card.
- `library.test.ts`: compatibility with existing rows without a preview column, visible image-only/empty documents, and bounded card excerpts.
- `imageFiles.test.ts`: the real PNG sample, JPEG/WebP signatures, spoofed images, disallowed formats, empty/oversized files, exact inline image bytes and embedded-image size accounting.

The meaningful draft-import regression test delays file reading, changes the current draft in the meantime, then verifies that the newer work survives. It catches the stale-snapshot overwrite bug that a simple happy-path import test would miss.

```sh
npm run build
```

The build also runs strict TypeScript checks on application code. No lint script is configured.

## Real authorization and browser acceptance

These require the migrations, demo aliases, and ordinary disposable Alice/Bob accounts. No service-role key or cloud admin credentials are used. Put the two public VITE values in `.env.local`; put `ALICE_EMAIL`, `ALICE_PASSWORD`, `BOB_EMAIL`, `BOB_PASSWORD`, and `PRODUCT_URL` in ignored `.env.review.local` (the supplied `users.env.review.local` filename also works).

```sh
npm run test:permissions
npm run test:files
npm run test:delete
npx playwright install chromium
npm run test:browser
npm run test:signup
npm run test:registration
```

- `integration/check-permissions.mjs`: real document RLS, Reader/Writer transitions, denied grants, protected columns, downgrade enforcement and anonymous denial.
- `integration/check-files.mjs`: real inline image persistence, metadata projections without the optional preview column/image payloads, Reader/Writer permissions, atomic saves, and maximum-size image save/reopen. No Storage bucket or new migration is required.
- `integration/check-delete.mjs`: owner-only deletion and sharing cascade after migration 004. It deletes only its own new fixture, never existing documents.
- `integration/browser-signup.mjs`: isolated registration UI with mocked Auth/data APIs, no real account or email. Run the dev server first; tests visible buttons, mismatched passwords, confirmation state, disabled-provider errors, auto-session routing, and an unseeded user’s create/save library flow.
- `integration/check-signup.mjs`: real signup and private create/save/reopen with one disposable generated account. Requires Allow new users to sign up ON and Confirm email OFF; otherwise stops before signup/email. The password is not logged or stored.
- `integration/browser-check.mjs`: two isolated real-browser sessions, rich text/save/refresh, sharing roles, offline save recovery, text imports, images inside the page, owner-card visibility, card downloads, and narrow layout checks.

Use `PRODUCT_URL=http://localhost:5173` with `npm run dev` for local UI against real Supabase, or the deployed URL for release acceptance. Integration checks create labeled sample documents, and the image test restores a small sample after checking a 2 MiB payload. They never edit an existing user document. Browser artifacts go to ignored `artifacts/`.

Read `CHECKS.md` for actual outcomes and pending checks. A test script existing in the folder is not a claim that cloud verification passed.
