"use client";

import { Search, Settings, X } from "lucide-react";
import type { TFunction } from "../lib/i18n";

type Branding = {
  accent?: string;
  dateLabel?: string;
};

export function Topbar({
  branding,
  t,
  onOpenSettings,
  onClose,
}: {
  branding: Branding;
  t: TFunction;
  onOpenSettings: () => void;
  onClose: () => void;
}) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-transparent">
      
      {/* Global Search */}
      <div className="relative w-96">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mdt-text-muted)]" />
        <input 
          type="text" 
          placeholder={t("tablet.topbar.search_placeholder")}
          className="w-full bg-[var(--mdt-bg-panel)] border border-[var(--mdt-border)] rounded-full py-2 pl-10 pr-4 text-sm text-[var(--mdt-text-active)] placeholder-[var(--mdt-text-muted)] focus:outline-none focus:border-[var(--mdt-text-muted)] transition-colors"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-white font-medium">10:25</p>
          <p className="text-xs text-[var(--mdt-text-muted)] uppercase tracking-wider">{branding.dateLabel || t("tablet.topbar.date_fallback")}</p>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-[var(--mdt-bg-panel)] border border-[var(--mdt-border)] text-[var(--mdt-text-muted)] hover:text-white hover:bg-white/5 transition-colors"
          title={t("tablet.topbar.open_settings")}
        >
          <Settings className="w-5 h-5" />
        </button>

        <button 
          onClick={onClose}
          className="p-2 rounded-lg bg-[var(--mdt-bg-panel)] border border-[var(--mdt-border)] text-red-400 hover:bg-red-500/10 transition-colors"
          title={t("tablet.topbar.close_tablet")}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

    </header>
  );
}