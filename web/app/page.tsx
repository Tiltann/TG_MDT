"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { fetchNui, useNuiEvent } from "@/lib/useNui";
import { Sidebar } from "./tablet/components/sidebar";
import { Topbar } from "./tablet/components/topbar";
import DashboardView from "./tablet/components/dashboard-view";
import IncidentsView from "./tablet/components/views/incidents-view";
import DispatchView from "./tablet/components/views/dispatch-view";
import PersonsView from "./tablet/components/views/persons-view";
import VehiclesView from "./tablet/components/views/vehicles-view";
import ReportsView from "./tablet/components/views/reports-view";
import WarrantsView from "./tablet/components/views/warrants-view";
import PenaltiesView from "./tablet/components/views/penalties-view";
import BoloView from "./tablet/components/views/bolo-view";
import SettingsView from "./tablet/components/views/settings-view";
import MapView from "./tablet/components/views/map-view";
import { defaultMockupBranding, defaultMockupModules } from "./tablet/lib/mockup-config";
import { createTranslator, normalizeLocale, type SupportedLocale } from "./tablet/lib/i18n";

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
  akteModels?: {
    person?: { fields?: AkteFieldSchema[]; data_fields?: DataFieldSchema[] };
    vehicle?: { fields?: AkteFieldSchema[]; data_fields?: DataFieldSchema[] };
  };
};

type AkteFieldSchema = {
  key: string;
  label_key?: string;
  type?: "text" | "textarea" | "select";
  default?: string;
  editable?: boolean;
  options?: Array<{ value: string; label_key?: string; label?: string }>;
};

