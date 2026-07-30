"use client";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { AuthGate } from "@/components/auth/AuthGate";
import { DocumentationPanel } from "@/components/docs/DocumentationPanel";
import { DocumentsPanel } from "@/components/docs/DocumentsPanel";
import { EmptyChat } from "@/components/chat/EmptyChat";
import { EnterprisePanel } from "@/components/enterprise/EnterprisePanel";
import { AuditPanel } from "@/components/audit/AuditPanel";
import { I18nProvider, useI18n } from "@/components/i18n/I18nProvider";
import { AppFooter } from "@/components/layout/AppFooter";
import { AgentWorkflowBuilder } from "@/components/agents/AgentWorkflowBuilder";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { SkillsDashboard } from "@/components/skills/SkillsDashboard";
import { McpDashboard } from "@/components/mcp/McpDashboard";
import { TokenUsagePanel } from "@/components/usage/TokenUsagePanel";
import { ApiManagementPanel } from "@/components/api/ApiManagementPanel";
import { AppMenuPanel } from "@/components/menu/AppMenuPanel";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { WorkspaceManagementPanel } from "@/components/workspaces/WorkspaceManagementPanel";
import { useChatController } from "@/hooks/useChatController";

export default function Home() {
  return (
    <AuthGate>
      <AuthenticatedHome />
    </AuthGate>
  );
}

function AuthenticatedHome() {
  const chat = useChatController();

  return (
    <I18nProvider locale={chat.locale}>
      <HomeShell chat={chat} />
    </I18nProvider>
  );
}

