"use client";

import { Search, Bell, X } from "lucide-react";

type Branding = {
  accent?: string;
  dateLabel?: string;
};

export function Topbar({ branding, onClose }: { branding: Branding; onClose: () => void }) {
  const accent = branding.accent || "#ff9100";
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-transparent">
      
      {/* Global Search */}
      <div className="relative w-96">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mdt-text-muted)]" />
        <input 
          type="text" 
          placeholder="Search for a person, vehicle, incident..." 
          className="w-full bg-[var(--mdt-bg-panel)] border border-[var(--mdt-border)] rounded-full py-2 pl-10 pr-4 text-sm text-[var(--mdt-text-active)] placeholder-[var(--mdt-text-muted)] focus:outline-none focus:border-[var(--mdt-text-muted)] transition-colors"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6">
        <button className="relative text-[var(--mdt-text-muted)] hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold" style={{ backgroundColor: accent }}>
            3
          </span>
        </button>

        <div className="text-right">
          <p className="text-white font-medium">10:25</p>
          <p className="text-xs text-[var(--mdt-text-muted)] uppercase tracking-wider">{branding.dateLabel || "May 12, 2026"}</p>
        </div>

        <button 
          onClick={onClose}
          className="p-2 rounded-lg bg-[var(--mdt-bg-panel)] border border-[var(--mdt-border)] text-red-400 hover:bg-red-500/10 transition-colors"
          title="Close Tablet"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

    </header>
  );
}