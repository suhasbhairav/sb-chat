import { createSkill, deleteSkill, importSkillStore, readSkillStore, updateSkill } from "@/lib/skill-store";
import { json } from "@/lib/chat-request";
import { requireServerPermission } from "@/lib/auth-session";

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
    const { response } = await requireServerPermission(permission);
    if (response) return response;

    if (body.action === "createSkill") {
      return json(await createSkill(body.skill));
    }

    if (body.action === "updateSkill") {
      return json(await updateSkill(body.skill));
    }

    if (body.action === "deleteSkill") {
      return json(await deleteSkill(body.skillId));
    }

    if (body.action === "importStore") {
      return json(await importSkillStore(body.store, body.mode));
    }

    return json({ error: "Unsupported skill action." }, 400);
  } catch (error) {
    return json({ error: error.message || "Skill action failed." }, 500);
  }
}
