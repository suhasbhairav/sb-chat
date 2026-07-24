"use client";

import { useState } from "react";
import { ArrowUp, FileUp, Globe2, Mic, Pencil, Plus, RefreshCw, Send, Sparkles, Trash2, Volume2, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export function ChatComposer({
  canSend,
  attachmentError,
  attachmentInputRef,
  attachmentStatus,
  attachments,
  hasMessages,
  input,
  inputRef,
  isSending,
  queuedMessages,
  provider,
  webSearchEnabled,
  voiceState,
  onChange,
  onDeleteQueuedMessage,
  onEditQueuedMessage,
  onRemoveAttachment,
  onSendQueuedMessageNext,
  onSubmit,
  onUploadAttachments,
  onToggleWebSearch,
  onToggleVoiceChat,
}) {
  const { t } = useI18n();
  const [toolsOpen, setToolsOpen] = useState(false);
  const voiceActive = voiceState === "connected" || voiceState === "connecting";
  const webSearchAvailable = provider === "openai";

  function toggleWebSearch() {
    if (!webSearchAvailable) return;
    onToggleWebSearch();
    setToolsOpen(false);
  }

  function uploadFiles(event) {
    onUploadAttachments(event.target.files);
    setToolsOpen(false);
  }

  return (
    <div className={`composer-shell ${hasMessages ? "is-docked" : ""}`}>
      {queuedMessages?.length > 0 && (
        <div className="message-queue" aria-label={t("queue.label")}>
          <div className="message-queue-head">
            <strong>{t("queue.title")}</strong>
            <span>{t("queue.count", { count: queuedMessages.length })}</span>
          </div>
          <div className="message-queue-list">
            {queuedMessages.map((message) => (
              <article className="queued-message" key={message.id}>
                <div className="queued-message-copy">
                  <p>{message.content}</p>
                  {message.attachments?.length > 0 && (
                    <div className="queued-attachments">
                      {message.attachments.map((attachment) => (
                        <span key={attachment.id || attachment.name}>{attachment.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <button onClick={() => onSendQueuedMessageNext(message.id)} title={t("queue.sendNext")} type="button">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => onEditQueuedMessage(message.id)} title={t("queue.edit")} type="button">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => onDeleteQueuedMessage(message.id)} title={t("queue.delete")} type="button">
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      <form className={`chat-composer ${hasMessages ? "is-docked" : ""}`} onSubmit={onSubmit}>
        <input
          ref={attachmentInputRef}
          accept=".csv,.xls,.xlsx,.pdf,.docx,.txt,.md,.json,.log,image/png,image/jpeg,image/gif,image/webp"
          multiple
          onChange={uploadFiles}
          type="file"
          hidden
        />
        <textarea
          ref={inputRef}
          aria-label={t("composer.chatMessage")}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={t("composer.placeholder")}
          value={input}
        />
        <div className="composer-actions">
          <div className="composer-left">
            <div className="composer-tool-wrap">
              <button
                className={`round-action ${webSearchEnabled ? "is-live" : ""}`}
                onClick={() => setToolsOpen((value) => !value)}
                title={t("composer.addTools")}
                type="button"
              >
                <Plus size={21} />
              </button>
              {toolsOpen && (
                <div className="composer-tool-menu">
                  <button
                    className={webSearchEnabled ? "active" : ""}
                    disabled={!webSearchAvailable}
                    onClick={toggleWebSearch}
                    type="button"
                  >
                    <Globe2 size={16} />
                    <span>{t("composer.webSearch")}</span>
                    <small>{webSearchAvailable ? (webSearchEnabled ? t("composer.webSearchOn") : t("composer.openAI")) : t("composer.openAIOnly")}</small>
                  </button>
                  <button onClick={() => attachmentInputRef.current?.click()} type="button">
                    <FileUp size={16} />
                    <span>{t("composer.uploadFiles")}</span>
                    <small>{t("composer.uploadFilesHelp")}</small>
                  </button>
                </div>
              )}
            </div>
            {webSearchEnabled && (
              <button className="tool-chip active" onClick={toggleWebSearch} title={t("composer.disableWebSearch")} type="button">
                <Globe2 size={16} />
                <span>{t("composer.webSearch")}</span>
              </button>
            )}
            <button className="round-action" title={t("composer.tools")} type="button">
              <Sparkles size={18} />
            </button>
          </div>
          <div className="composer-right">
            <button
              className={`round-action ${voiceActive ? "is-live" : ""}`}
              onClick={onToggleVoiceChat}
              title={voiceActive ? t("composer.stopVoice") : t("composer.startVoice")}
              type="button"
            >
              {voiceState === "connecting" ? <RefreshCw className="animate-spin" size={18} /> : <Mic size={19} />}
            </button>
            <button className="voice-button" disabled={!canSend} title={t("composer.sendMessage")} type="submit">
              {isSending ? <RefreshCw className="animate-spin" size={18} /> : input.trim() ? <Send size={18} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>
        {(attachments?.length > 0 || attachmentStatus === "uploading" || attachmentError) && (
          <div className="composer-attachments">
            {attachments?.map((attachment) => (
              <span className="attachment-chip" key={attachment.id}>
                {attachment.name}
                <button onClick={() => onRemoveAttachment(attachment.id)} title={t("composer.removeAttachment")} type="button">
                  <X size={12} />
                </button>
              </span>
            ))}
            {attachmentStatus === "uploading" && <span className="attachment-chip muted">{t("composer.uploadingFiles")}</span>}
            {attachmentError && <span className="attachment-error">{attachmentError}</span>}
          </div>
        )}
      </form>
    </div>
  );
}
