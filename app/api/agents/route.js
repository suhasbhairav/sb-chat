import { createAgent, createWorkflow, deleteAgent, deleteWorkflow, readAgentStore, updateAgent, updateWorkflow } from "@/lib/agent-store";
import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET() {
  const { response } = await requireServerPermission({ agent: ["read"] });
  if (response) return response;

  return json(await readAgentStore());
}

export async function POST(request) {
  try {
    const body = await request.json();
    const permission = body.action?.startsWith("delete") ? { agent: ["delete"] } : body.action?.startsWith("create") ? { agent: ["create"] } : { agent: ["update"] };
    const { response } = await requireServerPermission(permission);
    if (response) return response;

    if (body.action === "createAgent") {
      return json(await createAgent(body.agent));
    }

    if (body.action === "updateAgent") {
      return json(await updateAgent(body.agent));
    }

    if (body.action === "deleteAgent") {
      return json(await deleteAgent(body.agentId));
    }

    if (body.action === "createWorkflow") {
      return json(await createWorkflow(body.workflow));
    }

    if (body.action === "updateWorkflow") {
      return json(await updateWorkflow(body.workflow));
    }

    if (body.action === "deleteWorkflow") {
      return json(await deleteWorkflow(body.workflowId));
    }

    return json({ error: "Unsupported agent action." }, 400);
  } catch (error) {
    return json({ error: error.message || "Agent action failed." }, 500);
  }
}
