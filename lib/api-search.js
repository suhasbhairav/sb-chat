export async function handlePerplexitySearchRequest({
  authorization,
  payload,
  authenticateApiKey,
  readApiManagementStore,
  callPerplexitySearch,
  resolveServerApiKey,
  recordTokenUsage,
  recordAuditEvent,
  auditContext = {},
}) {
  const auth = await authenticateApiKey(authorization);
  if (!auth) {
    await recordAuditEvent?.({
      category: "access",
      action: "api.search.authentication_failed",
      outcome: "denied",
      statusCode: 401,
      ...auditContext,
    });
    return {
      status: 401,
      body: { error: { message: "Invalid or revoked Batuk API key.", type: "authentication_error" } },
    };
  }

  const store = await readApiManagementStore();
  if (store.settings?.enabled === false) {
    await recordAuditEvent?.({
      category: "access",
      action: "api.search.disabled",
      outcome: "denied",
      actor: auth.key,
      statusCode: 403,
      ...auditContext,
    });
    return {
      status: 403,
      body: { error: { message: "Batuk API access is disabled.", type: "access_denied" } },
    };
  }

  if (!payload?.query) {
    await recordAuditEvent?.({
      category: "search",
      action: "api.search.validation_failed",
      outcome: "failure",
      actor: auth.key,
      statusCode: 400,
      metadata: { reason: "query is required" },
      ...auditContext,
    });
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
  await recordAuditEvent?.({
    category: "search",
    action: "api.search.finished",
    outcome: "success",
    actor: { id: auth.key.userId, email: auth.key.userEmail, role: "api_key" },
    target: { type: "api_search", id: "perplexity-search" },
    metadata: {
      apiKeyId: auth.key.id,
      maxResults: payload.max_results || payload.maxResults || 10,
      queryCount: Array.isArray(payload.query) ? payload.query.length : 1,
      resultCount: Array.isArray(data.results) ? data.results.length : Array.isArray(data) ? data.length : null,
    },
    ...auditContext,
  });

  return {
    status: 200,
    body: data,
  };
}
