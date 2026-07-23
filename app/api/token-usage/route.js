import { json } from "@/lib/chat-request";
import { requireServerSession } from "@/lib/auth-session";
import { readTokenUsageStore, summarizeTokenUsage } from "@/lib/token-usage-store";

export async function GET() {
  const { response } = await requireServerSession();
  if (response) return response;

  const store = await readTokenUsageStore();
  return json({
    ...store,
    summary: summarizeTokenUsage(store.events),
  });
}
