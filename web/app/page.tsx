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
import PenaltiesView from "./components/views/penalties-view";
import BoloView from "./components/views/bolo-view";
import SettingsView from "./components/views/settings-view";
import MapView from "./components/views/map-view";
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
  mdt?: {
    allow_map_style_change?: boolean;
    default_map_style?: string;
  };
};

type MapStyle = "styleAtlas" | "styleGrid" | "styleSatelite";

type PersonRecord = {
  identifier: string;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  dob?: string | null;
  gender?: string | number | null;
  job?: string | null;
};

type VehicleRecord = {
  plate: string;
  ownerIdentifier?: string | null;
  ownerName?: string | null;
  model?: string | number | null;
  state?: string | number | null;
};

type PersonAkte = {
  phone?: string;
  address?: string;
  occupation?: string;
  dangerLevel?: string;
  warrantStatus?: string;
  driverLicense?: string;
  weaponLicense?: string;
  notes?: string;
};

type VehicleAkte = {
  modelName?: string;
  color?: string;
  registrationStatus?: string;
  insuranceStatus?: string;
  stolenStatus?: string;
  notes?: string;
};

type AkteSyncPayload = {
  kind?: "person" | "vehicle";
  identifier?: string;
  plate?: string;
  akte?: PersonAkte | VehicleAkte;
};

const MAP_STYLE_KEY = "tg_mdt_map_style";

function normalizeMapStyle(value?: string): MapStyle {
  return value === "styleGrid" || value === "styleSatelite" ? value : "styleAtlas";
}

function isMapStyle(value?: string | null): value is MapStyle {
  return value === "styleAtlas" || value === "styleGrid" || value === "styleSatelite";
}

