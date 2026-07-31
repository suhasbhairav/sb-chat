import { json, resolveServerApiKey } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { makeId } from "@/lib/chat-utils";
import { createEmbeddings, normalizeEmbeddingSettings } from "@/lib/rag-embeddings";
import { deleteChromaDocument, normalizeChromaCollectionName, normalizeChromaUrl, upsertChromaChunks } from "@/lib/rag-chroma";
import {
  deletePineconeDocument,
  normalizePineconeCloud,
  normalizePineconeIndexName,
  normalizePineconeNamespace,
  normalizePineconeRegion,
  upsertPineconeChunks,
} from "@/lib/rag-pinecone";
import { deleteQdrantDocument, normalizeQdrantCollectionName, normalizeQdrantUrl, upsertQdrantChunks } from "@/lib/rag-qdrant";
import { deleteSupabaseDocument, normalizeSupabaseBucket, normalizeSupabaseChunksTable, normalizeSupabaseMatchFunction, upsertSupabaseChunks } from "@/lib/rag-supabase";
import { chunkDocumentText, extractDocumentText } from "@/lib/rag-processing";
import { cleanupTemporaryDocumentFile, materializeDocumentFile, readDocumentStore, summarizeDocuments, writeDocumentStore } from "@/lib/rag-store";
import { isAdvancedPythonBackendEnabled, processAdvancedRagDocument } from "@/lib/advanced-python-backend";
import { recordAuditEvent } from "@/lib/compliance-store";
import { withProductDataScope } from "@/lib/product-data-store";
import { resolveDocumentProductDataScope } from "@/lib/workspace-access";

export const runtime = "nodejs";

