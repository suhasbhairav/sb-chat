import {
  createFolder,
  createWorkspace,
  deleteChat,
  importChatStore,
  moveChat,
  readChatStore,
  upsertChat,
} from "@/lib/chat-store";
import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { recordAuditEvent } from "@/lib/compliance-store";

export async function GET() {
  const { response } = await requireServerPermission({ chat: ["read"] });
  if (response) return response;

  const store = await readChatStore();
  return json(store);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const permission = body.action === "deleteChat" ? { chat: ["delete"] } : body.action === "importStore" ? { chat: ["create", "update"] } : { chat: ["update"] };
    const { session, response } = await requireServerPermission(permission);
    if (response) return response;

    if (body.action === "createWorkspace") {
      const result = await createWorkspace(body.name);
      await recordAuditEvent({
        category: "data",
        action: "workspace.create",
        outcome: "success",
        actor: session.user,
        target: { type: "workspace", id: result.workspace?.id },
        metadata: { name: result.workspace?.name },
      }).catch(() => {});
      return json(result);
    }

    if (body.action === "createFolder") {
      const result = await createFolder({ workspaceId: body.workspaceId, name: body.name });
      await recordAuditEvent({
        category: "data",
        action: "folder.create",
        outcome: "success",
        actor: session.user,
        target: { type: "folder", id: result.folder?.id },
        metadata: { workspaceId: body.workspaceId, name: result.folder?.name },
      }).catch(() => {});
      return json(result);
    }

    if (body.action === "upsertChat") {
      const result = await upsertChat(body.chat);
      await recordAuditEvent({
        category: "data",
        action: "chat.upsert",
        outcome: "success",
        actor: session.user,
        target: { type: "chat", id: result.chat?.id },
        metadata: { workspaceId: result.chat?.workspaceId, folderId: result.chat?.folderId, provider: result.chat?.provider, model: result.chat?.model },
      }).catch(() => {});
      return json(result);
    }

    if (body.action === "deleteChat") {
      const result = await deleteChat(body.chatId);
      await recordAuditEvent({
        category: "data",
        action: "chat.delete",
        outcome: "success",
        actor: session.user,
        target: { type: "chat", id: body.chatId },
      }).catch(() => {});
      return json(result);
    }

    if (body.action === "moveChat") {
      const result = await moveChat({
        chatId: body.chatId,
        folderId: body.folderId,
        workspaceId: body.workspaceId,
      });
      await recordAuditEvent({
        category: "data",
        action: "chat.move",
        outcome: "success",
        actor: session.user,
        target: { type: "chat", id: body.chatId },
        metadata: { workspaceId: body.workspaceId, folderId: body.folderId },
      }).catch(() => {});
      return json(result);
    }

    if (body.action === "importStore") {
      const result = await importChatStore(body.store, { mode: body.mode || "merge" });
      await recordAuditEvent({
        category: "data",
        action: "library.import",
        outcome: "success",
        actor: session.user,
        metadata: { mode: result.mode, imported: result.imported },
      }).catch(() => {});
      return json(result);
    }

    return json({ error: "Unsupported library action." }, 400);
  } catch (error) {
    return json({ error: error.message || "Unexpected library server error." }, 500);
  }
}
