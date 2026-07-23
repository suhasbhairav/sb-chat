import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeId } from "@/lib/chat-utils";

const STORE_PATH = path.join(process.cwd(), "data", "memory-store.json");
const MAX_MEMORY_LENGTH = 600;

const DEFAULT_STORE = {
  version: 1,
  memories: [],
};

const SENSITIVE_PATTERNS = [
  /\b(?:api[_-]?key|secret|password|passwd|token|bearer)\b\s*[:=]/i,
  /\bsk-[a-z0-9_-]{16,}\b/i,
  /\b[A-Za-z0-9+/]{32,}={0,2}\b/,
];

function now() {
  return new Date().toISOString();
}

function normalizeUserId(userId) {
  return String(userId || "").trim();
}

function normalizeContent(content) {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MEMORY_LENGTH);
}

export function looksSensitive(content) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(String(content || "")));
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeMemoryStore(DEFAULT_STORE);
  }
}

export async function readMemoryStore() {
  await ensureStoreFile();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_STORE,
      ...parsed,
      memories: Array.isArray(parsed.memories) ? parsed.memories : [],
    };
  } catch {
    await writeMemoryStore(DEFAULT_STORE);
    return DEFAULT_STORE;
  }
}

export async function writeMemoryStore(store) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
  return store;
}

export async function listMemories(userId, { includeArchived = false } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const store = await readMemoryStore();

  return store.memories
    .filter((memory) => memory.userId === normalizedUserId)
    .filter((memory) => includeArchived || memory.status !== "archived")
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

export async function createMemory({ userId, content, sourceChatId = null, tags = [] }) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedContent = normalizeContent(content);

  if (!normalizedUserId) {
    throw new Error("A signed-in user is required to save memory.");
  }

  if (!normalizedContent) {
    throw new Error("Memory content is required.");
  }

  if (looksSensitive(normalizedContent)) {
    throw new Error("That looks like a secret or credential, so it was not saved to memory.");
  }

  const store = await readMemoryStore();
  const timestamp = now();
  const memory = {
    id: makeId(),
    userId: normalizedUserId,
    content: normalizedContent,
    sourceChatId: sourceChatId ? String(sourceChatId).slice(0, 120) : null,
    status: "active",
    confidence: 1,
    tags: Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8) : [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.memories.unshift(memory);
  await writeMemoryStore(store);
  return memory;
}

export async function updateMemory({ userId, memoryId, content, status }) {
  const normalizedUserId = normalizeUserId(userId);
  const store = await readMemoryStore();
  const index = store.memories.findIndex((memory) => memory.id === memoryId && memory.userId === normalizedUserId);

  if (index < 0) {
    throw new Error("Memory not found.");
  }

  const updates = { updatedAt: now() };

  if (content !== undefined) {
    const normalizedContent = normalizeContent(content);
    if (!normalizedContent) throw new Error("Memory content is required.");
    if (looksSensitive(normalizedContent)) {
      throw new Error("That looks like a secret or credential, so it was not saved to memory.");
    }
    updates.content = normalizedContent;
  }

  if (status !== undefined) {
    updates.status = status === "archived" ? "archived" : "active";
  }

  store.memories[index] = { ...store.memories[index], ...updates };
  await writeMemoryStore(store);
  return store.memories[index];
}

export async function archiveMemory({ userId, memoryId }) {
  return updateMemory({ userId, memoryId, status: "archived" });
}

export function formatMemoriesForPrompt(memories, { maxItems = 20, maxCharacters = 2000 } = {}) {
  let used = 0;
  const lines = [];

  for (const memory of memories.slice(0, maxItems)) {
    const line = `- ${memory.content}`;
    if (used + line.length > maxCharacters) break;
    lines.push(line);
    used += line.length;
  }

  return lines.join("\n");
}
