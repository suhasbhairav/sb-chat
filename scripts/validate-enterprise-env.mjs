import { readFile } from "node:fs/promises";

const jsonKeys = [
  "BETTER_AUTH_OAUTH_TRUSTED_CLIENTS",
  "BETTER_AUTH_OIDC_TRUSTED_CLIENTS",
  "BETTER_AUTH_DEFAULT_SSO",
  "BETTER_AUTH_DEFAULT_SCIM",
];

async function loadEnvFile(filePath) {
  if (!filePath) return;
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function normalizeProvider(value, fallback) {
  return String(value || fallback).trim().toLowerCase();
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function assertJsonArray(key) {
  const value = process.env[key];
  if (isBlank(value)) return;
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`${key} must be valid JSON. ${error.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${key} must be a JSON array.`);
  }
}

function requireAny(keys, message) {
  if (keys.some((key) => !isBlank(process.env[key]))) return;
  throw new Error(message);
}

function validateAuthDatabase() {
  const provider = normalizeProvider(process.env.BETTER_AUTH_DATABASE_PROVIDER, "sqlite");

  if (provider === "sqlite") {
    requireAny(["BETTER_AUTH_DB_PATH"], "BETTER_AUTH_DB_PATH is required when BETTER_AUTH_DATABASE_PROVIDER=sqlite.");
    return;
  }

  if (provider === "postgresql" || provider === "postgres" || provider === "pg") {
    requireAny(
      ["BETTER_AUTH_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL", "BETTER_AUTH_POSTGRES_HOST"],
      "PostgreSQL auth needs BETTER_AUTH_DATABASE_URL or BETTER_AUTH_POSTGRES_HOST settings.",
    );
    return;
  }

  if (provider === "mysql" || provider === "mariadb") {
    requireAny(["BETTER_AUTH_DATABASE_URL", "MYSQL_URL", "BETTER_AUTH_MYSQL_HOST"], "MySQL auth needs BETTER_AUTH_DATABASE_URL or BETTER_AUTH_MYSQL_HOST settings.");
    return;
  }

  if (provider === "mssql" || provider === "sqlserver" || provider === "sql-server") {
    requireAny(["BETTER_AUTH_MSSQL_HOST"], "MS SQL auth needs BETTER_AUTH_MSSQL_HOST.");
    requireAny(["BETTER_AUTH_MSSQL_USER"], "MS SQL auth needs BETTER_AUTH_MSSQL_USER.");
    requireAny(["BETTER_AUTH_MSSQL_PASSWORD"], "MS SQL auth needs BETTER_AUTH_MSSQL_PASSWORD.");
    return;
  }

  if (provider === "mongodb" || provider === "mongo") {
    requireAny(["BETTER_AUTH_DATABASE_URL", "MONGODB_URI"], "MongoDB auth needs BETTER_AUTH_DATABASE_URL or MONGODB_URI.");
    return;
  }

  throw new Error(`Unsupported BETTER_AUTH_DATABASE_PROVIDER: ${provider}`);
}

function validateProductDataStore() {
  const provider = normalizeProvider(process.env.BATUK_DATA_STORE_PROVIDER || process.env.BATUK_STORAGE_PROVIDER, "json");

  if (provider === "json") {
    requireAny(["BATUK_DATA_DIR"], "BATUK_DATA_DIR is required when BATUK_DATA_STORE_PROVIDER=json.");
    return;
  }

  if (provider === "sqlite" || provider === "sqlite3") {
    requireAny(["BATUK_DATA_SQLITE_PATH", "BATUK_DATA_DATABASE_URL"], "SQLite product data needs BATUK_DATA_SQLITE_PATH or BATUK_DATA_DATABASE_URL.");
    return;
  }

  if (provider === "postgresql" || provider === "postgres" || provider === "pg") {
    requireAny(
      ["BATUK_DATA_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL", "BATUK_DATA_POSTGRES_HOST"],
      "PostgreSQL product data needs BATUK_DATA_DATABASE_URL or BATUK_DATA_POSTGRES_HOST settings.",
    );
    return;
  }

  if (provider === "mysql" || provider === "mariadb") {
    requireAny(["BATUK_DATA_DATABASE_URL", "MYSQL_URL", "BATUK_DATA_MYSQL_HOST"], "MySQL product data needs BATUK_DATA_DATABASE_URL or BATUK_DATA_MYSQL_HOST settings.");
    return;
  }

  throw new Error(`Unsupported BATUK_DATA_STORE_PROVIDER: ${provider}`);
}

function validateSecurity() {
  if (process.env.NODE_ENV === "production") {
    const secret = process.env.BETTER_AUTH_SECRET || "";
    if (secret.length < 32 || secret.includes("replace_with")) {
      throw new Error("BETTER_AUTH_SECRET must be a real 32+ character secret in production.");
    }
  }
}

await loadEnvFile(process.env.BATUK_ENV_FILE);
await loadEnvFile(".env.enterprise");
await loadEnvFile(".env");

for (const key of jsonKeys) {
  assertJsonArray(key);
}

validateAuthDatabase();
validateProductDataStore();
validateSecurity();

console.log("Enterprise environment configuration is valid.");
