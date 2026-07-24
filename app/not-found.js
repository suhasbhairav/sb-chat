import Link from "next/link";
import { ArrowLeft, FileText, MessageSquareText, SearchX, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-shell" aria-labelledby="not-found-title">
        <nav className="not-found-nav" aria-label="Batuk">
          <Link className="not-found-brand" href="/">
            <BrandMark />
            <span>Batuk</span>
          </Link>
          <span className="not-found-pill">
            <ShieldCheck size={15} />
            Sovereign AI
          </span>
        </nav>

        <div className="not-found-grid">
          <div className="not-found-copy">
            <div className="not-found-kicker">
              <SearchX size={18} />
              404
            </div>
            <h1 id="not-found-title">This page drifted out of context.</h1>
            <p>
              The route you opened does not exist in Batuk. Return to the AI workspace and continue from chat,
              documents, agents, skills, or your saved workspaces.
            </p>
            <div className="not-found-actions">
              <Link className="not-found-primary" href="/">
                <MessageSquareText size={18} />
                Back to Chat
              </Link>
              <Link className="not-found-secondary" href="/">
                <FileText size={18} />
                Open Workspace
              </Link>
            </div>
          </div>

          <div className="not-found-orbit" aria-hidden="true">
            <div className="not-found-orbit-card">
              <span>route</span>
              <strong>not indexed</strong>
            </div>
            <div className="not-found-orbit-card secondary">
              <span>status</span>
              <strong>404</strong>
            </div>
            <div className="not-found-core">
              <SearchX size={46} />
            </div>
          </div>
        </div>

        <Link className="not-found-return" href="/">
          <ArrowLeft size={16} />
          Return home
        </Link>
      </section>
    </main>
  );
}
