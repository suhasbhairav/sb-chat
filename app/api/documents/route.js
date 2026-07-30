import { json, resolveServerApiKey } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { makeId } from "@/lib/chat-utils";
import { createEmbeddings, normalizeEmbeddingSettings } from "@/lib/rag-embeddings";
import { normalizeChromaCollectionName, normalizeChromaUrl, upsertChromaChunks } from "@/lib/rag-chroma";
import {
  normalizePineconeCloud,
  normalizePineconeIndexName,
  normalizePineconeNamespace,
  normalizePineconeRegion,
  upsertPineconeChunks,
} from "@/lib/rag-pinecone";
import { normalizeQdrantCollectionName, normalizeQdrantUrl, upsertQdrantChunks } from "@/lib/rag-qdrant";
import { normalizeSupabaseBucket, normalizeSupabaseChunksTable, normalizeSupabaseMatchFunction, upsertSupabaseChunks } from "@/lib/rag-supabase";
import { chunkDocumentText, extractDocumentText } from "@/lib/rag-processing";
import { cleanupTemporaryDocumentFile, readDocumentStore, saveUploadedDocumentFileForScope, summarizeDocuments, writeDocumentStore } from "@/lib/rag-store";
import { recordAuditEvent } from "@/lib/compliance-store";
import { withProductDataScope } from "@/lib/product-data-store";
import { resolveDocumentProductDataScope } from "@/lib/workspace-access";

export const runtime = "nodejs";

function normalizeSettings(settings = {}) {
  const embeddingSettings = normalizeEmbeddingSettings(settings);
  const vectorStoreProvider = ["chroma", "pinecone", "qdrant", "supabase"].includes(settings.vectorStoreProvider) ? settings.vectorStoreProvider : "json";
  return {
    ...embeddingSettings,
    vectorStoreProvider,
    chromaUrl: normalizeChromaUrl(settings.chromaUrl),
    chromaCollection: normalizeChromaCollectionName(settings.chromaCollection),
    pineconeApiKey: String(settings.pineconeApiKey || ""),
    pineconeIndex: normalizePineconeIndexName(settings.pineconeIndex),
    pineconeNamespace: normalizePineconeNamespace(settings.pineconeNamespace),
    pineconeCloud: normalizePineconeCloud(settings.pineconeCloud),
    pineconeRegion: normalizePineconeRegion(settings.pineconeRegion),
    qdrantUrl: normalizeQdrantUrl(settings.qdrantUrl),
    qdrantApiKey: String(settings.qdrantApiKey || ""),
    qdrantCollection: normalizeQdrantCollectionName(settings.qdrantCollection),
    supabaseBucket: normalizeSupabaseBucket(settings.supabaseBucket),
    supabaseChunksTable: normalizeSupabaseChunksTable(settings.supabaseChunksTable),
    supabaseMatchFunction: normalizeSupabaseMatchFunction(settings.supabaseMatchFunction),
    chunkSize: Math.min(6000, Math.max(600, Number(settings.chunkSize || 1800))),
    chunkOverlap: Math.min(1200, Math.max(0, Number(settings.chunkOverlap || 220))),
    topK: Math.min(12, Math.max(1, Number(settings.topK || 6))),
  };
}

export async function GET(request) {
  const { session, response } = await requireServerPermission({ document: ["read"] });
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const scope = await resolveDocumentProductDataScope(session, searchParams.get("workspaceId"));
  const store = await withProductDataScope(scope, () => readDocumentStore());
  return json(summarizeDocuments(store));
}

