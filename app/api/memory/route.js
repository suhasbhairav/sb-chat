import { archiveMemory, createMemory, listMemories, updateMemory } from "@/lib/memory-store";
import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { recordRequestAudit, summarizeText } from "@/lib/audit-utils";

export const runtime = "nodejs";

function getUserId(session) {
  return session?.user?.id;
}

export async function GET() {
  try {
    const { session, response } = await requireServerPermission({ memory: ["read"] });
    if (response) return response;

    const memories = await listMemories(getUserId(session));
    return json({ memories });
  } catch (error) {
    return json({ error: error.message || "Unexpected memory server error." }, 500);
  }
}

export async function POST(request) {
  try {
    const { session, response } = await requireServerPermission({ memory: ["create"] });
    if (response) return response;

    const body = await request.json();
    const memory = await createMemory({
      userId: getUserId(session),
      content: body.content,
      sourceChatId: body.sourceChatId,
      tags: body.tags,
    });
    const memories = await listMemories(getUserId(session));
    await recordRequestAudit({
      category: "privacy",
      action: "memory.create",
      outcome: "success",
      actor: session.user,
      target: { type: "memory", id: memory.id },
      metadata: { content: summarizeText(body.content), sourceChatId: body.sourceChatId || null, tags: body.tags || [] },
    });

    return json({ memory, memories });
  } catch (error) {
    return json({ error: error.message || "Unexpected memory server error." }, 400);
  }
}

export async function PATCH(request) {
  try {
    const { session, response } = await requireServerPermission({ memory: ["update"] });
    if (response) return response;

    const body = await request.json();
    const memory = await updateMemory({
      userId: getUserId(session),
      memoryId: body.id,
      content: body.content,
      status: body.status,
    });
    const memories = await listMemories(getUserId(session));
    await recordRequestAudit({
      category: "privacy",
      action: "memory.update",
      outcome: "success",
      actor: session.user,
      target: { type: "memory", id: body.id },
      metadata: { content: summarizeText(body.content), status: body.status || null },
    });

    return json({ memory, memories });
  } catch (error) {
    return json({ error: error.message || "Unexpected memory server error." }, 400);
  }
}

export async function DELETE(request) {
  try {
    const { session, response } = await requireServerPermission({ memory: ["delete"] });
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get("id");
    const memory = await archiveMemory({ userId: getUserId(session), memoryId });
    const memories = await listMemories(getUserId(session));
    await recordRequestAudit({
      category: "privacy",
      action: "memory.delete",
      outcome: "success",
      actor: session.user,
      target: { type: "memory", id: memoryId },
    });

    return json({ memory, memories });
  } catch (error) {
    return json({ error: error.message || "Unexpected memory server error." }, 400);
  }
}
