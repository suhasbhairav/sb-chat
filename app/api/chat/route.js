import { blockedGuardrailResponse } from "@/lib/guardrails";
import { streamModel } from "@/lib/model-clients";
import { json, prepareChatRequest, validateChatPayload } from "@/lib/chat-request";
import { appendDocumentSources, retrieveDocumentContext } from "@/lib/rag-embeddings";
import { recordTokenUsage } from "@/lib/token-usage-store";
import { requireServerPermission } from "@/lib/auth-session";
import { formatMemoriesForPrompt, listMemories } from "@/lib/memory-store";
import { formatSkillsForPrompt, listEnabledSkills } from "@/lib/skill-store";
import { formatMcpContextForPrompt, getActiveMcpIntegration } from "@/lib/mcp-store";
import { readMcpResource } from "@/lib/mcp-client";
import { withProductDataScope } from "@/lib/product-data-store";
import { resolveDocumentProductDataScope } from "@/lib/workspace-access";

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

async function readSelectedMcpResourceContext(integration) {
  const resources = (integration?.discovery?.resources || []).filter((resource) => resource.uri).slice(0, 3);
  if (!resources.length) return "";

  const reads = await Promise.allSettled(resources.map((resource) => readMcpResource(integration, resource.uri)));
  const blocks = reads.flatMap((result, index) => {
    if (result.status !== "fulfilled") return [];
    const contents = result.value?.contents || [];
    const text = contents
      .map((content) => content.text || content.blob || "")
      .filter(Boolean)
      .join("\n")
      .slice(0, 6000);
    return text ? [`Resource ${index + 1}: ${resources[index].name || resources[index].uri}\nURI: ${resources[index].uri}\n${text}`] : [];
  });

  return blocks.join("\n\n---\n\n");
}

export async function POST(request) {
  try {
    const { session, response } = await requireServerPermission({ model: ["connect"], chat: ["create"] });
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
    const enabledSkills = await listEnabledSkills();
    const skillsContext = formatSkillsForPrompt(enabledSkills);
    const memoryEnabled = payload.memoryEnabled !== false;
    const activeMemories = memoryEnabled ? await listMemories(session.user.id) : [];
    const memoryContext = formatMemoriesForPrompt(activeMemories);
    const activeMcpIntegration = payload.mcpIntegrationId ? await getActiveMcpIntegration(payload.mcpIntegrationId) : null;
    const mcpContext = formatMcpContextForPrompt(activeMcpIntegration);
    const mcpResourceContext = await readSelectedMcpResourceContext(activeMcpIntegration).catch(() => "");

    if (mcpContext) {
      modelRequest = {
        ...modelRequest,
        messages: [
          {
            role: "system",
            content:
              "An MCP product is selected for this chat. Use the discovered tools, resources, and prompts below as product context. Be precise about what is available and do not invent unseen external data.\n\n" +
              mcpContext +
              (mcpResourceContext ? "\n\nReadable MCP resource context:\n\n" + mcpResourceContext : ""),
          },
          ...modelRequest.messages,
        ],
      };
    }

    if (skillsContext) {
      modelRequest = {
        ...modelRequest,
        messages: [
          {
            role: "system",
            content:
              "Enabled skills are reusable workflows and instructions. Silently use one or more enabled skills when they are relevant to the user's request. Do not mention a skill unless the user asks or it helps explain your approach.\n\nEnabled skills:\n\n" +
              skillsContext,
          },
          ...modelRequest.messages,
        ],
      };
    }

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
      const documentScope = await resolveDocumentProductDataScope(session, payload.workspaceId);
      const retrieval = await withProductDataScope(documentScope, () =>
        retrieveDocumentContext(latestUserMessage, {
          scopeType: documentScope.scopeType,
          organizationId: documentScope.organizationId,
          userId: documentScope.userId,
          workspaceId: documentScope.workspaceId,
        }),
      );
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
              userId: session.user.id,
              userEmail: session.user.email,
              chatId: payload.chatId,
              workspaceId: payload.workspaceId,
              folderId: payload.folderId,
              provider: modelRequest.provider,
              model: modelRequest.model,
              temporary: Boolean(payload.temporary),
              ...usage,
              source: "chat",
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
