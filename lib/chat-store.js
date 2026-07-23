import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeMessages, sanitizeBaseUrlForStorage } from "@/lib/chat-utils";

const STORE_PATH = path.join(process.cwd(), "data", "chat-store.json");

function now() {
  return new Date().toISOString();
}

function makeServerId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanTimestamp(value, fallback = now()) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function cleanWorkspace(workspace) {
  const timestamp = now();
  return {
    id: String(workspace.id || makeServerId("workspace")).slice(0, 120),
    name: String(workspace.name || "Imported workspace").trim().slice(0, 60) || "Imported workspace",
    createdAt: cleanTimestamp(workspace.createdAt, timestamp),
    updatedAt: cleanTimestamp(workspace.updatedAt, timestamp),
  };
}

function cleanFolder(folder, workspaceIds) {
  const timestamp = now();
  const workspaceId = workspaceIds.has(folder.workspaceId) ? folder.workspaceId : Array.from(workspaceIds)[0];

  return {
    id: String(folder.id || makeServerId("folder")).slice(0, 120),
    workspaceId,
    name: String(folder.name || "Imported folder").trim().slice(0, 60) || "Imported folder",
    icon: String(folder.icon || "📁").slice(0, 8),
    createdAt: cleanTimestamp(folder.createdAt, timestamp),
    updatedAt: cleanTimestamp(folder.updatedAt, timestamp),
  };
}

function cleanChat(chat, workspaceIds, folderIds) {
  const timestamp = now();
  const workspaceId = workspaceIds.has(chat.workspaceId) ? chat.workspaceId : Array.from(workspaceIds)[0];
  const folderId = folderIds.has(chat.folderId) ? chat.folderId : null;
  const id = String(chat.id || makeServerId("chat")).slice(0, 120);

  return {
    id,
    workspaceId,
    folderId,
    title: String(chat.title || "Imported chat").trim().slice(0, 80) || "Imported chat",
    messages: normalizeMessages(Array.isArray(chat.messages) ? chat.messages : [], id),
    provider: String(chat.provider || "ollama"),
    model: String(chat.model || "llama3.1"),
    baseUrl: sanitizeBaseUrlForStorage(chat.baseUrl),
    guardrails: Boolean(chat.guardrails),
    temperature: Number(chat.temperature ?? 0.7),
    createdAt: cleanTimestamp(chat.createdAt, timestamp),
    updatedAt: cleanTimestamp(chat.updatedAt, timestamp),
  };
}

function defaultStore() {
  const createdAt = now();
  const workspaceId = "workspace-personal";

  return {
    version: 1,
    workspaces: [{ id: workspaceId, name: "Personal", createdAt, updatedAt: createdAt }],
    folders: [
      { id: "folder-finance", workspaceId, name: "Finance", icon: "💵", createdAt, updatedAt: createdAt },
      { id: "folder-study", workspaceId, name: "Study", icon: "📕", createdAt, updatedAt: createdAt },
    ],
    chats: [],
  };
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, `${JSON.stringify(defaultStore(), null, 2)}\n`);
  }
}

export async function readChatStore() {
  await ensureStoreFile();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return {
      ...defaultStore(),
      ...parsed,
      workspaces: parsed.workspaces ?? defaultStore().workspaces,
      folders: parsed.folders ?? [],
      chats: parsed.chats ?? [],
    };
  } catch {
    const fresh = defaultStore();
    await writeChatStore(fresh);
    return fresh;
  }
}

export async function writeChatStore(store) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
  return store;
}

export function normalizeImportedChatStore(input) {
  const source = input?.store && typeof input.store === "object" ? input.store : input;
  if (!source || typeof source !== "object") {
    throw new Error("Import file must contain a chat library JSON object.");
  }

  const importedWorkspaces = Array.isArray(source.workspaces) ? source.workspaces.map(cleanWorkspace) : [];
  const workspaces = importedWorkspaces.length ? importedWorkspaces : defaultStore().workspaces;
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const folders = Array.isArray(source.folders) ? source.folders.map((folder) => cleanFolder(folder, workspaceIds)) : [];
  const folderIds = new Set(folders.map((folder) => folder.id));
  const chats = Array.isArray(source.chats) ? source.chats.map((chat) => cleanChat(chat, workspaceIds, folderIds)) : [];

  return {
    version: 1,
    workspaces,
    folders,
    chats,
  };
}

