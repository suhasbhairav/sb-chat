# Batuk Architecture

Batuk is structured around product boundaries instead of framework files alone.

## App

- `app/page.js` composes the Better Auth gate and authenticated chat product shell.
- `app/api/auth/[...all]/route.js` exposes Better Auth's Next.js handler.
- `app/api/chat/route.js` accepts normalized chat requests and delegates validation, guardrails, and provider calls to `lib/`.
- `app/api/documents/route.js` manages RAG document upload, settings, extraction, chunking, and embeddings.
- `app/api/documents/[id]/download/route.js` downloads original uploaded documents.
- `app/api/models/route.js` loads model catalogs for OpenAI, Claude, Grok, OpenRouter, Ollama, and custom/manual providers.
- `app/api/realtime/session/route.js` creates ephemeral OpenAI Realtime sessions for browser voice chat.
- `app/api/token-usage/route.js` exposes accumulated input/output token usage from JSON or SQL-backed product storage.
- `app/globals.css` owns the current product theme and layout class system.

All product APIs that touch chat data, documents, model access, token usage, or realtime sessions call `requireServerSession()` before continuing.

## Components

- `components/auth/` contains the local account sign-in/sign-up gate.
- `components/layout/` contains app chrome such as the sidebar and top bar.
- `components/chat/` contains reusable chat primitives: composer, empty state, and message list.
- `components/settings/` contains provider, model, guardrail, and appearance controls.
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
- `lib/model-clients.js` contains provider clients for Ollama, Claude, Grok, OpenAI, OpenRouter, OpenAI web search, and OpenAI-compatible APIs.
- `lib/model-catalog.js` contains provider model catalog loading and fallbacks.
- `lib/rag-store.js`, `lib/rag-processing.js`, and `lib/rag-embeddings.js` contain document persistence, extraction/chunking, embeddings, and retrieval.
- `lib/token-usage-store.js` records provider-reported input/output token usage and aggregates usage by provider, model, and day.

Add new model providers by extending `lib/providers.js` and `lib/model-clients.js`, not by modifying UI components directly.

## Data

- `data/navigation.js` contains starter sidebar and suggestion data. These can later be replaced by persisted workspace/chat objects without changing layout components.
- `data/chat-store.json` stores workspaces, folders, and saved chats when `BATUK_DATA_STORE_PROVIDER=json`.
- `data/document-store.json` stores RAG document metadata, chunks, and local JSON embeddings when JSON storage is enabled.
- `data/token-usage.json` stores token usage events and totals when JSON storage is enabled.
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
