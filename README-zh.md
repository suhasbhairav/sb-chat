<h1 align="center">Batuk</h1>

<p align="center">
  <strong>面向团队的主权 AI 聊天工作区和自托管 AI 平台，支持私有模型访问、文档智能、企业身份、审计证据和内部 AI API 网关。</strong>
</p>

<p align="center">
  Created by <a href="https://suhasbhairav.com"><strong>Suhas Bhairav</strong></a>
</p>

<p align="center">
  <a href="./README.md"><strong>English</strong></a> ·
  <a href="./README-zh.md"><strong>中文</strong></a> ·
  <a href="./README-de.md"><strong>Deutsch</strong></a> ·
  <a href="./README-jp.md"><strong>日本語</strong></a>
</p>

<p align="center">
  <img src="public/homepage.png" alt="Batuk 主权 AI 聊天工作区和自托管 AI 平台" width="100%" />
</p>

<p align="center">
  <a href="https://app.arcade.software/share/videos/UZnHQSj8q0OA8UurPFvW">
    <strong>观看 Batuk 演示视频</strong>
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

Batuk 是一个开源、企业级 AI 工作区，适合希望掌控 AI 运行位置、用户可访问模型、文档检索方式和用量治理方式的组织。它把精致的多模型聊天体验、私有 RAG、团队工作区、Microsoft Entra ID / Azure AD SSO 就绪的企业身份、审计流程、Token 用量报告和 OpenAI 兼容内部 API 组合在一个产品中。

Batuk 可以作为个人团队的本地优先主权 AI 聊天工作区，也可以作为大型组织的自托管 AI 平台。你可以在笔记本电脑上用本地存储运行，也可以用 Docker 部署，连接 SQL 数据库和向量数据库，或放入受控企业环境，让模型凭据、文档、记忆和审计证据都保持在你的运营边界内。

## 为什么选择 Batuk

Batuk 面向需要超过“聊天机器人”的团队。它给管理员一个统一控制平面，用于管理 AI 访问、文档、工作区、模型路由、API Key、合规证据和组织品牌。

Batuk 是私有企业 AI 工作区的优秀选择，因为它把“主权”当作产品要求，而不是营销口号。本地模型、托管前沿模型、私有模型网关、文档 RAG、身份、授权、审计轨迹、用量可见性和工作区边界，都被设计为在同一个界面中协同工作。

- **主权优先设计：**运行本地模型、托管模型提供商或私有 OpenAI 兼容端点，同时由管理员掌控用户数据、文档、记忆和 API 访问。
- **企业级工作区：**用户、管理员、组织、团队、共享工作区、Microsoft Entra ID / Azure AD SSO、OAuth/OIDC、SAML、SCIM 和受保护产品 API 都是平台能力的一部分。
- **私有文档智能：**上传文档、抽取文本、切分内容、生成向量、检索引用，并按用户、组织或共享工作区限定 RAG 范围。
- **模型选择但不混乱：**管理员决定可用提供商和模型，用户获得干净的聊天 UI，包含提供商设置、模型选择、语音、网页搜索和护栏。
- **内部 AI API 网关：**通过 Batuk API Key 和 OpenAI 兼容端点暴露管理员批准的模型，供内部工具、Agent 和产品集成使用。
- **面向合规的运营：**审计日志、GDPR 流程、控制项登记、用量报告和 CSV 证据导出，帮助团队理解并治理 AI 活动。
- **灵活自托管：**从本地 JSON/SQLite 起步，随后迁移到 PostgreSQL、MySQL、ChromaDB、Pinecone、Qdrant Cloud、Supabase、Docker 和可选 Advanced RAG 服务。
- **白标工作区：**组织可设置产品名称、标语、强调色、首字母和 Logo，同时保留创建者署名。

## 平台能力

### 主权多模型聊天

Batuk 提供私有 AI 聊天工作区，管理员可从一个提供商注册表启用本地推理、云端 LLM、路由提供商和自定义模型网关。

