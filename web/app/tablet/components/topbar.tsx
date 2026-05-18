"use client";

import { Power, Search, Settings, X } from "lucide-react";
import type { TFunction } from "../lib/i18n";

type Branding = {
  accent?: string;
  dateLabel?: string;
};

type SearchSuggestion = {
  id: string;
  label: string;
  subtitle: string;
};

type DutyState = {
  enabled?: boolean;
  onDuty?: boolean;
  switchJobEnabled?: boolean;
};

export function Topbar({
  branding,
  t,
  searchValue,
  onSearchChange,
  searchSuggestions,
  onSearchSelect,
  onSearchSubmit,
  dutyState,
  isDutyBusy,
  onToggleDuty,
  onOpenSettings,
  onClose,
}: {
  branding: Branding;
  t: TFunction;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchSuggestions: SearchSuggestion[];
  onSearchSelect: (id: string) => void;
  onSearchSubmit: () => void;
  dutyState: DutyState;
  isDutyBusy: boolean;
  onToggleDuty: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
}) {
  const isOnDuty = dutyState?.onDuty !== false;

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-transparent">
      
      {/* Global Search */}
      <div className="relative w-96">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mdt-text-muted)]" />
        <input 
          type="text" 
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearchSubmit();
            }
          }}
          placeholder={t("tablet.topbar.search_placeholder")}
          className="w-full bg-[var(--mdt-bg-panel)] border border-[var(--mdt-border)] rounded-full py-2 pl-10 pr-4 text-sm text-[var(--mdt-text-active)] placeholder-[var(--mdt-text-muted)] focus:outline-none focus:border-[var(--mdt-text-muted)] transition-colors"
        />

        {searchValue.trim().length > 0 && searchSuggestions.length > 0 && (
          <div className="absolute top-11 left-0 right-0 z-30 rounded-xl border border-[var(--mdt-border)] bg-[var(--mdt-bg-panel)] overflow-hidden shadow-xl">
            {searchSuggestions.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => onSearchSelect(result.id)}
                className="w-full text-left px-3 py-2 hover:bg-[rgba(255,255,255,0.05)] border-b border-[var(--mdt-border)] last:border-b-0"
              >
                <p className="text-sm text-white font-medium truncate">{result.label}</p>
                <p className="text-xs text-[var(--mdt-text-muted)] truncate">{result.subtitle}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6">
        <button
          onClick={onToggleDuty}
          disabled={isDutyBusy || dutyState?.enabled === false}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isOnDuty
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15"
              : "bg-yellow-500/10 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/15"
          }`}
          title={t("tablet.topbar.toggle_duty")}
        >
          <Power className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider font-semibold">
            {isDutyBusy
              ? t("loading")
              : isOnDuty
                ? t("tablet.topbar.duty_on")
                : t("tablet.topbar.duty_off")}
          </span>
        </button>

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