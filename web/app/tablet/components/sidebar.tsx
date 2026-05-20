"use client";

import { Home, RadioReceiver, Users, Car, BookOpen, MessageSquare, CalendarDays, Scale, Bell, Settings } from "lucide-react";
import type { TFunction } from "../lib/i18n";

type Branding = {
  name?: string;
  subtitle?: string;
  accent?: string;
  logoUrl?: string;
};

type DutyState = {
  onDuty?: boolean;
};

export function Sidebar({
  currentView,
  modules,
  onScreenChange,
  onOpenProfile,
  playerData,
  dutyState,
  branding,
  t,
}: {
  currentView: string;
  modules: Record<string, boolean>;
  onScreenChange: (screen: string) => void;
  onOpenProfile: () => void;
  playerData: any;
  dutyState: DutyState;
  branding: Branding;
  t: TFunction;
}) {
  const menu_items = [
    { id: "dashboard", label: t("tablet.sidebar.dashboard"), icon: Home },
    { id: "blackboard", label: t("tablet.sidebar.blackboard"), icon: BookOpen },
    { id: "dispatch", label: t("tablet.sidebar.dispatch"), icon: RadioReceiver },
    { id: "persons", label: t("tablet.sidebar.persons"), icon: Users },
    { id: "vehicles", label: t("tablet.sidebar.vehicles"), icon: Car },
    { id: "warrants", label: t("tablet.sidebar.warrants"), icon: Bell },
    { id: "penalties", label: t("tablet.sidebar.penalty_catalog"), icon: Scale },
    { id: "livemap", label: t("tablet.sidebar.livemap"), icon: BookOpen },
    { id: "chat", label: t("tablet.sidebar.chat"), icon: MessageSquare },
    { id: "shifts", label: t("tablet.sidebar.shifts"), icon: CalendarDays },
    { id: "settings", label: t("tablet.sidebar.settings"), icon: Settings },
  ];

  const accent = branding.accent || "#ff9100";
  const isOnDuty = dutyState?.onDuty !== false;

  return (
    <aside className="flex h-full w-[23rem] flex-shrink-0 flex-col border-r border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] p-5">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-semibold overflow-hidden" style={{ boxShadow: `0 0 0 1px ${accent}22 inset` }}>
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.name || "MDT"} className="h-full w-full object-cover" />
            ) : (
              branding.name?.slice(0, 2)?.toUpperCase() || "TG"
            )}
          </div>
          <div>
            <h1 className="text-white font-bold text-base tracking-wide">{branding.name || "TG MDT"}</h1>
            <p className="text-xs opacity-60">{branding.subtitle || t("tablet.branding.subtitle")}</p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-2">
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
      <div className="mt-4 shrink-0">
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-full bg-[var(--mdt-bg-panel)] rounded-xl p-4 border border-[var(--mdt-border)] text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/8 overflow-hidden flex-shrink-0 border border-white/10">
              {playerData?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={playerData.imageUrl} alt={playerData?.name || "profile"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center text-white">
                  {playerData?.name?.charAt(0) || "U"}
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-medium text-sm truncate w-32">
                {playerData?.name || t("tablet.player.unknown_user")}
              </p>
              {playerData?.gradeDisplay && (
                <p className="text-xs text-[var(--mdt-text-muted)] truncate w-32">
                  {playerData?.gradeDisplay}
                </p>
              )}
              <div className="flex items-center gap-1 mt-1">
                <div className={`w-2 h-2 rounded-full ${isOnDuty ? "bg-[var(--mdt-status-success)]" : "bg-yellow-400"}`}></div>
                <span className={`text-[10px] uppercase font-semibold tracking-wider ${isOnDuty ? "text-[var(--mdt-status-success)]" : "text-yellow-300"}`}>
                  {isOnDuty ? t("tablet.player.on_duty") : t("tablet.topbar.duty_off")}
                </span>
              </div>
            </div>
          </div>
        </button>

      </div>
    </aside>
  );
}