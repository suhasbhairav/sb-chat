import {
  FALLBACK_BEDROCK_MODELS,
  FALLBACK_CLAUDE_MODELS,
  FALLBACK_DEEPSEEK_MODELS,
  FALLBACK_DEEPINFRA_MODELS,
  FALLBACK_EDENAI_MODELS,
  FALLBACK_KIMI_MODELS,
  FALLBACK_MISTRAL_MODELS,
  FALLBACK_OPENAI_MODELS,
  FALLBACK_ORCAROUTER_MODELS,
  FALLBACK_OPENROUTER_MODELS,
  FALLBACK_PERPLEXITY_MODELS,
  FALLBACK_QWEN_MODELS,
  FALLBACK_SARVAM_MODELS,
  FALLBACK_TOGETHER_MODELS,
  FALLBACK_VELONA_MODELS,
  FALLBACK_XAI_MODELS,
} from "@/lib/providers";
import { BedrockClient, ListFoundationModelsCommand } from "@aws-sdk/client-bedrock";

const OPENAI_PRICING_URL = "https://developers.openai.com/api/docs/pricing";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const ORCAROUTER_MODELS_URL = "https://api.orcarouter.ai/v1/models";
const VELONA_MODELS_URL = "http://www.velona.in/gateway/v1/models";
const TOGETHER_MODELS_URL = "https://api.together.ai/v1/models";
const MISTRAL_MODELS_URL = "https://api.mistral.ai/v1/models";
const KIMI_MODELS_URL = "https://api.moonshot.ai/v1/models";
const DEEPSEEK_MODELS_URL = "https://api.deepseek.com/models";
const QWEN_MODELS_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models";
const EDENAI_MODELS_URL = "https://app.edenai.run/models";
const DEEPINFRA_MODELS_URL = "https://deepinfra.com/models";
const ANTHROPIC_VERSION = "2023-06-01";
const FETCH_TIMEOUT_MS = 5000;

