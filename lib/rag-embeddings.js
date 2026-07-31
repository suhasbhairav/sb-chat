import { normalizeBaseUrl } from "./model-clients.js";
import { queryChromaChunks } from "./rag-chroma.js";
import { queryPineconeChunks } from "./rag-pinecone.js";
import { queryQdrantChunks } from "./rag-qdrant.js";
import { querySupabaseChunks } from "./rag-supabase.js";

const LOCAL_DIMENSIONS = 384;
const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_LLAMA_INDEX_OPENAI_EMBEDDING_MODEL = "text-embedding-ada-002";
const DEFAULT_LLAMA_INDEX_OLLAMA_EMBEDDING_MODEL = "nomic-embed-text";
const EMBEDDING_PROVIDERS = new Set(["local", "openai", "llamaindex-openai", "llamaindex-ollama"]);

function resolveOpenAIEmbeddingKey(apiKey) {
  return String(apiKey || process.env.OPENAI_API_KEY || "").trim();
}

function hashToken(token) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9_-]{1,}/g) || [];
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

export function createLocalEmbedding(text) {
  const vector = new Array(LOCAL_DIMENSIONS).fill(0);

  for (const token of tokenize(text)) {
    const hash = hashToken(token);
    const index = hash % LOCAL_DIMENSIONS;
    const sign = hash % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }

  return normalizeVector(vector);
}

export function cosineSimilarity(a = [], b = []) {
  const length = Math.min(a.length, b.length);
  let score = 0;

  for (let index = 0; index < length; index += 1) {
    score += Number(a[index] || 0) * Number(b[index] || 0);
  }

  return score;
}

