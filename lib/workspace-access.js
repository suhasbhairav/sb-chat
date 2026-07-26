import { readChatStore } from "@/lib/chat-store";
import { roleAllows } from "@/lib/auth-permissions";
import {
  resolvePersonalProductDataScope,
  resolveWorkspaceProductDataScope,
  withProductDataScope,
} from "@/lib/product-data-store";
import { readSharedWorkspaceRegistry } from "@/lib/workspace-registry";

function userId(session) {
  return String(session?.user?.id || "");
}

export function isAdminSession(session) {
  return roleAllows(session?.user?.role || "user", {
    member: ["create"],
    organization: ["update"],
  });
}

export async function getAccessibleWorkspace(session, workspaceId) {
  const id = String(workspaceId || "").trim();
  if (!id) return null;

  const store = await withProductDataScope(resolvePersonalProductDataScope(session), () => readChatStore());
  const registry = await readSharedWorkspaceRegistry(session);
  const workspace = store.workspaces.find((item) => item.id === id) || registry.workspaces.find((item) => item.id === id);
  if (!workspace) return null;

  const members = Array.isArray(workspace.members) ? workspace.members.map(String) : [];
  const ownerId = String(workspace.ownerId || "");
  const shared = workspace.scope === "workspace" || workspace.shared === true;
  const allowed = !shared || ownerId === userId(session) || members.includes(userId(session)) || isAdminSession(session);

  return allowed ? workspace : null;
}

export async function resolveDocumentProductDataScope(session, workspaceId) {
  const workspace = await getAccessibleWorkspace(session, workspaceId);

  if (workspace?.scope === "workspace" || workspace?.shared === true) {
    return resolveWorkspaceProductDataScope(session, workspace.id);
  }

  return resolvePersonalProductDataScope(session);
}
