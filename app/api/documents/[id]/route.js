import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { deleteChromaDocument } from "@/lib/rag-chroma";
import { deletePineconeDocument } from "@/lib/rag-pinecone";
import { deleteDocument, readDocumentStore, summarizeDocuments } from "@/lib/rag-store";
import { recordAuditEvent } from "@/lib/compliance-store";
import { withProductDataScope } from "@/lib/product-data-store";
import { resolveDocumentProductDataScope } from "@/lib/workspace-access";

export const runtime = "nodejs";

export async function DELETE(request, { params }) {
  const { session, response } = await requireServerPermission({ document: ["delete"] });
  if (response) return response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const scope = await resolveDocumentProductDataScope(session, searchParams.get("workspaceId"));
  const currentStore = await withProductDataScope(scope, () => readDocumentStore());
  const document = currentStore.documents.find((item) => item.id === id);

  if (document?.vectorStoreProvider === "chroma" || currentStore.settings.vectorStoreProvider === "chroma") {
    await deleteChromaDocument(id, {
      ...currentStore.settings,
      chromaUrl: document?.chromaUrl || currentStore.settings.chromaUrl,
      chromaCollection: document?.chromaCollection || currentStore.settings.chromaCollection,
    }).catch(() => {});
  }
  if (document?.vectorStoreProvider === "pinecone" || currentStore.settings.vectorStoreProvider === "pinecone") {
    await deletePineconeDocument(id, {
      ...currentStore.settings,
      pineconeIndex: document?.pineconeIndex || currentStore.settings.pineconeIndex,
      pineconeNamespace: document?.pineconeNamespace || currentStore.settings.pineconeNamespace,
    }).catch(() => {});
  }

  const store = await withProductDataScope(scope, () => deleteDocument(id));
  await recordAuditEvent({
    category: "document",
    action: "document.delete",
    outcome: "success",
    actor: session.user,
    target: { type: "document", id },
    metadata: {
      name: document?.name,
      vectorStoreProvider: document?.vectorStoreProvider || currentStore.settings.vectorStoreProvider,
    },
  }).catch(() => {});
  return json(summarizeDocuments(store));
}
