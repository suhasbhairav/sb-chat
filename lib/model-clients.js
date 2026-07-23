export function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

const ANTHROPIC_VERSION = "2023-06-01";
const CLAUDE_MAX_TOKENS = 4096;

function normalizeUsage({ inputTokens = 0, outputTokens = 0, totalTokens = null, source = "provider" } = {}) {
  const input = Number(inputTokens || 0);
  const output = Number(outputTokens || 0);

  return {
    inputTokens: input,
    outputTokens: output,
    totalTokens: Number(totalTokens ?? input + output),
    source,
  };
}

function anthropicHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "anthropic-version": ANTHROPIC_VERSION,
    "x-api-key": apiKey,
  };
}

function messagesToClaudePayload(messages) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .filter(Boolean)
    .join("\n\n");
  const chatMessages = [];

  messages
    .filter((message) => message.role !== "system")
    .forEach((message) => {
      const role = message.role === "assistant" ? "assistant" : "user";
      const content = String(message.content || "");
      const previous = chatMessages.at(-1);

      if (previous?.role === role) {
        previous.content += `\n\n${content}`;
        return;
      }

      chatMessages.push({ role, content });
    });

  return { messages: chatMessages, system };
}

function buildOpenAICompatibleBody({ provider, model, messages, temperature, stream = false }) {
  const body = {
    model,
    messages,
    stream,
  };

  if (stream && provider !== "sarvam") {
    body.stream_options = { include_usage: true };
  }

  if (temperature !== 1 || provider !== "openai") {
    body.temperature = temperature;
  }

  return body;
}

function messagesToResponsesInput(messages) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content || ""),
    }));
}

function messagesToResponsesInstructions(messages) {
  return messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .filter(Boolean)
    .join("\n\n");
}

function uniqueCitations(annotations) {
  const seen = new Set();
  return annotations
    .map((annotation) => annotation.url_citation || annotation)
    .filter((citation) => citation?.url)
    .filter((citation) => {
      if (seen.has(citation.url)) return false;
      seen.add(citation.url);
      return true;
    });
}

function appendCitations(message, annotations) {
  const citations = uniqueCitations(annotations);
  if (!citations.length) return message;

  const sources = citations
    .map((citation, index) => {
      const title = citation.title || citation.url;
      return `${index + 1}. [${title}](${citation.url})`;
    })
    .join("\n");

  return `${message.trim()}\n\n**Sources**\n${sources}`;
}

function openAICompatibleHeaders({ apiKey, provider }) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  if (provider === "sarvam" && apiKey) {
    headers["api-subscription-key"] = apiKey;
  }

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "http://localhost:3000";
    headers["X-Title"] = "SB AI Chat";
  }

  return headers;
}

export async function streamOpenAIWebSearch({ baseUrl, apiKey, model, messages, onToken }) {
  const body = {
    model,
    input: messagesToResponsesInput(messages),
    stream: true,
    tool_choice: "auto",
    tools: [
      {
        type: "web_search",
        search_context_size: "medium",
      },
    ],
  };
  const instructions = messagesToResponsesInstructions(messages);

  if (instructions) {
    body.instructions = instructions;
  }

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: openAICompatibleHeaders({ apiKey, provider: "openai" }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || data.message || `OpenAI web search failed with status ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullMessage = "";
  let usage = normalizeUsage({ source: "openai-web-search" });
  const annotations = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event
        .split("\n")
        .find((item) => item.startsWith("data: "))
        ?.slice(6);

      if (!line || line === "[DONE]") continue;

      const data = JSON.parse(line);

      if (data.type === "response.output_text.delta" && data.delta) {
        fullMessage += data.delta;
        onToken(data.delta);
      }

      if (data.type === "response.output_text.annotation.added" && data.annotation) {
        annotations.push(data.annotation);
      }

      if (data.type === "response.completed" && data.response?.usage) {
        usage = normalizeUsage({
          inputTokens: data.response.usage.input_tokens,
          outputTokens: data.response.usage.output_tokens,
          totalTokens: data.response.usage.total_tokens,
          source: "openai-web-search",
        });
      }

      if (data.type === "error") {
        throw new Error(data.message || "OpenAI web search streaming failed.");
      }
    }
  }

  return {
    message: appendCitations(fullMessage, annotations),
    usage,
  };
}

function extractResponseText(data) {
  if (data.output_text) return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text" || content.type === "text")
    .map((content) => content.text)
    .filter(Boolean)
    .join("\n");
}

export async function callOllama({ baseUrl, model, messages, temperature }) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Ollama request failed with status ${response.status}.`);
  }

  return {
    message: data.message?.content || data.response || "",
    usage: normalizeUsage({
      inputTokens: data.prompt_eval_count,
      outputTokens: data.eval_count,
      totalTokens: Number(data.prompt_eval_count || 0) + Number(data.eval_count || 0),
      source: "ollama",
    }),
  };
}

