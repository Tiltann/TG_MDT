"use client";

import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { SupportedLocale, TFunction } from "../../lib/i18n";
import { Settings, Globe, Map, Palette, RefreshCw } from "lucide-react";

type MapStyle = "styleAtlas" | "styleGrid" | "styleSatelite";

type SettingsViewProps = {
  t: TFunction;
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  allowMapStyleChange: boolean;
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  accentColor: string;
  defaultAccent: string;
  onAccentColorChange: (accent: string) => void;
  onResetAccent: () => void;
};

export default function SettingsView({
  t,
  locale,
  onLocaleChange,
  allowMapStyleChange,
  mapStyle,
  onMapStyleChange,
  accentColor,
  defaultAccent,
  onAccentColorChange,
  onResetAccent,
}: SettingsViewProps) {
  // Preset tactical accent colors
  const colorPresets = [
    { name: "Amber Tactical", value: "#F59E0B" },
    { name: "Stealth Blue", value: "#3B82F6" },
    { name: "Emerald Sentinel", value: "#10B981" },
    { name: "Stealth Grey", value: "#6B7280" },
    { name: "Neon Violet", value: "#8B5CF6" },
    { name: "Crimson Command", value: "#EF4444" },
  ];

  return (
    <div className="space-y-6 animate-mdt-view">
      {/* Title block with tactical ornament */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--mdt-accent-primary)] animate-spin" style={{ animationDuration: "12s" }} />
            <h3 className="text-xl  font-black tracking-widest text-white uppercase">
              {t("tablet.settings.title")}
            </h3>
          </div>
          <p className="text-[10px] text-zinc-500  tracking-wider mt-1 uppercase">
            MDT COMPONENT MANAGEMENT & DIAGNOSTIC CONFIGURATION
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Localization Deck */}
        <Card className="relative overflow-hidden bg-zinc-950/25 border border-zinc-900 rounded-2xl p-5 shadow-xl shadow-black/35 flex flex-col justify-between group">
          {/* Decorative Corner Brackets */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-800 group-hover:border-[var(--mdt-accent-primary)]/40 transition-colors" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-800 group-hover:border-[var(--mdt-accent-primary)]/40 transition-colors" />
          
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-zinc-400 group-hover:text-[var(--mdt-accent-primary)] transition-colors" />
              <p className="text-xs  font-black tracking-widest text-zinc-400 uppercase">
                {t("tablet.settings.locale_section")}
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px]  font-bold tracking-widest text-zinc-500 uppercase" htmlFor="locale-select">
                {t("tablet.settings.locale_label")}
              </label>
              <div className="relative w-full max-w-xs">
                <select
                  id="locale-select"
                  value={locale}
                  onChange={(event) => onLocaleChange(event.target.value as SupportedLocale)}
                  className="w-full appearance-none bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/60 text-zinc-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-[var(--mdt-accent-primary)] focus:ring-1 focus:ring-[var(--mdt-accent-primary)]/20 transition-all  text-sm cursor-pointer shadow-inner"
                >
                  <option value="en" className="bg-zinc-950">{t("tablet.settings.locale_option_en")}</option>
                  <option value="de" className="bg-zinc-950">{t("tablet.settings.locale_option_de")}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-[9px]  text-zinc-650 tracking-wider">
            {t("tablet.settings.locale_hint_line")}
          </div>
        </Card>

        {/* Tactical HUD Map Deck */}
        {allowMapStyleChange && (
          <Card className="relative overflow-hidden bg-zinc-950/25 border border-zinc-900 rounded-2xl p-5 shadow-xl shadow-black/35 flex flex-col justify-between group">
            {/* Decorative Corner Brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-800 group-hover:border-[var(--mdt-accent-primary)]/40 transition-colors" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-800 group-hover:border-[var(--mdt-accent-primary)]/40 transition-colors" />

            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Map className="w-4 h-4 text-zinc-400 group-hover:text-[var(--mdt-accent-primary)] transition-colors" />
                <p className="text-xs  font-black tracking-widest text-zinc-400 uppercase">
                  {t("tablet.settings.map_style_section")}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px]  font-bold tracking-widest text-zinc-500 uppercase" htmlFor="map-style-select">
                  {t("tablet.settings.map_style_label")}
                </label>
                <div className="relative w-full max-w-xs">
                  <select
                    id="map-style-select"
                    value={mapStyle}
                    onChange={(event) => onMapStyleChange(event.target.value as MapStyle)}
                    className="w-full appearance-none bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/60 text-zinc-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-[var(--mdt-accent-primary)] focus:ring-1 focus:ring-[var(--mdt-accent-primary)]/20 transition-all  text-sm cursor-pointer shadow-inner"
                  >
                    <option value="styleAtlas" className="bg-zinc-950">{t("tablet.map.style.atlas")}</option>
                    <option value="styleGrid" className="bg-zinc-950">{t("tablet.map.style.grid")}</option>
                    <option value="styleSatelite" className="bg-zinc-950">{t("tablet.map.style.satellite")}</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
                <p className="text-[10px]  text-zinc-500 leading-normal mt-1">
                  {t("tablet.settings.map_style_hint")}
                </p>
              </div>
            </div>

            <div className="mt-4 text-[9px]  text-zinc-650 tracking-wider">
              {t("tablet.settings.map_hint_line")}
            </div>
          </Card>
        )}
      </div>

      {/* Core Accent Tuning Panel */}
      <Card className="relative overflow-hidden bg-zinc-950/25 border border-zinc-900 rounded-2xl p-6 shadow-xl shadow-black/35 group space-y-6">
        {/* Decorative Corner Brackets */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-800 group-hover:border-[var(--mdt-accent-primary)]/40 transition-colors" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-800 group-hover:border-[var(--mdt-accent-primary)]/40 transition-colors" />

        <div className="flex items-center gap-2.5 border-b border-zinc-900 pb-3">
          <Palette className="w-4 h-4 text-zinc-400 group-hover:text-[var(--mdt-accent-primary)] transition-colors" />
          <p className="text-xs  font-black tracking-widest text-zinc-400 uppercase">
            {t("tablet.settings.accent_section")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Active Accent Cockpit Gauge */}
          <div className="lg:col-span-4 flex items-center gap-4 bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4">
            <div 
              className="w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all duration-500 relative"
              style={{ 
                borderColor: accentColor,
                boxShadow: `0 0 16px ${accentColor}33, inset 0 0 12px ${accentColor}22` 
              }}
            >
              <div 
                className="w-6 h-6 rounded-full opacity-60 animate-ping absolute"
                style={{ backgroundColor: accentColor }}
              />
              <div 
                className="w-3 h-3 rounded-full z-10"
                style={{ backgroundColor: accentColor }}
              />
            </div>
            <div className="space-y-1 ">
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">{t("tablet.settings.system_active_hex")}</p>
              <p className="text-sm font-black text-white tracking-widest bg-black/40 px-2.5 py-1 rounded border border-zinc-900">
                {accentColor.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Tactical color preset matrix */}
          <div className="lg:col-span-8 space-y-2">
            <p className="text-[10px]  font-bold tracking-widest text-zinc-500 uppercase">
              {t("tablet.settings.tactical_presets")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {colorPresets.map((preset) => {
                const isActive = accentColor.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onAccentColorChange(preset.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all active:scale-[0.96] cursor-pointer ${
                      isActive
                        ? "border-[var(--mdt-accent-primary)] bg-[var(--mdt-accent-primary)]/5 text-white"
                        : "border-zinc-900 bg-zinc-950/45 hover:border-zinc-900 hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-300"
                      style={{ 
                        backgroundColor: preset.value, 
                        boxShadow: isActive ? `0 0 10px ${preset.value}` : `0 0 4px ${preset.value}88` 
                      }}
                    />
                    <span className="text-[9px]  font-bold tracking-wider uppercase truncate">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Custom tuner block */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-zinc-950/30 border border-zinc-900/60 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <label className="text-[10px] text-zinc-400  tracking-widest font-bold uppercase shrink-0" htmlFor="accent-color-picker">
              CUSTOM TUNER:
            </label>
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-zinc-800/80 hover:border-zinc-700/80 flex items-center justify-center bg-black/45 hover:shadow-[0_0_12px_rgba(255,255,255,0.02)] transition-all shrink-0 cursor-pointer">
              <input
                id="accent-color-picker"
                type="color"
                value={accentColor}
                onChange={(event) => onAccentColorChange(event.target.value)}
                className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
              />
              <div 
                className="w-6 h-6 rounded-full border border-white/10" 
                style={{ 
                  backgroundColor: accentColor, 
                  boxShadow: `0 0 14px ${accentColor}88` 
                }} 
              />
            </div>
          </div>
          <p className="text-[10px]  text-zinc-500 leading-normal max-w-md">
            {t("tablet.settings.accent_hint", { color: accentColor })}
          </p>
        </div>

        {/* Defaults Reset Segment (Cold Reset System warning aesthetic) */}
        <div className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-zinc-500  tracking-widest font-black uppercase">
              SYSTEM RECOVERY CORE
            </p>
            <p className="text-[9px] text-zinc-650  mt-0.5 uppercase">
              {t("tablet.settings.accent_default", { color: defaultAccent })}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onResetAccent}
            className="inline-flex items-center gap-2 border border-red-500/25 hover:border-red-500/50 hover:bg-red-500/5 text-red-400 hover:text-red-300  font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition-all active:scale-[0.96] shadow-[0_0_12px_rgba(239,68,68,0.05)] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
            <span>[ SYSTEM COLD RESET ]</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
