<h1 align="center">Batuk</h1>

<p align="center">
  <strong>Sovereign AI chat for teams: Ollama, OpenAI, OpenRouter, Claude, Grok, Sarvam AI, and private OpenAI-compatible models in one enterprise workspace.</strong>
</p>

<p align="center">
  Created by <a href="https://suhasbhairav.com"><strong>Suhas Bhairav</strong></a>
</p>

<p align="center">
  <img src="public/homepage.png" alt="Batuk AI chat workspace" width="100%" />
</p>

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-Local_AI-111111?style=for-the-badge)
![OpenAI](https://img.shields.io/badge/OpenAI-Compatible-10a37f?style=for-the-badge&logo=openai&logoColor=white)
![RAG](https://img.shields.io/badge/RAG-JSON_ChromaDB_Pinecone-10a37f?style=for-the-badge)
![Better Auth](https://img.shields.io/badge/Better_Auth-Enterprise_Identity-111111?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Air_Gapped_Ready-2496ed?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsuhasbhairav%2Fsb-chat&project-name=batuk&repository-name=batuk">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" />
  </a>
</p>

Batuk is a fully open-source enterprise-native AI platform for teams. Its main purpose is simple: give users one polished chat interface for every model they are allowed to run, from local Ollama models to OpenAI and private OpenAI-compatible gateways, with document RAG, enterprise authentication, admin controls, audit evidence, and deployment-friendly storage.

Batuk is local-first by default and enterprise-ready when you need it. Run it on a laptop with JSON files and SQLite, or deploy it in a client environment with Docker, PostgreSQL/MySQL product data, Better Auth enterprise identity, ChromaDB, and private file storage.

## Why Batuk

- **Chat with any model:** Ollama, OpenAI, OpenRouter, Claude, Grok, Sarvam AI, and custom OpenAI-compatible servers such as LM Studio, vLLM, llama.cpp, LiteLLM, or internal gateways.
- **Bring your documents:** upload, search, reindex, download, and delete documents with RAG over PDF, TXT, Markdown, JSON, LOG, CSV, XLS, XLSX, and DOCX.
- **Choose your vector store:** local JSON vectors by default, ChromaDB for self-hosted vector search, or Pinecone for managed vector search.
- **Built for teams:** Better Auth users, admins, roles, organizations, teams, invitations, SSO, OAuth/OIDC provider support, and SCIM provisioning.
- **Enterprise operations:** GDPR request workflows, audit trail, CSV evidence export, ISO 27001/SOC 2 control register, token usage, and organization-scoped storage.
- **Whitelabel by organization:** admins can set product name, tagline, accent color, initials, and uploaded logo while the footer always preserves Batuk attribution.

## Core Features

### Multi-Model Chat

- Streaming responses with Markdown rendering.
- Provider-specific model picker and manual model entry.
- Runtime Settings for local evaluation and server-side configuration for deployments.
- Temporary chat mode that avoids history persistence.
- Workspaces, folders, search, import, export, and copy actions.
- Web search through OpenAI hosted search when enabled.
- OpenAI Realtime voice sessions with browser microphone input.
- Guardrails for safer request screening and system behavior.

### Document Chat and RAG

- Upload documents from the Documents workspace.
- Extract text, chunk content, embed chunks, and retrieve relevant context during chat.
- Use local deterministic embeddings for offline/private indexing or OpenAI embeddings for higher-quality semantic search.
- Store vectors in local JSON, ChromaDB, or Pinecone.
- Download always returns the original uploaded file.
- Delete removes local metadata, source files, chunk records, and remote vectors when ChromaDB or Pinecone is used.
- Pinecone index dimension handling supports both local 384-dimensional embeddings and 1536-dimensional OpenAI embeddings.

### Enterprise Identity

- Better Auth email/password authentication.
- Admin plugin for users, roles, bans, password resets, and admin APIs.
- Organization plugin for organizations, teams, members, invitations, and organization roles.
- Dashboard plugin support for Better Auth infrastructure visibility.
- OAuth 2.1/OIDC provider support with consent page.
- SSO plugin for enterprise OIDC/SAML sign-in.
- SCIM plugin for identity-provider provisioning.
- Protected product APIs for chat, documents, skills, agents, usage, memory, models, attachments, realtime sessions, and workflows.

### Administration

- First-owner bootstrap when no owner/admin exists.
- Full admin user CRUD: create, view, update, reset password, ban, unban, and delete users.
- Organization creation and active organization switching.
- Team creation, member invitations, and role management.
- Enterprise whitelabel controls with logo upload and locked footer attribution.

### Audit and Compliance

- Dedicated Audit workspace.
- Audit trail for access denials, admin actions, document operations, chat library mutations, privacy requests, and control changes.
- Hash-chain integrity evidence for audit events.
- GDPR export/request/erasure workflows.
- Data inventory and retention notes.
- ISO 27001 and SOC 2 control evidence register.
- CSV export for audit review.

### Skills and Agents

- Skills dashboard for reusable instructions, examples, and supporting resources.
- Enable/disable skills and inject enabled skills into relevant chat requests.
- Agent Builder for saved multi-agent workflows.
- Attach documents to Agent 1, run agents sequentially, inspect the run trace, and send final output back to chat.

## Supported Providers

| Provider | Use Case |
| --- | --- |
| Ollama | Local models and private offline inference |
| OpenAI | Chat, hosted web search, embeddings, and realtime voice |
| OpenRouter | Routed access to multiple model families |
| Claude | Anthropic Messages API |
| Grok | xAI models |
| Sarvam AI | Indian-language optimized chat models |
| Custom compatible | LM Studio, vLLM, llama.cpp, LiteLLM, or enterprise gateways |

## Storage Options

| Layer | Default | Enterprise Options |
| --- | --- | --- |
| Auth | SQLite | SQLite, MySQL, PostgreSQL, MS SQL, MongoDB |
| Product data | Local JSON | SQLite, MySQL, PostgreSQL |
| Documents | Local file storage | Configurable local/container path |
| Branding logos | `public/branding` | Configurable local/container path |
| Vectors | Local JSON | ChromaDB, Pinecone |

Product data includes chats, workspaces, folders, documents metadata/chunks, memories, skills, agents, workflows, token usage, branding, compliance records, GDPR requests, and audit trails. SQL mode scopes data by active organization and user; if there is no organization, data falls back to the user scope.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, create an account, choose a provider/model in Settings, and start chatting.

For local Ollama usage, run Ollama separately and select the Ollama provider in Batuk.

```bash
ollama pull llama3.1
ollama serve
```

## Docker Deployment

Batuk includes Docker assets for enterprise and air-gapped environments:

```text
Dockerfile
docker-compose.yml
.env.enterprise.example
database/sqlite/001_enterprise_data.sql
database/postgresql/001_enterprise_data.sql
database/mysql/001_enterprise_data.sql
```

Create a runtime env file from the checked-in example, choose one database/vector profile, then start Compose.

```bash
cp .env.enterprise.example .env.enterprise
docker compose up --build
```

PostgreSQL, MySQL, and ChromaDB are available behind Compose profiles so operators can enable one stack at a time:

```bash
docker compose --profile postgres up --build
docker compose --profile mysql up --build
docker compose --profile postgres --profile chroma up --build
```

Container startup validates the enterprise environment, runs Better Auth migrations when applicable, runs product-data migrations when SQL product storage is enabled, and starts the Next.js server.

For fully offline installs, mirror the base images and service images used by `docker-compose.yml` into the enterprise registry. Pinecone support is included, but Pinecone itself requires approved network/private-connectivity access.

## Vercel Deployment

For hosted evaluation or internet-connected team pilots, use the one-click Vercel button at the top of this README. After the project is created, configure the required runtime variables from `.env.enterprise.example` in Vercel Project Settings, then redeploy.

Vercel is ideal for quick managed Next.js hosting. Use Docker Compose for air-gapped enterprise installs, private SQL services, local ChromaDB, and controlled filesystem storage.

## Configuration

Batuk can be configured from the UI for local evaluation and from environment files for repeatable enterprise deployment. The focused README intentionally avoids long credential blocks; use these files as the source of truth:

- `.env.enterprise.example` for deployment settings, identity integrations, SQL stores, vector stores, file paths, and startup behavior.
- `docker-compose.yml` for profile-based PostgreSQL, MySQL, and ChromaDB deployment.
- `database/*/001_enterprise_data.sql` for product data schema initialization.

After changing auth database settings, run:

```bash
npm run auth:migrate
```

After changing product data SQL settings, run:

```bash
npm run data:migrate
```

## Scripts

```bash
npm run dev           # Start local development
npm run build         # Build production app
npm run start         # Start production server
npm run lint          # Run ESLint
npm run env:validate  # Validate enterprise environment
npm run auth:migrate  # Create/update Better Auth schema
npm run data:migrate  # Create/update Batuk product data schema
```

## Project Shape

```text
app/                  Next.js app routes and API endpoints
components/           Chat, docs, enterprise, audit, settings, skills, agents
hooks/                Chat controller and UI state orchestration
lib/                  Providers, auth, RAG, storage, compliance, branding
database/             SQLite, PostgreSQL, and MySQL product data schemas
scripts/              Migration and Docker startup helpers
data/                 Local runtime data in development
public/branding/      Uploaded organization logos
```

## Production Notes

- Set a strong auth secret and deployment URL.
- Use HTTPS and network-level access controls.
- Choose durable SQL storage for multi-user production environments.
- Back up document storage, branding assets, SQL databases, and audit records.
- Keep provider credentials in the deployment environment or a managed secret store.
- Treat GDPR, ISO 27001, and SOC 2 features as product evidence workflows; certification still requires organizational policy, operational controls, and auditor review.

## Creator

Built by **[Suhas Bhairav](https://suhasbhairav.com)**.

## License

MIT License.

Copyright (c) 2026 [Suhas Bhairav](https://suhasbhairav.com).

See [LICENSE](./LICENSE).
