import { createSkill, deleteSkill, importSkillStore, readSkillStore, updateSkill } from "@/lib/skill-store";
import { json } from "@/lib/chat-request";
import { requireServerSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET() {
  const { response } = await requireServerSession();
  if (response) return response;

  return json(await readSkillStore());
}

export async function POST(request) {
  try {
    const { response } = await requireServerSession();
    if (response) return response;

    const body = await request.json();

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
