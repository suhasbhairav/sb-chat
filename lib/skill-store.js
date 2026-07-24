import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeId } from "@/lib/chat-utils";

const STORE_PATH = path.join(process.cwd(), "data", "skill-store.json");
const MAX_ENABLED_SKILLS = 12;

function now() {
  return new Date().toISOString();
}

function defaultStore() {
  const createdAt = now();
  return {
    version: 1,
    skills: [
      {
        id: "skill-writing-polish",
        name: "Writing polish",
        description: "Improve structure, clarity, and tone while preserving the user's intent.",
        instructions:
          "When a user asks for writing help, preserve their core meaning, tighten structure, remove filler, and explain only the most important edits. Keep the user's voice intact.",
        examples: "User: Rewrite this launch email.\nAssistant: Produce a sharper version and briefly note the main positioning changes.",
        resources: "Preferred style: concise, specific, practical, no inflated claims.",
        enabled: true,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "skill-code-review",
        name: "Code review",
        description: "Review code for bugs, regressions, maintainability risks, and missing tests.",
        instructions:
          "When the user asks for review, lead with findings ordered by severity. Include file and line references when available. Focus on bugs, regressions, security issues, and test gaps before summaries.",
        examples: "User: Review this diff.\nAssistant: Findings first, then open questions, then a brief change summary.",
        resources: "Review stance: be concrete, concise, and evidence-based.",
        enabled: false,
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
}

function cleanSkill(skill = {}, existing = {}) {
  const timestamp = now();
  const enabled = typeof skill.enabled === "boolean" ? skill.enabled : existing.enabled !== false;
  const name = skill.name ?? existing.name ?? "Untitled skill";
  const description = skill.description ?? existing.description ?? "";
  const instructions = skill.instructions ?? existing.instructions ?? "";
  const examples = skill.examples ?? existing.examples ?? "";
  const resources = skill.resources ?? existing.resources ?? "";

  return {
    id: String(skill.id || existing.id || makeId()).slice(0, 120),
    name: String(name).trim().slice(0, 90) || "Untitled skill",
    description: String(description).trim().slice(0, 280),
    instructions: String(instructions).trim().slice(0, 12000),
    examples: String(examples).trim().slice(0, 8000),
    resources: String(resources).trim().slice(0, 12000),
    enabled,
    createdAt: existing.createdAt || skill.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeSkillStore(defaultStore());
  }
}

export async function readSkillStore() {
  await ensureStoreFile();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...defaultStore(),
      ...parsed,
      skills: Array.isArray(parsed.skills) ? parsed.skills.map((skill) => cleanSkill(skill, skill)) : defaultStore().skills,
    };
  } catch {
    const fresh = defaultStore();
    await writeSkillStore(fresh);
    return fresh;
  }
}

export async function writeSkillStore(store) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
  return store;
}

export async function createSkill(skill) {
  const store = await readSkillStore();
  const nextSkill = cleanSkill({ ...skill, id: makeId() });
  const nextStore = {
    ...store,
    skills: [nextSkill, ...store.skills],
  };
  await writeSkillStore(nextStore);
  return { store: nextStore, skill: nextSkill };
}

export async function updateSkill(skill) {
  const store = await readSkillStore();
  const existing = store.skills.find((item) => item.id === skill.id);
  if (!existing) throw new Error("Skill not found.");

  const nextSkill = cleanSkill(skill, existing);
  const nextStore = {
    ...store,
    skills: store.skills.map((item) => (item.id === nextSkill.id ? nextSkill : item)),
  };
  await writeSkillStore(nextStore);
  return { store: nextStore, skill: nextSkill };
}

export async function deleteSkill(skillId) {
  const store = await readSkillStore();
  const nextStore = {
    ...store,
    skills: store.skills.filter((skill) => skill.id !== skillId),
  };
  await writeSkillStore(nextStore);
  return { store: nextStore };
}

export async function importSkillStore(imported, mode = "merge") {
  const store = await readSkillStore();
  const source = imported?.store || imported || {};
  const incoming = Array.isArray(source.skills) ? source.skills.map((skill) => cleanSkill(skill, skill)) : [];

  if (!incoming.length) {
    throw new Error("Import file must contain at least one skill.");
  }

  const nextSkills =
    mode === "replace"
      ? incoming
      : [
          ...incoming,
          ...store.skills.filter((existing) => !incoming.some((skill) => skill.id === existing.id)),
        ];

  const nextStore = {
    version: 1,
    skills: nextSkills,
  };

  await writeSkillStore(nextStore);
  return { store: nextStore };
}

export async function listEnabledSkills() {
  const store = await readSkillStore();
  return store.skills.filter((skill) => skill.enabled && skill.instructions.trim()).slice(0, MAX_ENABLED_SKILLS);
}

export function formatSkillsForPrompt(skills = []) {
  if (!skills.length) return "";

  return skills
    .map((skill, index) => {
      const sections = [
        `Skill ${index + 1}: ${skill.name}`,
        skill.description ? `Purpose: ${skill.description}` : "",
        `Instructions:\n${skill.instructions}`,
        skill.examples ? `Examples:\n${skill.examples}` : "",
        skill.resources ? `Supporting resources:\n${skill.resources}` : "",
      ].filter(Boolean);

      return sections.join("\n");
    })
    .join("\n\n---\n\n");
}
