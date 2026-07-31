import { createHash } from "node:crypto";
import { QdrantClient } from "@qdrant/js-client-rest";

const DEFAULT_QDRANT_COLLECTION = "batuk_documents";
const UPSERT_BATCH_SIZE = 80;
const collectionReady = new Map();

export function normalizeQdrantUrl(url) {
  return String(url || process.env.QDRANT_URL || "").trim().replace(/\/+$/, "");
}

export function normalizeQdrantCollectionName(name) {
  const normalized = String(name || process.env.QDRANT_COLLECTION || DEFAULT_QDRANT_COLLECTION)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 255);

  return normalized || DEFAULT_QDRANT_COLLECTION;
}

function resolveQdrantApiKey(settings = {}) {
  return String(settings.qdrantApiKey || process.env.QDRANT_API_KEY || "").trim();
}

function getQdrantClient(settings = {}) {
  const url = normalizeQdrantUrl(settings.qdrantUrl);
  const apiKey = resolveQdrantApiKey(settings);

  if (!url) {
    throw new Error("Qdrant Cloud needs QDRANT_URL in .env or a Qdrant URL in Documents settings.");
  }
  if (!apiKey) {
    throw new Error("Qdrant Cloud needs QDRANT_API_KEY in .env or a Qdrant API key in Documents settings.");
  }

  return new QdrantClient({ url, apiKey });
}

function isNotFoundError(error) {
  const message = String(error?.message || "");
  const status = Number(error?.status || error?.statusCode || error?.cause?.status || 0);
  return status === 404 || /\b404\b|not found|does not exist/i.test(message);
}

export function qdrantPointId(value) {
  const hex = createHash("sha256").update(String(value || "")).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function chunkId(chunk) {
  return String(`${chunk.documentId}-chunk-${Number(chunk.index || 0)}`);
}

function metadataForChunk(chunk) {
  return {
    chunkId: chunkId(chunk),
    documentId: String(chunk.documentId || ""),
    documentName: String(chunk.documentName || "Document"),
    chunkIndex: Number(chunk.index || 0),
    embeddingProvider: String(chunk.embeddingProvider || ""),
    embeddingModel: String(chunk.embeddingModel || ""),
    scopeType: String(chunk.scopeType || "personal"),
    organizationId: String(chunk.organizationId || ""),
    userId: String(chunk.userId || ""),
    workspaceId: String(chunk.workspaceId || ""),
    createdAt: String(chunk.createdAt || ""),
    text: String(chunk.content || ""),
    pageStart: chunk.pageStart === null || chunk.pageStart === undefined ? "" : String(chunk.pageStart),
    pageEnd: chunk.pageEnd === null || chunk.pageEnd === undefined ? "" : String(chunk.pageEnd),
    elementType: String(chunk.elementType || ""),
    sourceElementIds: JSON.stringify(chunk.sourceElementIds || []),
  };
}

function matchFilter(key, value) {
  return {
    key,
    match: {
      value: String(value || ""),
    },
  };
}

function scopeFilter(settings = {}) {
  const must = [];

  if (settings.scopeType) {
    must.push(matchFilter("scopeType", settings.scopeType));
    must.push(matchFilter("organizationId", settings.organizationId));
    must.push(matchFilter("userId", settings.userId));
  }

  return must.length ? { must } : undefined;
}

async function ensureCollection(settings = {}, dimensions) {
  const collectionName = normalizeQdrantCollectionName(settings.qdrantCollection);
  const cacheKey = `${normalizeQdrantUrl(settings.qdrantUrl)}:${collectionName}:${dimensions}`;

  if (collectionReady.has(cacheKey)) {
    return collectionReady.get(cacheKey);
  }

  const ready = (async () => {
    const client = getQdrantClient(settings);
    const exists = await client.collectionExists(collectionName).then((result) => Boolean(result.exists ?? result)).catch((error) => {
      if (isNotFoundError(error)) return false;
      throw error;
    });

    if (!exists) {
      await client.createCollection(collectionName, {
        vectors: {
          size: dimensions,
          distance: "Cosine",
        },
      });
    }

    return { client, collectionName };
  })();

  collectionReady.set(cacheKey, ready);
  return ready;
}

export async function upsertQdrantChunks(chunks = [], settings = {}) {
  if (!chunks.length) return;

  const dimensions = chunks[0]?.embedding?.length;
  if (!dimensions) {
    throw new Error("Qdrant upsert needs embedded chunks.");
  }

  const { client, collectionName } = await ensureCollection(settings, dimensions);
  await deleteQdrantDocument(chunks[0].documentId, settings);

  for (let offset = 0; offset < chunks.length; offset += UPSERT_BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + UPSERT_BATCH_SIZE);
    await client.upsert(collectionName, {
      wait: true,
      points: batch.map((chunk) => ({
        id: qdrantPointId(chunkId(chunk)),
        vector: chunk.embedding,
        payload: metadataForChunk(chunk),
      })),
    });
  }

  return { collectionName };
}

export async function deleteQdrantDocument(documentId, settings = {}) {
  if (!documentId) return;

  const client = getQdrantClient(settings);
  const collectionName = normalizeQdrantCollectionName(settings.qdrantCollection);
  await client.delete(collectionName, {
    wait: true,
    filter: {
      must: [matchFilter("documentId", documentId)],
    },
  }).catch((error) => {
    if (!isNotFoundError(error)) throw error;
  });
}

export async function queryQdrantChunks(queryEmbedding, settings = {}) {
  const client = getQdrantClient(settings);
  const collectionName = normalizeQdrantCollectionName(settings.qdrantCollection);
  const result = await client.query(collectionName, {
    query: queryEmbedding,
    limit: Number(settings.topK || 6),
    with_payload: true,
    with_vector: false,
    ...(scopeFilter(settings) ? { filter: scopeFilter(settings) } : {}),
  });
  const points = result?.points || result || [];

  return points
    .map((match) => {
      const payload = match.payload || {};
      return {
        id: String(match.id || payload.chunkId || ""),
        documentId: payload.documentId,
        documentName: payload.documentName || "Document",
        index: Number(payload.chunkIndex || 0),
        content: payload.text || "",
        score: Number(match.score || 0),
        pageStart: payload.pageStart ? Number(payload.pageStart) : null,
        pageEnd: payload.pageEnd ? Number(payload.pageEnd) : null,
        elementType: payload.elementType || null,
        sourceElementIds: payload.sourceElementIds ? JSON.parse(payload.sourceElementIds) : [],
      };
    })
    .filter((chunk) => chunk.content);
}
