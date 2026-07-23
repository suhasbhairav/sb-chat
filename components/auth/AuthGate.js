"use client";

import { FileSearch, Globe2, LogOut, MessageCircle, Mic2, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthGate({ children }) {
  const session = authClient.useSession();

  if (session.isPending) {
    return (
      <main className="auth-screen">
        <div className="auth-card auth-loading-card">
          <div className="auth-brand">
            <span className="auth-mark">SB</span>
            <div>
              <h1>SB Chat</h1>
              <p>Checking your sovereign session...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!session.data?.user) {
    return <AuthForm onSuccess={() => session.refetch()} />;
  }

  return (
    <>
      <UserSession user={session.data.user} onSignedOut={() => session.refetch()} />
      {children}
    </>
  );
}

function UserSession({ user, onSignedOut }) {
  async function signOut() {
    await authClient.signOut();
    await onSignedOut();
  }

  return (
    <div className="session-chip" aria-label="Current authenticated user">
      <UserRound size={15} />
      <span>{user.name || user.email}</span>
      <button type="button" onClick={signOut} aria-label="Sign out" title="Sign out">
        <LogOut size={14} />
      </button>
    </div>
  );
}

function AuthForm({ onSuccess }) {
  const [mode, setMode] = useState("sign-in");
  const [name, setName] = useState("Suhas Bhairav");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === "sign-up";
  const capabilities = [
    { icon: MessageCircle, label: "Chat with leading AI models" },
    { icon: FileSearch, label: "Ask questions about your files" },
    { icon: Mic2, label: "Talk naturally with voice" },
    { icon: Globe2, label: "Search the web when needed" },
  ];

  async function submit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = isSignUp
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(result.error.message || "Authentication failed.");
        return;
      }

      await onSuccess();
    } catch (authError) {
      setError(authError.message || "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-hero">
        <nav className="auth-nav" aria-label="SB Chat product">
          <div className="auth-logo">
            <span className="auth-mark">SB</span>
            <span>SB Chat</span>
          </div>
          <div className="auth-nav-pills" aria-label="Core capabilities">
            <span>Chat</span>
            <span>Voice</span>
            <span>RAG</span>
            <span>Local-first</span>
          </div>
        </nav>

        <div className="auth-hero-grid">
          <div className="auth-copy">
            <span className="auth-eyebrow">
              <Sparkles size={15} />
              Private AI workspace
            </span>
            <h1>Sovereign AI chat</h1>
            <p>
              Connect models, documents, voice, web search, guardrails, and local history
              in one private workspace.
            </p>

            <div className="auth-capability-line" aria-label="SB Chat highlights">
              {capabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <span className="auth-capability" key={item.label}>
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <section className="auth-card" aria-label={isSignUp ? "Create account" : "Sign in"}>
          <div className="auth-card-heading">
            <ShieldCheck size={18} />
            <div>
              <h2>{isSignUp ? "Create your workspace" : "Welcome back"}</h2>
              <p>Your account is protected locally with Better Auth.</p>
            </div>
          </div>

          <div className="auth-mode" role="tablist" aria-label="Authentication mode">
            <button type="button" className={!isSignUp ? "active" : ""} onClick={() => setMode("sign-in")}>
              Sign in
            </button>
            <button type="button" className={isSignUp ? "active" : ""} onClick={() => setMode("sign-up")}>
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {isSignUp && (
              <label>
                <span>Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
              </label>
            )}
            <label>
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
            </label>
            <label>
              <span>Password</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} required />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : isSignUp ? "Create sovereign account" : "Sign in to SB Chat"}
            </button>
          </form>

          <div className="auth-footnote">
            <ShieldCheck size={16} />
            <span>Email/password auth is stored in local SQLite through Better Auth.</span>
          </div>
        </section>

        <footer className="auth-footer">
          <span>Created by</span>
          <a href="https://suhasbhairav.com" target="_blank" rel="noreferrer">
            Suhas Bhairav
          </a>
          <span className="auth-footer-dot" aria-hidden="true" />
          <span>MIT License</span>
        </footer>
      </section>
    </main>
  );
}
