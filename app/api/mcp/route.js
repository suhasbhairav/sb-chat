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
import { recordRequestAudit, summarizeObject } from "@/lib/audit-utils";

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
    const { session, response } = await requireServerPermission({ chat: ["update"] });
    if (response) return response;

    if (body.action === "upsert") {
      const result = publicResult(await upsertMcpIntegration(body.integration));
      await recordRequestAudit({ category: "integration", action: "mcp.integration.upsert", outcome: "success", actor: session.user, target: { type: "mcp_integration", id: body.integration?.id || result.integration?.id }, metadata: { input: summarizeObject(body.integration), result: summarizeObject(result) } });
      return json(result);
    }
    if (body.action === "delete") {
      const result = publicResult(await deleteMcpIntegration(body.integrationId));
      await recordRequestAudit({ category: "integration", action: "mcp.integration.delete", outcome: "success", actor: session.user, target: { type: "mcp_integration", id: body.integrationId }, metadata: { result: summarizeObject(result) } });
      return json(result);
    }
    if (body.action === "setActive") {
      const result = publicResult(await setActiveMcpIntegration(body.integrationId));
      await recordRequestAudit({ category: "integration", action: "mcp.integration.set_active", outcome: "success", actor: session.user, target: { type: "mcp_integration", id: body.integrationId }, metadata: { result: summarizeObject(result) } });
      return json(result);
    }

    if (body.action === "startOAuth") {
      const integration = await getActiveMcpIntegration(body.integrationId);
      if (!integration) return json({ error: "MCP integration not found." }, 404);
      const result = await startMcpOAuth(integration);
      await recordRequestAudit({ category: "access", action: "mcp.oauth.start", outcome: "success", actor: session.user, target: { type: "mcp_integration", id: integration.id }, metadata: { provider: integration.provider || integration.name, result: summarizeObject(result) } });
      return json(result);
    }

    if (body.action === "discover") {
      const integration = await getActiveMcpIntegration(body.integrationId);
      if (!integration) return json({ error: "MCP integration not found." }, 404);
      try {
        const discovery = await discoverMcpIntegration(integration);
        const result = publicResult(await updateMcpDiscovery(integration.id, discovery, discovery.errors?.join("; ") || "Connected."));
        await recordRequestAudit({ category: "integration", action: "mcp.discovery.update", outcome: "success", actor: session.user, target: { type: "mcp_integration", id: integration.id }, metadata: { tools: discovery.tools?.length || 0, resources: discovery.resources?.length || 0, prompts: discovery.prompts?.length || 0, errors: discovery.errors || [] } });
        return json(result);
      } catch (error) {
        const result = publicResult(await markMcpIntegrationFailed(integration.id, error.message || "MCP discovery failed."));
        await recordRequestAudit({ category: "integration", action: "mcp.discovery.update", outcome: "failure", actor: session.user, target: { type: "mcp_integration", id: integration.id }, metadata: { error: error.message || "MCP discovery failed." } });
        return json(result);
      }
    }

    if (body.action === "callTool") {
      const integration = await getActiveMcpIntegration(body.integrationId);
      if (!integration) return json({ error: "MCP integration not found." }, 404);
      if (requiresExplicitToolConfirmation(integration, body.name) && body.confirmed !== true) {
        await recordRequestAudit({ category: "integration", action: "mcp.tool.confirmation_required", outcome: "denied", actor: session.user, target: { type: "mcp_tool", id: body.name }, statusCode: 409, metadata: { integrationId: integration.id, arguments: summarizeObject(body.arguments || {}) } });
        return json({
          error: `${body.name} can place an order, checkout, or create a booking. Confirm the final cart/booking details with the user and retry with confirmed: true.`,
        }, 409);
      }
      const result = await callMcpTool(integration, body.name, body.arguments || {});
      await recordRequestAudit({ category: "integration", action: "mcp.tool.call", outcome: "success", actor: session.user, target: { type: "mcp_tool", id: body.name }, metadata: { integrationId: integration.id, arguments: summarizeObject(body.arguments || {}), result: summarizeObject(result) } });
      return json({ result });
    }

    if (body.action === "readResource") {
      const integration = await getActiveMcpIntegration(body.integrationId);
      if (!integration) return json({ error: "MCP integration not found." }, 404);
      const result = await readMcpResource(integration, body.uri);
      await recordRequestAudit({ category: "integration", action: "mcp.resource.read", outcome: "success", actor: session.user, target: { type: "mcp_resource", id: body.uri }, metadata: { integrationId: integration.id, result: summarizeObject(result) } });
      return json({ result });
    }

    await recordRequestAudit({ category: "integration", action: body.action || "unsupported", outcome: "failure", actor: session.user, statusCode: 400, metadata: { reason: "Unsupported MCP action" } });
    return json({ error: "Unsupported MCP action." }, 400);
  } catch (error) {
    return json({ error: error.message || "MCP action failed." }, 500);
  }
}
