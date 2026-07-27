"use client";

import { ArrowLeft, Copy, KeyRound, Plus, ServerCog, Trash2, UserX, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PROVIDERS } from "@/lib/providers";

async function apiManagementRequest(action, payload = {}) {
  const response = await fetch("/api/api-management", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "API management action failed.");
  return data;
}

export function ApiManagementPanel({ onBackToMenu, onClose }) {
  const [management, setManagement] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [createdSecret, setCreatedSecret] = useState("");
  const [keyName, setKeyName] = useState("Default API key");
  const [routeDraft, setRouteDraft] = useState({
    id: "",
    label: "",
    provider: "ollama",
    model: "",
    baseUrl: PROVIDERS.ollama.defaultBaseUrl,
    enabled: true,
  });
  const isAdmin = Boolean(management?.canManageApi);
  const activeKeysByUser = useMemo(() => {
    if (!isAdmin) return [];
    const grouped = new Map();
    management?.keys?.forEach((key) => {
      if (key.status !== "active") return;
      const current = grouped.get(key.userId) || { userId: key.userId, userEmail: key.userEmail || key.userId, count: 0 };
      current.count += 1;
      grouped.set(key.userId, current);
    });
    return Array.from(grouped.values()).sort((a, b) => a.userEmail.localeCompare(b.userEmail));
  }, [isAdmin, management?.keys]);

  async function load() {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/api-management");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load API management.");
      setManagement(data);
      setStatus("ready");
    } catch (loadError) {
      setError(loadError.message || "Could not load API management.");
      setStatus("error");
    }
  }

  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  async function createKey(event) {
    event.preventDefault();
    try {
      const data = await apiManagementRequest("createKey", { name: keyName });
      setManagement(data.management);
      setCreatedSecret(data.key.secret);
    } catch (actionError) {
      window.alert(actionError.message || "Could not create API key.");
    }
  }

  async function revokeKey(keyId) {
    if (!window.confirm("Revoke this API key? Existing integrations using it will stop working.")) return;
    try {
      const data = await apiManagementRequest("revokeKey", { keyId });
      setManagement(data.management);
    } catch (actionError) {
      window.alert(actionError.message || "Could not revoke API key.");
    }
  }

  async function revokeUserAccess(userId, userEmail) {
    if (!window.confirm(`Revoke all active API keys for ${userEmail || "this user"}?`)) return;
    try {
      const data = await apiManagementRequest("revokeUserApiAccess", { userId });
      setManagement(data.management);
    } catch (actionError) {
      window.alert(actionError.message || "Could not revoke user API access.");
    }
  }

  async function saveRoute(event) {
    event.preventDefault();
    try {
      const route = {
        ...routeDraft,
        id: routeDraft.id || `${routeDraft.provider}/${routeDraft.model}`,
        label: routeDraft.label || routeDraft.model,
      };
      const data = await apiManagementRequest("upsertModelRoute", { route });
      setManagement(data.management);
      setRouteDraft({ id: "", label: "", provider: "ollama", model: "", baseUrl: PROVIDERS.ollama.defaultBaseUrl, enabled: true });
    } catch (actionError) {
      window.alert(actionError.message || "Could not save API model.");
    }
  }

  async function deleteRoute(routeId) {
    if (!window.confirm("Delete this public API model route?")) return;
    try {
      const data = await apiManagementRequest("deleteModelRoute", { routeId });
      setManagement(data.management);
    } catch (actionError) {
      window.alert(actionError.message || "Could not delete API model.");
    }
  }

  return (
    <div className="settings-layer" role="dialog" aria-modal="true" aria-label="API management">
      <button className="settings-backdrop" onClick={onClose} aria-label="Close API management" type="button" />
      <section className="settings-page api-management-page">
        <div className="settings-header">
          <div>
            <p>API</p>
            <h2>API management</h2>
          </div>
          <div className="panel-header-actions">
            <button className="secondary-button panel-back-button" onClick={onBackToMenu} type="button">
              <ArrowLeft size={16} />
              Back to menu
            </button>
            <button className="top-icon" onClick={onClose} title="Close API management" type="button">
              <X size={20} />
            </button>
          </div>
        </div>

        {error && <p className="settings-error">{error}</p>}
        {status === "loading" && <div className="enterprise-empty">Loading API management...</div>}

        {management && (
          <div className="settings-content">
            <section className="settings-card">
              <div className="setting-title">
                <h3>Your API keys</h3>
                <p>Create keys for OpenAI-compatible programmatic access to models enabled by your admin.</p>
              </div>
              <form className="api-inline-form" onSubmit={createKey}>
                <input className="field" onChange={(event) => setKeyName(event.target.value)} value={keyName} />
                <button className="secondary-button" type="submit">
                  <Plus size={16} />
                  Create key
                </button>
              </form>
              {createdSecret && (
                <div className="api-secret-box">
                  <strong>Copy this key now. It will not be shown again.</strong>
                  <code>{createdSecret}</code>
                  <button className="secondary-button" onClick={() => navigator.clipboard?.writeText(createdSecret)} type="button">
                    <Copy size={16} />
                    Copy
                  </button>
                </div>
              )}
              <div className="api-table">
                {management.keys.map((key) => (
                  <div className="api-row" key={key.id}>
                    <KeyRound size={17} />
                    <div>
                      <strong>{key.name}</strong>
                      <span>{key.preview} · {key.status} · {key.userEmail || "you"}</span>
                    </div>
                    {key.status === "active" && (
                      <button className="secondary-button danger" onClick={() => revokeKey(key.id)} type="button">
                        <Trash2 size={15} />
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="settings-card">
              <div className="setting-title">
                <h3>API endpoint</h3>
                <p>Use this app as an OpenAI-compatible model gateway.</p>
              </div>
              <pre className="api-code-sample">{`curl -X POST http://localhost:3000/api/v1/chat/completions \\
  -H "Authorization: Bearer batuk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${management.publicModels[0]?.id || "provider/model"}","messages":[{"role":"user","content":"Hello"}]}'`}</pre>
            </section>

            {isAdmin && activeKeysByUser.length > 0 && (
              <section className="settings-card">
                <div className="setting-title">
                  <h3>User API access</h3>
                  <p>Review every user with active programmatic access and revoke all keys for a user when needed.</p>
                </div>
                <div className="api-table">
                  {activeKeysByUser.map((user) => (
                    <div className="api-row" key={user.userId}>
                      <UserX size={17} />
                      <div>
                        <strong>{user.userEmail}</strong>
                        <span>{user.count} active {user.count === 1 ? "key" : "keys"}</span>
                      </div>
                      <button className="secondary-button danger" onClick={() => revokeUserAccess(user.userId, user.userEmail)} type="button">
                        <UserX size={15} />
                        Revoke access
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {isAdmin && management.modelRoutes && (
              <section className="settings-card">
                <div className="setting-title">
                  <h3>Admin API models</h3>
                  <p>Expose internal provider/model routes as public API model IDs.</p>
                </div>
                <form className="api-model-form" onSubmit={saveRoute}>
                  <input className="field" placeholder="Public model id, e.g. company/gpt" value={routeDraft.id} onChange={(event) => setRouteDraft({ ...routeDraft, id: event.target.value })} />
                  <input className="field" placeholder="Label" value={routeDraft.label} onChange={(event) => setRouteDraft({ ...routeDraft, label: event.target.value })} />
                  <select className="field select-field" value={routeDraft.provider} onChange={(event) => setRouteDraft({ ...routeDraft, provider: event.target.value, baseUrl: PROVIDERS[event.target.value]?.defaultBaseUrl || routeDraft.baseUrl })}>
                    {Object.entries(PROVIDERS).map(([id, provider]) => (
                      <option key={id} value={id}>{provider.label}</option>
                    ))}
                  </select>
                  <input className="field" placeholder="Underlying model" value={routeDraft.model} onChange={(event) => setRouteDraft({ ...routeDraft, model: event.target.value })} />
                  <input className="field" placeholder="Base URL" value={routeDraft.baseUrl} onChange={(event) => setRouteDraft({ ...routeDraft, baseUrl: event.target.value })} />
                  <label className="api-checkbox">
                    <input checked={routeDraft.enabled} onChange={(event) => setRouteDraft({ ...routeDraft, enabled: event.target.checked })} type="checkbox" />
                    Enabled
                  </label>
                  <button className="secondary-button" type="submit">
                    <ServerCog size={16} />
                    Save model
                  </button>
                </form>
                <div className="api-table">
                  {management.modelRoutes.map((route) => (
                    <div className="api-row" key={route.id}>
                      <ServerCog size={17} />
                      <div>
                        <strong>{route.id}</strong>
                        <span>{route.provider} · {route.model} · {route.enabled ? "enabled" : "disabled"}</span>
                      </div>
                      <button className="secondary-button danger" onClick={() => deleteRoute(route.id)} type="button">
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
