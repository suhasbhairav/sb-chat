import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeId } from "@/lib/chat-utils";

const DATA_DIR = path.join(process.cwd(), "data");
const FILES_DIR = path.join(DATA_DIR, "documents");
const STORE_PATH = path.join(DATA_DIR, "document-store.json");

const DEFAULT_STORE = {
  documents: [],
  chunks: [],
  settings: {
    embeddingProvider: "local",
    embeddingModel: "local-hash-v1",
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

export async function ensureDocumentStore() {
  await mkdir(FILES_DIR, { recursive: true });
  try {
    await stat(STORE_PATH);
  } catch {
    await writeDocumentStore(DEFAULT_STORE);
  }
}

export async function readDocumentStore() {
  await ensureDocumentStore();
  const raw = await readFile(STORE_PATH, "utf8");
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
  await mkdir(FILES_DIR, { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
}

export async function saveUploadedDocumentFile(file) {
  await ensureDocumentStore();
  const buffer = Buffer.from(await file.arrayBuffer());
  const storedName = `${makeId()}-${safeFileName(file.name)}`;
  const filePath = path.join(FILES_DIR, storedName);
  await writeFile(filePath, buffer);

  return {
    filePath,
    storedName,
    size: buffer.length,
  };
}

export async function deleteDocument(documentId) {
  const store = await readDocumentStore();
  const document = store.documents.find((item) => item.id === documentId);
  const nextStore = {
    ...store,
    documents: store.documents.filter((item) => item.id !== documentId),
    chunks: store.chunks.filter((chunk) => chunk.documentId !== documentId),
  };

  if (document) {
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
      createdAt: document.createdAt,
      error: document.error || null,
    })),
    settings: store.settings,
  };
}
