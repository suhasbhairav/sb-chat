import { headers } from "next/headers";
import { auth } from "@/lib/auth";
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
import { isAdminSession } from "@/lib/workspace-access";
import { deleteSharedWorkspace, readSharedWorkspaceRegistry, updateSharedWorkspace, upsertSharedWorkspace } from "@/lib/workspace-registry";
import { resolveWorkspaceProductDataScope, withProductDataScope } from "@/lib/product-data-store";
import { deleteDocument, readDocumentStore } from "@/lib/rag-store";
import { deleteChromaDocument } from "@/lib/rag-chroma";
import { deletePineconeDocument } from "@/lib/rag-pinecone";

async function listAuthUsers() {
  const result = await auth.api.listUsers({
    headers: await headers(),
    query: {
      limit: 500,
      offset: 0,
      sortBy: "createdAt",
      sortDirection: "desc",
    },
  });
  return result?.users || result || [];
}

async function resolveUsersByEmail(emails = []) {
  const emailList = Array.isArray(emails) ? emails : String(emails || "").split(",");
  const users = await listAuthUsers();
  const byEmail = new Map(users.map((user) => [String(user.email || "").trim().toLowerCase(), user]));
  const resolved = [];
  const missing = [];

  for (const email of emailList) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) continue;
    const user = byEmail.get(normalized);
    if (!user) {
      missing.push(email);
      continue;
    }
    resolved.push({
      id: String(user.id),
      email: user.email,
      name: user.name || user.email,
    });
  }

  if (missing.length) {
    throw new Error(`No Batuk user found for: ${missing.join(", ")}`);
  }

  const unique = new Map(resolved.map((user) => [user.id, user]));
  return Array.from(unique.values());
}

async function buildLibraryResponseStore(session) {
  const store = await readChatStore();
  const registry = await readSharedWorkspaceRegistry(session);
  const userId = String(session.user.id);
  const visibleSharedWorkspaces = registry.workspaces.filter((workspace) => {
    const members = Array.isArray(workspace.members) ? workspace.members.map(String) : [];
    return workspace.ownerId === userId || members.includes(userId) || isAdminSession(session);
  });
  const workspaceMap = new Map([...visibleSharedWorkspaces, ...(store.workspaces || [])].map((workspace) => [workspace.id, workspace]));
  return { ...store, canManageSharedWorkspaces: isAdminSession(session), workspaces: Array.from(workspaceMap.values()) };
}

export async function GET() {
  const { session, response } = await requireServerPermission({ chat: ["read"] });
  if (response) return response;

  return json(await buildLibraryResponseStore(session));
}