async function createOpenAIEmbeddings(texts, { apiKey, baseUrl = "https://api.openai.com/v1", model = DEFAULT_OPENAI_EMBEDDING_MODEL } = {}) {
  const key = resolveOpenAIEmbeddingKey(apiKey);
  if (!key) {
    throw new Error("OpenAI embeddings need OPENAI_API_KEY in .env or an API key in Settings.");
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: texts,
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI embeddings failed with status ${response.status}.`);
  }

  return (data.data || []).sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

async function createLlamaIndexOpenAIEmbeddings(
  texts,
  { apiKey, baseUrl = "https://api.openai.com/v1", model = DEFAULT_LLAMA_INDEX_OPENAI_EMBEDDING_MODEL } = {},
) {
  const key = resolveOpenAIEmbeddingKey(apiKey);
  if (!key) {
    throw new Error("LlamaIndex OpenAI embeddings need OPENAI_API_KEY in .env or an API key in Settings.");
  }

  const [{ Settings }, { OpenAIEmbedding }] = await Promise.all([
    import("llamaindex"),
    import("@llamaindex/openai"),
  ]);
  Settings.embedModel = new OpenAIEmbedding({
    apiKey: key,
    baseURL: normalizeBaseUrl(baseUrl),
    model,
  });

  return Settings.embedModel.getTextEmbeddings(texts);
}

async function createLlamaIndexOllamaEmbeddings(
  texts,
  { baseUrl, ollamaBaseUrl, model = DEFAULT_LLAMA_INDEX_OLLAMA_EMBEDDING_MODEL } = {},
) {
  const [{ Settings }, { OllamaEmbedding }] = await Promise.all([
    import("llamaindex"),
    import("@llamaindex/ollama"),
  ]);
  Settings.embedModel = new OllamaEmbedding({
    model,
    config: {
      host: normalizeBaseUrl(ollamaBaseUrl || baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434"),
    },
  });

  return Settings.embedModel.getTextEmbeddings(texts);
}

export function normalizeEmbeddingSettings(settings = {}) {
  const envProvider = String(process.env.BATUK_EMBEDDING_PROVIDER || "").trim().toLowerCase();
  const requestedProvider = String(settings.embeddingProvider || envProvider || "local").trim().toLowerCase();
  const embeddingProvider = EMBEDDING_PROVIDERS.has(requestedProvider) ? requestedProvider : "local";
  const envModel = String(process.env.BATUK_EMBEDDING_MODEL || "").trim();

  if (embeddingProvider === "openai") {
    return { embeddingProvider, embeddingModel: settings.embeddingModel || envModel || DEFAULT_OPENAI_EMBEDDING_MODEL };
  }
  if (embeddingProvider === "llamaindex-openai") {
    return { embeddingProvider, embeddingModel: settings.embeddingModel || envModel || DEFAULT_LLAMA_INDEX_OPENAI_EMBEDDING_MODEL };
  }
  if (embeddingProvider === "llamaindex-ollama") {
    return { embeddingProvider, embeddingModel: settings.embeddingModel || envModel || DEFAULT_LLAMA_INDEX_OLLAMA_EMBEDDING_MODEL };
  }

  return { embeddingProvider: "local", embeddingModel: "local-hash-v1" };
}

export async function createEmbeddings(texts, options = {}) {
  const normalized = normalizeEmbeddingSettings(options);
  const embeddingOptions = {
    ...options,
    embeddingProvider: normalized.embeddingProvider,
    model: normalized.embeddingModel,
  };

  if (normalized.embeddingProvider === "openai") {
    return createOpenAIEmbeddings(texts, embeddingOptions);
  }

  if (normalized.embeddingProvider === "llamaindex-openai") {
    return createLlamaIndexOpenAIEmbeddings(texts, embeddingOptions);
  }

  if (normalized.embeddingProvider === "llamaindex-ollama") {
    return createLlamaIndexOllamaEmbeddings(texts, embeddingOptions);
  }

  return texts.map(createLocalEmbedding);
}

function compatibleChunks(chunks, settings) {
  return chunks.filter((chunk) => {
    if (!chunk.embedding?.length) return false;
    if (settings.embeddingProvider && chunk.embeddingProvider !== settings.embeddingProvider) return false;
    if (settings.embeddingModel && chunk.embeddingModel !== settings.embeddingModel) return false;
    if (settings.scopeType && chunk.scopeType && chunk.scopeType !== settings.scopeType) return false;
    if (settings.organizationId && chunk.organizationId && chunk.organizationId !== settings.organizationId) return false;
    if (settings.userId && chunk.userId && chunk.userId !== settings.userId) return false;
    if (settings.workspaceId && chunk.workspaceId && chunk.workspaceId !== settings.workspaceId) return false;
    return true;
  });
}

function sourceForChunk(chunk, index, documentName = "Document") {
  return {
    label: `D${index + 1}`,
    documentId: chunk.documentId,
    name: chunk.documentName || documentName,
    chunkIndex: chunk.index,
    score: chunk.score,
    pageStart: chunk.pageStart ?? null,
    pageEnd: chunk.pageEnd ?? null,
    elementType: chunk.elementType || null,
    sourceElementIds: chunk.sourceElementIds || [],
  };
}

function sourceLocation(source) {
  if (source.pageStart && source.pageEnd && source.pageStart !== source.pageEnd) return `pages ${source.pageStart}-${source.pageEnd}`;
  if (source.pageStart) return `page ${source.pageStart}`;
  return `chunk ${Number(source.chunkIndex || 0) + 1}`;
}

function contextForRankedChunks(ranked, sources) {
  return ranked
    .map((chunk, index) => {
      const source = sources[index];
      const type = source.elementType ? ` · ${source.elementType}` : "";
      return `[${source.label}] ${source.name} - ${sourceLocation(source)}${type}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

export async function retrieveDocumentContext(query, options = {}) {
  const { readDocumentStore } = await import("./rag-store.js");
  const store = await readDocumentStore();
  const settings = {
    ...store.settings,
    ...options,
  };

  if (settings.vectorStoreProvider === "chroma") {
    const [queryEmbedding] = await createEmbeddings([query], settings);
    const ranked = await queryChromaChunks(queryEmbedding, settings);
    const sources = ranked.map((chunk, index) => sourceForChunk(chunk, index));
    const context = contextForRankedChunks(ranked, sources);

    return { chunks: ranked, context, sources };
  }

  if (settings.vectorStoreProvider === "pinecone") {
    const [queryEmbedding] = await createEmbeddings([query], settings);
    const ranked = await queryPineconeChunks(queryEmbedding, settings);
    const sources = ranked.map((chunk, index) => sourceForChunk(chunk, index));
    const context = contextForRankedChunks(ranked, sources);

    return { chunks: ranked, context, sources };
  }

  if (settings.vectorStoreProvider === "supabase") {
    const [queryEmbedding] = await createEmbeddings([query], settings);
    const ranked = await querySupabaseChunks(queryEmbedding, settings);
    const sources = ranked.map((chunk, index) => sourceForChunk(chunk, index));
    const context = contextForRankedChunks(ranked, sources);

    return { chunks: ranked, context, sources };
  }

  if (settings.vectorStoreProvider === "qdrant") {
    const [queryEmbedding] = await createEmbeddings([query], settings);
    const ranked = await queryQdrantChunks(queryEmbedding, settings);
    const sources = ranked.map((chunk, index) => sourceForChunk(chunk, index));
    const context = contextForRankedChunks(ranked, sources);

    return { chunks: ranked, context, sources };
  }

  const candidates = compatibleChunks(store.chunks, settings);

  if (!candidates.length) {
    return { chunks: [], context: "", sources: [] };
  }

  const [queryEmbedding] = await createEmbeddings([query], settings);
  const ranked = candidates
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Number(settings.topK || 6));

  const documentsById = new Map(store.documents.map((document) => [document.id, document]));
  const sources = ranked.map((chunk, index) => {
    const document = documentsById.get(chunk.documentId);
    return sourceForChunk(chunk, index, document?.name || "Document");
  });
  const context = contextForRankedChunks(ranked, sources);

  return { chunks: ranked, context, sources };
}

export function appendDocumentSources(message, sources = []) {
  if (!sources.length) return message;
  const seen = new Set();
  const lines = sources
    .filter((source) => {
      const key = `${source.documentId}-${source.chunkIndex}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((source) => `- [${source.label}] ${source.name}, ${sourceLocation(source)}${source.elementType ? `, ${source.elementType}` : ""}`);

  return `${String(message || "").trim()}\n\n**Document sources**\n${lines.join("\n")}`;
}