export async function PATCH(request) {
  const { session, response } = await requireServerPermission({ document: ["update"] });
  if (response) return response;

  const payload = await request.json();
  const scope = await resolveDocumentProductDataScope(session, payload.workspaceId);
  const store = await withProductDataScope(scope, () => readDocumentStore());
  const nextStore = {
    ...store,
    settings: normalizeSettings({ ...store.settings, ...payload }),
  };

  await withProductDataScope(scope, () => writeDocumentStore(nextStore));
  await recordAuditEvent({
    category: "document",
    action: "document.settings.update",
    outcome: "success",
    actor: session.user,
    metadata: {
      embeddingProvider: nextStore.settings.embeddingProvider,
      vectorStoreProvider: nextStore.settings.vectorStoreProvider,
      chromaCollection: nextStore.settings.chromaCollection,
      pineconeIndex: nextStore.settings.pineconeIndex,
    },
  }).catch(() => {});
  return json(summarizeDocuments(nextStore));
}

export async function POST(request) {
  try {
    const { session, response } = await requireServerPermission({ document: ["create"] });
    if (response) return response;

    const formData = await request.formData();
    const scope = await resolveDocumentProductDataScope(session, formData.get("workspaceId"));
    const files = formData.getAll("files").filter((file) => file?.name);
    const settings = normalizeSettings({
      embeddingProvider: formData.get("embeddingProvider"),
      embeddingModel: formData.get("embeddingModel"),
      chunkSize: formData.get("chunkSize"),
      chunkOverlap: formData.get("chunkOverlap"),
      topK: formData.get("topK"),
      vectorStoreProvider: formData.get("vectorStoreProvider"),
      chromaUrl: formData.get("chromaUrl"),
      chromaCollection: formData.get("chromaCollection"),
      pineconeIndex: formData.get("pineconeIndex"),
      pineconeNamespace: formData.get("pineconeNamespace"),
      pineconeCloud: formData.get("pineconeCloud"),
      pineconeRegion: formData.get("pineconeRegion"),
      pineconeApiKey: formData.get("pineconeApiKey"),
      qdrantUrl: formData.get("qdrantUrl"),
      qdrantApiKey: formData.get("qdrantApiKey"),
      qdrantCollection: formData.get("qdrantCollection"),
      supabaseBucket: formData.get("supabaseBucket"),
      supabaseChunksTable: formData.get("supabaseChunksTable"),
      supabaseMatchFunction: formData.get("supabaseMatchFunction"),
      openAIBaseUrl: formData.get("openAIBaseUrl"),
    });
    Object.assign(settings, {
      scopeType: scope.scopeType,
      organizationId: scope.organizationId,
      userId: scope.userId,
      workspaceId: scope.workspaceId,
    });
    const apiKey = String(formData.get("apiKey") || "") || resolveServerApiKey("openai", "");

    if (!files.length) {
      return json({ error: "Choose at least one document." }, 400);
    }

    let store = await withProductDataScope(scope, () => readDocumentStore());
    const uploaded = [];

    for (const file of files) {
      const id = makeId();
      const createdAt = new Date().toISOString();
      const saved = await saveUploadedDocumentFileForScope(file, { documentId: id, scope, settings });
      const baseDocument = {
        id,
        name: file.name,
        storedName: saved.storedName,
        fileStorageProvider: saved.fileStorageProvider,
        storageBucket: saved.storageBucket || null,
        storagePath: saved.storagePath || null,
        type: file.type || "application/octet-stream",
        size: saved.size,
        status: "indexing",
        chunkCount: 0,
        embeddingProvider: settings.embeddingProvider,
        embeddingModel: settings.embeddingModel,
        vectorStoreProvider: settings.vectorStoreProvider,
        chromaUrl: settings.vectorStoreProvider === "chroma" ? settings.chromaUrl : null,
        chromaCollection: settings.vectorStoreProvider === "chroma" ? settings.chromaCollection : null,
        pineconeIndex: settings.vectorStoreProvider === "pinecone" ? settings.pineconeIndex : null,
        pineconeNamespace: settings.vectorStoreProvider === "pinecone" ? settings.pineconeNamespace : null,
        qdrantUrl: settings.vectorStoreProvider === "qdrant" ? settings.qdrantUrl : null,
        qdrantCollection: settings.vectorStoreProvider === "qdrant" ? settings.qdrantCollection : null,
        supabaseBucket: settings.vectorStoreProvider === "supabase" ? settings.supabaseBucket : null,
        supabaseChunksTable: settings.vectorStoreProvider === "supabase" ? settings.supabaseChunksTable : null,
        supabaseMatchFunction: settings.vectorStoreProvider === "supabase" ? settings.supabaseMatchFunction : null,
        createdAt,
      };

      try {
        const text = await extractDocumentText(saved.filePath, file.name);
        if (!text) {
          throw new Error("No extractable text found in this document.");
        }

        const chunks = chunkDocumentText(text, settings);
        const embeddings = await createEmbeddings(
          chunks.map((chunk) => chunk.content),
          {
            ...settings,
            apiKey,
            baseUrl: String(formData.get("openAIBaseUrl") || "https://api.openai.com/v1"),
          },
        );
        const indexedChunks = chunks.map((chunk, index) => ({
          ...chunk,
          documentId: id,
          documentName: file.name,
          embedding: embeddings[index],
          embeddingProvider: settings.embeddingProvider,
          embeddingModel: settings.embeddingModel,
          scopeType: scope.scopeType,
          organizationId: scope.organizationId,
          userId: scope.userId,
          workspaceId: scope.workspaceId,
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
            supabaseStoragePath: saved.storagePath,
          });
        }
        const document = {
          ...baseDocument,
          status: "ready",
          textLength: text.length,
          chunkCount: indexedChunks.length,
          vectorStoreProvider: resolvedSettings.vectorStoreProvider,
          pineconeIndex: resolvedSettings.vectorStoreProvider === "pinecone" ? resolvedSettings.pineconeIndex : null,
          pineconeNamespace: resolvedSettings.vectorStoreProvider === "pinecone" ? resolvedSettings.pineconeNamespace : null,
          qdrantUrl: resolvedSettings.vectorStoreProvider === "qdrant" ? resolvedSettings.qdrantUrl : null,
          qdrantCollection: resolvedSettings.vectorStoreProvider === "qdrant" ? resolvedSettings.qdrantCollection : null,
          supabaseBucket: resolvedSettings.vectorStoreProvider === "supabase" ? resolvedSettings.supabaseBucket : null,
          supabaseChunksTable: resolvedSettings.vectorStoreProvider === "supabase" ? resolvedSettings.supabaseChunksTable : null,
          supabaseMatchFunction: resolvedSettings.vectorStoreProvider === "supabase" ? resolvedSettings.supabaseMatchFunction : null,
        };

        store = {
          ...store,
          settings: resolvedSettings,
          documents: [document, ...store.documents.filter((item) => item.id !== id)],
          chunks: [
            ...(settings.vectorStoreProvider === "json" ? indexedChunks : indexedChunks.map(({ embedding, ...chunk }) => chunk)),
            ...store.chunks.filter((chunk) => chunk.documentId !== id),
          ],
        };
        uploaded.push(document);
      } catch (error) {
        await cleanupTemporaryDocumentFile(saved).catch(() => {});
        const failedDocument = {
          ...baseDocument,
          status: "failed",
          error: error.message || "Document indexing failed.",
        };
        store = {
          ...store,
          settings,
          documents: [failedDocument, ...store.documents.filter((item) => item.id !== id)],
        };
        uploaded.push(failedDocument);
      }
      await cleanupTemporaryDocumentFile(saved).catch(() => {});
    }

    await withProductDataScope(scope, () => writeDocumentStore(store));
    await recordAuditEvent({
      category: "document",
      action: "document.upload",
      outcome: uploaded.some((document) => document.status === "failed") ? "failure" : "success",
      actor: session.user,
      metadata: {
        count: uploaded.length,
        names: uploaded.map((document) => document.name),
        vectorStoreProvider: store.settings.vectorStoreProvider,
        embeddingProvider: store.settings.embeddingProvider,
      },
    }).catch(() => {});

    return json({
      ...summarizeDocuments(store),
      uploaded,
    });
  } catch (error) {
    return json({ error: error.message || "Document upload failed." }, 500);
  }
}
