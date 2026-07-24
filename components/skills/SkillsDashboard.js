"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, FileUp, Plus, Save, Sparkles, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

function defaultSkill(index = 1) {
  return {
    id: null,
    name: `Skill ${index}`,
    description: "Describe when Batuk should use this skill.",
    instructions: "Tell Batuk exactly how to perform this task consistently.",
    examples: "",
    resources: "",
    enabled: true,
  };
}

export function SkillsDashboard({ onClose }) {
  const { t } = useI18n();
  const [skills, setSkills] = useState([]);
  const [draft, setDraft] = useState(defaultSkill(1));
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const importRef = useRef(null);
  const enabledCount = useMemo(() => skills.filter((skill) => skill.enabled).length, [skills]);
  const filteredSkills = useMemo(() => {
    const query = skillSearchQuery.trim().toLowerCase();
    if (!query) return skills;
    return skills.filter((skill) => String(skill.name || "").toLowerCase().includes(query));
  }, [skillSearchQuery, skills]);
  const existingDraft = draft.id && skills.some((skill) => skill.id === draft.id);
  const editorMode = existingDraft ? t("skills.editingSkill", { name: draft.name || t("skills.untitled") }) : t("skills.creatingSkill");

  async function loadSkills() {
    try {
      setStatus("loading");
      const response = await fetch("/api/skills");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load skills.");
      setSkills(data.skills || []);
      setDraft(data.skills?.[0] ? { ...data.skills[0] } : defaultSkill(1));
      setError("");
      setStatus("idle");
    } catch (loadError) {
      setError(loadError.message || "Could not load skills.");
      setStatus("error");
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadSkills();
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  async function skillAction(action, payload = {}) {
    const response = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Skill action failed.");

    setSkills(data.store?.skills || []);
    return data;
  }

  function updateDraft(updates) {
    setDraft((current) => ({ ...current, ...updates }));
  }

  function newSkill() {
    setDraft(defaultSkill(skills.length + 1));
    setError("");
  }

  function openSkill(skill) {
    setDraft({ ...skill });
    setError("");
  }

  async function saveSkill() {
    if (!draft.name?.trim() || !draft.instructions?.trim()) {
      setError(t("skills.needsFields"));
      return;
    }

    try {
      const action = existingDraft ? "updateSkill" : "createSkill";
      const data = await skillAction(action, { skill: draft });
      setDraft({ ...data.skill });
      setError("");
    } catch (saveError) {
      setError(saveError.message || "Could not save skill.");
    }
  }

  async function toggleSkill(skill) {
    try {
      const data = await skillAction("updateSkill", { skill: { ...skill, enabled: !skill.enabled } });
      setDraft((current) => (current.id === data.skill.id ? data.skill : current));
    } catch (toggleError) {
      setError(toggleError.message || "Could not toggle skill.");
    }
  }

  async function deleteSkill(skill) {
    if (!skill?.id) return;
    if (!window.confirm(t("skills.deleteConfirm"))) return;

    try {
      const data = await skillAction("deleteSkill", { skillId: skill.id });
      setDraft(data.store.skills[0] || defaultSkill(1));
      setError("");
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete skill.");
    }
  }

  function exportSkills() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            app: "Batuk",
            type: "batuk-skills",
            store: { version: 1, skills },
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `batuk-skills-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importSkills(file, mode = "merge") {
    if (!file) return;

    try {
      const imported = JSON.parse(await file.text());
      const data = await skillAction("importStore", {
        mode,
        store: imported.store || imported,
      });
      setDraft(data.store.skills[0] || defaultSkill(1));
      setError("");
    } catch (importError) {
      setError(importError.message || "Could not import skills.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  return (
    <section className="agent-builder-screen skills-dashboard-screen">
      <header className="agent-builder-header">
        <div className="agent-builder-title-row">
          <button className="secondary-button compact" onClick={onClose} type="button">
            <ArrowLeft size={16} />
            {t("skills.backToChat")}
          </button>
          <div>
            <p>{t("skills.eyebrow")}</p>
            <h1>{t("skills.title")}</h1>
            <span>{t("skills.enabledCount", { count: enabledCount })}</span>
          </div>
        </div>
        <button className="top-icon" onClick={onClose} title={t("skills.close")} type="button">
          <X size={20} />
        </button>
      </header>

      <div className="agent-builder-grid two-tab-builder skills-dashboard-grid">
        <section className="agent-editor-panel">
          <div className="workflow-library-head skills-library-head">
            <div>
              <h2>{t("skills.library")}</h2>
              <p>{t("skills.libraryCopy")}</p>
            </div>
            <button className="new-workflow-button" onClick={newSkill} type="button">
              <Plus size={18} />
              {t("skills.newSkill")}
            </button>
          </div>

          <div className="skills-toolbar">
            <input
              aria-label={t("skills.search")}
              className="field skill-search-field"
              onChange={(event) => setSkillSearchQuery(event.target.value)}
              placeholder={t("skills.search")}
              type="search"
              value={skillSearchQuery}
            />
            <button className="agent-doc-button" onClick={exportSkills} type="button">
              <Download size={16} />
              {t("skills.export")}
            </button>
            <button className="agent-doc-button" onClick={() => importRef.current?.click()} type="button">
              <FileUp size={16} />
              {t("skills.import")}
            </button>
            <input className="hidden-file-input" ref={importRef} accept="application/json,.json" onChange={(event) => importSkills(event.target.files?.[0])} type="file" />
          </div>

          <div className="workflow-card-grid skills-card-grid">
            {filteredSkills.map((skill) => (
              <article className={`workflow-card skill-card ${draft.id === skill.id ? "active" : ""}`} key={skill.id}>
                <button onClick={() => openSkill(skill)} type="button">
                  <Sparkles size={22} />
                  <span>
                    <strong>{skill.name}</strong>
                    <small>{skill.description || t("skills.noDescription")}</small>
                  </span>
                </button>
                <div>
                  <button className={`skill-toggle ${skill.enabled ? "active" : ""}`} onClick={() => toggleSkill(skill)} type="button">
                    {skill.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {skill.enabled ? t("skills.enabled") : t("skills.disabled")}
                  </button>
                  <button className="top-icon danger-icon" onClick={() => deleteSkill(skill)} title={t("skills.delete")} type="button">
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
            {!skills.length && (
              <div className="empty-documents">
                <Sparkles size={28} />
                <strong>{t("skills.noSkills")}</strong>
                <span>{t("skills.noSkillsCopy")}</span>
              </div>
            )}
            {skills.length > 0 && !filteredSkills.length && (
              <div className="empty-documents">
                <Sparkles size={28} />
                <strong>{t("skills.noSearchResults")}</strong>
                <span>{t("skills.noSearchResultsCopy")}</span>
              </div>
            )}
          </div>
        </section>

        <aside className="agent-flow-panel">
          <div className="agent-input-card skill-editor-card">
            <div className="setting-title">
              <h3>{t("skills.editor")}</h3>
              <p>{t("skills.editorCopy")}</p>
            </div>
            <label className="field-label" htmlFor="skillName">{t("skills.name")}</label>
            <p className="skill-editor-mode">{editorMode}</p>
            <input id="skillName" className="field" onChange={(event) => updateDraft({ name: event.target.value })} value={draft.name || ""} />

            <label className="field-label" htmlFor="skillDescription">{t("skills.description")}</label>
            <input
              id="skillDescription"
              className="field"
              onChange={(event) => updateDraft({ description: event.target.value })}
              value={draft.description || ""}
            />

            <label className="field-label" htmlFor="skillInstructions">{t("skills.instructions")}</label>
            <textarea
              id="skillInstructions"
              className="field agent-prompt skill-large-textarea"
              onChange={(event) => updateDraft({ instructions: event.target.value })}
              value={draft.instructions || ""}
            />

            <label className="field-label" htmlFor="skillExamples">{t("skills.examples")}</label>
            <textarea
              id="skillExamples"
              className="field agent-textarea skill-medium-textarea"
              onChange={(event) => updateDraft({ examples: event.target.value })}
              placeholder={t("skills.examplesPlaceholder")}
              value={draft.examples || ""}
            />

            <label className="field-label" htmlFor="skillResources">{t("skills.resources")}</label>
            <textarea
              id="skillResources"
              className="field agent-textarea skill-medium-textarea"
              onChange={(event) => updateDraft({ resources: event.target.value })}
              placeholder={t("skills.resourcesPlaceholder")}
              value={draft.resources || ""}
            />

            <div className="agent-crud-actions horizontal">
              <button className="agent-save-button" onClick={saveSkill} type="button">
                <Save size={16} />
                {t("skills.save")}
              </button>
              <button className="agent-back-button" onClick={() => updateDraft({ enabled: !draft.enabled })} type="button">
                {draft.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                {draft.enabled ? t("skills.enabled") : t("skills.disabled")}
              </button>
            </div>

            {status === "loading" && <p className="settings-hint">{t("common.loading")}</p>}
            {error && <p className="settings-error">{error}</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
