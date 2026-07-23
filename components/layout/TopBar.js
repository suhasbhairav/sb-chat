import { BarChart3, BookOpen, ChevronDown, FileText, Menu, PanelLeft, Plus, Settings2, Workflow } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export function TopBar({
  model,
  documentChatEnabled,
  sidebarOpen,
  temporaryChat,
  onOpenDocuments,
  onOpenSettings,
  onOpenSidebar,
  onOpenUsage,
  onOpenDocs,
  onOpenAgents,
  onToggleTemporaryChat,
  onToggleDocumentChat,
}) {
  const { t } = useI18n();
  const documentChatLabel = documentChatEnabled ? t("topbar.documentChatEnabled") : t("topbar.documentChatOff");
  const temporaryChatLabel = temporaryChat ? t("topbar.temporaryEnabled") : t("topbar.enableTemporary");

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className={`top-icon sidebar-open-button ${sidebarOpen ? "lg-hidden" : ""}`}
          onClick={onOpenSidebar}
          title={t("topbar.openSidebar")}
          type="button"
        >
          {sidebarOpen ? <Menu size={20} /> : <PanelLeft size={20} />}
        </button>
        <div className="model-title">
          <button className="model-button" onClick={onOpenSettings} type="button">
            {model || t("topbar.selectModel")}
            <ChevronDown size={18} />
          </button>
          <button className="model-plus" onClick={onOpenSettings} title={t("topbar.configureModels")} type="button">
            <Plus size={16} />
          </button>
          <span>{t("topbar.setDefault")}</span>
        </div>
      </div>

      <div className="topbar-actions">
        <button
          className={`doc-chat-toggle ${documentChatEnabled ? "active" : ""}`}
          aria-label={documentChatLabel}
          data-tooltip={documentChatLabel}
          onClick={onToggleDocumentChat}
          title={documentChatLabel}
          type="button"
        >
          <FileText size={16} />
          <span>{documentChatEnabled ? t("topbar.documentChatOn") : t("topbar.documentChatOff")}</span>
        </button>
        <button
          aria-label={t("topbar.agentBuilder")}
          className="top-icon"
          data-tooltip={t("topbar.agentBuilder")}
          onClick={onOpenAgents}
          title={t("topbar.agentBuilder")}
          type="button"
        >
          <Workflow size={19} />
        </button>
        <button
          aria-label={t("topbar.openDocuments")}
          className="top-icon"
          data-tooltip={t("topbar.openDocuments")}
          onClick={onOpenDocuments}
          title={t("topbar.openDocuments")}
          type="button"
        >
          <FileText size={19} />
        </button>
        <button
          className={`top-icon dotted ${temporaryChat ? "is-temporary" : ""}`}
          aria-label={temporaryChatLabel}
          data-tooltip={temporaryChatLabel}
          onClick={onToggleTemporaryChat}
          title={temporaryChatLabel}
          type="button"
        />
        <button
          aria-label={t("topbar.providerSettings")}
          className="top-icon"
          data-tooltip={t("topbar.providerSettings")}
          onClick={onOpenSettings}
          title={t("topbar.providerSettings")}
          type="button"
        >
          <Settings2 size={19} />
        </button>
        <button
          aria-label={t("topbar.tokenUsage")}
          className="top-icon"
          data-tooltip={t("topbar.tokenUsage")}
          onClick={onOpenUsage}
          title={t("topbar.tokenUsage")}
          type="button"
        >
          <BarChart3 size={19} />
        </button>
        <button
          aria-label={t("topbar.documentation")}
          className="top-icon"
          data-tooltip={t("topbar.documentation")}
          onClick={onOpenDocs}
          title={t("topbar.documentation")}
          type="button"
        >
          <BookOpen size={19} />
        </button>
      </div>
    </header>
  );
}
