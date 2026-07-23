import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

const authDbPath = process.env.BETTER_AUTH_DB_PATH || "data/sb-chat-auth.sqlite";
const fallbackSecret = "sb-chat-local-development-secret-change-before-production";

mkdirSync(dirname(authDbPath), { recursive: true });

export const auth = betterAuth({
  appName: "SB Chat",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || fallbackSecret,
  database: new DatabaseSync(authDbPath),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "member",
        input: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  plugins: [nextCookies()],
});
