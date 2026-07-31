import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeId } from "@/lib/chat-utils";
import { getProductDataScope, isSqlProductDataStoreEnabled, readSqlDomainStore, writeSqlDomainStore } from "@/lib/product-data-store";
import { deleteSupabaseDocumentFile, downloadSupabaseDocumentFile, supabaseStoragePath, uploadSupabaseDocumentFile } from "@/lib/rag-supabase";

const DATA_DIR = process.env.BATUK_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const FILES_DIR = process.env.BATUK_DOCUMENT_FILE_STORAGE_DIR || path.join(DATA_DIR, "documents");
const STORE_PATH = path.join(DATA_DIR, "document-store.json");
const FILE_STORAGE_PROVIDER = String(process.env.BATUK_DOCUMENT_FILE_STORAGE_PROVIDER || "local").toLowerCase() === "supabase" ? "supabase" : "local";

const DEFAULT_STORE = {
  documents: [],
  chunks: [],
  settings: {
    embeddingProvider: "local",
    embeddingModel: "local-hash-v1",
    vectorStoreProvider: ["chroma", "pinecone", "qdrant", "supabase"].includes(process.env.BATUK_VECTOR_STORE_PROVIDER) ? process.env.BATUK_VECTOR_STORE_PROVIDER : "json",
    chromaUrl: process.env.CHROMA_URL || "http://localhost:8000",
    chromaCollection: process.env.CHROMA_COLLECTION || "sb_chat_documents",
    pineconeApiKey: process.env.PINECONE_API_KEY || "",
    pineconeIndex: process.env.PINECONE_INDEX || "sb-chat-documents",
    pineconeNamespace: process.env.PINECONE_NAMESPACE || "documents",
    pineconeCloud: process.env.PINECONE_CLOUD || "aws",
    pineconeRegion: process.env.PINECONE_REGION || "us-east-1",
    qdrantUrl: process.env.QDRANT_URL || "",
    qdrantApiKey: process.env.QDRANT_API_KEY || "",
    qdrantCollection: process.env.QDRANT_COLLECTION || "batuk_documents",
    supabaseBucket: process.env.SUPABASE_DOCUMENT_BUCKET || process.env.BATUK_SUPABASE_DOCUMENT_BUCKET || "batuk-documents",
    supabaseChunksTable: process.env.SUPABASE_DOCUMENT_CHUNKS_TABLE || process.env.BATUK_SUPABASE_DOCUMENT_CHUNKS_TABLE || "batuk_document_chunks",
    supabaseMatchFunction: process.env.SUPABASE_MATCH_DOCUMENTS_FUNCTION || process.env.BATUK_SUPABASE_MATCH_DOCUMENTS_FUNCTION || "match_batuk_document_chunks",
    advancedRagEnabled: String(process.env.BATUK_ADVANCED_RAG_ENABLED || "").toLowerCase() === "true",
    advancedExtractionStrategy: process.env.BATUK_ADVANCED_EXTRACTION_STRATEGY || "hi_res",
    advancedExtractionLanguages: process.env.BATUK_ADVANCED_EXTRACTION_LANGUAGES || "eng",
    graphRagEnabled: String(process.env.BATUK_GRAPH_RAG_ENABLED || "").toLowerCase() === "true",
    piiDetectionEnabled: String(process.env.BATUK_PII_DETECTION_ENABLED || "").toLowerCase() === "true",
    chunkSize: 1800,
    chunkOverlap: 220,
    topK: 6,
  },
};

export function safeFileName(name) {
  return String(name || "document")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);
}

export function getDocumentFilePath(document) {
  return path.join(FILES_DIR, document.storedName);
}

function safeScopeSegment(value) {
  return String(value || "global").replace(/[^a-z0-9._-]+/gi, "_").slice(0, 120) || "global";
}

function getScopedStorePath() {
  const scope = getProductDataScope();
  if (scope.organizationId === "global" && scope.userId === "global") return STORE_PATH;
  return path.join(DATA_DIR, "scoped-documents", safeScopeSegment(scope.organizationId), `${safeScopeSegment(scope.userId)}.json`);
}

export async function ensureDocumentStore() {
  await mkdir(FILES_DIR, { recursive: true });
  try {
    await stat(getScopedStorePath());
  } catch {
    await writeDocumentStore(DEFAULT_STORE);
  }
}

export async function readDocumentStore() {
  if (isSqlProductDataStoreEnabled()) {
    const store = await readSqlDomainStore("documents", DEFAULT_STORE);
    return {
      ...DEFAULT_STORE,
      ...store,
      settings: {
        ...DEFAULT_STORE.settings,
        ...(store.settings || {}),
      },
    };
  }

  await ensureDocumentStore();
  const raw = await readFile(getScopedStorePath(), "utf8");
  const store = JSON.parse(raw);

  return {
    ...DEFAULT_STORE,
    ...store,
    settings: {
      ...DEFAULT_STORE.settings,
      ...(store.settings || {}),
    },
  };
}

