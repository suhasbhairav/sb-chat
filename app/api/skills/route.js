import { createSkill, deleteSkill, importSkillStore, readSkillStore, updateSkill } from "@/lib/skill-store";
import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";
import { recordRequestAudit, summarizeObject } from "@/lib/audit-utils";

export const runtime = "nodejs";

export async function GET() {
  const { response } = await requireServerPermission({ skill: ["read"] });
  if (response) return response;

  return json(await readSkillStore());
}

export async function POST(request) {
  try {
    const body = await request.json();
    const permission = body.action === "deleteSkill" ? { skill: ["delete"] } : body.action === "createSkill" || body.action === "importStore" ? { skill: ["create"] } : { skill: ["update"] };
    const { session, response } = await requireServerPermission(permission);
    if (response) return response;

    if (body.action === "createSkill") {
      const result = await createSkill(body.skill);
      await recordRequestAudit({ category: "automation", action: "skill.create", outcome: "success", actor: session.user, target: { type: "skill", id: result.skill?.id || body.skill?.id }, metadata: { input: summarizeObject(body.skill), result: summarizeObject(result.skill || result) } });
      return json(result);
    }

    if (body.action === "updateSkill") {
      const result = await updateSkill(body.skill);
      await recordRequestAudit({ category: "automation", action: "skill.update", outcome: "success", actor: session.user, target: { type: "skill", id: body.skill?.id }, metadata: { input: summarizeObject(body.skill), result: summarizeObject(result.skill || result) } });
      return json(result);
    }

    if (body.action === "deleteSkill") {
      const result = await deleteSkill(body.skillId);
      await recordRequestAudit({ category: "automation", action: "skill.delete", outcome: "success", actor: session.user, target: { type: "skill", id: body.skillId }, metadata: { result: summarizeObject(result) } });
      return json(result);
    }

    if (body.action === "importStore") {
      const result = await importSkillStore(body.store, body.mode);
      await recordRequestAudit({ category: "automation", action: "skill.import", outcome: "success", actor: session.user, target: { type: "skill_store", id: body.mode || "merge" }, metadata: { mode: body.mode, input: summarizeObject(body.store), result: summarizeObject(result) } });
      return json(result);
    }

    await recordRequestAudit({ category: "automation", action: body.action || "unsupported", outcome: "failure", actor: session.user, statusCode: 400, metadata: { reason: "Unsupported skill action" } });
    return json({ error: "Unsupported skill action." }, 400);
  } catch (error) {
    return json({ error: error.message || "Skill action failed." }, 500);
  }
}
