import { json, resolveServerApiKey } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { createEmbeddings } from "@/lib/rag-embeddings";
import { deleteChromaDocument, normalizeChromaCollectionName, normalizeChromaUrl, upsertChromaChunks } from "@/lib/rag-chroma";
import {
  deletePineconeDocument,
  normalizePineconeCloud,
  normalizePineconeIndexName,
  normalizePineconeNamespace,
  normalizePineconeRegion,
  upsertPineconeChunks,
} from "@/lib/rag-pinecone";
import { chunkDocumentText, extractDocumentText } from "@/lib/rag-processing";
import { getDocumentFilePath, readDocumentStore, summarizeDocuments, writeDocumentStore } from "@/lib/rag-store";
import { recordAuditEvent } from "@/lib/compliance-store";
import { withProductDataScope } from "@/lib/product-data-store";
import { resolveDocumentProductDataScope } from "@/lib/workspace-access";

export const runtime = "nodejs";

async function markDocumentReindexFailed(documentId, error, scope) {
  const store = await withProductDataScope(scope, () => readDocumentStore());
  const message = error.message || "Document reindex failed.";
  const nextStore = {
    ...store,
    documents: store.documents.map((item) =>
      item.id === documentId
        ? {
            ...item,
            status: "failed",
            error: message,
            reindexedAt: new Date().toISOString(),
          }
        : item,
    ),
  };

  await withProductDataScope(scope, () => writeDocumentStore(nextStore));
  return nextStore;
}

