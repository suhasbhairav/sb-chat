import { authenticateApiKey, readApiManagementStore } from "@/lib/api-management-store";
import { json } from "@/lib/chat-request";
import { recordRequestAudit } from "@/lib/audit-utils";

export const runtime = "nodejs";

export async function GET(request) {
  const authorization = request.headers.get("authorization") || "";
  const auth = await authenticateApiKey(authorization);
  if (!auth) {
    await recordRequestAudit({ category: "access", action: "api.models.authentication_failed", outcome: "denied", statusCode: 401 });
    return json({ error: { message: "Invalid or revoked Batuk API key.", type: "authentication_error" } }, 401);
  }

  const store = await readApiManagementStore();
  if (store.settings?.enabled === false) {
    await recordRequestAudit({
      category: "access",
      action: "api.models.disabled",
      outcome: "denied",
      actor: { id: auth.key.userId, email: auth.key.userEmail, role: "api_key" },
      statusCode: 403,
    });
    return json({ error: { message: "Batuk API access is disabled.", type: "access_denied" } }, 403);
  }

  await recordRequestAudit({
    category: "model",
    action: "api.models.list",
    outcome: "success",
    actor: { id: auth.key.userId, email: auth.key.userEmail, role: "api_key" },
    metadata: { apiKeyId: auth.key.id, enabledRoutes: store.modelRoutes.filter((route) => route.enabled).length },
  });

  return json({
    object: "list",
    data: store.modelRoutes
      .filter((route) => route.enabled)
      .map((route) => ({
        id: route.id,
        object: "model",
        created: Math.floor(new Date(route.createdAt || Date.now()).getTime() / 1000),
        owned_by: "batuk",
      })),
  });
}
