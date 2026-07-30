import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeQdrantCollectionName, normalizeQdrantUrl, qdrantPointId } from "../../lib/rag-qdrant.js";

describe("Qdrant RAG helpers", () => {
  it("normalizes Qdrant Cloud URLs", () => {
    assert.equal(normalizeQdrantUrl("https://example.cloud.qdrant.io///"), "https://example.cloud.qdrant.io");
  });

  it("normalizes Qdrant collection names", () => {
    assert.equal(normalizeQdrantCollectionName("Batuk Docs!*"), "batuk_docs");
    assert.equal(normalizeQdrantCollectionName(""), "batuk_documents");
  });

  it("creates deterministic UUID point ids from document chunk ids", () => {
    const first = qdrantPointId("doc-1-chunk-0");
    const second = qdrantPointId("doc-1-chunk-0");

    assert.equal(first, second);
    assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
