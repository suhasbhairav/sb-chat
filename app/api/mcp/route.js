import { MCP_CATALOG } from "@/lib/mcp-catalog";
import { callMcpTool, discoverMcpIntegration, readMcpResource } from "@/lib/mcp-client";
import { startMcpOAuth } from "@/lib/mcp-oauth";
import {
  deleteMcpIntegration,
  getActiveMcpIntegration,
  markMcpIntegrationFailed,
  publicMcpStoreView,
  readMcpStore,
  setActiveMcpIntegration,
  updateMcpDiscovery,
  upsertMcpIntegration,
} from "@/lib/mcp-store";
import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicResult(result) {
  return result?.store ? { ...result, store: publicMcpStoreView(result.store) } : result;
}

function requiresExplicitToolConfirmation(integration, toolName) {
  const required = integration?.config?.safety?.requireConfirmationForTools;
  return Array.isArray(required) && required.includes(toolName);
}

export async function GET() {
  const { response } = await requireServerPermission({ chat: ["read"] });
  if (response) return response;
  return json({ catalog: MCP_CATALOG, store: publicMcpStoreView(await readMcpStore()) });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { response } = await requireServerPermission({ chat: ["update"] });
    if (response) return response;

    if (body.action === "upsert") return json(publicResult(await upsertMcpIntegration(body.integration)));
    if (body.action === "delete") return json(publicResult(await deleteMcpIntegration(body.integrationId)));
    if (body.action === "setActive") return json(publicResult(await setActiveMcpIntegration(body.integrationId)));

    if (body.action === "startOAuth") {
      const integration = await getActiveMcpIntegration(body.integrationId);
      if (!integration) return json({ error: "MCP integration not found." }, 404);
      return json(await startMcpOAuth(integration));
    }

    if (body.action === "discover") {
      const integration = await getActiveMcpIntegration(body.integrationId);
      if (!integration) return json({ error: "MCP integration not found." }, 404);
      try {
        const discovery = await discoverMcpIntegration(integration);
        return json(publicResult(await updateMcpDiscovery(integration.id, discovery, discovery.errors?.join("; ") || "Connected.")));
      } catch (error) {
        return json(publicResult(await markMcpIntegrationFailed(integration.id, error.message || "MCP discovery failed.")));
      }
    }

    if (body.action === "callTool") {
      const integration = await getActiveMcpIntegration(body.integrationId);
      if (!integration) return json({ error: "MCP integration not found." }, 404);
      if (requiresExplicitToolConfirmation(integration, body.name) && body.confirmed !== true) {
        return json({
          error: `${body.name} can place an order, checkout, or create a booking. Confirm the final cart/booking details with the user and retry with confirmed: true.`,
        }, 409);
      }
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
