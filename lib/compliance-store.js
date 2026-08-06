import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readChatStore, writeChatStore } from "@/lib/chat-store";
import { readDocumentStore, writeDocumentStore } from "@/lib/rag-store";
import { readTokenUsageStore } from "@/lib/token-usage-store";
import { isSqlProductDataStoreEnabled, readSqlDomainStore, writeSqlDomainStore } from "@/lib/product-data-store";

const DATA_DIR = process.env.BATUK_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "compliance-store.json");
const MAX_AUDIT_EVENTS = Number(process.env.BATUK_AUDIT_MAX_EVENTS || 10000);

const CONTROL_CATALOG = [
  {
    id: "gdpr-ropa",
    framework: "GDPR",
    title: "Records of processing activities",
    requirement: "Maintain processing-purpose, data-category, recipient, retention, and safeguard evidence.",
    status: "implemented",
    owner: "Privacy",
    evidence: ["Compliance dashboard", "Audit trail", "Data inventory"],
  },
  {
    id: "gdpr-dsar",
    framework: "GDPR",
    title: "Data subject access and erasure",
    requirement: "Provide export, request tracking, and erasure workflows for personal data.",
    status: "implemented",
    owner: "Privacy",
    evidence: ["My data export", "Data request register", "Deletion action logs"],
  },
  {
    id: "gdpr-security",
    framework: "GDPR",
    title: "Security of processing",
    requirement: "Apply RBAC, authentication, audit logging, and local-first storage controls.",
    status: "implemented",
    owner: "Security",
    evidence: ["Better Auth RBAC", "Audit events", "Protected APIs"],
  },
  {
    id: "iso-a5-policy",
    framework: "ISO 27001",
    title: "Security policies and responsibilities",
    requirement: "Document control ownership, operating status, and evidence location.",
    status: "implemented",
    owner: "Security",
    evidence: ["Control register", "Enterprise roles"],
  },
  {
    id: "iso-a8-logging",
    framework: "ISO 27001",
    title: "Logging and monitoring",
    requirement: "Log access, admin, document, privacy, model, prompt/result, and configuration events with integrity hashes.",
    status: "implemented",
    owner: "Security",
    evidence: ["Audit trail", "Hash chain", "Prompt/result digests"],
  },
  {
    id: "hipaa-audit-controls",
    framework: "HIPAA",
    title: "Audit controls",
    requirement: "Record and examine activity in systems that contain or use ePHI, including access, changes, prompts, outputs, document events, and security events.",
    status: "implemented",
    owner: "Security",
    evidence: ["Audit trail", "Hash chain", "Access review exports"],
  },
  {
    id: "hipaa-activity-review",
    framework: "HIPAA",
    title: "Information system activity review",
    requirement: "Support review of audit logs, access reports, security incidents, document events, and model activity.",
    status: "implemented",
    owner: "Compliance",
    evidence: ["Compliance dashboard", "Audit CSV export"],
  },
  {
    id: "soc2-cc6",
    framework: "SOC 2",
    title: "Logical access controls",
    requirement: "Restrict administrative actions by role and record access changes.",
    status: "implemented",
    owner: "Security",
    evidence: ["Admin/organization plugins", "Role-change audit logs"],
  },
  {
    id: "soc2-cc7",
    framework: "SOC 2",
    title: "System operations monitoring",
    requirement: "Capture operational, document, token usage, and failed authorization events for review.",
    status: "implemented",
    owner: "Operations",
    evidence: ["Audit dashboard", "Token usage ledger"],
  },
  {
    id: "soc2-privacy",
    framework: "SOC 2",
    title: "Privacy commitments",
    requirement: "Track personal-data requests, processing categories, retention, and disclosure boundaries.",
    status: "implemented",
    owner: "Privacy",
    evidence: ["GDPR request register", "Data inventory"],
  },
];

