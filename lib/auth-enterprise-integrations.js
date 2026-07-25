import { dash, sentinel } from "@better-auth/infra";
import { oauthProvider } from "@better-auth/oauth-provider";
import { scim } from "@better-auth/scim";
import { sso } from "@better-auth/sso";
import { jwt, oidcProvider } from "better-auth/plugins";
import { roleAllows } from "./auth-permissions.js";

const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const oauthScopes = ["openid", "profile", "email", "offline_access", "batuk:read", "batuk:write", "batuk:admin"];

function boolEnv(key, fallback = false) {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function numberEnv(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
}

function jsonEnv(key, fallback) {
  const value = process.env[key];
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function commaEnv(key, fallback = []) {
  const value = process.env[key];
  if (!value) return fallback;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function hasEnterpriseRole(user) {
  return roleAllows(user?.role || "user", { user: ["list"] });
}

function dashboardPlugins() {
  if (!process.env.BETTER_AUTH_API_KEY) return [];
  return [
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
      apiUrl: process.env.BETTER_AUTH_INFRA_API_URL,
      kvUrl: process.env.BETTER_AUTH_INFRA_KV_URL,
      apiTimeout: numberEnv("BETTER_AUTH_INFRA_API_TIMEOUT", 3000),
      kvTimeout: numberEnv("BETTER_AUTH_INFRA_KV_TIMEOUT", 1000),
      activityTracking: {
        enabled: boolEnv("BETTER_AUTH_DASH_ACTIVITY_TRACKING_ENABLED", true),
        updateInterval: numberEnv("BETTER_AUTH_DASH_ACTIVITY_UPDATE_INTERVAL", 300000),
      },
    }),
    ...(boolEnv("BETTER_AUTH_SENTINEL_ENABLED")
      ? [
          sentinel({
            apiKey: process.env.BETTER_AUTH_API_KEY,
          }),
        ]
      : []),
  ];
}

function providerPlugin() {
  const mode = process.env.BETTER_AUTH_PROVIDER_MODE || "oauth";
  if (mode === "legacy-oidc") {
    return oidcProvider({
      loginPage: process.env.BETTER_AUTH_OIDC_LOGIN_PAGE || "/",
      consentPage: process.env.BETTER_AUTH_OIDC_CONSENT_PAGE || "/oauth/consent",
      allowDynamicClientRegistration: boolEnv("BETTER_AUTH_OIDC_DYNAMIC_CLIENT_REGISTRATION", false),
      trustedClients: jsonEnv("BETTER_AUTH_OIDC_TRUSTED_CLIENTS", []),
      getAdditionalUserInfoClaim: async (user, scopes) => ({
        ...(scopes.includes("profile") ? { role: user.role || "user" } : {}),
      }),
    });
  }

  return oauthProvider({
    loginPage: process.env.BETTER_AUTH_OAUTH_LOGIN_PAGE || "/",
    consentPage: process.env.BETTER_AUTH_OAUTH_CONSENT_PAGE || "/oauth/consent",
    scopes: commaEnv("BETTER_AUTH_OAUTH_SCOPES", oauthScopes),
    validAudiences: commaEnv("BETTER_AUTH_OAUTH_AUDIENCES", [baseUrl]),
    accessTokenExpiresIn: numberEnv("BETTER_AUTH_OAUTH_ACCESS_TOKEN_EXPIRES_IN", 3600),
    refreshTokenExpiresIn: numberEnv("BETTER_AUTH_OAUTH_REFRESH_TOKEN_EXPIRES_IN", 60 * 60 * 24 * 30),
    allowDynamicClientRegistration: boolEnv("BETTER_AUTH_OAUTH_DYNAMIC_CLIENT_REGISTRATION", true),
    allowUnauthenticatedClientRegistration: boolEnv("BETTER_AUTH_OAUTH_UNAUTHENTICATED_CLIENT_REGISTRATION", false),
    clientRegistrationDefaultScopes: commaEnv("BETTER_AUTH_OAUTH_CLIENT_DEFAULT_SCOPES", ["openid", "profile", "email"]),
    clientRegistrationAllowedScopes: commaEnv("BETTER_AUTH_OAUTH_CLIENT_ALLOWED_SCOPES", ["offline_access", "batuk:read"]),
    clientRegistrationClientSecretExpiration: process.env.BETTER_AUTH_OAUTH_CLIENT_SECRET_EXPIRATION || undefined,
    trustedClients: jsonEnv("BETTER_AUTH_OAUTH_TRUSTED_CLIENTS", []),
    cachedTrustedClients: new Set(commaEnv("BETTER_AUTH_OAUTH_CACHED_TRUSTED_CLIENTS", [])),
    clientReference: ({ session }) => session?.activeOrganizationId || session?.activeTeamId,
    clientPrivileges: async ({ action, user }) => {
      if (["read", "list"].includes(action)) return Boolean(user);
      return hasEnterpriseRole(user);
    },
    customUserInfoClaims: async ({ user, scopes }) => ({
      ...(scopes.includes("profile") ? { role: user.role || "user" } : {}),
    }),
    customIdTokenClaims: async ({ user, scopes }) => ({
      ...(scopes.includes("profile") ? { role: user.role || "user" } : {}),
    }),
    advertisedMetadata: {
      claims_supported: ["sub", "name", "email", "email_verified", "role"],
      scopes_supported: oauthScopes,
    },
    silenceWarnings: {
      oauthAuthServerConfig: true,
      openidConfig: true,
    },
  });
}

function ssoPlugin() {
  return sso({
    providersLimit: numberEnv("BETTER_AUTH_SSO_PROVIDERS_LIMIT", 25),
    redirectURI: process.env.BETTER_AUTH_SSO_REDIRECT_URI || "/api/auth/sso/callback",
    defaultSSO: jsonEnv("BETTER_AUTH_DEFAULT_SSO", []),
    disableImplicitSignUp: boolEnv("BETTER_AUTH_SSO_DISABLE_IMPLICIT_SIGN_UP", false),
    defaultOverrideUserInfo: boolEnv("BETTER_AUTH_SSO_OVERRIDE_USER_INFO", false),
    domainVerification: {
      enabled: boolEnv("BETTER_AUTH_SSO_DOMAIN_VERIFICATION_ENABLED", true),
      tokenPrefix: process.env.BETTER_AUTH_SSO_DOMAIN_TOKEN_PREFIX || "batuk-sso",
    },
    organizationProvisioning: {
      disabled: boolEnv("BETTER_AUTH_SSO_ORG_PROVISIONING_DISABLED", false),
      defaultRole: process.env.BETTER_AUTH_SSO_DEFAULT_ORG_ROLE === "admin" ? "admin" : "member",
      getRole: async ({ userInfo }) => (String(userInfo?.role || "").toLowerCase() === "admin" ? "admin" : "member"),
    },
    provisionUserOnEveryLogin: boolEnv("BETTER_AUTH_SSO_PROVISION_ON_EVERY_LOGIN", true),
  });
}

function scimPlugin() {
  return scim({
    requiredRole: commaEnv("BETTER_AUTH_SCIM_REQUIRED_ROLES", ["owner", "admin"]),
    defaultSCIM: jsonEnv("BETTER_AUTH_DEFAULT_SCIM", []),
    providerOwnership: {
      enabled: boolEnv("BETTER_AUTH_SCIM_PROVIDER_OWNERSHIP_ENABLED", true),
    },
    linkExistingUsers: {
      trustedDomains: commaEnv("BETTER_AUTH_SCIM_TRUSTED_DOMAINS", []),
      requireExistingOrgMembership: boolEnv("BETTER_AUTH_SCIM_REQUIRE_EXISTING_ORG_MEMBERSHIP", true),
    },
    canGenerateToken: async ({ user }) => roleAllows(user?.role || "user", { user: ["create"] }),
  });
}

export function enterpriseIntegrationPlugins() {
  return [
    ...dashboardPlugins(),
    jwt({
      jwks: {
        jwksPath: process.env.BETTER_AUTH_JWKS_PATH || "/jwks",
        keyPairConfig: {
          alg: process.env.BETTER_AUTH_JWT_ALG || "EdDSA",
        },
      },
    }),
    providerPlugin(),
    ssoPlugin(),
    scimPlugin(),
  ];
}

export function getEnterpriseIntegrationStatus() {
  const mode = process.env.BETTER_AUTH_PROVIDER_MODE || "oauth";
  return {
    dashboard: {
      enabled: Boolean(process.env.BETTER_AUTH_API_KEY),
      activityTracking: boolEnv("BETTER_AUTH_DASH_ACTIVITY_TRACKING_ENABLED", true),
      sentinel: boolEnv("BETTER_AUTH_SENTINEL_ENABLED"),
    },
    oauthProvider: {
      enabled: mode !== "legacy-oidc",
      mode,
      dynamicClientRegistration: boolEnv("BETTER_AUTH_OAUTH_DYNAMIC_CLIENT_REGISTRATION", true),
      unauthenticatedClientRegistration: boolEnv("BETTER_AUTH_OAUTH_UNAUTHENTICATED_CLIENT_REGISTRATION", false),
      scopes: commaEnv("BETTER_AUTH_OAUTH_SCOPES", oauthScopes),
    },
    oidcProvider: {
      enabled: mode === "legacy-oidc" || oauthScopes.includes("openid"),
      legacyMode: mode === "legacy-oidc",
      note: mode === "legacy-oidc" ? "Legacy OIDC provider is mounted." : "OIDC is served by the OAuth Provider openid scope.",
    },
    sso: {
      enabled: true,
      domainVerification: boolEnv("BETTER_AUTH_SSO_DOMAIN_VERIFICATION_ENABLED", true),
      organizationProvisioning: !boolEnv("BETTER_AUTH_SSO_ORG_PROVISIONING_DISABLED", false),
      providersLimit: numberEnv("BETTER_AUTH_SSO_PROVIDERS_LIMIT", 25),
    },
    scim: {
      enabled: true,
      providerOwnership: boolEnv("BETTER_AUTH_SCIM_PROVIDER_OWNERSHIP_ENABLED", true),
      requiredRoles: commaEnv("BETTER_AUTH_SCIM_REQUIRED_ROLES", ["owner", "admin"]),
    },
  };
}
