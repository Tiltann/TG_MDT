"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { fetchNui, useNuiEvent } from "@/lib/useNui";
import { Sidebar } from "./components/sidebar";
import { Topbar } from "./components/topbar";
import DashboardView from "./components/dashboard-view";
import IncidentsView from "./components/views/incidents-view";
import DispatchView from "./components/views/dispatch-view";
import PersonsView from "./components/views/persons-view";
import VehiclesView from "./components/views/vehicles-view";
import ReportsView from "./components/views/reports-view";
import WarrantsView from "./components/views/warrants-view";
import EvidenceView from "./components/views/evidence-view";
import BoloView from "./components/views/bolo-view";
import SettingsView from "./components/views/settings-view";
import { defaultMockupBranding, defaultMockupModules } from "./lib/mockup-config";
import { createTranslator, normalizeLocale, type SupportedLocale } from "./lib/i18n";

type NuiVisibilityPayload = {
  visible?: boolean;
  screen?: string | null;
};

type NuiScreenPayload = {
  screen?: string | null;
};

type NuiDataPayload = {
  key?: string;
  value?: unknown;
};

type NuiBrandingPayload = {
  name?: string;
  subtitle?: string;
  accent?: string;
  badge?: string;
  greeting?: string;
  dateLabel?: string;
};

type NuiMetaPayload = {
  locale?: string;
  modules?: Record<string, boolean>;
  branding?: NuiBrandingPayload;
  translations?: Record<string, string>;
  translationsByLocale?: Record<string, Record<string, string>>;
};

export default function Home() {
  const [isHandshakeDone, setHandshakeDone] = useState(false);
  const [isVisible, setVisible] = useState(false);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const [screenData, setScreenData] = useState<Record<string, unknown>>({});
  const [localeOverride, setLocaleOverride] = useState<SupportedLocale | null>(null);
  const [accentOverride, setAccentOverride] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const handshake = async () => {
      try {
        await fetchNui("nuiReady", {});
      } catch {
        // Browser/dev mode can run without a game client callback.
      } finally {
        if (isMounted) setHandshakeDone(true);
      }
    };

    handshake();
    return () => {
      isMounted = false;
    };
  }, []);

  useNuiEvent<NuiVisibilityPayload>("setVisible", (data) => {
    setVisible(Boolean(data?.visible));
    setActiveScreen(data?.screen ?? null);
  });

  useNuiEvent<NuiScreenPayload>("setScreen", (data) => {
    setActiveScreen(data?.screen ?? null);
  });

  useNuiEvent<NuiDataPayload>("setData", (data) => {
    if (!data?.key) return;
    setScreenData((prev) => ({
      ...prev,
      [data.key as string]: data.value,
    }));
  });

  // Fallback for browser dev mode to always show UI
  const is_browser = typeof window !== "undefined" && !("invokeNative" in window);
  const show_ui = is_browser || (isVisible && activeScreen !== null);

  const meta = (screenData?.meta as any) || {};
  const typedMeta = meta as NuiMetaPayload;
  const current_modules = typedMeta.modules || defaultMockupModules;
  const baseLocale = normalizeLocale(typedMeta.locale);
  const activeLocale = localeOverride || baseLocale;
  const translationsByLocale = typedMeta.translationsByLocale || {};
  const activeTranslations =
    translationsByLocale[activeLocale] ||
    (activeLocale === baseLocale ? typedMeta.translations : undefined) ||
    translationsByLocale.en ||
    typedMeta.translations;

  const branding = {
    ...defaultMockupBranding,
    ...(typedMeta.branding as NuiBrandingPayload | undefined),
    accent: accentOverride || typedMeta.branding?.accent || defaultMockupBranding.accent,
  };

  useEffect(() => {
    if (!localeOverride) {
      setLocaleOverride(baseLocale);
    }
  }, [baseLocale, localeOverride]);

  const t = useMemo(
    () => createTranslator(activeLocale, activeTranslations),
    [activeLocale, activeTranslations]
  );
  const player_data =
    screenData?.player || { name: t("tablet.player.mock_user"), badge: branding.badge };
  const rootStyle = {
    "--mdt-accent-primary": branding.accent || defaultMockupBranding.accent || "#ff9100",
  } as CSSProperties;

  // show absolutely nothing until NUI handshake is done.
  if (!isHandshakeDone && !is_browser) return null;

  return (
    <main className="nui-root" data-visible={show_ui ? "true" : "false"} style={rootStyle}>
      <div className="nui-layer nui-layer-bg" />

      {show_ui && (
        <section className="nui-layer nui-layer-tablet" aria-label="tablet-ui">
          <div className="tablet-shell flex text-sm text-[var(--mdt-text-muted)]">
            
            {/* Modular Sidebar Component */}
            <Sidebar 
              currentView={activeScreen || "dashboard"} 
              modules={current_modules}
              playerData={player_data}
              branding={branding}
              t={t}
              onScreenChange={(screen) => setActiveScreen(screen)}
            />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <Topbar
                branding={branding}
                t={t}
                onOpenSettings={() => setActiveScreen("settings")}
                onClose={() => fetchNui("hideUI", {}).catch(() => setVisible(false))}
              />
              
              <div className="flex-1 overflow-hidden p-6">
                {(!activeScreen || activeScreen === "dashboard" || activeScreen === "tablet") && <DashboardView branding={branding} modules={current_modules} t={t} />}
                {activeScreen === "incidents" && <IncidentsView t={t} />}
                {activeScreen === "dispatch" && <DispatchView t={t} />}
                {activeScreen === "persons" && <PersonsView t={t} />}
                {activeScreen === "vehicles" && <VehiclesView t={t} />}
                {activeScreen === "reports" && <ReportsView t={t} />}
                {activeScreen === "warrants" && <WarrantsView t={t} />}
                {activeScreen === "evidence" && <EvidenceView t={t} />}
                {activeScreen === "bolo" && <BoloView t={t} />}
                {activeScreen === "settings" && (
                  <SettingsView
                    t={t}
                    locale={activeLocale}
                    onLocaleChange={(nextLocale) => setLocaleOverride(nextLocale)}
                    accentColor={branding.accent || defaultMockupBranding.accent || "#ff9100"}
                    defaultAccent={typedMeta.branding?.accent || defaultMockupBranding.accent || "#ff9100"}
                    onAccentColorChange={(accent) => setAccentOverride(accent)}
                    onResetAccent={() => setAccentOverride(null)}
                  />
                )}
              </div>
            </div>

          </div>
        </section>
      )}
    </main>
  );
}
