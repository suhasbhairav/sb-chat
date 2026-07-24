import { Pinecone } from "@pinecone-database/pinecone";

const DEFAULT_PINECONE_INDEX = "sb-chat-documents";
const DEFAULT_PINECONE_NAMESPACE = "documents";
const DEFAULT_PINECONE_CLOUD = "aws";
const DEFAULT_PINECONE_REGION = "us-east-1";
const UPSERT_BATCH_SIZE = 80;

const indexReady = new Map();

export function normalizePineconeIndexName(name) {
  const normalized = String(name || process.env.PINECONE_INDEX || DEFAULT_PINECONE_INDEX)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 45);

  return normalized || DEFAULT_PINECONE_INDEX;
}

function pineconeDimensionIndexName(indexName, dimensions) {
  const suffix = `-${dimensions}d`;
  const base = normalizePineconeIndexName(indexName).slice(0, 45 - suffix.length).replace(/-+$/g, "");
  return normalizePineconeIndexName(`${base}${suffix}`);
}

export function normalizePineconeNamespace(namespace) {
  return String(namespace || process.env.PINECONE_NAMESPACE || DEFAULT_PINECONE_NAMESPACE).trim() || DEFAULT_PINECONE_NAMESPACE;
}

export function normalizePineconeCloud(cloud) {
  return String(cloud || process.env.PINECONE_CLOUD || DEFAULT_PINECONE_CLOUD).trim() || DEFAULT_PINECONE_CLOUD;
}

export function normalizePineconeRegion(region) {
  return String(region || process.env.PINECONE_REGION || DEFAULT_PINECONE_REGION).trim() || DEFAULT_PINECONE_REGION;
}

function resolvePineconeApiKey(settings = {}) {
  return String(settings.pineconeApiKey || process.env.PINECONE_API_KEY || "").trim();
}

function getPinecone(settings = {}) {
  const apiKey = resolvePineconeApiKey(settings);
  if (!apiKey) {
    throw new Error("Pinecone needs PINECONE_API_KEY in .env or a Pinecone API key in Documents settings.");
  }

  return new Pinecone({ apiKey });
}

function isNotFoundError(error) {
  const message = String(error?.message || "");
  const status = Number(error?.status || error?.statusCode || error?.cause?.status || 0);
  return status === 404 || /\b404\b|not found|does not exist/i.test(message);
}

async function createIndex(pinecone, indexName, settings, dimensions) {
  await pinecone.createIndex({
    name: indexName,
    dimension: dimensions,
    metric: "cosine",
    spec: {
      serverless: {
        cloud: normalizePineconeCloud(settings.pineconeCloud),
        region: normalizePineconeRegion(settings.pineconeRegion),
      },
    },
    waitUntilReady: true,
    suppressConflicts: true,
  });
}

async function getIndexDimension(pinecone, indexName, existing) {
  if (existing?.dimension) return Number(existing.dimension);

  const described = await pinecone.describeIndex(indexName).catch(() => null);
  return described?.dimension ? Number(described.dimension) : null;
}

async function ensureIndex(settings = {}, dimensions) {
  const requestedIndexName = normalizePineconeIndexName(settings.pineconeIndex);
  const cacheKey = `${resolvePineconeApiKey(settings)}:${requestedIndexName}:${dimensions}`;

  if (indexReady.has(cacheKey)) {
    return indexReady.get(cacheKey);
  }

  const ready = (async () => {
    const pinecone = getPinecone(settings);
    const indexes = await pinecone.listIndexes();
    const requested = indexes.indexes?.find((index) => index.name === requestedIndexName);
    const requestedDimension = await getIndexDimension(pinecone, requestedIndexName, requested);
    let indexName = requestedIndexName;

    if (requested && requestedDimension && requestedDimension !== dimensions) {
      indexName = pineconeDimensionIndexName(requestedIndexName, dimensions);
    }

    const existing = indexes.indexes?.find((index) => index.name === indexName);

    if (!existing) {
      await createIndex(pinecone, indexName, settings, dimensions);
    }

    return {
      index: pinecone.index(indexName),
      indexName,
    };
  })();

  indexReady.set(cacheKey, ready);
  return ready;
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
    createdAt: String(chunk.createdAt || ""),
    text: String(chunk.content || ""),
  };
}

export async function upsertPineconeChunks(chunks = [], settings = {}) {
  if (!chunks.length) return;

  const dimensions = chunks[0]?.embedding?.length;
  if (!dimensions) {
    throw new Error("Pinecone upsert needs embedded chunks.");
  }

  const { index, indexName } = await ensureIndex(settings, dimensions);
  const namespace = normalizePineconeNamespace(settings.pineconeNamespace);

  for (let offset = 0; offset < chunks.length; offset += UPSERT_BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + UPSERT_BATCH_SIZE);
    await index.upsert({
      namespace,
      records: batch.map((chunk) => ({
        id: chunkId(chunk),
        values: chunk.embedding,
        metadata: metadataForChunk(chunk),
      })),
    });
  }

  return {
    indexName,
    namespace,
  };
}

export async function deletePineconeDocument(documentId, settings = {}) {
  if (!documentId) return;

  const indexName = normalizePineconeIndexName(settings.pineconeIndex);
  const pinecone = getPinecone(settings);
  const index = pinecone.index(indexName);

  await index.deleteMany({
    namespace: normalizePineconeNamespace(settings.pineconeNamespace),
    filter: { documentId: { $eq: String(documentId) } },
  }).catch((error) => {
    if (!isNotFoundError(error)) throw error;
  });
}

export async function queryPineconeChunks(queryEmbedding, settings = {}) {
  const indexName = normalizePineconeIndexName(settings.pineconeIndex);
  const pinecone = getPinecone(settings);
  const index = pinecone.index(indexName);
  const result = await index.query({
    namespace: normalizePineconeNamespace(settings.pineconeNamespace),
    vector: queryEmbedding,
    topK: Number(settings.topK || 6),
    includeMetadata: true,
    includeValues: false,
  });

  return (result.matches || [])
    .map((match) => {
      const metadata = match.metadata || {};
      return {
        id: match.id,
        documentId: metadata.documentId,
        documentName: metadata.documentName || "Document",
        index: Number(metadata.chunkIndex || 0),
        content: metadata.text || "",
        score: Number(match.score || 0),
      };
    })
    .filter((chunk) => chunk.content);
}
