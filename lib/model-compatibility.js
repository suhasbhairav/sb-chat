export function usesDefaultTemperatureOnly(provider, model) {
  const modelId = String(model || "").toLowerCase();

  if (provider !== "openai") return false;

  return modelId.startsWith("gpt-5") || modelId.includes("realtime");
}

export function normalizeTemperatureForModel(provider, model, temperature) {
  if (usesDefaultTemperatureOnly(provider, model)) {
    return 1;
  }

  if (provider === "anthropic") {
    return Math.min(1, Math.max(0, Number(temperature ?? 0.7)));
  }

  return Math.min(2, Math.max(0, Number(temperature ?? 0.7)));
}
