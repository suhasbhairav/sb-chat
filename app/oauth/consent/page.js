"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";

function OAuthConsentContent() {
  const [status, setStatus] = useState("ready");
  const [error, setError] = useState("");
  const params = useSearchParams();
  const clientId = params.get("client_id") || "OAuth client";
  const scope = params.get("scope") || "";
  const scopes = useMemo(() => scope.split(" ").filter(Boolean), [scope]);

  async function submitConsent(accept) {
    setStatus("submitting");
    setError("");

    try {
      const result = await authClient.oauth2.consent({
        accept,
        scope: accept ? scope : undefined,
      });

      if (result.error) throw new Error(result.error.message || "OAuth consent failed.");

      const redirectUri = result.data?.redirect_uri;
      if (redirectUri) {
        window.location.href = redirectUri;
        return;
      }

      setStatus("ready");
    } catch (consentError) {
      setError(consentError.message || "OAuth consent failed.");
      setStatus("ready");
    }
  }

  return (
    <main className="oauth-consent-screen">
      <section className="oauth-consent-card">
        <div className="oauth-consent-icon">
          <ShieldCheck size={28} />
        </div>
        <div>
          <span className="auth-eyebrow">Batuk authorization</span>
          <h1>Allow access to your account?</h1>
          <p>
            <strong>{clientId}</strong> is requesting access through Batuk&apos;s OAuth/OIDC provider.
          </p>
        </div>

        <div className="oauth-scope-list">
          {scopes.length ? (
            scopes.map((item) => (
              <span key={item}>
                <CheckCircle2 size={15} />
                {item}
              </span>
            ))
          ) : (
            <span>
              <CheckCircle2 size={15} />
              Basic profile access
            </span>
          )}
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="oauth-consent-actions">
          <button className="secondary-button danger" disabled={status === "submitting"} onClick={() => submitConsent(false)} type="button">
            <XCircle size={17} />
            Deny
          </button>
          <button className="auth-submit" disabled={status === "submitting"} onClick={() => submitConsent(true)} type="button">
            <CheckCircle2 size={17} />
            Allow
          </button>
        </div>
      </section>
    </main>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={<main className="oauth-consent-screen" />}>
      <OAuthConsentContent />
    </Suspense>
  );
}
