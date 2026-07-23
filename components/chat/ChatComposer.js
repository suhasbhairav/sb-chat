"use client";

import { useState } from "react";
import { Globe2, Mic, Plus, RefreshCw, Send, Sparkles, Volume2 } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export function ChatComposer({
  canSend,
  hasMessages,
  input,
  inputRef,
  isSending,
  provider,
  webSearchEnabled,
  voiceState,
  onChange,
  onSubmit,
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

  return (
    <form className={`chat-composer ${hasMessages ? "is-docked" : ""}`} onSubmit={onSubmit}>
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
    </form>
  );
}
