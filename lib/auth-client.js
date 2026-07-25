"use client";

import { createAuthClient } from "better-auth/react";
import { dashClient, sentinelClient } from "@better-auth/infra/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { scimClient } from "@better-auth/scim/client";
import { ssoClient } from "@better-auth/sso/client";
import { adminClient, oidcClient, organizationClient } from "better-auth/client/plugins";
import { enterpriseAc, enterpriseRoles } from "@/lib/auth-permissions";

const plugins = [
  adminClient({
    ac: enterpriseAc,
    roles: enterpriseRoles,
  }),
  organizationClient({
    ac: enterpriseAc,
    roles: enterpriseRoles,
    teams: {
      enabled: true,
    },
    dynamicAccessControl: {
      enabled: true,
    },
  }),
  dashClient({
    resolveUserId: ({ userId, user, session }) => userId || user?.id || session?.user?.id,
  }),
  oauthProviderClient(),
  ssoClient({
    domainVerification: {
      enabled: process.env.NEXT_PUBLIC_BETTER_AUTH_SSO_DOMAIN_VERIFICATION_ENABLED !== "false",
    },
  }),
  scimClient(),
];

if (process.env.NEXT_PUBLIC_BETTER_AUTH_PROVIDER_MODE === "legacy-oidc") {
  plugins.push(oidcClient());
}

if (process.env.NEXT_PUBLIC_BETTER_AUTH_SENTINEL_ENABLED === "true") {
  plugins.push(
    sentinelClient({
      autoSolveChallenge: true,
    }),
  );
}

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins,
});
