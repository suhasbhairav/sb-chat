import { createPool as createMysqlPool } from "mysql2/promise";
import { Pool as PostgresPool } from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const PROVIDER = normalizeProvider(process.env.BATUK_DATA_STORE_PROVIDER || process.env.BATUK_STORAGE_PROVIDER || "json");
const TABLE_NAME = sanitizeIdentifier(process.env.BATUK_DATA_STATE_TABLE || "batuk_app_state");
const GLOBAL_SCOPE = {
  organizationId: "global",
  userId: "global",
};
const scopeStorage = new AsyncLocalStorage();

let postgresPool;
let mysqlPool;
let sqliteDb;
let initialized = false;

export function getProductDataProvider() {
  return PROVIDER;
}

export function isSqlProductDataStoreEnabled() {
  return PROVIDER === "postgresql" || PROVIDER === "mysql" || PROVIDER === "sqlite";
}

export function resolveProductDataScope(session) {
  const userId = session?.user?.id || "global";
  const organizationId =
    session?.session?.activeOrganizationId ||
    session?.activeOrganizationId ||
    session?.user?.activeOrganizationId ||
    session?.activeOrganization?.id ||
    userId;

  return {
    organizationId: String(organizationId || userId || "global"),
    userId: String(userId || "global"),
  };
}

export function setProductDataScope(scope) {
  scopeStorage.enterWith(cleanScope(scope));
}

export function getProductDataScope() {
  return scopeStorage.getStore() || GLOBAL_SCOPE;
}

export function withProductDataScope(scope, callback) {
  return scopeStorage.run(cleanScope(scope), callback);
}

function normalizeProvider(provider) {
  const normalized = String(provider || "json").trim().toLowerCase();
  if (["postgres", "postgresql", "pg"].includes(normalized)) return "postgresql";
  if (["mysql", "mariadb"].includes(normalized)) return "mysql";
  if (["sqlite", "sqlite3"].includes(normalized)) return "sqlite";
  return "json";
}

function sanitizeIdentifier(value) {
  const clean = String(value || "").replace(/[^a-zA-Z0-9_]/g, "");
  return clean || "batuk_app_state";
}

function numberFromEnv(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
}

function getPostgresPool() {
  if (postgresPool) return postgresPool;
  const connectionString = process.env.BATUK_DATA_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  const schema = process.env.BATUK_DATA_POSTGRES_SCHEMA;
  const options = schema ? `-c search_path=${schema}` : process.env.BATUK_DATA_POSTGRES_OPTIONS;

  postgresPool = connectionString
    ? new PostgresPool({ connectionString, ...(options ? { options } : {}) })
    : new PostgresPool({
        host: process.env.BATUK_DATA_POSTGRES_HOST || "localhost",
        port: numberFromEnv("BATUK_DATA_POSTGRES_PORT", 5432),
        user: process.env.BATUK_DATA_POSTGRES_USER || "postgres",
        password: process.env.BATUK_DATA_POSTGRES_PASSWORD || "",
        database: process.env.BATUK_DATA_POSTGRES_DATABASE || "batuk",
        ...(options ? { options } : {}),
      });

  return postgresPool;
}

function getMysqlPool() {
  if (mysqlPool) return mysqlPool;
  const uri = process.env.BATUK_DATA_DATABASE_URL || process.env.MYSQL_URL;

  mysqlPool = uri
    ? createMysqlPool({
        uri,
        timezone: "Z",
        waitForConnections: true,
        connectionLimit: numberFromEnv("BATUK_DATA_MYSQL_CONNECTION_LIMIT", 10),
      })
    : createMysqlPool({
        host: process.env.BATUK_DATA_MYSQL_HOST || "localhost",
        port: numberFromEnv("BATUK_DATA_MYSQL_PORT", 3306),
        user: process.env.BATUK_DATA_MYSQL_USER || "root",
        password: process.env.BATUK_DATA_MYSQL_PASSWORD || "",
        database: process.env.BATUK_DATA_MYSQL_DATABASE || "batuk",
        timezone: "Z",
        waitForConnections: true,
        connectionLimit: numberFromEnv("BATUK_DATA_MYSQL_CONNECTION_LIMIT", 10),
      });

  return mysqlPool;
}

