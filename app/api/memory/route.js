import { archiveMemory, createMemory, listMemories, updateMemory } from "@/lib/memory-store";
import { json } from "@/lib/chat-request";
import { requireServerSession } from "@/lib/auth-session";

export const runtime = "nodejs";

function getUserId(session) {
  return session?.user?.id;
}

export async function GET() {
  try {
    const { session, response } = await requireServerSession();
    if (response) return response;

    const memories = await listMemories(getUserId(session));
    return json({ memories });
  } catch (error) {
    return json({ error: error.message || "Unexpected memory server error." }, 500);
  }
}

export async function POST(request) {
  try {
    const { session, response } = await requireServerSession();
    if (response) return response;

    const body = await request.json();
    const memory = await createMemory({
      userId: getUserId(session),
      content: body.content,
      sourceChatId: body.sourceChatId,
      tags: body.tags,
    });
    const memories = await listMemories(getUserId(session));

    return json({ memory, memories });
  } catch (error) {
    return json({ error: error.message || "Unexpected memory server error." }, 400);
  }
}

export async function PATCH(request) {
  try {
    const { session, response } = await requireServerSession();
    if (response) return response;

    const body = await request.json();
    const memory = await updateMemory({
      userId: getUserId(session),
      memoryId: body.id,
      content: body.content,
      status: body.status,
    });
    const memories = await listMemories(getUserId(session));

    return json({ memory, memories });
  } catch (error) {
    return json({ error: error.message || "Unexpected memory server error." }, 400);
  }
}

export async function DELETE(request) {
  try {
    const { session, response } = await requireServerSession();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get("id");
    const memory = await archiveMemory({ userId: getUserId(session), memoryId });
    const memories = await listMemories(getUserId(session));

    return json({ memory, memories });
  } catch (error) {
    return json({ error: error.message || "Unexpected memory server error." }, 400);
  }
}
