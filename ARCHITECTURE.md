# Batuk Architecture

Batuk is structured around product boundaries instead of framework files alone.

## App

- `app/page.js` composes the Better Auth gate and authenticated chat product shell.
- `app/api/auth/[...all]/route.js` exposes Better Auth's Next.js handler.
- `app/api/chat/route.js` accepts normalized chat requests and delegates validation, guardrails, and provider calls to `lib/`.
- `app/api/api-management/route.js` lets users create/revoke personal API keys and lets admins manage API model routes plus user API access.
- `app/api/v1/models/route.js`, `app/api/v1/chat/completions/route.js`, and `app/api/v1/search/route.js` expose OpenAI-compatible programmatic access to admin-enabled model routes plus Batuk-key-authenticated Perplexity Search.
- `app/api/documents/route.js` manages RAG document upload, settings, extraction, chunking, and embeddings.
- `app/api/documents/[id]/download/route.js` downloads original uploaded documents.
- `app/api/models/route.js` loads model catalogs for OpenAI, Together AI, Mistral AI, Kimi, DeepSeek, Qwen, Perplexity, Claude, Grok, OpenRouter, Ollama, and custom/manual providers.
- `app/api/realtime/session/route.js` creates ephemeral OpenAI Realtime sessions for browser voice chat.
- `app/api/token-usage/route.js` exposes accumulated input/output token usage from JSON or SQL-backed product storage.
- `app/globals.css` owns the current product theme and layout class system.

All browser-facing product APIs that touch chat data, documents, model access, token usage, or realtime sessions call `requireServerSession()` before continuing. OpenAI-compatible `/api/v1/*` endpoints authenticate with Batuk API keys instead, then resolve the key back to the owning user for authorization and token usage attribution.

## Components

- `components/auth/` contains the local account sign-in/sign-up gate.
- `components/layout/` contains app chrome such as the sidebar and top bar.
- `components/chat/` contains reusable chat primitives: composer, empty state, and message list.
- `components/settings/` contains provider, model, guardrail, and appearance controls.
- `components/api/` contains user API-key controls plus admin model-route and API-access revocation controls.
- `components/menu/` contains the Workspace tools menu and hides admin-only entries from non-admin users.
- `components/workspaces/` contains shared workspace CRUD and member management for admins.
- `components/usage/` contains token usage totals, charts, and breakdowns across chat/API dimensions.
- `components/brand/` contains brand primitives used across screens.

Components should stay presentational whenever possible. State and side effects belong in hooks or `lib/`.

## Hooks

- `hooks/useChatController.js` owns chat UI state, local persistence, message sending, copy/export actions, and theme/sidebar/settings state.
- `hooks/useRealtimeVoice.js` owns the browser WebRTC voice session lifecycle.

The API key intentionally stays in React state only. It is not persisted to local storage.
Temporary chat mode bypasses JSON chat persistence.
Token usage is still tracked for model calls, including temporary chats, in `data/token-usage.json` or SQL product storage when enabled.

## Lib

