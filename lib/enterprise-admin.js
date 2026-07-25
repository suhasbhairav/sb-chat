import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Kysely, sql } from "kysely";
import { MongoClient } from "mongodb";
import { createPool as createMysqlPool } from "mysql2/promise";
import { Pool as PostgresPool } from "pg";
import { AUTH_DATABASE_PROVIDER, AUTH_DB_PATH, createAuthDatabase } from "@/lib/auth-database";

const ADMIN_ROLE_PATTERN = "%owner%";
const SECONDARY_ADMIN_ROLE_PATTERN = "%admin%";

function getMongoUrl() {
  return process.env.BETTER_AUTH_DATABASE_URL || process.env.MONGODB_URI || "mongodb://localhost:27017/batuk_auth";
}

async function withMysql(callback) {
  const uri = process.env.BETTER_AUTH_DATABASE_URL || process.env.MYSQL_URL;
  const pool = uri
    ? createMysqlPool({ uri, timezone: "Z" })
    : createMysqlPool({
        host: process.env.BETTER_AUTH_MYSQL_HOST || "localhost",
        port: Number(process.env.BETTER_AUTH_MYSQL_PORT || 3306),
        user: process.env.BETTER_AUTH_MYSQL_USER || "root",
        password: process.env.BETTER_AUTH_MYSQL_PASSWORD || "",
        database: process.env.BETTER_AUTH_MYSQL_DATABASE || "batuk_auth",
        timezone: "Z",
      });

  try {
    return await callback(pool);
  } finally {
    await pool.end();
  }
}

async function withPostgresql(callback) {
  const connectionString = process.env.BETTER_AUTH_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  const schema = process.env.BETTER_AUTH_POSTGRES_SCHEMA;
  const options = schema ? `-c search_path=${schema}` : process.env.BETTER_AUTH_POSTGRES_OPTIONS;
  const pool = connectionString
    ? new PostgresPool({ connectionString, ...(options ? { options } : {}) })
    : new PostgresPool({
        host: process.env.BETTER_AUTH_POSTGRES_HOST || "localhost",
        port: Number(process.env.BETTER_AUTH_POSTGRES_PORT || 5432),
        user: process.env.BETTER_AUTH_POSTGRES_USER || "postgres",
        password: process.env.BETTER_AUTH_POSTGRES_PASSWORD || "",
        database: process.env.BETTER_AUTH_POSTGRES_DATABASE || "batuk_auth",
        ...(options ? { options } : {}),
      });

  try {
    return await callback(pool);
  } finally {
    await pool.end();
  }
}

async function withMssql(callback) {
  const database = createAuthDatabase();
  const db = new Kysely({ dialect: database.dialect });
  try {
    return await callback(db);
  } finally {
    await db.destroy();
  }
}

async function withMongo(callback) {
  const client = new MongoClient(getMongoUrl());
  try {
    await client.connect();
    const db = client.db(process.env.BETTER_AUTH_MONGODB_DATABASE || undefined);
    return await callback(db);
  } finally {
    await client.close();
  }
}

async function getSqliteAdminStatus() {
  mkdirSync(dirname(AUTH_DB_PATH), { recursive: true });
  const db = new DatabaseSync(AUTH_DB_PATH);
  try {
    const row = db
      .prepare("select count(*) as count from user where role like ? or role like ?")
      .get(ADMIN_ROLE_PATTERN, SECONDARY_ADMIN_ROLE_PATTERN);
    return { hasAdmin: Number(row?.count || 0) > 0 };
  } catch {
    return { hasAdmin: false };
  } finally {
    db.close();
  }
}

async function claimSqliteFirstOwner(userId) {
  mkdirSync(dirname(AUTH_DB_PATH), { recursive: true });
  const db = new DatabaseSync(AUTH_DB_PATH);
  try {
    if ((await getSqliteAdminStatus()).hasAdmin) {
      return { claimed: false, reason: "An enterprise owner or admin already exists." };
    }

    const user = db.prepare("select id, email, name, role from user where id = ?").get(userId);
    if (!user) return { claimed: false, reason: "Authenticated user was not found." };

    db.prepare("update user set role = ? where id = ?").run("owner", userId);
    return { claimed: true, user: { ...user, role: "owner" } };
  } finally {
    db.close();
  }
}

