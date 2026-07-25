import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MssqlDialect } from "kysely";
import { MongoClient } from "mongodb";
import { createPool as createMysqlPool } from "mysql2/promise";
import { Pool as PostgresPool } from "pg";
import * as Tarn from "tarn";
import * as Tedious from "tedious";

export const AUTH_DATABASE_PROVIDER = normalizeAuthDatabaseProvider(process.env.BETTER_AUTH_DATABASE_PROVIDER);
export const AUTH_DB_PATH = process.env.BETTER_AUTH_DB_PATH || "data/sb-chat-auth.sqlite";

function normalizeAuthDatabaseProvider(provider = "sqlite") {
  const normalized = String(provider || "sqlite").toLowerCase().trim();
  if (["postgres", "postgresql", "pg"].includes(normalized)) return "postgresql";
  if (["mongo", "mongodb"].includes(normalized)) return "mongodb";
  if (["mssql", "sqlserver", "sql-server"].includes(normalized)) return "mssql";
  if (["mysql", "mariadb"].includes(normalized)) return "mysql";
  return "sqlite";
}

function numberFromEnv(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
}

function booleanFromEnv(key, fallback = false) {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function createSqliteDatabase() {
  mkdirSync(dirname(AUTH_DB_PATH), { recursive: true });
  return new DatabaseSync(AUTH_DB_PATH);
}

function createMysqlDatabase() {
  const uri = process.env.BETTER_AUTH_DATABASE_URL || process.env.MYSQL_URL;
  if (uri) {
    return createMysqlPool({
      uri,
      timezone: "Z",
      waitForConnections: true,
      connectionLimit: numberFromEnv("BETTER_AUTH_MYSQL_CONNECTION_LIMIT", 10),
    });
  }

  return createMysqlPool({
    host: process.env.BETTER_AUTH_MYSQL_HOST || "localhost",
    port: numberFromEnv("BETTER_AUTH_MYSQL_PORT", 3306),
    user: process.env.BETTER_AUTH_MYSQL_USER || "root",
    password: process.env.BETTER_AUTH_MYSQL_PASSWORD || "",
    database: process.env.BETTER_AUTH_MYSQL_DATABASE || "batuk_auth",
    timezone: "Z",
    waitForConnections: true,
    connectionLimit: numberFromEnv("BETTER_AUTH_MYSQL_CONNECTION_LIMIT", 10),
  });
}

function createPostgresqlDatabase() {
  const connectionString = process.env.BETTER_AUTH_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  const schema = process.env.BETTER_AUTH_POSTGRES_SCHEMA;
  const options = schema ? `-c search_path=${schema}` : process.env.BETTER_AUTH_POSTGRES_OPTIONS;

  if (connectionString) {
    return new PostgresPool({
      connectionString,
      ...(options ? { options } : {}),
    });
  }

  return new PostgresPool({
    host: process.env.BETTER_AUTH_POSTGRES_HOST || "localhost",
    port: numberFromEnv("BETTER_AUTH_POSTGRES_PORT", 5432),
    user: process.env.BETTER_AUTH_POSTGRES_USER || "postgres",
    password: process.env.BETTER_AUTH_POSTGRES_PASSWORD || "",
    database: process.env.BETTER_AUTH_POSTGRES_DATABASE || "batuk_auth",
    ...(options ? { options } : {}),
  });
}

function createMssqlDatabase() {
  const dialect = new MssqlDialect({
    tarn: {
      ...Tarn,
      options: {
        min: numberFromEnv("BETTER_AUTH_MSSQL_POOL_MIN", 0),
        max: numberFromEnv("BETTER_AUTH_MSSQL_POOL_MAX", 10),
      },
    },
    tedious: {
      ...Tedious,
      connectionFactory: () =>
        new Tedious.Connection({
          authentication: {
            type: "default",
            options: {
              userName: process.env.BETTER_AUTH_MSSQL_USER || "sa",
              password: process.env.BETTER_AUTH_MSSQL_PASSWORD || "",
            },
          },
          server: process.env.BETTER_AUTH_MSSQL_HOST || "localhost",
          options: {
            database: process.env.BETTER_AUTH_MSSQL_DATABASE || "batuk_auth",
            port: numberFromEnv("BETTER_AUTH_MSSQL_PORT", 1433),
            encrypt: booleanFromEnv("BETTER_AUTH_MSSQL_ENCRYPT", false),
            trustServerCertificate: booleanFromEnv("BETTER_AUTH_MSSQL_TRUST_SERVER_CERTIFICATE", true),
          },
        }),
    },
    TYPES: {
      ...Tedious.TYPES,
      DateTime: Tedious.TYPES.DateTime2,
    },
  });

  return {
    dialect,
    type: "mssql",
  };
}

function createMongodbDatabase() {
  const url = process.env.BETTER_AUTH_DATABASE_URL || process.env.MONGODB_URI || "mongodb://localhost:27017/batuk_auth";
  const client = new MongoClient(url);
  const db = client.db(process.env.BETTER_AUTH_MONGODB_DATABASE || undefined);

  return mongodbAdapter(db, {
    client,
  });
}

export function createAuthDatabase() {
  if (AUTH_DATABASE_PROVIDER === "mysql") return createMysqlDatabase();
  if (AUTH_DATABASE_PROVIDER === "postgresql") return createPostgresqlDatabase();
  if (AUTH_DATABASE_PROVIDER === "mssql") return createMssqlDatabase();
  if (AUTH_DATABASE_PROVIDER === "mongodb") return createMongodbDatabase();
  return createSqliteDatabase();
}

export function authDatabaseSupportsMigrations() {
  return AUTH_DATABASE_PROVIDER !== "mongodb";
}
