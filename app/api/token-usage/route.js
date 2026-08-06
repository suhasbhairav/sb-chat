import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { readTokenUsageStore, resetTokenUsageStore, summarizeTokenUsage } from "@/lib/token-usage-store";
import { recordRequestAudit } from "@/lib/audit-utils";

export async function GET() {
  const { response } = await requireServerPermission({ usage: ["read"] });
  if (response) return response;

  const store = await readTokenUsageStore();
  return json({
    ...store,
    summary: summarizeTokenUsage(store.events),
  });
}

export async function DELETE() {
  const { session, response } = await requireServerPermission({ usage: ["reset"] });
  if (response) return response;

  const store = await resetTokenUsageStore();
  await recordRequestAudit({
    category: "usage",
    action: "token_usage.reset",
    outcome: "success",
    actor: session.user,
    metadata: { retainedEvents: store.events?.length || 0 },
  });
  return json(store);
}
