import { BookOpen, ChevronDown, FileText, Menu, PanelLeft, PlugZap, Plus, Sparkles, Workflow } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { useI18n } from "@/components/i18n/I18nProvider";

export function TopBar({
  branding,
  brandingOrganization,
  activeMcpIntegration,
  activeMcpIntegrationId,
  mcpIntegrations = [],
  model,
  documentChatEnabled,
  sidebarOpen,
  temporaryChat,
  onOpenDocuments,
  onOpenMenu,
  onOpenSettings,
  onOpenSidebar,
  onOpenDocs,
  onOpenAgents,
  onOpenSkills,
  onOpenMcp,
  onSelectMcp,
  onToggleTemporaryChat,
  onToggleDocumentChat,
}) {
  const { t } = useI18n();
  const brandEnabled = Boolean(branding?.enabled || branding?.logoUrl);
  const documentChatLabel = documentChatEnabled ? t("topbar.documentChatEnabled") : t("topbar.documentChatOff");
  const temporaryChatLabel = temporaryChat ? t("topbar.temporaryEnabled") : t("topbar.enableTemporary");

  return (
    <header className="topbar">
      <div className="topbar-left">
        {brandEnabled && (
          <div className="topbar-brand-mark" title={branding.productName}>
            <BrandMark initials={branding.logoInitials} logoUrl={branding.logoUrl} />
          </div>
        )}
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
          {brandEnabled && (
            <span className="topbar-brand-chip">
              {branding.productName}
              {branding.showOrgName && brandingOrganization?.organizationName ? ` · ${brandingOrganization.organizationName}` : ""}
            </span>
          )}
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
          aria-label={t("topbar.skills")}
          className="top-icon"
          data-tooltip={t("topbar.skills")}
          onClick={onOpenSkills}
          title={t("topbar.skills")}
          type="button"
        >
          <Sparkles size={19} />
        </button>
        <button
          aria-label="MCP integrations, in alpha PoC stage"
          className={`top-icon ${activeMcpIntegration ? "mcp-active-icon" : ""}`}
          data-tooltip="MCP integrations · In alpha, PoC stage"
          onClick={onOpenMcp}
          title={activeMcpIntegration ? `MCP: ${activeMcpIntegration.name} · In alpha, PoC stage` : "MCP integrations · In alpha, PoC stage"}
          type="button"
        >
          <PlugZap size={19} />
        </button>
        {mcpIntegrations.length > 0 && (
          <label className={`mcp-topbar-select ${activeMcpIntegration ? "active" : ""}`} title={activeMcpIntegration ? `Chatting with ${activeMcpIntegration.name} · In alpha, PoC stage` : "No MCP selected · In alpha, PoC stage"}>
            <PlugZap size={15} />
            <select aria-label="Select MCP product for chat" value={activeMcpIntegrationId || ""} onChange={(event) => onSelectMcp(event.target.value)}>
              <option value="">No MCP</option>
              {mcpIntegrations.map((integration) => (
                <option key={integration.id} value={integration.id}>
                  {integration.name}
                </option>
              ))}
            </select>
          </label>
        )}
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
          aria-label={t("topbar.documentation")}
          className="top-icon"
          data-tooltip={t("topbar.documentation")}
          onClick={onOpenDocs}
          title={t("topbar.documentation")}
          type="button"
        >
          <BookOpen size={19} />
        </button>
        <button
          aria-label="Open menu"
          className="top-icon"
          data-tooltip="Menu"
          onClick={onOpenMenu}
          title="Menu"
          type="button"
        >
          <Menu size={19} />
        </button>
      </div>
    </header>
  );
}
