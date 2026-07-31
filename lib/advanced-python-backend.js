import { randomUUID } from "node:crypto";

const DEFAULT_PYTHON_API_URL = "http://localhost:8000";

export function isAdvancedPythonBackendEnabled(settings = {}) {
  if (settings.advancedRagEnabled || settings.graphRagEnabled || settings.piiDetectionEnabled) return true;
  return String(process.env.BATUK_ADVANCED_RAG_ENABLED || "").toLowerCase() === "true";
}

function endpoint(path) {
  const base = String(process.env.BATUK_PYTHON_API_URL || DEFAULT_PYTHON_API_URL).replace(/\/+$/, "");
  return `${base}${path}`;
}

export async function callAdvancedPythonBackend(path, payload) {
  const secret = process.env.BATUK_PYTHON_INTERNAL_SECRET || "";
  const requestId = randomUUID();
  const response = await fetch(endpoint(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": secret,
      "X-Batuk-Request-Id": requestId,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.error || `Advanced Python backend failed for ${path}.`);
  }
  return data;
}

export async function processAdvancedRagDocument({ filePath, fileName, documentId, scope, settings, provider, selectedModel }) {
  return callAdvancedPythonBackend("/v1/advanced-rag", {
    filePath,
    fileName,
    documentId,
    scope: {
      scopeType: scope.scopeType,
      organizationId: scope.organizationId,
      userId: scope.userId,
      workspaceId: scope.workspaceId,
    },
    options: {
      chunkSize: settings.chunkSize,
      chunkOverlap: settings.chunkOverlap,
      strategy: settings.advancedExtractionStrategy || "hi_res",
      languages: settings.advancedExtractionLanguages ? String(settings.advancedExtractionLanguages).split(",").map((item) => item.trim()).filter(Boolean) : ["eng"],
    },
    graphRag: Boolean(settings.graphRagEnabled),
    pii: Boolean(settings.piiDetectionEnabled),
    provider,
    selectedModel,
  });
}

export async function deleteAdvancedGraphDocument(documentId) {
  if (!documentId) return null;
  return callAdvancedPythonBackend("/v1/graph-rag/document/delete", { documentId });
}