export default function Home() {
  const [isHandshakeDone, setHandshakeDone] = useState(false);
  const [isVisible, setVisible] = useState(false);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const [screenData, setScreenData] = useState<Record<string, unknown>>({});
  const [localeOverride, setLocaleOverride] = useState<SupportedLocale | null>(null);
  const [accentOverride, setAccentOverride] = useState<string | null>(null);
  const [isLocaleReady, setLocaleReady] = useState(false);
  const [mapStyleOverride, setMapStyleOverride] = useState<MapStyle | null>(null);
  const [isMapStyleReady, setMapStyleReady] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

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
  const allowMapStyleChange = Boolean(typedMeta.mdt?.allow_map_style_change);
  const baseMapStyle = normalizeMapStyle(typedMeta.mdt?.default_map_style);
  const baseLocale = normalizeLocale(typedMeta.locale);
  const activeLocale = localeOverride || baseLocale;
  const activeMapStyle = allowMapStyleChange ? (mapStyleOverride || baseMapStyle) : baseMapStyle;
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
    if (typeof window === "undefined") {
      return;
    }

    try {
      const savedLocale = window.localStorage.getItem("tg_mdt_locale");
      const normalizedLocale = savedLocale === "de" ? "de" : savedLocale === "en" ? "en" : null;
      setLocaleOverride(normalizedLocale || baseLocale);
    } catch {
      setLocaleOverride(baseLocale);
    } finally {
      setLocaleReady(true);
    }
  }, [baseLocale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!allowMapStyleChange) {
      setMapStyleOverride(baseMapStyle);
      setMapStyleReady(true);
      try {
        window.localStorage.setItem(MAP_STYLE_KEY, baseMapStyle);
      } catch {
        // Ignore storage failures in restricted browser contexts.
      }
      return;
    }

    try {
      const savedMapStyle = window.localStorage.getItem(MAP_STYLE_KEY);
      const normalizedMapStyle = isMapStyle(savedMapStyle) ? savedMapStyle : baseMapStyle;
      setMapStyleOverride(normalizedMapStyle);
    } catch {
      setMapStyleOverride(baseMapStyle);
    } finally {
      setMapStyleReady(true);
    }
  }, [allowMapStyleChange, baseMapStyle]);

  useEffect(() => {
    if (!isLocaleReady || typeof window === "undefined") {
      return;
    }

    try {
      if (localeOverride) {
        window.localStorage.setItem("tg_mdt_locale", localeOverride);
      } else {
        window.localStorage.removeItem("tg_mdt_locale");
      }
    } catch {
      // Ignore storage failures in restricted browser contexts.
    }
  }, [isLocaleReady, localeOverride]);

  useEffect(() => {
    if (!isMapStyleReady || typeof window === "undefined") {
      return;
    }

    try {
      if (!allowMapStyleChange) {
        window.localStorage.setItem(MAP_STYLE_KEY, baseMapStyle);
        return;
      }

      if (mapStyleOverride) {
        window.localStorage.setItem(MAP_STYLE_KEY, mapStyleOverride);
      } else {
        window.localStorage.setItem(MAP_STYLE_KEY, baseMapStyle);
      }
    } catch {
      // Ignore storage failures in restricted browser contexts.
    }
  }, [allowMapStyleChange, baseMapStyle, isMapStyleReady, mapStyleOverride]);

  const t = useMemo(
    () => createTranslator(activeLocale, activeTranslations),
    [activeLocale, activeTranslations]
  );
  const player_data =
    screenData?.player || { name: t("tablet.player.mock_user"), badge: branding.badge };
  const mapData = (screenData?.map as Record<string, unknown> | undefined) || {};
  const mapMarkers = Array.isArray(mapData.markers)
    ? (mapData.markers as Array<{ x: number; y: number; label?: string }>)
    : [];
  const playerPosition =
    (mapData.playerPosition as { x: number; y: number } | undefined) || undefined;
  const personsData = Array.isArray(screenData?.persons)
    ? (screenData.persons as PersonRecord[])
    : [];
  const vehiclesData = Array.isArray(screenData?.vehicles)
    ? (screenData.vehicles as VehicleRecord[])
    : [];
  const personAktenData = ((screenData?.personAkten as Record<string, PersonAkte>) || {});
  const vehicleAktenData = ((screenData?.vehicleAkten as Record<string, VehicleAkte>) || {});
  const akteSyncData = (screenData?.akteSync as AkteSyncPayload | undefined) || undefined;
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
                searchValue={globalSearch}
                onSearchChange={setGlobalSearch}
                onOpenSettings={() => setActiveScreen("settings")}
                onClose={() => fetchNui("hideUI", {}).catch(() => setVisible(false))}
              />
              
              <div className="flex-1 overflow-hidden p-6">
                {(!activeScreen || activeScreen === "dashboard" || activeScreen === "tablet") && <DashboardView branding={branding} modules={current_modules} t={t} />}
                {activeScreen === "incidents" && <IncidentsView t={t} />}
                {activeScreen === "dispatch" && <DispatchView t={t} />}
                {activeScreen === "persons" && (
                  <PersonsView
                    t={t}
                    persons={personsData}
                    globalSearch={globalSearch}
                    initialAkten={personAktenData}
                    akteSync={akteSyncData}
                  />
                )}
                {activeScreen === "vehicles" && (
                  <VehiclesView
                    t={t}
                    vehicles={vehiclesData}
                    globalSearch={globalSearch}
                    initialAkten={vehicleAktenData}
                    akteSync={akteSyncData}
                  />
                )}
                {activeScreen === "reports" && <ReportsView t={t} />}
                {activeScreen === "warrants" && <WarrantsView t={t} />}
                {activeScreen === "penalties" && <PenaltiesView t={t} />}
                {activeScreen === "bolo" && <BoloView t={t} />}
                {activeScreen === "map" && (
                  <MapView
                    t={t}
                    accent={branding.accent || defaultMockupBranding.accent || "#ff9100"}
                    mapStyle={activeMapStyle}
                    markers={mapMarkers}
                    playerPosition={playerPosition}
                  />
                )}
                {activeScreen === "settings" && (
                  <SettingsView
                    t={t}
                    locale={activeLocale}
                    onLocaleChange={(nextLocale) => setLocaleOverride(nextLocale)}
                    allowMapStyleChange={allowMapStyleChange}
                    mapStyle={activeMapStyle}
                    onMapStyleChange={(nextStyle) => setMapStyleOverride(nextStyle)}
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