export async function callOpenAICompatible({ provider, baseUrl, apiKey, model, messages, temperature }) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: openAICompatibleHeaders({ apiKey, provider }),
    body: JSON.stringify(buildOpenAICompatibleBody({ provider, model, messages, temperature })),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || data.message || `Chat completion failed with status ${response.status}.`);
  }

  return {
    message: data.choices?.[0]?.message?.content || "",
    usage: normalizeUsage({
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      source: provider,
    }),
  };
}

export async function callClaude({ baseUrl, apiKey, model, messages, temperature }) {
  const claudePayload = messagesToClaudePayload(messages);
  const body = {
    model,
    max_tokens: CLAUDE_MAX_TOKENS,
    messages: claudePayload.messages,
    temperature,
  };

  if (claudePayload.system) {
    body.system = claudePayload.system;
  }

  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: anthropicHeaders(apiKey),
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || `Claude request failed with status ${response.status}.`);
  }

  return {
    message: (data.content || []).filter((block) => block.type === "text").map((block) => block.text).join("\n"),
    usage: normalizeUsage({
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      source: "anthropic",
    }),
  };
}

export async function callXAI({ baseUrl, apiKey, model, messages, temperature }) {
  const body = {
    model,
    input: messagesToResponsesInput(messages),
    temperature,
  };
  const instructions = messagesToResponsesInstructions(messages);

  if (instructions) {
    body.instructions = instructions;
  }

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: openAICompatibleHeaders({ apiKey, provider: "xai" }),
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || data.message || `Grok request failed with status ${response.status}.`);
  }

  return {
    message: extractResponseText(data),
    usage: normalizeUsage({
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      totalTokens: data.usage?.total_tokens,
      source: "xai",
    }),
  };
}

export async function streamOllama({ baseUrl, model, messages, temperature, onToken }) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: { temperature },
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Ollama request failed with status ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullMessage = "";
  let finalData = {};

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const data = JSON.parse(line);
      const token = data.message?.content || "";
      if (token) {
        fullMessage += token;
        onToken(token);
      }
      if (data.done) {
        finalData = data;
      }
    }
  }

  return {
    message: fullMessage,
    usage: normalizeUsage({
      inputTokens: finalData.prompt_eval_count,
      outputTokens: finalData.eval_count,
      totalTokens: Number(finalData.prompt_eval_count || 0) + Number(finalData.eval_count || 0),
      source: "ollama",
    }),
  };
}

