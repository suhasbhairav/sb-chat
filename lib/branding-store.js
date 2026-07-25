import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSqlProductDataStoreEnabled, readSqlDomainStore, writeSqlDomainStore } from "@/lib/product-data-store";

const DATA_DIR = process.env.BATUK_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "branding-store.json");
const LOGO_DIR = process.env.BATUK_BRANDING_FILE_STORAGE_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "branding");
const DEFAULT_ACCENT = "#10a37f";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function defaultStore() {
  return {
    version: 1,
    organizations: {},
  };
}

function cleanText(value, fallback, max = 80) {
  const text = String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
  return text || fallback;
}

function cleanHex(value, fallback = DEFAULT_ACCENT) {
  const text = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function cleanInitials(value, fallback) {
  const text = String(value || "").trim().replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();
  return text || fallback;
}

export function defaultBranding(orgName = "Batuk") {
  const name = cleanText(orgName, "Batuk");
  return {
    enabled: false,
    productName: name,
    tagline: "Enterprise AI workspace",
    logoInitials: cleanInitials(name.split(/\s+/).map((part) => part[0]).join(""), "SB"),
    logoUrl: "",
    logoName: "",
    accentColor: DEFAULT_ACCENT,
    showOrgName: true,
    footerLocked: "Batuk, created by Suhas Bhairav",
  };
}

export function normalizeBranding(input = {}, orgName = "Batuk") {
  const fallback = defaultBranding(orgName);
  return {
    enabled: Boolean(input.enabled),
    productName: cleanText(input.productName, fallback.productName),
    tagline: cleanText(input.tagline, fallback.tagline, 120),
    logoInitials: cleanInitials(input.logoInitials, fallback.logoInitials),
    logoUrl: typeof input.logoUrl === "string" && input.logoUrl.startsWith("/branding/") ? input.logoUrl : "",
    logoName: cleanText(input.logoName, "", 120),
    accentColor: cleanHex(input.accentColor, fallback.accentColor),
    showOrgName: input.showOrgName !== false,
    footerLocked: fallback.footerLocked,
  };
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeBrandingStore(defaultStore());
  }
}

export async function readBrandingStore() {
  if (isSqlProductDataStoreEnabled()) {
    const parsed = await readSqlDomainStore("branding", defaultStore());
    return {
      ...defaultStore(),
      ...parsed,
      organizations: parsed.organizations || {},
    };
  }

  await ensureStoreFile();
  try {
    const parsed = JSON.parse(await readFile(STORE_PATH, "utf8"));
    return {
      ...defaultStore(),
      ...parsed,
      organizations: parsed.organizations || {},
    };
  } catch {
    const fresh = defaultStore();
    await writeBrandingStore(fresh);
    return fresh;
  }
}

export async function writeBrandingStore(store) {
  if (isSqlProductDataStoreEnabled()) {
    return writeSqlDomainStore("branding", store);
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
  return store;
}

export async function getOrganizationBranding({ organizationId = "global", organizationName = "Batuk" } = {}) {
  const store = await readBrandingStore();
  return normalizeBranding(store.organizations[organizationId], organizationName);
}

export async function saveOrganizationBranding({ organizationId = "global", organizationName = "Batuk", branding }) {
  const store = await readBrandingStore();
  const clean = normalizeBranding(branding, organizationName);
  store.organizations[organizationId] = clean;
  await writeBrandingStore(store);
  return clean;
}

export async function saveOrganizationLogo({ organizationId = "global", organizationName = "Batuk", file }) {
  if (!file?.size) throw new Error("Choose a logo file.");
  if (file.size > MAX_LOGO_BYTES) throw new Error("Logo must be 5 MB or smaller.");
  const extension = LOGO_TYPES[file.type];
  if (!extension) throw new Error("Logo must be PNG, JPEG, WebP, or SVG.");

  const store = await readBrandingStore();
  const current = normalizeBranding(store.organizations[organizationId], organizationName);
  if (current.logoUrl) {
    await deleteOrganizationLogoFile(current.logoUrl).catch(() => {});
  }

  await mkdir(LOGO_DIR, { recursive: true });
  const storedName = `${organizationId.replace(/[^a-z0-9_-]/gi, "-")}-${Date.now()}.${extension}`;
  const filePath = path.join(/*turbopackIgnore: true*/ LOGO_DIR, storedName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, bytes);

  const next = normalizeBranding(
    {
      ...current,
      enabled: true,
      logoUrl: `/branding/${storedName}`,
      logoName: file.name || storedName,
    },
    organizationName,
  );
  store.organizations[organizationId] = next;
  await writeBrandingStore(store);
  return next;
}

async function deleteOrganizationLogoFile(logoUrl) {
  if (!logoUrl?.startsWith("/branding/")) return;
  const filename = path.basename(logoUrl);
  await unlink(path.join(/*turbopackIgnore: true*/ LOGO_DIR, filename));
}

export async function removeOrganizationLogo({ organizationId = "global", organizationName = "Batuk" }) {
  const store = await readBrandingStore();
  const current = normalizeBranding(store.organizations[organizationId], organizationName);
  if (current.logoUrl) {
    await deleteOrganizationLogoFile(current.logoUrl).catch(() => {});
  }
  const next = normalizeBranding({ ...current, logoUrl: "", logoName: "" }, organizationName);
  store.organizations[organizationId] = next;
  await writeBrandingStore(store);
  return next;
}
