-- Apply after 202611130001_documents.sql. Existing grants remain read-only.
begin;

alter table public.document_shares
  add column role text not null default 'reader'
  constraint document_share_role check (role in ('reader', 'writer'));

grant insert (role) on public.document_shares to authenticated;
-- Only role is mutable; document, owner, and recipient identities stay protected.
grant update (role) on public.document_shares to authenticated;
create policy share_role_update on public.document_shares for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy document_update on public.documents;
create policy document_update on public.documents for update to authenticated
using (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.document_shares s
    where s.document_id = documents.id
      and s.recipient_id = (select auth.uid()) and s.role = 'writer'
  )
)
with check (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.document_shares s
    where s.document_id = documents.id
      and s.recipient_id = (select auth.uid()) and s.role = 'writer'
  )
);

commit;