function getSqliteDatabase() {
  if (sqliteDb) return sqliteDb;
  const dbPath = process.env.BATUK_DATA_SQLITE_PATH || process.env.BATUK_DATA_DATABASE_URL?.replace(/^sqlite:\/\//, "") || "data/batuk-product-data.sqlite";
  mkdirSync(dirname(dbPath), { recursive: true });
  sqliteDb = new DatabaseSync(dbPath);
  return sqliteDb;
}

async function ensureSqlStore() {
  if (!isSqlProductDataStoreEnabled() || initialized) return;

  if (PROVIDER === "sqlite") {
    const db = getSqliteDatabase();
    db.exec(`
      create table if not exists ${TABLE_NAME} (
        domain text not null,
        organization_id text not null default 'global',
        user_id text not null default 'global',
        payload text not null,
        created_at text not null default (datetime('now')),
        updated_at text not null default (datetime('now')),
        primary key (domain, organization_id, user_id)
      );
      create index if not exists ${TABLE_NAME}_scope_idx on ${TABLE_NAME} (organization_id, user_id);
    `);
  }

  if (PROVIDER === "postgresql") {
    await getPostgresPool().query(`
      create table if not exists ${TABLE_NAME} (
        domain varchar(80) not null,
        organization_id varchar(160) not null default 'global',
        user_id varchar(160) not null default 'global',
        payload jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (domain, organization_id, user_id)
      )
    `);
    await getPostgresPool().query(`create index if not exists ${TABLE_NAME}_scope_idx on ${TABLE_NAME} (organization_id, user_id)`);
  }

  if (PROVIDER === "mysql") {
    await getMysqlPool().query(`
      create table if not exists ${TABLE_NAME} (
        domain varchar(80) not null,
        organization_id varchar(160) not null default 'global',
        user_id varchar(160) not null default 'global',
        payload json not null,
        created_at timestamp not null default current_timestamp,
        updated_at timestamp not null default current_timestamp on update current_timestamp,
        primary key (domain, organization_id, user_id),
        key ${TABLE_NAME}_scope_idx (organization_id, user_id)
      ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
    `);
  }

  initialized = true;
}

function cleanScope(scope = {}) {
  return {
    organizationId: String(scope.organizationId || GLOBAL_SCOPE.organizationId).slice(0, 160),
    userId: String(scope.userId || GLOBAL_SCOPE.userId).slice(0, 160),
  };
}

export async function readSqlDomainStore(domain, fallback, scope = GLOBAL_SCOPE) {
  if (!isSqlProductDataStoreEnabled()) return fallback;
  await ensureSqlStore();

  const clean = cleanScope(scope === GLOBAL_SCOPE ? getProductDataScope() : scope);
  if (PROVIDER === "sqlite") {
    const row = getSqliteDatabase()
      .prepare(`select payload from ${TABLE_NAME} where domain = ? and organization_id = ? and user_id = ?`)
      .get(domain, clean.organizationId, clean.userId);
    return row?.payload ? JSON.parse(row.payload) : fallback;
  }

  if (PROVIDER === "postgresql") {
    const result = await getPostgresPool().query(
      `select payload from ${TABLE_NAME} where domain = $1 and organization_id = $2 and user_id = $3`,
      [domain, clean.organizationId, clean.userId],
    );
    return result.rows[0]?.payload || fallback;
  }

  const [rows] = await getMysqlPool().query(
    `select payload from ${TABLE_NAME} where domain = ? and organization_id = ? and user_id = ?`,
    [domain, clean.organizationId, clean.userId],
  );
  const payload = rows?.[0]?.payload;
  return typeof payload === "string" ? JSON.parse(payload) : payload || fallback;
}

export async function writeSqlDomainStore(domain, payload, scope = GLOBAL_SCOPE) {
  if (!isSqlProductDataStoreEnabled()) return payload;
  await ensureSqlStore();

  const clean = cleanScope(scope === GLOBAL_SCOPE ? getProductDataScope() : scope);
  const serialized = JSON.stringify(payload);
  if (PROVIDER === "sqlite") {
    getSqliteDatabase()
      .prepare(
        `insert into ${TABLE_NAME} (domain, organization_id, user_id, payload, updated_at)
         values (?, ?, ?, ?, datetime('now'))
         on conflict(domain, organization_id, user_id)
         do update set payload = excluded.payload, updated_at = datetime('now')`,
      )
      .run(domain, clean.organizationId, clean.userId, serialized);
    return payload;
  }

  if (PROVIDER === "postgresql") {
    await getPostgresPool().query(
      `insert into ${TABLE_NAME} (domain, organization_id, user_id, payload)
       values ($1, $2, $3, $4::jsonb)
       on conflict (domain, organization_id, user_id)
       do update set payload = excluded.payload, updated_at = now()`,
      [domain, clean.organizationId, clean.userId, serialized],
    );
    return payload;
  }

  await getMysqlPool().query(
    `insert into ${TABLE_NAME} (domain, organization_id, user_id, payload)
     values (?, ?, ?, cast(? as json))
     on duplicate key update payload = values(payload), updated_at = current_timestamp`,
    [domain, clean.organizationId, clean.userId, serialized],
  );
  return payload;
}
