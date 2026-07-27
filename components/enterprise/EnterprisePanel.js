"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Crown, LockKeyhole, Palette, RefreshCw, ShieldCheck, Trash2, Upload, UsersRound, X } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";

const ROLE_OPTIONS = ["owner", "admin", "member", "viewer", "user"];

function makeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

async function enterpriseRequest(action, payload = {}) {
  const response = await fetch("/api/enterprise", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Enterprise action failed.");
  return data;
}

export function EnterprisePanel({
  branding,
  brandingOrganization,
  onBackToMenu,
  onClose,
  onRefreshBranding,
  onRemoveBrandingLogo,
  onSaveBranding,
  onUploadBrandingLogo,
}) {
  const [overview, setOverview] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [orgName, setOrgName] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [userDrafts, setUserDrafts] = useState({});
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [banReasonDrafts, setBanReasonDrafts] = useState({});
  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [busyAction, setBusyAction] = useState("");
  const [brandingDraft, setBrandingDraft] = useState(null);
  const [brandingStatus, setBrandingStatus] = useState("idle");
  const [brandingError, setBrandingError] = useState("");

  const activeOrganization = overview?.activeOrganization;
  const organizations = overview?.organizations || [];
  const members = activeOrganization?.members || [];
  const teams = activeOrganization?.teams || [];
  const invitations = activeOrganization?.invitations || [];
  const users = Array.isArray(overview?.users) ? overview.users : [];
  const canBootstrap = overview && !overview.adminStatus?.hasAdmin;
  const orgSlug = useMemo(() => makeSlug(orgName), [orgName]);
  const activeBranding = brandingDraft || branding;

  function updateBrandingDraft(patch) {
    setBrandingDraft((current) => ({
      ...(current || branding),
      ...patch,
    }));
  }

  async function load() {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/enterprise");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load enterprise console.");
      setOverview(data);
      setStatus("ready");
    } catch (loadError) {
      setError(loadError.message || "Could not load enterprise console.");
      setStatus("error");
    }
  }

  async function run(action, payload = {}, after) {
    setBusyAction(action);
    setError("");
    try {
      const data = await enterpriseRequest(action, payload);
      setOverview(data.overview);
      if (["createOrganization", "setActiveOrganization"].includes(payload.action || action)) {
        await onRefreshBranding?.();
        setBrandingDraft(null);
      }
      after?.();
    } catch (actionError) {
      setError(actionError.message || "Enterprise action failed.");
    } finally {
      setBusyAction("");
    }
  }

  function updateUserDraft(userId, patch) {
    setUserDrafts((drafts) => ({
      ...drafts,
      [userId]: {
        ...(drafts[userId] || {}),
        ...patch,
      },
    }));
  }

  function userDraft(user) {
    const draft = userDrafts[user.id] || {};
    return {
      name: draft.name ?? user.name ?? "",
      email: draft.email ?? user.email ?? "",
      role: draft.role ?? user.role ?? "user",
    };
  }

  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  async function handleSaveBranding(event) {
    event.preventDefault();
    setBrandingStatus("saving");
    setBrandingError("");
    try {
      const saved = await onSaveBranding(activeBranding);
      setBrandingDraft(saved);
      setBrandingStatus("saved");
      window.setTimeout(() => setBrandingStatus("idle"), 1400);
    } catch (saveError) {
      setBrandingError(saveError.message || "Could not save whitelabel settings.");
      setBrandingStatus("error");
    }
  }

  async function handleUploadLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBrandingStatus("saving");
    setBrandingError("");
    try {
      const saved = await onUploadBrandingLogo(file);
      setBrandingDraft(saved);
      setBrandingStatus("saved");
      window.setTimeout(() => setBrandingStatus("idle"), 1400);
      event.target.value = "";
    } catch (uploadError) {
      event.target.value = "";
      setBrandingError(uploadError.message || "Could not upload logo.");
      setBrandingStatus("error");
    }
  }

  async function handleRemoveLogo() {
    setBrandingStatus("saving");
    setBrandingError("");
    try {
      const saved = await onRemoveBrandingLogo();
      setBrandingDraft(saved);
      setBrandingStatus("saved");
      window.setTimeout(() => setBrandingStatus("idle"), 1400);
    } catch (removeError) {
      setBrandingError(removeError.message || "Could not remove logo.");
      setBrandingStatus("error");
    }
  }

  return (
    <section className="enterprise-panel">
      <header className="enterprise-header">
        <div>
          <span className="enterprise-eyebrow">
            <ShieldCheck size={16} />
            Better Auth enterprise
          </span>
          <h2>Teams, admins, users, and roles</h2>
        </div>
        <div className="enterprise-header-actions">
          <button className="secondary-button panel-back-button" onClick={onBackToMenu} type="button">
            <ArrowLeft size={16} />
            Back to menu
          </button>
          <button className="top-icon" onClick={load} title="Refresh enterprise data" type="button">
            <RefreshCw size={18} />
          </button>
          <button className="top-icon" onClick={onClose} title="Close enterprise console" type="button">
            <X size={18} />
          </button>
        </div>
      </header>

      {error && <p className="settings-error enterprise-error">{error}</p>}

      {status === "loading" && <div className="enterprise-empty">Loading enterprise workspace...</div>}

      {status !== "loading" && overview && (
        <div className="enterprise-grid">
          <section className="enterprise-section enterprise-identity">
            <div className="enterprise-section-title">
              <Crown size={17} />
              <h3>Current access</h3>
            </div>
            <p>{overview.currentUser?.name || overview.currentUser?.email}</p>
            <span className="enterprise-role-pill">{overview.currentUser?.role || "user"}</span>
            {canBootstrap && (
              <button className="secondary-button danger" disabled={busyAction === "claimFirstOwner"} onClick={() => run("claimFirstOwner")} type="button">
                Claim first owner
              </button>
            )}
          </section>

          <section className="enterprise-section">
            <div className="enterprise-section-title">
              <ShieldCheck size={17} />
              <h3>Identity integrations</h3>
            </div>
            <div className="enterprise-chip-list">
              {Object.entries(overview.integrations || {}).map(([key, value]) => (
                <span className="enterprise-chip" key={key}>
                  {key}: {value?.enabled ? "enabled" : value?.legacyMode ? "legacy" : "ready"}
                </span>
              ))}
            </div>
            <p className="enterprise-muted">
              OAuth/OIDC provider, SSO, SCIM, and Better Auth Dashboard APIs are mounted through Better Auth plugins.
            </p>
          </section>

          <section className="enterprise-section enterprise-wide">
            <div className="enterprise-section-title">
              <Palette size={17} />
              <h3>Organization whitelabel</h3>
            </div>
            <p className="enterprise-muted">Customize the product surface for the active organization. Footer attribution is locked.</p>

            <div className="brand-preview enterprise-brand-preview">
              <BrandMark initials={activeBranding?.logoInitials || "SB"} logoUrl={activeBranding?.logoUrl || ""} />
              <div>
                <strong>{activeBranding?.enabled || activeBranding?.logoUrl ? activeBranding.productName : brandingOrganization?.organizationName || "Batuk"}</strong>
                <small>{activeBranding?.tagline || "Enterprise AI workspace"}</small>
              </div>
            </div>

            <form className="whitelabel-form enterprise-whitelabel-form" onSubmit={handleSaveBranding}>
              <button className="setting-toggle" onClick={() => updateBrandingDraft({ enabled: !activeBranding?.enabled })} type="button">
                <span className={activeBranding?.enabled ? "toggle-icon on" : "toggle-icon"}>
                  <Palette size={19} />
                </span>
                <span>
                  <strong>Organization whitelabel</strong>
                  <small>{activeBranding?.enabled ? "Custom organization branding is active" : "Uses Batuk default branding"}</small>
                </span>
                <span className={`toggle ${activeBranding?.enabled ? "on" : ""}`} aria-hidden="true" />
              </button>

              <div className="enterprise-brand-grid">
                <div>
                  <label className="field-label" htmlFor="enterpriseBrandProductName">Product display name</label>
                  <input
                    className="field"
                    id="enterpriseBrandProductName"
                    maxLength={80}
                    onChange={(event) => updateBrandingDraft({ productName: event.target.value })}
                    placeholder={brandingOrganization?.organizationName || "Batuk"}
                    value={activeBranding?.productName || ""}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="enterpriseBrandTagline">Tagline</label>
                  <input
                    className="field"
                    id="enterpriseBrandTagline"
                    maxLength={120}
                    onChange={(event) => updateBrandingDraft({ tagline: event.target.value })}
                    placeholder="Enterprise AI workspace"
                    value={activeBranding?.tagline || ""}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="enterpriseBrandInitials">Logo initials</label>
                  <input
                    className="field"
                    id="enterpriseBrandInitials"
                    maxLength={4}
                    onChange={(event) => updateBrandingDraft({ logoInitials: event.target.value })}
                    value={activeBranding?.logoInitials || "SB"}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="enterpriseBrandAccent">Accent color</label>
                  <input
                    className="field color-field"
                    id="enterpriseBrandAccent"
                    onChange={(event) => updateBrandingDraft({ accentColor: event.target.value })}
                    type="color"
                    value={activeBranding?.accentColor || "#10a37f"}
                  />
                </div>
              </div>

              <label className="field-label" htmlFor="enterpriseBrandLogo">Logo upload</label>
              <div className="logo-upload-row enterprise-logo-actions">
                <label className="enterprise-logo-button upload" htmlFor="enterpriseBrandLogo">
                  <span>
                    <Upload size={17} />
                  </span>
                  <strong>Upload logo</strong>
                </label>
                <input
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden-file-input"
                  id="enterpriseBrandLogo"
                  onChange={handleUploadLogo}
                  type="file"
                />
                <button className="enterprise-logo-button remove" disabled={!activeBranding?.logoUrl || brandingStatus === "saving"} onClick={handleRemoveLogo} type="button">
                  <span>
                    <Trash2 size={17} />
                  </span>
                  <strong>Remove logo</strong>
                </button>
              </div>
              <p className="enterprise-muted">PNG, JPEG, WebP, or SVG up to 5 MB. When present, the logo replaces initials across the app.</p>

              <button className="setting-toggle" onClick={() => updateBrandingDraft({ showOrgName: !activeBranding?.showOrgName })} type="button">
                <span className={activeBranding?.showOrgName ? "toggle-icon on" : "toggle-icon"}>
                  <Palette size={19} />
                </span>
                <span>
                  <strong>Show organization name</strong>
                  <small>{brandingOrganization?.organizationName || "Active organization"}</small>
                </span>
                <span className={`toggle ${activeBranding?.showOrgName ? "on" : ""}`} aria-hidden="true" />
              </button>

              <div className="locked-footer-note">
                <LockKeyhole size={16} />
                <span>Footer locked: Batuk, created by Suhas Bhairav</span>
              </div>

              <button className="secondary-button" disabled={brandingStatus === "saving"} type="submit">
                <Palette size={16} />
                {brandingStatus === "saving" ? "Saving..." : "Save whitelabel"}
              </button>
              {brandingStatus === "saved" && <p className="enterprise-muted">Whitelabel settings saved for this organization.</p>}
              {brandingError && <p className="settings-error">{brandingError}</p>}
            </form>
          </section>

          <section className="enterprise-section">
            <div className="enterprise-section-title">
              <Building2 size={17} />
              <h3>Organizations</h3>
            </div>
            <form
              className="enterprise-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!orgName.trim()) return;
                run("createOrganization", { name: orgName.trim(), slug: orgSlug }, () => setOrgName(""));
              }}
            >
              <input placeholder="Organization name" value={orgName} onChange={(event) => setOrgName(event.target.value)} />
              <button className="secondary-button" disabled={!orgName.trim() || busyAction === "createOrganization"} type="submit">
                Create org
              </button>
            </form>
            <div className="enterprise-list">
              {organizations.map((organization) => (
                <button
                  className={`enterprise-row-button ${organization.id === activeOrganization?.id ? "active" : ""}`}
                  key={organization.id}
                  onClick={() => run("setActiveOrganization", { organizationId: organization.id })}
                  type="button"
                >
                  <span>{organization.name}</span>
                  <small>{organization.slug}</small>
                </button>
              ))}
              {!organizations.length && <p className="enterprise-muted">Create an organization to enable teams and org roles.</p>}
            </div>
          </section>

          <section className="enterprise-section">
            <div className="enterprise-section-title">
              <UsersRound size={17} />
              <h3>Teams</h3>
            </div>
            <form
              className="enterprise-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!teamName.trim() || !activeOrganization?.id) return;
                run("createTeam", { name: teamName.trim(), organizationId: activeOrganization.id }, () => setTeamName(""));
              }}
            >
              <input disabled={!activeOrganization} placeholder="Team name" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
              <button className="secondary-button" disabled={!teamName.trim() || !activeOrganization || busyAction === "createTeam"} type="submit">
                Create team
              </button>
            </form>
            <div className="enterprise-chip-list">
              {teams.map((team) => (
                <span className="enterprise-chip" key={team.id}>{team.name}</span>
              ))}
              {!teams.length && <p className="enterprise-muted">No teams yet.</p>}
            </div>
          </section>

          <section className="enterprise-section enterprise-wide">
            <div className="enterprise-section-title">
              <UsersRound size={17} />
              <h3>Members and invitations</h3>
            </div>
            <form
              className="enterprise-form enterprise-invite-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!inviteEmail.trim() || !activeOrganization?.id) return;
                run("inviteMember", { email: inviteEmail.trim(), role: inviteRole, organizationId: activeOrganization.id }, () => setInviteEmail(""));
              }}
            >
              <input disabled={!activeOrganization} placeholder="teammate@example.com" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
              <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                {ROLE_OPTIONS.filter((role) => role !== "user").map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <button className="secondary-button" disabled={!inviteEmail.trim() || !activeOrganization || busyAction === "inviteMember"} type="submit">
                Invite
              </button>
            </form>
            <div className="enterprise-table">
              {members.map((member) => (
                <div className="enterprise-table-row" key={member.id}>
                  <span>{member.user?.name || member.user?.email || member.userId}</span>
                  <select
                    value={member.role}
                    onChange={(event) => run("updateMemberRole", { memberId: member.id, role: event.target.value, organizationId: activeOrganization.id })}
                  >
                    {ROLE_OPTIONS.filter((role) => role !== "user").map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              ))}
              {!members.length && <p className="enterprise-muted">No organization members loaded.</p>}
            </div>
            {invitations.length > 0 && (
              <div className="enterprise-chip-list">
                {invitations.map((invitation) => (
                  <span className="enterprise-chip" key={invitation.id}>{invitation.email} · {invitation.role} · {invitation.status}</span>
                ))}
              </div>
            )}
          </section>

          <section className="enterprise-section enterprise-wide">
            <div className="enterprise-section-title">
              <ShieldCheck size={17} />
              <h3>Global users</h3>
            </div>
            <form
              className="enterprise-form enterprise-user-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return;
                run(
                  "createUser",
                  {
                    name: newUserName.trim(),
                    email: newUserEmail.trim(),
                    password: newUserPassword,
                    role: newUserRole,
                  },
                  () => {
                    setNewUserName("");
                    setNewUserEmail("");
                    setNewUserPassword("");
                    setNewUserRole("user");
                  },
                );
              }}
            >
              <input placeholder="Full name" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
              <input placeholder="email@example.com" type="email" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} />
              <input minLength={8} placeholder="Temporary password" type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} />
              <select value={newUserRole} onChange={(event) => setNewUserRole(event.target.value)}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <button
                className="secondary-button"
                disabled={!newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 8 || busyAction === "createUser"}
                type="submit"
              >
                Create user
              </button>
            </form>
            {overview.usersError && <p className="enterprise-muted">{overview.usersError}</p>}
            <div className="enterprise-table">
              {users.map((user) => (
                <div className="enterprise-table-row enterprise-user-row" key={user.id}>
                  <input
                    aria-label={`Name for ${user.email}`}
                    value={userDraft(user).name}
                    onChange={(event) => updateUserDraft(user.id, { name: event.target.value })}
                  />
                  <input
                    aria-label={`Email for ${user.email}`}
                    type="email"
                    value={userDraft(user).email}
                    onChange={(event) => updateUserDraft(user.id, { email: event.target.value })}
                  />
                  <select value={userDraft(user).role} onChange={(event) => updateUserDraft(user.id, { role: event.target.value })}>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <button
                    className="secondary-button"
                    disabled={busyAction === `updateUser-${user.id}`}
                    onClick={() => run(`updateUser-${user.id}`, {
                      action: "updateUser",
                      userId: user.id,
                      ...userDraft(user),
                    })}
                    type="button"
                  >
                    Save
                  </button>
                  <input
                    aria-label={`New password for ${user.email}`}
                    minLength={8}
                    placeholder="New password"
                    type="password"
                    value={passwordDrafts[user.id] || ""}
                    onChange={(event) => setPasswordDrafts((drafts) => ({ ...drafts, [user.id]: event.target.value }))}
                  />
                  <button
                    className="secondary-button"
                    disabled={(passwordDrafts[user.id] || "").length < 8 || busyAction === `setUserPassword-${user.id}`}
                    onClick={() =>
                      run(
                        `setUserPassword-${user.id}`,
                        {
                          action: "setUserPassword",
                          userId: user.id,
                          password: passwordDrafts[user.id],
                        },
                        () => setPasswordDrafts((drafts) => ({ ...drafts, [user.id]: "" })),
                      )
                    }
                    type="button"
                  >
                    Set password
                  </button>
                  <input
                    aria-label={`Ban reason for ${user.email}`}
                    placeholder="Ban reason"
                    value={banReasonDrafts[user.id] || ""}
                    onChange={(event) => setBanReasonDrafts((drafts) => ({ ...drafts, [user.id]: event.target.value }))}
                  />
                  {user.banned ? (
                    <button
                      className="secondary-button"
                      disabled={busyAction === `unbanUser-${user.id}`}
                      onClick={() => run(`unbanUser-${user.id}`, { action: "unbanUser", userId: user.id })}
                      type="button"
                    >
                      Unban
                    </button>
                  ) : (
                    <button
                      className="secondary-button danger"
                      disabled={busyAction === `banUser-${user.id}` || user.id === overview.currentUser?.id}
                      onClick={() =>
                        run(`banUser-${user.id}`, {
                          action: "banUser",
                          userId: user.id,
                          banReason: banReasonDrafts[user.id] || "Administrative action",
                        })
                      }
                      type="button"
                    >
                      Ban
                    </button>
                  )}
                  <button
                    className="secondary-button danger"
                    disabled={busyAction === `deleteUser-${user.id}` || user.id === overview.currentUser?.id}
                    onClick={() => {
                      if (window.confirm(`Delete ${user.email}? This cannot be undone.`)) {
                        run(`deleteUser-${user.id}`, { action: "deleteUser", userId: user.id });
                      }
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                  {user.banned && <small>Banned: {user.banReason || "No reason"}</small>}
                </div>
              ))}
              {!users.length && !overview.usersError && <p className="enterprise-muted">No users available.</p>}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
