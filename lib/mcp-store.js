import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeId } from "./chat-utils.js";
import { MCP_CATALOG } from "./mcp-catalog.js";
import { isSqlProductDataStoreEnabled, readSqlDomainStore, writeSqlDomainStore } from "./product-data-store.js";

const DATA_DIR = process.env.BATUK_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "mcp-integrations.json");

function now() {
  return new Date().toISOString();
}

function defaultStore() {
  return { version: 1, activeIntegrationId: "", integrations: [] };
}

function cleanObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isSecretKey(key = "") {
  return /secret|token|password|authorization|api[_-]?key|clientsecret/i.test(key);
}

function mergeConfigWithPreservedSecrets(base = {}, update = {}) {
  const next = { ...cleanObject(base) };

  Object.entries(cleanObject(update)).forEach(([key, value]) => {
    const existingValue = next[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      next[key] = mergeConfigWithPreservedSecrets(cleanObject(existingValue), value);
      return;
    }
    if (isSecretKey(key) && (value === "" || value === "********")) {
      return;
    }
    next[key] = value;
  });

  return next;
}

function redactConfig(value = {}) {
  if (Array.isArray(value)) return value.map((item) => redactConfig(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (isSecretKey(key) && String(item || "").trim()) return [key, "********"];
      return [key, redactConfig(item)];
    }),
  );
}

