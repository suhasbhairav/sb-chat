import { json } from "@/lib/chat-request";
import { requireServerSession } from "@/lib/auth-session";
import { getClaudeModels, getOllamaModels, getOpenAIModels, getOpenRouterModels, getSarvamModels, getXAIModels } from "@/lib/model-catalog";

export async function GET(request) {
  const { response } = await requireServerSession();
  if (response) return response;

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") || "openai";
  const baseUrl = url.searchParams.get("baseUrl");

  try {
    if (provider === "openai") {
      return json(await getOpenAIModels());
    }

    if (provider === "openrouter") {
      return json(await getOpenRouterModels());
    }

    if (provider === "anthropic") {
      return json(await getClaudeModels(baseUrl));
    }

    if (provider === "xai") {
      return json(await getXAIModels(baseUrl));
    }

    if (provider === "sarvam") {
      return json(await getSarvamModels());
    }

    if (provider === "ollama") {
      return json(await getOllamaModels(baseUrl));
    }

    return json({ models: [], sourceLabel: "Manual model entry", sourceUrl: null });
  } catch (error) {
    return json({ error: error.message || "Could not load model catalog." }, 500);
  }
}
