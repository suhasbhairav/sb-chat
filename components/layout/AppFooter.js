import { useI18n } from "@/components/i18n/I18nProvider";

export function AppFooter() {
  const { t } = useI18n();

  return (
    <footer className="app-footer">
      <span>{t("common.createdBy")}</span>
      <a href="https://suhasbhairav.com" rel="noreferrer" target="_blank">
        {t("common.suhas")}
      </a>
      <span className="footer-dot" aria-hidden="true" />
      <a href="https://suhasbhairav.com" rel="noreferrer" target="_blank">
        www.suhasbhairav.com
      </a>
      <span className="footer-dot" aria-hidden="true" />
      <strong>{t("common.mitLicense")}</strong>
    </footer>
  );
}
