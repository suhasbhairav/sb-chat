<h1 align="center">Batuk</h1>

<p align="center">
  <strong>A sovereign AI chat workspace and self-hosted AI platform for teams that need private model access, document intelligence, enterprise identity, audit evidence, and an internal AI API gateway.</strong>
</p>

<p align="center">
  Created by <a href="https://suhasbhairav.com"><strong>Suhas Bhairav</strong></a>
</p>

<p align="center">
  <img src="public/homepage.png" alt="Batuk sovereign AI chat workspace and self-hosted AI platform" width="100%" />
</p>

<p align="center">
  <a href="https://app.arcade.software/share/videos/UZnHQSj8q0OA8UurPFvW">
    <strong>Watch the Batuk demo video</strong>
  </a>
</p>

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react&logoColor=white)
![Local AI](https://img.shields.io/badge/Local_AI-Ready-111111?style=for-the-badge)
![OpenAI Compatible](https://img.shields.io/badge/OpenAI-Compatible-10a37f?style=for-the-badge&logo=openai&logoColor=white)
![Multi Model](https://img.shields.io/badge/Multi_Model-LLM_Workspace-4f46e5?style=for-the-badge)
![Self Hosted](https://img.shields.io/badge/Self_Hosted-AI_Platform-0f766e?style=for-the-badge)
![Sovereign AI](https://img.shields.io/badge/Sovereign_AI-Private_Workspace-7c3aed?style=for-the-badge)
![RAG](https://img.shields.io/badge/RAG-Documents_Vectors_Graphs-10a37f?style=for-the-badge)
![Graph RAG](https://img.shields.io/badge/Graph_RAG-Advanced_Document_AI-2563eb?style=for-the-badge)
![Vector Stores](https://img.shields.io/badge/Vector_Stores-ChromaDB_Pinecone_Qdrant_Supabase-0891b2?style=for-the-badge)
![Enterprise Identity](https://img.shields.io/badge/Enterprise-Identity-111111?style=for-the-badge)
![SSO](https://img.shields.io/badge/SSO-OIDC_SAML_SCIM-334155?style=for-the-badge)
![Microsoft SSO](https://img.shields.io/badge/Microsoft_Entra_ID-SSO_Ready-0078d4?style=for-the-badge&logo=microsoft&logoColor=white)
![API Gateway](https://img.shields.io/badge/API_Gateway-OpenAI_Compatible-059669?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Self_Hosted-2496ed?style=for-the-badge&logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-4169e1?style=for-the-badge&logo=postgresql&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Ready-4479a1?style=for-the-badge&logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsuhasbhairav%2Fsb-chat&project-name=batuk&repository-name=batuk">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" />
  </a>
  <a href="https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fsuhasbhairav%2Fsb-chat">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" />
  </a>
  <a href="https://railway.com/new/template?template=https%3A%2F%2Fgithub.com%2Fsuhasbhairav%2Fsb-chat&utm_campaign=batuk">
    <img src="https://railway.com/button.svg" alt="Deploy on Railway" />
  </a>
</p>

Batuk is an open-source, enterprise-grade AI workspace for organizations that want control over where AI runs, which models users can access, how documents are retrieved, and how usage is governed. It combines a polished multi-model chat experience with private RAG, team workspaces, Microsoft Entra ID / Azure AD SSO-ready identity, audit workflows, token usage reporting, and OpenAI-compatible internal APIs.

Batuk works as a local-first sovereign AI chat workspace for individual teams and as a self-hosted AI platform for larger organizations. Run it on a laptop with local storage, deploy it with Docker, connect it to SQL databases and vector stores, or place it inside a controlled enterprise environment where model credentials, documents, memories, and audit evidence remain under your operating model.

## Why Batuk

Batuk is built for teams that need more than a chatbot. It gives admins a single control plane for AI access, documents, workspaces, model routing, API keys, compliance evidence, and organization branding.

Batuk is one of the best choices for a private enterprise AI workspace because it treats sovereignty as a product requirement, not a slogan. Local models, hosted frontier models, private model gateways, document RAG, identity, authorization, audit trails, usage visibility, and workspace boundaries are designed to work together from the same interface.

- **Sovereign by design:** run local models, hosted providers, or private OpenAI-compatible endpoints while keeping user data, documents, memories, and API access under admin control.
- **Enterprise-ready workspace:** users, admins, organizations, teams, shared workspaces, Microsoft Entra ID / Azure AD SSO, OAuth/OIDC, SAML, SCIM, and protected product APIs are part of the platform.
- **Private document intelligence:** upload documents, extract text, chunk content, embed vectors, retrieve citations, and scope RAG by user, organization, or shared workspace.
- **Model choice without chaos:** admins decide which providers and models are available, while users get a clean chat UI with provider settings, model selection, voice, web search, and guardrails.
- **Internal AI API gateway:** expose approved models through Batuk API keys and OpenAI-compatible endpoints for internal tools, agents, and product integrations.
- **Compliance-aware operations:** audit logs, GDPR workflows, control registers, usage reporting, and CSV evidence exports help teams understand and govern AI activity.
- **Self-hosted flexibility:** start with local JSON/SQLite, then move to PostgreSQL, MySQL, ChromaDB, Pinecone, Qdrant Cloud, Supabase, Docker, and optional Advanced RAG services as needs grow.
- **Whitelabel workspace:** organizations can set product name, tagline, accent color, initials, and logo while preserving creator attribution.

## Platform Capabilities

### Sovereign Multi-Model Chat

Batuk supports a private AI chat workspace where admins can enable local inference, cloud LLMs, routed providers, and custom model gateways from one provider registry.

- Streaming chat with Markdown rendering.
- Provider model picker plus manual model entry.
- Runtime settings for local evaluation and environment-based server configuration.
- Temporary chat mode for conversations that should not persist.
- Personal and shared workspaces with folders, search, import, export, and copy actions.
- OpenAI hosted web search when enabled and supported by the selected model.
- OpenAI Realtime and Grok Voice sessions with browser microphone input.
- Guardrails for safer prompt screening and system behavior.
- Workspace tools for provider settings, API access, workspace management, chat history, token usage, enterprise management, and audit review.

### Document Chat and Enterprise RAG

Batuk turns internal documents into scoped AI context. Personal files stay personal. Shared workspace RAG is only visible to assigned members and admins.

- Upload PDF, TXT, Markdown, JSON, LOG, CSV, XLS, XLSX, and DOCX files.
- Extract text, chunk content, generate embeddings, and retrieve relevant context during chat.
- Use local deterministic embeddings for private offline indexing or hosted embeddings for higher-quality semantic retrieval.
- Store vectors in local JSON, ChromaDB, Pinecone, Qdrant Cloud, or Supabase Postgres/pgvector.
- Preserve organization, user, and workspace metadata on chunks and vectors.
- Reindex, download, and delete documents from the Documents workspace.
- Remove metadata, source files, chunks, and remote vectors during deletion when the selected vector store supports it.

### Advanced RAG and Graph Intelligence

Batuk can run without Python. For deeper document intelligence, the optional FastAPI backend adds advanced extraction, Graph RAG, and local ML guardrail capabilities.

- Complex PDF extraction for tables, scanned pages, multi-column layouts, page metadata, figures, reports, and scientific documents.
- Structure-preserving output for documents, pages, sections, paragraphs, tables, figures, chunks, and citations.
- Graph RAG ingestion with entity extraction, relationship extraction, community detection, graph visualization data, and optional Neo4j persistence.
- LLM-based graph extraction through a configurable OpenAI-compatible endpoint.
- Local document scanning for PII, secrets, language, and sensitivity.
- Page-aware chunks and richer source context for document chat.

### Enterprise Identity and Access Control

Batuk includes enterprise identity foundations through Better Auth integrations and protected API routes.

- Email/password authentication.
- Admin management for users, roles, bans, password resets, and admin APIs.
- Organizations, teams, members, invitations, and organization roles.
- OAuth 2.1/OIDC provider mode with consent page.
- One-click Microsoft Entra ID / Azure AD SSO from environment variables for companies, universities, and Microsoft 365-heavy organizations.
- SSO support for enterprise OIDC/SAML sign-in.
- SCIM provisioning for identity-provider workflows.
- Protected APIs for chat, documents, skills, agents, usage, memory, models, attachments, realtime sessions, workflows, and enterprise operations.

### Microsoft Entra ID / Azure AD SSO

Batuk supports Microsoft SSO for organizations that standardize on Microsoft 365, Entra ID, Azure AD, Teams, Outlook, SharePoint, and university Microsoft tenants. Admins can enable a one-click `Continue with Microsoft` login button from `.env` or `.env.enterprise` without writing custom auth code.

Create a Microsoft Entra ID App Registration and add this redirect URI for local development:

```text
http://localhost:3000/api/auth/sso/callback
```

For production, replace the host with your deployed `BETTER_AUTH_URL`:

```text
https://your-batuk-domain.com/api/auth/sso/callback
```

Then set:

```env
BATUK_MICROSOFT_SSO_ENABLED=true
NEXT_PUBLIC_BATUK_MICROSOFT_SSO_ENABLED=true
BATUK_MICROSOFT_PROVIDER_ID=microsoft-entra
NEXT_PUBLIC_BATUK_MICROSOFT_PROVIDER_ID=microsoft-entra
NEXT_PUBLIC_BATUK_MICROSOFT_SSO_LABEL=Continue with Microsoft
BATUK_MICROSOFT_TENANT_ID=replace_with_directory_tenant_id
BATUK_MICROSOFT_CLIENT_ID=replace_with_application_client_id
BATUK_MICROSOFT_CLIENT_SECRET=replace_with_client_secret_value
BATUK_MICROSOFT_DOMAIN=example.edu,example.com
BATUK_MICROSOFT_SCOPES=openid,profile,email,offline_access
```

Use the real Microsoft directory tenant ID for strict OIDC issuer validation. `BATUK_MICROSOFT_DOMAIN` accepts one or more comma-separated email domains, which is useful for universities and multi-domain European organizations.

### Administration and Governance

Admins can manage AI access and workspace behavior without editing code.

- First-owner bootstrap when no owner or admin exists.
- User CRUD, password resets, bans, unbans, and deletion.
- Organization creation and active organization switching.
- Team creation, invitations, and role management.
- Shared workspace creation, membership, RAG enablement, renaming, and deletion.
- Token usage dashboard by source, provider, model, user, chat, API key, day, month, and year.
- Audit trail for access denials, admin actions, document operations, chat library mutations, privacy requests, and control changes.
- Hash-chain integrity evidence for audit events.
- GDPR export, request, and erasure workflows.
- ISO 27001 and SOC 2 control evidence register.

### Internal AI API Gateway

Batuk lets users generate personal API keys and call admin-approved models through OpenAI-compatible endpoints. This makes Batuk useful not only as an AI chat workspace, but also as an internal model access layer for business applications, automation, and agent workflows.

```bash
curl -H "Authorization: Bearer batuk_..." http://localhost:3000/api/v1/models

curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer batuk_..." \
  -H "Content-Type: application/json" \
  -d '{"model":"company/support-large","messages":[{"role":"user","content":"Hello"}]}'
```

API keys are user-scoped and stored as hashes. Admins can expose routes such as `company/support-large` or `batuk/qwen3.7-max` that map to a provider, model, and base URL configured inside Batuk. Usage is recorded separately for chat, API completions, and search.

## Supported AI Providers

Batuk supports local, hosted, and OpenAI-compatible model access. Admins choose which providers are available, and users only see the model options they are allowed to use.

| Provider | Default Base URL | Default Model | Notes |
| --- | --- | --- | --- |
| Ollama | `http://localhost:11434` | `llama3.1` | Local/private model inference. |
| OpenAI | `https://api.openai.com/v1` | `gpt-5.1-mini` | Chat, web search, embeddings, and realtime voice. |
| AWS Bedrock | `us-east-1` | `amazon.nova-lite-v1:0` | Bedrock Converse API with AWS credentials. |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` | Routed access through an OpenAI-compatible API. |
| Claude | `https://api.anthropic.com/v1` | `claude-sonnet-5` | Anthropic Messages API with streaming and usage reporting. |
| Grok | `https://api.x.ai/v1` | `grok-4.5` | xAI text and Grok Voice realtime sessions. |
| Sarvam AI | `https://api.sarvam.ai/v1` | `sarvam-105b` | Indian-language optimized chat models. |
| Together AI | `https://api.together.ai/v1` | `MiniMaxAI/MiniMax-M3` | OpenAI-compatible hosted models. |
| Mistral AI | `https://api.mistral.ai/v1` | `mistral-large-latest` | Mistral chat completions. |
| Kimi | `https://api.moonshot.ai/v1` | `kimi-k3` | Moonshot AI-compatible Kimi models. |
| DeepSeek | `https://api.deepseek.com` | `deepseek-v4-pro` | DeepSeek chat completions with thinking fields. |
| Qwen | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | `qwen3.7-max` | DashScope OpenAI-compatible Qwen models. |
| EdenAI | `https://api.edenai.run/v3` | `openai/gpt-4` | Unified chat completions across EdenAI-supported providers. |
| DeepInfra | `https://api.deepinfra.com/v1/openai` | `deepseek-ai/DeepSeek-V3` | OpenAI-compatible hosted open-source models. |
| Perplexity | `https://api.perplexity.ai` | `sonar-pro` | Sonar chat completions and search gateway support. |
| Custom | `http://localhost:1234/v1` | `local-model` | Any private OpenAI-compatible `/chat/completions` server. |

### Provider Environment Variables

| Provider ID | Required Environment Variable | Example Route |
| --- | --- | --- |
| `ollama` | none | `provider=ollama`, `baseUrl=http://localhost:11434`, `model=qwen3:8b` |
| `openai` | `OPENAI_API_KEY` | `provider=openai`, `baseUrl=https://api.openai.com/v1`, `model=gpt-5.1-mini` |
| `bedrock` | AWS credentials plus `AWS_BEDROCK_REGION` or `AWS_REGION` | `provider=bedrock`, `baseUrl=us-east-1`, `model=amazon.nova-lite-v1:0` |
| `openrouter` | `OPENROUTER_API_KEY` | `provider=openrouter`, `baseUrl=https://openrouter.ai/api/v1`, `model=openai/gpt-4o-mini` |
| `together` | `TOGETHER_API_KEY` | `provider=together`, `baseUrl=https://api.together.ai/v1`, `model=MiniMaxAI/MiniMax-M3` |
| `mistral` | `MISTRAL_API_KEY` | `provider=mistral`, `baseUrl=https://api.mistral.ai/v1`, `model=mistral-large-latest` |
| `kimi` | `MOONSHOT_API_KEY` or `KIMI_API_KEY` | `provider=kimi`, `baseUrl=https://api.moonshot.ai/v1`, `model=kimi-k3` |
| `deepseek` | `DEEPSEEK_API_KEY` | `provider=deepseek`, `baseUrl=https://api.deepseek.com`, `model=deepseek-v4-pro` |
| `qwen` | `DASHSCOPE_API_KEY` or `QWEN_API_KEY` | `provider=qwen`, `baseUrl=https://dashscope-intl.aliyuncs.com/compatible-mode/v1`, `model=qwen3.7-max` |
| `edenai` | `EDENAI_API_KEY` or `EDEN_AI_API_KEY` | `provider=edenai`, `baseUrl=https://api.edenai.run/v3`, `model=openai/gpt-4` |
| `deepinfra` | `DEEPINFRA_API_KEY` or `DEEPINFRA_TOKEN` | `provider=deepinfra`, `baseUrl=https://api.deepinfra.com/v1/openai`, `model=deepseek-ai/DeepSeek-V3` |
| `perplexity` | `PERPLEXITY_API_KEY` | `provider=perplexity`, `baseUrl=https://api.perplexity.ai`, `model=sonar-pro` |
| `anthropic` | `ANTHROPIC_API_KEY` | `provider=anthropic`, `baseUrl=https://api.anthropic.com/v1`, `model=claude-sonnet-5` |
| `xai` | `XAI_API_KEY` | `provider=xai`, `baseUrl=https://api.x.ai/v1`, `model=grok-4.5` |
| `sarvam` | `SARVAM_API_KEY` or `SARVAMAI_API_KEY` | `provider=sarvam`, `baseUrl=https://api.sarvam.ai/v1`, `model=sarvam-105b` |
| `custom` | optional | Any private OpenAI-compatible endpoint. |

## Storage, RAG, and Deployment Options

Batuk is intentionally modular. Teams can begin with local storage and move to enterprise-grade infrastructure as adoption grows.

| Layer | Default | Enterprise Options |
| --- | --- | --- |
| Authentication | SQLite | SQLite, MySQL, PostgreSQL, MS SQL, MongoDB |
| Product data | Local JSON | SQLite, MySQL, PostgreSQL |
| Documents | Local file storage | Configurable local or container path |
| Branding logos | `public/branding` | Configurable local or container path |
| Vectors | Local JSON | ChromaDB, Pinecone, Qdrant Cloud, Supabase pgvector |
| Advanced document intelligence | Built-in text extraction | Optional FastAPI backend, Graph RAG, Neo4j |

Product data includes chats, folders, workspaces, document metadata, chunks, memories, API keys, model routes, skills, MCP integration records, agents, workflows, token usage, branding, compliance records, GDPR requests, and audit trails.

Personal product data is scoped to the signed-in user. Shared workspace data is scoped to the workspace and only loads after membership or admin checks pass.

## MCP Integrations

Batuk includes an MCP dashboard for connecting tools, resources, and prompts to the workspace. Teams can register streamable HTTP, SSE, and stdio MCP servers, discover capabilities, inspect resources, and select an active MCP integration for chat context.

Preset connector categories include productivity, CRM, payments, analytics, project management, databases, search, browser automation, developer tools, and custom internal MCP servers. Batuk redacts saved client secrets and tokens before returning MCP integration configuration to the browser.

MCP support is designed to make Batuk more than a chat surface: it can become a governed AI workspace where models, documents, tools, and enterprise systems meet under admin-controlled access.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, create an account, choose a provider and model in Settings, and start chatting.

For local Ollama usage:

```bash
ollama pull llama3.1
ollama serve
```

Then select the Ollama provider in Batuk.

## Self-Hosted Deployment

Batuk includes Docker and database assets for self-hosted enterprise environments.

```text
Dockerfile
docker-compose.yml
.env.enterprise.example
database/sqlite/001_enterprise_data.sql
database/postgresql/001_enterprise_data.sql
database/mysql/001_enterprise_data.sql
```

Create a runtime environment file and start the stack:

```bash
cp .env.enterprise.example .env.enterprise
docker compose up --build
```

Enable optional service profiles when needed:

```bash
docker compose --profile postgres up --build
docker compose --profile mysql up --build
docker compose --profile postgres --profile chroma up --build
docker compose --profile ollama up --build
docker compose --profile advanced-rag up --build
docker compose --profile advanced-rag --profile neo4j up --build
```

Hosted deployment buttons are available for Vercel, Render, and Railway. Docker Compose is the preferred path for teams that need private SQL services, local vector search, controlled file storage, local models, advanced RAG, or internal network deployment.

## Configuration

Use these files as the operational source of truth:

- `.env.enterprise.example` for identity, model providers, SQL stores, vector stores, file paths, and runtime behavior.
- `docker-compose.yml` for PostgreSQL, MySQL, ChromaDB, Ollama, Advanced RAG FastAPI, and Neo4j profiles.
- `optional-backend-for-advanced-rag/README.md` for the optional Python backend.
- `database/*/001_enterprise_data.sql` for product data schemas.

Useful commands:

```bash
npm run auth:migrate
npm run data:migrate
npm run env:validate
```

## Scripts

```bash
npm run dev           # Start local development
npm run build         # Build the app
npm run start         # Start the server
npm run lint          # Run ESLint
npm run env:validate  # Validate enterprise environment
npm run auth:migrate  # Create/update Better Auth schema
npm run data:migrate  # Create/update Batuk product data schema
```

## Test Commands

```bash
npm run test:unit         # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e          # Next.js HTTP smoke test
npm run test:load         # Concurrent HTTP load checks
npm run test:security     # Security headers and protected API checks
npm run test:regression   # Lint, unit, integration, and build gate
npm run test:all          # Full validation suite
```

## Project Structure

```text
app/                  Next.js app routes and API endpoints
components/           Chat, docs, enterprise, audit, settings, skills, MCP, agents
hooks/                Chat controller and UI state orchestration
lib/                  Providers, auth, RAG, MCP, storage, compliance, branding
database/             SQLite, PostgreSQL, and MySQL product data schemas
scripts/              Migration and Docker startup helpers
tests/                Unit, integration, E2E, load, security, and regression gates
data/                 Local runtime data in development
public/branding/      Uploaded organization logos
```

## Creator

Built by **[Suhas Bhairav](https://suhasbhairav.com)**.

## License

MIT License.

Copyright (c) 2026 [Suhas Bhairav](https://suhasbhairav.com).

See [LICENSE](./LICENSE).
