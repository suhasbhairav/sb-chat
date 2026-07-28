export async function handlePerplexitySearchRequest({
  authorization,
  payload,
  authenticateApiKey,
  readApiManagementStore,
  callPerplexitySearch,
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

  const store = await readApiManagementStore();
  if (store.settings?.enabled === false) {
    return {
      status: 403,
      body: { error: { message: "Batuk API access is disabled.", type: "access_denied" } },
    };
  }

  if (!payload?.query) {
    return {
      status: 400,
      body: { error: { message: "query is required.", type: "invalid_request_error" } },
    };
  }

  const data = await callPerplexitySearch({
    baseUrl: payload.baseUrl || "https://api.perplexity.ai",
    apiKey: resolveServerApiKey("perplexity", ""),
    query: payload.query,
    maxResults: payload.max_results || payload.maxResults || 10,
  });

  await recordTokenUsage({
    userId: auth.key.userId,
    provider: "perplexity",
    model: "perplexity-search",
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    source: "api-search",
    userEmail: auth.key.userEmail,
    apiKeyId: auth.key.id,
    apiModel: "perplexity-search",
  });

  return {
    status: 200,
    body: data,
  };
}
