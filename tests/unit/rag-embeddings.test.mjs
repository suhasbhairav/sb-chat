import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { createEmbeddings, normalizeEmbeddingSettings } from "../../lib/rag-embeddings.js";

const originalProvider = process.env.BATUK_EMBEDDING_PROVIDER;
const originalModel = process.env.BATUK_EMBEDDING_MODEL;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalProvider === undefined) {
    delete process.env.BATUK_EMBEDDING_PROVIDER;
  } else {
    process.env.BATUK_EMBEDDING_PROVIDER = originalProvider;
  }
  if (originalModel === undefined) {
    delete process.env.BATUK_EMBEDDING_MODEL;
  } else {
    process.env.BATUK_EMBEDDING_MODEL = originalModel;
  }
  globalThis.fetch = originalFetch;
});

describe("RAG embeddings", () => {
  it("keeps local deterministic embeddings as the default", async () => {
    delete process.env.BATUK_EMBEDDING_PROVIDER;
    delete process.env.BATUK_EMBEDDING_MODEL;

    const settings = normalizeEmbeddingSettings({});
    const [embedding] = await createEmbeddings(["hello world"], settings);

    assert.equal(settings.embeddingProvider, "local");
    assert.equal(settings.embeddingModel, "local-hash-v1");
    assert.equal(embedding.length, 384);
  });

  it("normalizes LlamaIndex OpenAI embedding defaults", () => {
    const settings = normalizeEmbeddingSettings({ embeddingProvider: "llamaindex-openai" });

    assert.deepEqual(settings, {
      embeddingProvider: "llamaindex-openai",
      embeddingModel: "text-embedding-ada-002",
    });
  });

  it("normalizes LlamaIndex Ollama embedding defaults", () => {
    const settings = normalizeEmbeddingSettings({ embeddingProvider: "llamaindex-ollama" });

    assert.deepEqual(settings, {
      embeddingProvider: "llamaindex-ollama",
      embeddingModel: "nomic-embed-text",
    });
  });

  it("normalizes direct Ollama embedding defaults", () => {
    const settings = normalizeEmbeddingSettings({ embeddingProvider: "ollama" });

    assert.deepEqual(settings, {
      embeddingProvider: "ollama",
      embeddingModel: "embeddinggemma",
    });
  });

  it("uses Ollama /api/embed and preserves model-specific dimensions", async () => {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "http://localhost:11434/api/embed");
      assert.deepEqual(JSON.parse(init.body), {
        model: "all-minilm",
        input: ["first", "second"],
      });

      return Response.json({
        model: "all-minilm",
        embeddings: [
          [1, 0, 0, 0],
          [0, 1, 0, 0],
        ],
      });
    };

    const embeddings = await createEmbeddings(["first", "second"], {
      embeddingProvider: "ollama",
      embeddingModel: "all-minilm",
    });

    assert.equal(embeddings.length, 2);
    assert.equal(embeddings[0].length, 4);
  });

  it("uses embedding env defaults when explicit settings are absent", () => {
    process.env.BATUK_EMBEDDING_PROVIDER = "llamaindex-ollama";
    process.env.BATUK_EMBEDDING_MODEL = "custom-embed";

    assert.deepEqual(normalizeEmbeddingSettings({}), {
      embeddingProvider: "llamaindex-ollama",
      embeddingModel: "custom-embed",
    });
  });
});
