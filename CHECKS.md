# Checks and decisions

## 2026-11-13 — initial inspection
- Read README, ASSMT.txt, and the full implementation plan. No AGENTS.md found. No app, lockfile, migration, tests, or deployment config existed.
- Git remote: https://github.com/tzisai/Docs_AJAAI. User reports Render and Supabase already set up.
- Local runtime: Node 26.13.0 / npm 12.2.2. Render pinned to Node 22.22.0; verify build compatibility there.
- API.env contains only a project URL and publishable key with Next-style names. Kept ignored; mapped to Vite names in ignored .env.local.
- Using requested React/Vite/TypeScript/Tiptap 3/Supabase stack. Text action labels; no optional icon or component library.
- Read current Tiptap StarterKit and Supabase RLS documentation and Edison Fang reference. Apply spacious typography, aligned metadata rows, restrained palette.
- Supabase and Render plugins discovered but not connected in this agent session. Dashboard migration/auth and deployment verification remain pending.
- No acceptance stage claimed complete yet.

## First local slice
- `npm run build`: PASS (TypeScript + Vite). Initial failure from missing Node types for fixture import fixed by adding @types/node.
- `npm test`: PASS, 7 import checks in one focused suite.
- Updated Vitest to current version after initial npm audit reported development dependency issues. `npm audit --omit=dev`: PASS, zero vulnerabilities; install audit also reports zero after update.
- Browser (Chromium/Playwright): PASS signed-out direct editor URL preserves `/docs/:id` in login `next`; no page errors; 390px login has no horizontal overflow.
- Real Supabase API: auth settings respond; public signups enabled (needs disabling); documents table not yet present (migration required). No real-user authorization claims yet.
- Git remote access: BLOCKED, `fatal: could not read Username for 'https://github.com': No such device or address`. User must authenticate Git and push main, or connect a repository integration.
- Product URL supplied: https://docs-ajaai.onrender.com. First probe returned 503 with `x-render-routing: suspend-by-user`. User reports resuming the site; recheck pending.
- Navigation: replaced a proposed ad hoc history guard with React Router useBlocker before browser acceptance checks. Keep drafts in memory only.
