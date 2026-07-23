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
import { requireServerSession } from "@/lib/auth-session";

export async function GET() {
  const { response } = await requireServerSession();
  if (response) return response;

  const store = await readChatStore();
  return json(store);
}

export async function POST(request) {
  try {
    const { response } = await requireServerSession();
    if (response) return response;

    const body = await request.json();

    if (body.action === "createWorkspace") {
      const result = await createWorkspace(body.name);
      return json(result);
    }

    if (body.action === "createFolder") {
      const result = await createFolder({ workspaceId: body.workspaceId, name: body.name });
      return json(result);
    }

    if (body.action === "upsertChat") {
      const result = await upsertChat(body.chat);
      return json(result);
    }

    if (body.action === "deleteChat") {
      const result = await deleteChat(body.chatId);
      return json(result);
    }

    if (body.action === "moveChat") {
      const result = await moveChat({
        chatId: body.chatId,
        folderId: body.folderId,
        workspaceId: body.workspaceId,
      });
      return json(result);
    }

    if (body.action === "importStore") {
      const result = await importChatStore(body.store, { mode: body.mode || "merge" });
      return json(result);
    }

    return json({ error: "Unsupported library action." }, 400);
  } catch (error) {
    return json({ error: error.message || "Unexpected library server error." }, 500);
  }
}
