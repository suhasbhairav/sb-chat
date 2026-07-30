-- Batuk Supabase RAG storage.
-- Run this in the Supabase SQL editor, then create a private Storage bucket
-- named `batuk-documents` or set SUPABASE_DOCUMENT_BUCKET to your bucket name.

create extension if not exists vector;

create table if not exists public.batuk_document_chunks (
  id text primary key,
  document_id text not null,
  document_name text not null,
  chunk_index integer not null,
  content text not null,
  embedding vector not null,
  embedding_provider text not null,
  embedding_model text not null,
  scope_type text not null default 'personal',
  organization_id text not null,
  user_id text not null,
  workspace_id text,
  storage_bucket text,
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists batuk_document_chunks_scope_idx
  on public.batuk_document_chunks (scope_type, organization_id, user_id, workspace_id);

create index if not exists batuk_document_chunks_document_idx
  on public.batuk_document_chunks (document_id);

create or replace function public.match_batuk_document_chunks(
  chunks_table text,
  query_embedding vector,
  match_count integer,
  filter_scope_type text,
  filter_organization_id text,
  filter_user_id text,
  filter_workspace_id text,
  filter_embedding_provider text,
  filter_embedding_model text
)
returns table (
  id text,
  document_id text,
  document_name text,
  chunk_index integer,
  content text,
  similarity double precision
)
language plpgsql
stable
as $$
declare
  safe_table text;
begin
  safe_table := regexp_replace(coalesce(chunks_table, 'batuk_document_chunks'), '[^a-zA-Z0-9_]', '', 'g');
  if safe_table = '' then
    safe_table := 'batuk_document_chunks';
  end if;

  return query execute format(
    'select
       c.id,
       c.document_id,
       c.document_name,
       c.chunk_index,
       c.content,
       1 - (c.embedding <=> $1) as similarity
     from public.%I c
     where c.scope_type = $2
       and c.organization_id = $3
       and c.user_id = $4
       and (($5::text is null and c.workspace_id is null) or c.workspace_id = $5)
       and ($6 = '''' or c.embedding_provider = $6)
       and ($7 = '''' or c.embedding_model = $7)
       and vector_dims(c.embedding) = vector_dims($1)
     order by c.embedding <=> $1
     limit $8',
    safe_table
  )
  using
    query_embedding,
    filter_scope_type,
    filter_organization_id,
    filter_user_id,
    filter_workspace_id,
    filter_embedding_provider,
    filter_embedding_model,
    greatest(1, least(coalesce(match_count, 6), 50));
end;
$$;
