import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { getBedrockModels, getClaudeModels, getDeepInfraModels, getDeepSeekModels, getEdenAIModels, getKimiModels, getMistralModels, getOllamaModels, getOpenAIModels, getOpenRouterModels, getPerplexityModels, getQwenModels, getSarvamModels, getTogetherModels, getXAIModels } from "@/lib/model-catalog";

export async function GET(request) {
  const { response } = await requireServerPermission({ model: ["read"] });
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

    if (provider === "together") {
      return json(await getTogetherModels(baseUrl));
    }

    if (provider === "perplexity") {
      return json(await getPerplexityModels());
    }

    if (provider === "mistral") {
      return json(await getMistralModels(baseUrl));
    }

    if (provider === "kimi") {
      return json(await getKimiModels(baseUrl));
    }

    if (provider === "deepseek") {
      return json(await getDeepSeekModels(baseUrl));
    }

    if (provider === "qwen") {
      return json(await getQwenModels(baseUrl));
    }

    if (provider === "edenai") {
      return json(await getEdenAIModels(baseUrl));
    }

    if (provider === "deepinfra") {
      return json(await getDeepInfraModels(baseUrl));
    }

    if (provider === "anthropic") {
      return json(await getClaudeModels(baseUrl));
    }

    if (provider === "bedrock") {
      return json(await getBedrockModels(baseUrl));
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
