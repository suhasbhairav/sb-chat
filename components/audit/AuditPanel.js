"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Database, Download, FileClock, RefreshCw, ShieldCheck, X } from "lucide-react";

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

export function AuditPanel({ onClose }) {
  const [compliance, setCompliance] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");

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
                <span>Compliance dashboard</span>
                <h3>GDPR, ISO 27001, and SOC 2 evidence</h3>
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
                <strong>{totals.openDataRequests || 0}</strong>
                <span>open GDPR requests</span>
              </div>
              <div className="audit-metric">
                <strong>{totals.failedOrDeniedEvents || 0}</strong>
                <span>denied or failed events</span>
              </div>
            </div>

            <div className="audit-chip-list">
              {Object.entries(frameworkCounts).map(([framework, count]) => (
                <span className="audit-chip" key={framework}>{framework}: {count} controls</span>
              ))}
              <span className="audit-chip">Retention: {compliance.settings?.retentionDays} days</span>
              <span className="audit-chip">Hash chain: enabled</span>
              <span className="audit-chip">PII hashing: {compliance.settings?.hashPersonalIdentifiers ? "enabled" : "disabled"}</span>
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

          <section className="audit-card audit-trail">
            <div className="audit-section-title">
              <FileClock size={17} />
              <h3>Audit trail</h3>
            </div>
            <div className="audit-event-scroll" tabIndex={0}>
              {(compliance.auditEvents || []).map((event) => (
                <div className="audit-event-row" key={event.id}>
                  <div>
                    <strong>{event.action}</strong>
                    <small>{event.actor?.role || "system"} · {event.actor?.emailHash ? "hashed actor" : "recorded actor"}</small>
                  </div>
                  <span className={`audit-status ${event.outcome === "success" ? "success" : event.outcome === "denied" ? "denied" : "failure"}`}>
                    {event.category} · {event.outcome}
                  </span>
                  <time>{formatDate(event.createdAt)}</time>
                </div>
              ))}
              {!compliance.auditEvents?.length && <p className="audit-muted">Audit events will appear as users perform protected actions.</p>}
            </div>
          </section>

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

          <p className="audit-footnote">
            Implemented control evidence: GDPR records of processing, data subject access and erasure, security of processing; ISO 27001 security policies and logging/monitoring; SOC 2 logical access, system operations monitoring, and privacy commitments.
          </p>
        </div>
      )}
    </section>
  );
}
