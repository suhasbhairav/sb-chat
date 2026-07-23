import { json, resolveServerApiKey } from "@/lib/chat-request";
import { requireServerSession } from "@/lib/auth-session";
import { createEmbeddings } from "@/lib/rag-embeddings";
import { chunkDocumentText, extractDocumentText } from "@/lib/rag-processing";
import { getDocumentFilePath, readDocumentStore, summarizeDocuments, writeDocumentStore } from "@/lib/rag-store";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const { response } = await requireServerSession();
    if (response) return response;

    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const store = await readDocumentStore();
    const document = store.documents.find((item) => item.id === id);

    if (!document) {
      return json({ error: "Document not found." }, 404);
    }

    const settings = {
      ...store.settings,
      embeddingProvider: payload.embeddingProvider || store.settings.embeddingProvider,
      embeddingModel: payload.embeddingModel || store.settings.embeddingModel,
    };
    const filePath = getDocumentFilePath(document);
    const text = await extractDocumentText(filePath, document.name);

    if (!text) {
      throw new Error("No extractable text found in this document.");
    }

    const chunks = chunkDocumentText(text, settings);
    const embeddings = await createEmbeddings(
      chunks.map((chunk) => chunk.content),
      {
        ...settings,
        apiKey: payload.apiKey || resolveServerApiKey("openai", ""),
        baseUrl: payload.openAIBaseUrl || "https://api.openai.com/v1",
      },
    );
    const createdAt = new Date().toISOString();
    const indexedChunks = chunks.map((chunk, index) => ({
      ...chunk,
      documentId: document.id,
      documentName: document.name,
      embedding: embeddings[index],
      embeddingProvider: settings.embeddingProvider,
      embeddingModel: settings.embeddingModel,
      createdAt,
    }));
    const nextDocument = {
      ...document,
      status: "ready",
      error: null,
      textLength: text.length,
      chunkCount: indexedChunks.length,
      embeddingProvider: settings.embeddingProvider,
      embeddingModel: settings.embeddingModel,
      reindexedAt: createdAt,
    };
    const nextStore = {
      ...store,
      settings,
      documents: store.documents.map((item) => (item.id === document.id ? nextDocument : item)),
      chunks: [...indexedChunks, ...store.chunks.filter((chunk) => chunk.documentId !== document.id)],
    };

    await writeDocumentStore(nextStore);
    return json(summarizeDocuments(nextStore));
  } catch (error) {
    return json({ error: error.message || "Document reindex failed." }, 500);
  }
}
