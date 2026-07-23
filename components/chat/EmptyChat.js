import { Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { useI18n } from "@/components/i18n/I18nProvider";
import { AppFooter } from "@/components/layout/AppFooter";

export function EmptyChat({ composer, model, onPickSuggestion }) {
  const { t } = useI18n();
  const suggestions = [
    { title: t("suggestions.codeTitle"), detail: t("suggestions.codeDetail"), prompt: t("suggestions.codePrompt") },
    { title: t("suggestions.studyTitle"), detail: t("suggestions.studyDetail"), prompt: t("suggestions.studyPrompt") },
    { title: t("suggestions.procrastinationTitle"), detail: t("suggestions.procrastinationDetail"), prompt: t("suggestions.procrastinationPrompt") },
  ];

  return (
    <div className="empty-chat">
      <div className="empty-title">
        <BrandMark large />
        <h1>{model || "SB Chat"}</h1>
      </div>
      {composer}
      <AppFooter />
      <div className="suggestions">
        <div className="suggested-label">
          <Sparkles size={15} />
          {t("composer.suggested")}
        </div>
        {suggestions.map((suggestion) => (
          <button key={suggestion.title} onClick={() => onPickSuggestion(suggestion.prompt)} type="button">
            <span>{suggestion.title}</span>
            <small>{suggestion.detail}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
