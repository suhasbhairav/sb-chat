import { json, resolveServerApiKey } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { makeId } from "@/lib/chat-utils";
import { createEmbeddings } from "@/lib/rag-embeddings";
import { normalizeChromaCollectionName, normalizeChromaUrl, upsertChromaChunks } from "@/lib/rag-chroma";
import {
  normalizePineconeCloud,
  normalizePineconeIndexName,
  normalizePineconeNamespace,
  normalizePineconeRegion,
  upsertPineconeChunks,
} from "@/lib/rag-pinecone";
import { chunkDocumentText, extractDocumentText } from "@/lib/rag-processing";
import { readDocumentStore, saveUploadedDocumentFile, summarizeDocuments, writeDocumentStore } from "@/lib/rag-store";
import { recordAuditEvent } from "@/lib/compliance-store";

export const runtime = "nodejs";

function normalizeSettings(settings = {}) {
  const embeddingProvider = settings.embeddingProvider === "openai" ? "openai" : "local";
  const vectorStoreProvider = ["chroma", "pinecone"].includes(settings.vectorStoreProvider) ? settings.vectorStoreProvider : "json";
  return {
    embeddingProvider,
    embeddingModel: embeddingProvider === "openai" ? settings.embeddingModel || "text-embedding-3-small" : "local-hash-v1",
    vectorStoreProvider,
    chromaUrl: normalizeChromaUrl(settings.chromaUrl),
    chromaCollection: normalizeChromaCollectionName(settings.chromaCollection),
    pineconeApiKey: String(settings.pineconeApiKey || ""),
    pineconeIndex: normalizePineconeIndexName(settings.pineconeIndex),
    pineconeNamespace: normalizePineconeNamespace(settings.pineconeNamespace),
    pineconeCloud: normalizePineconeCloud(settings.pineconeCloud),
    pineconeRegion: normalizePineconeRegion(settings.pineconeRegion),
    chunkSize: Math.min(6000, Math.max(600, Number(settings.chunkSize || 1800))),
    chunkOverlap: Math.min(1200, Math.max(0, Number(settings.chunkOverlap || 220))),
    topK: Math.min(12, Math.max(1, Number(settings.topK || 6))),
  };
}

export async function GET() {
  const { response } = await requireServerPermission({ document: ["read"] });
  if (response) return response;

  const store = await readDocumentStore();
  return json(summarizeDocuments(store));
}

export async function PATCH(request) {
  const { session, response } = await requireServerPermission({ document: ["update"] });
  if (response) return response;

  const payload = await request.json();
  const store = await readDocumentStore();
  const nextStore = {
    ...store,
    settings: normalizeSettings({ ...store.settings, ...payload }),
  };

  await writeDocumentStore(nextStore);
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
      openAIBaseUrl: formData.get("openAIBaseUrl"),
    });
    const apiKey = String(formData.get("apiKey") || "") || resolveServerApiKey("openai", "");

    if (!files.length) {
      return json({ error: "Choose at least one document." }, 400);
    }

    let store = await readDocumentStore();
    const uploaded = [];

    for (const file of files) {
      const id = makeId();
      const createdAt = new Date().toISOString();
      const saved = await saveUploadedDocumentFile(file);
      const baseDocument = {
        id,
        name: file.name,
        storedName: saved.storedName,
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
        const document = {
          ...baseDocument,
          status: "ready",
          textLength: text.length,
          chunkCount: indexedChunks.length,
          vectorStoreProvider: resolvedSettings.vectorStoreProvider,
          pineconeIndex: resolvedSettings.vectorStoreProvider === "pinecone" ? resolvedSettings.pineconeIndex : null,
          pineconeNamespace: resolvedSettings.vectorStoreProvider === "pinecone" ? resolvedSettings.pineconeNamespace : null,
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
    }

    await writeDocumentStore(store);
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