- 流式聊天和 Markdown 渲染。
- 提供商模型选择器和手动模型输入。
- 面向本地评估的运行时设置，以及基于环境变量的服务端配置。
- 临时聊天模式，用于不应持久化的对话。
- 个人和共享工作区，支持文件夹、搜索、导入、导出和复制操作。
- 在所选模型支持且启用时使用 OpenAI 托管网页搜索。
- OpenAI Realtime 和 Grok Voice 浏览器麦克风语音会话。
- 用于更安全提示筛查和系统行为的护栏。
- 工作区工具覆盖提供商设置、API 访问、工作区管理、聊天历史、Token 用量、企业管理和审计复查。

### 文档聊天和企业 RAG

Batuk 将内部文档转化为有范围边界的 AI 上下文。个人文件保持个人可见，共享工作区 RAG 仅对分配成员和管理员可见。

- 上传 PDF、TXT、Markdown、JSON、LOG、CSV、XLS、XLSX 和 DOCX 文件。
- 抽取文本、切分内容、生成 Embedding，并在聊天中检索相关上下文。
- 支持本地确定性 Embedding、直接 Ollama `/api/embed` Embedding、LlamaIndex Ollama Embedding 或托管 OpenAI Embedding。
- Ollama RAG 支持任何已 pull 的 Embedding 模型，包括 `embeddinggemma`、`qwen3-embedding`、`all-minilm`、`nomic-embed-text`、`mxbai-embed-large` 和自定义 Ollama Embedding 模型。
- Batuk 从每次 Embedding 响应中检测向量维度，不强制固定尺寸；Ollama 模型维度随模型变化，OpenAI `text-embedding-3-small` 默认 1536，`text-embedding-3-large` 可为 3072，本地确定性 Embedding 使用 384。
- 向量可存储在本地 JSON、ChromaDB、Pinecone、Qdrant Cloud 或 Supabase Postgres/pgvector。
- 在 chunk 和向量上保留组织、用户和工作区元数据。
- 在 Documents 工作区中重新索引、下载和删除文档。
- 删除文档时，在所选向量存储支持的情况下，同时移除元数据、源文件、chunk 和远程向量。

### Advanced RAG 和图谱智能

Batuk 不依赖 Python 也能运行。对于更深的文档智能，可选 FastAPI 后端会增加高级抽取、Graph RAG 和本地 ML 护栏能力。

- 复杂 PDF 抽取，支持表格、扫描页、多栏布局、页级元数据、图表、报告和科学文档。
- 结构保留输出，覆盖文档、页面、章节、段落、表格、图、chunk 和引用。
- Graph RAG 摄取，支持实体抽取、关系抽取、社区检测、图可视化数据和可选 Neo4j 持久化。
- 通过可配置 OpenAI 兼容端点进行基于 LLM 的图谱抽取。
- 本本文档扫描，检测 PII、密钥、语言和敏感级别。
- 页感知 chunk 和更丰富的文档聊天来源上下文。

### 企业身份和访问控制

Batuk 通过 Better Auth 集成和受保护 API 路由提供企业身份基础。

- 邮箱/密码认证。
- 管理员可管理用户、角色、封禁、密码重置和管理 API。
- 组织、团队、成员、邀请和组织角色。
- OAuth 2.1/OIDC Provider 模式和 consent 页面。
- 通过环境变量启用一键 Microsoft Entra ID / Azure AD SSO，适合企业、大学和重度使用 Microsoft 365 的组织。
- 支持企业 OIDC/SAML SSO 登录。
- 支持面向身份提供商工作流的 SCIM 配置。
- 保护聊天、文档、Skills、Agents、用量、记忆、模型、附件、实时会话、工作流和企业运营 API。

### Microsoft Entra ID / Azure AD SSO

Batuk 支持 Microsoft SSO，适用于标准化使用 Microsoft 365、Entra ID、Azure AD、Teams、Outlook、SharePoint 和大学 Microsoft 租户的组织。管理员可以仅通过 `.env` 或 `.env.enterprise` 启用一键 `Continue with Microsoft` 登录按钮，无需编写自定义认证代码。

创建 Microsoft Entra ID App Registration，并为本地开发添加此 redirect URI：

```text
http://localhost:3000/api/auth/sso/callback
```

生产环境中，将 host 替换为部署后的 `BETTER_AUTH_URL`：

