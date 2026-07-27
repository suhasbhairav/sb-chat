import { authenticateApiKey, readApiManagementStore } from "@/lib/api-management-store";
import { json } from "@/lib/chat-request";

export const runtime = "nodejs";

export async function GET(request) {
  const authorization = request.headers.get("authorization") || "";
  const auth = await authenticateApiKey(authorization);
  if (!auth) return json({ error: { message: "Invalid or revoked Batuk API key.", type: "authentication_error" } }, 401);

  const store = await readApiManagementStore();
  if (store.settings?.enabled === false) {
    return json({ error: { message: "Batuk API access is disabled.", type: "access_denied" } }, 403);
  }

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
