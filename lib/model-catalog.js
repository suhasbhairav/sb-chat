import {
  FALLBACK_CLAUDE_MODELS,
  FALLBACK_OPENAI_MODELS,
  FALLBACK_OPENROUTER_MODELS,
  FALLBACK_SARVAM_MODELS,
  FALLBACK_XAI_MODELS,
} from "@/lib/providers";

const OPENAI_PRICING_URL = "https://developers.openai.com/api/docs/pricing";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const ANTHROPIC_VERSION = "2023-06-01";
const FETCH_TIMEOUT_MS = 5000;

function uniqueById(models) {
  const seen = new Set();
  return models.filter((model) => {
    if (!model.id || seen.has(model.id)) return false;
    seen.add(model.id);
    return true;
  });
}

function isOpenAIApiModelId(id) {
  return /^(?:gpt-|o[0-9]|o[0-9]-|computer-use-|sora)/.test(id);
}

function extractOpenAIModelsFromPricing(html) {
  const ids = new Set();
  const modelPattern = /\b(?:gpt|o|computer-use|sora)[a-z0-9.-]*(?:-[a-z0-9.]+)*\b/gi;
  const matches = html.match(modelPattern) || [];

  matches.forEach((match) => {
    const id = match.toLowerCase();
    if (id.length < 2) return;
    if (id.includes("docs") || id.includes("guide")) return;
    if (!isOpenAIApiModelId(id)) return;
    ids.add(id);
  });

  return Array.from(ids)
    .sort()
    .map((id) => ({
      id,
      name: id,
      category: id.includes("realtime") ? "Realtime and audio" : "OpenAI",
      source: "OpenAI pricing page",
    }));
}

export async function getOpenAIModels() {
  try {
    const response = await fetch(OPENAI_PRICING_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const html = await response.text();
    const parsed = extractOpenAIModelsFromPricing(html);
    return {
      models: uniqueById([...parsed, ...FALLBACK_OPENAI_MODELS]),
      sourceUrl: OPENAI_PRICING_URL,
      sourceLabel: "OpenAI pricing page",
    };
  } catch {
    return {
      models: FALLBACK_OPENAI_MODELS,
      sourceUrl: OPENAI_PRICING_URL,
      sourceLabel: "OpenAI pricing page fallback",
    };
  }
}

export async function getOpenRouterModels() {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = await response.json();
    const models = (data.data || []).map((model) => ({
      id: model.id,
      name: model.name || model.id,
      category: model.architecture?.modality || model.context_length ? `${model.context_length || ""} context`.trim() : "OpenRouter",
      source: "OpenRouter models page",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_OPENROUTER_MODELS),
      sourceUrl: "https://openrouter.ai/models",
      sourceLabel: "OpenRouter models page",
    };
  } catch {
    return {
      models: FALLBACK_OPENROUTER_MODELS,
      sourceUrl: "https://openrouter.ai/models",
      sourceLabel: "OpenRouter models page fallback",
    };
  }
}

export async function getClaudeModels(baseUrl, apiKey = process.env.ANTHROPIC_API_KEY || "") {
  const cleanBaseUrl = String(baseUrl || "https://api.anthropic.com/v1").replace(/\/+$/, "");

  if (!apiKey) {
    return {
      models: FALLBACK_CLAUDE_MODELS,
      sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
      sourceLabel: "Claude models page fallback",
    };
  }

  try {
    const response = await fetch(`${cleanBaseUrl}/models?limit=1000`, {
      headers: {
        "anthropic-version": ANTHROPIC_VERSION,
        "x-api-key": apiKey,
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `Claude models failed with status ${response.status}.`);
    }

    const models = (data.data || []).map((model) => ({
      id: model.id,
      name: model.display_name || model.id,
      category: model.max_input_tokens ? `${model.max_input_tokens} context` : "Claude API",
      source: "Claude Models API",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_CLAUDE_MODELS),
      sourceUrl: `${cleanBaseUrl}/models`,
      sourceLabel: "Claude Models API",
    };
  } catch {
    return {
      models: FALLBACK_CLAUDE_MODELS,
      sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
      sourceLabel: "Claude models page fallback",
    };
  }
}

export async function getXAIModels(baseUrl, apiKey = process.env.XAI_API_KEY || "") {
  const cleanBaseUrl = String(baseUrl || "https://api.x.ai/v1").replace(/\/+$/, "");

  if (!apiKey) {
    return {
      models: FALLBACK_XAI_MODELS,
      sourceUrl: "https://docs.x.ai/developers/models",
      sourceLabel: "xAI models page fallback",
    };
  }

  try {
    const response = await fetch(`${cleanBaseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `xAI models failed with status ${response.status}.`);
    }

    const models = (data.data || data.models || []).map((model) => ({
      id: model.id,
      name: model.name || model.display_name || model.id,
      category: "xAI",
      source: "xAI Models API",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_XAI_MODELS),
      sourceUrl: `${cleanBaseUrl}/models`,
      sourceLabel: "xAI Models API",
    };
  } catch {
    return {
      models: FALLBACK_XAI_MODELS,
      sourceUrl: "https://docs.x.ai/developers/models",
      sourceLabel: "xAI models page fallback",
    };
  }
}

export async function getSarvamModels() {
  return {
    models: FALLBACK_SARVAM_MODELS,
    sourceUrl: "https://docs.sarvam.ai/api-reference/chat/chat-completions",
    sourceLabel: "Sarvam chat completions docs",
  };
}

export async function getOllamaModels(baseUrl) {
  const cleanBaseUrl = String(baseUrl || "http://localhost:11434").replace(/\/+$/, "");
  const response = await fetch(`${cleanBaseUrl}/api/tags`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  const data = await response.json();

  return {
    models: (data.models || []).map((model) => ({
      id: model.name,
      name: model.name,
      category: model.details?.family || "Ollama",
      source: "Ollama local tags",
    })),
    sourceUrl: `${cleanBaseUrl}/api/tags`,
    sourceLabel: "Ollama local tags",
  };
}
