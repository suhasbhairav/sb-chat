import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin, organization } from "better-auth/plugins";
import { AUTH_DATABASE_PROVIDER, createAuthDatabase } from "./auth-database.js";
import { enterpriseIntegrationPlugins } from "./auth-enterprise-integrations.js";
import { enterpriseAc, enterpriseRoles } from "./auth-permissions.js";

export { AUTH_DB_PATH, AUTH_DATABASE_PROVIDER } from "./auth-database.js";

const fallbackSecret = "sb-chat-local-development-secret-change-before-production";
const adminUserIds = (process.env.BATUK_ADMIN_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const defaultRole = process.env.BATUK_DEFAULT_ROLE || "user";

export const auth = betterAuth({
  appName: "Batuk",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || fallbackSecret,
  database: createAuthDatabase(),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  experimental: {
    joins: process.env.BETTER_AUTH_EXPERIMENTAL_JOINS === "false" ? false : AUTH_DATABASE_PROVIDER !== "sqlite",
  },
  plugins: [
    admin({
      ac: enterpriseAc,
      roles: enterpriseRoles,
      defaultRole,
      adminRoles: ["owner", "admin"],
      adminUserIds,
    }),
    organization({
      ac: enterpriseAc,
      roles: enterpriseRoles,
      creatorRole: "owner",
      allowUserToCreateOrganization: true,
      membershipLimit: Number(process.env.BATUK_ORG_MEMBER_LIMIT || 500),
      teams: {
        enabled: true,
        maximumTeams: Number(process.env.BATUK_ORG_TEAM_LIMIT || 50),
        maximumMembersPerTeam: Number(process.env.BATUK_TEAM_MEMBER_LIMIT || 250),
        allowRemovingAllTeams: false,
        defaultTeam: {
          enabled: true,
        },
      },
      dynamicAccessControl: {
        enabled: true,
        maximumRolesPerOrganization: Number(process.env.BATUK_ORG_ROLE_LIMIT || 25),
      },
    }),
    ...enterpriseIntegrationPlugins(),
    nextCookies(),
  ],
});
