export const DEFAULT_PROVIDER = "ollama";

export const PROVIDERS = {
  ollama: {
    label: "Ollama",
    defaultBaseUrl: "http://localhost:11434",
    defaultModel: "llama3.1",
    needsKey: false,
    help: "Runs against your local Ollama server.",
  },
  openrouter: {
    label: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    needsKey: true,
    help: "Uses OpenAI-compatible chat completions through OpenRouter.",
  },
  openai: {
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.1-mini",
    needsKey: true,
    help: "Uses the OpenAI chat completions endpoint.",
  },
  anthropic: {
    label: "Claude",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-5",
    needsKey: true,
    help: "Uses Anthropic Claude through the Messages API.",
  },
  xai: {
    label: "Grok",
    defaultBaseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4.5",
    needsKey: true,
    help: "Uses xAI Grok through the Responses API.",
  },
  sarvam: {
    label: "Sarvam AI",
    defaultBaseUrl: "https://api.sarvam.ai/v1",
    defaultModel: "sarvam-105b",
    needsKey: true,
    help: "Uses Sarvam AI chat completions with Indian language optimized models.",
  },
  custom: {
    label: "OpenAI-compatible",
    defaultBaseUrl: "http://localhost:1234/v1",
    defaultModel: "local-model",
    needsKey: false,
    help: "Use LM Studio, vLLM, llama.cpp, or any compatible server.",
  },
};

export function getProviderConfig(provider) {
  return PROVIDERS[provider] ?? PROVIDERS[DEFAULT_PROVIDER];
}

export const FALLBACK_OPENAI_MODELS = [
  { id: "gpt-5.1", name: "gpt-5.1", category: "Flagship", source: "OpenAI pricing page" },
  { id: "gpt-5.1-mini", name: "gpt-5.1-mini", category: "Flagship", source: "OpenAI pricing page" },
  { id: "gpt-5.1-nano", name: "gpt-5.1-nano", category: "Flagship", source: "OpenAI pricing page" },
  { id: "gpt-5", name: "gpt-5", category: "Flagship", source: "OpenAI pricing page" },
  { id: "gpt-5-mini", name: "gpt-5-mini", category: "Flagship", source: "OpenAI pricing page" },
  { id: "gpt-5-nano", name: "gpt-5-nano", category: "Flagship", source: "OpenAI pricing page" },
  { id: "gpt-4.1", name: "gpt-4.1", category: "Text and code", source: "OpenAI pricing page" },
  { id: "gpt-4.1-mini", name: "gpt-4.1-mini", category: "Text and code", source: "OpenAI pricing page" },
  { id: "gpt-4.1-nano", name: "gpt-4.1-nano", category: "Text and code", source: "OpenAI pricing page" },
  { id: "o4-mini", name: "o4-mini", category: "Reasoning", source: "OpenAI pricing page" },
  { id: "o3", name: "o3", category: "Reasoning", source: "OpenAI pricing page" },
  { id: "gpt-realtime-2.1", name: "gpt-realtime-2.1", category: "Realtime and audio", source: "OpenAI pricing page" },
  { id: "gpt-realtime-2.1-mini", name: "gpt-realtime-2.1-mini", category: "Realtime and audio", source: "OpenAI pricing page" },
  { id: "gpt-4o-transcribe", name: "gpt-4o-transcribe", category: "Transcription", source: "OpenAI pricing page" },
  { id: "gpt-4o-mini-transcribe", name: "gpt-4o-mini-transcribe", category: "Transcription", source: "OpenAI pricing page" },
];

export const FALLBACK_OPENROUTER_MODELS = [
  { id: "openai/gpt-5.1-mini", name: "OpenAI: GPT-5.1 Mini", category: "OpenRouter fallback", source: "OpenRouter models page" },
  { id: "openai/gpt-4.1-mini", name: "OpenAI: GPT-4.1 Mini", category: "OpenRouter fallback", source: "OpenRouter models page" },
  { id: "anthropic/claude-sonnet-4.5", name: "Anthropic: Claude Sonnet 4.5", category: "OpenRouter fallback", source: "OpenRouter models page" },
  { id: "google/gemini-2.5-pro", name: "Google: Gemini 2.5 Pro", category: "OpenRouter fallback", source: "OpenRouter models page" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Meta: Llama 3.3 70B Instruct", category: "OpenRouter fallback", source: "OpenRouter models page" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek: DeepSeek Chat", category: "OpenRouter fallback", source: "OpenRouter models page" },
];

export const FALLBACK_CLAUDE_MODELS = [
  { id: "claude-fable-5", name: "Claude Fable 5", category: "Claude API", source: "Claude models page" },
  { id: "claude-opus-4-8", name: "Claude Opus 4.8", category: "Claude API", source: "Claude models page" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", category: "Claude API", source: "Claude models page" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", category: "Claude API", source: "Claude models page" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5 20251001", category: "Claude API", source: "Claude models page" },
];

export const FALLBACK_XAI_MODELS = [
  { id: "grok-4.5", name: "Grok 4.5", category: "xAI", source: "xAI models page" },
  { id: "grok-4.5-latest", name: "Grok 4.5 Latest", category: "xAI", source: "xAI models page" },
];

export const FALLBACK_SARVAM_MODELS = [
  { id: "sarvam-105b", name: "sarvam-105b", category: "128K context", source: "Sarvam chat completions docs" },
  { id: "sarvam-30b", name: "sarvam-30b", category: "64K context", source: "Sarvam chat completions docs" },
];

export function getDefaultChatSettings() {
  const provider = DEFAULT_PROVIDER;
  const config = getProviderConfig(provider);

  return {
    provider,
    baseUrl: config.defaultBaseUrl,
    model: config.defaultModel,
    temperature: 0.7,
    guardrails: true,
    theme: "dark",
  };
}