export async function POST(request, { params }) {
  let documentId = "";
  let activeScope = null;

  try {
    const { session, response } = await requireServerPermission({ document: ["update"] });
    if (response) return response;

    const { id } = await params;
    documentId = id;
    const payload = await request.json().catch(() => ({}));
    activeScope = await resolveDocumentProductDataScope(session, payload.workspaceId);
    const store = await withProductDataScope(activeScope, () => readDocumentStore());
    const document = store.documents.find((item) => item.id === id);

    if (!document) {
      return json({ error: "Document not found." }, 404);
    }

    const requestedVectorStoreProvider = payload.vectorStoreProvider || store.settings.vectorStoreProvider;
    const vectorStoreProvider = ["chroma", "pinecone"].includes(requestedVectorStoreProvider) ? requestedVectorStoreProvider : "json";
    const settings = {
      ...store.settings,
      embeddingProvider: payload.embeddingProvider || store.settings.embeddingProvider,
      embeddingModel: payload.embeddingModel || store.settings.embeddingModel,
      vectorStoreProvider,
      chromaUrl: normalizeChromaUrl(payload.chromaUrl || store.settings.chromaUrl),
      chromaCollection: normalizeChromaCollectionName(payload.chromaCollection || store.settings.chromaCollection),
      pineconeApiKey: String(payload.pineconeApiKey || store.settings.pineconeApiKey || ""),
      pineconeIndex: normalizePineconeIndexName(payload.pineconeIndex || store.settings.pineconeIndex),
      pineconeNamespace: normalizePineconeNamespace(payload.pineconeNamespace || store.settings.pineconeNamespace),
      pineconeCloud: normalizePineconeCloud(payload.pineconeCloud || store.settings.pineconeCloud),
      pineconeRegion: normalizePineconeRegion(payload.pineconeRegion || store.settings.pineconeRegion),
      scopeType: activeScope.scopeType,
      organizationId: activeScope.organizationId,
      userId: activeScope.userId,
      workspaceId: activeScope.workspaceId,
    };
    const filePath = getDocumentFilePath(document);
    const text = await extractDocumentText(filePath, document.name);

    if (!text) {
      throw new Error("No extractable text found in this document.");
    }

    const chunks = chunkDocumentText(text, settings);
    const embeddings = await createEmbeddings(
      chunks.map((chunk) => chunk.content),
      {
        ...settings,
        apiKey: payload.apiKey || resolveServerApiKey("openai", ""),
        baseUrl: payload.openAIBaseUrl || "https://api.openai.com/v1",
      },
    );
    const createdAt = new Date().toISOString();
    const indexedChunks = chunks.map((chunk, index) => ({
      ...chunk,
      documentId: document.id,
      documentName: document.name,
      embedding: embeddings[index],
      embeddingProvider: settings.embeddingProvider,
      embeddingModel: settings.embeddingModel,
      scopeType: activeScope.scopeType,
      organizationId: activeScope.organizationId,
      userId: activeScope.userId,
      workspaceId: activeScope.workspaceId,
      createdAt,
    }));
    if (settings.vectorStoreProvider === "chroma") {
      await upsertChromaChunks(indexedChunks, settings);
    }
    let resolvedSettings = settings;
    if (settings.vectorStoreProvider === "pinecone") {
      const pineconeTarget = await upsertPineconeChunks(indexedChunks, settings);
      resolvedSettings = {
        ...settings,
        pineconeIndex: pineconeTarget.indexName,
        pineconeNamespace: pineconeTarget.namespace,
      };
    }
    const oldChromaSettings = {
      ...store.settings,
      chromaUrl: document.chromaUrl || store.settings.chromaUrl,
      chromaCollection: document.chromaCollection || store.settings.chromaCollection,
    };
    const oldPineconeSettings = {
      ...store.settings,
      pineconeIndex: document.pineconeIndex || store.settings.pineconeIndex,
      pineconeNamespace: document.pineconeNamespace || store.settings.pineconeNamespace,
      pineconeApiKey: settings.pineconeApiKey,
    };
    const chromaLocationChanged =
      oldChromaSettings.chromaUrl !== resolvedSettings.chromaUrl || oldChromaSettings.chromaCollection !== resolvedSettings.chromaCollection;
    const pineconeLocationChanged =
      oldPineconeSettings.pineconeIndex !== resolvedSettings.pineconeIndex ||
      oldPineconeSettings.pineconeNamespace !== resolvedSettings.pineconeNamespace;

    if (document.vectorStoreProvider === "chroma" && (resolvedSettings.vectorStoreProvider !== "chroma" || chromaLocationChanged)) {
      await deleteChromaDocument(document.id, oldChromaSettings).catch(() => {});
    }
    if (document.vectorStoreProvider === "pinecone" && (resolvedSettings.vectorStoreProvider !== "pinecone" || pineconeLocationChanged)) {
      await deletePineconeDocument(document.id, oldPineconeSettings).catch(() => {});
    }
    const nextDocument = {
      ...document,
      status: "ready",
      error: null,
      textLength: text.length,
      chunkCount: indexedChunks.length,
      embeddingProvider: resolvedSettings.embeddingProvider,
      embeddingModel: resolvedSettings.embeddingModel,
      vectorStoreProvider: resolvedSettings.vectorStoreProvider,
      chromaUrl: resolvedSettings.vectorStoreProvider === "chroma" ? resolvedSettings.chromaUrl : null,
      chromaCollection: resolvedSettings.vectorStoreProvider === "chroma" ? resolvedSettings.chromaCollection : null,
      pineconeIndex: resolvedSettings.vectorStoreProvider === "pinecone" ? resolvedSettings.pineconeIndex : null,
      pineconeNamespace: resolvedSettings.vectorStoreProvider === "pinecone" ? resolvedSettings.pineconeNamespace : null,
      reindexedAt: createdAt,
    };
    const nextStore = {
      ...store,
      settings: resolvedSettings,
      documents: store.documents.map((item) => (item.id === document.id ? nextDocument : item)),
      chunks: [
        ...(resolvedSettings.vectorStoreProvider === "json" ? indexedChunks : indexedChunks.map(({ embedding, ...chunk }) => chunk)),
        ...store.chunks.filter((chunk) => chunk.documentId !== document.id),
      ],
    };

    await withProductDataScope(activeScope, () => writeDocumentStore(nextStore));
    await recordAuditEvent({
      category: "document",
      action: "document.reindex",
      outcome: "success",
      actor: session.user,
      target: { type: "document", id: document.id },
      metadata: {
        name: document.name,
        vectorStoreProvider: resolvedSettings.vectorStoreProvider,
        embeddingProvider: resolvedSettings.embeddingProvider,
        chunkCount: indexedChunks.length,
      },
    }).catch(() => {});
    return json(summarizeDocuments(nextStore));
  } catch (error) {
    console.error("Document reindex failed", error);
    if (documentId && activeScope) {
      const failedStore = await markDocumentReindexFailed(documentId, error, activeScope).catch(() => null);
      return json(
        {
          ...(failedStore ? summarizeDocuments(failedStore) : {}),
          error: error.message || "Document reindex failed.",
        },
        500,
      );
    }

    return json({ error: error.message || "Document reindex failed." }, 500);
  }
}
