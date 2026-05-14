"use client";

import { Search, Bell, X } from "lucide-react";

export function Topbar({ onClose }: { onClose: () => void }) {
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--mdt-border)] bg-[var(--mdt-bg-base)]">
      
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
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--mdt-accent-primary)] text-white text-[10px] flex items-center justify-center font-bold">
            3
          </span>
        </button>

        <div className="text-right">
          <p className="text-white font-medium">10:25</p>
          <p className="text-xs text-[var(--mdt-text-muted)] uppercase tracking-wider">May 12, 2026</p>
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