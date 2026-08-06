import { authenticateApiKey, readApiManagementStore } from "@/lib/api-management-store";
import { json, resolveServerApiKey } from "@/lib/chat-request";
import { handlePerplexitySearchRequest } from "@/lib/api-search";
import { callPerplexitySearch } from "@/lib/model-clients";
import { recordTokenUsage } from "@/lib/token-usage-store";
import { recordAuditEvent } from "@/lib/compliance-store";
import { requestAuditContext } from "@/lib/audit-utils";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const payload = await request.json();
    const result = await handlePerplexitySearchRequest({
      authorization,
      payload,
      authenticateApiKey,
      readApiManagementStore,
      callPerplexitySearch,
      resolveServerApiKey,
      recordTokenUsage,
      recordAuditEvent,
      auditContext: await requestAuditContext(),
    });
    return json(result.body, result.status);
  } catch (error) {
    return json({ error: { message: error.message || "Batuk Search API request failed.", type: "api_error" } }, 500);
  }
}