function bedrockRegion(baseUrl) {
  return String(baseUrl || process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1").trim();
}

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

export async function getOrcaRouterModels(baseUrl, apiKey = process.env.ORCAROUTER_API_KEY || process.env.ORCA_ROUTER_API_KEY || "") {
  const cleanBaseUrl = String(baseUrl || "https://api.orcarouter.ai/v1").replace(/\/+$/, "");

  if (!apiKey) {
    return {
      models: FALLBACK_ORCAROUTER_MODELS,
      sourceUrl: "https://docs.orcarouter.ai/getting-started/quickstart",
      sourceLabel: "OrcaRouter quickstart fallback",
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
      throw new Error(data.error?.message || data.message || `OrcaRouter models failed with status ${response.status}.`);
    }

    const models = (data.data || data.models || []).map((model) => ({
      id: model.id || model.model || model.name,
      name: model.name || model.display_name || model.id || model.model,
      category: model.owned_by || model.provider || "OrcaRouter",
      source: "OrcaRouter Models API",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_ORCAROUTER_MODELS),
      sourceUrl: `${cleanBaseUrl}/models`,
      sourceLabel: "OrcaRouter Models API",
    };
  } catch {
    return {
      models: FALLBACK_ORCAROUTER_MODELS,
      sourceUrl: ORCAROUTER_MODELS_URL,
      sourceLabel: "OrcaRouter quickstart fallback",
    };
  }
}

export async function getVelonaModels(baseUrl, apiKey = process.env.VELONA_API_KEY || "") {
  const cleanBaseUrl = String(baseUrl || "http://www.velona.in/gateway/v1").replace(/\/+$/, "");

  if (!apiKey) {
    return {
      models: FALLBACK_VELONA_MODELS,
      sourceUrl: "https://velona.in/docs",
      sourceLabel: "Velona docs fallback",
    };
  }

  try {
    const response = await fetch(`${cleanBaseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 7200 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || `Velona models failed with status ${response.status}.`);
    }

    const models = (data.data?.models || data.models || data.data || []).map((model) => ({
      id: model.id || model.model || model.name,
      name: model.name || model.display_name || model.id || model.model,
      category: model.type || model.provider || "Velona",
      source: "Velona Models API",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_VELONA_MODELS),
      sourceUrl: `${cleanBaseUrl}/models`,
      sourceLabel: "Velona Models API",
    };
  } catch {
    return {
      models: FALLBACK_VELONA_MODELS,
      sourceUrl: VELONA_MODELS_URL,
      sourceLabel: "Velona docs fallback",
    };
  }
}

export async function getTogetherModels(baseUrl, apiKey = process.env.TOGETHER_API_KEY || "") {
  const cleanBaseUrl = String(baseUrl || "https://api.together.ai/v1").replace(/\/+$/, "");

  if (!apiKey) {
    return {
      models: FALLBACK_TOGETHER_MODELS,
      sourceUrl: "https://docs.together.ai/docs/serverless-models",
      sourceLabel: "Together model catalog fallback",
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
      throw new Error(data.error?.message || `Together models failed with status ${response.status}.`);
    }

    const models = (Array.isArray(data) ? data : data.data || []).map((model) => ({
      id: model.id,
      name: model.display_name || model.name || model.id,
      category: model.type || model.organization || "Together AI",
      source: "Together Models API",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_TOGETHER_MODELS),
      sourceUrl: `${cleanBaseUrl}/models`,
      sourceLabel: "Together Models API",
    };
  } catch {
    return {
      models: FALLBACK_TOGETHER_MODELS,
      sourceUrl: TOGETHER_MODELS_URL,
      sourceLabel: "Together model catalog fallback",
    };
  }
}

export async function getPerplexityModels() {
  return {
    models: FALLBACK_PERPLEXITY_MODELS,
    sourceUrl: "https://docs.perplexity.ai/docs/sonar/openai-compatibility",
    sourceLabel: "Perplexity Sonar docs",
  };
}

export async function getMistralModels(baseUrl, apiKey = process.env.MISTRAL_API_KEY || "") {
  const cleanBaseUrl = String(baseUrl || "https://api.mistral.ai/v1").replace(/\/+$/, "");

  if (!apiKey) {
    return {
      models: FALLBACK_MISTRAL_MODELS,
      sourceUrl: "https://docs.mistral.ai/models/overview",
      sourceLabel: "Mistral models overview fallback",
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
      throw new Error(data.error?.message || `Mistral models failed with status ${response.status}.`);
    }

    const models = (data.data || data.models || []).map((model) => ({
      id: model.id,
      name: model.name || model.display_name || model.id,
      category: model.capabilities?.completion_chat ? "Mistral chat" : model.owned_by || "Mistral AI",
      source: "Mistral Models API",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_MISTRAL_MODELS),
      sourceUrl: `${cleanBaseUrl}/models`,
      sourceLabel: "Mistral Models API",
    };
  } catch {
    return {
      models: FALLBACK_MISTRAL_MODELS,
      sourceUrl: MISTRAL_MODELS_URL,
      sourceLabel: "Mistral models overview fallback",
    };
  }
}

export async function getKimiModels(baseUrl, apiKey = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY || "") {
  const cleanBaseUrl = String(baseUrl || "https://api.moonshot.ai/v1").replace(/\/+$/, "");

  if (!apiKey) {
    return {
      models: FALLBACK_KIMI_MODELS,
      sourceUrl: "https://platform.kimi.ai/docs/model-list",
      sourceLabel: "Kimi model list fallback",
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
      throw new Error(data.error?.message || `Kimi models failed with status ${response.status}.`);
    }

    const models = (data.data || data.models || []).map((model) => ({
      id: model.id,
      name: model.name || model.display_name || model.id,
      category: model.owned_by || "Kimi",
      source: "Kimi Models API",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_KIMI_MODELS),
      sourceUrl: `${cleanBaseUrl}/models`,
      sourceLabel: "Kimi Models API",
    };
  } catch {
    return {
      models: FALLBACK_KIMI_MODELS,
      sourceUrl: KIMI_MODELS_URL,
      sourceLabel: "Kimi model list fallback",
    };
  }
}

export async function getDeepSeekModels(baseUrl, apiKey = process.env.DEEPSEEK_API_KEY || "") {
  const cleanBaseUrl = String(baseUrl || "https://api.deepseek.com").replace(/\/+$/, "");

  if (!apiKey) {
    return {
      models: FALLBACK_DEEPSEEK_MODELS,
      sourceUrl: "https://api-docs.deepseek.com/",
      sourceLabel: "DeepSeek quick start fallback",
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
      throw new Error(data.error?.message || `DeepSeek models failed with status ${response.status}.`);
    }

    const models = (data.data || data.models || []).map((model) => ({
      id: model.id,
      name: model.name || model.display_name || model.id,
      category: model.owned_by || "DeepSeek",
      source: "DeepSeek Models API",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_DEEPSEEK_MODELS),
      sourceUrl: `${cleanBaseUrl}/models`,
      sourceLabel: "DeepSeek Models API",
    };
  } catch {
    return {
      models: FALLBACK_DEEPSEEK_MODELS,
      sourceUrl: DEEPSEEK_MODELS_URL,
      sourceLabel: "DeepSeek quick start fallback",
    };
  }
}

export async function getQwenModels(baseUrl, apiKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || "") {
  const cleanBaseUrl = String(baseUrl || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1").replace(/\/+$/, "");

  if (!apiKey) {
    return {
      models: FALLBACK_QWEN_MODELS,
      sourceUrl: "https://www.qwencloud.com/models/qwen3.7-max",
      sourceLabel: "Qwen model catalog fallback",
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
      throw new Error(data.error?.message || `Qwen models failed with status ${response.status}.`);
    }

    const models = (data.data || data.models || []).map((model) => ({
      id: model.id,
      name: model.name || model.display_name || model.id,
      category: model.owned_by || "Qwen",
      source: "Qwen Models API",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_QWEN_MODELS),
      sourceUrl: `${cleanBaseUrl}/models`,
      sourceLabel: "Qwen Models API",
    };
  } catch {
    return {
      models: FALLBACK_QWEN_MODELS,
      sourceUrl: QWEN_MODELS_URL,
      sourceLabel: "Qwen model catalog fallback",
    };
  }
}

export async function getEdenAIModels(baseUrl, apiKey = process.env.EDENAI_API_KEY || process.env.EDEN_AI_API_KEY || "") {
  const cleanBaseUrl = String(baseUrl || "https://api.edenai.run/v3").replace(/\/+$/, "");

  if (!apiKey) {
    return {
      models: FALLBACK_EDENAI_MODELS,
      sourceUrl: EDENAI_MODELS_URL,
      sourceLabel: "EdenAI model catalog fallback",
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
      throw new Error(data.error?.message || data.message || `EdenAI models failed with status ${response.status}.`);
    }

    const models = (data.data || data.models || []).map((model) => ({
      id: model.id || model.model || model.name,
      name: model.name || model.display_name || model.id || model.model,
      category: model.provider || model.owned_by || "EdenAI",
      source: "EdenAI Models API",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_EDENAI_MODELS),
      sourceUrl: `${cleanBaseUrl}/models`,
      sourceLabel: "EdenAI Models API",
    };
  } catch {
    return {
      models: FALLBACK_EDENAI_MODELS,
      sourceUrl: EDENAI_MODELS_URL,
      sourceLabel: "EdenAI model catalog fallback",
    };
  }
}

export async function getDeepInfraModels(baseUrl, apiKey = process.env.DEEPINFRA_API_KEY || process.env.DEEPINFRA_TOKEN || "") {
  const cleanBaseUrl = String(baseUrl || "https://api.deepinfra.com/v1/openai").replace(/\/+$/, "");

  if (!apiKey) {
    return {
      models: FALLBACK_DEEPINFRA_MODELS,
      sourceUrl: DEEPINFRA_MODELS_URL,
      sourceLabel: "DeepInfra model catalog fallback",
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
      throw new Error(data.error?.message || data.message || `DeepInfra models failed with status ${response.status}.`);
    }

    const models = (data.data || data.models || []).map((model) => ({
      id: model.id || model.model || model.name,
      name: model.name || model.display_name || model.id || model.model,
      category: model.type || model.owned_by || "DeepInfra",
      source: "DeepInfra Models API",
    }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_DEEPINFRA_MODELS),
      sourceUrl: `${cleanBaseUrl}/models`,
      sourceLabel: "DeepInfra Models API",
    };
  } catch {
    return {
      models: FALLBACK_DEEPINFRA_MODELS,
      sourceUrl: DEEPINFRA_MODELS_URL,
      sourceLabel: "DeepInfra model catalog fallback",
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

export async function getBedrockModels(baseUrl) {
  const region = bedrockRegion(baseUrl);

  try {
    const client = new BedrockClient({ region });
    const response = await client.send(new ListFoundationModelsCommand({ byInferenceType: "ON_DEMAND" }));
    const models = (response.modelSummaries || [])
      .filter((model) => model.modelId)
      .filter((model) => model.responseStreamingSupported || model.inputModalities?.includes("TEXT"))
      .map((model) => ({
        id: model.modelId,
        name: model.modelName || model.modelId,
        category: model.providerName || "Amazon Bedrock",
        source: "Amazon Bedrock ListFoundationModels",
      }));

    return {
      models: uniqueById(models.length ? models : FALLBACK_BEDROCK_MODELS),
      sourceUrl: `bedrock:${region}`,
      sourceLabel: "Amazon Bedrock ListFoundationModels",
    };
  } catch {
    return {
      models: FALLBACK_BEDROCK_MODELS,
      sourceUrl: "https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html",
      sourceLabel: "Amazon Bedrock model catalog fallback",
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
