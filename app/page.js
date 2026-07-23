"use client";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { AuthGate } from "@/components/auth/AuthGate";
import { DocumentationPanel } from "@/components/docs/DocumentationPanel";
import { DocumentsPanel } from "@/components/docs/DocumentsPanel";
import { EmptyChat } from "@/components/chat/EmptyChat";
import { I18nProvider, useI18n } from "@/components/i18n/I18nProvider";
import { AppFooter } from "@/components/layout/AppFooter";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { TokenUsagePanel } from "@/components/usage/TokenUsagePanel";
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

  const composer = (
    <ChatComposer
      canSend={chat.canSend}
      hasMessages={chat.hasMessages}
      input={chat.input}
      inputRef={chat.inputRef}
      isSending={chat.isSending}
      provider={chat.provider}
      webSearchEnabled={chat.webSearchEnabled}
      onChange={chat.setInput}
      onSubmit={chat.sendMessage}
      onToggleWebSearch={() => chat.setWebSearchEnabled((value) => !value)}
      onToggleVoiceChat={chat.toggleVoiceChat}
      voiceState={chat.voiceState}
    />
  );

  return (
    <main className="app-shell" dir={dir}>
      <Sidebar
        activeChatId={chat.activeChatId}
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
          documentChatEnabled={chat.documentChatEnabled}
          model={chat.model}
          sidebarOpen={chat.sidebarOpen}
          temporaryChat={chat.temporaryChat}
          onOpenDocuments={() => chat.setDocumentsOpen(true)}
          onOpenDocs={() => chat.setDocsOpen(true)}
          onOpenSettings={() => chat.setSettingsOpen(true)}
          onOpenSidebar={() => chat.setSidebarOpen(true)}
          onOpenUsage={() => chat.setUsageOpen(true)}
          onToggleDocumentChat={() => chat.setDocumentChatEnabled((value) => !value)}
          onToggleTemporaryChat={() => chat.setTemporaryChat((value) => !value)}
        />

        {chat.documentChatEnabled && (
          <div className="document-chat-banner">
            {t("banners.documentChat")}
          </div>
        )}

        {chat.temporaryChat && (
          <div className="temporary-banner">
            {t("banners.temporaryChat")}
          </div>
        )}

        <div className={`chat-body ${chat.hasMessages ? "with-messages" : "empty"}`}>
          {!chat.hasMessages ? (
            <EmptyChat composer={composer} model={chat.model} onPickSuggestion={chat.pickSuggestion} />
          ) : (
            <>
              <ChatMessages
                copiedId={chat.copiedId}
                messages={chat.messages}
                model={chat.model}
                onCopyMessage={chat.copyMessage}
                scrollRef={chat.scrollRef}
              />
              <div className="docked-composer">
                {composer}
                <AppFooter />
              </div>
            </>
          )}
        </div>
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
          onChangeApiKey={chat.setApiKey}
          onChangeBaseUrl={chat.setBaseUrl}
          onChangeModel={chat.setModel}
          onChangeProvider={chat.changeProvider}
          onChangeRealtimeModel={chat.setRealtimeModel}
          onChangeTemperature={chat.setTemperature}
          onChangeLocale={chat.setLocale}
          onClearMessages={() => chat.setMessages([])}
          onClose={() => chat.setSettingsOpen(false)}
          onExportChat={chat.exportChat}
          onExportChatLibrary={chat.exportChatLibrary}
          onImportChatLibrary={chat.importChatLibrary}
          onMoveChat={chat.moveActiveChat}
          onSaveChat={() => chat.saveChat()}
          onToggleGuardrails={() => chat.setGuardrails((value) => !value)}
          onToggleTemporaryChat={() => chat.setTemporaryChat((value) => !value)}
          onToggleTheme={() => chat.setTheme(chat.theme === "dark" ? "light" : "dark")}
          onToggleVoiceChat={chat.toggleVoiceChat}
        />
      )}

      {chat.usageOpen && <TokenUsagePanel usage={chat.tokenUsage} onClose={() => chat.setUsageOpen(false)} />}
      {chat.docsOpen && <DocumentationPanel onClose={() => chat.setDocsOpen(false)} />}
      {chat.documentsOpen && (
        <DocumentsPanel
          apiKey={chat.apiKey}
          documentChatEnabled={chat.documentChatEnabled}
          openAIBaseUrl={chat.provider === "openai" ? chat.baseUrl : "https://api.openai.com/v1"}
          onClose={() => chat.setDocumentsOpen(false)}
          onToggleDocumentChat={() => chat.setDocumentChatEnabled((value) => !value)}
        />
      )}
    </main>
  );
}
