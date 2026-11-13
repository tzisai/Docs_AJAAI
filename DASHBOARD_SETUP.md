# Dashboard setup — needed to exercise the real backend

## Supabase

For the newly requested owner-only Delete action, run `supabase/migrations/202611130004_owner_delete.sql` once. It grants DELETE only through an owner RLS policy and uses the existing share FK cascade. It does not depend on migration 003.

The library/image fix requires no new migration: cards do not query documents.preview, and images save inside documents.content. The older 003 preview/attachment migration is optional legacy history and is not needed by the current app. Do not rerun the initial schema on this configured project.

1. Open the existing project → SQL Editor → New query. Paste the entire contents of `supabase/migrations/202611130001_documents.sql` and Run **once**. It is a transactional, versioned initial migration.
2. For Reader/Writer sharing, run `supabase/migrations/202611130002_share_roles.sql` once after the initial migration. On an existing installation, run only this new migration. Existing shares stay Reader.
3. Authentication → Users → Add user → Create new user. Create disposable Alice and Bob accounts with email/password and enable **Auto Confirm User**. Keep these passwords unique to this demo. Do not use personal accounts.
4. Authentication → Sign In / Providers → disable **Allow new users to sign up**. Keep email/password login enabled. (The API check on 2026-11-13 found signups enabled.)
5. Copy the two IDs from Authentication → Users. In SQL Editor run this seed statement, replacing both UUID placeholders:

```sql
insert into public.demo_users (id, alias) values
  ('ALICE_AUTH_USER_UUID', 'Alice'),
  ('BOB_AUTH_USER_UUID', 'Bob');
```

Do not put an Auth admin/service-role/secret key in the app or tests. The seeded directory contains only IDs and aliases; browser users cannot modify it.

## Render

In the connected repository's **Static Site** settings:

- Branch: the source branch you push from this checkout.
- Root directory: leave blank (package.json is at repository root).
- Build command: `npm ci && npm run build`.
- Publish directory: `dist`.
- Environment: `NODE_VERSION=22.22.0`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase Connect dialog. Local `API.env` uses Next-style names: Render must use the VITE names above.
- Redirects/Rewrites: source `/*`, destination `/index.html`, action **Rewrite**.
- Trigger Manual Deploy → Deploy latest commit if auto deploy is not enabled.
- Open the resulting `https://…onrender.com` URL, then test a direct `/docs/<id>` URL after login and after refresh.

`render.yaml` records these settings for Blueprint use, but an existing manually created service must be checked in its dashboard.

Send the product URL and disposable Alice/Bob credentials to continue verification. Credentials can stay in an ignored `.env.review.local` using `ALICE_EMAIL`, `ALICE_PASSWORD`, `BOB_EMAIL`, `BOB_PASSWORD`, and `PRODUCT_URL`; the scripts use only ordinary auth sessions.
