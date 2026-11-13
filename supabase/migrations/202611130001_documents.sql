begin;

create table public.demo_users (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text not null unique check (char_length(btrim(alias)) between 1 and 60)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  title text not null default 'Untitled document'
    check (char_length(btrim(title)) between 1 and 120),
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  constraint content_root check (
    jsonb_typeof(content) = 'object'
    and content @> '{"type":"doc"}'::jsonb
    and content ? 'content'
    and jsonb_typeof(content->'content') = 'array'
  )
);

create table public.document_shares (
  document_id uuid not null,
  owner_id uuid not null default auth.uid(),
  recipient_id uuid not null references public.demo_users(id),
  primary key (document_id, recipient_id),
  foreign key (document_id, owner_id) references public.documents(id, owner_id) on delete cascade,
  check (owner_id <> recipient_id)
);
create index documents_owner_idx on public.documents(owner_id);
create index document_shares_recipient_idx on public.document_shares(recipient_id, document_id);

create function public.set_document_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger document_updated before update on public.documents
for each row execute function public.set_document_updated_at();

alter table public.demo_users enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;

revoke all on public.demo_users, public.documents, public.document_shares from anon, authenticated;
grant select on public.demo_users to authenticated;
grant select on public.documents to authenticated;
grant insert (title, content) on public.documents to authenticated;
grant update (title, content) on public.documents to authenticated;
grant select on public.document_shares to authenticated;
grant insert (document_id, owner_id, recipient_id) on public.document_shares to authenticated;
revoke all on function public.set_document_updated_at() from public, anon, authenticated;

create policy demo_directory on public.demo_users for select to authenticated using (true);
create policy share_read on public.document_shares for select to authenticated
using (owner_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy share_create on public.document_shares for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy document_read on public.documents for select to authenticated using (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.document_shares s
    where s.document_id = documents.id and s.recipient_id = (select auth.uid())
  )
);
create policy document_create on public.documents for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy document_update on public.documents for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

commit;
