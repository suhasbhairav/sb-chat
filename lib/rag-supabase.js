import { createClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "batuk-documents";
const DEFAULT_CHUNKS_TABLE = "batuk_document_chunks";
const DEFAULT_MATCH_FUNCTION = "match_batuk_document_chunks";
const UPSERT_BATCH_SIZE = 80;

let client;

function cleanText(value, fallback = "") {
  return String(value || fallback).trim();
}

export function normalizeSupabaseBucket(bucket) {
  return cleanText(bucket || process.env.SUPABASE_DOCUMENT_BUCKET || process.env.BATUK_SUPABASE_DOCUMENT_BUCKET, DEFAULT_BUCKET);
}

export function normalizeSupabaseChunksTable(table) {
  return cleanText(table || process.env.SUPABASE_DOCUMENT_CHUNKS_TABLE || process.env.BATUK_SUPABASE_DOCUMENT_CHUNKS_TABLE, DEFAULT_CHUNKS_TABLE)
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 63) || DEFAULT_CHUNKS_TABLE;
}

export function normalizeSupabaseMatchFunction(name) {
  return cleanText(name || process.env.SUPABASE_MATCH_DOCUMENTS_FUNCTION || process.env.BATUK_SUPABASE_MATCH_DOCUMENTS_FUNCTION, DEFAULT_MATCH_FUNCTION)
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 63) || DEFAULT_MATCH_FUNCTION;
}

function getSupabaseUrl() {
  const url = cleanText(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) throw new Error("Supabase needs SUPABASE_URL in .env.");
  return url;
}

function getSupabaseKey() {
  const key = cleanText(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!key) throw new Error("Supabase needs SUPABASE_SERVICE_ROLE_KEY in .env for server-side RAG storage.");
  return key;
}

export function getSupabaseClient() {
  if (client) return client;
  client = createClient(getSupabaseUrl(), getSupabaseKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return client;
}

export function supabaseStoragePath({ organizationId, userId, workspaceId, scopeType, documentId, storedName }) {
  const scope = scopeType === "workspace" ? `workspace/${safePathSegment(workspaceId || userId)}` : `user/${safePathSegment(userId)}`;
  return [
    "organizations",
    safePathSegment(organizationId || "personal"),
    scope,
    "documents",
    safePathSegment(documentId),
    safePathSegment(storedName),
  ].join("/");
}

function safePathSegment(value) {
  return String(value || "item")
    .replace(/[^a-zA-Z0-9._=-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160) || "item";
}

function chunkId(chunk) {
  return String(`${chunk.documentId}-chunk-${Number(chunk.index || 0)}`);
}

function rowForChunk(chunk, settings = {}) {
  return {
    id: chunkId(chunk),
    document_id: String(chunk.documentId || ""),
    document_name: String(chunk.documentName || "Document"),
    chunk_index: Number(chunk.index || 0),
    content: String(chunk.content || ""),
    embedding: chunk.embedding,
    embedding_provider: String(chunk.embeddingProvider || ""),
    embedding_model: String(chunk.embeddingModel || ""),
    scope_type: String(chunk.scopeType || settings.scopeType || "personal"),
    organization_id: String(chunk.organizationId || settings.organizationId || ""),
    user_id: String(chunk.userId || settings.userId || ""),
    workspace_id: chunk.workspaceId || settings.workspaceId || null,
    storage_bucket: normalizeSupabaseBucket(settings.supabaseBucket),
    storage_path: String(settings.supabaseStoragePath || chunk.storagePath || ""),
    created_at: String(chunk.createdAt || new Date().toISOString()),
  };
}

export async function uploadSupabaseDocumentFile({ buffer, contentType, path, bucket }) {
  const supabase = getSupabaseClient();
  const targetBucket = normalizeSupabaseBucket(bucket);
  await ensureSupabaseBucket(targetBucket);
  const { error } = await supabase.storage.from(targetBucket).upload(path, buffer, {
    contentType: contentType || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(`Supabase file upload failed: ${error.message}`);
  return { bucket: targetBucket, path };
}

async function ensureSupabaseBucket(bucket) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.getBucket(bucket);
  if (!error) return;
  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: "50MB",
  });
  if (createError && !/already exists/i.test(createError.message || "")) {
    throw new Error(`Supabase bucket setup failed: ${createError.message}`);
  }
}

export async function downloadSupabaseDocumentFile({ bucket, path }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(normalizeSupabaseBucket(bucket)).download(path);
  if (error) throw new Error(`Supabase file download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteSupabaseDocumentFile({ bucket, path }) {
  if (!path) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(normalizeSupabaseBucket(bucket)).remove([path]);
  if (error && !/not found/i.test(error.message || "")) throw new Error(`Supabase file delete failed: ${error.message}`);
}

export async function upsertSupabaseChunks(chunks = [], settings = {}) {
  if (!chunks.length) return;
  if (!chunks[0]?.embedding?.length) throw new Error("Supabase upsert needs embedded chunks.");

  const supabase = getSupabaseClient();
  const table = normalizeSupabaseChunksTable(settings.supabaseChunksTable);

  await deleteSupabaseDocument(chunks[0].documentId, settings);

  for (let offset = 0; offset < chunks.length; offset += UPSERT_BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + UPSERT_BATCH_SIZE).map((chunk) => rowForChunk(chunk, settings));
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`Supabase vector upsert failed: ${error.message}`);
  }

  return {
    bucket: normalizeSupabaseBucket(settings.supabaseBucket),
    chunksTable: table,
    matchFunction: normalizeSupabaseMatchFunction(settings.supabaseMatchFunction),
  };
}

export async function deleteSupabaseDocument(documentId, settings = {}) {
  if (!documentId) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(normalizeSupabaseChunksTable(settings.supabaseChunksTable))
    .delete()
    .eq("document_id", String(documentId));
  if (error) throw new Error(`Supabase vector delete failed: ${error.message}`);
}

export async function querySupabaseChunks(queryEmbedding, settings = {}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc(normalizeSupabaseMatchFunction(settings.supabaseMatchFunction), {
    chunks_table: normalizeSupabaseChunksTable(settings.supabaseChunksTable),
    query_embedding: queryEmbedding,
    match_count: Number(settings.topK || 6),
    filter_scope_type: String(settings.scopeType || "personal"),
    filter_organization_id: String(settings.organizationId || ""),
    filter_user_id: String(settings.userId || ""),
    filter_workspace_id: settings.workspaceId || null,
    filter_embedding_provider: String(settings.embeddingProvider || ""),
    filter_embedding_model: String(settings.embeddingModel || ""),
  });

  if (error) throw new Error(`Supabase vector query failed: ${error.message}`);

  return (data || [])
    .map((row) => ({
      id: row.id,
      documentId: row.document_id,
      documentName: row.document_name || "Document",
      index: Number(row.chunk_index || 0),
      content: row.content || "",
      score: Number(row.similarity || 0),
    }))
    .filter((chunk) => chunk.content);
}
