import { ChromaClient } from "chromadb";

const DEFAULT_CHROMA_URL = "http://localhost:8000";
const DEFAULT_CHROMA_COLLECTION = "sb_chat_documents";

export function normalizeChromaCollectionName(name) {
  const normalized = String(name || DEFAULT_CHROMA_COLLECTION)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 63);

  return normalized || DEFAULT_CHROMA_COLLECTION;
}

export function normalizeChromaUrl(url) {
  return String(url || process.env.CHROMA_URL || DEFAULT_CHROMA_URL).trim().replace(/\/+$/, "");
}

function getClient(settings = {}) {
  return new ChromaClient({
    path: normalizeChromaUrl(settings.chromaUrl),
  });
}

async function getCollection(settings = {}) {
  const client = getClient(settings);
  return client.getOrCreateCollection({
    name: normalizeChromaCollectionName(settings.chromaCollection),
  });
}

function chunkId(chunk) {
  return String(chunk.id || `${chunk.documentId}-${chunk.index}`);
}

function metadataForChunk(chunk) {
  return {
    chunkId: chunkId(chunk),
    documentId: String(chunk.documentId || ""),
    documentName: String(chunk.documentName || "Document"),
    chunkIndex: Number(chunk.index || 0),
    embeddingProvider: String(chunk.embeddingProvider || ""),
    embeddingModel: String(chunk.embeddingModel || ""),
    createdAt: String(chunk.createdAt || ""),
  };
}

export async function upsertChromaChunks(chunks = [], settings = {}) {
  if (!chunks.length) return;

  const collection = await getCollection(settings);

  await collection.delete({
    where: { documentId: String(chunks[0].documentId) },
  }).catch((error) => {
    const message = String(error?.message || "");
    if (!/not found|does not exist/i.test(message)) throw error;
  });

  await collection.upsert({
    ids: chunks.map(chunkId),
    documents: chunks.map((chunk) => chunk.content),
    embeddings: chunks.map((chunk) => chunk.embedding),
    metadatas: chunks.map(metadataForChunk),
  });
}

export async function deleteChromaDocument(documentId, settings = {}) {
  if (!documentId) return;

  const collection = await getCollection(settings);
  await collection.delete({
    where: { documentId: String(documentId) },
  });
}

export async function queryChromaChunks(queryEmbedding, settings = {}) {
  const collection = await getCollection(settings);
  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: Number(settings.topK || 6),
    include: ["documents", "metadatas", "distances"],
  });

  const ids = result.ids?.[0] || [];
  const documents = result.documents?.[0] || [];
  const metadatas = result.metadatas?.[0] || [];
  const distances = result.distances?.[0] || [];

  return ids.map((id, index) => {
    const metadata = metadatas[index] || {};
    return {
      id,
      documentId: metadata.documentId,
      documentName: metadata.documentName || "Document",
      index: Number(metadata.chunkIndex || 0),
      content: documents[index] || "",
      score: distances[index] === undefined ? 0 : 1 / (1 + Number(distances[index] || 0)),
      distance: distances[index],
    };
  }).filter((chunk) => chunk.content);
}
