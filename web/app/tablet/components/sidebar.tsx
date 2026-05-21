"use client";

import { Home, RadioReceiver, Users, Car, BookOpen, MessageSquare, Scale, Settings } from "lucide-react";
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
    { id: "penalties", label: t("tablet.sidebar.penalty_catalog"), icon: Scale },
    { id: "livemap", label: t("tablet.sidebar.livemap"), icon: BookOpen },
    { id: "chat", label: t("tablet.sidebar.live_chat", undefined, t("tablet.sidebar.chat")), icon: MessageSquare },
    { id: "settings", label: t("tablet.sidebar.settings"), icon: Settings },
  ];

  const accent = branding.accent || "#ff9100";
  const isOnDuty = dutyState?.onDuty !== false;

  return (
    <aside className="flex h-full w-[23rem] flex-shrink-0 flex-col border-r border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] p-5">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Top Header Block with dynamic accent overlay shadow */}
        <div className="mb-8 flex items-center gap-3 px-2">
          <div 
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-semibold overflow-hidden transition-all duration-300" 
            style={{ 
              boxShadow: `0 0 10px ${accent}15, inset 0 0 0 1px ${accent}22`
            }}
          >
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.name || "MDT"} className="h-full w-full object-cover animate-mdt-fade-in" />
            ) : (
              branding.name?.slice(0, 2)?.toUpperCase() || "TG"
            )}
          </div>
          <div className="">
            <h1 className="text-white font-black text-sm tracking-widest uppercase">{branding.name || "TG MDT"}</h1>
            <p className="text-[9px] text-zinc-500 tracking-wider mt-0.5 uppercase">{branding.subtitle || t("tablet.branding.subtitle")}</p>
          </div>
        </div>

        {/* Navigation List Menu */}
        <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-2 premium-scroll">
          {menu_items.map((item) => {
            // Check if feature module is enabled (or if it's the base dashboard)
            const is_enabled = item.id === "dashboard" || modules[item.id] !== false;
            
            if (!is_enabled) return null;

            const is_active = currentView === item.id || (currentView === "tablet" && item.id === "dashboard");
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onScreenChange(item.id)}
                className={`group w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 relative active:scale-[0.98] cursor-pointer ${
                  is_active 
                    ? "bg-gradient-to-r from-white/[0.06] via-white/[0.01] to-transparent font-bold shadow-[inset_1px_0_0_0_rgba(255,255,255,0.04)]" 
                    : "hover:bg-[var(--mdt-bg-hover)] text-[var(--mdt-text-muted)] hover:text-white"
                }`}
                style={is_active ? { color: accent, borderLeft: `3px solid ${accent}` } : { borderLeft: "3px solid transparent" }}
              >
                {/* Active Indicator overlay glow */}
                {is_active && (
                  <div className="absolute inset-y-0 left-0 w-8 bg-[var(--mdt-accent-primary)]/5 blur-md pointer-events-none" style={{ backgroundColor: `${accent}0b` }} />
                )}
                
                <item.icon className={`w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110 ${is_active ? "scale-105" : "opacity-80"}`} style={is_active ? { filter: `drop-shadow(0 0 6px ${accent}44)` } : undefined} />
                <span className="text-xs  tracking-widest uppercase transition-colors">{item.label}</span>
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
          className="group w-full glass-panel bg-black/45 rounded-2xl p-4 border border-white/5 text-left hover:bg-white/[0.03] hover:border-white/10 active:scale-[0.96] transition-all duration-300 shadow-xl shadow-black/45 relative overflow-hidden cursor-pointer"
          style={{
            boxShadow: `0 12px 30px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02)${
              isOnDuty 
                ? ", 0 0 20px rgba(16,185,129,0.08)" 
                : `, 0 0 20px ${accent}15`
            }`
          }}
        >
          {/* Cybernetic scanning background grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_96%,rgba(255,255,255,0.02)_96%)] bg-[size:100%_10px] opacity-35 group-hover:opacity-50 transition-opacity pointer-events-none" />
          
          {/* Accent bottom overlay line */}
          <div 
            className="absolute bottom-0 left-0 h-[3px] w-full bg-transparent group-hover:opacity-100 opacity-60 transition-all duration-500" 
            style={{ 
              backgroundImage: isOnDuty 
                ? "linear-gradient(to right, #10B981, transparent)" 
                : `linear-gradient(to right, ${accent}, transparent)` 
            }} 
          />
          
          <div className="flex items-center gap-3.5 relative z-10">
            {/* Holographic Avatar ring with duty status */}
            <div 
              className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 transition-all duration-500 relative flex items-center justify-center p-0.5 ${
                isOnDuty 
                  ? "border-emerald-500/30 group-hover:border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_18px_rgba(16,185,129,0.35)]" 
                  : "border-zinc-800 group-hover:border-[var(--mdt-accent-primary)]/80 shadow-[0_0_12px_rgba(0,0,0,0.5)]"
              }`}
              style={isOnDuty ? undefined : { 
                borderColor: `${accent}33`,
                boxShadow: `0 0 12px ${accent}15`
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden relative">
                {playerData?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={playerData.imageUrl} 
                    alt={playerData?.name || "profile"} 
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-115" 
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white font-bold text-sm tracking-wider ">
                    {playerData?.name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              {/* Inner HUD bracket frame */}
              <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none scale-[1.03]" />
            </div>
            
            <div className="min-w-0 flex-1">
              <p 
                className="text-white font-black text-xs truncate tracking-wider group-hover:text-[var(--mdt-accent-primary)] transition-colors duration-300  uppercase"
                style={isOnDuty ? undefined : { color: undefined }}
              >
                {playerData?.name || t("tablet.player.unknown_user")}
              </p>
              {playerData?.gradeDisplay && (
                <p className="text-[9px] text-[var(--mdt-text-muted)] truncate font-semibold mt-0.5 tracking-widest uppercase ">
                  {playerData?.gradeDisplay}
                </p>
              )}
              
              {/* Dynamic duty badge container */}
              <div className="flex">
                <div 
                  className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full border transition-all duration-300 ${
                    isOnDuty 
                      ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/40" 
                      : "bg-amber-500/5 border-amber-500/25 text-amber-400 group-hover:bg-amber-500/10 group-hover:border-amber-500/40"
                  }`}
                  style={isOnDuty ? undefined : { 
                    borderColor: `${accent}33`, 
                    color: accent,
                    backgroundColor: `${accent}05`
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full relative flex items-center justify-center">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${isOnDuty ? "bg-emerald-400" : "bg-amber-400"}`} style={isOnDuty ? undefined : { backgroundColor: accent }} />
                    <span className={`relative inline-flex rounded-full h-1 w-1 ${isOnDuty ? "bg-emerald-500" : "bg-amber-500"}`} style={isOnDuty ? undefined : { backgroundColor: accent }} />
                  </div>
                  <span className="text-[7.5px] uppercase font-black tracking-[0.16em]  leading-none">
                    {isOnDuty ? t("tablet.player.on_duty") : t("tablet.topbar.duty_off")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}