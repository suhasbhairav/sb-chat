import { json } from "@/lib/chat-request";
import { requireServerSession } from "@/lib/auth-session";
import { deleteChromaDocument } from "@/lib/rag-chroma";
import { deleteDocument, readDocumentStore, summarizeDocuments } from "@/lib/rag-store";

export const runtime = "nodejs";

export async function DELETE(_request, { params }) {
  const { response } = await requireServerSession();
  if (response) return response;

  const { id } = await params;
  const currentStore = await readDocumentStore();
  const document = currentStore.documents.find((item) => item.id === id);

  if (document?.vectorStoreProvider === "chroma" || currentStore.settings.vectorStoreProvider === "chroma") {
    await deleteChromaDocument(id, {
      ...currentStore.settings,
      chromaUrl: document?.chromaUrl || currentStore.settings.chromaUrl,
      chromaCollection: document?.chromaCollection || currentStore.settings.chromaCollection,
    }).catch(() => {});
  }

  const store = await deleteDocument(id);
  return json(summarizeDocuments(store));
}