export async function streamOpenAICompatible({ provider, baseUrl, apiKey, model, messages, temperature, onToken }) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: openAICompatibleHeaders({ apiKey, provider }),
    body: JSON.stringify(buildOpenAICompatibleBody({ provider, model, messages, temperature, stream: true })),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || data.message || `Chat completion failed with status ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullMessage = "";
  let usage = normalizeUsage({ source: provider });

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event
        .split("\n")
        .find((item) => item.startsWith("data: "))
        ?.slice(6);

      if (!line || line === "[DONE]") continue;

      const data = JSON.parse(line);
      const token = data.choices?.[0]?.delta?.content || "";
      if (token) {
        fullMessage += token;
        onToken(token);
      }
      if (data.usage) {
        usage = normalizeUsage({
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
          source: provider,
        });
      }
    }
  }

  return { message: fullMessage, usage };
}

export async function streamClaude({ baseUrl, apiKey, model, messages, temperature, onToken }) {
  const claudePayload = messagesToClaudePayload(messages);
  const body = {
    model,
    max_tokens: CLAUDE_MAX_TOKENS,
    messages: claudePayload.messages,
    stream: true,
    temperature,
  };

  if (claudePayload.system) {
    body.system = claudePayload.system;
  }

  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: anthropicHeaders(apiKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || `Claude request failed with status ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullMessage = "";
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event
        .split("\n")
        .find((item) => item.startsWith("data: "))
        ?.slice(6);

      if (!line) continue;

      const data = JSON.parse(line);

      if (data.type === "message_start") {
        inputTokens = data.message?.usage?.input_tokens || inputTokens;
        outputTokens = data.message?.usage?.output_tokens || outputTokens;
      }

      if (data.type === "content_block_delta" && data.delta?.type === "text_delta" && data.delta.text) {
        fullMessage += data.delta.text;
        onToken(data.delta.text);
      }

      if (data.type === "message_delta" && data.usage) {
        outputTokens = data.usage.output_tokens || outputTokens;
      }

      if (data.type === "error") {
        throw new Error(data.error?.message || "Claude streaming failed.");
      }
    }
  }

  return {
    message: fullMessage,
    usage: normalizeUsage({
      inputTokens,
      outputTokens,
      source: "anthropic",
    }),
  };
}

export async function streamXAI({ baseUrl, apiKey, model, messages, temperature, onToken }) {
  const body = {
    model,
    input: messagesToResponsesInput(messages),
    stream: true,
    temperature,
  };
  const instructions = messagesToResponsesInstructions(messages);

  if (instructions) {
    body.instructions = instructions;
  }

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: openAICompatibleHeaders({ apiKey, provider: "xai" }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || data.message || `Grok request failed with status ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullMessage = "";
  let usage = normalizeUsage({ source: "xai" });

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event
        .split("\n")
        .find((item) => item.startsWith("data: "))
        ?.slice(6);

      if (!line || line === "[DONE]") continue;

      const data = JSON.parse(line);

      if (data.type === "response.output_text.delta" && data.delta) {
        fullMessage += data.delta;
        onToken(data.delta);
      }

      if (data.type === "response.completed" && data.response?.usage) {
        usage = normalizeUsage({
          inputTokens: data.response.usage.input_tokens,
          outputTokens: data.response.usage.output_tokens,
          totalTokens: data.response.usage.total_tokens,
          source: "xai",
        });
      }

      if (data.type === "error") {
        throw new Error(data.message || data.error?.message || "Grok streaming failed.");
      }
    }
  }

  return { message: fullMessage, usage };
}

export async function streamModel(payload, onToken) {
  const baseUrl = normalizeBaseUrl(payload.baseUrl);

  if (payload.provider === "ollama") {
    return streamOllama({ ...payload, baseUrl, onToken });
  }

  if (payload.provider === "openai" && payload.webSearch) {
    return streamOpenAIWebSearch({ ...payload, baseUrl, onToken });
  }

  if (payload.provider === "anthropic") {
    return streamClaude({ ...payload, baseUrl, onToken });
  }

  if (payload.provider === "xai") {
    return streamXAI({ ...payload, baseUrl, onToken });
  }

  return streamOpenAICompatible({ ...payload, baseUrl, onToken });
}

export async function callModel(payload) {
  const baseUrl = normalizeBaseUrl(payload.baseUrl);

  if (payload.provider === "ollama") {
    return callOllama({ ...payload, baseUrl });
  }

  if (payload.provider === "anthropic") {
    return callClaude({ ...payload, baseUrl });
  }

  if (payload.provider === "xai") {
    return callXAI({ ...payload, baseUrl });
  }

  return callOpenAICompatible({ ...payload, baseUrl });
}
