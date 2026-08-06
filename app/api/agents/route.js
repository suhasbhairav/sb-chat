import { createAgent, createWorkflow, deleteAgent, deleteWorkflow, readAgentStore, updateAgent, updateWorkflow } from "@/lib/agent-store";
import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { recordRequestAudit, summarizeObject } from "@/lib/audit-utils";

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
    const { session, response } = await requireServerPermission(permission);
    if (response) return response;

    if (body.action === "createAgent") {
      const result = await createAgent(body.agent);
      await recordRequestAudit({ category: "automation", action: "agent.create", outcome: "success", actor: session.user, target: { type: "agent", id: result.agent?.id || result.id }, metadata: { input: summarizeObject(body.agent), result: summarizeObject(result.agent || result) } });
      return json(result);
    }

    if (body.action === "updateAgent") {
      const result = await updateAgent(body.agent);
      await recordRequestAudit({ category: "automation", action: "agent.update", outcome: "success", actor: session.user, target: { type: "agent", id: body.agent?.id }, metadata: { input: summarizeObject(body.agent), result: summarizeObject(result.agent || result) } });
      return json(result);
    }

    if (body.action === "deleteAgent") {
      const result = await deleteAgent(body.agentId);
      await recordRequestAudit({ category: "automation", action: "agent.delete", outcome: "success", actor: session.user, target: { type: "agent", id: body.agentId }, metadata: { result: summarizeObject(result) } });
      return json(result);
    }

    if (body.action === "createWorkflow") {
      const result = await createWorkflow(body.workflow);
      await recordRequestAudit({ category: "automation", action: "workflow.create", outcome: "success", actor: session.user, target: { type: "workflow", id: result.workflow?.id || result.id }, metadata: { input: summarizeObject(body.workflow), result: summarizeObject(result.workflow || result) } });
      return json(result);
    }

    if (body.action === "updateWorkflow") {
      const result = await updateWorkflow(body.workflow);
      await recordRequestAudit({ category: "automation", action: "workflow.update", outcome: "success", actor: session.user, target: { type: "workflow", id: body.workflow?.id }, metadata: { input: summarizeObject(body.workflow), result: summarizeObject(result.workflow || result) } });
      return json(result);
    }

    if (body.action === "deleteWorkflow") {
      const result = await deleteWorkflow(body.workflowId);
      await recordRequestAudit({ category: "automation", action: "workflow.delete", outcome: "success", actor: session.user, target: { type: "workflow", id: body.workflowId }, metadata: { result: summarizeObject(result) } });
      return json(result);
    }

    await recordRequestAudit({ category: "automation", action: body.action || "unsupported", outcome: "failure", actor: session.user, statusCode: 400, metadata: { reason: "Unsupported agent action" } });
    return json({ error: "Unsupported agent action." }, 400);
  } catch (error) {
    return json({ error: error.message || "Agent action failed." }, 500);
  }
}