function cleanIntegration(input = {}, existing = {}) {
  const timestamp = now();
  const catalogItem = MCP_CATALOG.find((item) => item.id === input.catalogId) || {};
  const name = input.name ?? existing.name ?? catalogItem.name ?? "MCP integration";
  const transport = input.transport ?? existing.transport ?? catalogItem.transport ?? "http";
  const config = mergeConfigWithPreservedSecrets(
    mergeConfigWithPreservedSecrets(cleanObject(catalogItem.setup), cleanObject(existing.config)),
    cleanObject(input.config),
  );

  return {
    id: String(input.id || existing.id || makeId()).slice(0, 120),
    catalogId: String(input.catalogId || existing.catalogId || "custom").slice(0, 120),
    name: String(name).trim().slice(0, 90) || "MCP integration",
    description: String(input.description ?? existing.description ?? catalogItem.description ?? "").trim().slice(0, 500),
    category: String(input.category ?? existing.category ?? catalogItem.category ?? "Custom").trim().slice(0, 80),
    transport: ["http", "sse", "stdio"].includes(transport) ? transport : "http",
    enabled: input.enabled ?? existing.enabled ?? true,
    config,
    docsUrl: String(input.docsUrl || existing.docsUrl || catalogItem.docsUrl || "").slice(0, 500),
    stage: String(input.stage || existing.stage || catalogItem.stage || "In alpha, PoC stage").slice(0, 80),
    instructions: Array.isArray(input.instructions || existing.instructions || catalogItem.instructions)
      ? (input.instructions || existing.instructions || catalogItem.instructions).map((item) => String(item).slice(0, 500)).slice(0, 20)
      : [],
    discovery: cleanObject(input.discovery ?? existing.discovery),
    status: String(input.status || existing.status || "not_tested").slice(0, 40),
    statusMessage: String(input.statusMessage || existing.statusMessage || "").slice(0, 500),
    lastConnectedAt: input.lastConnectedAt || existing.lastConnectedAt || "",
    createdAt: existing.createdAt || input.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

export function publicMcpStoreView(store) {
  return {
    ...store,
    integrations: (store.integrations || []).map((integration) => ({
      ...integration,
      config: redactConfig(integration.config),
    })),
  };
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeMcpStore(defaultStore());
  }
}

export async function readMcpStore() {
  if (isSqlProductDataStoreEnabled()) {
    const parsed = await readSqlDomainStore("mcp-integrations", defaultStore());
    return {
      ...defaultStore(),
      ...parsed,
      integrations: Array.isArray(parsed.integrations) ? parsed.integrations.map((item) => cleanIntegration(item, item)) : [],
    };
  }

  await ensureStoreFile();
  try {
    const parsed = JSON.parse(await readFile(STORE_PATH, "utf8"));
    return {
      ...defaultStore(),
      ...parsed,
      integrations: Array.isArray(parsed.integrations) ? parsed.integrations.map((item) => cleanIntegration(item, item)) : [],
    };
  } catch {
    const fresh = defaultStore();
    await writeMcpStore(fresh);
    return fresh;
  }
}

export async function writeMcpStore(store) {
  if (isSqlProductDataStoreEnabled()) return writeSqlDomainStore("mcp-integrations", store);
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
  return store;
}

export async function upsertMcpIntegration(integration) {
  const store = await readMcpStore();
  const existing = store.integrations.find((item) => item.id === integration.id);
  const nextIntegration = cleanIntegration(integration, existing);
  const integrations = existing
    ? store.integrations.map((item) => (item.id === nextIntegration.id ? nextIntegration : item))
    : [nextIntegration, ...store.integrations];
  const nextStore = { ...store, integrations, activeIntegrationId: store.activeIntegrationId || nextIntegration.id };
  await writeMcpStore(nextStore);
  return { store: nextStore, integration: nextIntegration };
}

export async function deleteMcpIntegration(integrationId) {
  const store = await readMcpStore();
  const integrations = store.integrations.filter((item) => item.id !== integrationId);
  const nextStore = {
    ...store,
    integrations,
    activeIntegrationId: store.activeIntegrationId === integrationId ? integrations[0]?.id || "" : store.activeIntegrationId,
  };
  await writeMcpStore(nextStore);
  return { store: nextStore };
}

export async function setActiveMcpIntegration(integrationId) {
  const store = await readMcpStore();
  const nextStore = { ...store, activeIntegrationId: integrationId || "" };
  await writeMcpStore(nextStore);
  return { store: nextStore };
}

export async function updateMcpDiscovery(integrationId, discovery, statusMessage = "") {
  const store = await readMcpStore();
  const timestamp = now();
  const integrations = store.integrations.map((item) =>
    item.id === integrationId
      ? cleanIntegration(
          { ...item, discovery, status: "connected", statusMessage, lastConnectedAt: timestamp },
          item,
        )
      : item,
  );
  const nextStore = { ...store, integrations };
  await writeMcpStore(nextStore);
  return { store: nextStore, integration: integrations.find((item) => item.id === integrationId) };
}

export async function updateMcpIntegrationConfig(integrationId, configPatch = {}, fields = {}) {
  const store = await readMcpStore();
  const integrations = store.integrations.map((item) => {
    if (item.id !== integrationId) return item;
    return cleanIntegration(
      {
        ...item,
        ...fields,
        config: mergeConfigWithPreservedSecrets(item.config, configPatch),
      },
      item,
    );
  });
  const nextStore = { ...store, integrations };
  await writeMcpStore(nextStore);
  return { store: nextStore, integration: integrations.find((item) => item.id === integrationId) };
}

export async function markMcpIntegrationFailed(integrationId, message) {
  const store = await readMcpStore();
  const integrations = store.integrations.map((item) =>
    item.id === integrationId ? cleanIntegration({ ...item, status: "error", statusMessage: message }, item) : item,
  );
  const nextStore = { ...store, integrations };
  await writeMcpStore(nextStore);
  return { store: nextStore };
}

export async function getActiveMcpIntegration(id) {
  const store = await readMcpStore();
  const integrationId = id || store.activeIntegrationId;
  return store.integrations.find((item) => item.id === integrationId && item.enabled) || null;
}

export function formatMcpContextForPrompt(integration) {
  if (!integration) return "";
  const discovery = integration.discovery || {};
  const tools = (discovery.tools || []).slice(0, 30).map((tool) => `- ${tool.name}: ${tool.description || "No description"}`).join("\n");
  const resources = (discovery.resources || []).slice(0, 20).map((resource) => `- ${resource.name || resource.uri}: ${resource.uri}`).join("\n");
  const prompts = (discovery.prompts || []).slice(0, 20).map((prompt) => `- ${prompt.name}: ${prompt.description || "No description"}`).join("\n");
  const safety = integration.config?.safety || {};
  const confirmationTools = Array.isArray(safety.requireConfirmationForTools) ? safety.requireConfirmationForTools.join(", ") : "";
  const swiggyFoodGuidance = integration.catalogId === "swiggy-food"
    ? "Swiggy Food ordering flow: get_addresses -> search_restaurants -> get_restaurant_menu -> update_food_cart -> get_food_cart -> place_food_order -> track_food_order. Only recommend OPEN restaurants. Confirm cart items, address, payment method, and total with the user before place_food_order. COD is supported in v1 and cart total must stay under Rs. 1000."
    : "";
  return [
    `Selected MCP product: ${integration.name}`,
    integration.description ? `Description: ${integration.description}` : "",
    tools ? `Available MCP tools:\n${tools}` : "",
    resources ? `Available MCP resources:\n${resources}` : "",
    prompts ? `Available MCP prompts:\n${prompts}` : "",
    confirmationTools ? `High-impact MCP tools requiring explicit user confirmation before calling: ${confirmationTools}.` : "",
    swiggyFoodGuidance,
    "When the user asks to inspect or use this product's connected data, explain which MCP tool/resource would be used. If exact live data is needed, ask them to run the tool from the MCP dashboard action area.",
  ].filter(Boolean).join("\n\n");
}
