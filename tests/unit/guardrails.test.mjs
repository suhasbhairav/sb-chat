import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blockedGuardrailResponse, buildSafeMessages, screenMessages } from "../../lib/guardrails.js";

describe("guardrails", () => {
  it("blocks likely secrets before they reach a model", () => {
    const screened = screenMessages([
      { role: "user", content: "Here is my api_key = abcdefghijklmnopqrstuvwxyz123456" },
    ]);

    assert.equal(screened.blocked, true);
    assert.match(screened.reason, /credential|secret/i);
    assert.match(blockedGuardrailResponse(screened).message, /guardrails/i);
  });

  it("removes unsafe roles and trims conversation history", () => {
    const messages = Array.from({ length: 45 }, (_, index) => ({
      role: index % 2 ? "assistant" : "user",
      content: `Message ${index}`,
    }));
    messages.push({ role: "tool", content: "Tool content must not be forwarded." });

    const safeMessages = buildSafeMessages(messages, true);

    assert.equal(safeMessages[0].role, "system");
    assert.equal(safeMessages.length, 41);
    assert.equal(safeMessages.some((message) => message.role === "tool"), false);
  });
});
