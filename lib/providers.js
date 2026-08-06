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
  orcarouter: {
    label: "OrcaRouter",
    defaultBaseUrl: "https://api.orcarouter.ai/v1",
    defaultModel: "openai/gpt-4o-mini",
    needsKey: true,
    help: "Uses OrcaRouter's OpenAI-compatible routed chat completions.",
  },
  velona: {
    label: "Velona",
    defaultBaseUrl: "http://www.velona.in/gateway/v1",
    defaultModel: "openai/gpt-4o-mini",
    needsKey: true,
    help: "Uses Velona's INR-billed AI gateway with routed inference across 300+ models.",
  },
  openai: {
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.1-mini",
    needsKey: true,
    help: "Uses the OpenAI chat completions endpoint.",
  },
  together: {
    label: "Together AI",
    defaultBaseUrl: "https://api.together.ai/v1",
    defaultModel: "MiniMaxAI/MiniMax-M3",
    needsKey: true,
    help: "Uses Together AI's OpenAI-compatible inference API.",
  },
  mistral: {
    label: "Mistral AI",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-large-latest",
    needsKey: true,
    help: "Uses Mistral AI chat completions.",
  },
  kimi: {
    label: "Kimi",
    defaultBaseUrl: "https://api.moonshot.ai/v1",
    defaultModel: "kimi-k3",
    needsKey: true,
    help: "Uses Moonshot AI's OpenAI-compatible Kimi API.",
  },
  deepseek: {
    label: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-v4-pro",
    needsKey: true,
    help: "Uses DeepSeek's OpenAI-compatible chat completions with thinking mode.",
  },
  qwen: {
    label: "Qwen",
    defaultBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen3.7-max",
    needsKey: true,
    help: "Uses Qwen's DashScope OpenAI-compatible chat completions with thinking enabled.",
  },
  edenai: {
    label: "EdenAI",
    defaultBaseUrl: "https://api.edenai.run/v3",
    defaultModel: "openai/gpt-4",
    needsKey: true,
    help: "Uses EdenAI's unified v3 chat completions API across supported model providers.",
  },
  deepinfra: {
    label: "DeepInfra",
    defaultBaseUrl: "https://api.deepinfra.com/v1/openai",
    defaultModel: "deepseek-ai/DeepSeek-V3",
    needsKey: true,
    help: "Uses DeepInfra's OpenAI-compatible chat completions API for hosted open-source models.",
  },
  perplexity: {
    label: "Perplexity",
    defaultBaseUrl: "https://api.perplexity.ai",
    defaultModel: "sonar-pro",
    needsKey: true,
    help: "Uses Perplexity Sonar chat completions and Perplexity Search API access.",
  },
  anthropic: {
    label: "Claude",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-5",
    needsKey: true,
    help: "Uses Anthropic Claude through the Messages API.",
  },
  bedrock: {
    label: "AWS Bedrock",
    defaultBaseUrl: "us-east-1",
    defaultModel: "amazon.nova-lite-v1:0",
    needsKey: false,
    help: "Uses Amazon Bedrock Converse API with AWS credentials from the server environment, profile, or IAM role.",
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

export const FALLBACK_ORCAROUTER_MODELS = [
  { id: "openai/gpt-4o-mini", name: "OpenAI: GPT-4o Mini", category: "OrcaRouter fallback", source: "OrcaRouter quickstart" },
  { id: "anthropic/claude-sonnet-4.6", name: "Anthropic: Claude Sonnet 4.6", category: "OrcaRouter fallback", source: "OrcaRouter quickstart" },
  { id: "google/gemini-2.5-pro", name: "Google: Gemini 2.5 Pro", category: "OrcaRouter fallback", source: "OrcaRouter quickstart" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek: DeepSeek Chat", category: "OrcaRouter fallback", source: "OrcaRouter quickstart" },
  { id: "grok/grok-4-fast-reasoning", name: "Grok: Grok 4 Fast Reasoning", category: "OrcaRouter fallback", source: "OrcaRouter quickstart" },
  { id: "qwen/qwen3.6-plus", name: "Qwen: Qwen3.6 Plus", category: "OrcaRouter fallback", source: "OrcaRouter quickstart" },
  { id: "kimi/kimi-k2.6", name: "Kimi: Kimi K2.6", category: "OrcaRouter fallback", source: "OrcaRouter quickstart" },
  { id: "minimax/minimax-m2.7", name: "MiniMax: MiniMax M2.7", category: "OrcaRouter fallback", source: "OrcaRouter quickstart" },
];

export const FALLBACK_VELONA_MODELS = [
  { id: "openai/gpt-4o", name: "OpenAI GPT-4o", category: "Velona text", source: "Velona docs" },
  { id: "openai/gpt-4o-mini", name: "OpenAI GPT-4o Mini", category: "Velona text", source: "Velona docs" },
  { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", category: "Velona text", source: "Velona docs" },
  { id: "anthropic/claude-opus-4-8", name: "Claude Opus 4.8", category: "Velona text", source: "Velona docs" },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", category: "Velona text", source: "Velona docs" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B Instruct", category: "Velona text", source: "Velona docs" },
  { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B Instruct", category: "Velona text", source: "Velona docs" },
];

export const FALLBACK_TOGETHER_MODELS = [
  { id: "MiniMaxAI/MiniMax-M3", name: "MiniMaxAI/MiniMax-M3", category: "Together AI", source: "Together OpenAI compatibility docs" },
  { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B Instruct Turbo", category: "Together AI", source: "Together model catalog fallback" },
  { id: "Qwen/Qwen3-235B-A22B-fp8-tput", name: "Qwen3 235B A22B FP8", category: "Together AI", source: "Together model catalog fallback" },
  { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3", category: "Together AI", source: "Together model catalog fallback" },
];

export const FALLBACK_PERPLEXITY_MODELS = [
  { id: "sonar-pro", name: "sonar-pro", category: "Perplexity Sonar", source: "Perplexity OpenAI SDK compatibility docs" },
  { id: "sonar", name: "sonar", category: "Perplexity Sonar", source: "Perplexity Sonar docs" },
  { id: "sonar-deep-research", name: "sonar-deep-research", category: "Perplexity Sonar", source: "Perplexity Sonar docs" },
  { id: "sonar-reasoning-pro", name: "sonar-reasoning-pro", category: "Perplexity Sonar", source: "Perplexity Sonar docs" },
];

export const FALLBACK_MISTRAL_MODELS = [
  { id: "mistral-large-latest", name: "mistral-large-latest", category: "Mistral chat", source: "Mistral chat completion docs" },
  { id: "mistral-small-latest", name: "mistral-small-latest", category: "Mistral chat", source: "Mistral chat completion docs" },
  { id: "mistral-medium-latest", name: "mistral-medium-latest", category: "Mistral chat", source: "Mistral models overview" },
  { id: "codestral-latest", name: "codestral-latest", category: "Mistral code", source: "Mistral models overview" },
  { id: "ministral-8b-latest", name: "ministral-8b-latest", category: "Mistral chat", source: "Mistral models overview" },
  { id: "ministral-3b-latest", name: "ministral-3b-latest", category: "Mistral chat", source: "Mistral models overview" },
];

export const FALLBACK_KIMI_MODELS = [
  { id: "kimi-k3", name: "kimi-k3", category: "Kimi flagship", source: "Kimi quickstart docs" },
  { id: "kimi-k2.7-code-highspeed", name: "kimi-k2.7-code-highspeed", category: "Kimi code", source: "Kimi quickstart docs" },
  { id: "kimi-k2.7-code", name: "kimi-k2.7-code", category: "Kimi code", source: "Kimi model list" },
  { id: "kimi-k2.6", name: "kimi-k2.6", category: "Kimi general", source: "Kimi quickstart docs" },
  { id: "kimi-k2.5", name: "kimi-k2.5", category: "Kimi general", source: "Kimi quickstart docs" },
];

export const FALLBACK_DEEPSEEK_MODELS = [
  { id: "deepseek-v4-pro", name: "deepseek-v4-pro", category: "DeepSeek thinking", source: "DeepSeek quick start docs" },
  { id: "deepseek-v4-flash", name: "deepseek-v4-flash", category: "DeepSeek chat", source: "DeepSeek quick start docs" },
];

export const FALLBACK_QWEN_MODELS = [
  { id: "qwen3.7-max", name: "qwen3.7-max", category: "Qwen reasoning", source: "Qwen3.7-Max model page" },
  { id: "qwen3-max", name: "qwen3-max", category: "Qwen reasoning", source: "Qwen API platform" },
  { id: "qwen3-plus", name: "qwen3-plus", category: "Qwen chat", source: "Qwen API platform" },
  { id: "qwen3-turbo", name: "qwen3-turbo", category: "Qwen chat", source: "Qwen API platform" },
  { id: "qwen-plus", name: "qwen-plus", category: "Qwen chat", source: "Qwen API platform" },
  { id: "qwen-turbo", name: "qwen-turbo", category: "Qwen chat", source: "Qwen API platform" },
];

export const FALLBACK_EDENAI_MODELS = [
  { id: "openai/gpt-4", name: "OpenAI GPT-4", category: "EdenAI chat", source: "EdenAI model catalog fallback" },
  { id: "openai/gpt-4o-mini", name: "OpenAI GPT-4o Mini", category: "EdenAI chat", source: "EdenAI model catalog fallback" },
  { id: "openai/gpt-4.1-mini", name: "OpenAI GPT-4.1 Mini", category: "EdenAI chat", source: "EdenAI model catalog fallback" },
  { id: "anthropic/claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", category: "EdenAI chat", source: "EdenAI model catalog fallback" },
  { id: "mistral/mistral-large-latest", name: "Mistral Large", category: "EdenAI chat", source: "EdenAI model catalog fallback" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", category: "EdenAI chat", source: "EdenAI model catalog fallback" },
];

export const FALLBACK_DEEPINFRA_MODELS = [
  { id: "deepseek-ai/DeepSeek-V4-Flash-0731", name: "DeepSeek V4 Flash 0731", category: "DeepInfra text generation", source: "DeepInfra model catalog" },
  { id: "deepseek-ai/DeepSeek-V4-Flash", name: "DeepSeek V4 Flash", category: "DeepInfra text generation", source: "DeepInfra model catalog" },
  { id: "deepseek-ai/DeepSeek-V4-Pro", name: "DeepSeek V4 Pro", category: "DeepInfra text generation", source: "DeepInfra model catalog" },
  { id: "deepseek-ai/DeepSeek-V3.2", name: "DeepSeek V3.2", category: "DeepInfra text generation", source: "DeepInfra model catalog" },
  { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3", category: "DeepInfra text generation", source: "DeepInfra quickstart" },
  { id: "Qwen/Qwen3-Max", name: "Qwen3 Max", category: "DeepInfra text generation", source: "DeepInfra model catalog" },
  { id: "Qwen/Qwen3-Max-Thinking", name: "Qwen3 Max Thinking", category: "DeepInfra text generation", source: "DeepInfra model catalog" },
  { id: "Qwen/Qwen3.5-397B-A17B", name: "Qwen3.5 397B A17B", category: "DeepInfra text generation", source: "DeepInfra model catalog" },
  { id: "moonshotai/Kimi-K2.7-Code", name: "Kimi K2.7 Code", category: "DeepInfra text generation", source: "DeepInfra model catalog" },
  { id: "zai-org/GLM-5.2", name: "GLM 5.2", category: "DeepInfra text generation", source: "DeepInfra model catalog" },
  { id: "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B", name: "NVIDIA Nemotron 3 Ultra", category: "DeepInfra text generation", source: "DeepInfra model catalog" },
  { id: "google/gemma-4-26B-A4B-it", name: "Gemma 4 26B A4B IT", category: "DeepInfra text generation", source: "DeepInfra model catalog" },
];

export const FALLBACK_CLAUDE_MODELS = [
  { id: "claude-fable-5", name: "Claude Fable 5", category: "Claude API", source: "Claude models page" },
  { id: "claude-opus-4-8", name: "Claude Opus 4.8", category: "Claude API", source: "Claude models page" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", category: "Claude API", source: "Claude models page" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", category: "Claude API", source: "Claude models page" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5 20251001", category: "Claude API", source: "Claude models page" },
];

export const FALLBACK_BEDROCK_MODELS = [
  { id: "amazon.nova-lite-v1:0", name: "Amazon Nova Lite", category: "Amazon Nova", source: "Amazon Bedrock fallback" },
  { id: "amazon.nova-pro-v1:0", name: "Amazon Nova Pro", category: "Amazon Nova", source: "Amazon Bedrock fallback" },
  { id: "amazon.nova-micro-v1:0", name: "Amazon Nova Micro", category: "Amazon Nova", source: "Amazon Bedrock fallback" },
  { id: "anthropic.claude-3-5-sonnet-20241022-v2:0", name: "Claude 3.5 Sonnet v2", category: "Anthropic on Bedrock", source: "Amazon Bedrock fallback" },
  { id: "anthropic.claude-3-5-haiku-20241022-v1:0", name: "Claude 3.5 Haiku", category: "Anthropic on Bedrock", source: "Amazon Bedrock fallback" },
  { id: "openai.gpt-oss-120b-1:0", name: "OpenAI GPT OSS 120B", category: "OpenAI on Bedrock", source: "Amazon Bedrock model choice fallback" },
  { id: "openai.gpt-oss-20b-1:0", name: "OpenAI GPT OSS 20B", category: "OpenAI on Bedrock", source: "Amazon Bedrock model choice fallback" },
  { id: "deepseek.r1-v1:0", name: "DeepSeek R1", category: "DeepSeek on Bedrock", source: "Amazon Bedrock model choice fallback" },
  { id: "meta.llama3-1-8b-instruct-v1:0", name: "Llama 3.1 8B Instruct", category: "Meta on Bedrock", source: "Amazon Bedrock fallback" },
  { id: "mistral.mistral-large-2407-v1:0", name: "Mistral Large 2407", category: "Mistral on Bedrock", source: "Amazon Bedrock fallback" },
  { id: "qwen.qwen3-32b-v1:0", name: "Qwen3 32B", category: "Qwen on Bedrock", source: "Amazon Bedrock model choice fallback" },
];

export const FALLBACK_XAI_MODELS = [
  { id: "grok-4.5", name: "Grok 4.5", category: "xAI", source: "xAI models page" },
  { id: "grok-4.5-latest", name: "Grok 4.5 Latest", category: "xAI", source: "xAI models page" },
  { id: "grok-voice-latest", name: "Grok Voice Latest", category: "Realtime and audio", source: "xAI voice docs" },
  { id: "grok-voice-think-fast-2.0", name: "Grok Voice Think Fast 2.0", category: "Realtime and audio", source: "xAI voice docs" },
  { id: "grok-voice-think-fast-1.0", name: "Grok Voice Think Fast 1.0", category: "Realtime and audio", source: "xAI voice docs" },
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
    theme: "light",
  };
}
