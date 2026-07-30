import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { readDocumentFile, readDocumentStore } from "@/lib/rag-store";
import { recordAuditEvent } from "@/lib/compliance-store";
import { withProductDataScope } from "@/lib/product-data-store";
import { resolveDocumentProductDataScope } from "@/lib/workspace-access";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { session, response } = await requireServerPermission({ document: ["download"] });
  if (response) return response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const scope = await resolveDocumentProductDataScope(session, searchParams.get("workspaceId"));
  const store = await withProductDataScope(scope, () => readDocumentStore());
  const document = store.documents.find((item) => item.id === id);

  if (!document) {
    return json({ error: "Document not found." }, 404);
  }

  const file = await readDocumentFile(document);
  await recordAuditEvent({
    category: "document",
    action: "document.download",
    outcome: "success",
    actor: session.user,
    target: { type: "document", id },
    metadata: {
      name: document.name,
      size: document.size,
      type: document.type,
    },
  }).catch(() => {});

  return new Response(file, {
    headers: {
      "Content-Disposition": `attachment; filename="${encodeURIComponent(document.name)}"`,
      "Content-Type": document.type || "application/octet-stream",
    },
  });
}
