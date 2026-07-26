import { MCP_CATALOG } from "@/lib/mcp-catalog";
import { callMcpTool, discoverMcpIntegration, readMcpResource } from "@/lib/mcp-client";
import {
  deleteMcpIntegration,
  getActiveMcpIntegration,
  markMcpIntegrationFailed,
  readMcpStore,
  setActiveMcpIntegration,
  updateMcpDiscovery,
  upsertMcpIntegration,
} from "@/lib/mcp-store";
import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireServerPermission({ chat: ["read"] });
  if (response) return response;
  return json({ catalog: MCP_CATALOG, store: await readMcpStore() });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { response } = await requireServerPermission({ chat: ["update"] });
    if (response) return response;

    if (body.action === "upsert") return json(await upsertMcpIntegration(body.integration));
    if (body.action === "delete") return json(await deleteMcpIntegration(body.integrationId));
    if (body.action === "setActive") return json(await setActiveMcpIntegration(body.integrationId));

    if (body.action === "discover") {
      const integration = await getActiveMcpIntegration(body.integrationId);
      if (!integration) return json({ error: "MCP integration not found." }, 404);
      try {
        const discovery = await discoverMcpIntegration(integration);
        return json(await updateMcpDiscovery(integration.id, discovery, discovery.errors?.join("; ") || "Connected."));
      } catch (error) {
        return json(await markMcpIntegrationFailed(integration.id, error.message || "MCP discovery failed."));
      }
    }

    if (body.action === "callTool") {
      const integration = await getActiveMcpIntegration(body.integrationId);
      if (!integration) return json({ error: "MCP integration not found." }, 404);
      return json({ result: await callMcpTool(integration, body.name, body.arguments || {}) });
    }

    if (body.action === "readResource") {
      const integration = await getActiveMcpIntegration(body.integrationId);
      if (!integration) return json({ error: "MCP integration not found." }, 404);
      return json({ result: await readMcpResource(integration, body.uri) });
    }

    return json({ error: "Unsupported MCP action." }, 400);
  } catch (error) {
    return json({ error: error.message || "MCP action failed." }, 500);
  }
}
