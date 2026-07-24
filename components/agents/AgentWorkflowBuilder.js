"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bot, CopyPlus, FileText, GripVertical, Play, Plus, RefreshCw, Save, Trash2, Workflow, X } from "lucide-react";
import { makeId } from "@/lib/chat-utils";
import { useI18n } from "@/components/i18n/I18nProvider";

function defaultAgent(index = 1) {
  return {
    id: makeId(),
    name: `Agent ${index}`,
    prompt: index === 1
      ? "Read the user input and attached documents. Extract the key facts, constraints, and goals."
      : "Use the previous agent output to produce the next useful workflow result.",
  };
}

function defaultWorkflow(index = 1) {
  return {
    id: null,
    name: `Workflow ${index}`,
    description: "Describe what this workflow automates.",
    agents: [defaultAgent(1), defaultAgent(2)],
  };
}

export function AgentWorkflowBuilder({
  apiKey,
  baseUrl,
  guardrails,
  model,
  provider,
  temperature,
  onClose,
  onWorkflowComplete,
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState("library");
  const [savedAgents, setSavedAgents] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [workflowDraft, setWorkflowDraft] = useState(defaultWorkflow(1));
  const [workflowSearchQuery, setWorkflowSearchQuery] = useState("");
  const [savedAgentSearchQuery, setSavedAgentSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [trace, setTrace] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const agents = workflowDraft.agents || [];
  const isRunning = status === "running";
  const hasWorkflowInput = input.trim() || files.length > 0;
  const canRun = hasWorkflowInput && agents.length && agents.every((agent) => agent.prompt.trim()) && !isRunning;
  const disabledReason = !hasWorkflowInput
    ? t("agents.needsInput")
    : agents.some((agent) => !agent.prompt.trim())
      ? t("agents.needsPrompts")
      : "";
  const finalOutput = trace.at(-1)?.output || "";
  const flowStats = useMemo(
    () => ({
      agents: agents.length,
      docs: files.length,
    }),
    [agents.length, files.length],
  );
  const filteredWorkflows = useMemo(() => {
    const query = workflowSearchQuery.trim().toLowerCase();
    if (!query) return workflows;
    return workflows.filter((workflow) => String(workflow.name || "").toLowerCase().includes(query));
  }, [workflowSearchQuery, workflows]);
  const filteredSavedAgents = useMemo(() => {
    const query = savedAgentSearchQuery.trim().toLowerCase();
    if (!query) return savedAgents;
    return savedAgents.filter((agent) => String(agent.name || "").toLowerCase().includes(query));
  }, [savedAgentSearchQuery, savedAgents]);

  async function loadDashboard() {
    try {
      const response = await fetch("/api/agents");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load workflows.");
      setSavedAgents(data.agents || []);
      setWorkflows(data.workflows || []);
      if (data.workflows?.[0]) setWorkflowDraft(data.workflows[0]);
      setStatus("idle");
    } catch (loadError) {
      setError(loadError.message || "Could not load workflows.");
      setStatus("error");
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadDashboard();
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  async function dashboardAction(action, payload = {}) {
    const response = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Workflow action failed.");

    setSavedAgents(data.store?.agents || []);
    setWorkflows(data.store?.workflows || []);
    return data;
  }

  function openWorkflow(workflow) {
    setWorkflowDraft({
      ...workflow,
      agents: workflow.agents?.length ? workflow.agents : [defaultAgent(1)],
    });
    setTrace([]);
    setError("");
    setTab("builder");
  }

  function createNewWorkflow() {
    setWorkflowDraft(defaultWorkflow(workflows.length + 1));
    setTrace([]);
    setError("");
    setTab("builder");
  }

  function updateWorkflowDraft(updates) {
    setWorkflowDraft((current) => ({ ...current, ...updates }));
  }

  function updateAgent(id, updates) {
    updateWorkflowDraft({
      agents: agents.map((agent) => (agent.id === id ? { ...agent, ...updates } : agent)),
    });
  }

  function addDraftAgent() {
    updateWorkflowDraft({ agents: agents.concat(defaultAgent(agents.length + 1)) });
  }

  function addSavedAgentToWorkflow(agentId) {
    const savedAgent = savedAgents.find((agent) => agent.id === agentId) || savedAgents[0];
    if (!savedAgent) return;

    updateWorkflowDraft({
      agents: agents.concat({
        id: makeId(),
        savedAgentId: savedAgent.id,
        name: savedAgent.name,
        description: savedAgent.description || "",
        prompt: savedAgent.prompt,
      }),
    });
  }

  function deleteAgent(id) {
    if (agents.length <= 1) return;
    updateWorkflowDraft({ agents: agents.filter((agent) => agent.id !== id) });
  }

  function moveAgent(id, direction) {
    const index = agents.findIndex((agent) => agent.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= agents.length) return;
    const next = [...agents];
    const [agent] = next.splice(index, 1);
    next.splice(nextIndex, 0, agent);
    updateWorkflowDraft({ agents: next });
  }

  function pickFiles(event) {
    setFiles(Array.from(event.target.files || []));
  }

  async function saveWorkflow() {
    if (!workflowDraft.name?.trim() || !agents.length || agents.some((agent) => !agent.prompt.trim())) {
      setError(t("agents.needsWorkflowFields"));
      return;
    }

    try {
      const action = workflowDraft.id && workflows.some((workflow) => workflow.id === workflowDraft.id) ? "updateWorkflow" : "createWorkflow";
      const data = await dashboardAction(action, { workflow: workflowDraft });
      setWorkflowDraft(data.workflow);
      setError("");
    } catch (saveError) {
      setError(saveError.message || "Could not save workflow.");
    }
  }

  async function deleteWorkflow(workflow) {
    if (!workflow) return;
    if (!window.confirm(t("agents.deleteWorkflowConfirm"))) return;

    try {
      const data = await dashboardAction("deleteWorkflow", { workflowId: workflow.id });
      const nextWorkflow = data.store.workflows[0] || defaultWorkflow(1);
      setWorkflowDraft(nextWorkflow);
      setTab("library");
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete workflow.");
    }
  }

  async function runWorkflow() {
    setStatus("running");
    setError("");
    setTrace([]);

    const formData = new FormData();
    formData.append("provider", provider);
    formData.append("baseUrl", baseUrl);
    formData.append("model", model);
    formData.append("apiKey", apiKey);
    formData.append("temperature", String(temperature));
    formData.append("guardrails", String(guardrails));
    formData.append("input", input.trim() || "Use the attached documents as the workflow input.");
    formData.append("agents", JSON.stringify(agents));
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/agent-workflow", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Agent workflow failed.");

      setTrace(data.trace || []);
      onWorkflowComplete({
        output: data.output,
        trace: data.trace || [],
        agents,
      });
      setStatus("idle");
    } catch (workflowError) {
      setError(workflowError.message || "Agent workflow failed.");
      setStatus("error");
    }
  }

  return (
    <section className="agent-builder-screen">
      <header className="agent-builder-header">
        <div className="agent-builder-title-row">
          <button className="secondary-button compact" onClick={onClose} type="button">
            <ArrowLeft size={16} />
            {t("agents.backToChat")}
          </button>
          <div>
            <p>{t("agents.eyebrow")}</p>
            <h1>{t("agents.title")}</h1>
            <span>{provider} · {model}</span>
          </div>
        </div>
        <button className="top-icon" onClick={onClose} title={t("agents.close")} type="button">
          <X size={20} />
        </button>
      </header>

      <nav className="agent-tabs" aria-label={t("agents.tabs")}>
        <button className={tab === "library" ? "active" : ""} onClick={() => setTab("library")} type="button">
          {t("agents.workflowLibrary")}
        </button>
        <button className={tab === "builder" ? "active" : ""} onClick={() => setTab("builder")} type="button">
          {t("agents.builderTab")}
        </button>
      </nav>

      {tab === "library" ? (
        <section className="workflow-library-screen">
          <div className="workflow-library-head">
            <div>
              <h2>{t("agents.workflowLibrary")}</h2>
              <p>{t("agents.workflowLibraryCopy")}</p>
            </div>
            <div className="library-head-actions">
              <input
                aria-label={t("agents.searchWorkflows")}
                className="field agent-search-field"
                onChange={(event) => setWorkflowSearchQuery(event.target.value)}
                placeholder={t("agents.searchWorkflows")}
                type="search"
                value={workflowSearchQuery}
              />
              <button className="new-workflow-button" onClick={createNewWorkflow} type="button">
                <Plus size={18} />
                {t("agents.newWorkflow")}
              </button>
            </div>
          </div>

          <div className="workflow-card-grid">
            {filteredWorkflows.map((workflow) => (
              <article className="workflow-card" key={workflow.id}>
                <button onClick={() => openWorkflow(workflow)} type="button">
                  <Workflow size={22} />
                  <span>
                    <strong>{workflow.name}</strong>
                    <small>{workflow.description || t("agents.noDescription")}</small>
                  </span>
                </button>
                <div>
                  <span>{t("agents.agentCount", { count: workflow.agents?.length || 0 })}</span>
                  <button className="top-icon danger-icon" onClick={() => deleteWorkflow(workflow)} title={t("agents.deleteWorkflow")} type="button">
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
            {!workflows.length && (
              <div className="empty-documents">
                <Workflow size={28} />
                <strong>{t("agents.noWorkflows")}</strong>
                <span>{t("agents.noWorkflowsCopy")}</span>
              </div>
            )}
            {workflows.length > 0 && !filteredWorkflows.length && (
              <div className="empty-documents">
                <Workflow size={28} />
                <strong>{t("agents.noSearchResults")}</strong>
                <span>{t("agents.noSearchResultsCopy")}</span>
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="agent-builder-grid two-tab-builder">
          <section className="agent-editor-panel">
            <div className="agent-input-card">
              <div className="setting-title">
                <h3>{t("agents.workflowDetails")}</h3>
                <p>{t("agents.workflowDetailsCopy")}</p>
              </div>
              <label className="field-label" htmlFor="workflowName">{t("agents.workflowName")}</label>
              <input
                id="workflowName"
                className="field"
                onChange={(event) => updateWorkflowDraft({ name: event.target.value })}
                value={workflowDraft.name || ""}
              />
              <label className="field-label" htmlFor="workflowDescription">{t("agents.description")}</label>
              <input
                id="workflowDescription"
                className="field"
                onChange={(event) => updateWorkflowDraft({ description: event.target.value })}
                value={workflowDraft.description || ""}
              />
              <div className="agent-crud-actions horizontal">
                <button className="agent-save-button" onClick={saveWorkflow} type="button">
                  <Save size={16} />
                  {t("agents.saveWorkflow")}
                </button>
                <button className="agent-back-button" onClick={() => setTab("library")} type="button">
                  {t("agents.backToLibrary")}
                </button>
              </div>
            </div>

            <div className="agent-input-card">
              <div className="setting-title">
                <h3>{t("agents.workflowInput")}</h3>
                <p>{t("agents.workflowInputCopy")}</p>
              </div>
              <textarea
                className="field agent-textarea"
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("agents.workflowPlaceholder")}
                value={input}
              />
              <div className="agent-file-row">
                <button className="agent-doc-button" onClick={() => fileRef.current?.click()} type="button">
                  <FileText size={16} />
                  {t("agents.attachToAgentOne")}
                </button>
                <input
                  ref={fileRef}
                  accept=".pdf,.txt,.csv,.xls,.xlsx,.docx,.md,.json,.log"
                  multiple
                  onChange={pickFiles}
                  type="file"
                />
                <span>{files.length ? files.map((file) => file.name).join(", ") : t("agents.noFiles")}</span>
              </div>
            </div>

            <div className="agent-list-head">
              <div>
                <h2>{t("agents.agents")}</h2>
                <p>{t("agents.agentsCopy")}</p>
              </div>
              <div className="agent-list-actions">
                <button className="agent-add-button" onClick={addDraftAgent} type="button">
                  <Plus size={17} />
                  {t("agents.addDraftAgent")}
                </button>
                <input
                  aria-label={t("agents.searchSavedAgents")}
                  className="field agent-insert-select"
                  onChange={(event) => setSavedAgentSearchQuery(event.target.value)}
                  placeholder={t("agents.searchSavedAgents")}
                  type="search"
                  value={savedAgentSearchQuery}
                />
                <select className="field agent-insert-select" onChange={(event) => addSavedAgentToWorkflow(event.target.value)} value="">
                  <option value="">{t("agents.addSavedAgent")}</option>
                  {filteredSavedAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="agent-cards">
              {agents.map((agent, index) => (
                <article className="agent-card" key={agent.id}>
                  <div className="agent-card-top">
                    <div className="agent-step-icon">
                      <Bot size={18} />
                      <span>{index + 1}</span>
                    </div>
                    <input
                      className="agent-name-input"
                      onChange={(event) => updateAgent(agent.id, { name: event.target.value })}
                      value={agent.name}
                    />
                    <button className="top-icon" disabled={index === 0} onClick={() => moveAgent(agent.id, -1)} title={t("agents.moveUp")} type="button">
                      <GripVertical size={17} />
                    </button>
                    <button className="top-icon danger-icon" disabled={agents.length <= 1} onClick={() => deleteAgent(agent.id)} title={t("agents.deleteAgent")} type="button">
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <textarea
                    className="field agent-prompt"
                    onChange={(event) => updateAgent(agent.id, { prompt: event.target.value })}
                    value={agent.prompt}
                  />
                </article>
              ))}
            </div>
          </section>

          <aside className="agent-flow-panel">
            <div className="agent-run-card">
              <Workflow size={24} />
              <h2>{t("agents.visualizer")}</h2>
              <p>{t("agents.visualizerCopy", flowStats)}</p>
              <button className="primary-agent-button" disabled={!canRun} onClick={runWorkflow} type="button">
                {isRunning ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                {isRunning ? t("agents.running") : t("agents.runWorkflow")}
              </button>
              {!canRun && !isRunning && disabledReason && <p className="settings-hint">{disabledReason}</p>}
              {error && <p className="settings-error">{error}</p>}
            </div>

            <div className="agent-flow-list">
              {agents.map((agent, index) => (
                <div className="agent-flow-node" key={agent.id}>
                  <div>
                    <span>{index + 1}</span>
                    <strong>{agent.name || `Agent ${index + 1}`}</strong>
                  </div>
                  {index < agents.length - 1 && <i aria-hidden="true" />}
                </div>
              ))}
            </div>

            <div className="agent-output-card">
              <h3>{t("agents.latestOutput")}</h3>
              <div className="agent-output-scroll">
                {trace.length ? (
                  trace.map((step, index) => (
                    <section key={step.id || index}>
                      <strong>{step.name}</strong>
                      <p>{step.output}</p>
                    </section>
                  ))
                ) : (
                  <p>{t("agents.noTrace")}</p>
                )}
              </div>
              {finalOutput && <small>{t("agents.sentToChat")}</small>}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
