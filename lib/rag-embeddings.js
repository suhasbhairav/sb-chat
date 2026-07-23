import { resolveServerApiKey } from "@/lib/chat-request";
import { normalizeBaseUrl } from "@/lib/model-clients";
import { queryChromaChunks } from "@/lib/rag-chroma";
import { readDocumentStore } from "@/lib/rag-store";

const LOCAL_DIMENSIONS = 384;
const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

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
  const key = apiKey || resolveServerApiKey("openai", "");
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

export async function createEmbeddings(texts, options = {}) {
  if (options.embeddingProvider === "openai") {
    return createOpenAIEmbeddings(texts, options);
  }

  return texts.map(createLocalEmbedding);
}

function compatibleChunks(chunks, settings) {
  return chunks.filter((chunk) => {
    if (!chunk.embedding?.length) return false;
    if (settings.embeddingProvider && chunk.embeddingProvider !== settings.embeddingProvider) return false;
    if (settings.embeddingModel && chunk.embeddingModel !== settings.embeddingModel) return false;
    return true;
  });
}

export async function retrieveDocumentContext(query, options = {}) {
  const store = await readDocumentStore();
  const settings = {
    ...store.settings,
    ...options,
  };

  if (settings.vectorStoreProvider === "chroma") {
    const [queryEmbedding] = await createEmbeddings([query], settings);
    const ranked = await queryChromaChunks(queryEmbedding, settings);
    const sources = ranked.map((chunk, index) => ({
      label: `D${index + 1}`,
      documentId: chunk.documentId,
      name: chunk.documentName || "Document",
      chunkIndex: chunk.index,
      score: chunk.score,
    }));
    const context = ranked
      .map((chunk, index) => {
        const source = sources[index];
        return `[${source.label}] ${source.name} - chunk ${chunk.index + 1}\n${chunk.content}`;
      })
      .join("\n\n---\n\n");

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
    return {
      label: `D${index + 1}`,
      documentId: chunk.documentId,
      name: document?.name || "Document",
      chunkIndex: chunk.index,
      score: chunk.score,
    };
  });
  const context = ranked
    .map((chunk, index) => {
      const source = sources[index];
      return `[${source.label}] ${source.name} - chunk ${chunk.index + 1}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");

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
    .map((source) => `- [${source.label}] ${source.name}, chunk ${source.chunkIndex + 1}`);

  return `${String(message || "").trim()}\n\n**Document sources**\n${lines.join("\n")}`;
}
