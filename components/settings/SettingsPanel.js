import { Download, KeyRound, Mic, Moon, RefreshCw, ShieldCheck, ShieldOff, Sun, Trash2, Upload, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LOCALE_OPTIONS } from "@/lib/i18n";
import { PROVIDERS } from "@/lib/providers";
import { AUTO_REALTIME_MODEL } from "@/lib/voice-models";

export function SettingsPanel({
  baseUrl,
  currentProvider,
  folders,
  guardrails,
  hasMessages,
  importChatsRef,
  locale,
  model,
  modelCatalog,
  modelCatalogError,
  modelCatalogSource,
  modelCatalogStatus,
  provider,
  realtimeModel,
  resolvedRealtimeModel,
  selectedFolderId,
  selectedWorkspaceId,
  temperature,
  temporaryChat,
  theme,
  voiceError,
  voiceState,
  apiKey,
  onChangeApiKey,
  onChangeBaseUrl,
  onChangeLocale,
  onChangeModel,
  onChangeProvider,
  onChangeRealtimeModel,
  onChangeTemperature,
  onClearMessages,
  onClose,
  onExportChat,
  onExportChatLibrary,
  onImportChatLibrary,
  onMoveChat,
  onSaveChat,
  onToggleGuardrails,
  onToggleTemporaryChat,
  onToggleTheme,
  onToggleVoiceChat,
}) {
  const { t } = useI18n();
  const workspaceFolders = folders.filter((folder) => folder.workspaceId === selectedWorkspaceId);
  const realtimeModels = modelCatalog.filter((item) => item.id.includes("realtime"));
  const selectableRealtimeModels = realtimeModels.length
    ? realtimeModels
    : [
        { id: "gpt-realtime-2.1", name: "gpt-realtime-2.1" },
        { id: "gpt-realtime-2.1-mini", name: "gpt-realtime-2.1-mini" },
      ];
  const voiceActive = voiceState === "connected" || voiceState === "connecting";

  async function handleExportChatLibrary() {
    try {
      await onExportChatLibrary();
    } catch (error) {
      window.alert(error.message || t("settings.exportError"));
    }
  }

  async function handleImportChatLibrary(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await onImportChatLibrary(file);
      window.alert(t("settings.importedChats", { count: result?.imported ?? 0 }));
    } catch (error) {
      event.target.value = "";
      window.alert(error.message || t("settings.importError"));
    }
  }

  return (
    <div className="settings-layer" role="dialog" aria-modal="true" aria-label={t("topbar.providerSettings")}>
      <button className="settings-backdrop" onClick={onClose} aria-label={t("settings.closeSettings")} type="button" />
      <section className="settings-page">
        <div className="settings-header">
          <div>
            <p>{t("common.settings")}</p>
            <h2>{t("settings.providerAndModel")}</h2>
          </div>
          <button className="top-icon" onClick={onClose} title={t("settings.closeSettings")} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          <section className="settings-card">
            <div className="setting-title">
              <h3>{t("settings.connection")}</h3>
              <p>{t(`providers.${provider}.help`)}</p>
            </div>

            <label className="field-label" htmlFor="provider">
              {t("settings.provider")}
            </label>
            <select id="provider" className="field select-field" onChange={(event) => onChangeProvider(event.target.value)} value={provider}>
              {Object.entries(PROVIDERS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>

            <label className="field-label" htmlFor="model">
              {t("settings.model")}
            </label>
            {provider === "custom" ? (
              <input
                id="model"
                className="field"
                onChange={(event) => onChangeModel(event.target.value)}
                placeholder="local-model"
                value={model}
              />
            ) : (
              <select id="model" className="field select-field" onChange={(event) => onChangeModel(event.target.value)} value={model}>
                <option value={model}>{model}</option>
                {modelCatalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.id}
                  </option>
                ))}
              </select>
            )}
            <p className="settings-hint">
              {modelCatalogStatus === "loading"
                ? t("settings.loadingModels")
                : modelCatalogStatus === "error"
                  ? modelCatalogError
                  : modelCatalogSource
                    ? t("settings.modelsFrom", { source: modelCatalogSource })
                    : t("settings.envManualModel")}
            </p>

            <label className="field-label" htmlFor="baseUrl">
              {t("settings.baseUrl")}
            </label>
            <input
              id="baseUrl"
              className="field"
              onChange={(event) => onChangeBaseUrl(event.target.value)}
              placeholder={currentProvider.defaultBaseUrl}
              value={baseUrl}
            />

            <label className="field-label" htmlFor="apiKey">
              {t("settings.apiKey")}
            </label>
            <div className="key-field">
              <KeyRound size={17} />
              <input
                id="apiKey"
                className="field"
                onChange={(event) => onChangeApiKey(event.target.value)}
                placeholder={currentProvider.needsKey ? t("settings.apiKeyRequired") : t("settings.apiKeyOptional")}
                type="password"
                value={apiKey}
              />
            </div>
          </section>

          <section className="settings-card">
            <div className="setting-title">
              <h3>{t("settings.behavior")}</h3>
              <p>{t("settings.behaviorCopy")}</p>
            </div>

            <div className="range-row">
              <label className="field-label" htmlFor="temperature">
                {t("settings.temperature")}
              </label>
              <span>{Number(temperature).toFixed(1)}</span>
            </div>
            <input
              id="temperature"
              className="slider"
              max="2"
              min="0"
              onChange={(event) => onChangeTemperature(event.target.value)}
              step="0.1"
              type="range"
              value={temperature}
            />

            <button className="setting-toggle" onClick={onToggleGuardrails} type="button">
              <span className={guardrails ? "toggle-icon on" : "toggle-icon"}>
                {guardrails ? <ShieldCheck size={19} /> : <ShieldOff size={19} />}
              </span>
              <span>
                <strong>{t("settings.comprehensiveGuardrails")}</strong>
                <small>{guardrails ? t("settings.guardrailsOn") : t("settings.guardrailsOff")}</small>
              </span>
              <span className={`toggle ${guardrails ? "on" : ""}`} aria-hidden="true" />
            </button>

            <button className="setting-toggle" onClick={onToggleTemporaryChat} type="button">
              <span className={temporaryChat ? "toggle-icon on" : "toggle-icon"}>
                <Trash2 size={19} />
              </span>
              <span>
                <strong>{t("settings.temporaryChat")}</strong>
                <small>{temporaryChat ? t("settings.temporaryOn") : t("settings.temporaryOff")}</small>
              </span>
              <span className={`toggle ${temporaryChat ? "on" : ""}`} aria-hidden="true" />
            </button>

            <button className="setting-toggle" onClick={onToggleTheme} type="button">
              <span className="toggle-icon">{theme === "dark" ? <Moon size={19} /> : <Sun size={19} />}</span>
              <span>
                <strong>{t("settings.theme")}</strong>
                <small>{theme === "dark" ? t("settings.darkMode") : t("settings.lightMode")}</small>
              </span>
              <span className={`toggle ${theme === "dark" ? "on" : ""}`} aria-hidden="true" />
            </button>
          </section>

          <section className="settings-card">
            <div className="setting-title">
              <h3>{t("settings.voiceChat")}</h3>
              <p>{t("settings.voiceChatCopy")}</p>
            </div>

            <label className="field-label" htmlFor="realtimeModel">
              {t("settings.realtimeModel")}
            </label>
            <select
              id="realtimeModel"
              className="field select-field"
              onChange={(event) => onChangeRealtimeModel(event.target.value)}
              value={realtimeModel}
            >
              <option value={AUTO_REALTIME_MODEL}>{t("settings.voiceAuto")}</option>
              {selectableRealtimeModels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || item.id}
                </option>
              ))}
            </select>
            <p className="settings-hint">
              {t("settings.voiceHint", { model: resolvedRealtimeModel })}
            </p>

            <button className="secondary-button" onClick={onToggleVoiceChat} type="button">
              {voiceState === "connecting" ? <RefreshCw className="animate-spin" size={16} /> : <Mic size={16} />}
              {voiceActive ? t("settings.voiceStop") : t("settings.voiceStart")}
            </button>
            {voiceError && <p className="settings-error">{voiceError}</p>}
          </section>

          <section className="settings-card">
            <div className="setting-title">
              <h3>{t("settings.chatLibrary")}</h3>
              <p>{t("settings.chatLibraryCopy")}</p>
            </div>

            <label className="field-label" htmlFor="folder">
              {t("settings.currentFolder")}
            </label>
            <select
              id="folder"
              className="field select-field"
              onChange={(event) => onMoveChat(event.target.value || null)}
              value={selectedFolderId || ""}
            >
              <option value="">{t("common.allChats")}</option>
              {workspaceFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>

            <button className="secondary-button" disabled={!hasMessages || temporaryChat} onClick={onSaveChat} type="button">
              {t("settings.saveCurrentChat")}
            </button>
          </section>

          <section className="settings-card">
            <div className="setting-title">
              <h3>{t("settings.language")}</h3>
              <p>{t("settings.languageCopy")}</p>
            </div>

            <label className="field-label" htmlFor="locale">
              {t("settings.language")}
            </label>
            <select id="locale" className="field select-field" onChange={(event) => onChangeLocale(event.target.value)} value={locale}>
              {LOCALE_OPTIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label} · {item.region}
                </option>
              ))}
            </select>
          </section>

          <section className="settings-card">
            <div className="setting-title">
              <h3>{t("settings.importAndExport")}</h3>
              <p>{t("settings.importAndExportCopy")}</p>
            </div>

            <button className="secondary-button" onClick={handleExportChatLibrary} type="button">
              <Download size={16} />
              {t("settings.exportAllChats")}
            </button>

            <button className="secondary-button" onClick={() => importChatsRef.current?.click()} type="button">
              <Upload size={16} />
              {t("settings.importChatLibrary")}
            </button>
            <input
              ref={importChatsRef}
              accept="application/json,.json"
              className="hidden-file-input"
              onChange={handleImportChatLibrary}
              type="file"
            />
            <p className="settings-hint">{t("settings.importHint")}</p>
          </section>

          <section className="settings-actions">
            <button className="secondary-button" onClick={onExportChat} type="button">
              <Download size={16} />
              {t("settings.exportChat")}
            </button>
            <button className="secondary-button danger" onClick={onClearMessages} type="button">
              <Trash2 size={16} />
              {t("settings.clearMessages")}
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}
