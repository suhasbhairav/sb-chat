import { buildSafeMessages, screenMessages } from "@/lib/guardrails";
import { normalizeTemperatureForModel } from "@/lib/model-compatibility";
import { normalizeBaseUrl } from "@/lib/model-clients";

export function json(data, status = 200) {
  return Response.json(data, { status });
}

export function validateChatPayload(payload) {
  if (!payload || typeof payload !== "object") return "Missing request body.";
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) return "Add at least one message.";
  if (!String(payload.model || "").trim()) return "Choose a model.";
  if (!String(payload.baseUrl || "").trim()) return "Choose a base URL.";
  if (payload.provider === "openai" && !resolveServerApiKey(payload.provider, payload.apiKey)) {
    return "OpenAI needs an API key. Add OPENAI_API_KEY to .env or enter a key in Settings.";
  }
  if (payload.provider === "openrouter" && !resolveServerApiKey(payload.provider, payload.apiKey)) {
    return "OpenRouter needs an API key. Add OPENROUTER_API_KEY to .env or enter an OpenRouter key in Settings.";
  }
  if (payload.provider === "together" && !resolveServerApiKey(payload.provider, payload.apiKey)) {
    return "Together AI needs an API key. Add TOGETHER_API_KEY to .env or enter a Together key in Settings.";
  }
  if (payload.provider === "perplexity" && !resolveServerApiKey(payload.provider, payload.apiKey)) {
    return "Perplexity needs an API key. Add PERPLEXITY_API_KEY to .env or enter a Perplexity key in Settings.";
  }
  if (payload.provider === "mistral" && !resolveServerApiKey(payload.provider, payload.apiKey)) {
    return "Mistral AI needs an API key. Add MISTRAL_API_KEY to .env or enter a Mistral key in Settings.";
  }
  if (payload.provider === "kimi" && !resolveServerApiKey(payload.provider, payload.apiKey)) {
    return "Kimi needs an API key. Add MOONSHOT_API_KEY to .env or enter a Kimi key in Settings.";
  }
  if (payload.provider === "deepseek" && !resolveServerApiKey(payload.provider, payload.apiKey)) {
    return "DeepSeek needs an API key. Add DEEPSEEK_API_KEY to .env or enter a DeepSeek key in Settings.";
  }
  if (payload.provider === "qwen" && !resolveServerApiKey(payload.provider, payload.apiKey)) {
    return "Qwen needs an API key. Add DASHSCOPE_API_KEY to .env or enter a Qwen key in Settings.";
  }
  if (payload.provider === "anthropic" && !resolveServerApiKey(payload.provider, payload.apiKey)) {
    return "Claude needs an API key. Add ANTHROPIC_API_KEY to .env or enter a Claude key in Settings.";
  }
  if (payload.provider === "xai" && !resolveServerApiKey(payload.provider, payload.apiKey)) {
    return "Grok needs an API key. Add XAI_API_KEY to .env or enter an xAI key in Settings.";
  }
  if (payload.provider === "sarvam" && !resolveServerApiKey(payload.provider, payload.apiKey)) {
    return "Sarvam AI needs an API key. Add SARVAM_API_KEY to .env or enter a Sarvam key in Settings.";
  }
  return null;
}

export function resolveServerApiKey(provider, apiKey) {
  const requestKey = String(apiKey || "").trim();
  if (requestKey) return requestKey;

  if (provider === "openai") {
    return process.env.OPENAI_API_KEY || "";
  }

  if (provider === "openrouter") {
    return process.env.OPENROUTER_API_KEY || "";
  }

  if (provider === "together") {
    return process.env.TOGETHER_API_KEY || "";
  }

  if (provider === "perplexity") {
    return process.env.PERPLEXITY_API_KEY || "";
  }

  if (provider === "mistral") {
    return process.env.MISTRAL_API_KEY || "";
  }

  if (provider === "kimi") {
    return process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY || "";
  }

  if (provider === "deepseek") {
    return process.env.DEEPSEEK_API_KEY || "";
  }

  if (provider === "qwen") {
    return process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || "";
  }

  if (provider === "anthropic") {
    return process.env.ANTHROPIC_API_KEY || "";
  }

  if (provider === "xai") {
    return process.env.XAI_API_KEY || "";
  }

  if (provider === "sarvam") {
    return process.env.SARVAM_API_KEY || process.env.SARVAMAI_API_KEY || "";
  }

  return "";
}

export function prepareChatRequest(payload) {
  const provider = payload.provider || "ollama";
  const guardrails = Boolean(payload.guardrails);
  const screened = guardrails ? screenMessages(payload.messages) : { blocked: false, reason: null };
  const model = String(payload.model).trim();
  const temperature = normalizeTemperatureForModel(provider, model, payload.temperature);

  return {
    provider,
    guardrails,
    webSearch: Boolean(payload.webSearch && provider === "openai"),
    documentChat: Boolean(payload.documentChat),
    screened,
    model,
    baseUrl: normalizeBaseUrl(payload.baseUrl),
    apiKey: resolveServerApiKey(provider, payload.apiKey),
    temperature,
    messages: buildSafeMessages(payload.messages, guardrails),
  };
}
