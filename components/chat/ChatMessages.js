import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { Bot, Brain, Check, Copy, RefreshCw, User, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export function ChatMessages({ copiedId, messages, model, onCopyMessage, onRememberMessage, scrollRef }) {
  const { t } = useI18n();
  const [rememberedId, setRememberedId] = useState(null);

  async function remember(message) {
    try {
      await onRememberMessage(message);
      setRememberedId(message.id);
      setTimeout(() => setRememberedId(null), 1300);
    } catch (error) {
      window.alert(error.message || t("settings.memorySaveError"));
    }
  }

  return (
    <div className="messages-wrap">
      {messages.map((message, index) => (
        <article key={message.id || `${message.role}-${index}-${String(message.content || "").slice(0, 32)}`} className={`message ${message.role}`}>
          <div className="message-avatar">
            {message.role === "user" ? <User size={17} /> : message.role === "error" ? <X size={17} /> : <Bot size={17} />}
          </div>
          <div className="message-content">
            <div className="message-meta">
              <span>{message.role === "user" ? t("common.you") : message.role === "error" ? t("common.error") : model}</span>
              {message.content && message.role !== "error" && (
                <div className="message-actions">
                  <button className="copy-button" onClick={() => remember(message)} title={t("settings.remember")} type="button">
                    {rememberedId === message.id ? <Check size={14} /> : <Brain size={14} />}
                  </button>
                  <button className="copy-button" onClick={() => onCopyMessage(message)} title={t("common.copy")} type="button">
                    {copiedId === message.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </div>
            <div className="markdown-body">
              {message.pending ? (
                <span className="thinking">
                  <RefreshCw className="animate-spin" size={16} />
                  {t("composer.thinking")}
                </span>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              )}
            </div>
            {message.guardrails?.blocked && <p className="guardrail-note">{message.guardrails.reason}</p>}
          </div>
        </article>
      ))}
      <div ref={scrollRef} />
    </div>
  );
}
