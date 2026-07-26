import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isSqlProductDataStoreEnabled,
  readSqlDomainStore,
  resolvePersonalProductDataScope,
  withProductDataScope,
  writeSqlDomainStore,
} from "@/lib/product-data-store";

const DATA_DIR = process.env.BATUK_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const DEFAULT_STORE = { version: 1, workspaces: [] };

function safeScopeSegment(value) {
  return String(value || "personal").replace(/[^a-z0-9._-]+/gi, "_").slice(0, 120) || "personal";
}

function registryScope(session) {
  const personal = resolvePersonalProductDataScope(session);
  return {
    organizationId: personal.organizationId,
    userId: "shared-workspaces",
    scopeType: "workspace",
    workspaceId: null,
  };
}

function registryPath(session) {
  return path.join(DATA_DIR, "shared-workspaces", `${safeScopeSegment(registryScope(session).organizationId)}.json`);
}

export async function readSharedWorkspaceRegistry(session) {
  if (isSqlProductDataStoreEnabled()) {
    return withProductDataScope(registryScope(session), async () => {
      const store = await readSqlDomainStore("shared-workspaces", DEFAULT_STORE);
      return { ...DEFAULT_STORE, ...store, workspaces: Array.isArray(store.workspaces) ? store.workspaces : [] };
    });
  }

  try {
    const parsed = JSON.parse(await readFile(registryPath(session), "utf8"));
    return { ...DEFAULT_STORE, ...parsed, workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [] };
  } catch {
    return DEFAULT_STORE;
  }
}

export async function upsertSharedWorkspace(session, workspace) {
  const store = await readSharedWorkspaceRegistry(session);
  const nextStore = {
    ...store,
    workspaces: [workspace, ...store.workspaces.filter((item) => item.id !== workspace.id)],
  };

  if (isSqlProductDataStoreEnabled()) {
    return withProductDataScope(registryScope(session), () => writeSqlDomainStore("shared-workspaces", nextStore));
  }

  const filePath = registryPath(session);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(nextStore, null, 2)}\n`);
  return nextStore;
}

export async function updateSharedWorkspace(session, workspaceId, updates = {}) {
  const store = await readSharedWorkspaceRegistry(session);
  const id = String(workspaceId || "");
  const existing = store.workspaces.find((workspace) => workspace.id === id);

  if (!existing) {
    throw new Error("Workspace not found.");
  }

  const updatedAt = new Date().toISOString();
  const workspace = {
    ...existing,
    ...(updates.name !== undefined ? { name: String(updates.name || existing.name).trim().slice(0, 60) || existing.name } : {}),
    ...(updates.members !== undefined
      ? { members: Array.isArray(updates.members) ? updates.members.map((member) => String(member).trim().slice(0, 120)).filter(Boolean) : [] }
      : {}),
    ...(updates.memberDetails !== undefined ? { memberDetails: Array.isArray(updates.memberDetails) ? updates.memberDetails.slice(0, 500) : [] } : {}),
    ...(updates.ragEnabled !== undefined ? { ragEnabled: Boolean(updates.ragEnabled) } : {}),
    updatedAt,
  };

  return upsertSharedWorkspace(session, workspace);
}

export async function deleteSharedWorkspace(session, workspaceId) {
  const store = await readSharedWorkspaceRegistry(session);
  const id = String(workspaceId || "");
  const workspace = store.workspaces.find((item) => item.id === id);
  const nextStore = {
    ...store,
    workspaces: store.workspaces.filter((item) => item.id !== id),
  };

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  if (isSqlProductDataStoreEnabled()) {
    await withProductDataScope(registryScope(session), () => writeSqlDomainStore("shared-workspaces", nextStore));
    return { store: nextStore, workspace };
  }

  const filePath = registryPath(session);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(nextStore, null, 2)}\n`);
  return { store: nextStore, workspace };
}
