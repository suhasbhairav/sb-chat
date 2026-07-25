import { getMigrations } from "better-auth/db/migration";
import { auth } from "../lib/auth.js";
import { authDatabaseSupportsMigrations, AUTH_DATABASE_PROVIDER } from "../lib/auth-database.js";

if (!authDatabaseSupportsMigrations()) {
  console.log(`Better Auth ${AUTH_DATABASE_PROVIDER} adapter does not require SQL migrations.`);
  process.exit(0);
}

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();

console.log(`Better Auth ${AUTH_DATABASE_PROVIDER} schema is up to date.`);
