import { getMigrations } from "better-auth/db/migration";
import { auth } from "../lib/auth.js";

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();

console.log("Better Auth SQLite schema is up to date.");
