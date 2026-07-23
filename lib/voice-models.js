export const AUTO_REALTIME_MODEL = "auto";

export const DEFAULT_REALTIME_MODEL = "gpt-realtime-2.1";
export const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

export const PREFERRED_REALTIME_MODELS = [
  "gpt-realtime-2.1",
  "gpt-realtime-2.1-mini",
  "gpt-realtime-whisper",
  "gpt-realtime-translate",
];

export function isRealtimeModel(modelId) {
  return String(modelId || "").toLowerCase().includes("realtime");
}

export function resolveRealtimeModel({ modelCatalog = [], realtimeModel, selectedModel }) {
  if (realtimeModel && realtimeModel !== AUTO_REALTIME_MODEL) {
    return realtimeModel;
  }

  if (isRealtimeModel(selectedModel)) {
    return selectedModel;
  }

  const catalogIds = modelCatalog.map((item) => item.id).filter(Boolean);
  const preferred = PREFERRED_REALTIME_MODELS.find((modelId) => catalogIds.includes(modelId));

  return preferred || catalogIds.find(isRealtimeModel) || DEFAULT_REALTIME_MODEL;
}
