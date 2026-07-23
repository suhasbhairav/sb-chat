import { unlink } from "node:fs/promises";
import { json, resolveServerApiKey } from "@/lib/chat-request";
import { requireServerSession } from "@/lib/auth-session";
import { buildSafeMessages, screenMessages } from "@/lib/guardrails";
import { normalizeTemperatureForModel } from "@/lib/model-compatibility";
import { callModel } from "@/lib/model-clients";
import { extractDocumentText } from "@/lib/rag-processing";
import { saveUploadedDocumentFile } from "@/lib/rag-store";
import { recordTokenUsage } from "@/lib/token-usage-store";

export const runtime = "nodejs";

const MAX_AGENTS = 12;
const MAX_DOCUMENT_CONTEXT = 24000;

function cleanAgents(input) {
  const source = Array.isArray(input) ? input : [];
  return source.slice(0, MAX_AGENTS).map((agent, index) => ({
    id: String(agent.id || `agent-${index + 1}`).slice(0, 120),
    name: String(agent.name || `Agent ${index + 1}`).trim().slice(0, 80) || `Agent ${index + 1}`,
    prompt: String(agent.prompt || "").trim().slice(0, 4000),
  }));
}

function validateProviderKey(provider, apiKey) {
  const key = resolveServerApiKey(provider, apiKey);
  if (provider !== "ollama" && provider !== "custom" && !key) {
    throw new Error("This provider needs an API key. Add it in Settings or .env before running the workflow.");
  }
  return key;
}

async function extractAttachedDocuments(files) {
  const sections = [];

  for (const file of files) {
    const saved = await saveUploadedDocumentFile(file);

    try {
      const text = await extractDocumentText(saved.filePath, file.name);
      if (text) {
        sections.push(`# ${file.name}\n${text}`);
      }
    } finally {
      await unlink(saved.filePath).catch(() => {});
    }
  }

  return sections.join("\n\n---\n\n").slice(0, MAX_DOCUMENT_CONTEXT);
}

export async function POST(request) {
  try {
    const { response } = await requireServerSession();
    if (response) return response;

    const formData = await request.formData();
    const provider = String(formData.get("provider") || "ollama");
    const baseUrl = String(formData.get("baseUrl") || "");
    const model = String(formData.get("model") || "").trim();
    const apiKey = validateProviderKey(provider, formData.get("apiKey"));
    const temperature = normalizeTemperatureForModel(provider, model, formData.get("temperature"));
    const guardrails = formData.get("guardrails") === "true";
    const initialInput = String(formData.get("input") || "").trim();
    const agents = cleanAgents(JSON.parse(String(formData.get("agents") || "[]")));
    const files = formData.getAll("files").filter((file) => file?.name);

    if (!model) return json({ error: "Choose a model before running the workflow." }, 400);
    if (!baseUrl) return json({ error: "Choose a base URL before running the workflow." }, 400);
    if (!initialInput && !files.length) return json({ error: "Add workflow input or attach documents before running agents." }, 400);
    if (!agents.length) return json({ error: "Add at least one agent." }, 400);
    if (agents.some((agent) => !agent.prompt)) {
      return json({ error: "Every agent needs an instruction prompt." }, 400);
    }

    const documentContext = files.length ? await extractAttachedDocuments(files) : "";
    let currentInput = initialInput;
    const trace = [];
    const usageTotals = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    for (const [index, agent] of agents.entries()) {
      const userContent = [
        index === 0 && documentContext ? `Attached document context:\n\n${documentContext}` : "",
        `Input from ${index === 0 ? "workflow user" : agents[index - 1].name}:\n\n${currentInput}`,
      ].filter(Boolean).join("\n\n---\n\n");
      const rawMessages = [
        {
          role: "system",
          content:
            `You are ${agent.name}, one step in an enterprise AI agent workflow. Follow your instruction carefully, produce a useful output for the next agent, and do not invent missing document facts.\n\nAgent instruction:\n${agent.prompt}`,
        },
        {
          role: "user",
          content: userContent,
        },
      ];
      const screened = guardrails ? screenMessages(rawMessages) : { blocked: false, reason: null };

      if (screened.blocked) {
        throw new Error(`Guardrails blocked ${agent.name}: ${screened.reason}`);
      }

      const result = await callModel({
        provider,
        baseUrl,
        model,
        apiKey,
        temperature,
        messages: buildSafeMessages(rawMessages, guardrails),
      });
      const output = result.message || "";
      const usage = result.usage || {};

      usageTotals.inputTokens += Number(usage.inputTokens || 0);
      usageTotals.outputTokens += Number(usage.outputTokens || 0);
      usageTotals.totalTokens += Number(usage.totalTokens || 0);
      trace.push({
        id: agent.id,
        name: agent.name,
        prompt: agent.prompt,
        input: currentInput,
        output,
        usage,
      });
      currentInput = output;
    }

    if (usageTotals.totalTokens > 0 || usageTotals.inputTokens > 0 || usageTotals.outputTokens > 0) {
      await recordTokenUsage({
        provider,
        model,
        source: "agent-workflow",
        temporary: false,
        ...usageTotals,
      });
    }

    return json({
      output: currentInput,
      trace,
      documents: files.map((file) => file.name),
      usage: {
        ...usageTotals,
        source: "agent-workflow",
      },
    });
  } catch (error) {
    return json({ error: error.message || "Agent workflow failed." }, 500);
  }
}