export async function writeDocumentStore(store) {
  if (isSqlProductDataStoreEnabled()) {
    return writeSqlDomainStore("documents", store);
  }

  const storePath = getScopedStorePath();
  await mkdir(path.dirname(storePath), { recursive: true });
  await mkdir(FILES_DIR, { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`);
}

export async function saveUploadedDocumentFile(file) {
  await ensureDocumentStore();
  const buffer = Buffer.from(await file.arrayBuffer());
  const storedName = `${makeId()}-${safeFileName(file.name)}`;
  const filePath = path.join(FILES_DIR, storedName);
  await writeFile(filePath, buffer);

  return {
    fileStorageProvider: "local",
    filePath,
    storedName,
    size: buffer.length,
  };
}

export async function saveUploadedDocumentFileForScope(file, { documentId, scope, settings = {} } = {}) {
  if (FILE_STORAGE_PROVIDER !== "supabase") return saveUploadedDocumentFile(file);

  await ensureDocumentStore();
  const buffer = Buffer.from(await file.arrayBuffer());
  const storedName = `${makeId()}-${safeFileName(file.name)}`;
  const filePath = path.join(FILES_DIR, `.tmp-${storedName}`);
  await writeFile(filePath, buffer);
  const storagePath = supabaseStoragePath({
    organizationId: scope?.organizationId,
    userId: scope?.userId,
    workspaceId: scope?.workspaceId,
    scopeType: scope?.scopeType,
    documentId,
    storedName,
  });
  const uploaded = await uploadSupabaseDocumentFile({
    buffer,
    contentType: file.type,
    path: storagePath,
    bucket: settings.supabaseBucket,
  });

  return {
    fileStorageProvider: "supabase",
    filePath,
    storedName,
    storageBucket: uploaded.bucket,
    storagePath: uploaded.path,
    size: buffer.length,
  };
}

export async function readDocumentFile(document) {
  if (document?.fileStorageProvider === "supabase") {
    return downloadSupabaseDocumentFile({
      bucket: document.storageBucket,
      path: document.storagePath,
    });
  }
  return readFile(getDocumentFilePath(document));
}

export async function materializeDocumentFile(document) {
  if (document?.fileStorageProvider !== "supabase") return getDocumentFilePath(document);
  const buffer = await readDocumentFile(document);
  const filePath = path.join(FILES_DIR, `.tmp-reindex-${document.id}-${safeFileName(document.name)}`);
  await mkdir(FILES_DIR, { recursive: true });
  await writeFile(filePath, buffer);
  return filePath;
}

export async function cleanupTemporaryDocumentFile(savedOrPath) {
  const filePath = typeof savedOrPath === "string" ? savedOrPath : savedOrPath?.filePath;
  if (!filePath || !path.basename(filePath).startsWith(".tmp")) return;
  await unlink(filePath).catch(() => {});
}

export async function deleteDocument(documentId) {
  const store = await readDocumentStore();
  const document = store.documents.find((item) => item.id === documentId);
  const nextStore = {
    ...store,
    documents: store.documents.filter((item) => item.id !== documentId),
    chunks: store.chunks.filter((chunk) => chunk.documentId !== documentId),
  };

  if (document?.fileStorageProvider === "supabase") {
    await deleteSupabaseDocumentFile({
      bucket: document.storageBucket,
      path: document.storagePath,
    }).catch(() => {});
  } else if (document) {
    await unlink(getDocumentFilePath(document)).catch(() => {});
  }

  await writeDocumentStore(nextStore);
  return nextStore;
}

export function summarizeDocuments(store) {
  return {
    documents: store.documents.map((document) => ({
      id: document.id,
      name: document.name,
      type: document.type,
      size: document.size,
      status: document.status,
      chunkCount: document.chunkCount,
      embeddingProvider: document.embeddingProvider,
      embeddingModel: document.embeddingModel,
      vectorStoreProvider: document.vectorStoreProvider || store.settings.vectorStoreProvider || "json",
      chromaUrl: document.chromaUrl || null,
      chromaCollection: document.chromaCollection || null,
      pineconeIndex: document.pineconeIndex || null,
      pineconeNamespace: document.pineconeNamespace || null,
      qdrantUrl: document.qdrantUrl || null,
      qdrantCollection: document.qdrantCollection || null,
      fileStorageProvider: document.fileStorageProvider || "local",
      storageBucket: document.storageBucket || null,
      storagePath: document.storagePath || null,
      supabaseBucket: document.supabaseBucket || null,
      supabaseChunksTable: document.supabaseChunksTable || null,
      supabaseMatchFunction: document.supabaseMatchFunction || null,
      advancedRagEnabled: Boolean(document.advancedRagEnabled),
      graphRagEnabled: Boolean(document.graphRagEnabled),
      piiDetectionEnabled: Boolean(document.piiDetectionEnabled),
      extractionEngine: document.extractionEngine || null,
      structuredElementCount: document.structuredElementCount || 0,
      graphEntityCount: document.graphEntityCount || 0,
      graphRelationshipCount: document.graphRelationshipCount || 0,
      piiRisk: document.piiRisk || null,
      createdAt: document.createdAt,
      error: document.error || null,
    })),
    settings: store.settings,
  };
}
