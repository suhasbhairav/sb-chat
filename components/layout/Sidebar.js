import { FolderPlus, MessageSquarePlus, PanelLeft, Pencil, Plus, Search, Sparkles, Trash2, Users } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useState } from "react";

export function Sidebar({
  activeChatId,
  branding,
  chats,
  folders,
  isOpen,
  searchQuery,
  selectedFolderId,
  selectedWorkspaceId,
  workspaces,
  canManageSharedWorkspaces,
  onChangeSearch,
  onClose,
  onCreateFolder,
  onCreateWorkspace,
  onCreateSharedWorkspace,
  onDeleteSharedWorkspace,
  onEditSharedWorkspace,
  onAddWorkspaceMemberByEmail,
  onRemoveWorkspaceMember,
  onDeleteChat,
  onMoveChat,
  onNewChat,
  onSelectChat,
  onSelectFolder,
  onSelectWorkspace,
}) {
  const { t } = useI18n();
  const brandEnabled = Boolean(branding?.enabled || branding?.logoUrl);
  const productName = brandEnabled ? branding.productName : "Batuk";
  const visibleFolders = folders.filter((folder) => folder.workspaceId === selectedWorkspaceId);
  const visibleChats = chats.filter((chat) => chat.workspaceId === selectedWorkspaceId);
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
  const selectedWorkspaceMembers = selectedWorkspace?.memberDetails?.length
    ? selectedWorkspace.memberDetails
    : (selectedWorkspace?.members || []).map((id) => ({ id, email: id }));
  const [memberEmail, setMemberEmail] = useState("");

  async function addMember(event) {
    event.preventDefault();
    if (!selectedWorkspace?.id || !memberEmail.trim()) return;
    await onAddWorkspaceMemberByEmail(selectedWorkspace.id, memberEmail.trim());
    setMemberEmail("");
  }

  return (
    <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
      <div className="sidebar-top">
        <BrandMark initials={brandEnabled ? branding.logoInitials : "SB"} logoUrl={brandEnabled ? branding.logoUrl : ""} />
        <div className="brand-name">
          <span>{productName}</span>
          {brandEnabled && branding.tagline && <small>{branding.tagline}</small>}
        </div>
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
        {canManageSharedWorkspaces && (
          <button onClick={onCreateSharedWorkspace} type="button">
            <Users size={20} />
            Shared workspace
          </button>
        )}
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
          <div className="workspace-row" key={workspace.id}>
            <button
              className={`sidebar-link ${workspace.id === selectedWorkspaceId ? "active" : ""}`}
              onClick={() => onSelectWorkspace(workspace.id)}
              type="button"
            >
              <span>{workspace.scope === "workspace" ? "@" : "#"}</span>
              {workspace.name}
            </button>
            {canManageSharedWorkspaces && workspace.scope === "workspace" && (
              <div className="workspace-actions">
                <button onClick={() => onEditSharedWorkspace(workspace.id)} title="Edit shared workspace" type="button">
                  <Pencil size={13} />
                </button>
                <button onClick={() => onDeleteSharedWorkspace(workspace.id)} title="Delete shared workspace" type="button">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {canManageSharedWorkspaces && selectedWorkspace?.scope === "workspace" && (
        <div className="sidebar-section workspace-members">
          <div className="section-heading-row">
            <p>Users</p>
            <span className="workspace-rag-pill">{selectedWorkspace.ragEnabled === false ? "RAG off" : "RAG on"}</span>
          </div>
          <form className="workspace-member-form" onSubmit={addMember}>
            <input
              onChange={(event) => setMemberEmail(event.target.value)}
              placeholder="user@example.com"
              type="email"
              value={memberEmail}
            />
            <button type="submit" title="Add user by email">
              <Plus size={14} />
            </button>
          </form>
          <div className="workspace-member-list">
            {selectedWorkspaceMembers.length ? (
              selectedWorkspaceMembers.map((member) => (
                <div className="workspace-member-row" key={member.id}>
                  <span>{member.email || member.name || member.id}</span>
                  <button onClick={() => onRemoveWorkspaceMember(selectedWorkspace.id, member.id)} title={`Remove ${member.email || member.id}`} type="button">
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-sidebar-copy">No users added.</div>
            )}
          </div>
        </div>
      )}

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
