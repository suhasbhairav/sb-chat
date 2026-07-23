import { blockedGuardrailResponse } from "@/lib/guardrails";
import { streamModel } from "@/lib/model-clients";
import { json, prepareChatRequest, validateChatPayload } from "@/lib/chat-request";
import { appendDocumentSources, retrieveDocumentContext } from "@/lib/rag-embeddings";
import { recordTokenUsage } from "@/lib/token-usage-store";
import { requireServerSession } from "@/lib/auth-session";
import { formatMemoriesForPrompt, listMemories } from "@/lib/memory-store";

function encodeEvent(event) {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function ndjsonStream(start) {
  return new Response(new ReadableStream({ start }), {
    headers: ndjsonHeaders(),
  });
}

function ndjsonHeaders() {
  return {
    "Cache-Control": "no-cache, no-transform",
    "Content-Type": "application/x-ndjson; charset=utf-8",
  };
}

export async function POST(request) {
  try {
    const { session, response } = await requireServerSession();
    if (response) return response;

    const payload = await request.json();
    const validationError = validateChatPayload(payload);

    if (validationError) {
      return json({ error: validationError }, 400);
    }

    const chatRequest = prepareChatRequest(payload);

    if (chatRequest.screened.blocked) {
      return json(blockedGuardrailResponse(chatRequest.screened));
    }

    let documentSources = [];
    let modelRequest = chatRequest;
    const memoryEnabled = payload.memoryEnabled !== false;
    const activeMemories = memoryEnabled ? await listMemories(session.user.id) : [];
    const memoryContext = formatMemoriesForPrompt(activeMemories);

    if (memoryContext) {
      modelRequest = {
        ...modelRequest,
        messages: [
          {
            role: "system",
            content:
              "Persistent memory is enabled. Use these saved facts and preferences as lightweight user context when relevant. Do not mention memory unless it helps the answer.\n\nSaved memory:\n\n" +
              memoryContext,
          },
          ...modelRequest.messages,
        ],
      };
    }

    if (chatRequest.documentChat) {
      const latestUserMessage = [...payload.messages].reverse().find((message) => message.role === "user")?.content || "";
      const retrieval = await retrieveDocumentContext(latestUserMessage);
      documentSources = retrieval.sources;

      if (!retrieval.context) {
        return ndjsonStream((controller) => {
          const message =
            "Document Chat is enabled, but I could not find any indexed document chunks to answer from. Check the Documents page for failed uploads, re-upload the file, or switch Document Chat off for normal AI chat.";
          controller.enqueue(encodeEvent({ type: "token", token: message }));
          controller.enqueue(
            encodeEvent({
              type: "done",
              message,
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, source: "rag" },
              guardrails: { blocked: false, reason: null },
              documents: [],
            }),
          );
          controller.close();
        });
      }

      modelRequest = {
        ...modelRequest,
        messages: [
          {
            role: "system",
            content:
              "Document Chat is enabled. Answer only from the retrieved document context below. Cite document chunks with labels like [D1]. If the answer is not supported by the retrieved context, say: \"I could not find that in the indexed documents.\" Do not use outside knowledge.\n\nRetrieved document context:\n\n" +
              retrieval.context,
          },
          ...modelRequest.messages,
        ],
      };
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await streamModel(modelRequest, (token) => {
            controller.enqueue(encodeEvent({ type: "token", token }));
          });
          const usage = result.usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0, source: "provider" };
          const finalMessage = appendDocumentSources(result.message || "The model returned an empty response.", documentSources);

          if (usage.totalTokens > 0 || usage.inputTokens > 0 || usage.outputTokens > 0) {
            await recordTokenUsage({
              chatId: payload.chatId,
              workspaceId: payload.workspaceId,
              folderId: payload.folderId,
              provider: modelRequest.provider,
              model: modelRequest.model,
              temporary: Boolean(payload.temporary),
              ...usage,
            });
          }

          controller.enqueue(
            encodeEvent({
              type: "done",
              message: finalMessage,
              usage,
              guardrails: { blocked: false, reason: null },
              documents: documentSources,
            }),
          );
        } catch (error) {
          controller.enqueue(encodeEvent({ type: "error", error: error.message || "Unexpected chat server error." }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: ndjsonHeaders(),
    });
  } catch (error) {
    return json({ error: error.message || "Unexpected chat server error." }, 500);
  }
}
