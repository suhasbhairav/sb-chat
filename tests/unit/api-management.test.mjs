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
