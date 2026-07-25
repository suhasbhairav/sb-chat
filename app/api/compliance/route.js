import { headers } from "next/headers";
import { json } from "@/lib/chat-request";
import { requireServerPermission, requireServerSession } from "@/lib/auth-session";
import {
  createDataRequest,
  eraseLocalUserData,
  exportUserData,
  readComplianceStore,
  recordAuditEvent,
  summarizeCompliance,
  updateControlStatus,
} from "@/lib/compliance-store";

export const runtime = "nodejs";

function clientContext(headerList) {
  return {
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || null,
    userAgent: headerList.get("user-agent") || null,
  };
}

function attachment(payload, filename, contentType = "application/json") {
  return new Response(typeof payload === "string" ? payload : `${JSON.stringify(payload, null, 2)}\n`, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": contentType,
    },
  });
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function auditCsv(events) {
  const header = ["createdAt", "category", "action", "outcome", "actorId", "role", "targetType", "targetId", "integrityHash"];
  const rows = events.map((event) =>
    [
      event.createdAt,
      event.category,
      event.action,
      event.outcome,
      event.actor?.id,
      event.actor?.role,
      event.target?.type,
      event.target?.id,
      event.integrityHash,
    ].map(csvEscape).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export async function GET(request) {
  const { response } = await requireServerPermission({ user: ["list"] });
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const store = await readComplianceStore();

  if (searchParams.get("export") === "audit") {
    return attachment(auditCsv(store.auditEvents), `batuk-audit-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
  }

  return json({
    settings: store.settings,
    controls: store.controls,
    dataInventory: store.dataInventory,
    dataRequests: store.dataRequests,
    auditEvents: store.auditEvents.slice(0, 250),
    summary: summarizeCompliance(store),
  });
}

export async function POST(request) {
  const headerList = await headers();
  const body = await request.json().catch(() => ({}));

  if (body.action === "exportMyData" || body.action === "createDataRequest" || body.action === "eraseMyLocalData") {
    const { session, response } = await requireServerSession();
    if (response) return response;
    const context = clientContext(headerList);

    if (body.action === "exportMyData") {
      const payload = await exportUserData(session);
      return attachment(payload, `batuk-user-data-${session.user.id}.json`);
    }

    if (body.action === "eraseMyLocalData") {
      const result = await eraseLocalUserData(session);
      return json(result);
    }

    const requestRecord = await createDataRequest({
      session,
      type: body.type,
      notes: body.notes,
    });
    await recordAuditEvent({
      category: "privacy",
      action: "gdpr.request.created",
      outcome: "success",
      actor: session.user,
      target: { type: "dataRequest", id: requestRecord.id },
      ...context,
    });
    return json({ request: requestRecord });
  }

  const { session, response } = await requireServerPermission({ user: ["update"] });
  if (response) return response;
  const context = clientContext(headerList);

  if (body.action === "updateControl") {
    const control = await updateControlStatus({
      controlId: body.controlId,
      status: body.status,
      notes: body.notes,
      session,
    });
    return json({ control, store: await readComplianceStore() });
  }

  await recordAuditEvent({
    category: "compliance",
    action: body.action || "unsupported",
    outcome: "failure",
    actor: session.user,
    metadata: { reason: "Unsupported compliance action" },
    ...context,
  });
  return json({ error: "Unsupported compliance action." }, 400);
}
