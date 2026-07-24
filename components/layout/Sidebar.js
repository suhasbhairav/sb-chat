import { FolderPlus, MessageSquarePlus, PanelLeft, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { useI18n } from "@/components/i18n/I18nProvider";

export function Sidebar({
  activeChatId,
  chats,
  folders,
  isOpen,
  searchQuery,
  selectedFolderId,
  selectedWorkspaceId,
  workspaces,
  onChangeSearch,
  onClose,
  onCreateFolder,
  onCreateWorkspace,
  onDeleteChat,
  onMoveChat,
  onNewChat,
  onSelectChat,
  onSelectFolder,
  onSelectWorkspace,
}) {
  const { t } = useI18n();
  const visibleFolders = folders.filter((folder) => folder.workspaceId === selectedWorkspaceId);
  const visibleChats = chats.filter((chat) => chat.workspaceId === selectedWorkspaceId);

  return (
    <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
      <div className="sidebar-top">
        <BrandMark />
        <div className="brand-name">Batuk</div>
        <button className="nav-icon ml-auto" onClick={onClose} title={t("sidebar.collapse")} type="button">
          <PanelLeft size={18} />
        </button>
      </div>

      <nav className="main-nav">
        <button onClick={onNewChat} type="button">
          <MessageSquarePlus size={20} />
          {t("sidebar.newChat")}
        </button>
        <button onClick={onCreateWorkspace} type="button">
          <Sparkles size={20} />
          {t("sidebar.newWorkspace")}
        </button>
      </nav>

      <div className="sidebar-search">
        <Search size={17} />
        <input
          id="chat-search"
          onChange={(event) => onChangeSearch(event.target.value)}
          placeholder={t("sidebar.searchChats")}
          value={searchQuery}
        />
      </div>

      <div className="sidebar-section">
        <div className="section-heading-row">
          <p>{t("sidebar.workspaces")}</p>
          <button className="small-inline-button" onClick={onCreateWorkspace} title={t("sidebar.createWorkspace")} type="button">
            <Plus size={15} />
          </button>
        </div>
        {workspaces.map((workspace) => (
          <button
            className={`sidebar-link ${workspace.id === selectedWorkspaceId ? "active" : ""}`}
            key={workspace.id}
            onClick={() => onSelectWorkspace(workspace.id)}
            type="button"
          >
            <span>#</span>
            {workspace.name}
          </button>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="section-heading-row">
          <p>{t("sidebar.folders")}</p>
          <button className="small-inline-button" onClick={onCreateFolder} title={t("sidebar.createFolder")} type="button">
            <FolderPlus size={15} />
          </button>
        </div>
        <button
          className={`sidebar-link ${selectedFolderId === null ? "active" : ""}`}
          onClick={() => onSelectFolder(null)}
          type="button"
        >
          <span>⌂</span>
          {t("common.allChats")}
        </button>
        {visibleFolders.map((folder) => (
          <button
            className={`sidebar-link ${folder.id === selectedFolderId ? "active" : ""}`}
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            type="button"
          >
            <span>{folder.icon}</span>
            {folder.name}
          </button>
        ))}
      </div>

      <div className="sidebar-section sidebar-chats">
        <p>{t("sidebar.chats")}</p>
        <span className="date-label">{searchQuery ? t("sidebar.searchResults") : t("sidebar.today")}</span>
        {visibleChats.length === 0 ? (
          <div className="empty-sidebar-copy">{t("sidebar.noSavedChats")}</div>
        ) : (
          visibleChats.map((chat) => (
            <div className={`chat-history-row ${chat.id === activeChatId ? "active" : ""}`} key={chat.id}>
              <button className="chat-history-item" onClick={() => onSelectChat(chat.id)} type="button">
                <span>▣</span>
                {chat.title}
              </button>
              <button className="delete-chat-button" onClick={() => onDeleteChat(chat.id)} title={t("sidebar.deleteChat")} type="button">
                <Trash2 size={14} />
              </button>
              <select
                aria-label={t("sidebar.moveToFolder", { title: chat.title })}
                className="chat-folder-select"
                onChange={(event) => onMoveChat(chat.id, event.target.value || null)}
                onClick={(event) => event.stopPropagation()}
                value={chat.folderId || ""}
              >
                <option value="">{t("common.allChats")}</option>
                {visibleFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
