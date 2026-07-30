import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { deleteChromaDocument } from "@/lib/rag-chroma";
import { deletePineconeDocument } from "@/lib/rag-pinecone";
import { deleteQdrantDocument } from "@/lib/rag-qdrant";
import { deleteSupabaseDocument } from "@/lib/rag-supabase";
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
  if (document?.vectorStoreProvider === "qdrant" || currentStore.settings.vectorStoreProvider === "qdrant") {
    await deleteQdrantDocument(id, {
      ...currentStore.settings,
      qdrantUrl: document?.qdrantUrl || currentStore.settings.qdrantUrl,
      qdrantCollection: document?.qdrantCollection || currentStore.settings.qdrantCollection,
    }).catch(() => {});
  }
  if (document?.vectorStoreProvider === "supabase" || currentStore.settings.vectorStoreProvider === "supabase") {
    await deleteSupabaseDocument(id, {
      ...currentStore.settings,
      supabaseBucket: document?.supabaseBucket || currentStore.settings.supabaseBucket,
      supabaseChunksTable: document?.supabaseChunksTable || currentStore.settings.supabaseChunksTable,
      supabaseMatchFunction: document?.supabaseMatchFunction || currentStore.settings.supabaseMatchFunction,
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