const DATA_INVENTORY = [
  {
    category: "Account identity",
    personalData: ["name", "email", "role", "session metadata"],
    purpose: "Authentication, authorization, administration, and account support",
    storage: "Better Auth database",
    retention: "Until account deletion or configured retention process",
  },
  {
    category: "Chat content",
    personalData: ["chat prompts", "assistant responses", "workspace/folder labels"],
    purpose: "Conversation continuity and user productivity",
    storage: "Local JSON chat store",
    retention: "User-controlled export/import/delete",
  },
  {
    category: "Document uploads",
    personalData: ["uploaded files", "document names", "derived chunks", "vector identifiers"],
    purpose: "Document chat and retrieval-augmented generation",
    storage: "Local files plus JSON, ChromaDB, or Pinecone vectors",
    retention: "Until document deletion",
  },
  {
    category: "Usage and audit evidence",
    personalData: ["user id", "email hash", "IP hash", "action metadata", "token usage metadata"],
    purpose: "Security monitoring, audit evidence, abuse investigation, and compliance reporting",
    storage: "Local JSON ledgers",
    retention: `${Number(process.env.BATUK_AUDIT_RETENTION_DAYS || 365)} days by default`,
  },
];

function now() {
  return new Date().toISOString();
}

function hashValue(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
}

function defaultStore() {
  return {
    version: 1,
    settings: {
      auditEnabled: process.env.BATUK_AUDIT_ENABLED !== "false",
      retentionDays: Number(process.env.BATUK_AUDIT_RETENTION_DAYS || 365),
      hashPersonalIdentifiers: process.env.BATUK_AUDIT_HASH_IDENTIFIERS !== "false",
      rawContentEnabled: process.env.BATUK_AUDIT_RAW_CONTENT_ENABLED === "true",
      exportFormat: "json",
    },
    controls: CONTROL_CATALOG,
    dataInventory: DATA_INVENTORY,
    dataRequests: [],
    auditEvents: [],
  };
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeComplianceStore(defaultStore());
  }
}

export async function readComplianceStore() {
  if (isSqlProductDataStoreEnabled()) {
    const parsed = await readSqlDomainStore("compliance", defaultStore());
    const fallback = defaultStore();
    return {
      ...fallback,
      ...parsed,
      settings: { ...fallback.settings, ...(parsed.settings || {}) },
      controls: parsed.controls?.length ? parsed.controls : fallback.controls,
      dataInventory: parsed.dataInventory?.length ? parsed.dataInventory : fallback.dataInventory,
      dataRequests: parsed.dataRequests || [],
      auditEvents: parsed.auditEvents || [],
    };
  }

  await ensureStoreFile();
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const fallback = defaultStore();
    return {
      ...fallback,
      ...parsed,
      settings: { ...fallback.settings, ...(parsed.settings || {}) },
      controls: parsed.controls?.length ? parsed.controls : fallback.controls,
      dataInventory: parsed.dataInventory?.length ? parsed.dataInventory : fallback.dataInventory,
      dataRequests: parsed.dataRequests || [],
      auditEvents: parsed.auditEvents || [],
    };
  } catch {
    const fresh = defaultStore();
    await writeComplianceStore(fresh);
    return fresh;
  }
}

export async function writeComplianceStore(store) {
  if (isSqlProductDataStoreEnabled()) {
    return writeSqlDomainStore("compliance", store);
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
  return store;
}

function sanitizeMetadata(metadata = {}) {
  const seen = new WeakSet();
  function clean(value) {
    if (value === undefined) return undefined;
    if (typeof value === "string") return value.slice(0, 5000);
    if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
    if (Array.isArray(value)) return value.slice(0, 250).map(clean);
    if (typeof value === "object") {
      if (seen.has(value)) return "[circular]";
      seen.add(value);
      return Object.fromEntries(
        Object.entries(value)
          .filter(([, nestedValue]) => nestedValue !== undefined)
          .map(([nestedKey, nestedValue]) => {
            if (nestedKey.toLowerCase().includes("apikey") || nestedKey.toLowerCase().includes("secret") || nestedKey.toLowerCase().includes("token")) {
              return [nestedKey, "[redacted]"];
            }
            return [nestedKey, clean(nestedValue)];
          }),
      );
    }
    return String(value).slice(0, 500);
  }

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        if (key.toLowerCase().includes("apikey") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) {
          return [key, "[redacted]"];
        }
        return [key, clean(value)];
      }),
  );
}