function payloadBoolean(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

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
    const vectorStoreProvider = ["chroma", "pinecone", "qdrant", "supabase"].includes(requestedVectorStoreProvider) ? requestedVectorStoreProvider : "json";
    const embeddingSettings = normalizeEmbeddingSettings({
      ...store.settings,
      embeddingProvider: payload.embeddingProvider || store.settings.embeddingProvider,
      embeddingModel: payload.embeddingModel || store.settings.embeddingModel,
    });
    const settings = {
      ...store.settings,
      ...embeddingSettings,
      vectorStoreProvider,
      chromaUrl: normalizeChromaUrl(payload.chromaUrl || store.settings.chromaUrl),
      chromaCollection: normalizeChromaCollectionName(payload.chromaCollection || store.settings.chromaCollection),
      pineconeApiKey: String(payload.pineconeApiKey || store.settings.pineconeApiKey || ""),
      pineconeIndex: normalizePineconeIndexName(payload.pineconeIndex || store.settings.pineconeIndex),
      pineconeNamespace: normalizePineconeNamespace(payload.pineconeNamespace || store.settings.pineconeNamespace),
      pineconeCloud: normalizePineconeCloud(payload.pineconeCloud || store.settings.pineconeCloud),
      pineconeRegion: normalizePineconeRegion(payload.pineconeRegion || store.settings.pineconeRegion),
      qdrantUrl: normalizeQdrantUrl(payload.qdrantUrl || store.settings.qdrantUrl),
      qdrantApiKey: String(payload.qdrantApiKey || store.settings.qdrantApiKey || ""),
      qdrantCollection: normalizeQdrantCollectionName(payload.qdrantCollection || store.settings.qdrantCollection),
      supabaseBucket: normalizeSupabaseBucket(payload.supabaseBucket || store.settings.supabaseBucket),
      supabaseChunksTable: normalizeSupabaseChunksTable(payload.supabaseChunksTable || store.settings.supabaseChunksTable),
      supabaseMatchFunction: normalizeSupabaseMatchFunction(payload.supabaseMatchFunction || store.settings.supabaseMatchFunction),
      advancedRagEnabled: payload.advancedRagEnabled === undefined ? Boolean(store.settings.advancedRagEnabled) : payloadBoolean(payload.advancedRagEnabled),
      advancedExtractionStrategy: String(payload.advancedExtractionStrategy || store.settings.advancedExtractionStrategy || "hi_res"),
      advancedExtractionLanguages: String(payload.advancedExtractionLanguages || store.settings.advancedExtractionLanguages || "eng"),
      graphRagEnabled: payload.graphRagEnabled === undefined ? Boolean(store.settings.graphRagEnabled) : payloadBoolean(payload.graphRagEnabled),
      piiDetectionEnabled: payload.piiDetectionEnabled === undefined ? Boolean(store.settings.piiDetectionEnabled) : payloadBoolean(payload.piiDetectionEnabled),
      scopeType: activeScope.scopeType,
      organizationId: activeScope.organizationId,
      userId: activeScope.userId,
      workspaceId: activeScope.workspaceId,
    };
    const filePath = await materializeDocumentFile(document);
    const advancedResult = isAdvancedPythonBackendEnabled(settings)
      ? await processAdvancedRagDocument({
          filePath,
          fileName: document.name,
          documentId: document.id,
          scope: activeScope,
          settings,
          provider: payload.provider || null,
          selectedModel: payload.selectedModel || null,
        })
      : null;
    const text = advancedResult?.text || await extractDocumentText(filePath, document.name);

    if (!text) {
      throw new Error("No extractable text found in this document.");
    }

    const chunks = advancedResult?.chunks?.length
      ? advancedResult.chunks.map((chunk) => ({
          id: makeId(),
          content: chunk.content,
          pageStart: chunk.pageStart ?? null,
          pageEnd: chunk.pageEnd ?? null,
          elementType: chunk.elementType || null,
          sourceElementIds: chunk.sourceElementIds || [],
          metadata: chunk.metadata || {},
        }))
      : chunkDocumentText(text, settings);
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
      pageStart: chunk.pageStart ?? null,
      pageEnd: chunk.pageEnd ?? null,
      elementType: chunk.elementType || null,
      sourceElementIds: chunk.sourceElementIds || [],
      metadata: chunk.metadata || {},
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
    if (settings.vectorStoreProvider === "qdrant") {
      const qdrantTarget = await upsertQdrantChunks(indexedChunks, settings);
      resolvedSettings = {
        ...settings,
        qdrantCollection: qdrantTarget.collectionName,
      };
    }
    if (settings.vectorStoreProvider === "supabase") {
      await upsertSupabaseChunks(indexedChunks, {
        ...settings,
        supabaseStoragePath: document.storagePath,
      });
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
    const oldQdrantSettings = {
      ...store.settings,
      qdrantUrl: document.qdrantUrl || store.settings.qdrantUrl,
      qdrantCollection: document.qdrantCollection || store.settings.qdrantCollection,
      qdrantApiKey: settings.qdrantApiKey,
    };
    const oldSupabaseSettings = {
      ...store.settings,
      supabaseBucket: document.supabaseBucket || store.settings.supabaseBucket,
      supabaseChunksTable: document.supabaseChunksTable || store.settings.supabaseChunksTable,
      supabaseMatchFunction: document.supabaseMatchFunction || store.settings.supabaseMatchFunction,
    };
    const chromaLocationChanged =
      oldChromaSettings.chromaUrl !== resolvedSettings.chromaUrl || oldChromaSettings.chromaCollection !== resolvedSettings.chromaCollection;
    const pineconeLocationChanged =
      oldPineconeSettings.pineconeIndex !== resolvedSettings.pineconeIndex ||
      oldPineconeSettings.pineconeNamespace !== resolvedSettings.pineconeNamespace;
    const supabaseLocationChanged =
      oldSupabaseSettings.supabaseChunksTable !== resolvedSettings.supabaseChunksTable ||
      oldSupabaseSettings.supabaseMatchFunction !== resolvedSettings.supabaseMatchFunction;
    const qdrantLocationChanged =
      oldQdrantSettings.qdrantUrl !== resolvedSettings.qdrantUrl ||
      oldQdrantSettings.qdrantCollection !== resolvedSettings.qdrantCollection;

    if (document.vectorStoreProvider === "chroma" && (resolvedSettings.vectorStoreProvider !== "chroma" || chromaLocationChanged)) {
      await deleteChromaDocument(document.id, oldChromaSettings).catch(() => {});
    }
    if (document.vectorStoreProvider === "pinecone" && (resolvedSettings.vectorStoreProvider !== "pinecone" || pineconeLocationChanged)) {
      await deletePineconeDocument(document.id, oldPineconeSettings).catch(() => {});
    }
    if (document.vectorStoreProvider === "qdrant" && (resolvedSettings.vectorStoreProvider !== "qdrant" || qdrantLocationChanged)) {
      await deleteQdrantDocument(document.id, oldQdrantSettings).catch(() => {});
    }
    if (document.vectorStoreProvider === "supabase" && (resolvedSettings.vectorStoreProvider !== "supabase" || supabaseLocationChanged)) {
      await deleteSupabaseDocument(document.id, oldSupabaseSettings).catch(() => {});
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
      qdrantUrl: resolvedSettings.vectorStoreProvider === "qdrant" ? resolvedSettings.qdrantUrl : null,
      qdrantCollection: resolvedSettings.vectorStoreProvider === "qdrant" ? resolvedSettings.qdrantCollection : null,
      supabaseBucket: resolvedSettings.vectorStoreProvider === "supabase" ? resolvedSettings.supabaseBucket : null,
      supabaseChunksTable: resolvedSettings.vectorStoreProvider === "supabase" ? resolvedSettings.supabaseChunksTable : null,
      supabaseMatchFunction: resolvedSettings.vectorStoreProvider === "supabase" ? resolvedSettings.supabaseMatchFunction : null,
      advancedRagEnabled: Boolean(settings.advancedRagEnabled),
      extractionEngine: advancedResult?.engine || "javascript",
      structuredElementCount: advancedResult?.elements?.length || 0,
      graphRagEnabled: Boolean(settings.graphRagEnabled),
      graphEntityCount: advancedResult?.graph?.entities?.length || 0,
      graphRelationshipCount: advancedResult?.graph?.relationships?.length || 0,
      graphCommunityCount: advancedResult?.graph?.communities?.length || 0,
      graphNeo4j: advancedResult?.graph?.neo4j || null,
      piiDetectionEnabled: Boolean(settings.piiDetectionEnabled),
      piiRisk: advancedResult?.guardrails?.risk || null,
      piiFindingCount: advancedResult?.guardrails?.findings?.length || 0,
      documentStructure: advancedResult?.document?.structure || null,
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
    await cleanupTemporaryDocumentFile(filePath).catch(() => {});
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
