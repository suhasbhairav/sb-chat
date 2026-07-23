export function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeMessages(messages = [], scope = "message") {
  const seen = new Set();

  return messages.map((message, index) => {
    const baseId = message.id || `${scope}-${index}-${String(message.role || "message")}-${String(message.content || "").slice(0, 24)}`;
    let id = baseId;
    let counter = 1;

    while (seen.has(id)) {
      id = `${baseId}-${counter}`;
      counter += 1;
    }

    seen.add(id);

    return {
      ...message,
      id,
      role: message.role || "assistant",
      content: String(message.content || ""),
    };
  });
}

export function sanitizeMessages(messages) {
  return normalizeMessages(messages)
    .filter((message) => message.role !== "error" && !message.pending)
    .map(({ role, content }) => ({ role, content }));
}

export function getChatTitle(messages, fallback = "Roman Concrete Durability") {
  const firstUser = messages.find((message) => message.role === "user")?.content;
  return firstUser ? firstUser.slice(0, 34) : fallback;
}

export function sanitizeBaseUrlForStorage(baseUrl = "") {
  const value = String(baseUrl || "").trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.split(/[?#]/)[0].trim();
  }
}

export function exportChatFile({ provider, baseUrl, model, guardrails, messages }) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          provider,
          baseUrl: sanitizeBaseUrlForStorage(baseUrl),
          model,
          guardrails,
          messages,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sb-chat-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
