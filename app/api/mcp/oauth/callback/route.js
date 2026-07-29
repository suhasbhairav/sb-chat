import { discoverMcpIntegration } from "@/lib/mcp-client";
import { finishMcpOAuth } from "@/lib/mcp-oauth";
import { readMcpStore, updateMcpDiscovery, markMcpIntegrationFailed } from "@/lib/mcp-store";
import { requireServerPermission } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function html(message, detail = "") {
  return new Response(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Batuk MCP OAuth</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f7f8fb; color: #111827; }
      main { max-width: 560px; padding: 32px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fff; box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12); }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p { line-height: 1.6; color: #4b5563; }
      code { display: block; padding: 12px; border-radius: 10px; background: #f3f4f6; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <main>
      <h1>${message}</h1>
      ${detail ? `<p>${detail}</p>` : ""}
      <p>You can return to Batuk, open MCP integrations, and click Discover if the tools have not appeared yet.</p>
    </main>
  </body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request) {
  const { response } = await requireServerPermission({ chat: ["update"] });
  if (response) return response;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return html("HubSpot OAuth was not completed.", errorDescription || error);
  }
  if (!code || !state) {
    return html("Missing OAuth callback details.", "HubSpot did not return both code and state.");
  }

  const store = await readMcpStore();
  const integration = store.integrations.find((item) => item.id === state);
  if (!integration) {
    return html("MCP integration not found.", "The OAuth state did not match a saved Batuk MCP integration.");
  }

  try {
    await finishMcpOAuth(integration, code);
    const refreshedStore = await readMcpStore();
    const refreshedIntegration = refreshedStore.integrations.find((item) => item.id === state) || integration;
    const discovery = await discoverMcpIntegration(refreshedIntegration);
    await updateMcpDiscovery(refreshedIntegration.id, discovery, discovery.errors?.join("; ") || "HubSpot OAuth connected.");
    return html("HubSpot MCP connected.", "Batuk saved the OAuth tokens and discovered the HubSpot MCP tools.");
  } catch (callbackError) {
    await markMcpIntegrationFailed(integration.id, callbackError.message || "HubSpot OAuth callback failed.");
    return html("HubSpot MCP connection failed.", callbackError.message || "OAuth callback failed.");
  }
}
