import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSqlProductDataStoreEnabled, readSqlDomainStore, writeSqlDomainStore } from "@/lib/product-data-store";

const DATA_DIR = process.env.BATUK_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "token-usage.json");

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
  if (isSqlProductDataStoreEnabled()) {
    const parsed = await readSqlDomainStore("token-usage", defaultStore());
    return {
      ...defaultStore(),
      ...parsed,
      totals: { ...defaultStore().totals, ...(parsed.totals || {}) },
      events: parsed.events || [],
    };
  }

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
  if (isSqlProductDataStoreEnabled()) {
    return writeSqlDomainStore("token-usage", store);
  }

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
  const byMonth = {};
  const byYear = {};
  const byUser = {};
  const byChannel = {};
  const byApiKey = {};
  const byChat = {};

  events.forEach((event) => {
    const providerKey = event.provider || "unknown";
    const modelKey = event.model || "unknown";
    const dayKey = String(event.createdAt || "").slice(0, 10) || "unknown";
    const monthKey = String(event.createdAt || "").slice(0, 7) || "unknown";
    const yearKey = String(event.createdAt || "").slice(0, 4) || "unknown";
    const userKey = event.userEmail || event.userId || "unknown";
    const channelKey = event.source === "api" ? "api" : "chat";
    const apiKey = event.apiKeyId || "none";
    const chatKey = event.chatId || (event.source === "api" ? "api" : "unsaved-chat");

    byProvider[providerKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
    byModel[modelKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
    byDay[dayKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
    byMonth[monthKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
    byYear[yearKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
    byUser[userKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
    byChannel[channelKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
    byApiKey[apiKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
    byChat[chatKey] ||= { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };

    [byProvider[providerKey], byModel[modelKey], byDay[dayKey], byMonth[monthKey], byYear[yearKey], byUser[userKey], byChannel[channelKey], byApiKey[apiKey], byChat[chatKey]].forEach((bucket) => {
      bucket.inputTokens += Number(event.inputTokens || 0);
      bucket.outputTokens += Number(event.outputTokens || 0);
      bucket.totalTokens += Number(event.totalTokens || 0);
      bucket.requests += 1;
    });
  });

  return { totals, byProvider, byModel, byDay, byMonth, byYear, byUser, byChannel, byApiKey, byChat };
}

export async function recordTokenUsage(event) {
  const store = await readTokenUsageStore();
  const inputTokens = Number(event.inputTokens || 0);
  const outputTokens = Number(event.outputTokens || 0);
  const totalTokens = Number(event.totalTokens || inputTokens + outputTokens);
  const cleanEvent = {
    id: makeUsageId(),
    userId: event.userId || null,
    chatId: event.chatId || null,
    workspaceId: event.workspaceId || null,
    folderId: event.folderId || null,
    userEmail: event.userEmail || null,
    apiKeyId: event.apiKeyId || null,
    apiModel: event.apiModel || null,
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