- `lib/auth.js` configures Better Auth with SQLite, MySQL, PostgreSQL, MS SQL, or MongoDB adapters.
- `lib/product-data-store.js` switches Batuk product data between local JSON and SQL-backed SQLite/PostgreSQL/MySQL app state scoped by active organization plus user, falling back to user scope when no active organization exists.
- `lib/auth-client.js` creates the Better Auth React client.
- `lib/auth-session.js` centralizes server-side session checks for protected API routes.
- `lib/providers.js` defines supported providers and default model connection settings.
- `lib/chat-utils.js` contains client-safe chat helpers.
- `lib/guardrails.js` contains guardrail prompts, screening rules, and blocked-response shaping.
- `lib/chat-request.js` validates and normalizes incoming API payloads.
- `lib/model-clients.js` contains provider clients for Ollama, Claude, Grok, OpenAI, Together AI, Mistral AI, Kimi, DeepSeek, Qwen, Perplexity, OpenRouter, OpenAI web search, Perplexity Search, and OpenAI-compatible APIs.
- `lib/model-catalog.js` contains provider model catalog loading and fallbacks.
- `lib/api-management-store.js` hashes user API keys, exposes safe public key metadata, authenticates API requests, and stores admin-managed public model routes.
- `lib/api-completions.js` handles the OpenAI-compatible completion flow as a testable unit: API-key auth, route lookup, provider call, usage recording, and response shaping.
- `lib/api-search.js` handles Batuk-key-authenticated Perplexity Search requests and records them separately from chat completions.
- `lib/rag-store.js`, `lib/rag-processing.js`, and `lib/rag-embeddings.js` contain document persistence, extraction/chunking, embeddings, and retrieval.
- `lib/token-usage-store.js` records provider-reported input/output token usage and aggregates usage by channel, user, chat, API key, provider, model, day, month, and year.

Add new model providers by extending `lib/providers.js` and `lib/model-clients.js`, not by modifying UI components directly.

## Data

- `data/navigation.js` contains starter sidebar and suggestion data. These can later be replaced by persisted workspace/chat objects without changing layout components.
- `data/chat-store.json` stores workspaces, folders, and saved chats when `BATUK_DATA_STORE_PROVIDER=json`.
- `data/document-store.json` stores RAG document metadata, chunks, and local JSON embeddings when JSON storage is enabled.
- `data/token-usage.json` stores token usage events and totals when JSON storage is enabled.
- `data/api-management-store.json` stores hashed API keys and admin model routes when JSON storage is enabled.
- `data/sb-chat-auth.sqlite` stores Better Auth users, accounts, sessions, organizations, roles, OAuth/OIDC, SSO, and SCIM records when SQLite auth is enabled.
- `database/sqlite/001_enterprise_data.sql`, `database/postgresql/001_enterprise_data.sql`, and `database/mysql/001_enterprise_data.sql` initialize SQL product data schemas for enterprise deployments.

## Auth

Batuk uses Better Auth because the product goal is sovereign AI: local accounts, local sessions, and self-hostable identity without requiring Google, GitHub, or any hosted identity provider.

- Email/password auth is enabled.
- Sessions are stored in the configured Better Auth database.
- Session cookies are HTTP-only.
- `npm run auth:migrate` creates or updates the auth schema.
- `npm run data:migrate` creates or updates Batuk product data SQL schema when `BATUK_DATA_STORE_PROVIDER` is `sqlite`, `postgresql`, or `mysql`.
- Runtime provider API keys remain in React state and are not persisted to local storage.
- User-generated Batuk API keys are shown once at creation. The raw secret is not persisted; only a SHA-256 hash and short preview are stored.

## API Gateway

Batuk's API gateway is intentionally user-scoped:

- Users create and revoke their own keys from API Access.
- Admins can view all keys, revoke one key, revoke all active keys for a user, and manage public model routes.
- Public model routes map a client-facing model ID to provider, underlying model, base URL, and enabled state.
- `/api/v1/models` returns enabled public model IDs for authenticated API-key callers.
- `/api/v1/chat/completions` returns an OpenAI-compatible `chat.completion` payload and records usage with `source: "api"`.
- API usage records include user ID/email, API key ID, public API model, provider, token counts, and timestamp.

Unit tests cover key hashing/revocation and a mocked Ollama-backed completion path. A real local smoke test has also been run against Ollama `qwen3:8b`.

## Workspace Privacy

Personal work and shared workspace work are separate scopes:

- Personal chats, folders, memories, uploaded documents, chunks, and vectors belong to the signed-in user.
- Shared workspaces are created and managed by admins.
- Users only see shared workspaces where they are members.
- Shared workspace chats and RAG data use workspace scope, not personal scope.
- ChromaDB and Pinecone vectors carry scope metadata so retrieval filters by personal or workspace scope before the model receives context.
