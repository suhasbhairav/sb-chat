import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getChatTitle, normalizeMessages, sanitizeBaseUrlForStorage, sanitizeMessages } from "../../lib/chat-utils.js";

describe("chat utilities", () => {
  it("creates stable unique message ids", () => {
    const messages = normalizeMessages([
      { id: "same", role: "user", content: "Hello" },
      { id: "same", role: "assistant", content: "Hi" },
    ]);

    assert.equal(messages[0].id, "same");
    assert.equal(messages[1].id, "same-1");
  });

  it("sanitizes messages before storage or export", () => {
    const messages = sanitizeMessages([
      { role: "user", content: "Keep me", attachments: [{ name: "a.txt", text: "x".repeat(20000) }] },
      { role: "error", content: "Drop me" },
      { role: "assistant", content: "Pending", pending: true },
    ]);

    assert.equal(messages.length, 1);
    assert.equal(messages[0].attachments[0].text.length, 12000);
  });

  it("removes query strings and hashes from stored base URLs", () => {
    assert.equal(sanitizeBaseUrlForStorage("https://example.com/v1?token=secret#hash"), "https://example.com/v1");
  });

  it("uses the first user message as a compact chat title", () => {
    assert.equal(getChatTitle([{ role: "user", content: "Enterprise deployment checklist" }]), "Enterprise deployment checklist");
  });
});
