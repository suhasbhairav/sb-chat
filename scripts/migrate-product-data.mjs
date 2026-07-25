import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createPool as createMysqlPool } from "mysql2/promise";
import { Pool as PostgresPool } from "pg";

const provider = normalizeProvider(process.env.BATUK_DATA_STORE_PROVIDER || process.env.BATUK_STORAGE_PROVIDER || "json");

function normalizeProvider(value) {
  const normalized = String(value || "json").trim().toLowerCase();
  if (["postgres", "postgresql", "pg"].includes(normalized)) return "postgresql";
  if (["mysql", "mariadb"].includes(normalized)) return "mysql";
  if (["sqlite", "sqlite3"].includes(normalized)) return "sqlite";
  return "json";
}

function numberFromEnv(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
}

async function migratePostgresql() {
  const sql = await readFile(path.join(process.cwd(), "database", "postgresql", "001_enterprise_data.sql"), "utf8");
  const connectionString = process.env.BATUK_DATA_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  const schema = process.env.BATUK_DATA_POSTGRES_SCHEMA;
  const options = schema ? `-c search_path=${schema}` : process.env.BATUK_DATA_POSTGRES_OPTIONS;
  const pool = connectionString
    ? new PostgresPool({ connectionString, ...(options ? { options } : {}) })
    : new PostgresPool({
        host: process.env.BATUK_DATA_POSTGRES_HOST || "localhost",
        port: numberFromEnv("BATUK_DATA_POSTGRES_PORT", 5432),
        user: process.env.BATUK_DATA_POSTGRES_USER || "postgres",
        password: process.env.BATUK_DATA_POSTGRES_PASSWORD || "",
        database: process.env.BATUK_DATA_POSTGRES_DATABASE || "batuk",
        ...(options ? { options } : {}),
      });

  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

async function migrateSqlite() {
  const sql = await readFile(path.join(process.cwd(), "database", "sqlite", "001_enterprise_data.sql"), "utf8");
  const dbPath = process.env.BATUK_DATA_SQLITE_PATH || process.env.BATUK_DATA_DATABASE_URL?.replace(/^sqlite:\/\//, "") || "data/batuk-product-data.sqlite";
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(sql);
  } finally {
    db.close();
  }
}

async function migrateMysql() {
  const sql = await readFile(path.join(process.cwd(), "database", "mysql", "001_enterprise_data.sql"), "utf8");
  const uri = process.env.BATUK_DATA_DATABASE_URL || process.env.MYSQL_URL;
  const pool = uri
    ? createMysqlPool({
        uri,
        timezone: "Z",
        multipleStatements: true,
      })
    : createMysqlPool({
        host: process.env.BATUK_DATA_MYSQL_HOST || "localhost",
        port: numberFromEnv("BATUK_DATA_MYSQL_PORT", 3306),
        user: process.env.BATUK_DATA_MYSQL_USER || "root",
        password: process.env.BATUK_DATA_MYSQL_PASSWORD || "",
        database: process.env.BATUK_DATA_MYSQL_DATABASE || "batuk",
        timezone: "Z",
        multipleStatements: true,
      });

  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

if (provider === "json") {
  console.log("BATUK_DATA_STORE_PROVIDER=json; SQL product data migration skipped.");
} else if (provider === "sqlite") {
  await migrateSqlite();
  console.log("SQLite product data schema is ready.");
} else if (provider === "postgresql") {
  await migratePostgresql();
  console.log("PostgreSQL product data schema is ready.");
} else if (provider === "mysql") {
  await migrateMysql();
  console.log("MySQL product data schema is ready.");
} else {
  throw new Error(`Unsupported BATUK_DATA_STORE_PROVIDER: ${provider}`);
}
