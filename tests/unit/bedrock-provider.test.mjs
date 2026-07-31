import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { messagesToBedrockPayload } from "../../lib/model-clients.js";
import { FALLBACK_BEDROCK_MODELS, PROVIDERS } from "../../lib/providers.js";

describe("AWS Bedrock provider", () => {
  it("registers Bedrock as an AWS-credential based provider", () => {
    assert.equal(PROVIDERS.bedrock.label, "AWS Bedrock");
    assert.equal(PROVIDERS.bedrock.needsKey, false);
    assert.equal(PROVIDERS.bedrock.defaultBaseUrl, "us-east-1");
    assert.equal(PROVIDERS.bedrock.defaultModel, "amazon.nova-lite-v1:0");
  });

  it("includes Bedrock model choice fallback models", () => {
    assert.equal(FALLBACK_BEDROCK_MODELS.some((model) => model.id.startsWith("amazon.nova")), true);
    assert.equal(FALLBACK_BEDROCK_MODELS.some((model) => model.category === "OpenAI on Bedrock"), true);
    assert.equal(FALLBACK_BEDROCK_MODELS.some((model) => model.category === "Qwen on Bedrock"), true);
  });

  it("converts system and chat messages into Converse payload blocks", () => {
    const payload = messagesToBedrockPayload([
      { role: "system", content: "You are precise." },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Summarize this.", attachments: [{ kind: "document", name: "note.txt", text: "Important context" }] },
    ]);

    assert.deepEqual(payload.system, [{ text: "You are precise." }]);
    assert.equal(payload.messages[0].role, "user");
    assert.equal(payload.messages[0].content[0].text, "Hello");
    assert.equal(payload.messages[1].role, "assistant");
    assert.match(payload.messages[2].content[0].text, /Uploaded file context/);
  });
});
