import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { readTokenUsageStore, resetTokenUsageStore, summarizeTokenUsage } from "@/lib/token-usage-store";

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
  const { response } = await requireServerPermission({ usage: ["reset"] });
  if (response) return response;

  const store = await resetTokenUsageStore();
  return json(store);
}