type DataFieldSchema = {
  key: string;
  label_key?: string;
  fallback?: string;
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

type PersonAkte = Record<string, string>;

type VehicleAkte = Record<string, string>;

type AkteSyncPayload = {
  kind?: "person" | "vehicle";
  identifier?: string;
  plate?: string;
  akte?: PersonAkte | VehicleAkte;
};

type DutyState = {
  enabled?: boolean;
  onDuty?: boolean;
  framework?: string;
  jobName?: string;
  dutyJobName?: string;
  switchJobEnabled?: boolean;
  offDutyJobName?: string;
};

type SearchSuggestion = {
  id: string;
  label: string;
  subtitle: string;
  targetScreen: "persons" | "vehicles";
  query: string;
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
  const [isDutyBusy, setDutyBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const isBrowser = typeof window !== "undefined" && !("invokeNative" in window);
    if (isBrowser) {
      setHandshakeDone(true);
      return () => {
        isMounted = false;
      };
    }

    let attempts = 0;
    const maxAttempts = 60;
    const retryDelayMs = 500;

    const handshake = async () => {
      if (!isMounted) return;

      try {
        await fetchNui("nuiReady", {});
        if (isMounted) setHandshakeDone(true);
        return;
      } catch {
        attempts += 1;
      }

      if (attempts >= maxAttempts) {
        // Prevent a permanent blank screen if callback wiring is unavailable.
        if (isMounted) setHandshakeDone(true);
        return;
      }

      window.setTimeout(handshake, retryDelayMs);
    };

    void handshake();
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
  const dutyState = ((screenData?.duty as DutyState | undefined) || { onDuty: true }) as DutyState;
  const player_data =
    screenData?.player || { name: t("tablet.player.unknown_user"), gradeDisplay: "" };
  const actorName =
    typeof (player_data as { name?: unknown })?.name === "string" &&
    ((player_data as { name?: string }).name || "").trim() !== ""
      ? ((player_data as { name?: string }).name as string)
      : t("tablet.player.unknown_user");
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
  const personAkteSync = akteSyncData?.kind === "person" ? akteSyncData : undefined;
  const vehicleAkteSync = akteSyncData?.kind === "vehicle" ? akteSyncData : undefined;
  const personAkteFields = typedMeta.akteModels?.person?.fields || [];
  const vehicleAkteFields = typedMeta.akteModels?.vehicle?.fields || [];
  const personDataFields = typedMeta.akteModels?.person?.data_fields || [];
  const vehicleDataFields = typedMeta.akteModels?.vehicle?.data_fields || [];
  const rootStyle = {
    "--mdt-accent-primary": branding.accent || defaultMockupBranding.accent || "#ff9100",
  } as CSSProperties;

  const handleToggleDuty = async () => {
    if (isDutyBusy) return;
    setDutyBusy(true);
    try {
      const result = await fetchNui<DutyState>("toggleDuty", {
        switchJob: dutyState.switchJobEnabled === true,
      });

      if (result && typeof result === "object") {
        setScreenData((prev) => ({
          ...prev,
          duty: result,
        }));
      }
    } finally {
      setDutyBusy(false);
    }
  };

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return [];

    const score = (value: string): number => {
      const text = value.toLowerCase();
      if (text.startsWith(query)) return 120;
      if (text.includes(query)) return 70;
      return 0;
    };

    const personResults = personsData
      .map((person) => {
        const name = person.name || [person.firstname, person.lastname].filter(Boolean).join(" ") || t("tablet.player.unknown_user");
        const totalScore = Math.max(score(name), score(person.job || ""));
        return totalScore > 0
          ? {
              id: `person:${person.identifier}`,
              label: name,
              subtitle: `${t("tablet.sidebar.persons")} - ${person.job || t("tablet.persons.not_available")}`,
              targetScreen: "persons" as const,
              query: name,
              rank: totalScore,
            }
          : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    const vehicleResults = vehiclesData
      .map((vehicle) => {
        const plate = (vehicle.plate || "").toUpperCase();
        const model = String(vehicle.model || "");
        const owner = vehicle.ownerName || "";
        const totalScore = Math.max(score(plate), score(model), score(owner));
        return totalScore > 0
          ? {
              id: `vehicle:${plate}`,
              label: plate,
              subtitle: `${t("tablet.sidebar.vehicles")} - ${model || t("tablet.vehicles.not_available")}`,
              targetScreen: "vehicles" as const,
              query: plate,
              rank: totalScore,
            }
          : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    return [...personResults, ...vehicleResults]
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 2)
      .map(({ id, label, subtitle, targetScreen, query: nextQuery }) => ({
        id,
        label,
        subtitle,
        targetScreen,
        query: nextQuery,
      }));
  }, [globalSearch, personsData, t, vehiclesData]);

  const handleSearchSelect = (id: string) => {
    const selected = searchSuggestions.find((entry) => entry.id === id);
    if (!selected) return;
    setGlobalSearch(selected.query);
    setActiveScreen(selected.targetScreen);
  };

  const handleSearchSubmit = () => {
    if (searchSuggestions.length === 0) return;
    const best = searchSuggestions[0];
    setGlobalSearch(best.query);
    setActiveScreen(best.targetScreen);
  };

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
              dutyState={dutyState}
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
                searchSuggestions={searchSuggestions}
                onSearchSelect={handleSearchSelect}
                onSearchSubmit={handleSearchSubmit}
                dutyState={dutyState}
                isDutyBusy={isDutyBusy}
                onToggleDuty={handleToggleDuty}
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
                    actorName={actorName}
                    persons={personsData}
                    globalSearch={globalSearch}
                    initialAkten={personAktenData}
                    akteSync={personAkteSync}
                    akteFields={personAkteFields}
                    dataFields={personDataFields}
                  />
                )}
                {activeScreen === "vehicles" && (
                  <VehiclesView
                    t={t}
                    actorName={actorName}
                    vehicles={vehiclesData}
                    globalSearch={globalSearch}
                    initialAkten={vehicleAktenData}
                    akteSync={vehicleAkteSync}
                    akteFields={vehicleAkteFields}
                    dataFields={vehicleDataFields}
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
