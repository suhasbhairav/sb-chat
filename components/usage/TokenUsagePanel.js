import { BarChart3, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function sortedEntries(bucket = {}) {
  return Object.entries(bucket).sort((a, b) => Number(b[1].totalTokens || 0) - Number(a[1].totalTokens || 0));
}

export function TokenUsagePanel({ usage, onClose }) {
  const { locale, t } = useI18n();
  const summary = usage?.summary || {};
  const totals = summary.totals || usage?.totals || {};
  const recentEvents = usage?.events?.slice(0, 12) || [];

  return (
    <div className="settings-layer" role="dialog" aria-modal="true" aria-label={t("usage.title")}>
      <button className="settings-backdrop" onClick={onClose} aria-label={t("usage.close")} type="button" />
      <section className="settings-page usage-page">
        <div className="settings-header">
          <div>
            <p>{t("usage.usage")}</p>
            <h2>{t("usage.title")}</h2>
          </div>
          <button className="top-icon" onClick={onClose} title={t("usage.close")} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          <section className="usage-overview">
            <div>
              <span>{t("usage.inputTokens")}</span>
              <strong>{formatNumber(totals.inputTokens, locale)}</strong>
            </div>
            <div>
              <span>{t("usage.outputTokens")}</span>
              <strong>{formatNumber(totals.outputTokens, locale)}</strong>
            </div>
            <div>
              <span>{t("usage.totalTokens")}</span>
              <strong>{formatNumber(totals.totalTokens, locale)}</strong>
            </div>
            <div>
              <span>{t("usage.requests")}</span>
              <strong>{formatNumber(totals.requests, locale)}</strong>
            </div>
          </section>

          <UsageBucket title={t("usage.byProvider")} bucket={summary.byProvider} />
          <UsageBucket title={t("usage.byModel")} bucket={summary.byModel} />
          <UsageBucket title={t("usage.byDay")} bucket={summary.byDay} />

          <section className="settings-card">
            <div className="setting-title">
              <h3>{t("usage.recent")}</h3>
              <p>{t("usage.recentCopy")}</p>
            </div>
            {recentEvents.length === 0 ? (
              <div className="empty-sidebar-copy">{t("usage.noUsage")}</div>
            ) : (
              <div className="usage-events">
                {recentEvents.map((event) => (
                  <div className="usage-event" key={event.id}>
                    <BarChart3 size={16} />
                    <div>
                      <strong>{event.model}</strong>
                      <span>
                        {formatNumber(event.inputTokens, locale)} {t("usage.inputShort")} · {formatNumber(event.outputTokens, locale)} {t("usage.outputShort")}
                        {event.temporary ? ` · ${t("common.temporary")}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function UsageBucket({ bucket, title }) {
  const { locale, t } = useI18n();
  const entries = sortedEntries(bucket).slice(0, 8);

  return (
    <section className="settings-card">
      <div className="setting-title">
        <h3>{title}</h3>
      </div>
      {entries.length === 0 ? (
        <div className="empty-sidebar-copy">{t("common.noDataYet")}</div>
      ) : (
        <div className="usage-table">
          {entries.map(([label, value]) => (
            <div className="usage-row" key={label}>
              <span>{label}</span>
              <strong>{formatNumber(value.totalTokens, locale)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