```text
https://your-batuk-domain.com/api/auth/sso/callback
```

然后设置：

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

建议使用真实 Microsoft Directory Tenant ID，以保持严格的 OIDC issuer 校验。`BATUK_MICROSOFT_DOMAIN` 支持一个或多个逗号分隔的邮箱域名，非常适合大学和多域名欧洲组织。

### 管理和治理

管理员无需改代码即可管理 AI 访问和工作区行为。

- 当不存在 owner 或 admin 时，支持首个 owner 引导。
- 用户 CRUD、密码重置、封禁、解封和删除。
- 创建组织并切换 active organization。
- 团队创建、邀请和角色管理。
- 共享工作区创建、成员资格、RAG 启用、重命名和删除。
- 按来源、提供商、模型、用户、聊天、API Key、日、月、年查看 Token 用量。
- 针对访问拒绝、管理员操作、文档操作、聊天库变更、隐私请求和控制项变更的审计轨迹。
- 用于审计事件的哈希链完整性证据。
- GDPR 导出、请求和擦除工作流。
- ISO 27001 和 SOC 2 控制证据登记。

### 内部 AI API 网关

Batuk 允许用户生成个人 API Key，并通过 OpenAI 兼容端点调用管理员批准的模型。这让 Batuk 不只是 AI 聊天工作区，也可以作为业务应用、自动化和 Agent 工作流的内部模型访问层。

```bash
curl -H "Authorization: Bearer batuk_..." http://localhost:3000/api/v1/models

curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer batuk_..." \
  -H "Content-Type: application/json" \
  -d '{"model":"company/support-large","messages":[{"role":"user","content":"Hello"}]}'
```

API Key 按用户限定，并以哈希形式存储。管理员可暴露 `company/support-large` 或 `batuk/qwen3.7-max` 等路由，映射到 Batuk 内配置的提供商、模型和 base URL。聊天、API completions 和 search 的用量会分别记录。

## 支持的 AI 提供商

Batuk 支持本地、托管和 OpenAI 兼容模型访问。管理员选择可用提供商，用户只会看到被允许使用的模型选项。

| 提供商 | 默认 Base URL | 默认模型 | 说明 |
| --- | --- | --- | --- |
| Ollama | `http://localhost:11434` | `llama3.1` | 本地/私有模型推理。 |
| OpenAI | `https://api.openai.com/v1` | `gpt-5.1-mini` | 聊天、网页搜索、Embedding 和实时语音。 |
| AWS Bedrock | `us-east-1` | `amazon.nova-lite-v1:0` | 使用 AWS 凭据的 Bedrock Converse API。 |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` | 通过 OpenAI 兼容 API 访问路由模型。 |
| Claude | `https://api.anthropic.com/v1` | `claude-sonnet-5` | Anthropic Messages API，支持流式输出和用量报告。 |
| Grok | `https://api.x.ai/v1` | `grok-4.5` | xAI 文本和 Grok Voice 实时会话。 |
| Sarvam AI | `https://api.sarvam.ai/v1` | `sarvam-105b` | 面向印度语言优化的聊天模型。 |
| Together AI | `https://api.together.ai/v1` | `MiniMaxAI/MiniMax-M3` | OpenAI 兼容托管模型。 |
| Mistral AI | `https://api.mistral.ai/v1` | `mistral-large-latest` | Mistral chat completions。 |
| Kimi | `https://api.moonshot.ai/v1` | `kimi-k3` | Moonshot AI 兼容 Kimi 模型。 |
| DeepSeek | `https://api.deepseek.com` | `deepseek-v4-pro` | DeepSeek chat completions，支持 thinking 字段。 |
| Qwen | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | `qwen3.7-max` | DashScope OpenAI 兼容 Qwen 模型。 |
| EdenAI | `https://api.edenai.run/v3` | `openai/gpt-4` | EdenAI 支持提供商的统一 chat completions。 |
| DeepInfra | `https://api.deepinfra.com/v1/openai` | `deepseek-ai/DeepSeek-V3` | OpenAI 兼容托管开源模型。 |
| Perplexity | `https://api.perplexity.ai` | `sonar-pro` | Sonar chat completions 和 search gateway。 |
| Custom | `http://localhost:1234/v1` | `local-model` | 任意私有 OpenAI 兼容 `/chat/completions` 服务。 |

