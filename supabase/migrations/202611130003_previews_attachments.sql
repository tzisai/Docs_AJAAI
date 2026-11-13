-- Apply after 202611130002_share_roles.sql.
begin;

-- Generate a small library excerpt without selecting full document bodies.
create function public.document_preview(body jsonb) returns text
language sql immutable set search_path = '' as $$
  with recursive nodes(node, sort_path) as (
    select body, '{}'::integer[]
    union all
    select child.value, nodes.sort_path || child.ordinality::integer
    from nodes
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(nodes.node->'content') = 'array'
        then nodes.node->'content' else '[]'::jsonb end
    ) with ordinality as child(value, ordinality)
  )
  select left(coalesce(string_agg(node->>'text', ' ' order by sort_path)
    filter (where node->>'type' = 'text'), ''), 240) from nodes;
$$;
revoke all on function public.document_preview(jsonb) from public, anon;
grant execute on function public.document_preview(jsonb) to authenticated;
alter table public.documents add column preview text
  generated always as (public.document_preview(content)) stored;

-- Object paths are <document UUID>/<random UUID>--<safe filename>.
-- The path is the association; no public bucket or original-file table is needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('document-images', 'document-images', false, 2097152,
  array['image/png', 'image/jpeg', 'image/webp']);

create policy document_image_read on storage.objects for select to authenticated
using (
  bucket_id = 'document-images' and exists (
    select 1 from public.documents d
    where d.id::text = (storage.foldername(name))[1]
  )
);
create policy document_image_upload on storage.objects for insert to authenticated
with check (
  bucket_id = 'document-images'
  and array_length(storage.foldername(name), 1) = 1
  and exists (
    select 1 from public.documents d
    where d.id::text = (storage.foldername(name))[1]
      and (d.owner_id = (select auth.uid()) or exists (
        select 1 from public.document_shares s
        where s.document_id = d.id and s.recipient_id = (select auth.uid()) and s.role = 'writer'
      ))
  )
);
create policy document_image_remove on storage.objects for delete to authenticated
using (
  bucket_id = 'document-images' and exists (
    select 1 from public.documents d
    where d.id::text = (storage.foldername(name))[1]
      and (d.owner_id = (select auth.uid()) or exists (
        select 1 from public.document_shares s
        where s.document_id = d.id and s.recipient_id = (select auth.uid()) and s.role = 'writer'
      ))
  )
);
-- No UPDATE policy: uploads use new random names and never overwrite objects.
commit;