async function cleanupWorkspaceRag(session, workspaceId) {
  const scope = resolveWorkspaceProductDataScope(session, workspaceId);
  const store = await withProductDataScope(scope, () => readDocumentStore());

  await Promise.allSettled(
    store.documents.map(async (document) => {
      if (document.vectorStoreProvider === "chroma" || store.settings.vectorStoreProvider === "chroma") {
        await deleteChromaDocument(document.id, {
          ...store.settings,
          chromaUrl: document.chromaUrl || store.settings.chromaUrl,
          chromaCollection: document.chromaCollection || store.settings.chromaCollection,
        });
      }
      if (document.vectorStoreProvider === "pinecone" || store.settings.vectorStoreProvider === "pinecone") {
        await deletePineconeDocument(document.id, {
          ...store.settings,
          pineconeIndex: document.pineconeIndex || store.settings.pineconeIndex,
          pineconeNamespace: document.pineconeNamespace || store.settings.pineconeNamespace,
        });
      }
    }),
  );

  for (const document of store.documents) {
    await withProductDataScope(scope, () => deleteDocument(document.id)).catch(() => {});
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const permission = body.action === "deleteChat" ? { chat: ["delete"] } : body.action === "importStore" ? { chat: ["create", "update"] } : { chat: ["update"] };
    const { session, response } = await requireServerPermission(permission);
    if (response) return response;

    if (body.action === "createWorkspace") {
      const shared = body.shared === true || body.scope === "workspace";
      if (shared && !isAdminSession(session)) {
        return json({ error: "Only an admin can create a shared workspace." }, 403);
      }

      const resolvedMembers = shared ? await resolveUsersByEmail(body.memberEmails || []) : [];
      const result = await createWorkspace(body.name, {
        ownerId: session.user.id,
        members: resolvedMembers.map((user) => user.id),
        memberDetails: resolvedMembers,
        shared,
        ragEnabled: body.ragEnabled !== false,
      });
      if (shared) {
        await upsertSharedWorkspace(session, result.workspace);
        result.store = await buildLibraryResponseStore(session);
      }
      await recordAuditEvent({
        category: "data",
        action: "workspace.create",
        outcome: "success",
        actor: session.user,
        target: { type: "workspace", id: result.workspace?.id },
        metadata: { name: result.workspace?.name, scope: result.workspace?.scope, ragEnabled: result.workspace?.ragEnabled },
      }).catch(() => {});
      return json(result);
    }

    if (body.action === "updateWorkspace") {
      if (!isAdminSession(session)) {
        return json({ error: "Only an admin can update a shared workspace." }, 403);
      }

      await updateSharedWorkspace(session, body.workspaceId, {
        name: body.name,
        ragEnabled: body.ragEnabled,
      });
      const registry = await readSharedWorkspaceRegistry(session);
      const workspace = registry.workspaces.find((item) => item.id === body.workspaceId);
      await recordAuditEvent({
        category: "data",
        action: "workspace.update",
        outcome: "success",
        actor: session.user,
        target: { type: "workspace", id: body.workspaceId },
        metadata: { name: workspace?.name, members: workspace?.members, ragEnabled: workspace?.ragEnabled },
      }).catch(() => {});
      return json({ store: await buildLibraryResponseStore(session), workspace });
    }

    if (body.action === "addWorkspaceMember") {
      if (!isAdminSession(session)) {
        return json({ error: "Only an admin can add workspace members." }, 403);
      }
      const registry = await readSharedWorkspaceRegistry(session);
      const workspace = registry.workspaces.find((item) => item.id === body.workspaceId);
      if (!workspace) return json({ error: "Workspace not found." }, 404);

      const users = await resolveUsersByEmail([body.email]);
      const nextDetails = new Map([...(workspace.memberDetails || []).map((user) => [String(user.id), user]), ...users.map((user) => [user.id, user])]);
      await updateSharedWorkspace(session, body.workspaceId, {
        members: Array.from(nextDetails.keys()),
        memberDetails: Array.from(nextDetails.values()),
      });
      await recordAuditEvent({
        category: "data",
        action: "workspace.member.add",
        outcome: "success",
        actor: session.user,
        target: { type: "workspace", id: body.workspaceId },
        metadata: { email: body.email },
      }).catch(() => {});
      return json({ store: await buildLibraryResponseStore(session) });
    }

    if (body.action === "removeWorkspaceMember") {
      if (!isAdminSession(session)) {
        return json({ error: "Only an admin can remove workspace members." }, 403);
      }
      const registry = await readSharedWorkspaceRegistry(session);
      const workspace = registry.workspaces.find((item) => item.id === body.workspaceId);
      if (!workspace) return json({ error: "Workspace not found." }, 404);
      const memberId = String(body.userId || "");
      await updateSharedWorkspace(session, body.workspaceId, {
        members: (workspace.members || []).filter((id) => String(id) !== memberId),
        memberDetails: (workspace.memberDetails || []).filter((user) => String(user.id) !== memberId),
      });
      await recordAuditEvent({
        category: "data",
        action: "workspace.member.remove",
        outcome: "success",
        actor: session.user,
        target: { type: "workspace", id: body.workspaceId },
        metadata: { userId: memberId },
      }).catch(() => {});
      return json({ store: await buildLibraryResponseStore(session) });
    }

    if (body.action === "deleteWorkspace") {
      if (!isAdminSession(session)) {
        return json({ error: "Only an admin can delete a shared workspace." }, 403);
      }

      await cleanupWorkspaceRag(session, body.workspaceId).catch(() => {});
      const result = await deleteSharedWorkspace(session, body.workspaceId);
      await recordAuditEvent({
        category: "data",
        action: "workspace.delete",
        outcome: "success",
        actor: session.user,
        target: { type: "workspace", id: body.workspaceId },
        metadata: { name: result.workspace?.name },
      }).catch(() => {});
      return json({ store: await buildLibraryResponseStore(session), workspace: result.workspace });
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
