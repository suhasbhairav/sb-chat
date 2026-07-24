import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { Bot, Brain, Check, Copy, Pencil, RefreshCw, Trash2, User, X } from "lucide-react";
import { ChartArtifact } from "@/components/chat/ChartArtifact";
import { useI18n } from "@/components/i18n/I18nProvider";

function parseChartArtifacts(content) {
  const charts = [];
  const markdown = String(content || "").replace(/```(?:chart|batuk-chart)\s*([\s\S]*?)```/gi, (match, rawJson) => {
    try {
      charts.push(JSON.parse(rawJson));
      return "";
    } catch {
      return match;
    }
  });

  return {
    charts,
    markdown: markdown.trim() || content,
  };
}

export function ChatMessages({ copiedId, messages, model, onCopyMessage, onDeleteMessage, onEditMessage, onRememberMessage, scrollRef }) {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [rememberedId, setRememberedId] = useState(null);

  function startEdit(message) {
    setEditingId(message.id);
    setEditingContent(message.content || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingContent("");
  }

  async function saveEdit() {
    const trimmedContent = editingContent.trim();
    if (!editingId || !trimmedContent) return;
    const save = onEditMessage(editingId, trimmedContent);
    cancelEdit();
    await save;
  }

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
        <MessageItem
          copiedId={copiedId}
          editingContent={editingContent}
          editingId={editingId}
          index={index}
          key={message.id || `${message.role}-${index}-${String(message.content || "").slice(0, 32)}`}
          message={message}
          model={model}
          rememberedId={rememberedId}
          t={t}
          onCancelEdit={cancelEdit}
          onChangeEditingContent={setEditingContent}
          onCopyMessage={onCopyMessage}
          onDeleteMessage={onDeleteMessage}
          onRemember={remember}
          onSaveEdit={saveEdit}
          onStartEdit={startEdit}
        />
      ))}
      <div ref={scrollRef} />
    </div>
  );
}

function MessageItem({
  copiedId,
  editingContent,
  editingId,
  index,
  message,
  model,
  rememberedId,
  t,
  onCancelEdit,
  onChangeEditingContent,
  onCopyMessage,
  onDeleteMessage,
  onRemember,
  onSaveEdit,
  onStartEdit,
}) {
  const parsed = parseChartArtifacts(message.content);

  return (
    <article className={`message ${message.role}`}>
          <div className="message-avatar">
            {message.role === "user" ? <User size={17} /> : message.role === "error" ? <X size={17} /> : <Bot size={17} />}
          </div>
          <div className="message-content">
            <div className="message-meta">
              <span>{message.role === "user" ? t("common.you") : message.role === "error" ? t("common.error") : model}</span>
              {message.content && message.role !== "error" && (
                <div className="message-actions">
                  <button className="copy-button" onClick={() => onRemember(message)} title={t("settings.remember")} type="button">
                    {rememberedId === message.id ? <Check size={14} /> : <Brain size={14} />}
                  </button>
                  <button className="copy-button" onClick={() => onCopyMessage(message)} title={t("common.copy")} type="button">
                    {copiedId === message.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  {message.role === "user" && editingId !== message.id && (
                    <button className="copy-button" onClick={() => onStartEdit(message)} title={t("messages.edit")} type="button">
                      <Pencil size={14} />
                    </button>
                  )}
                  <button className="copy-button danger-copy-button" onClick={() => onDeleteMessage(message.id)} title={t("messages.delete")} type="button">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="markdown-body">
              {editingId === message.id ? (
                <div className="message-edit-box">
                  <textarea
                    aria-label={t("messages.editLabel")}
                    autoFocus
                    onChange={(event) => onChangeEditingContent(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault();
                        onSaveEdit();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        onCancelEdit();
                      }
                    }}
                    value={editingContent}
                  />
                  <div>
                    <button onClick={onCancelEdit} type="button">
                      {t("messages.cancelEdit")}
                    </button>
                    <button disabled={!editingContent.trim()} onClick={onSaveEdit} type="button">
                      {t("messages.saveEdit")}
                    </button>
                  </div>
                </div>
              ) : message.pending ? (
                <span className="thinking">
                  <RefreshCw className="animate-spin" size={16} />
                  {t("composer.thinking")}
                </span>
              ) : (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.markdown}</ReactMarkdown>
                  {parsed.charts.map((chart, chartIndex) => (
                    <ChartArtifact key={`${message.id || index}-chart-${chartIndex}`} spec={chart} />
                  ))}
                </>
              )}
              {message.attachments?.length > 0 && editingId !== message.id && (
                <div className="message-attachments">
                  {message.attachments.map((attachment) => (
                    <span key={attachment.id || attachment.name}>{attachment.name}</span>
                  ))}
                </div>
              )}
            </div>
            {message.guardrails?.blocked && <p className="guardrail-note">{message.guardrails.reason}</p>}
          </div>
        </article>
  );
}
