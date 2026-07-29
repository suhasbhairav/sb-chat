import {
  BookOpen,
  Boxes,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  FolderKanban,
  Globe2,
  KeyRound,
  Languages,
  LockKeyhole,
  Mic2,
  Moon,
  PlugZap,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  UsersRound,
  Waypoints,
  X,
  Zap,
} from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export function DocumentationPanel({ onClose }) {
  const { t } = useI18n();
  const capabilityCards = [
    {
      icon: LockKeyhole,
      title: "Sovereign authentication",
      copy: "Better Auth powers local email/password accounts, SQLite-backed sessions, sign out, and protected product APIs.",
    },
    { icon: BrainCircuit, title: t("docs.cardModelsTitle"), copy: t("docs.cardModelsCopy") },
    { icon: Radio, title: t("docs.cardStreamingTitle"), copy: t("docs.cardStreamingCopy") },
    { icon: Globe2, title: t("docs.cardWebTitle"), copy: t("docs.cardWebCopy") },
    {
      icon: Boxes,
      title: "Workspace tools menu",
      copy: "Provider settings, chat history and data, token usage, enterprise management, and audit/compliance each live on their own menu page with Back to menu navigation.",
    },
    {
      icon: FileText,
      title: "Document Chat and RAG",
      copy: "Upload private personal documents or shared workspace documents, index with local or OpenAI embeddings, store vectors in JSON, ChromaDB, or Pinecone, and cite document sources.",
    },
    {
      icon: UsersRound,
      title: "Private and shared workspaces",
      copy: "Personal chats, documents, and memories stay user-scoped. Admin-created shared workspaces expose chats and RAG only to admins and users added by email.",
    },
    {
      icon: Waypoints,
      title: "Agent Builder",
      copy: "Design reusable multi-agent workflows, attach documents to Agent 1, run agents in sequence, and send the final output back to chat.",
    },
    {
      icon: Sparkles,
      title: "Skills",
      copy: "Create reusable instructions with examples and resources, toggle them on or off, and inject enabled skills into chat when relevant.",
    },
    {
      icon: Building2,
      title: "Enterprise administration",
      copy: "Manage global users, roles, organizations, teams, member invitations, and first-owner bootstrap through Better Auth plugins.",
    },
    {
      icon: KeyRound,
      title: "Enterprise identity protocols",
      copy: "Expose Dashboard analytics, OAuth 2.1/OIDC clients, SSO providers, and SCIM provisioning with Better Auth enterprise plugins.",
    },
    {
      icon: ShieldCheck,
      title: "Compliance evidence",
      copy: "Track GDPR requests, ISO 27001/SOC 2 controls, audit events, integrity hashes, data inventory, and CSV evidence exports.",
    },
    { icon: Mic2, title: t("docs.cardVoiceTitle"), copy: t("docs.cardVoiceCopy") },
    { icon: ShieldCheck, title: t("docs.cardGuardrailsTitle"), copy: t("docs.cardGuardrailsCopy") },
    { icon: FolderKanban, title: t("docs.cardFoldersTitle"), copy: t("docs.cardFoldersCopy") },
    {
      icon: Languages,
      title: "Curated localization",
      copy: "Complete UI catalogs are exposed only for vetted languages: English, German, Spanish, Chinese, Hindi, and Kannada.",
    },
  ];
  const stackItems = [
    t("docs.stackNext"),
    "React 19",
    "Better Auth",
    "SQLite local sessions",
    t("docs.stackJson"),
    t("docs.stackProvider"),
    t("docs.stackMarkdown"),
    t("docs.stackLedger"),
  ];
  const workflow = [
    t("docs.workflow1"),
    t("docs.workflow2"),
    t("docs.workflow3"),
    t("docs.workflow4"),
    t("docs.workflow5"),
    t("docs.workflow6"),
    "Open the Workspace tools menu for provider settings, history/data actions, token usage, enterprise management, and audit/compliance pages.",
    "Open Agent Builder to save repeatable multi-agent workflows that use the same model and settings as chat.",
    "Open Skills to create reusable response rules that Batuk can apply automatically during chat.",
  ];
  const providers = [
    ["Ollama", t("providers.ollama.docs")],
    ["OpenAI", t("providers.openai.docs")],
    ["Together AI", "OpenAI-compatible inference through Together's chat completions API."],
    ["Mistral AI", t("providers.mistral.docs")],
    ["Kimi", t("providers.kimi.docs")],
    ["DeepSeek", t("providers.deepseek.docs")],
    ["Qwen", t("providers.qwen.docs")],
    ["Perplexity", "Sonar chat completions plus Batuk API access to Perplexity Search."],
    ["Claude", t("providers.anthropic.docs")],
    ["Grok", t("providers.xai.docs")],
    ["Sarvam AI", t("providers.sarvam.docs")],
    ["OpenRouter", t("providers.openrouter.docs")],
    ["Custom", t("providers.custom.docs")],
  ];
  const mcpDirectoryGroups = [
    "Revenue and CRM: HubSpot, Salesforce-style custom MCP, Close, Attio, Pipedrive, Intercom, Modjo, Demodesk",
    "Work management: Notion, Asana, ClickUp, Monday.com, Linear, Atlassian, Coda, Slack, Gmail",
    "Payments and finance: Stripe, PayPal, Pine Labs, Ramp, Plaid, Debitura",
    "Analytics and observability: Amplitude, PostHog, Honeycomb, Sentry, Braintrust, Fireflies, Jamie",
    "Developer platforms: GitHub Copilot, Buildkite, Cloudflare, Netlify, Render, Neon, Prisma, Postman, Semgrep",
    "Knowledge and AI platforms: Context7, DeepWiki, Microsoft Learn, Hugging Face, Replicate, Astro Docs",
    "Creative, media, commerce, and web automation: Canva, Cloudinary, Mobbin, Apify, Browser Use, Lazyweb, Google Maps Grounding Lite, Swiggy",
  ];

  return (
    <div className="settings-layer" role="dialog" aria-modal="true" aria-label={t("topbar.documentation")}>
      <button className="settings-backdrop" onClick={onClose} aria-label={t("docs.close")} type="button" />
      <section className="docs-page">
        <header className="docs-nav">
          <div className="docs-brand">
            <span className="docs-logo">SB</span>
            <span>{t("docs.docsBrand")}</span>
          </div>
          <button className="top-icon" onClick={onClose} title={t("docs.close")} type="button">
            <X size={20} />
          </button>
        </header>

        <div className="docs-scroll">
          <section className="docs-hero">
            <div className="docs-eyebrow">
              <Sparkles size={16} />
              {t("docs.heroEyebrow")}
            </div>
            <h1>{t("docs.heroTitle")}</h1>
            <p>{t("docs.heroCopy")}</p>
            <div className="docs-cta-row">
              <a href="https://suhasbhairav.com" rel="noreferrer" target="_blank">
                {t("common.creator")}
              </a>
              <button onClick={onClose} type="button">{t("docs.returnToChat")}</button>
            </div>
          </section>

          <section className="docs-metrics" aria-label={t("docs.productSummary")}>
            <div>
              <strong>7</strong>
              <span>{t("docs.providerPaths")}</span>
            </div>
            <div>
              <strong>RAG</strong>
              <span>JSON, ChromaDB, Pinecone</span>
            </div>
            <div>
              <strong>Auth</strong>
              <span>Better Auth enterprise</span>
            </div>
            <div>
              <strong>SQL</strong>
              <span>SQLite, MySQL, PostgreSQL</span>
            </div>
            <div>
              <strong>Skills</strong>
              <span>Reusable prompt rules</span>
            </div>
          </section>

          <section className="docs-split">
            <div className="docs-copy-block">
              <span>Main purpose</span>
              <h2>Chat with any model your team is allowed to run.</h2>
              <p>
                Batuk is a Sovereign AI chat application for using local models, hosted APIs, and private
                OpenAI-compatible gateways from one interface. Teams can choose Ollama for local inference, OpenAI for
                managed models and realtime voice, OpenRouter for routed model access, Claude, Grok, Sarvam AI, or an
                internal compatible endpoint without changing the chat experience.
              </p>
              <ul>
                {[
                  "Stream model responses with Markdown, copy actions, history, temporary chat, folders, and workspaces",
                  "Switch providers and models from the UI while keeping the same chat, RAG, guardrail, skill, and agent workflow controls",
                  "Use server-side environment configuration for enterprise deployments or runtime Settings for local evaluation",
                  "Keep default storage local with optional SQL persistence for organization-scoped production installs",
                ].map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="docs-code-card">
              <div className="code-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <pre>
                <code>{`Providers:
Ollama -> local/private models
OpenAI -> chat, web search, embeddings, voice
OpenRouter -> routed model catalog
Claude -> Anthropic Messages
Grok -> xAI models
Sarvam AI -> Indian language models
Custom -> LM Studio, vLLM, LiteLLM, gateways`}</code>
              </pre>
            </div>
          </section>

          <section className="docs-split">
            <div className="docs-copy-block">
              <span>Enterprise administration</span>
              <h2>Use Better Auth teams, admins, users, roles, and shared workspaces.</h2>
              <p>
                Batuk enables Better Auth Admin and Organization plugins with a shared access controller. The Enterprise
                console can bootstrap the first owner, create organizations, switch active organizations, create teams,
                invite members, change organization roles, manage global user roles, and administer shared workspaces.
              </p>
              <ul>
                {[
                  "Global roles: owner, admin, member, viewer, user",
                  "Organization roles, invitations, teams, and dynamic access control are enabled",
                  "Admins can create, read, update, ban, unban, reset passwords, and delete users",
                  "Admins can create shared workspaces, add users by email, remove users from the member list, rename workspaces, toggle workspace RAG, and delete shared workspaces",
                  "Admins can whitelabel the active organization with an uploaded logo while the Batuk/Suhas Bhairav footer stays locked",
                  "Better Auth Infrastructure can provide dashboard analytics and audit-log integration when configured",
                  "OAuth Provider, SSO, and SCIM plugins are mounted for enterprise identity workflows",
                  "Product APIs check role permissions for documents, chats, agents, skills, memory, usage, models, and voice",
                ].map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="docs-code-card">
              <div className="code-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <pre>
                <code>{`plugins: [
  admin({
    ac: enterpriseAc,
    roles: enterpriseRoles,
    adminRoles: ["owner", "admin"]
  }),
  organization({
    ac: enterpriseAc,
    roles: enterpriseRoles,
    teams: { enabled: true },
    dynamicAccessControl: { enabled: true }
  }),
  dash({ /* infrastructure config */ }),
  oauthProvider({ consentPage: "/oauth/consent" }),
  sso(),
  scim()
]`}</code>
              </pre>
            </div>
          </section>

          <section className="docs-split">
            <div className="docs-copy-block">
              <span>Workspace privacy</span>
              <h2>Personal context and shared context never mix.</h2>
              <p>
                Batuk treats personal work and shared workspace work as separate scopes. A user can upload personal
                documents and save memories without exposing them to other users in the same organization. Shared RAG
                becomes visible only inside a shared workspace created by an admin and only to users who are workspace
                members.
              </p>
              <ul>
                {[
                  "Personal chats, folders, documents, chunks, memories, and local JSON stores are scoped to the signed-in user",
                  "Shared workspace chats and folders are stored in the workspace scope and loaded only for admins or workspace members",
                  "Workspace members are added by email; Batuk resolves the email to an existing Better Auth user and stores the user ID for access checks",
                  "Deleting personal chats affects only the signed-in user's personal workspace",
                  "Shared workspace chats can be deleted by admins and by users who belong to that workspace",
                  "ChromaDB and Pinecone vectors include scope metadata and are filtered by scope before retrieved document context is added to chat",
                ].map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="docs-code-card">
              <div className="code-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <pre>
                <code>{`Scopes:
personal:
  organizationId = active org or "personal"
  userId = signed-in user

workspace:
  organizationId = active org
  userId = "workspace:<workspaceId>"
  workspaceId = shared workspace

Retrieval:
  require membership/admin
  filter vectors by scope
  inject only matching context`}</code>
              </pre>
            </div>
          </section>

          <section className="docs-section">
            <div className="docs-section-title">
              <span>Identity integrations</span>
              <h2>Dashboard, OAuth/OIDC, SSO, and SCIM are ready for enterprise deployments.</h2>
            </div>
            <div className="provider-list">
              {[
                ["Dashboard", "Enable Better Auth Infrastructure dashboard activity tracking and audit visibility from deployment configuration."],
                ["OAuth Provider", "Default mode. Supports OAuth 2.1 flows, client registration, trusted clients, consent, JWT tokens, and OIDC through the openid scope."],
                ["Legacy OIDC Provider", "Set BETTER_AUTH_PROVIDER_MODE=legacy-oidc only when an older integration needs the deprecated Better Auth OIDC provider."],
                ["SSO", "Register enterprise OIDC/SAML providers, verify domains, and provision organization membership during sign-in."],
                ["SCIM", "Let owners and admins generate SCIM tokens so identity providers can provision and manage users."],
              ].map(([name, copy]) => (
                <div className="provider-row" key={name}>
                  <strong>{name}</strong>
                  <span>{copy}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="docs-split">
            <div className="docs-copy-block">
              <span>Compliance operations</span>
              <h2>Audit evidence for GDPR, ISO 27001, and SOC 2 readiness.</h2>
              <p>
                Batuk writes protected access, admin, privacy, document, and chat-library events to a local audit trail
                with hash-chain integrity evidence. The dedicated Audit workspace summarizes control coverage, data inventory,
                GDPR request status, and recent audit activity.
              </p>
              <ul>
                {[
                  "GDPR export, request, and erasure workflows are available from the Audit workspace",
                  "ISO 27001 and SOC 2 control evidence is mapped in a local control register",
                  "Audit CSV export is available at /api/compliance?export=audit",
                  "Email and IP identifiers are hashed by default in audit events",
                  "Certification still requires policies, organizational evidence, and auditor review outside the app",
                ].map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="docs-code-card">
              <div className="code-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <pre>
                <code>{`BATUK_AUDIT_ENABLED=true
BATUK_AUDIT_RETENTION_DAYS=365
BATUK_AUDIT_HASH_IDENTIFIERS=true
BATUK_AUDIT_MAX_EVENTS=10000

Evidence:
data/compliance-store.json
/api/compliance?export=audit`}</code>
              </pre>
            </div>
          </section>

          <section className="docs-section">
            <div className="docs-section-title">
              <span>Auth database adapters</span>
              <h2>Run Better Auth on SQLite, MySQL, PostgreSQL, MS SQL, or MongoDB.</h2>
            </div>
            <div className="provider-list">
              {[
                ["SQLite", "Default local adapter through Node built-in SQLite and BETTER_AUTH_DB_PATH."],
                ["MySQL", "Set BETTER_AUTH_DATABASE_PROVIDER=mysql and use BETTER_AUTH_DATABASE_URL or BETTER_AUTH_MYSQL_* fields."],
                ["PostgreSQL", "Set BETTER_AUTH_DATABASE_PROVIDER=postgresql and optionally BETTER_AUTH_POSTGRES_SCHEMA for search_path."],
                ["MS SQL", "Set BETTER_AUTH_DATABASE_PROVIDER=mssql with BETTER_AUTH_MSSQL_* connection fields."],
                ["MongoDB", "Set BETTER_AUTH_DATABASE_PROVIDER=mongodb and use MONGODB_URI or BETTER_AUTH_DATABASE_URL; schema migration is skipped."],
              ].map(([name, copy]) => (
                <div className="provider-row" key={name}>
                  <strong>{name}</strong>
                  <span>{copy}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="docs-section">
            <div className="docs-section-title">
              <span>{t("docs.capabilities")}</span>
              <h2>{t("docs.capabilitiesTitle")}</h2>
            </div>
            <div className="docs-card-grid">
              {capabilityCards.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="docs-card" key={item.title}>
                    <Icon size={22} />
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="docs-split">
            <div className="docs-code-card">
              <div className="code-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <pre>
                <code>{`const providers = [
  "ollama",
  "openai",
  "anthropic",
  "xai",
  "sarvam",
  "openrouter",
  "custom"
];

await streamModel({
  provider,
  model,
  guardrails,
  webSearch,
  documentChat
});`}</code>
              </pre>
            </div>
            <div className="docs-copy-block">
              <span>{t("docs.architecture")}</span>
              <h2>{t("docs.architectureTitle")}</h2>
              <p>{t("docs.architectureCopy")}</p>
              <ul>
                {stackItems.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="docs-split">
            <div className="docs-copy-block">
              <span>Sovereign foundation</span>
              <h2>Accounts, sessions, and local data stay under your control.</h2>
              <p>
                Batuk uses Better Auth with a local SQLite database for email/password accounts and session cookies. Chat,
                document, model, token usage, and realtime APIs require an authenticated session before touching local data
                or provider credentials.
              </p>
              <ul>
                {[
                  "Local SQLite auth database at data/sb-chat-auth.sqlite",
                  "Protected APIs for chat, library, documents, models, token usage, and voice sessions",
                  "Node built-in SQLite driver avoids native better-sqlite3 rebuild failures",
                  "Runtime API keys are not persisted to local storage",
                ].map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="docs-code-card">
              <div className="code-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <pre>
                <code>{`export const auth = betterAuth({
  appName: "Batuk",
  database: new DatabaseSync(
    "data/sb-chat-auth.sqlite"
  ),
  emailAndPassword: { enabled: true }
});

await requireServerSession();`}</code>
              </pre>
            </div>
          </section>

          <section className="docs-section">
            <div className="docs-section-title">
              <span>{t("docs.providers")}</span>
              <h2>{t("docs.providersTitle")}</h2>
            </div>
            <div className="provider-list">
              {providers.map(([name, copy]) => (
                <div className="provider-row" key={name}>
                  <strong>{name}</strong>
                  <span>{copy}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="docs-split">
            <div className="docs-copy-block">
              <span>Document Chat</span>
              <h2>Use scoped JSON, ChromaDB, or Pinecone for document vectors.</h2>
              <p>
                The Documents panel stores uploaded originals locally, then extracts text, chunks content, creates local
                or OpenAI embeddings, and writes vectors to the selected store. Personal uploads are visible only to the
                signed-in user. Shared workspace uploads are visible only to admins and workspace members. Pinecone can be
                configured with an API key, index, namespace, cloud, and region while keeping download and delete behavior
                identical to ChromaDB.
              </p>
              <ul>
                {[
                  "Pinecone can be configured from environment or the Documents panel",
                  "Default Pinecone index and namespace are configurable per deployment",
                  "Personal and workspace RAG stores are separated in local JSON and filtered in ChromaDB/Pinecone by scope metadata",
                  "Local embeddings use 384 dimensions; OpenAI text-embedding-3-small uses 1536",
                  "If an existing Pinecone index has the wrong dimension, Batuk creates a sibling index such as sb-chat-documents-1536d",
                  "Delete removes remote vectors when applicable; download always returns the locally stored original file",
                ].map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="docs-code-card">
              <div className="code-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <pre>
                <code>{`Documents -> Vector storage

Default:
Local JSON vectors

Optional:
ChromaDB collection
Pinecone index + namespace

Operations:
Upload, reindex, search, download, delete`}</code>
              </pre>
            </div>
          </section>

          <section className="docs-split">
            <div className="docs-copy-block">
              <span>Agent Builder</span>
              <h2>Turn one-off prompts into saved, repeatable AI workflows.</h2>
              <p>
                The Agent Builder is a dedicated workspace for chaining agents together. Each agent has its own instruction,
                receives the previous agent output, and runs with the same provider, model, temperature, API key, and
                guardrail settings already selected in chat.
              </p>
              <ul>
                {[
                  "Workflow library with saved cards for create, edit, update, and delete",
                  "Workflow library search filters saved workflow cards by name",
                  "Add draft agents or insert reusable saved agents into a workflow",
                  "Saved-agent search filters reusable agents before inserting them",
                  "Attach documents to Agent 1 so extracted file content starts the chain",
                  "Right-side visualizer shows the connected sequence and scrollable run trace",
                  "Final agent output is posted back into the chat window",
                ].map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="docs-code-card">
              <div className="code-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <pre>
                <code>{`const workflow = [
  "Agent 1: extract facts from input + docs",
  "Agent 2: reason over constraints",
  "Agent 3: produce final answer"
];

for (const agent of workflow) {
  output = await runModel({
    model: chatSettings.model,
    prompt: agent,
    input: output
  });
}`}</code>
              </pre>
            </div>
          </section>

          <section className="docs-split">
            <div className="docs-code-card">
              <div className="code-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <pre>
                <code>{`const enabledSkills = await listEnabledSkills();

const skillsPrompt = formatSkillsForPrompt(
  enabledSkills
);

messages.unshift({
  role: "system",
  content: skillsPrompt
});`}</code>
              </pre>
            </div>
            <div className="docs-copy-block">
              <span>Skills</span>
              <h2>Reusable instructions that travel with every relevant chat.</h2>
              <p>
                The Skills dashboard stores named reusable instructions with descriptions, examples, and supporting
                resources. Skills can be enabled, disabled, searched by name, imported, exported, edited, and deleted.
                Enabled skills are injected into chat requests as system context and used silently when relevant.
              </p>
              <ul>
                {[
                  "Create, update, delete, enable, and disable reusable skills",
                  "Search skills by name inside the dashboard",
                  "Import and export the skills library as JSON",
                  "Persist skills locally in data/skill-store.json",
                  "Enabled skills are prepended to chat requests as reusable workflow instructions",
                ].map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="docs-split">
            <div className="docs-copy-block">
              <span>MCP integrations</span>
              <h2>How to chat after connecting an MCP product.</h2>
              <p>
                MCP integrations are in alpha, PoC stage. After connecting a server, select it as the active MCP product
                before returning to chat. The chat screen confirms the active product with an MCP connected banner.
              </p>
              <ul>
                {[
                  "Open the MCP dashboard from the top bar plug icon",
                  "Pick a connector and click Connect",
                  "Click Discover so Batuk can list MCP tools, resources, and prompts",
                  "Click the check icon on the connected product to make it active",
                  "Return to chat and confirm the MCP connected banner is visible",
                  "Ask normal chat questions such as: Using the selected Notion MCP, what tools are available?",
                  "Current alpha presets include Pine Labs, Notion, Stripe, PayPal, ClickUp, Slack, Gmail, Google Maps Grounding Lite, Monday.com, Atlassian, Linear, Asana, Amplitude, PostHog, Sentry, Neon, Render, Netlify, HubSpot, Swiggy, and custom MCP servers",
                ].map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                MCP chat is currently context-first: Batuk injects discovered capabilities and readable resources into
                chat context. Full automatic MCP tool execution inside normal chat is still being built.
              </p>
              <p>
                Enterprise operators should treat MCP as an integration control plane: verify each provider&apos;s OAuth
                scopes, tenant restrictions, audit expectations, and write-action approvals before using production data.
              </p>
            </div>
            <div className="docs-code-card">
              <div className="code-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <pre>
                <code>{`MCP chat flow:
1. Connect
2. Discover
3. Select active product
4. Return to chat
5. Confirm banner:
   MCP connected: Notion
   In alpha, PoC stage

Example prompt:
"Using the selected Notion MCP,
what tools are available?"`}</code>
              </pre>
            </div>
          </section>

          <section className="docs-section">
            <div className="docs-section-title">
              <span>MCP directory</span>
              <h2>Enterprise connector coverage in alpha, PoC stage.</h2>
            </div>
            <div className="docs-card-grid">
              {mcpDirectoryGroups.map((item) => (
                <article className="docs-card" key={item}>
                  <PlugZap size={20} />
                  <h3>{item.split(":")[0]}</h3>
                  <p>{item.split(":").slice(1).join(":").trim()}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="docs-band">
            <div>
              <PlugZap size={21} />
              <h2>{t("docs.productSystems")}</h2>
            </div>
            <div className="docs-feature-cloud">
              <span><Database size={15} /> {t("docs.featureHistory")}</span>
              <span><LockKeyhole size={15} /> Better Auth</span>
              <span><Building2 size={15} /> Organizations</span>
              <span><UsersRound size={15} /> Teams and roles</span>
              <span><KeyRound size={15} /> Protected APIs</span>
              <span><Search size={15} /> {t("docs.featureSearch")}</span>
              <span><FileText size={15} /> {t("docs.featureExport")}</span>
              <span><FileText size={15} /> Document Chat</span>
              <span><Waypoints size={15} /> Agent Builder</span>
              <span><Sparkles size={15} /> Skills</span>
              <span><Boxes size={15} /> {t("docs.featureMove")}</span>
              <span><Languages size={15} /> i18n</span>
              <span><Moon size={15} /> {t("docs.featureDark")}</span>
              <span><Sun size={15} /> {t("docs.featureLight")}</span>
              <span><Zap size={15} /> {t("docs.featureTemporary")}</span>
              <span><Waypoints size={15} /> {t("docs.featureTokens")}</span>
            </div>
          </section>

          <section className="docs-section last">
            <div className="docs-section-title">
              <span>{t("docs.workflow")}</span>
              <h2>{t("docs.workflowTitle")}</h2>
            </div>
            <div className="workflow-list">
              {workflow.map((item, index) => (
                <div className="workflow-step" key={item}>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <footer className="docs-footer">
            <div>
              <strong>Batuk</strong>
              <span>{t("common.createdBy")}</span>
              <a href="https://suhasbhairav.com" rel="noreferrer" target="_blank">
                {t("common.suhas")}
              </a>
            </div>
            <strong>{t("common.mitLicense")}</strong>
          </footer>
        </div>
      </section>
    </div>
  );
}
