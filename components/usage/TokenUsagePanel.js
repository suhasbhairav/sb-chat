import { ArrowLeft, BarChart3, Trash2, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function sortedEntries(bucket = {}) {
  return Object.entries(bucket).sort((a, b) => Number(b[1].totalTokens || 0) - Number(a[1].totalTokens || 0));
}

function prettyLabel(label) {
  if (label === "api") return "API";
  if (label === "chat") return "Chat";
  if (label === "unknown") return "Unknown";
  return label;
}

export function TokenUsagePanel({ usage, onBackToMenu, onClose, onResetTokenUsage }) {
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
          <div className="panel-header-actions">
            <button className="secondary-button panel-back-button" onClick={onBackToMenu} type="button">
              <ArrowLeft size={16} />
              Back to menu
            </button>
            <button className="top-icon" onClick={onClose} title={t("usage.close")} type="button">
              <X size={20} />
            </button>
          </div>
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

          <UsageChart title="Usage by channel" bucket={summary.byChannel} />
          <UsageChart title="Daily usage" bucket={summary.byDay} />
          <UsageChart title="Monthly usage" bucket={summary.byMonth} />
          <UsageChart title="Yearly usage" bucket={summary.byYear} />

          <div className="usage-grid">
            <UsageBucket title="Users" bucket={summary.byUser} />
            <UsageBucket title="Chats" bucket={summary.byChat} />
            <UsageBucket title={t("usage.byProvider")} bucket={summary.byProvider} />
            <UsageBucket title={t("usage.byModel")} bucket={summary.byModel} />
            <UsageBucket title="API keys" bucket={summary.byApiKey} />
          </div>

          <section className="settings-card">
            <div className="setting-title">
              <h3>{t("settings.tokenUsage")}</h3>
              <p>{t("settings.tokenUsageCopy")}</p>
            </div>
            <button
              className="secondary-button danger"
              onClick={async () => {
                if (!window.confirm(t("settings.resetTokenUsageConfirm"))) return;
                try {
                  await onResetTokenUsage();
                  window.alert(t("settings.resetTokenUsageDone"));
                } catch (error) {
                  window.alert(error.message || t("settings.resetTokenUsageError"));
                }
              }}
              type="button"
            >
              <Trash2 size={16} />
              {t("settings.resetTokenUsage")}
            </button>
          </section>

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
                        {event.source ? ` · ${prettyLabel(event.source)}` : ""}
                        {event.userEmail ? ` · ${event.userEmail}` : ""}
                        {event.apiModel ? ` · ${event.apiModel}` : ""}
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
              <span>{prettyLabel(label)}</span>
              <strong>{formatNumber(value.totalTokens, locale)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UsageChart({ bucket, title }) {
  const { locale, t } = useI18n();
  const entries = sortedEntries(bucket).slice(0, 12);
  const max = Math.max(...entries.map(([, value]) => Number(value.totalTokens || 0)), 1);

  return (
    <section className="settings-card usage-chart-card">
      <div className="setting-title">
        <h3>{title}</h3>
      </div>
      {entries.length === 0 ? (
        <div className="empty-sidebar-copy">{t("common.noDataYet")}</div>
      ) : (
        <div className="usage-chart">
          {entries.map(([label, value]) => {
            const total = Number(value.totalTokens || 0);
            return (
              <div className="usage-chart-row" key={label}>
                <span>{prettyLabel(label)}</span>
                <div aria-hidden="true">
                  <i style={{ width: `${Math.max(6, (total / max) * 100)}%` }} />
                </div>
                <strong>{formatNumber(total, locale)}</strong>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
