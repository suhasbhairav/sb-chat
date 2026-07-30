import { enqueueModelRequest, isRateLimitError, modelQueueOptionsFromEnv, rateLimitDelayMs, sleep } from "./request-queue.js";

export function completionId() {
  return `chatcmpl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function normalizeApiMessages(messages = []) {
  return messages
    .filter((message) => ["system", "user", "assistant"].includes(message.role))
    .map((message) => ({ role: message.role, content: String(message.content || "") }));
}

async function callModelWithRateLimitRetry(modelRequest, callModel) {
  const queueOptions = modelQueueOptionsFromEnv();

  for (let attempt = 0; attempt <= queueOptions.rateLimitRetries; attempt += 1) {
    try {
      return await callModel(modelRequest);
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= queueOptions.rateLimitRetries) {
        throw error;
      }
      await sleep(rateLimitDelayMs(error, attempt + 1, queueOptions));
    }
  }

  throw new Error("Model request failed after rate-limit retries.");
}

export async function handleChatCompletionRequest({
  authorization,
  payload,
  authenticateApiKey,
  readApiManagementStore,
  callModel,
  resolveServerApiKey,
  recordTokenUsage,
}) {
  const auth = await authenticateApiKey(authorization);
  if (!auth) {
    return {
      status: 401,
      body: { error: { message: "Invalid or revoked Batuk API key.", type: "authentication_error" } },
    };
  }

  const messages = normalizeApiMessages(payload.messages);
  if (!messages.length) {
    return {
      status: 400,
      body: { error: { message: "messages is required.", type: "invalid_request_error" } },
    };
  }

  const store = await readApiManagementStore();
  if (store.settings?.enabled === false) {
    return {
      status: 403,
      body: { error: { message: "Batuk API access is disabled.", type: "access_denied" } },
    };
  }

  const route = store.modelRoutes.find((item) => item.enabled && item.id === payload.model);
  if (!route) {
    return {
      status: 404,
      body: { error: { message: `Model '${payload.model}' is not available through this Batuk API.`, type: "model_not_found" } },
    };
  }

  const ticket = enqueueModelRequest(() => callModelWithRateLimitRetry({
    provider: route.provider,
    model: route.model,
    baseUrl: route.baseUrl,
    apiKey: resolveServerApiKey(route.provider, ""),
    temperature: Number(payload.temperature ?? 1),
    messages,
  }, callModel));
  const result = await ticket.promise;
  const usage = result.usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0, source: "api" };

  await recordTokenUsage({
    userId: auth.key.userId,
    provider: route.provider,
    model: route.id,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    source: "api",
    userEmail: auth.key.userEmail,
    apiKeyId: auth.key.id,
    apiModel: route.id,
  });

  return {
    status: 200,
    body: {
      id: completionId(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: route.id,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: result.message || "" },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: usage.inputTokens || 0,
        completion_tokens: usage.outputTokens || 0,
        total_tokens: usage.totalTokens || 0,
      },
    },
  };
}
