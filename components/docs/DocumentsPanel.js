"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, RefreshCw, RotateCw, Search, Trash2, Upload, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

const DEFAULT_DOCUMENT_SETTINGS = {
  embeddingProvider: "local",
  embeddingModel: "local-hash-v1",
  vectorStoreProvider: "json",
  chromaUrl: "http://localhost:8000",
  chromaCollection: "sb_chat_documents",
  pineconeApiKey: "",
  pineconeIndex: "sb-chat-documents",
  pineconeNamespace: "documents",
  pineconeCloud: "aws",
  pineconeRegion: "us-east-1",
  qdrantUrl: "",
  qdrantApiKey: "",
  qdrantCollection: "batuk_documents",
  supabaseBucket: "batuk-documents",
  supabaseChunksTable: "batuk_document_chunks",
  supabaseMatchFunction: "match_batuk_document_chunks",
  advancedRagEnabled: false,
  advancedExtractionStrategy: "hi_res",
  advancedExtractionLanguages: "eng",
  graphRagEnabled: false,
  piiDetectionEnabled: false,
  chunkSize: 1800,
  chunkOverlap: 220,
  topK: 6,
};

function defaultEmbeddingModel(provider) {
  if (provider === "openai") return "text-embedding-3-small";
  if (provider === "llamaindex-openai") return "text-embedding-ada-002";
  if (provider === "llamaindex-ollama") return "nomic-embed-text";
  return "local-hash-v1";
}

function needsOpenAIEmbeddingKey(provider) {
  return provider === "openai" || provider === "llamaindex-openai";
}

function formatBytes(bytes, locale) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  if (value < 1024 * 1024) return `${formatter.format(value / 1024)} KB`;
  return `${formatter.format(value / 1024 / 1024)} MB`;
}

function documentIcon(name) {
  return /\.(csv|xls|xlsx)$/i.test(name) ? FileSpreadsheet : FileText;
}

