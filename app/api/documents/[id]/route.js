import { json } from "@/lib/chat-request";
import { requireServerSession } from "@/lib/auth-session";
import { deleteDocument, summarizeDocuments } from "@/lib/rag-store";

export const runtime = "nodejs";

export async function DELETE(_request, { params }) {
  const { response } = await requireServerSession();
  if (response) return response;

  const { id } = await params;
  const store = await deleteDocument(id);
  return json(summarizeDocuments(store));
}
