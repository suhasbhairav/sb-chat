export const AUTO_REALTIME_MODEL = "auto";

export const DEFAULT_REALTIME_MODEL = "gpt-realtime-2.1";
export const DEFAULT_XAI_REALTIME_MODEL = "grok-voice-latest";
export const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

export const PREFERRED_REALTIME_MODELS = [
  "gpt-realtime-2.1",
  "gpt-realtime-2.1-mini",
  "gpt-realtime-whisper",
  "gpt-realtime-translate",
];

export const PREFERRED_XAI_REALTIME_MODELS = [
  "grok-voice-latest",
  "grok-voice-think-fast-2.0",
  "grok-voice-think-fast-1.0",
];

export function isRealtimeModel(modelId) {
  const id = String(modelId || "").toLowerCase();
  return id.includes("realtime") || id.startsWith("grok-voice");
}

export function resolveRealtimeModel({ modelCatalog = [], provider, realtimeModel, selectedModel }) {
  if (realtimeModel && realtimeModel !== AUTO_REALTIME_MODEL) {
    return realtimeModel;
  }

  if (isRealtimeModel(selectedModel)) {
    return selectedModel;
  }

  const catalogIds = modelCatalog.map((item) => item.id).filter(Boolean);
  if (provider === "xai") {
    const preferred = PREFERRED_XAI_REALTIME_MODELS.find((modelId) => catalogIds.includes(modelId));
    return preferred || catalogIds.find(isRealtimeModel) || DEFAULT_XAI_REALTIME_MODEL;
  }

  const preferred = PREFERRED_REALTIME_MODELS.find((modelId) => catalogIds.includes(modelId));

  return preferred || catalogIds.find(isRealtimeModel) || DEFAULT_REALTIME_MODEL;
}
