import { requireServerSession } from "@/lib/auth-session";
import { json } from "@/lib/chat-request";
import { roleAllows } from "@/lib/auth-permissions";
import {
  createUserApiKey,
  deleteModelRoute,
  publicApiManagementView,
  readApiManagementStore,
  revokeApiKey,
  revokeUserApiAccess,
  upsertModelRoute,
} from "@/lib/api-management-store";
import { recordAuditEvent } from "@/lib/compliance-store";

export const runtime = "nodejs";

function isAdmin(session) {
  return roleAllows(session?.user?.role || "user", { user: ["list"] });
}

export async function GET() {
  const { session, response } = await requireServerSession();
  if (response) return response;
  const store = await readApiManagementStore();
  return json(publicApiManagementView(store, { userId: session.user.id, isAdmin: isAdmin(session) }));
}

export async function POST(request) {
  try {
    const { session, response } = await requireServerSession();
    if (response) return response;
    const body = await request.json();
    const admin = isAdmin(session);

    if (body.action === "createKey") {
      const result = await createUserApiKey({
        userId: session.user.id,
        userEmail: session.user.email,
        name: body.name,
      });
      await recordAuditEvent({
        category: "admin",
        action: "api.key.create",
        outcome: "success",
        actor: session.user,
        target: { type: "api_key", id: result.key.id },
      }).catch(() => {});
      return json({
        key: result.key,
        management: publicApiManagementView(result.store, { userId: session.user.id, isAdmin: admin }),
      });
    }

    if (body.action === "revokeKey") {
      const store = await revokeApiKey({
        keyId: body.keyId,
        userId: session.user.id,
        revokedBy: session.user.id,
        admin,
      });
      await recordAuditEvent({
        category: "admin",
        action: "api.key.revoke",
        outcome: "success",
        actor: session.user,
        target: { type: "api_key", id: body.keyId },
      }).catch(() => {});
      return json({ management: publicApiManagementView(store, { userId: session.user.id, isAdmin: admin }) });
    }

    if (body.action === "revokeUserApiAccess") {
      if (!admin) return json({ error: "Only admins can revoke user API access." }, 403);
      const result = await revokeUserApiAccess({
        targetUserId: body.userId,
        revokedBy: session.user.id,
      });
      await recordAuditEvent({
        category: "admin",
        action: "api.user_access.revoke",
        outcome: "success",
        actor: session.user,
        target: { type: "user", id: body.userId },
        metadata: { revokedKeys: result.count },
      }).catch(() => {});
      return json({ management: publicApiManagementView(result.store, { userId: session.user.id, isAdmin: true }) });
    }

    if (body.action === "upsertModelRoute") {
      if (!admin) return json({ error: "Only admins can manage API models." }, 403);
      const store = await upsertModelRoute(body.route || {});
      await recordAuditEvent({
        category: "admin",
        action: "api.model.upsert",
        outcome: "success",
        actor: session.user,
        target: { type: "api_model", id: body.route?.id || body.route?.model },
      }).catch(() => {});
      return json({ management: publicApiManagementView(store, { userId: session.user.id, isAdmin: true }) });
    }

    if (body.action === "deleteModelRoute") {
      if (!admin) return json({ error: "Only admins can manage API models." }, 403);
      const store = await deleteModelRoute(body.routeId);
      await recordAuditEvent({
        category: "admin",
        action: "api.model.delete",
        outcome: "success",
        actor: session.user,
        target: { type: "api_model", id: body.routeId },
      }).catch(() => {});
      return json({ management: publicApiManagementView(store, { userId: session.user.id, isAdmin: true }) });
    }

    return json({ error: "Unsupported API management action." }, 400);
  } catch (error) {
    return json({ error: error.message || "API management action failed." }, 500);
  }
}
