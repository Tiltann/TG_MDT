"use client";

import { RadioReceiver, AlertTriangle, FileText } from "lucide-react";

export function DashboardView() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div>
        <h2 className="text-2xl font-semibold text-white">Good morning, Officer Carter.</h2>
        <p className="text-[var(--mdt-text-muted)] mt-1">Here's what's happening in Los Santos.</p>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        
        {/* Active Units */}
        <div className="bg-[var(--mdt-bg-panel)] border border-[var(--mdt-border)] rounded-xl p-5 flex items-center gap-5">
          <div className="p-3 bg-orange-500/10 rounded-lg text-[var(--mdt-accent-primary)]">
            <RadioReceiver className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--mdt-text-muted)] font-medium uppercase tracking-wider">Active Units</p>
            <p className="text-3xl font-bold text-white leading-tight">12</p>
            <p className="text-xs text-[var(--mdt-text-muted)]">Units on duty</p>
          </div>
        </div>

        {/* Active Incidents */}
        <div className="bg-[var(--mdt-bg-panel)] border-b-2 border-b-[var(--mdt-status-high)] border-[var(--mdt-border)] rounded-xl p-5 flex items-center gap-5">
          <div className="p-3 bg-red-500/10 rounded-lg text-[var(--mdt-status-high)]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--mdt-text-muted)] font-medium uppercase tracking-wider">Active Incidents</p>
            <p className="text-3xl font-bold text-white leading-tight">4</p>
            <p className="text-xs text-[var(--mdt-status-high)]">Requires attention</p>
          </div>
        </div>

        {/* Reports */}
        <div className="bg-[var(--mdt-bg-panel)] border-b-2 border-b-[var(--mdt-status-low)] border-[var(--mdt-border)] rounded-xl p-5 flex items-center gap-5">
          <div className="p-3 bg-blue-500/10 rounded-lg text-[var(--mdt-status-low)]">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--mdt-text-muted)] font-medium uppercase tracking-wider">Reports</p>
            <p className="text-3xl font-bold text-white leading-tight">7</p>
            <p className="text-xs text-[var(--mdt-text-muted)]">Pending review</p>
          </div>
        </div>

      </div>

      {/* Two Column Layout for Map & Incidents */}
      <div className="grid grid-cols-2 gap-6 h-96">
        <div className="bg-[var(--mdt-bg-panel)] border border-[var(--mdt-border)] rounded-xl p-5 flex items-center justify-center">
          <p className="text-[var(--mdt-text-muted)]">Incidents List (WIP)</p>
        </div>
        <div className="bg-[var(--mdt-bg-panel)] border border-[var(--mdt-border)] rounded-xl p-5 flex items-center justify-center">
          <p className="text-[var(--mdt-text-muted)]">Live Map Module (WIP)</p>
        </div>
      </div>
    </div>
  );
}