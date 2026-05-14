"use client";

import { Home, RadioReceiver, ShieldAlert, Users, Car, FileText, Settings, Key } from "lucide-react";

export function Sidebar({
  currentView,
  modules,
  onScreenChange,
  playerData,
}: {
  currentView: string;
  modules: Record<string, boolean>;
  onScreenChange: (screen: string) => void;
  playerData: any;
}) {
  const menu_items = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "dispatch", label: "Dispatch", icon: RadioReceiver },
    { id: "incidents", label: "Incidents", icon: ShieldAlert },
    { id: "persons", label: "Persons", icon: Users },
    { id: "vehicles", label: "Vehicles", icon: Car },
    { id: "warrants", label: "Warrants", icon: Key },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  return (
    <aside className="w-64 bg-[var(--mdt-bg-base)] border-r border-[var(--mdt-border)] flex flex-col justify-between p-4 flex-shrink-0">
      <div>
        <div className="flex items-center gap-3 mb-8 px-2">
          <ShieldAlert className="w-8 h-8 text-[var(--mdt-text-active)]" />
          <div>
            <h1 className="text-white font-bold text-base tracking-wide">TG MDT</h1>
            <p className="text-xs opacity-60">LOS SANTOS POLICE DEPT.</p>
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  is_active 
                    ? "bg-[var(--mdt-bg-panel)] text-[var(--mdt-accent-primary)] font-medium" 
                    : "hover:bg-[var(--mdt-bg-hover)] text-[var(--mdt-text-muted)] hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile / Quick Actions */}
      <div className="bg-[var(--mdt-bg-panel)] rounded-xl p-4 border border-[var(--mdt-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
            <div className="w-full h-full bg-gray-600 flex items-center justify-center text-white">
              {playerData?.name?.charAt(0) || "U"}
            </div>
          </div>
          <div>
            <p className="text-white font-medium text-sm truncate w-32">
              {playerData?.name || "Unknown User"}
            </p>
            <p className="text-xs text-[var(--mdt-text-muted)] truncate w-32">
              {playerData?.badge || "Badge #----"}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-2 h-2 rounded-full bg-[var(--mdt-status-success)]"></div>
              <span className="text-[10px] text-[var(--mdt-status-success)] uppercase font-semibold tracking-wider">On Duty</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}