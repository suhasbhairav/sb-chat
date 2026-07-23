import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const STORE_PATH = path.join(process.cwd(), "data", "token-usage.json");

function now() {
  return new Date().toISOString();
}

function makeUsageId() {
  return `usage-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultStore() {
  return {
    version: 1,
    totals: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      requests: 0,
    },
    events: [],
  };
}

export function createEmptyTokenUsageStore() {
  return defaultStore();
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeTokenUsageStore(defaultStore());
  }
}

export async function readTokenUsageStore() {
  await ensureStoreFile();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...defaultStore(),
      ...parsed,
      totals: { ...defaultStore().totals, ...(parsed.totals || {}) },
      events: parsed.events || [],
    };
  } catch {
    const fresh = defaultStore();
    await writeTokenUsageStore(fresh);
    return fresh;
  }
}

export async function writeTokenUsageStore(store) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
  return store;
}

export function summarizeTokenUsage(events) {
  const totals = events.reduce(
    (sum, event) => ({
      inputTokens: sum.inputTokens + Number(event.inputTokens || 0),
      outputTokens: sum.outputTokens + Number(event.outputTokens || 0),
      totalTokens: sum.totalTokens + Number(event.totalTokens || 0),
      requests: sum.requests + 1,
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 },
  );
  const byProvider = {};
  const byModel = {};
  const byDay = {};

  events.forEach((event) => {
    const providerKey = event.provider || "unknown";
    const modelKey = event.model || "unknown";
    const dayKey = String(event.createdAt || "").slice(0, 10) || "unknown";

    byProvider[providerKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
    byModel[modelKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
    byDay[dayKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };

    [byProvider[providerKey], byModel[modelKey], byDay[dayKey]].forEach((bucket) => {
      bucket.inputTokens += Number(event.inputTokens || 0);
      bucket.outputTokens += Number(event.outputTokens || 0);
      bucket.totalTokens += Number(event.totalTokens || 0);
      bucket.requests += 1;
    });
  });

  return { totals, byProvider, byModel, byDay };
}

export async function recordTokenUsage(event) {
  const store = await readTokenUsageStore();
  const inputTokens = Number(event.inputTokens || 0);
  const outputTokens = Number(event.outputTokens || 0);
  const totalTokens = Number(event.totalTokens || inputTokens + outputTokens);
  const cleanEvent = {
    id: makeUsageId(),
    chatId: event.chatId || null,
    workspaceId: event.workspaceId || null,
    folderId: event.folderId || null,
    provider: event.provider || "unknown",
    model: event.model || "unknown",
    inputTokens,
    outputTokens,
    totalTokens,
    source: event.source || "provider",
    temporary: Boolean(event.temporary),
    createdAt: now(),
  };

  store.events.unshift(cleanEvent);
  store.totals = summarizeTokenUsage(store.events).totals;
  await writeTokenUsageStore(store);

  return {
    store,
    event: cleanEvent,
    summary: summarizeTokenUsage(store.events),
  };
}

export async function resetTokenUsageStore() {
  const store = defaultStore();
  await writeTokenUsageStore(store);

  return {
    ...store,
    summary: summarizeTokenUsage(store.events),
  };
}
