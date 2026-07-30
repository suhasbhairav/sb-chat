import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeSupabaseBucket,
  normalizeSupabaseChunksTable,
  normalizeSupabaseMatchFunction,
  supabaseStoragePath,
} from "../../lib/rag-supabase.js";

describe("Supabase RAG helpers", () => {
  it("normalizes table and RPC identifiers", () => {
    assert.equal(normalizeSupabaseChunksTable("batuk chunks;drop table users"), "batukchunksdroptableusers");
    assert.equal(normalizeSupabaseMatchFunction("match-batuk-docs()"), "matchbatukdocs");
    assert.equal(normalizeSupabaseBucket("private-documents"), "private-documents");
  });

  it("builds organization and user scoped storage paths", () => {
    const path = supabaseStoragePath({
      organizationId: "org/one",
      userId: "user@example.com",
      scopeType: "personal",
      documentId: "doc 1",
      storedName: "report final.pdf",
    });

    assert.equal(path, "organizations/org-one/user/user-example.com/documents/doc-1/report-final.pdf");
  });

  it("builds organization and workspace scoped storage paths", () => {
    const path = supabaseStoragePath({
      organizationId: "org",
      userId: "ignored-user",
      workspaceId: "workspace 1",
      scopeType: "workspace",
      documentId: "doc",
      storedName: "source.csv",
    });

    assert.equal(path, "organizations/org/workspace/workspace-1/documents/doc/source.csv");
  });
});
