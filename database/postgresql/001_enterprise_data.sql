create table if not exists batuk_app_state (
  domain varchar(80) not null,
  organization_id varchar(160) not null default 'global',
  user_id varchar(160) not null default 'global',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (domain, organization_id, user_id)
);

create index if not exists batuk_app_state_scope_idx on batuk_app_state (organization_id, user_id);
create index if not exists batuk_app_state_payload_idx on batuk_app_state using gin (payload);

create table if not exists batuk_workspaces (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  name varchar(120) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batuk_folders (
  id varchar(160) primary key,
  workspace_id varchar(160) not null,
  organization_id varchar(160),
  user_id varchar(160),
  name varchar(120) not null,
  icon varchar(32),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batuk_chats (
  id varchar(160) primary key,
  workspace_id varchar(160),
  folder_id varchar(160),
  organization_id varchar(160),
  user_id varchar(160),
  title varchar(240) not null,
  provider varchar(80),
  model varchar(180),
  base_url text,
  guardrails boolean not null default false,
  temperature numeric(6,3),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batuk_chat_messages (
  id varchar(160) primary key,
  chat_id varchar(160) not null,
  organization_id varchar(160),
  user_id varchar(160),
  role varchar(40) not null,
  content text not null,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists batuk_memories (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160) not null,
  source_chat_id varchar(160),
  content text not null,
  status varchar(40) not null default 'active',
  confidence numeric(6,3) not null default 1,
  tags jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batuk_documents (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  name text not null,
  stored_name text not null,
  mime_type varchar(240),
  size_bytes bigint,
  status varchar(40) not null,
  embedding_provider varchar(80),
  embedding_model varchar(180),
  vector_store_provider varchar(80) not null default 'json',
  vector_index varchar(240),
  vector_namespace varchar(240),
  storage_provider varchar(80) not null default 'local',
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batuk_document_chunks (
  id varchar(160) primary key,
  document_id varchar(160) not null,
  organization_id varchar(160),
  user_id varchar(160),
  chunk_index integer not null,
  content text not null,
  embedding_json jsonb,
  vector_ref varchar(320),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists batuk_vector_index_refs (
  id varchar(160) primary key,
  provider varchar(80) not null,
  organization_id varchar(160),
  user_id varchar(160),
  document_id varchar(160),
  index_name varchar(240),
  namespace varchar(240),
  collection_name varchar(240),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists batuk_token_usage_events (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  chat_id varchar(160),
  workspace_id varchar(160),
  folder_id varchar(160),
  provider varchar(80) not null,
  model varchar(180) not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  source varchar(80) not null default 'provider',
  temporary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists batuk_audit_events (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  category varchar(80) not null,
  action varchar(160) not null,
  outcome varchar(80) not null,
  actor jsonb,
  target jsonb,
  ip_hash varchar(128),
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  previous_hash varchar(128),
  integrity_hash varchar(128),
  created_at timestamptz not null default now()
);

create table if not exists batuk_gdpr_requests (
  id varchar(160) primary key,
  organization_id varchar(160),
  subject_user_id varchar(160),
  requested_by varchar(160),
  type varchar(60) not null,
  status varchar(60) not null default 'open',
  subject_email_hash varchar(128),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists batuk_compliance_controls (
  id varchar(160) primary key,
  organization_id varchar(160),
  framework varchar(80) not null,
  title varchar(240) not null,
  requirement text,
  status varchar(80) not null,
  owner varchar(120),
  evidence jsonb not null default '[]'::jsonb,
  notes text,
  updated_by varchar(160),
  updated_at timestamptz
);

create table if not exists batuk_branding_profiles (
  organization_id varchar(160) primary key,
  product_name varchar(160) not null,
  tagline varchar(240),
  logo_initials varchar(12),
  logo_url text,
  logo_name text,
  accent_color varchar(16),
  show_org_name boolean not null default true,
  footer_locked text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batuk_skills (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  name varchar(180) not null,
  description text,
  instructions text,
  examples text,
  resources text,
  enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batuk_agents (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  name varchar(180) not null,
  description text,
  prompt text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batuk_workflows (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  name varchar(180) not null,
  description text,
  agents jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batuk_application_logs (
  id bigserial primary key,
  organization_id varchar(160),
  user_id varchar(160),
  level varchar(40) not null,
  source varchar(120) not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists batuk_chats_scope_idx on batuk_chats (organization_id, user_id, updated_at desc);
create index if not exists batuk_messages_chat_idx on batuk_chat_messages (chat_id, created_at);
create index if not exists batuk_documents_scope_idx on batuk_documents (organization_id, user_id, created_at desc);
create index if not exists batuk_token_usage_scope_idx on batuk_token_usage_events (organization_id, user_id, created_at desc);
create index if not exists batuk_audit_scope_idx on batuk_audit_events (organization_id, user_id, created_at desc);
