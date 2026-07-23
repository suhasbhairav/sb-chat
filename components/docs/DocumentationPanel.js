import {
  BookOpen,
  Boxes,
  BrainCircuit,
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
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
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
      icon: FileText,
      title: "Document Chat and RAG",
      copy: "Upload documents, index with local or OpenAI embeddings, retrieve chunks per message, and cite document sources.",
    },
    {
      icon: Waypoints,
      title: "Agent Builder",
      copy: "Design reusable multi-agent workflows, attach documents to Agent 1, run agents in sequence, and send the final output back to chat.",
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
    "Open Agent Builder to save repeatable multi-agent workflows that use the same model and settings as chat.",
  ];
  const providers = [
    ["Ollama", t("providers.ollama.docs")],
    ["OpenAI", t("providers.openai.docs")],
    ["Claude", t("providers.anthropic.docs")],
    ["Grok", t("providers.xai.docs")],
    ["Sarvam AI", t("providers.sarvam.docs")],
    ["OpenRouter", t("providers.openrouter.docs")],
    ["Custom", t("providers.custom.docs")],
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
              <strong>Auth</strong>
              <span>Better Auth + SQLite</span>
            </div>
            <div>
              <strong>6</strong>
              <span>Curated languages</span>
            </div>
            <div>
              <strong>JSON</strong>
              <span>{t("docs.localPersistence")}</span>
            </div>
            <div>
              <strong>Agents</strong>
              <span>Saved workflow builder</span>
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
                SB AI Chat uses Better Auth with a local SQLite database for email/password accounts and session cookies. Chat,
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
  appName: "SB AI Chat",
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
                  "Add draft agents or insert reusable saved agents into a workflow",
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

          <section className="docs-band">
            <div>
              <BookOpen size={21} />
              <h2>{t("docs.productSystems")}</h2>
            </div>
            <div className="docs-feature-cloud">
              <span><Database size={15} /> {t("docs.featureHistory")}</span>
              <span><LockKeyhole size={15} /> Better Auth</span>
              <span><KeyRound size={15} /> Protected APIs</span>
              <span><Search size={15} /> {t("docs.featureSearch")}</span>
              <span><FileText size={15} /> {t("docs.featureExport")}</span>
              <span><FileText size={15} /> Document Chat</span>
              <span><Waypoints size={15} /> Agent Builder</span>
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
