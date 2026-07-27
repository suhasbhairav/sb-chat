import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeId } from "./chat-utils.js";
import { isSqlProductDataStoreEnabled, readSqlDomainStore, writeSqlDomainStore } from "./product-data-store.js";
import { getDefaultChatSettings, getProviderConfig } from "./providers.js";

const DATA_DIR = process.env.BATUK_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "api-management-store.json");
const KEY_PREFIX = "batuk";

function now() {
  return new Date().toISOString();
}

function defaultModelRoutes() {
  const defaults = getDefaultChatSettings();
  const provider = defaults.provider || "ollama";
  const config = getProviderConfig(provider);
  return [
    {
      id: `${provider}/${defaults.model || config.defaultModel}`,
      label: `${config.label} ${defaults.model || config.defaultModel}`,
      provider,
      model: defaults.model || config.defaultModel,
      baseUrl: defaults.baseUrl || config.defaultBaseUrl,
      enabled: true,
      createdAt: now(),
      updatedAt: now(),
    },
  ];
}

function defaultStore() {
  return {
    version: 1,
    settings: {
      enabled: true,
      requireUserKeys: true,
    },
    modelRoutes: defaultModelRoutes(),
    keys: [],
  };
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function randomSecret() {
  return `${KEY_PREFIX}_${crypto.randomBytes(24).toString("base64url")}`;
}

function keyPreview(secret) {
  return `${secret.slice(0, 10)}...${secret.slice(-4)}`;
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeApiManagementStore(defaultStore());
  }
}

export async function readApiManagementStore() {
  if (isSqlProductDataStoreEnabled()) {
    const parsed = await readSqlDomainStore("api-management", defaultStore());
    return {
      ...defaultStore(),
      ...parsed,
      settings: { ...defaultStore().settings, ...(parsed.settings || {}) },
      modelRoutes: Array.isArray(parsed.modelRoutes) ? parsed.modelRoutes : defaultModelRoutes(),
      keys: Array.isArray(parsed.keys) ? parsed.keys : [],
    };
  }

  await ensureStoreFile();
  try {
    const parsed = JSON.parse(await readFile(STORE_PATH, "utf8"));
    return {
      ...defaultStore(),
      ...parsed,
      settings: { ...defaultStore().settings, ...(parsed.settings || {}) },
      modelRoutes: Array.isArray(parsed.modelRoutes) ? parsed.modelRoutes : defaultModelRoutes(),
      keys: Array.isArray(parsed.keys) ? parsed.keys : [],
    };
  } catch {
    const fresh = defaultStore();
    await writeApiManagementStore(fresh);
    return fresh;
  }
}

export async function writeApiManagementStore(store) {
  if (isSqlProductDataStoreEnabled()) {
    return writeSqlDomainStore("api-management", store);
  }
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
  return store;
}

export function publicApiManagementView(store, { userId, isAdmin = false } = {}) {
  const visibleKeys = isAdmin ? store.keys : store.keys.filter((key) => key.userId === userId);
  return {
    settings: store.settings,
    canManageApi: Boolean(isAdmin),
    modelRoutes: isAdmin ? store.modelRoutes : undefined,
    keys: visibleKeys.map(({ keyHash, ...key }) => key),
    publicModels: store.modelRoutes.filter((route) => route.enabled).map((route) => ({ id: route.id, label: route.label, provider: route.provider })),
  };
}

export async function createUserApiKey({ userId, userEmail, name }) {
  const store = await readApiManagementStore();
  const secret = randomSecret();
  const timestamp = now();
  const key = {
    id: makeId(),
    userId,
    userEmail: userEmail || null,
    name: String(name || "API key").trim().slice(0, 80) || "API key",
    keyHash: sha256(secret),
    preview: keyPreview(secret),
    status: "active",
    createdAt: timestamp,
    lastUsedAt: null,
    revokedAt: null,
    revokedBy: null,
  };
  store.keys.unshift(key);
  await writeApiManagementStore(store);
  return { key: { ...key, keyHash: undefined, secret }, store };
}

export async function revokeApiKey({ keyId, userId = null, revokedBy, admin = false }) {
  const store = await readApiManagementStore();
  const timestamp = now();
  const index = store.keys.findIndex((key) => key.id === keyId && (admin || key.userId === userId));
  if (index < 0) throw new Error("API key not found.");
  store.keys[index] = {
    ...store.keys[index],
    status: "revoked",
    revokedAt: timestamp,
    revokedBy: revokedBy || userId || null,
  };
  await writeApiManagementStore(store);
  return store;
}

export async function revokeUserApiAccess({ targetUserId, revokedBy }) {
  const store = await readApiManagementStore();
  const timestamp = now();
  let count = 0;
  store.keys = store.keys.map((key) => {
    if (key.userId !== targetUserId || key.status !== "active") return key;
    count += 1;
    return {
      ...key,
      status: "revoked",
      revokedAt: timestamp,
      revokedBy: revokedBy || null,
    };
  });
  if (!count) throw new Error("No active API keys found for this user.");
  await writeApiManagementStore(store);
  return { store, count };
}

export async function upsertModelRoute(route) {
  const store = await readApiManagementStore();
  const timestamp = now();
  const clean = {
    id: String(route.id || `${route.provider}/${route.model}`).trim().slice(0, 160),
    label: String(route.label || route.id || route.model || "API model").trim().slice(0, 120),
    provider: String(route.provider || "ollama"),
    model: String(route.model || "").trim(),
    baseUrl: String(route.baseUrl || getProviderConfig(route.provider || "ollama").defaultBaseUrl).trim(),
    enabled: route.enabled !== false,
    createdAt: route.createdAt || timestamp,
    updatedAt: timestamp,
  };
  if (!clean.model) throw new Error("Model route needs a model.");
  store.modelRoutes = [clean, ...store.modelRoutes.filter((item) => item.id !== clean.id)];
  await writeApiManagementStore(store);
  return store;
}

export async function deleteModelRoute(routeId) {
  const store = await readApiManagementStore();
  store.modelRoutes = store.modelRoutes.filter((route) => route.id !== routeId);
  await writeApiManagementStore(store);
  return store;
}

export async function authenticateApiKey(secret) {
  const clean = String(secret || "").replace(/^Bearer\s+/i, "").trim();
  if (!clean) return null;
  const store = await readApiManagementStore();
  const keyHash = sha256(clean);
  const key = store.keys.find((item) => item.keyHash === keyHash && item.status === "active");
  if (!key) return null;
  key.lastUsedAt = now();
  await writeApiManagementStore(store);
  return { key, store };
}
