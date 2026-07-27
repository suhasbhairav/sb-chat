import { authenticateApiKey, readApiManagementStore } from "@/lib/api-management-store";
import { json, resolveServerApiKey } from "@/lib/chat-request";
import { handleChatCompletionRequest } from "@/lib/api-completions";
import { callModel } from "@/lib/model-clients";
import { recordTokenUsage } from "@/lib/token-usage-store";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const payload = await request.json();
    const result = await handleChatCompletionRequest({
      authorization,
      payload,
      authenticateApiKey,
      readApiManagementStore,
      callModel,
      resolveServerApiKey,
      recordTokenUsage,
    });
    return json(result.body, result.status);
  } catch (error) {
    return json({ error: { message: error.message || "Batuk API request failed.", type: "api_error" } }, 500);
  }
}
