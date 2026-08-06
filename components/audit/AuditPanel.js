"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Activity, ClipboardCheck, Database, Download, FileClock, Filter, RefreshCw, Search, ShieldCheck, X } from "lucide-react";

async function complianceRequest(action, payload = {}) {
  const response = await fetch("/api/compliance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  if (action === "exportMyData") {
    const blob = await response.blob();
    if (!response.ok) throw new Error("Could not export user data.");
    return blob;
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Compliance action failed.");
  return data;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export function AuditPanel({ onBackToMenu, onClose }) {
  const [compliance, setCompliance] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [activeView, setActiveView] = useState("evidence");
  const [eventQuery, setEventQuery] = useState("");
  const [eventCategory, setEventCategory] = useState("all");
  const [eventOutcome, setEventOutcome] = useState("all");

  async function load() {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/compliance");
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not load audit workspace.");
      setCompliance(data);
      setStatus("ready");
    } catch (loadError) {
      setError(loadError.message || "Could not load audit workspace.");
      setStatus("error");
    }
  }

  async function exportMyData() {
    setBusyAction("exportMyData");
    setError("");
    try {
      const blob = await complianceRequest("exportMyData");
      downloadBlob(blob, `batuk-user-data-${Date.now()}.json`);
    } catch (exportError) {
      setError(exportError.message || "Could not export user data.");
    } finally {
      setBusyAction("");
    }
  }

  async function createPrivacyRequest(type) {
    setBusyAction(`privacy-${type}`);
    setError("");
    try {
      await complianceRequest("createDataRequest", { type });
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not create data request.");
    } finally {
      setBusyAction("");
    }
  }

  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  const totals = compliance?.summary?.totals || {};
  const frameworkCounts = compliance?.summary?.byFramework || {};
  const categories = compliance?.summary?.byCategory || {};
  const outcomes = compliance?.summary?.byOutcome || {};
  const integrity = compliance?.summary?.integrity || {};
  const trailCoverage = compliance?.summary?.trailCoverage || [];
  const controls = compliance?.controls || [];
  const events = compliance?.auditEvents || [];
  const filteredEvents = events.filter((event) => {
    const query = eventQuery.trim().toLowerCase();
    const matchesQuery = !query || [event.action, event.category, event.outcome, event.target?.type, event.target?.id, event.actor?.role]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
    const matchesCategory = eventCategory === "all" || event.category === eventCategory;
    const matchesOutcome = eventOutcome === "all" || event.outcome === eventOutcome;
    return matchesQuery && matchesCategory && matchesOutcome;
  });
  const frameworkReadiness = Object.entries(frameworkCounts).map(([framework, count]) => {
    const implemented = controls.filter((control) => control.framework === framework && control.status === "implemented").length;
    return { framework, count, implemented, percent: count ? Math.round((implemented / count) * 100) : 0 };
  });

  return (
    <section className="audit-panel">
      <header className="audit-header">
        <div>
          <span className="audit-eyebrow">
            <ClipboardCheck size={16} />
            Governance workspace
          </span>
          <h2>Audit, compliance, and privacy operations</h2>
        </div>
        <div className="audit-header-actions">
          <button className="secondary-button panel-back-button" onClick={onBackToMenu} type="button">
            <ArrowLeft size={16} />
            Back to menu
          </button>
          <button className="top-icon" onClick={load} title="Refresh audit data" type="button">
            <RefreshCw size={18} />
          </button>
          <button className="top-icon" onClick={onClose} title="Close audit workspace" type="button">
            <X size={18} />
          </button>
        </div>
      </header>

      {error && <p className="settings-error audit-error">{error}</p>}

      {status === "loading" && <div className="audit-empty">Loading audit workspace...</div>}

      {status !== "loading" && compliance && (
        <div className="audit-workspace">
          <section className="audit-card audit-overview">
            <div className="audit-card-heading">
              <div>
                <span>Compliance evidence dashboard</span>
                <h3>GDPR, ISO 27001, SOC 2, and HIPAA data trails</h3>
              </div>
              <ShieldCheck size={24} />
            </div>

            <div className="audit-metrics">
              <div className="audit-metric">
                <strong>{totals.implementedControls || 0}/{totals.controls || 0}</strong>
                <span>controls implemented</span>
              </div>
              <div className="audit-metric">
                <strong>{totals.auditEvents || 0}</strong>
                <span>audit events</span>
              </div>
              <div className="audit-metric">
                <strong>{totals.coverageCount || 0}/{totals.coverageTotal || 0}</strong>
                <span>trail categories active</span>
              </div>
              <div className="audit-metric">
                <strong>{integrity.verified ? "Verified" : "Review"}</strong>
                <span>hash-chain integrity</span>
              </div>
            </div>

            <div className="audit-chip-list">
              {Object.entries(frameworkCounts).map(([framework, count]) => (
                <span className="audit-chip" key={framework}>{framework}: {count} controls</span>
              ))}
              <span className="audit-chip">Retention: {compliance.settings?.retentionDays} days</span>
              <span className={`audit-chip ${integrity.verified ? "positive" : "danger"}`}>Hash chain: {integrity.verified ? "verified" : "needs review"}</span>
              <span className="audit-chip">PII hashing: {compliance.settings?.hashPersonalIdentifiers ? "enabled" : "disabled"}</span>
              <span className="audit-chip">Raw prompt previews: {compliance.settings?.rawContentEnabled ? "enabled" : "off by default"}</span>
            </div>

            <div className="audit-actions">
              <button className="secondary-button" disabled={busyAction === "exportMyData"} onClick={exportMyData} type="button">
                <Download size={16} />
                Export my data
              </button>
              <a className="secondary-button" href="/api/compliance?export=audit">
                <Download size={16} />
                Export audit CSV
              </a>
              <button className="secondary-button danger" disabled={busyAction === "privacy-erasure"} onClick={() => createPrivacyRequest("erasure")} type="button">
                <FileClock size={16} />
                Request erasure
              </button>
            </div>
          </section>

          <nav className="audit-view-tabs" aria-label="Compliance evidence views">
            {[
              ["evidence", "Evidence"],
              ["trail", "Event trail"],
              ["controls", "Controls"],
              ["data", "Data map"],
            ].map(([id, label]) => (
              <button className={activeView === id ? "active" : ""} key={id} onClick={() => setActiveView(id)} type="button">
                {label}
              </button>
            ))}
          </nav>

          {activeView === "evidence" && (
            <>
              <section className="audit-card">
                <div className="audit-section-title">
                  <ShieldCheck size={17} />
                  <h3>Framework readiness</h3>
                </div>
                <div className="audit-readiness-grid">
                  {frameworkReadiness.map((item) => (
                    <div className="audit-readiness-row" key={item.framework}>
                      <div>
                        <strong>{item.framework}</strong>
                        <small>{item.implemented}/{item.count} controls implemented</small>
                      </div>
                      <span>{item.percent}%</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="audit-card">
                <div className="audit-section-title">
                  <Activity size={17} />
                  <h3>Data-trail coverage</h3>
                </div>
                <div className="audit-coverage-list">
                  {trailCoverage.map((item) => (
                    <div className="audit-coverage-row" key={item.id}>
                      <span className={`audit-dot ${item.covered ? "success" : ""}`} />
                      <div>
                        <strong>{item.label}</strong>
                        <small>{item.covered ? `${categories[item.category]} events captured` : "No events yet; trail is enabled when activity occurs"}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="audit-card">
                <div className="audit-section-title">
                  <FileClock size={17} />
                  <h3>Review queue</h3>
                </div>
                <div className="audit-metrics compact">
                  <div className="audit-metric">
                    <strong>{totals.failedOrDeniedEvents || 0}</strong>
                    <span>failed or denied</span>
                  </div>
                  <div className="audit-metric">
                    <strong>{totals.openDataRequests || 0}</strong>
                    <span>open privacy requests</span>
                  </div>
                  <div className="audit-metric">
                    <strong>{totals.recentEvents7d || 0}</strong>
                    <span>events in 7 days</span>
                  </div>
                </div>
                <div className="audit-chip-list">
                  {Object.entries(outcomes).map(([outcome, count]) => (
                    <span className={`audit-chip ${outcome === "success" ? "positive" : "danger"}`} key={outcome}>{outcome}: {count}</span>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeView === "trail" && (
          <section className="audit-card audit-trail">
            <div className="audit-section-title">
              <FileClock size={17} />
              <h3>Audit trail</h3>
            </div>
            <div className="audit-filters">
              <label>
                <Search size={15} />
                <input value={eventQuery} onChange={(event) => setEventQuery(event.target.value)} placeholder="Search actions, targets, roles" />
              </label>
              <label>
                <Filter size={15} />
                <select value={eventCategory} onChange={(event) => setEventCategory(event.target.value)}>
                  <option value="all">All categories</option>
                  {Object.keys(categories).sort().map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label>
                <Filter size={15} />
                <select value={eventOutcome} onChange={(event) => setEventOutcome(event.target.value)}>
                  <option value="all">All outcomes</option>
                  {Object.keys(outcomes).sort().map((outcome) => <option key={outcome} value={outcome}>{outcome}</option>)}
                </select>
              </label>
            </div>
            <div className="audit-event-scroll" tabIndex={0}>
              {filteredEvents.map((event) => (
                <div className="audit-event-row" key={event.id}>
                  <div>
                    <strong>{event.action}</strong>
                    <small>{event.actor?.role || "system"} · {event.target?.type || "event"} {event.target?.id ? `· ${event.target.id}` : ""}</small>
                  </div>
                  <span className={`audit-status ${event.outcome === "success" ? "success" : event.outcome === "denied" ? "denied" : "failure"}`}>
                    {event.category} · {event.outcome}
                  </span>
                  <time>{formatDate(event.createdAt)}</time>
                </div>
              ))}
              {!filteredEvents.length && <p className="audit-muted">No audit events match the current filters.</p>}
            </div>
          </section>
          )}

          {activeView === "data" && (
          <section className="audit-card audit-inventory">
            <div className="audit-section-title">
              <Database size={17} />
              <h3>Data inventory</h3>
            </div>
            <div className="audit-table">
              {compliance.dataInventory.map((item) => (
                <div className="audit-table-row inventory" key={item.category}>
                  <strong>{item.category}</strong>
                  <span>{item.purpose}</span>
                  <small>{item.retention}</small>
                </div>
              ))}
            </div>
          </section>
          )}

          {activeView === "data" && (
          <section className="audit-card audit-requests">
            <div className="audit-section-title">
              <ClipboardCheck size={17} />
              <h3>GDPR request register</h3>
            </div>
            <div className="audit-request-list">
              {(compliance.dataRequests || []).map((request) => (
                <span className="audit-chip" key={request.id}>
                  {request.type} · {request.status} · {request.createdAt.slice(0, 10)}
                </span>
              ))}
              {!compliance.dataRequests?.length && <p className="audit-muted">No GDPR requests have been logged yet.</p>}
            </div>
          </section>
          )}

          {activeView === "controls" && (
            <section className="audit-card audit-controls">
              <div className="audit-section-title">
                <ClipboardCheck size={17} />
                <h3>Control evidence register</h3>
              </div>
              <div className="audit-table">
                {controls.map((control) => (
                  <div className="audit-table-row control" key={control.id}>
                    <strong>{control.framework}</strong>
                    <span>{control.title}</span>
                    <small>{control.status} · {control.owner}</small>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="audit-footnote">
            Evidence posture: audit logs are hash chained, actor identifiers can be hashed, raw prompt/result previews are disabled by default, and prompt/output accountability is preserved through digests, role-level message summaries, sizes, timestamps, and result metadata.
          </p>
        </div>
      )}
    </section>
  );
}