### 提供商环境变量

| Provider ID | 必需环境变量 | 示例路由 |
| --- | --- | --- |
| `ollama` | 无 | `provider=ollama`, `baseUrl=http://localhost:11434`, `model=qwen3:8b` |
| `openai` | `OPENAI_API_KEY` | `provider=openai`, `baseUrl=https://api.openai.com/v1`, `model=gpt-5.1-mini` |
| `bedrock` | AWS 凭据和 `AWS_BEDROCK_REGION` 或 `AWS_REGION` | `provider=bedrock`, `baseUrl=us-east-1`, `model=amazon.nova-lite-v1:0` |
| `openrouter` | `OPENROUTER_API_KEY` | `provider=openrouter`, `baseUrl=https://openrouter.ai/api/v1`, `model=openai/gpt-4o-mini` |
| `together` | `TOGETHER_API_KEY` | `provider=together`, `baseUrl=https://api.together.ai/v1`, `model=MiniMaxAI/MiniMax-M3` |
| `mistral` | `MISTRAL_API_KEY` | `provider=mistral`, `baseUrl=https://api.mistral.ai/v1`, `model=mistral-large-latest` |
| `kimi` | `MOONSHOT_API_KEY` 或 `KIMI_API_KEY` | `provider=kimi`, `baseUrl=https://api.moonshot.ai/v1`, `model=kimi-k3` |
| `deepseek` | `DEEPSEEK_API_KEY` | `provider=deepseek`, `baseUrl=https://api.deepseek.com`, `model=deepseek-v4-pro` |
| `qwen` | `DASHSCOPE_API_KEY` 或 `QWEN_API_KEY` | `provider=qwen`, `baseUrl=https://dashscope-intl.aliyuncs.com/compatible-mode/v1`, `model=qwen3.7-max` |
| `edenai` | `EDENAI_API_KEY` 或 `EDEN_AI_API_KEY` | `provider=edenai`, `baseUrl=https://api.edenai.run/v3`, `model=openai/gpt-4` |
| `deepinfra` | `DEEPINFRA_API_KEY` 或 `DEEPINFRA_TOKEN` | `provider=deepinfra`, `baseUrl=https://api.deepinfra.com/v1/openai`, `model=deepseek-ai/DeepSeek-V3` |
| `perplexity` | `PERPLEXITY_API_KEY` | `provider=perplexity`, `baseUrl=https://api.perplexity.ai`, `model=sonar-pro` |
| `anthropic` | `ANTHROPIC_API_KEY` | `provider=anthropic`, `baseUrl=https://api.anthropic.com/v1`, `model=claude-sonnet-5` |
| `xai` | `XAI_API_KEY` | `provider=xai`, `baseUrl=https://api.x.ai/v1`, `model=grok-4.5` |
| `sarvam` | `SARVAM_API_KEY` 或 `SARVAMAI_API_KEY` | `provider=sarvam`, `baseUrl=https://api.sarvam.ai/v1`, `model=sarvam-105b` |
| `custom` | 可选 | 任意私有 OpenAI 兼容端点。 |

## 存储、RAG 和部署选项

Batuk 被刻意设计为模块化。团队可以从本地存储开始，随着采用规模扩大再迁移到企业级基础设施。

| 层 | 默认 | 企业选项 |
| --- | --- | --- |
| 认证 | SQLite | SQLite、MySQL、PostgreSQL、MS SQL、MongoDB |
| 产品数据 | 本地 JSON | SQLite、MySQL、PostgreSQL |
| 文档 | 本地文件存储 | 可配置本地或容器路径 |
| 品牌 Logo | `public/branding` | 可配置本地或容器路径 |
| 向量 | 本地 JSON | ChromaDB、Pinecone、Qdrant Cloud、Supabase pgvector |
| 高级文档智能 | 内置文本抽取 | 可选 FastAPI 后端、Graph RAG、Neo4j |

