-- Owner-only deletion. Requires migration 001; does NOT require optional migration 003.
begin;
grant delete on public.documents to authenticated;
drop policy if exists document_delete on public.documents;
create policy document_delete on public.documents
  for delete to authenticated
  using (owner_id = (select auth.uid()));
-- Existing FK ON DELETE CASCADE removes shares. Embedded images are in the same document row.
commit;
