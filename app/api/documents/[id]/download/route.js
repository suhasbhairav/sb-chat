import { readFile } from "node:fs/promises";
import { json } from "@/lib/chat-request";
import { requireServerSession } from "@/lib/auth-session";
import { getDocumentFilePath, readDocumentStore } from "@/lib/rag-store";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const { response } = await requireServerSession();
  if (response) return response;

  const { id } = await params;
  const store = await readDocumentStore();
  const document = store.documents.find((item) => item.id === id);

  if (!document) {
    return json({ error: "Document not found." }, 404);
  }

  const file = await readFile(getDocumentFilePath(document));

  return new Response(file, {
    headers: {
      "Content-Disposition": `attachment; filename="${encodeURIComponent(document.name)}"`,
      "Content-Type": document.type || "application/octet-stream",
    },
  });
}
