"use client";

import { ArrowLeft, Pencil, Plus, Search, ShieldCheck, Trash2, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";

function memberRows(workspace) {
  return workspace?.memberDetails?.length
    ? workspace.memberDetails
    : (workspace?.members || []).map((id) => ({ id, email: id, name: id }));
}

export function WorkspaceManagementPanel({
  canManageSharedWorkspaces,
  selectedWorkspaceId,
  workspaces,
  onAddWorkspaceMemberByEmail,
  onBackToMenu,
  onClose,
  onCreateSharedWorkspace,
  onDeleteSharedWorkspace,
  onEditSharedWorkspace,
  onRemoveWorkspaceMember,
  onSelectWorkspace,
}) {
  const sharedWorkspaces = useMemo(() => workspaces.filter((workspace) => workspace.scope === "workspace"), [workspaces]);
  const [query, setQuery] = useState("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    sharedWorkspaces.some((workspace) => workspace.id === selectedWorkspaceId) ? selectedWorkspaceId : sharedWorkspaces[0]?.id || null,
  );
  const [memberEmail, setMemberEmail] = useState("");
  const visibleWorkspaces = sharedWorkspaces.filter((workspace) => workspace.name.toLowerCase().includes(query.trim().toLowerCase()));
  const activeWorkspace =
    sharedWorkspaces.find((workspace) => workspace.id === activeWorkspaceId) || visibleWorkspaces[0] || sharedWorkspaces[0] || null;
  const members = memberRows(activeWorkspace);

  async function addMember(event) {
    event.preventDefault();
    if (!activeWorkspace?.id || !memberEmail.trim()) return;
    await onAddWorkspaceMemberByEmail(activeWorkspace.id, memberEmail.trim());
    setMemberEmail("");
  }

  function selectWorkspace(workspace) {
    setActiveWorkspaceId(workspace.id);
    onSelectWorkspace?.(workspace.id);
  }

  return (
    <div className="settings-layer" role="dialog" aria-modal="true" aria-label="Workspace management">
      <button className="settings-backdrop" onClick={onClose} aria-label="Close workspace management" type="button" />
      <section className="settings-page workspace-management-page">
        <div className="settings-header">
          <div>
            <p>Workspaces</p>
            <h2>Workspace management</h2>
          </div>
          <div className="panel-header-actions">
            <button className="secondary-button panel-back-button" onClick={onBackToMenu} type="button">
              <ArrowLeft size={16} />
              Back to menu
            </button>
            <button className="top-icon" onClick={onClose} title="Close workspace management" type="button">
              <X size={20} />
            </button>
          </div>
        </div>

        {sharedWorkspaces.length === 0 ? (
          <div className="workspace-empty-state">
            <span>
              <UsersRound size={30} />
            </span>
            <h3>There are no workspaces that you are part of.</h3>
            <p>
              Shared workspaces appear here when an admin creates one and adds your email. Personal workspaces remain in
              the sidebar and stay private to you.
            </p>
            {canManageSharedWorkspaces && (
              <button className="secondary-button" onClick={onCreateSharedWorkspace} type="button">
                <Plus size={16} />
                Create shared workspace
              </button>
            )}
          </div>
        ) : (
          <div className="workspace-management-grid">
            <aside className="workspace-management-list">
              <div className="workspace-management-toolbar">
                <div className="doc-search">
                  <Search size={17} />
                  <input onChange={(event) => setQuery(event.target.value)} placeholder="Search workspaces" value={query} />
                </div>
                {canManageSharedWorkspaces && (
                  <button className="top-icon" onClick={onCreateSharedWorkspace} title="Create shared workspace" type="button">
                    <Plus size={18} />
                  </button>
                )}
              </div>
              {visibleWorkspaces.length ? (
                visibleWorkspaces.map((workspace) => (
                  <button
                    className={`workspace-management-item ${activeWorkspace?.id === workspace.id ? "active" : ""}`}
                    key={workspace.id}
                    onClick={() => selectWorkspace(workspace)}
                    type="button"
                  >
                    <strong>{workspace.name}</strong>
                    <span>{memberRows(workspace).length} users · {workspace.ragEnabled === false ? "RAG off" : "RAG on"}</span>
                  </button>
                ))
              ) : (
                <div className="empty-sidebar-copy">No workspaces match your search.</div>
              )}
            </aside>

            <section className="workspace-management-detail">
              <div className="workspace-detail-head">
                <div>
                  <span className="enterprise-role-pill">{activeWorkspace?.ragEnabled === false ? "RAG off" : "RAG on"}</span>
                  <h3>{activeWorkspace?.name}</h3>
                  <p>{canManageSharedWorkspaces ? "Manage users, settings, and shared workspace lifecycle." : "Users and shared context available to this workspace."}</p>
                </div>
                {canManageSharedWorkspaces && activeWorkspace && (
                  <div className="workspace-detail-actions">
                    <button className="secondary-button" onClick={() => onEditSharedWorkspace(activeWorkspace.id)} type="button">
                      <Pencil size={16} />
                      Edit
                    </button>
                    <button className="secondary-button danger" onClick={() => onDeleteSharedWorkspace(activeWorkspace.id)} type="button">
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {canManageSharedWorkspaces && activeWorkspace && (
                <form className="workspace-management-add" onSubmit={addMember}>
                  <input
                    onChange={(event) => setMemberEmail(event.target.value)}
                    placeholder="Add user by email"
                    type="email"
                    value={memberEmail}
                  />
                  <button className="secondary-button" disabled={!memberEmail.trim()} type="submit">
                    <Plus size={16} />
                    Add user
                  </button>
                </form>
              )}

              <div className="workspace-member-table">
                <div className="workspace-member-table-head">
                  <span>Users</span>
                  <span>{members.length}</span>
                </div>
                {members.length ? (
                  members.map((member) => (
                    <div className="workspace-member-table-row" key={member.id}>
                      <span>
                        <UsersRound size={16} />
                      </span>
                      <div>
                        <strong>{member.name || member.email || member.id}</strong>
                        <small>{member.email || member.id}</small>
                      </div>
                      {canManageSharedWorkspaces && (
                        <button onClick={() => onRemoveWorkspaceMember(activeWorkspace.id, member.id)} type="button">
                          Remove
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="workspace-no-members">
                    <ShieldCheck size={24} />
                    <strong>No users added yet.</strong>
                    <span>Add users by email to grant access to this workspace.</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