function HomeShell({ chat }) {
  const { dir, t } = useI18n();

  async function openMenuItem(item) {
    chat.setAppMenuOpen(false);
    if (item === "settings") {
      await chat.refreshBranding().catch(() => {});
      chat.setSettingsOpen(true);
    }
    if (item === "api") chat.setApiManagementOpen(true);
    if (item === "workspaces") chat.setWorkspaceManagementOpen(true);
    if (item === "history") chat.setHistoryOpen(true);
    if (item === "usage") chat.setUsageOpen(true);
    if (item === "enterprise") chat.setEnterpriseOpen(true);
    if (item === "audit") chat.setAuditOpen(true);
  }

  function backToMenu() {
    chat.setSettingsOpen(false);
    chat.setHistoryOpen(false);
    chat.setWorkspaceManagementOpen(false);
    chat.setApiManagementOpen(false);
    chat.setUsageOpen(false);
    chat.setEnterpriseOpen(false);
    chat.setAuditOpen(false);
    chat.setAppMenuOpen(true);
  }

  const composer = (
    <ChatComposer
      attachmentError={chat.attachmentError}
      attachmentInputRef={chat.chatAttachmentInputRef}
      attachmentStatus={chat.attachmentStatus}
      attachments={chat.chatAttachments}
      canSend={chat.canSend}
      hasMessages={chat.hasMessages}
      input={chat.input}
      inputRef={chat.inputRef}
      isSending={chat.isSending}
      queuedMessages={chat.queuedMessages}
      provider={chat.provider}
      webSearchEnabled={chat.webSearchEnabled}
      onChange={chat.setInput}
      onDeleteQueuedMessage={chat.deleteQueuedMessage}
      onEditQueuedMessage={chat.editQueuedMessage}
      onRemoveAttachment={chat.removeChatAttachment}
      onSendQueuedMessageNext={chat.sendQueuedMessageNext}
      onSubmit={chat.sendMessage}
      onUploadAttachments={chat.uploadChatAttachments}
      onToggleWebSearch={() => chat.setWebSearchEnabled((value) => !value)}
      onToggleVoiceChat={chat.toggleVoiceChat}
      voiceState={chat.voiceState}
    />
  );

  return (
    <main
      className={`app-shell ${chat.branding?.enabled ? "is-whitelabeled" : ""}`}
      dir={dir}
      style={chat.branding?.enabled ? { "--brand-accent": chat.branding.accentColor } : undefined}
    >
      <Sidebar
        activeChatId={chat.activeChatId}
        branding={chat.branding}
        chats={chat.visibleChats}
        folders={chat.folders}
        isOpen={chat.sidebarOpen}
        searchQuery={chat.searchQuery}
        selectedFolderId={chat.selectedFolderId}
        selectedWorkspaceId={chat.selectedWorkspaceId}
        workspaces={chat.workspaces}
        onChangeSearch={chat.setSearchQuery}
        onClose={() => chat.setSidebarOpen(false)}
        onCreateFolder={chat.createFolder}
        onCreateWorkspace={chat.createWorkspace}
        onDeleteChat={chat.deleteSavedChat}
        onMoveChat={chat.moveSavedChat}
        onNewChat={chat.newChat}
        onSelectChat={chat.selectChat}
        onSelectFolder={chat.selectFolder}
        onSelectWorkspace={chat.selectWorkspace}
      />

      {chat.sidebarOpen && (
        <button className="mobile-scrim" onClick={() => chat.setSidebarOpen(false)} aria-label={t("sidebar.collapse")} type="button" />
      )}

      <section className="chat-stage">
        <TopBar
          branding={chat.branding}
          brandingOrganization={chat.brandingOrganization}
          activeMcpIntegration={chat.activeMcpIntegration}
          activeMcpIntegrationId={chat.activeMcpIntegrationId}
          documentChatEnabled={chat.documentChatEnabled}
          mcpIntegrations={chat.mcpIntegrations}
          model={chat.model}
          sidebarOpen={chat.sidebarOpen}
          temporaryChat={chat.temporaryChat}
          onOpenDocuments={() => chat.setDocumentsOpen(true)}
          onOpenAgents={() => {
            chat.setAuditOpen(false);
            chat.setSkillsOpen(false);
            chat.setMcpOpen(false);
            chat.setEnterpriseOpen(false);
            chat.setAgentBuilderOpen(true);
          }}
          onOpenAudit={() => {
            chat.setAgentBuilderOpen(false);
            chat.setEnterpriseOpen(false);
            chat.setSkillsOpen(false);
            chat.setMcpOpen(false);
            chat.setAuditOpen(true);
          }}
          onOpenEnterprise={() => {
            chat.setAuditOpen(false);
            chat.setAgentBuilderOpen(false);
            chat.setSkillsOpen(false);
            chat.setMcpOpen(false);
            chat.refreshBranding().catch(() => {});
            chat.setEnterpriseOpen(true);
          }}
          onOpenSkills={() => {
            chat.setAuditOpen(false);
            chat.setAgentBuilderOpen(false);
            chat.setEnterpriseOpen(false);
            chat.setMcpOpen(false);
            chat.setSkillsOpen(true);
          }}
          onOpenMcp={() => {
            chat.setAuditOpen(false);
            chat.setAgentBuilderOpen(false);
            chat.setEnterpriseOpen(false);
            chat.setSkillsOpen(false);
            chat.refreshMcp().catch(() => {});
            chat.setMcpOpen(true);
          }}
          onSelectMcp={chat.setActiveMcp}
          onOpenDocs={() => chat.setDocsOpen(true)}
          onOpenMenu={() => chat.setAppMenuOpen(true)}
          onOpenSettings={async () => {
            await chat.refreshBranding().catch(() => {});
            chat.setSettingsOpen(true);
          }}
          onOpenSidebar={() => chat.setSidebarOpen(true)}
          onToggleDocumentChat={() => chat.setDocumentChatEnabled((value) => !value)}
          onToggleTemporaryChat={() => chat.setTemporaryChat((value) => !value)}
        />

        {chat.auditOpen ? (
          <AuditPanel onClose={() => chat.setAuditOpen(false)} onBackToMenu={backToMenu} />
        ) : chat.enterpriseOpen ? (
          <EnterprisePanel
            branding={chat.branding}
            brandingOrganization={chat.brandingOrganization}
          onClose={() => chat.setEnterpriseOpen(false)}
          onBackToMenu={backToMenu}
            onRefreshBranding={chat.refreshBranding}
            onSaveBranding={chat.saveBranding}
            onUploadBrandingLogo={chat.uploadBrandingLogo}
            onRemoveBrandingLogo={chat.removeBrandingLogo}
          />
        ) : chat.mcpOpen ? (
          <McpDashboard
            activeIntegrationId={chat.activeMcpIntegrationId}
            catalog={chat.mcpCatalog}
            integrations={chat.mcpIntegrations}
            onClose={() => chat.setMcpOpen(false)}
            onDiscover={chat.discoverMcp}
            onDelete={chat.deleteMcp}
            onSave={chat.saveMcpIntegration}
            onSelectActive={chat.setActiveMcp}
            onStartOAuth={chat.startMcpOAuth}
          />
        ) : chat.skillsOpen ? (
          <SkillsDashboard onClose={() => chat.setSkillsOpen(false)} />
        ) : chat.agentBuilderOpen ? (
          <AgentWorkflowBuilder
            apiKey={chat.apiKey}
            baseUrl={chat.baseUrl}
            guardrails={chat.guardrails}
            model={chat.model}
            provider={chat.provider}
            temperature={chat.temperature}
            onClose={() => chat.setAgentBuilderOpen(false)}
            onWorkflowComplete={chat.completeAgentWorkflow}
          />
        ) : (
          <>
            {chat.documentChatEnabled && (
              <div className="document-chat-banner">
                {t("banners.documentChat")}
              </div>
            )}

            {chat.activeMcpIntegration && (
              <div className="mcp-chat-banner">
                <span>
                  <strong>MCP connected:</strong> {chat.activeMcpIntegration.name}
                  {chat.activeMcpIntegration.status === "connected" ? ` · ${chat.activeMcpIntegration.discovery?.tools?.length || 0} tools discovered` : ""}
                  {" · In alpha, PoC stage"}
                </span>
                <button onClick={() => chat.setActiveMcp("")} type="button">Disconnect</button>
              </div>
            )}

            {chat.temporaryChat && (
              <div className="temporary-banner">
                {t("banners.temporaryChat")}
              </div>
            )}

            <div className={`chat-body ${chat.hasMessages ? "with-messages" : "empty"}`}>
              {!chat.hasMessages ? (
                <EmptyChat branding={chat.branding} composer={composer} model={chat.model} onPickSuggestion={chat.pickSuggestion} />
              ) : (
                <>
                  <ChatMessages
                    copiedId={chat.copiedId}
                    messages={chat.messages}
                    model={chat.model}
                    onCopyMessage={chat.copyMessage}
                    onDeleteMessage={chat.deleteMessage}
                    onEditMessage={chat.editMessage}
                    onRememberMessage={chat.rememberMessage}
                    scrollRef={chat.scrollRef}
                  />
                  <div className="docked-composer">
                    {composer}
                    <AppFooter />
                  </div>
                </>
              )}
              </div>
          </>
        )}
      </section>

      {chat.settingsOpen && (
        <SettingsPanel
          apiKey={chat.apiKey}
          baseUrl={chat.baseUrl}
          currentProvider={chat.currentProvider}
          folders={chat.folders}
          guardrails={chat.guardrails}
          hasMessages={chat.hasMessages}
          importChatsRef={chat.importChatsRef}
          memories={chat.memories}
          memoryEnabled={chat.memoryEnabled}
          memoryError={chat.memoryError}
          model={chat.model}
          modelCatalog={chat.modelCatalog}
          modelCatalogError={chat.modelCatalogError}
          modelCatalogSource={chat.modelCatalogSource}
          modelCatalogStatus={chat.modelCatalogStatus}
          provider={chat.provider}
          realtimeModel={chat.realtimeModel}
          resolvedRealtimeModel={chat.resolvedRealtimeModel}
          selectedFolderId={chat.selectedFolderId}
          selectedWorkspaceId={chat.selectedWorkspaceId}
          temperature={chat.temperature}
          temporaryChat={chat.temporaryChat}
          theme={chat.theme}
          locale={chat.locale}
          voiceError={chat.voiceError}
          voiceState={chat.voiceState}
          onAddMemory={chat.addMemory}
          onChangeApiKey={chat.setApiKey}
          onChangeBaseUrl={chat.setBaseUrl}
          onChangeModel={chat.setModel}
          onChangeProvider={chat.changeProvider}
          onChangeRealtimeModel={chat.setRealtimeModel}
          onChangeTemperature={chat.setTemperature}
          onChangeLocale={chat.setLocale}
          onClearMessages={chat.clearMessages}
          onClose={() => chat.setSettingsOpen(false)}
          onBackToMenu={backToMenu}
          onExportChat={chat.exportChat}
          onExportChatLibrary={chat.exportChatLibrary}
          onImportChatLibrary={chat.importChatLibrary}
          onMoveChat={chat.moveActiveChat}
          onResetTokenUsage={chat.resetTokenUsage}
          onSaveChat={() => chat.saveChat()}
          onToggleGuardrails={() => chat.setGuardrails((value) => !value)}
          onToggleMemory={() => chat.setMemoryEnabled((value) => !value)}
          onToggleTemporaryChat={() => chat.setTemporaryChat((value) => !value)}
          onToggleTheme={() => chat.setTheme(chat.theme === "dark" ? "light" : "dark")}
          onToggleVoiceChat={chat.toggleVoiceChat}
          onUpdateMemory={chat.updateMemory}
          onDeleteMemory={chat.deleteMemory}
        />
      )}

      {chat.appMenuOpen && (
        <AppMenuPanel
          canManageAdmin={chat.canManageSharedWorkspaces}
          onClose={() => chat.setAppMenuOpen(false)}
          onOpen={openMenuItem}
        />
      )}
      {chat.apiManagementOpen && (
        <ApiManagementPanel
          onClose={() => chat.setApiManagementOpen(false)}
          onBackToMenu={backToMenu}
        />
      )}
      {chat.workspaceManagementOpen && (
        <WorkspaceManagementPanel
          canManageSharedWorkspaces={chat.canManageSharedWorkspaces}
          selectedWorkspaceId={chat.selectedWorkspaceId}
          workspaces={chat.workspaces}
          onAddWorkspaceMemberByEmail={chat.addWorkspaceMemberByEmail}
          onBackToMenu={backToMenu}
          onClose={() => chat.setWorkspaceManagementOpen(false)}
          onCreateSharedWorkspace={chat.createSharedWorkspace}
          onDeleteSharedWorkspace={chat.deleteSharedWorkspace}
          onEditSharedWorkspace={chat.editSharedWorkspace}
          onRemoveWorkspaceMember={chat.removeWorkspaceMember}
          onSelectWorkspace={chat.selectWorkspace}
        />
      )}
      {chat.historyOpen && (
        <HistoryPanel
          folders={chat.folders}
          hasMessages={chat.hasMessages}
          importChatsRef={chat.importChatsRef}
          selectedFolderId={chat.selectedFolderId}
          selectedWorkspaceId={chat.selectedWorkspaceId}
          temporaryChat={chat.temporaryChat}
          onClearMessages={chat.clearMessages}
          onClose={() => chat.setHistoryOpen(false)}
          onBackToMenu={backToMenu}
          onExportChat={chat.exportChat}
          onExportChatLibrary={chat.exportChatLibrary}
          onImportChatLibrary={chat.importChatLibrary}
          onMoveChat={chat.moveActiveChat}
          onSaveChat={() => chat.saveChat()}
        />
      )}
      {chat.usageOpen && <TokenUsagePanel usage={chat.tokenUsage} onClose={() => chat.setUsageOpen(false)} onBackToMenu={backToMenu} onResetTokenUsage={chat.resetTokenUsage} />}
      {chat.docsOpen && <DocumentationPanel onClose={() => chat.setDocsOpen(false)} />}
      {chat.documentsOpen && (
        <DocumentsPanel
          apiKey={chat.apiKey}
          documentChatEnabled={chat.documentChatEnabled}
          openAIBaseUrl={chat.provider === "openai" ? chat.baseUrl : "https://api.openai.com/v1"}
          selectedWorkspaceId={chat.selectedWorkspaceId}
          onClose={() => chat.setDocumentsOpen(false)}
          onToggleDocumentChat={() => chat.setDocumentChatEnabled((value) => !value)}
        />
      )}
    </main>
  );
}
