"use client";

import { Home, RadioReceiver, Users, Car, FileText, Briefcase, MessageSquare, CalendarDays, ShieldCheck, Bell, Plus, Search, LayoutDashboard } from "lucide-react";

type Branding = {
  name?: string;
  subtitle?: string;
  accent?: string;
  badge?: string;
};

export function Sidebar({
  currentView,
  modules,
  onScreenChange,
  playerData,
  branding,
}: {
  currentView: string;
  modules: Record<string, boolean>;
  onScreenChange: (screen: string) => void;
  playerData: any;
  branding: Branding;
}) {
  const menu_items = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "dispatch", label: "Dispatch", icon: RadioReceiver },
    { id: "persons", label: "Personen", icon: Users },
    { id: "vehicles", label: "Fahrzeuge", icon: Car },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "incidents", label: "Akte / Fälle", icon: Briefcase },
    { id: "evidence", label: "Beweismittel", icon: ShieldCheck },
    { id: "map", label: "Live Map", icon: LayoutDashboard },
    { id: "chat", label: "Funk / Chat", icon: MessageSquare },
    { id: "shifts", label: "Dienstplan", icon: CalendarDays },
    { id: "administration", label: "Verwaltung", icon: Bell },
  ];

  const accent = branding.accent || "#ff9100";

  return (
    <aside className="w-72 bg-[var(--mdt-bg-base)] border-r border-[var(--mdt-border)] flex flex-col justify-between p-4 flex-shrink-0">
      <div>
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-semibold" style={{ boxShadow: `0 0 0 1px ${accent}22 inset` }}>
            {branding.name?.slice(0, 2)?.toUpperCase() || "TG"}
          </div>
          <div>
            <h1 className="text-white font-bold text-base tracking-wide">{branding.name || "TG MDT"}</h1>
            <p className="text-xs opacity-60">{branding.subtitle || "MULTI-FRAKTION PLATFORM"}</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menu_items.map((item) => {
            // Check if feature module is enabled (or if it's the base dashboard)
            const is_enabled = item.id === "dashboard" || modules[item.id] !== false;
            
            if (!is_enabled) return null;

            const is_active = currentView === item.id || (currentView === "tablet" && item.id === "dashboard");
            return (
              <button
                key={item.id}
                onClick={() => onScreenChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  is_active 
                    ? "border-l-2 bg-gradient-to-r from-white/8 to-transparent font-medium" 
                    : "hover:bg-[var(--mdt-bg-hover)] text-[var(--mdt-text-muted)] hover:text-white"
                }`}
                style={is_active ? { borderLeftColor: accent, color: accent } : undefined}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile / Quick Actions */}
      <div>
        <div className="bg-[var(--mdt-bg-panel)] rounded-xl p-4 border border-[var(--mdt-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/8 overflow-hidden flex-shrink-0 border border-white/10">
              <div className="w-full h-full bg-white/5 flex items-center justify-center text-white">
                {playerData?.name?.charAt(0) || "U"}
              </div>
            </div>
            <div>
              <p className="text-white font-medium text-sm truncate w-32">
                {playerData?.name || "Unknown User"}
              </p>
              <p className="text-xs text-[var(--mdt-text-muted)] truncate w-32">
                {playerData?.badge || branding.badge || "Duty Profile"}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-2 h-2 rounded-full bg-[var(--mdt-status-success)]"></div>
                <span className="text-[10px] text-[var(--mdt-status-success)] uppercase font-semibold tracking-wider">On Duty</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-[var(--mdt-text-muted)] font-semibold uppercase tracking-wider mb-2 px-2">Quick Actions</p>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--mdt-bg-hover)] text-[var(--mdt-text-muted)] hover:text-white transition-colors">
              <Plus className="w-4 h-4" style={{ color: accent }} />
              <span className="font-medium" style={{ color: accent }}>Neue Akte</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}