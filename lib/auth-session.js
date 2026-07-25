import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { roleAllows } from "@/lib/auth-permissions";
import { json } from "@/lib/chat-request";
import { recordAuditEvent } from "@/lib/compliance-store";
import { resolveProductDataScope, setProductDataScope } from "@/lib/product-data-store";

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireServerSession() {
  const headerList = await headers();
  const session = await getServerSession();

  if (!session?.user) {
    await recordAuditEvent({
      category: "access",
      action: "session.required",
      outcome: "denied",
      ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip"),
      userAgent: headerList.get("user-agent"),
    }).catch(() => {});
    return {
      session: null,
      response: json({ error: "Authentication required." }, 401),
    };
  }

  setProductDataScope(resolveProductDataScope(session));
  return { session, response: null };
}

export async function requireServerPermission(permissions) {
  const { session, response } = await requireServerSession();
  if (response) return { session, response };

  const role = session.user?.role || "user";
  if (!roleAllows(role, permissions)) {
    const headerList = await headers();
    await recordAuditEvent({
      category: "access",
      action: "permission.denied",
      outcome: "denied",
      actor: session.user,
      ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip"),
      userAgent: headerList.get("user-agent"),
      metadata: { permissions },
    }).catch(() => {});
    return {
      session,
      response: json({ error: "You do not have permission to perform this action." }, 403),
    };
  }

  return { session, response: null };
}
