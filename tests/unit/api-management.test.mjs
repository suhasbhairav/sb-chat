import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

process.env.BATUK_DATA_STORE_PROVIDER = "json";
process.env.BATUK_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), "batuk-api-unit-"));

const {
  authenticateApiKey,
  createUserApiKey,
  publicApiManagementView,
  readApiManagementStore,
  revokeApiKey,
  upsertModelRoute,
} = await import("../../lib/api-management-store.js");
const { handleChatCompletionRequest } = await import("../../lib/api-completions.js");
const { handlePerplexitySearchRequest } = await import("../../lib/api-search.js");
const { callModel } = await import("../../lib/model-clients.js");

describe("API management", () => {
  it("stores only hashed API keys and blocks revoked keys", async () => {
    const result = await createUserApiKey({
      userId: "user-a",
      userEmail: "user-a@example.com",
      name: "Unit test key",
    });

    assert.match(result.key.secret, /^batuk_/);
    assert.equal(result.key.keyHash, undefined);

    const rawStore = await readFile(path.join(process.env.BATUK_DATA_DIR, "api-management-store.json"), "utf8");
    assert.equal(rawStore.includes(result.key.secret), false);
    assert.equal(rawStore.includes('"keyHash"'), true);

    const auth = await authenticateApiKey(`Bearer ${result.key.secret}`);
    assert.equal(auth.key.userId, "user-a");

    await revokeApiKey({ keyId: result.key.id, userId: "user-a", revokedBy: "user-a" });
    const revokedAuth = await authenticateApiKey(result.key.secret);
    assert.equal(revokedAuth, null);
  });

  it("returns an OpenAI-compatible completion from an admin-enabled Ollama route and records API usage", async () => {
    const keyResult = await createUserApiKey({
      userId: "user-b",
      userEmail: "user-b@example.com",
      name: "Ollama client",
    });
    const routedStore = await upsertModelRoute({
      id: "batuk/ollama-test",
      label: "Ollama Test",
      provider: "ollama",
      model: "llama3.1",
      baseUrl: "http://localhost:11434",
      enabled: true,
    });

    const usageEvents = [];
    const calls = [];
    const response = await handleChatCompletionRequest({
      authorization: `Bearer ${keyResult.key.secret}`,
      payload: {
        model: "batuk/ollama-test",
        messages: [{ role: "user", content: "Say hello" }],
        temperature: 0.2,
      },
      authenticateApiKey,
      readApiManagementStore: async () => routedStore,
      resolveServerApiKey: () => "",
      callModel: async (request) => {
        calls.push(request);
        return {
          message: "Hello from mocked Ollama.",
          usage: { inputTokens: 4, outputTokens: 5, totalTokens: 9 },
        };
      },
      recordTokenUsage: async (event) => {
        usageEvents.push(event);
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.object, "chat.completion");
    assert.equal(response.body.model, "batuk/ollama-test");
    assert.equal(response.body.choices[0].message.content, "Hello from mocked Ollama.");
    assert.deepEqual(response.body.usage, {
      prompt_tokens: 4,
      completion_tokens: 5,
      total_tokens: 9,
    });
    assert.equal(calls[0].provider, "ollama");
    assert.equal(calls[0].model, "llama3.1");
    assert.equal(calls[0].baseUrl, "http://localhost:11434");
    assert.equal(calls[0].messages[0].content, "Say hello");
    assert.equal(usageEvents[0].source, "api");
    assert.equal(usageEvents[0].userEmail, "user-b@example.com");
    assert.equal(usageEvents[0].apiKeyId, keyResult.key.id);
    assert.equal(usageEvents[0].apiModel, "batuk/ollama-test");

    const userView = publicApiManagementView(await readApiManagementStore(), { userId: "user-b", isAdmin: false });
    assert.equal(userView.modelRoutes, undefined);
    assert.equal(userView.canManageApi, false);
    assert.equal(userView.keys.every((key) => !key.keyHash && !key.secret), true);
  });

  it("supports Together AI as an OpenAI-compatible admin route", async () => {
    const keyResult = await createUserApiKey({
      userId: "user-c",
      userEmail: "user-c@example.com",
      name: "Together client",
    });
    const routedStore = await upsertModelRoute({
      id: "batuk/together-minimax",
      label: "Together MiniMax",
      provider: "together",
      model: "MiniMaxAI/MiniMax-M3",
      baseUrl: "https://api.together.ai/v1",
      enabled: true,
    });

    const calls = [];
    const response = await handleChatCompletionRequest({
      authorization: `Bearer ${keyResult.key.secret}`,
      payload: {
        model: "batuk/together-minimax",
        messages: [{ role: "user", content: "Hello" }],
      },
      authenticateApiKey,
      readApiManagementStore: async () => routedStore,
      resolveServerApiKey: (provider) => provider === "together" ? "together-secret" : "",
      callModel: async (request) => {
        calls.push(request);
        return {
          message: "Hello from Together.",
          usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
        };
      },
      recordTokenUsage: async () => {},
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.choices[0].message.content, "Hello from Together.");
    assert.equal(calls[0].provider, "together");
    assert.equal(calls[0].apiKey, "together-secret");
    assert.equal(calls[0].baseUrl, "https://api.together.ai/v1");
    assert.equal(calls[0].model, "MiniMaxAI/MiniMax-M3");
  });

  it("supports Mistral AI as an OpenAI-compatible admin route", async () => {
    const keyResult = await createUserApiKey({
      userId: "user-m",
      userEmail: "user-m@example.com",
      name: "Mistral client",
    });
    const routedStore = await upsertModelRoute({
      id: "batuk/mistral-large",
      label: "Mistral Large",
      provider: "mistral",
      model: "mistral-large-latest",
      baseUrl: "https://api.mistral.ai/v1",
      enabled: true,
    });

    const calls = [];
    const response = await handleChatCompletionRequest({
      authorization: `Bearer ${keyResult.key.secret}`,
      payload: {
        model: "batuk/mistral-large",
        messages: [{ role: "user", content: "Who is the best French painter?" }],
      },
      authenticateApiKey,
      readApiManagementStore: async () => routedStore,
      resolveServerApiKey: (provider) => provider === "mistral" ? "mistral-secret" : "",
      callModel: async (request) => {
        calls.push(request);
        return {
          message: "Claude Monet is often regarded as one of the greatest French painters.",
          usage: { inputTokens: 8, outputTokens: 10, totalTokens: 18 },
        };
      },
      recordTokenUsage: async () => {},
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.choices[0].message.content, "Claude Monet is often regarded as one of the greatest French painters.");
    assert.equal(calls[0].provider, "mistral");
    assert.equal(calls[0].apiKey, "mistral-secret");
    assert.equal(calls[0].baseUrl, "https://api.mistral.ai/v1");
    assert.equal(calls[0].model, "mistral-large-latest");
  });

  it("supports Kimi as an OpenAI-compatible admin route", async () => {
    const keyResult = await createUserApiKey({
      userId: "user-k",
      userEmail: "user-k@example.com",
      name: "Kimi client",
    });
    const routedStore = await upsertModelRoute({
      id: "batuk/kimi-k3",
      label: "Kimi K3",
      provider: "kimi",
      model: "kimi-k3",
      baseUrl: "https://api.moonshot.ai/v1",
      enabled: true,
    });

    const calls = [];
    const response = await handleChatCompletionRequest({
      authorization: `Bearer ${keyResult.key.secret}`,
      payload: {
        model: "batuk/kimi-k3",
        messages: [{ role: "user", content: "What is 1+1?" }],
      },
      authenticateApiKey,
      readApiManagementStore: async () => routedStore,
      resolveServerApiKey: (provider) => provider === "kimi" ? "moonshot-secret" : "",
      callModel: async (request) => {
        calls.push(request);
        return {
          message: "1+1 equals 2.",
          usage: { inputTokens: 4, outputTokens: 5, totalTokens: 9 },
        };
      },
      recordTokenUsage: async () => {},
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.choices[0].message.content, "1+1 equals 2.");
    assert.equal(calls[0].provider, "kimi");
    assert.equal(calls[0].apiKey, "moonshot-secret");
    assert.equal(calls[0].baseUrl, "https://api.moonshot.ai/v1");
    assert.equal(calls[0].model, "kimi-k3");
  });

  it("supports DeepSeek as an OpenAI-compatible admin route", async () => {
    const keyResult = await createUserApiKey({
      userId: "user-ds",
      userEmail: "user-ds@example.com",
      name: "DeepSeek client",
    });
    const routedStore = await upsertModelRoute({
      id: "batuk/deepseek-v4-pro",
      label: "DeepSeek V4 Pro",
      provider: "deepseek",
      model: "deepseek-v4-pro",
      baseUrl: "https://api.deepseek.com",
      enabled: true,
    });

    const calls = [];
    const response = await handleChatCompletionRequest({
      authorization: `Bearer ${keyResult.key.secret}`,
      payload: {
        model: "batuk/deepseek-v4-pro",
        messages: [{ role: "user", content: "Hello!" }],
      },
      authenticateApiKey,
      readApiManagementStore: async () => routedStore,
      resolveServerApiKey: (provider) => provider === "deepseek" ? "deepseek-secret" : "",
      callModel: async (request) => {
        calls.push(request);
        return {
          message: "Hello from DeepSeek.",
          usage: { inputTokens: 3, outputTokens: 4, totalTokens: 7 },
        };
      },
      recordTokenUsage: async () => {},
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.choices[0].message.content, "Hello from DeepSeek.");
    assert.equal(calls[0].provider, "deepseek");
    assert.equal(calls[0].apiKey, "deepseek-secret");
    assert.equal(calls[0].baseUrl, "https://api.deepseek.com");
    assert.equal(calls[0].model, "deepseek-v4-pro");
  });

  it("sends DeepSeek thinking mode fields to the OpenAI-compatible client", async () => {
    const originalFetch = globalThis.fetch;
    const requests = [];
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      return Response.json({
        choices: [{ message: { content: "DeepSeek response." } }],
        usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
      });
    };

    try {
      const response = await callModel({
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        apiKey: "deepseek-secret",
        model: "deepseek-v4-pro",
        temperature: 0.7,
        messages: [{ role: "user", content: "Hello!" }],
      });

      const body = JSON.parse(requests[0].options.body);
      assert.equal(requests[0].url, "https://api.deepseek.com/chat/completions");
      assert.equal(requests[0].options.headers.Authorization, "Bearer deepseek-secret");
      assert.deepEqual(body.thinking, { type: "enabled" });
      assert.equal(body.reasoning_effort, "high");
      assert.equal(body.temperature, undefined);
      assert.equal(response.message, "DeepSeek response.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("supports Qwen as an OpenAI-compatible admin route", async () => {
    const keyResult = await createUserApiKey({
      userId: "user-qwen",
      userEmail: "user-qwen@example.com",
      name: "Qwen client",
    });
    const routedStore = await upsertModelRoute({
      id: "batuk/qwen3.7-max",
      label: "Qwen 3.7 Max",
      provider: "qwen",
      model: "qwen3.7-max",
      baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      enabled: true,
    });

    const calls = [];
    const response = await handleChatCompletionRequest({
      authorization: `Bearer ${keyResult.key.secret}`,
      payload: {
        model: "batuk/qwen3.7-max",
        messages: [{ role: "user", content: "Who are you?" }],
      },
      authenticateApiKey,
      readApiManagementStore: async () => routedStore,
      resolveServerApiKey: (provider) => provider === "qwen" ? "dashscope-secret" : "",
      callModel: async (request) => {
        calls.push(request);
        return {
          message: "I am Qwen.",
          usage: { inputTokens: 4, outputTokens: 5, totalTokens: 9 },
        };
      },
      recordTokenUsage: async () => {},
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.choices[0].message.content, "I am Qwen.");
    assert.equal(calls[0].provider, "qwen");
    assert.equal(calls[0].apiKey, "dashscope-secret");
    assert.equal(calls[0].baseUrl, "https://dashscope-intl.aliyuncs.com/compatible-mode/v1");
    assert.equal(calls[0].model, "qwen3.7-max");
  });

  it("sends Qwen enable_thinking to the OpenAI-compatible client", async () => {
    const originalFetch = globalThis.fetch;
    const requests = [];
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      return Response.json({
        choices: [{ message: { content: "Qwen response." } }],
        usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
      });
    };

    try {
      const response = await callModel({
        provider: "qwen",
        baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        apiKey: "dashscope-secret",
        model: "qwen3.7-max",
        temperature: 0.7,
        messages: [{ role: "user", content: "Who are you?" }],
      });

      const body = JSON.parse(requests[0].options.body);
      assert.equal(requests[0].url, "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions");
      assert.equal(requests[0].options.headers.Authorization, "Bearer dashscope-secret");
      assert.equal(body.enable_thinking, true);
      assert.equal(body.model, "qwen3.7-max");
      assert.equal(response.message, "Qwen response.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("exposes Perplexity Search through Batuk API keys and records search usage", async () => {
    const keyResult = await createUserApiKey({
      userId: "user-d",
      userEmail: "user-d@example.com",
      name: "Search client",
    });
    const usageEvents = [];
    const calls = [];

    const response = await handlePerplexitySearchRequest({
      authorization: `Bearer ${keyResult.key.secret}`,
      payload: {
        query: ["What is Comet Browser?", "Perplexity AI", "Perplexity Changelog"],
      },
      authenticateApiKey,
      readApiManagementStore,
      resolveServerApiKey: (provider) => provider === "perplexity" ? "pplx-secret" : "",
      callPerplexitySearch: async (request) => {
        calls.push(request);
        return {
          results: [
            { title: "Comet Browser", url: "https://example.com/comet", snippet: "A Perplexity browser." },
          ],
        };
      },
      recordTokenUsage: async (event) => {
        usageEvents.push(event);
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.results[0].title, "Comet Browser");
    assert.deepEqual(calls[0].query, ["What is Comet Browser?", "Perplexity AI", "Perplexity Changelog"]);
    assert.equal(calls[0].baseUrl, "https://api.perplexity.ai");
    assert.equal(calls[0].apiKey, "pplx-secret");
    assert.equal(usageEvents[0].provider, "perplexity");
    assert.equal(usageEvents[0].source, "api-search");
    assert.equal(usageEvents[0].apiModel, "perplexity-search");
  });
});
