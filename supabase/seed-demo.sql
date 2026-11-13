-- Run in Supabase SQL Editor after the schema migration. IDs verified with ordinary demo sessions.
insert into public.demo_users (id, alias) values
  ('f64917df-efad-4a85-9845-9fe21b2b2511', 'Alice'),
  ('ab65e6be-0c7a-46bb-9881-79449473593f', 'Bob')
on conflict (id) do update set alias = excluded.alias;
