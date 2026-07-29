import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { updateMcpIntegrationConfig } from "@/lib/mcp-store";

function oauthConfig(integration) {
  return integration?.config?.oauth || {};
}

function requireOAuthConfig(integration) {
  const config = oauthConfig(integration);
  if (!config.enabled) return null;
  if (config.provider !== "hubspot") return config;

  const missing = [];
  if (!String(config.clientId || "").trim()) missing.push("clientId");
  if (!String(config.clientSecret || "").trim()) missing.push("clientSecret");
  if (!String(config.redirectUrl || "").trim()) missing.push("redirectUrl");
  if (missing.length) {
    throw new Error(`HubSpot MCP OAuth is missing ${missing.join(", ")}. Create a HubSpot MCP Auth App, add the redirect URL, then paste the client credentials.`);
  }
  if (integration.config?.url && !String(integration.config.url).startsWith("https://mcp.hubspot.com")) {
    throw new Error("HubSpot MCP integrations must connect to https://mcp.hubspot.com/.");
  }
  return config;
}

export function hasMcpOAuth(integration) {
  return Boolean(oauthConfig(integration).enabled);
}

export function createMcpOAuthProvider(integration, { onAuthorizationUrl } = {}) {
  const config = requireHubSpotOAuthConfig(integration);
  if (!config?.enabled) return null;
  const isSwiggy = config.provider === "swiggy";

  return {
    get redirectUrl() {
      return config.redirectUrl;
    },
    get clientMetadata() {
      return {
        redirect_uris: [config.redirectUrl],
        token_endpoint_auth_method: isSwiggy ? "none" : "client_secret_post",
        grant_types: isSwiggy ? ["authorization_code"] : ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: config.scope || undefined,
        client_name: integration.name || "Batuk MCP",
      };
    },
    state() {
      return integration.id;
    },
    clientInformation() {
      if (config.clientInformation) return config.clientInformation;
      if (isSwiggy) return undefined;
      return {
        client_id: config.clientId,
        client_secret: config.clientSecret,
      };
    },
    async saveClientInformation(clientInformation) {
      config.clientInformation = clientInformation;
      await updateMcpIntegrationConfig(integration.id, { oauth: { clientInformation } });
    },
    tokens() {
      return config.tokens;
    },
    async saveTokens(tokens) {
      config.tokens = tokens;
      await updateMcpIntegrationConfig(integration.id, { oauth: { tokens } });
    },
    redirectToAuthorization(authorizationUrl) {
      onAuthorizationUrl?.(authorizationUrl);
    },
    async saveCodeVerifier(codeVerifier) {
      config.codeVerifier = codeVerifier;
      await updateMcpIntegrationConfig(integration.id, { oauth: { codeVerifier } });
    },
    codeVerifier() {
      if (!config.codeVerifier) throw new Error("No PKCE code verifier saved for this MCP OAuth session. Start OAuth again.");
      return config.codeVerifier;
    },
    async saveDiscoveryState(discovery) {
      config.discovery = discovery;
      await updateMcpIntegrationConfig(integration.id, { oauth: { discovery } });
    },
    discoveryState() {
      return config.discovery;
    },
    async invalidateCredentials(scope) {
      if (scope === "tokens") {
        config.tokens = undefined;
        await updateMcpIntegrationConfig(integration.id, { oauth: { tokens: undefined } });
      }
      if (scope === "verifier") {
        config.codeVerifier = undefined;
        await updateMcpIntegrationConfig(integration.id, { oauth: { codeVerifier: undefined } });
      }
    },
  };
}

export async function startMcpOAuth(integration) {
  const oauth = requireOAuthConfig(integration);
  if (!oauth?.enabled) throw new Error("This MCP integration does not use OAuth.");

  let authorizationUrl = null;
  const provider = createMcpOAuthProvider(integration, {
    onAuthorizationUrl: (url) => {
      authorizationUrl = url.toString();
    },
  });
  const result = await auth(provider, { serverUrl: integration.config.url, scope: oauth.scope });

  return {
    result,
    authorizationUrl,
    message: authorizationUrl ? "Open the authorization URL to connect HubSpot." : "OAuth is already authorized.",
  };
}

export async function finishMcpOAuth(integration, authorizationCode) {
  const oauth = requireOAuthConfig(integration);
  if (!oauth?.enabled) throw new Error("This MCP integration does not use OAuth.");
  if (!authorizationCode) throw new Error("Missing OAuth authorization code.");

  const provider = createMcpOAuthProvider(integration);
  const result = await auth(provider, {
    serverUrl: integration.config.url,
    authorizationCode,
    scope: oauth.scope,
  });

  return { result, message: "OAuth authorization complete." };
}
