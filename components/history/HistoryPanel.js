"use client";

import { ArrowLeft, Download, Save, Trash2, Upload, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export function HistoryPanel({
  folders,
  hasMessages,
  importChatsRef,
  selectedFolderId,
  selectedWorkspaceId,
  temporaryChat,
  onClearMessages,
  onBackToMenu,
  onClose,
  onExportChat,
  onExportChatLibrary,
  onImportChatLibrary,
  onMoveChat,
  onSaveChat,
}) {
  const { t } = useI18n();
  const workspaceFolders = folders.filter((folder) => folder.workspaceId === selectedWorkspaceId);

  async function handleImport(event) {
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

  async function handleClear() {
    if (!hasMessages) return;
    if (!window.confirm(t("settings.clearMessagesConfirm"))) return;
    try {
      await onClearMessages();
    } catch (error) {
      window.alert(error.message || t("settings.clearMessagesError"));
    }
  }

  return (
    <div className="settings-layer" role="dialog" aria-modal="true" aria-label="Chat history and data">
      <button className="settings-backdrop" onClick={onClose} aria-label="Close chat history" type="button" />
      <section className="settings-page">
        <div className="settings-header">
          <div>
            <p>History</p>
            <h2>Chat history and data</h2>
          </div>
          <div className="panel-header-actions">
            <button className="secondary-button panel-back-button" onClick={onBackToMenu} type="button">
              <ArrowLeft size={16} />
              Back to menu
            </button>
            <button className="top-icon" onClick={onClose} title="Close chat history" type="button">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="settings-content">
          <section className="settings-card">
            <div className="setting-title">
              <h3>{t("settings.chatLibrary")}</h3>
              <p>{t("settings.chatLibraryCopy")}</p>
            </div>
            <label className="field-label" htmlFor="history-folder">{t("settings.currentFolder")}</label>
            <select id="history-folder" className="field select-field" onChange={(event) => onMoveChat(event.target.value || null)} value={selectedFolderId || ""}>
              <option value="">{t("common.allChats")}</option>
              {workspaceFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            <button className="secondary-button" disabled={!hasMessages || temporaryChat} onClick={onSaveChat} type="button">
              <Save size={16} />
              {t("settings.saveCurrentChat")}
            </button>
          </section>

          <section className="settings-card">
            <div className="setting-title">
              <h3>{t("settings.importAndExport")}</h3>
              <p>{t("settings.importAndExportCopy")}</p>
            </div>
            <button className="secondary-button" onClick={onExportChat} type="button">
              <Download size={16} />
              {t("settings.exportChat")}
            </button>
            <button className="secondary-button" onClick={onExportChatLibrary} type="button">
              <Download size={16} />
              {t("settings.exportAllChats")}
            </button>
            <button className="secondary-button" onClick={() => importChatsRef.current?.click()} type="button">
              <Upload size={16} />
              {t("settings.importChatLibrary")}
            </button>
            <input ref={importChatsRef} accept="application/json,.json" className="hidden-file-input" onChange={handleImport} type="file" />
          </section>

          <section className="settings-actions">
            <button className="secondary-button danger" onClick={handleClear} type="button">
              <Trash2 size={16} />
              {t("settings.clearMessages")}
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}