export async function importChatStore(imported, { mode = "merge" } = {}) {
  const current = await readChatStore();
  const incoming = normalizeImportedChatStore(imported);

  if (mode === "replace") {
    await writeChatStore(incoming);
    return { store: incoming, imported: incoming.chats.length, mode: "replace" };
  }

  const workspaceMap = new Map(current.workspaces.map((workspace) => [workspace.id, workspace]));
  const folderMap = new Map(current.folders.map((folder) => [folder.id, folder]));
  const chatMap = new Map(current.chats.map((chat) => [chat.id, chat]));

  incoming.workspaces.forEach((workspace) => workspaceMap.set(workspace.id, { ...workspaceMap.get(workspace.id), ...workspace }));
  incoming.folders.forEach((folder) => folderMap.set(folder.id, { ...folderMap.get(folder.id), ...folder }));
  incoming.chats.forEach((chat) => chatMap.set(chat.id, { ...chatMap.get(chat.id), ...chat }));

  const store = {
    version: 1,
    workspaces: Array.from(workspaceMap.values()),
    folders: Array.from(folderMap.values()),
    chats: Array.from(chatMap.values()).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)),
  };

  await writeChatStore(store);
  return { store, imported: incoming.chats.length, mode: "merge" };
}

export async function createWorkspace(name) {
  const store = await readChatStore();
  const createdAt = now();
  const workspace = {
    id: makeServerId("workspace"),
    name: String(name || "New workspace").trim().slice(0, 60) || "New workspace",
    createdAt,
    updatedAt: createdAt,
  };

  store.workspaces.unshift(workspace);
  await writeChatStore(store);
  return { store, workspace };
}

export async function createFolder({ workspaceId, name }) {
  const store = await readChatStore();
  const createdAt = now();
  const folder = {
    id: makeServerId("folder"),
    workspaceId,
    name: String(name || "New folder").trim().slice(0, 60) || "New folder",
    icon: "📁",
    createdAt,
    updatedAt: createdAt,
  };

  store.folders.unshift(folder);
  await writeChatStore(store);
  return { store, folder };
}

export async function upsertChat(chat) {
  const store = await readChatStore();
  const timestamp = now();
  const cleanChat = {
    id: chat.id || makeServerId("chat"),
    workspaceId: chat.workspaceId,
    folderId: chat.folderId || null,
    title: String(chat.title || "Untitled chat").trim().slice(0, 80) || "Untitled chat",
    messages: normalizeMessages(Array.isArray(chat.messages) ? chat.messages : [], chat.id || "chat"),
    provider: chat.provider,
    model: chat.model,
    baseUrl: sanitizeBaseUrlForStorage(chat.baseUrl),
    guardrails: Boolean(chat.guardrails),
    temperature: Number(chat.temperature ?? 0.7),
    createdAt: chat.createdAt || timestamp,
    updatedAt: timestamp,
  };
  const index = store.chats.findIndex((item) => item.id === cleanChat.id);

  if (index >= 0) {
    store.chats[index] = { ...store.chats[index], ...cleanChat, createdAt: store.chats[index].createdAt };
  } else {
    store.chats.unshift(cleanChat);
  }

  await writeChatStore(store);
  return { store, chat: cleanChat };
}

export async function deleteChat(chatId) {
  const store = await readChatStore();
  store.chats = store.chats.filter((chat) => chat.id !== chatId);
  await writeChatStore(store);
  return { store };
}

export async function moveChat({ chatId, folderId, workspaceId }) {
  const store = await readChatStore();
  store.chats = store.chats.map((chat) =>
    chat.id === chatId
      ? {
          ...chat,
          folderId: folderId || null,
          workspaceId: workspaceId || chat.workspaceId,
          updatedAt: now(),
        }
      : chat,
  );
  await writeChatStore(store);
  return { store };
}