export function DocumentsPanel({ apiKey, documentChatEnabled, openAIBaseUrl, selectedWorkspaceId, onClose, onToggleDocumentChat }) {
  const { locale, t } = useI18n();
  const [documents, setDocuments] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_DOCUMENT_SETTINGS);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const visibleDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((document) => document.name.toLowerCase().includes(needle));
  }, [documents, query]);

  const loadDocuments = useCallback(async function loadDocuments() {
    setStatus("loading");
    setError("");
    try {
      const params = selectedWorkspaceId ? `?workspaceId=${encodeURIComponent(selectedWorkspaceId)}` : "";
      const response = await fetch(`/api/documents${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load documents.");
      setDocuments(data.documents || []);
      setSettings(data.settings || DEFAULT_DOCUMENT_SETTINGS);
      setStatus("idle");
    } catch (loadError) {
      setError(loadError.message || "Could not load documents.");
      setStatus("error");
    }
  }, [selectedWorkspaceId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadDocuments();
    }, 0);

    return () => clearTimeout(timeout);
  }, [loadDocuments]);

  async function saveSettings(nextSettings) {
    setSettings(nextSettings);
    const response = await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nextSettings, workspaceId: selectedWorkspaceId }),
    });
    const data = await response.json();
    if (response.ok) {
      setSettings(data.settings || nextSettings);
    }
  }

  async function uploadFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setStatus("uploading");
    setError("");
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    Object.entries(settings).forEach(([key, value]) => formData.append(key, value));
    if (selectedWorkspaceId) formData.append("workspaceId", selectedWorkspaceId);
    if (apiKey) formData.append("apiKey", apiKey);
    if (openAIBaseUrl) formData.append("openAIBaseUrl", openAIBaseUrl);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setDocuments(data.documents || []);
      setSettings(data.settings || settings);
      setStatus("idle");
      if (fileRef.current) fileRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError.message || "Upload failed.");
      setStatus("error");
    }
  }

  async function deleteDocument(id) {
    const params = selectedWorkspaceId ? `?workspaceId=${encodeURIComponent(selectedWorkspaceId)}` : "";
    const response = await fetch(`/api/documents/${id}${params}`, { method: "DELETE" });
    const data = await response.json();
    if (response.ok) {
      setDocuments(data.documents || []);
      return;
    }
    setError(data.error || "Could not delete document.");
  }

  async function reindexDocument(id) {
    setStatus("uploading");
    setError("");
    const response = await fetch(`/api/documents/${id}/reindex`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        apiKey,
        openAIBaseUrl,
        workspaceId: selectedWorkspaceId,
      }),
    });
    const data = await response.json();

    if (response.ok) {
      setDocuments(data.documents || []);
      setSettings(data.settings || settings);
      setStatus("idle");
      return;
    }

    setStatus("error");
    setError(data.error || "Could not reindex document.");
  }

  return (
    <div className="settings-layer" role="dialog" aria-modal="true" aria-label={t("documents.title")}>
      <button className="settings-backdrop" onClick={onClose} aria-label={t("documents.close")} type="button" />
      <section className="documents-page">
        <div className="documents-header">
          <div>
            <p>{t("documents.title")}</p>
            <h2>{t("documents.ragLibrary")}</h2>
          </div>
          <button className="top-icon" onClick={onClose} title={t("documents.close")} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="documents-toolbar">
          <button className={`doc-mode-button ${documentChatEnabled ? "active" : ""}`} onClick={onToggleDocumentChat} type="button">
            <FileText size={17} />
            {documentChatEnabled ? t("documents.enabled") : t("documents.enableDocumentChat")}
          </button>
          <button className="secondary-button" onClick={() => fileRef.current?.click()} type="button">
            <Upload size={16} />
            {t("documents.upload")}
          </button>
          <input
            ref={fileRef}
            accept=".pdf,.txt,.csv,.xls,.xlsx,.docx,.md,.json,.log"
            multiple
            onChange={uploadFiles}
            type="file"
          />
        </div>

        <div className="documents-content">
          <aside className="rag-settings-card">
            <div className="setting-title">
              <h3>{t("documents.embeddingSettings")}</h3>
              <p>{t("documents.embeddingSettingsCopy")}</p>
            </div>

            <label className="field-label" htmlFor="embeddingProvider">{t("documents.embeddingProvider")}</label>
            <select
              id="embeddingProvider"
              className="field select-field"
              onChange={(event) =>
                saveSettings({
                  ...settings,
                  embeddingProvider: event.target.value,
                  embeddingModel: defaultEmbeddingModel(event.target.value),
                })
              }
              value={settings.embeddingProvider}
            >
              <option value="local">{t("documents.localEmbeddings")}</option>
              <option value="openai">{t("documents.openAIEmbeddings")}</option>
              <option value="llamaindex-openai">{t("documents.llamaIndexOpenAIEmbeddings")}</option>
              <option value="llamaindex-ollama">{t("documents.llamaIndexOllamaEmbeddings")}</option>
            </select>
            {needsOpenAIEmbeddingKey(settings.embeddingProvider) && (
              <p className="settings-hint">{t("documents.embeddingOpenAIKeyHint")}</p>
            )}

            <div className="setting-title rag-subtitle">
              <h3>{t("documents.advancedRag")}</h3>
              <p>{t("documents.advancedRagCopy")}</p>
            </div>

            <div className="rag-toggle-stack">
              <button
                className={`doc-mode-button ${settings.advancedRagEnabled ? "active" : ""}`}
                onClick={() => saveSettings({ ...settings, advancedRagEnabled: !settings.advancedRagEnabled })}
                type="button"
              >
                <FileText size={17} />
                {settings.advancedRagEnabled ? t("documents.advancedRagOn") : t("documents.advancedRagOff")}
              </button>
              <button
                className={`doc-mode-button ${settings.graphRagEnabled ? "active" : ""}`}
                onClick={() => saveSettings({ ...settings, graphRagEnabled: !settings.graphRagEnabled, advancedRagEnabled: settings.graphRagEnabled ? settings.advancedRagEnabled : true })}
                type="button"
              >
                <SparklesIcon />
                {settings.graphRagEnabled ? t("documents.graphRagOn") : t("documents.graphRagOff")}
              </button>
              <button
                className={`doc-mode-button ${settings.piiDetectionEnabled ? "active" : ""}`}
                onClick={() => saveSettings({ ...settings, piiDetectionEnabled: !settings.piiDetectionEnabled, advancedRagEnabled: settings.piiDetectionEnabled ? settings.advancedRagEnabled : true })}
                type="button"
              >
                <Search size={17} />
                {settings.piiDetectionEnabled ? t("documents.piiOn") : t("documents.piiOff")}
              </button>
            </div>

            {settings.advancedRagEnabled && (
              <>
                <label className="field-label" htmlFor="advancedExtractionStrategy">{t("documents.advancedExtractionStrategy")}</label>
                <select
                  id="advancedExtractionStrategy"
                  className="field select-field"
                  onChange={(event) => saveSettings({ ...settings, advancedExtractionStrategy: event.target.value })}
                  value={settings.advancedExtractionStrategy || "hi_res"}
                >
                  <option value="hi_res">hi_res</option>
                  <option value="ocr_only">ocr_only</option>
                  <option value="fast">fast</option>
                  <option value="auto">auto</option>
                </select>

                <label className="field-label" htmlFor="advancedExtractionLanguages">{t("documents.advancedExtractionLanguages")}</label>
                <input
                  id="advancedExtractionLanguages"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, advancedExtractionLanguages: event.target.value })}
                  placeholder="eng,deu"
                  value={settings.advancedExtractionLanguages || "eng"}
                />
                <p className="settings-hint">{t("documents.advancedRagHint")}</p>
              </>
            )}

            <label className="field-label" htmlFor="embeddingModel">{t("documents.embeddingModel")}</label>
            <input
              id="embeddingModel"
              className="field"
              disabled={settings.embeddingProvider === "local"}
              onChange={(event) => saveSettings({ ...settings, embeddingModel: event.target.value })}
              value={settings.embeddingModel}
            />

            <div className="setting-title rag-subtitle">
              <h3>{t("documents.vectorStorage")}</h3>
              <p>{t("documents.vectorStorageCopy")}</p>
            </div>

            <label className="field-label" htmlFor="vectorStoreProvider">{t("documents.vectorStore")}</label>
            <select
              id="vectorStoreProvider"
              className="field select-field"
              onChange={(event) => saveSettings({ ...settings, vectorStoreProvider: event.target.value })}
              value={settings.vectorStoreProvider || "json"}
            >
              <option value="json">{t("documents.jsonVectorStore")}</option>
              <option value="chroma">{t("documents.chromaVectorStore")}</option>
              <option value="pinecone">{t("documents.pineconeVectorStore")}</option>
              <option value="qdrant">{t("documents.qdrantVectorStore")}</option>
              <option value="supabase">{t("documents.supabaseVectorStore")}</option>
            </select>

            {(settings.vectorStoreProvider || "json") === "chroma" && (
              <>
                <label className="field-label" htmlFor="chromaUrl">{t("documents.chromaUrl")}</label>
                <input
                  id="chromaUrl"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, chromaUrl: event.target.value })}
                  placeholder="http://localhost:8000"
                  value={settings.chromaUrl || ""}
                />

                <label className="field-label" htmlFor="chromaCollection">{t("documents.chromaCollection")}</label>
                <input
                  id="chromaCollection"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, chromaCollection: event.target.value })}
                  placeholder="sb_chat_documents"
                  value={settings.chromaCollection || ""}
                />
              </>
            )}

            {(settings.vectorStoreProvider || "json") === "pinecone" && (
              <>
                <label className="field-label" htmlFor="pineconeApiKey">{t("documents.pineconeApiKey")}</label>
                <input
                  id="pineconeApiKey"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, pineconeApiKey: event.target.value })}
                  placeholder={t("documents.pineconeApiKeyPlaceholder")}
                  type="password"
                  value={settings.pineconeApiKey || ""}
                />

                <label className="field-label" htmlFor="pineconeIndex">{t("documents.pineconeIndex")}</label>
                <input
                  id="pineconeIndex"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, pineconeIndex: event.target.value })}
                  placeholder="sb-chat-documents"
                  value={settings.pineconeIndex || ""}
                />

                <label className="field-label" htmlFor="pineconeNamespace">{t("documents.pineconeNamespace")}</label>
                <input
                  id="pineconeNamespace"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, pineconeNamespace: event.target.value })}
                  placeholder="documents"
                  value={settings.pineconeNamespace || ""}
                />

                <div className="rag-setting-grid">
                  <label>
                    <span>{t("documents.pineconeCloud")}</span>
                    <input
                      className="field"
                      onChange={(event) => saveSettings({ ...settings, pineconeCloud: event.target.value })}
                      placeholder="aws"
                      value={settings.pineconeCloud || ""}
                    />
                  </label>
                  <label>
                    <span>{t("documents.pineconeRegion")}</span>
                    <input
                      className="field"
                      onChange={(event) => saveSettings({ ...settings, pineconeRegion: event.target.value })}
                      placeholder="us-east-1"
                      value={settings.pineconeRegion || ""}
                    />
                  </label>
                </div>
              </>
            )}

            {(settings.vectorStoreProvider || "json") === "json" && (
              <p className="settings-hint">{t("documents.localVectorStoreHint")}</p>
            )}

            {(settings.vectorStoreProvider || "json") === "qdrant" && (
              <>
                <p className="settings-hint">{t("documents.qdrantVectorStoreHint")}</p>
                <label className="field-label" htmlFor="qdrantUrl">{t("documents.qdrantUrl")}</label>
                <input
                  id="qdrantUrl"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, qdrantUrl: event.target.value })}
                  placeholder="https://xyz-example.eu-central.aws.cloud.qdrant.io"
                  value={settings.qdrantUrl || ""}
                />

                <label className="field-label" htmlFor="qdrantApiKey">{t("documents.qdrantApiKey")}</label>
                <input
                  id="qdrantApiKey"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, qdrantApiKey: event.target.value })}
                  placeholder={t("documents.qdrantApiKeyPlaceholder")}
                  type="password"
                  value={settings.qdrantApiKey || ""}
                />

                <label className="field-label" htmlFor="qdrantCollection">{t("documents.qdrantCollection")}</label>
                <input
                  id="qdrantCollection"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, qdrantCollection: event.target.value })}
                  placeholder="batuk_documents"
                  value={settings.qdrantCollection || ""}
                />
              </>
            )}

            {(settings.vectorStoreProvider || "json") === "supabase" && (
              <>
                <p className="settings-hint">{t("documents.supabaseVectorStoreHint")}</p>
                <label className="field-label" htmlFor="supabaseBucket">{t("documents.supabaseBucket")}</label>
                <input
                  id="supabaseBucket"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, supabaseBucket: event.target.value })}
                  placeholder="batuk-documents"
                  value={settings.supabaseBucket || ""}
                />

                <label className="field-label" htmlFor="supabaseChunksTable">{t("documents.supabaseChunksTable")}</label>
                <input
                  id="supabaseChunksTable"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, supabaseChunksTable: event.target.value })}
                  placeholder="batuk_document_chunks"
                  value={settings.supabaseChunksTable || ""}
                />

                <label className="field-label" htmlFor="supabaseMatchFunction">{t("documents.supabaseMatchFunction")}</label>
                <input
                  id="supabaseMatchFunction"
                  className="field"
                  onChange={(event) => saveSettings({ ...settings, supabaseMatchFunction: event.target.value })}
                  placeholder="match_batuk_document_chunks"
                  value={settings.supabaseMatchFunction || ""}
                />
              </>
            )}

            <div className="rag-setting-grid">
              <label>
                <span>{t("documents.chunkSize")}</span>
                <input
                  className="field"
                  min="600"
                  onChange={(event) => saveSettings({ ...settings, chunkSize: event.target.value })}
                  type="number"
                  value={settings.chunkSize}
                />
              </label>
              <label>
                <span>{t("documents.overlap")}</span>
                <input
                  className="field"
                  min="0"
                  onChange={(event) => saveSettings({ ...settings, chunkOverlap: event.target.value })}
                  type="number"
                  value={settings.chunkOverlap}
                />
              </label>
              <label>
                <span>{t("documents.topK")}</span>
                <input
                  className="field"
                  min="1"
                  onChange={(event) => saveSettings({ ...settings, topK: event.target.value })}
                  type="number"
                  value={settings.topK}
                />
              </label>
            </div>
          </aside>

          <section className="documents-list-card">
            <div className="documents-list-head">
              <div className="doc-search">
                <Search size={17} />
                <input onChange={(event) => setQuery(event.target.value)} placeholder={t("documents.search")} value={query} />
              </div>
              <button className="top-icon" onClick={loadDocuments} title={t("documents.refresh")} type="button">
                <RefreshCw className={status === "loading" ? "animate-spin" : ""} size={18} />
              </button>
            </div>

            {error && <p className="settings-error">{error}</p>}
            {status === "uploading" && <p className="settings-hint">{t("documents.extracting")}</p>}

            <div className="document-rows">
              {visibleDocuments.length === 0 ? (
                <div className="empty-documents">
                  <FileText size={28} />
                  <strong>{t("documents.noDocuments")}</strong>
                  <span>{t("documents.noDocumentsCopy")}</span>
                </div>
              ) : (
                visibleDocuments.map((document) => {
                  const Icon = documentIcon(document.name);
                  return (
                    <article className={`document-row ${document.status === "failed" ? "failed" : ""}`} key={document.id}>
                      <Icon size={22} />
                      <div>
                        <strong>{document.name}</strong>
                        <span>
                          {formatBytes(document.size, locale)} · {document.chunkCount || 0} {t("documents.chunks")} · {document.embeddingProvider}
                          {" "}· {document.vectorStoreProvider || settings.vectorStoreProvider || "json"}
                          {document.extractionEngine ? ` · ${document.extractionEngine}` : ""}
                          {document.graphRagEnabled ? ` · graph ${document.graphEntityCount || 0}/${document.graphRelationshipCount || 0}` : ""}
                          {document.piiDetectionEnabled ? ` · PII ${document.piiRisk || "scanned"}` : ""}
                          {document.status === "failed" ? ` · ${document.error}` : ""}
                        </span>
                      </div>
                      <a
                        className="top-icon"
                        href={`/api/documents/${document.id}/download${selectedWorkspaceId ? `?workspaceId=${encodeURIComponent(selectedWorkspaceId)}` : ""}`}
                        title={t("documents.download")}
                      >
                        <Download size={17} />
                      </a>
                      <button className="top-icon" onClick={() => reindexDocument(document.id)} title={t("documents.reindex")} type="button">
                        <RotateCw size={17} />
                      </button>
                      <button className="top-icon danger-icon" onClick={() => deleteDocument(document.id)} title={t("documents.delete")} type="button">
                        <Trash2 size={17} />
                      </button>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="17" viewBox="0 0 24 24" width="17">
      <path d="M12 3l1.6 5.1L19 10l-5.4 1.9L12 17l-1.6-5.1L5 10l5.4-1.9L12 3z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
