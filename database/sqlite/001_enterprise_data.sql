create table if not exists batuk_app_state (
  domain text not null,
  organization_id text not null default 'global',
  user_id text not null default 'global',
  payload text not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  primary key (domain, organization_id, user_id)
);

create index if not exists batuk_app_state_scope_idx on batuk_app_state (organization_id, user_id);

create table if not exists batuk_workspaces (
  id text primary key,
  organization_id text,
  user_id text,
  scope_type text not null default 'personal',
  owner_id text,
  members text not null default '[]',
  rag_enabled integer not null default 1,
  name text not null,
  metadata text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists batuk_folders (
  id text primary key,
  workspace_id text not null,
  organization_id text,
  user_id text,
  scope_type text not null default 'personal',
  workspace_id text,
  name text not null,
  icon text,
  metadata text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists batuk_chats (
  id text primary key,
  workspace_id text,
  folder_id text,
  organization_id text,
  user_id text,
  title text not null,
  provider text,
  model text,
  base_url text,
  guardrails integer not null default 0,
  temperature real,
  metadata text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists batuk_chat_messages (
  id text primary key,
  chat_id text not null,
  organization_id text,
  user_id text,
  role text not null,
  content text not null,
  attachments text not null default '[]',
  metadata text not null default '{}',
  created_at text not null default (datetime('now'))
);

create table if not exists batuk_memories (
  id text primary key,
  organization_id text,
  user_id text not null,
  source_chat_id text,
  content text not null,
  status text not null default 'active',
  confidence real not null default 1,
  tags text not null default '[]',
  metadata text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists batuk_documents (
  id text primary key,
  organization_id text,
  user_id text,
  name text not null,
  stored_name text not null,
  mime_type text,
  size_bytes integer,
  status text not null,
  embedding_provider text,
  embedding_model text,
  vector_store_provider text not null default 'json',
  vector_index text,
  vector_namespace text,
  storage_provider text not null default 'local',
  storage_path text,
  metadata text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists batuk_document_chunks (
  id text primary key,
  document_id text not null,
  organization_id text,
  user_id text,
  scope_type text not null default 'personal',
  workspace_id text,
  chunk_index integer not null,
  content text not null,
  embedding_json text,
  vector_ref text,
  metadata text not null default '{}',
  created_at text not null default (datetime('now'))
);

create table if not exists batuk_vector_index_refs (
  id text primary key,
  provider text not null,
  organization_id text,
  user_id text,
  scope_type text not null default 'personal',
  workspace_id text,
  document_id text,
  index_name text,
  namespace text,
  collection_name text,
  metadata text not null default '{}',
  created_at text not null default (datetime('now'))
);

create table if not exists batuk_token_usage_events (
  id text primary key,
  organization_id text,
  user_id text,
  chat_id text,
  workspace_id text,
  folder_id text,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  source text not null default 'provider',
  temporary integer not null default 0,
  metadata text not null default '{}',
  created_at text not null default (datetime('now'))
);

create table if not exists batuk_audit_events (
  id text primary key,
  organization_id text,
  user_id text,
  category text not null,
  action text not null,
  outcome text not null,
  actor text,
  target text,
  ip_hash text,
  user_agent text,
  metadata text not null default '{}',
  previous_hash text,
  integrity_hash text,
  created_at text not null default (datetime('now'))
);

create table if not exists batuk_gdpr_requests (
  id text primary key,
  organization_id text,
  subject_user_id text,
  requested_by text,
  type text not null,
  status text not null default 'open',
  subject_email_hash text,
  notes text,
  metadata text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  completed_at text
);

create table if not exists batuk_compliance_controls (
  id text primary key,
  organization_id text,
  framework text not null,
  title text not null,
  requirement text,
  status text not null,
  owner text,
  evidence text not null default '[]',
  notes text,
  updated_by text,
  updated_at text
);

create table if not exists batuk_branding_profiles (
  organization_id text primary key,
  product_name text not null,
  tagline text,
  logo_initials text,
  logo_url text,
  logo_name text,
  accent_color text,
  show_org_name integer not null default 1,
  footer_locked text not null,
  metadata text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists batuk_skills (
  id text primary key,
  organization_id text,
  user_id text,
  name text not null,
  description text,
  instructions text,
  examples text,
  resources text,
  enabled integer not null default 0,
  metadata text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists batuk_agents (
  id text primary key,
  organization_id text,
  user_id text,
  name text not null,
  description text,
  prompt text,
  metadata text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists batuk_workflows (
  id text primary key,
  organization_id text,
  user_id text,
  name text not null,
  description text,
  agents text not null default '[]',
  metadata text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists batuk_application_logs (
  id integer primary key autoincrement,
  organization_id text,
  user_id text,
  level text not null,
  source text not null,
  message text not null,
  metadata text not null default '{}',
  created_at text not null default (datetime('now'))
);

create index if not exists batuk_chats_scope_idx on batuk_chats (organization_id, user_id, updated_at);
create index if not exists batuk_messages_chat_idx on batuk_chat_messages (chat_id, created_at);
create index if not exists batuk_documents_scope_idx on batuk_documents (organization_id, user_id, created_at);
create index if not exists batuk_documents_rag_scope_idx on batuk_documents (scope_type, organization_id, user_id, workspace_id, created_at);
create index if not exists batuk_document_chunks_rag_scope_idx on batuk_document_chunks (scope_type, organization_id, user_id, workspace_id, document_id);
create index if not exists batuk_vector_refs_rag_scope_idx on batuk_vector_index_refs (provider, scope_type, organization_id, user_id, workspace_id);
create index if not exists batuk_token_usage_scope_idx on batuk_token_usage_events (organization_id, user_id, created_at);
create index if not exists batuk_audit_scope_idx on batuk_audit_events (organization_id, user_id, created_at);