function summarizeBy(items, key) {
  return items.reduce((acc, item) => {
    const bucket = item[key] || "unknown";
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
}

function verifyAuditChain(events = []) {
  let verified = 0;
  let brokenAt = null;

  for (let index = 0; index < events.length - 1; index += 1) {
    const current = events[index];
    const previous = events[index + 1];
    if (current.previousHash !== previous.integrityHash) {
      brokenAt = current.id;
      break;
    }
    verified += 1;
  }

  return {
    enabled: true,
    verified: brokenAt === null,
    verifiedEvents: events.length ? verified + 1 : 0,
    brokenAt,
    latestHash: events[0]?.integrityHash || null,
  };
}

function countRecent(events = [], days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return events.filter((event) => new Date(event.createdAt).getTime() >= cutoff).length;
}

export function summarizeCompliance(store) {
  const events = store.auditEvents || [];
  const controls = store.controls || [];
  const requests = store.dataRequests || [];
  const categories = summarizeBy(events, "category");
  const trailCoverage = [
    { id: "access", label: "Access and authorization", category: "access", covered: Boolean(categories.access) },
    { id: "admin", label: "Admin and API management", category: "admin", covered: Boolean(categories.admin) },
    { id: "model", label: "Prompts, completions, and model/API calls", category: "model", covered: Boolean(categories.model) },
    { id: "document", label: "Documents, RAG retrieval, uploads, downloads", category: "document", covered: Boolean(categories.document) },
    { id: "privacy", label: "GDPR/HIPAA privacy workflows and memory", category: "privacy", covered: Boolean(categories.privacy) },
    { id: "automation", label: "Agents, workflows, and skills", category: "automation", covered: Boolean(categories.automation) },
    { id: "integration", label: "MCP integrations, tools, resources, OAuth", category: "integration", covered: Boolean(categories.integration) },
    { id: "usage", label: "Token usage and usage-ledger resets", category: "usage", covered: Boolean(categories.usage) },
    { id: "compliance", label: "Control register and evidence changes", category: "compliance", covered: Boolean(categories.compliance) },
  ];
  const coverageCount = trailCoverage.filter((item) => item.covered).length;

  return {
    totals: {
      auditEvents: events.length,
      controls: controls.length,
      implementedControls: controls.filter((control) => control.status === "implemented").length,
      openDataRequests: requests.filter((request) => !["completed", "rejected"].includes(request.status)).length,
      failedOrDeniedEvents: events.filter((event) => ["failure", "denied"].includes(event.outcome)).length,
      recentEvents7d: countRecent(events, 7),
      coverageCount,
      coverageTotal: trailCoverage.length,
    },
    byFramework: summarizeBy(controls, "framework"),
    byCategory: categories,
    byOutcome: summarizeBy(events, "outcome"),
    trailCoverage,
    integrity: verifyAuditChain(events),
    recentEvents: events.slice(0, 50),
    recentDataRequests: requests.slice(0, 20),
  };
}

export async function recordAuditEvent(event) {
  const store = await readComplianceStore();
  if (!store.settings.auditEnabled) return null;

  const previousHash = store.auditEvents[0]?.integrityHash || null;
  const createdAt = now();
  const cleanEvent = {
    id: makeId("audit"),
    createdAt,
    category: event.category || "system",
    action: event.action || "unknown",
    outcome: event.outcome || "success",
    actor: {
      id: event.actor?.id || null,
      emailHash: store.settings.hashPersonalIdentifiers ? hashValue(event.actor?.email) : event.actor?.email || null,
      role: event.actor?.role || "user",
    },
    target: event.target || null,
    ipHash: store.settings.hashPersonalIdentifiers ? hashValue(event.ip) : event.ip || null,
    userAgent: event.userAgent ? String(event.userAgent).slice(0, 180) : null,
    requestId: event.requestId || null,
    statusCode: event.statusCode || null,
    frameworkTags: event.frameworkTags || [],
    metadata: sanitizeMetadata(event.metadata),
    previousHash,
  };
  cleanEvent.integrityHash = hashValue(JSON.stringify({ ...cleanEvent, integrityHash: undefined }));

  store.auditEvents = [cleanEvent, ...store.auditEvents].slice(0, MAX_AUDIT_EVENTS);
  await writeComplianceStore(store);
  return cleanEvent;
}

export async function createDataRequest({ session, type, notes }) {
  const store = await readComplianceStore();
  const request = {
    id: makeId("dsar"),
    type: ["access", "export", "erasure", "rectification", "restriction"].includes(type) ? type : "access",
    status: "open",
    subjectUserId: session.user.id,
    subjectEmailHash: hashValue(session.user.email),
    requestedBy: session.user.id,
    notes: String(notes || "").slice(0, 1000),
    createdAt: now(),
    updatedAt: now(),
  };
  store.dataRequests.unshift(request);
  await writeComplianceStore(store);
  await recordAuditEvent({
    category: "privacy",
    action: `gdpr.${request.type}.request`,
    outcome: "success",
    actor: session.user,
    target: { type: "dataRequest", id: request.id },
  });
  return request;
}

export async function updateControlStatus({ controlId, status, notes, session }) {
  const allowed = ["planned", "implemented", "needs-review", "exception"];
  const store = await readComplianceStore();
  const nextStatus = allowed.includes(status) ? status : "needs-review";
  store.controls = store.controls.map((control) =>
    control.id === controlId
      ? {
          ...control,
          status: nextStatus,
          notes: String(notes || control.notes || "").slice(0, 1000),
          updatedAt: now(),
          updatedBy: session.user.id,
        }
      : control,
  );
  await writeComplianceStore(store);
  await recordAuditEvent({
    category: "compliance",
    action: "control.update",
    outcome: "success",
    actor: session.user,
    target: { type: "control", id: controlId },
    metadata: { status: nextStatus },
  });
  return store.controls.find((control) => control.id === controlId);
}

export async function exportUserData(session) {
  const [chatStore, documentStore, tokenUsageStore, complianceStore] = await Promise.all([
    readChatStore(),
    readDocumentStore(),
    readTokenUsageStore(),
    readComplianceStore(),
  ]);
  const userId = session.user.id;
  const exportPayload = {
    exportedAt: now(),
    subject: {
      id: userId,
      name: session.user.name || null,
      email: session.user.email || null,
      role: session.user.role || "user",
    },
    chats: chatStore.chats,
    workspaces: chatStore.workspaces,
    folders: chatStore.folders,
    documents: documentStore.documents,
    tokenUsage: tokenUsageStore.events.filter((event) => !event.userId || event.userId === userId),
    auditEvents: complianceStore.auditEvents.filter((event) => event.actor?.id === userId),
    dataRequests: complianceStore.dataRequests.filter((request) => request.subjectUserId === userId || request.requestedBy === userId),
  };
  await recordAuditEvent({
    category: "privacy",
    action: "gdpr.export.fulfilled",
    outcome: "success",
    actor: session.user,
    target: { type: "user", id: userId },
  });
  return exportPayload;
}

export async function eraseLocalUserData(session) {
  const userId = session.user.id;
  const [chatStore, documentStore] = await Promise.all([readChatStore(), readDocumentStore()]);
  const nextChatStore = {
    ...chatStore,
    chats: chatStore.chats.filter((chat) => !chat.userId || chat.userId !== userId),
  };
  const nextDocumentStore = {
    ...documentStore,
    documents: documentStore.documents.filter((document) => !document.userId || document.userId !== userId),
    chunks: documentStore.chunks.filter((chunk) => !chunk.userId || chunk.userId !== userId),
  };
  await Promise.all([writeChatStore(nextChatStore), writeDocumentStore(nextDocumentStore)]);
  const request = await createDataRequest({ session, type: "erasure", notes: "Local user-owned chat/document records erased where ownership metadata was present." });
  const store = await readComplianceStore();
  store.dataRequests = store.dataRequests.map((item) =>
    item.id === request.id
      ? {
          ...item,
          status: "completed",
          completedAt: now(),
          updatedAt: now(),
        }
      : item,
  );
  await writeComplianceStore(store);
  await recordAuditEvent({
    category: "privacy",
    action: "gdpr.erasure.fulfilled",
    outcome: "success",
    actor: session.user,
    target: { type: "user", id: userId },
  });
  return { requestId: request.id };
}