产品数据包括聊天、文件夹、工作区、文档元数据、chunk、记忆、API Key、模型路由、Skills、MCP 集成记录、Agents、工作流、Token 用量、品牌、合规记录、GDPR 请求和审计轨迹。

个人产品数据按登录用户限定。共享工作区数据按工作区限定，并且只有通过成员资格或管理员检查后才会加载。

## MCP 集成

Batuk 包含 MCP dashboard，用于将工具、资源和 prompts 连接到工作区。团队可注册 streamable HTTP、SSE 和 stdio MCP servers，发现能力，检查资源，并选择 active MCP integration 作为聊天上下文。

预设连接器类别包括 productivity、CRM、payments、analytics、project management、databases、search、browser automation、developer tools 和自定义内部 MCP servers。Batuk 在向浏览器返回 MCP 集成配置前，会隐藏已保存的 client secrets 和 tokens。

MCP 支持让 Batuk 不只是聊天界面：它可以成为一个受管理员控制的 AI 工作区，让模型、文档、工具和企业系统在统一权限边界下协作。

## 快速开始

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`，创建账号，在 Settings 中选择提供商和模型，然后开始聊天。

本地 Ollama 使用方式：

```bash
ollama pull llama3.1
ollama serve
```

然后在 Batuk 中选择 Ollama provider。

Ollama RAG Embedding 使用方式：

```bash
ollama pull embeddinggemma
```

然后在 Documents 面板中选择 `Ollama embeddings`，并将 Embedding model 设置为 `embeddinggemma`、`qwen3-embedding`、`all-minilm`、`nomic-embed-text`、`mxbai-embed-large` 或任意已 pull 的 Ollama Embedding 模型。

## 自托管部署

Batuk 包含面向自托管企业环境的 Docker 和数据库资产。

```text
Dockerfile
docker-compose.yml
.env.enterprise.example
database/sqlite/001_enterprise_data.sql
database/postgresql/001_enterprise_data.sql
database/mysql/001_enterprise_data.sql
```

创建运行时环境文件并启动：

```bash
cp .env.enterprise.example .env.enterprise
docker compose up --build
```

按需启用可选服务 profile：

```bash
docker compose --profile postgres up --build
docker compose --profile mysql up --build
docker compose --profile postgres --profile chroma up --build
docker compose --profile ollama up --build
docker compose --profile advanced-rag up --build
docker compose --profile advanced-rag --profile neo4j up --build
```

Vercel、Render 和 Railway 部署按钮已提供。对于需要私有 SQL 服务、本地向量搜索、受控文件存储、本地模型、Advanced RAG 或内网部署的团队，Docker Compose 是推荐路径。

## 配置

以下文件是运行配置的主要来源：

- `.env.enterprise.example`：身份、模型提供商、SQL 存储、向量存储、文件路径和运行时行为。
- `docker-compose.yml`：PostgreSQL、MySQL、ChromaDB、Ollama、Advanced RAG FastAPI 和 Neo4j profiles。
- `optional-backend-for-advanced-rag/README.md`：可选 Python 后端说明。
- `database/*/001_enterprise_data.sql`：产品数据 schema。

常用命令：

```bash
npm run auth:migrate
npm run data:migrate
npm run env:validate
```

## 脚本

```bash
npm run dev           # 启动本地开发
npm run build         # 构建应用
npm run start         # 启动生产服务
npm run lint          # 运行 ESLint
npm run env:validate  # 校验企业环境配置
npm run auth:migrate  # 创建/更新 Better Auth schema
npm run data:migrate  # 创建/更新 Batuk 产品数据 schema
```

## 测试命令

```bash
npm run test:unit         # 单元测试
npm run test:integration  # 集成测试
npm run test:e2e          # Next.js HTTP smoke test
npm run test:load         # 并发 HTTP load 检查
npm run test:security     # 安全 headers 和受保护 API 检查
npm run test:regression   # Lint、unit、integration 和 build gate
npm run test:all          # 完整验证套件
```

## 项目结构

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

## 创建者

Built by **[Suhas Bhairav](https://suhasbhairav.com)**.

## 许可证

MIT License.

Copyright (c) 2026 [Suhas Bhairav](https://suhasbhairav.com).

See [LICENSE](./LICENSE).
