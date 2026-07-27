create table if not exists batuk_app_state (
  domain varchar(80) not null,
  organization_id varchar(160) not null default 'global',
  user_id varchar(160) not null default 'global',
  payload json not null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (domain, organization_id, user_id),
  key batuk_app_state_scope_idx (organization_id, user_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_workspaces (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  scope_type varchar(40) not null default 'personal',
  owner_id varchar(160),
  members json,
  rag_enabled boolean not null default true,
  name varchar(120) not null,
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  key batuk_workspaces_scope_idx (organization_id, user_id, updated_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_folders (
  id varchar(160) primary key,
  workspace_id varchar(160) not null,
  organization_id varchar(160),
  user_id varchar(160),
  name varchar(120) not null,
  icon varchar(32),
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  key batuk_folders_workspace_idx (workspace_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

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
  temperature decimal(6,3),
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  key batuk_chats_scope_idx (organization_id, user_id, updated_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_chat_messages (
  id varchar(160) primary key,
  chat_id varchar(160) not null,
  organization_id varchar(160),
  user_id varchar(160),
  role varchar(40) not null,
  content mediumtext not null,
  attachments json,
  metadata json,
  created_at timestamp not null default current_timestamp,
  key batuk_messages_chat_idx (chat_id, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_memories (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160) not null,
  source_chat_id varchar(160),
  content text not null,
  status varchar(40) not null default 'active',
  confidence decimal(6,3) not null default 1,
  tags json,
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  key batuk_memories_scope_idx (organization_id, user_id, updated_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_documents (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  scope_type varchar(40) not null default 'personal',
  workspace_id varchar(160),
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
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  key batuk_documents_scope_idx (organization_id, user_id, created_at),
  key batuk_documents_rag_scope_idx (scope_type, organization_id, user_id, workspace_id, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_document_chunks (
  id varchar(160) primary key,
  document_id varchar(160) not null,
  organization_id varchar(160),
  user_id varchar(160),
  scope_type varchar(40) not null default 'personal',
  workspace_id varchar(160),
  chunk_index integer not null,
  content mediumtext not null,
  embedding_json json,
  vector_ref varchar(320),
  metadata json,
  created_at timestamp not null default current_timestamp,
  key batuk_document_chunks_document_idx (document_id, chunk_index),
  key batuk_document_chunks_rag_scope_idx (scope_type, organization_id, user_id, workspace_id, document_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_vector_index_refs (
  id varchar(160) primary key,
  provider varchar(80) not null,
  organization_id varchar(160),
  user_id varchar(160),
  scope_type varchar(40) not null default 'personal',
  workspace_id varchar(160),
  document_id varchar(160),
  index_name varchar(240),
  namespace varchar(240),
  collection_name varchar(240),
  metadata json,
  created_at timestamp not null default current_timestamp,
  key batuk_vector_refs_scope_idx (provider, organization_id, user_id),
  key batuk_vector_refs_rag_scope_idx (provider, scope_type, organization_id, user_id, workspace_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_token_usage_events (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  user_email varchar(240),
  chat_id varchar(160),
  workspace_id varchar(160),
  folder_id varchar(160),
  api_key_id varchar(160),
  api_model varchar(180),
  provider varchar(80) not null,
  model varchar(180) not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  source varchar(80) not null default 'provider',
  temporary boolean not null default false,
  metadata json,
  created_at timestamp not null default current_timestamp,
  key batuk_token_usage_scope_idx (organization_id, user_id, created_at),
  key batuk_token_usage_channel_idx (organization_id, source, api_key_id, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_api_keys (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160) not null,
  user_email varchar(240),
  name varchar(120) not null,
  key_hash varchar(128) not null unique,
  preview varchar(40) not null,
  status varchar(40) not null default 'active',
  last_used_at timestamp null,
  revoked_at timestamp null,
  revoked_by varchar(160),
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  key batuk_api_keys_user_idx (organization_id, user_id, status, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_api_model_routes (
  id varchar(160) primary key,
  organization_id varchar(160),
  label varchar(160) not null,
  provider varchar(80) not null,
  model varchar(180) not null,
  base_url text,
  enabled boolean not null default true,
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  key batuk_api_model_routes_enabled_idx (organization_id, enabled, provider)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_audit_events (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  category varchar(80) not null,
  action varchar(160) not null,
  outcome varchar(80) not null,
  actor json,
  target json,
  ip_hash varchar(128),
  user_agent text,
  metadata json,
  previous_hash varchar(128),
  integrity_hash varchar(128),
  created_at timestamp not null default current_timestamp,
  key batuk_audit_scope_idx (organization_id, user_id, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_gdpr_requests (
  id varchar(160) primary key,
  organization_id varchar(160),
  subject_user_id varchar(160),
  requested_by varchar(160),
  type varchar(60) not null,
  status varchar(60) not null default 'open',
  subject_email_hash varchar(128),
  notes text,
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  completed_at timestamp null,
  key batuk_gdpr_scope_idx (organization_id, subject_user_id, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_compliance_controls (
  id varchar(160) primary key,
  organization_id varchar(160),
  framework varchar(80) not null,
  title varchar(240) not null,
  requirement text,
  status varchar(80) not null,
  owner varchar(120),
  evidence json,
  notes text,
  updated_by varchar(160),
  updated_at timestamp null,
  key batuk_controls_framework_idx (organization_id, framework)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

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
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_skills (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  name varchar(180) not null,
  description text,
  instructions mediumtext,
  examples mediumtext,
  resources mediumtext,
  enabled boolean not null default false,
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  key batuk_skills_scope_idx (organization_id, user_id, enabled)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_agents (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  name varchar(180) not null,
  description text,
  prompt mediumtext,
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_workflows (
  id varchar(160) primary key,
  organization_id varchar(160),
  user_id varchar(160),
  name varchar(180) not null,
  description text,
  agents json,
  metadata json,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists batuk_application_logs (
  id bigint primary key auto_increment,
  organization_id varchar(160),
  user_id varchar(160),
  level varchar(40) not null,
  source varchar(120) not null,
  message text not null,
  metadata json,
  created_at timestamp not null default current_timestamp,
  key batuk_application_logs_scope_idx (organization_id, user_id, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
