"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Code2,
  Database,
  FileSearch,
  FolderOpen,
  GitPullRequest,
  Globe2,
  HardDrive,
  MessageSquare,
  PlugZap,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

function configText(config) {
  return JSON.stringify(config || {}, null, 2);
}

function parseConfig(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    throw new Error("Config must be valid JSON.");
  }
}

function iconFor(item = {}) {
  const id = String(item.id || item.catalogId || "").toLowerCase();
  const category = String(item.category || "").toLowerCase();
  if (id.includes("github")) return GitPullRequest;
  if (id.includes("postgres") || id.includes("sqlite") || category.includes("database")) return Database;
  if (id.includes("filesystem")) return FolderOpen;
  if (id.includes("drive")) return HardDrive;
  if (id.includes("slack")) return MessageSquare;
  if (id.includes("browser") || id.includes("brave") || category.includes("web")) return Globe2;
  if (id.includes("memory") || category.includes("knowledge")) return FileSearch;
  if (id.includes("custom")) return Code2;
  return Bot;
}

export function McpDashboard({ activeIntegrationId, catalog, integrations, onClose, onDelete, onDiscover, onSave, onSelectActive }) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(null);
  const [config, setConfig] = useState("{}");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState("");
  const activeIntegration = integrations.find((item) => item.id === activeIntegrationId);
  const filteredCatalog = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return catalog;
    return catalog.filter((item) => [item.name, item.category, item.description].join(" ").toLowerCase().includes(needle));
  }, [catalog, query]);

  function startFromCatalog(item) {
    setDraft({
      catalogId: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      transport: item.transport,
      enabled: true,
    });
    setConfig(configText(item.setup));
    setStatus("");
  }

  function editIntegration(item) {
    setDraft(item);
    setConfig(configText(item.config));
    setStatus("");
  }

  async function saveDraft({ discover = false } = {}) {
    if (!draft) return;
    setBusy(discover ? "discover" : "save");
    setStatus("");
    try {
      const data = await onSave({ ...draft, config: parseConfig(config) });
      const integrationId = data.integration?.id || draft.id;
      if (discover && integrationId) {
        await onDiscover(integrationId);
      }
      setStatus(discover ? "Saved and connected." : "Saved.");
    } catch (error) {
      setStatus(error.message || "MCP action failed.");
    } finally {
      setBusy("");
    }
  }

  async function discoverIntegration(id) {
    setBusy(id);
    setStatus("");
    try {
      await onDiscover(id);
      setStatus("Connection discovery finished.");
    } catch (error) {
      setStatus(error.message || "Could not connect.");
    } finally {
      setBusy("");
    }
  }

  async function deleteIntegration(item) {
    if (!window.confirm(`Delete ${item.name}? This removes the saved MCP connection record.`)) return;
    setBusy(item.id);
    setStatus("");
    try {
      await onDelete(item.id);
      if (draft?.id === item.id) {
        setDraft(null);
        setConfig("{}");
      }
      setStatus("MCP integration deleted.");
    } catch (error) {
      setStatus(error.message || "Could not delete MCP integration.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="agent-builder-screen mcp-dashboard-screen">
      <div className="agent-builder-header mcp-dashboard-header">
        <div className="agent-builder-title-row">
          <div className="mcp-header-icon">
            <PlugZap size={20} />
          </div>
          <div>
          <p>MCP integrations</p>
          <h1>Connect tools and data products</h1>
          <span>{integrations.length} connected · {activeIntegration?.name || "No product selected"}</span>
          </div>
        </div>
        <button className="top-icon" onClick={onClose} title="Back to chat" type="button">
          <X size={20} />
        </button>
      </div>

      <div className="agent-builder-grid two-tab-builder mcp-dashboard-grid">
        <section className="agent-editor-panel">
          <div className="workflow-library-head">
            <div>
              <h2>Directory</h2>
              <p>Starter templates plus custom HTTP, SSE, and stdio servers.</p>
            </div>
          </div>
          <div className="skills-toolbar">
            <Search size={17} />
            <input aria-label="Search MCP directory" onChange={(event) => setQuery(event.target.value)} placeholder="Search MCP servers" value={query} />
          </div>
          <div className="workflow-card-grid mcp-card-grid">
            {filteredCatalog.map((item) => {
              const CardIcon = iconFor(item);
              return (
              <button className="workflow-card mcp-directory-card" key={item.id} onClick={() => startFromCatalog(item)} type="button">
                <div className="mcp-card-head">
                  <span className="mcp-card-icon">
                    <CardIcon size={19} />
                  </span>
                  <span className="mcp-transport-chip">{item.transport}</span>
                </div>
                <strong>{item.name}</strong>
                <small>{item.category}</small>
                <p>{item.description}</p>
              </button>
              );
            })}
          </div>
        </section>

        <aside className="agent-flow-panel">
          <div className="workflow-library-head">
            <div>
              <h3>Connected products</h3>
              <p>Select the active product to chat with its discovered MCP surface.</p>
            </div>
          </div>
          <div className="mcp-connected-list">
            {integrations.map((item) => (
              <article className={`mcp-connected ${item.id === activeIntegrationId ? "active" : ""}`} key={item.id}>
                <button onClick={() => editIntegration(item)} type="button">
                  <span className="mcp-connected-icon">
                    {(() => {
                      const ConnectedIcon = iconFor(item);
                      return <ConnectedIcon size={16} />;
                    })()}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.status === "connected" ? `${item.discovery?.tools?.length || 0} tools` : item.statusMessage || item.status}</small>
                  </span>
                </button>
                <div>
                  <button className="top-icon" onClick={() => onSelectActive(item.id)} title="Use in chat" type="button">
                    <CheckCircle2 size={17} />
                  </button>
                  <button className="top-icon" onClick={() => discoverIntegration(item.id)} title="Discover" type="button">
                    <RefreshCw size={17} className={busy === item.id ? "spin-icon" : ""} />
                  </button>
                  <button className="top-icon danger-icon" onClick={() => deleteIntegration(item)} title="Delete MCP integration" type="button">
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
            {!integrations.length && <p className="muted-panel-copy">No MCP products connected yet.</p>}
          </div>

          <div className="mcp-editor">
            <h3>{draft?.id ? "Edit integration" : "One-click setup"}</h3>
            <label className="field-label" htmlFor="mcpName">Name</label>
            <input id="mcpName" className="field" value={draft?.name || ""} onChange={(event) => setDraft({ ...(draft || {}), name: event.target.value })} />
            <label className="field-label" htmlFor="mcpTransport">Transport</label>
            <select id="mcpTransport" className="field select-field" value={draft?.transport || "http"} onChange={(event) => setDraft({ ...(draft || {}), transport: event.target.value })}>
              <option value="http">Streamable HTTP</option>
              <option value="sse">SSE</option>
              <option value="stdio">stdio</option>
            </select>
            <label className="field-label" htmlFor="mcpConfig">Config JSON</label>
            <textarea id="mcpConfig" className="field mcp-config-field" value={config} onChange={(event) => setConfig(event.target.value)} spellCheck={false} />
            <div className="mcp-actions">
              <button className="primary-button" disabled={!draft || Boolean(busy)} onClick={() => saveDraft({ discover: true })} type="button">
                <PlugZap size={17} />
                Connect
              </button>
              <button className="secondary-button" disabled={!draft || Boolean(busy)} onClick={() => saveDraft()} type="button">
                <Save size={17} />
                Save
              </button>
            </div>
            {status && <p className="form-error">{status}</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
