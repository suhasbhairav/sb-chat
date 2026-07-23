import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeId } from "@/lib/chat-utils";

const STORE_PATH = path.join(process.cwd(), "data", "agent-store.json");

function now() {
  return new Date().toISOString();
}

function defaultStore() {
  const createdAt = now();
  return {
    version: 1,
    agents: [
      {
        id: "agent-researcher",
        name: "Researcher",
        description: "Extracts key facts, goals, and constraints from user input and attached documents.",
        prompt: "Read the user input and attached documents. Extract the key facts, constraints, risks, and goals. Produce a clear briefing for the next agent.",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "agent-synthesizer",
        name: "Synthesizer",
        description: "Turns upstream agent output into a concise final answer.",
        prompt: "Use the previous agent output to produce a polished, decision-ready response. Keep the answer specific and actionable.",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    workflows: [
      {
        id: "workflow-document-briefing",
        name: "Document briefing workflow",
        description: "Extract facts from an attached document, then synthesize the final answer.",
        agents: [
          {
            id: makeId(),
            name: "Researcher",
            prompt: "Read the user input and attached documents. Extract the key facts, constraints, risks, and goals. Produce a clear briefing for the next agent.",
          },
          {
            id: makeId(),
            name: "Synthesizer",
            prompt: "Use the previous agent output to produce a polished, decision-ready response. Keep the answer specific and actionable.",
          },
        ],
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
}

function cleanAgent(agent = {}, existing = {}) {
  const timestamp = now();
  return {
    id: String(agent.id || existing.id || makeId()).slice(0, 120),
    name: String(agent.name || existing.name || "Untitled agent").trim().slice(0, 80) || "Untitled agent",
    description: String(agent.description || existing.description || "").trim().slice(0, 240),
    prompt: String(agent.prompt || existing.prompt || "").trim().slice(0, 6000),
    createdAt: existing.createdAt || agent.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

function cleanWorkflow(workflow = {}, existing = {}) {
  const timestamp = now();
  const agents = Array.isArray(workflow.agents) ? workflow.agents : existing.agents || [];

  return {
    id: String(workflow.id || existing.id || makeId()).slice(0, 120),
    name: String(workflow.name || existing.name || "Untitled workflow").trim().slice(0, 90) || "Untitled workflow",
    description: String(workflow.description || existing.description || "").trim().slice(0, 280),
    agents: agents.slice(0, 12).map((agent, index) => ({
      id: String(agent.id || makeId()).slice(0, 120),
      savedAgentId: agent.savedAgentId ? String(agent.savedAgentId).slice(0, 120) : null,
      name: String(agent.name || `Agent ${index + 1}`).trim().slice(0, 80) || `Agent ${index + 1}`,
      description: String(agent.description || "").trim().slice(0, 240),
      prompt: String(agent.prompt || "").trim().slice(0, 6000),
    })),
    createdAt: existing.createdAt || workflow.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeAgentStore(defaultStore());
  }
}

export async function readAgentStore() {
  await ensureStoreFile();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...defaultStore(),
      ...parsed,
      agents: Array.isArray(parsed.agents) ? parsed.agents.map((agent) => cleanAgent(agent, agent)) : defaultStore().agents,
      workflows: Array.isArray(parsed.workflows) ? parsed.workflows.map((workflow) => cleanWorkflow(workflow, workflow)) : defaultStore().workflows,
    };
  } catch {
    const fresh = defaultStore();
    await writeAgentStore(fresh);
    return fresh;
  }
}

export async function writeAgentStore(store) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
  return store;
}

export async function createAgent(agent) {
  const store = await readAgentStore();
  const nextAgent = cleanAgent({ ...agent, id: makeId() });
  const nextStore = {
    ...store,
    agents: [nextAgent, ...store.agents],
  };
  await writeAgentStore(nextStore);
  return { store: nextStore, agent: nextAgent };
}

export async function updateAgent(agent) {
  const store = await readAgentStore();
  const existing = store.agents.find((item) => item.id === agent.id);
  if (!existing) throw new Error("Agent not found.");

  const nextAgent = cleanAgent(agent, existing);
  const nextStore = {
    ...store,
    agents: store.agents.map((item) => (item.id === nextAgent.id ? nextAgent : item)),
  };
  await writeAgentStore(nextStore);
  return { store: nextStore, agent: nextAgent };
}

export async function deleteAgent(agentId) {
  const store = await readAgentStore();
  const nextStore = {
    ...store,
    agents: store.agents.filter((agent) => agent.id !== agentId),
  };
  await writeAgentStore(nextStore);
  return { store: nextStore };
}

export async function createWorkflow(workflow) {
  const store = await readAgentStore();
  const nextWorkflow = cleanWorkflow({ ...workflow, id: makeId() });
  const nextStore = {
    ...store,
    workflows: [nextWorkflow, ...store.workflows],
  };
  await writeAgentStore(nextStore);
  return { store: nextStore, workflow: nextWorkflow };
}

export async function updateWorkflow(workflow) {
  const store = await readAgentStore();
  const existing = store.workflows.find((item) => item.id === workflow.id);
  if (!existing) throw new Error("Workflow not found.");

  const nextWorkflow = cleanWorkflow(workflow, existing);
  const nextStore = {
    ...store,
    workflows: store.workflows.map((item) => (item.id === nextWorkflow.id ? nextWorkflow : item)),
  };
  await writeAgentStore(nextStore);
  return { store: nextStore, workflow: nextWorkflow };
}

export async function deleteWorkflow(workflowId) {
  const store = await readAgentStore();
  const nextStore = {
    ...store,
    workflows: store.workflows.filter((workflow) => workflow.id !== workflowId),
  };
  await writeAgentStore(nextStore);
  return { store: nextStore };
}
