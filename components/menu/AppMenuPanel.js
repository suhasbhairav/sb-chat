"use client";

import { BarChart3, ClipboardCheck, Database, History, KeyRound, Settings2, ShieldCheck, UsersRound, X } from "lucide-react";

const ITEMS = [
  { id: "settings", label: "Provider settings", icon: Settings2 },
  { id: "api", label: "API access", icon: KeyRound },
  { id: "workspaces", label: "Workspace management", icon: UsersRound, adminOnly: true },
  { id: "history", label: "Chat history and data", icon: History },
  { id: "usage", label: "Token usage", icon: BarChart3 },
  { id: "enterprise", label: "Enterprise management", icon: ShieldCheck, adminOnly: true },
  { id: "audit", label: "Audit and compliance", icon: ClipboardCheck, adminOnly: true },
];

export function AppMenuPanel({ canManageAdmin = false, onClose, onOpen }) {
  const visibleItems = ITEMS.filter((item) => !item.adminOnly || canManageAdmin);

  return (
    <div className="settings-layer" role="dialog" aria-modal="true" aria-label="App menu">
      <button className="settings-backdrop" onClick={onClose} aria-label="Close menu" type="button" />
      <section className="app-menu-page">
        <div className="settings-header">
          <div>
            <p>Menu</p>
            <h2>Workspace tools</h2>
          </div>
          <button className="top-icon" onClick={onClose} title="Close menu" type="button">
            <X size={20} />
          </button>
        </div>
        <div className="app-menu-list">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => onOpen(item.id)} type="button">
                <span className="app-menu-icon">
                  <Icon size={20} />
                </span>
                <strong>{item.label}</strong>
              </button>
            );
          })}
        </div>
        <div className="locked-footer-note">
          <Database size={16} />
          <span>Personal data stays scoped to the signed-in user unless a shared workspace is selected.</span>
        </div>
      </section>
    </div>
  );
}