export async function getAdminStatus() {
  if (AUTH_DATABASE_PROVIDER === "mysql") {
    return withMysql(async (pool) => {
      const [rows] = await pool.query("select count(*) as count from `user` where role like ? or role like ?", [
        ADMIN_ROLE_PATTERN,
        SECONDARY_ADMIN_ROLE_PATTERN,
      ]);
      return { hasAdmin: Number(rows?.[0]?.count || 0) > 0 };
    });
  }

  if (AUTH_DATABASE_PROVIDER === "postgresql") {
    return withPostgresql(async (pool) => {
      const result = await pool.query('select count(*) as count from "user" where role like $1 or role like $2', [
        ADMIN_ROLE_PATTERN,
        SECONDARY_ADMIN_ROLE_PATTERN,
      ]);
      return { hasAdmin: Number(result.rows?.[0]?.count || 0) > 0 };
    });
  }

  if (AUTH_DATABASE_PROVIDER === "mssql") {
    return withMssql(async (db) => {
      const result = await sql`select count(*) as count from [user] where role like ${ADMIN_ROLE_PATTERN} or role like ${SECONDARY_ADMIN_ROLE_PATTERN}`.execute(db);
      return { hasAdmin: Number(result.rows?.[0]?.count || 0) > 0 };
    });
  }

  if (AUTH_DATABASE_PROVIDER === "mongodb") {
    return withMongo(async (db) => {
      const count = await db.collection("user").countDocuments({
        role: { $regex: "(^|,)(owner|admin)(,|$)" },
      });
      return { hasAdmin: count > 0 };
    });
  }

  return getSqliteAdminStatus();
}

export async function claimFirstOwner(userId) {
  if (AUTH_DATABASE_PROVIDER === "mysql") {
    return withMysql(async (pool) => {
      if ((await getAdminStatus()).hasAdmin) return { claimed: false, reason: "An enterprise owner or admin already exists." };
      const [rows] = await pool.query("select id, email, name, role from `user` where id = ?", [userId]);
      const user = rows?.[0];
      if (!user) return { claimed: false, reason: "Authenticated user was not found." };
      await pool.query("update `user` set role = ? where id = ?", ["owner", userId]);
      return { claimed: true, user: { ...user, role: "owner" } };
    });
  }

  if (AUTH_DATABASE_PROVIDER === "postgresql") {
    return withPostgresql(async (pool) => {
      if ((await getAdminStatus()).hasAdmin) return { claimed: false, reason: "An enterprise owner or admin already exists." };
      const result = await pool.query('select id, email, name, role from "user" where id = $1', [userId]);
      const user = result.rows?.[0];
      if (!user) return { claimed: false, reason: "Authenticated user was not found." };
      await pool.query('update "user" set role = $1 where id = $2', ["owner", userId]);
      return { claimed: true, user: { ...user, role: "owner" } };
    });
  }

  if (AUTH_DATABASE_PROVIDER === "mssql") {
    return withMssql(async (db) => {
      if ((await getAdminStatus()).hasAdmin) return { claimed: false, reason: "An enterprise owner or admin already exists." };
      const result = await sql`select id, email, name, role from [user] where id = ${userId}`.execute(db);
      const user = result.rows?.[0];
      if (!user) return { claimed: false, reason: "Authenticated user was not found." };
      await sql`update [user] set role = ${"owner"} where id = ${userId}`.execute(db);
      return { claimed: true, user: { ...user, role: "owner" } };
    });
  }

  if (AUTH_DATABASE_PROVIDER === "mongodb") {
    return withMongo(async (db) => {
      if ((await getAdminStatus()).hasAdmin) return { claimed: false, reason: "An enterprise owner or admin already exists." };
      const user = await db.collection("user").findOne({ id: userId }, { projection: { id: 1, email: 1, name: 1, role: 1 } });
      if (!user) return { claimed: false, reason: "Authenticated user was not found." };
      await db.collection("user").updateOne({ id: userId }, { $set: { role: "owner" } });
      return { claimed: true, user: { ...user, role: "owner" } };
    });
  }

  return claimSqliteFirstOwner(userId);
}
