"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { fetchNui, useNuiEvent } from "@/lib/useNui";
import { Sidebar } from "./tablet/components/sidebar";
import { Topbar } from "./tablet/components/topbar";
import DashboardView from "./tablet/components/dashboard-view";
import BlackboardView from "./tablet/components/views/blackboard-view";
import DispatchView from "./tablet/components/views/dispatch-view";
import ChatView from "./tablet/components/views/chat-view";
import BoloView from "./tablet/components/views/bolo-view";
import WarrantsView from "./tablet/components/views/warrants-view";
import PenaltiesView from "./tablet/components/views/penalties-view";
import PersonsView from "./tablet/components/views/persons-view";
import VehiclesView from "./tablet/components/views/vehicles-view";
import ProfileView from "./tablet/components/views/profile-view";
import LiveMapView from "./tablet/components/views/livemap-view";
import SettingsView from "./tablet/components/views/settings-view";
import ShiftsView from "./tablet/components/views/shifts-view";
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
  logoUrl?: string;
};

type NuiMetaPayload = {
  locale?: string;
  framework?: string;
  modules?: Record<string, boolean>;
  branding?: NuiBrandingPayload;
  translations?: Record<string, string>;
  translationsByLocale?: Record<string, Record<string, string>>;
  mdt?: {
    player_name_mode?: "fullname" | "firstname" | "lastname";
    allow_map_style_change?: boolean;
    default_map_style?: string;
    chat?: {
      auto_delete_after_minutes?: number;
    };
    allowed_jobs?: string[];
    departments?: Record<string, { label: string; jobs: string[]; logo_url?: string }>;
    branding?: {
      title_template?: string;
      logo_url?: string;
      job_overrides?: Record<string, { title?: string; logo_url?: string }>;
    };
  };
  akteModels?: {
    person?: { fields?: AkteFieldSchema[]; data_fields?: DataFieldSchema[] };
    vehicle?: { fields?: AkteFieldSchema[]; data_fields?: DataFieldSchema[] };
    job_models?: Record<
      string,
      {
        compartment?: string;
        jobs?: string[];
        shared_with?: string[];
        person?: { fields?: AkteFieldSchema[]; data_fields?: DataFieldSchema[] };
        vehicle?: { fields?: AkteFieldSchema[]; data_fields?: DataFieldSchema[] };
      }
    >;
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
  compartment?: string;
  akte?: PersonAkte | VehicleAkte;
};

type ClockPayload = {
  hour?: number;
  minute?: number;
  period?: "morning" | "evening";
  label?: string;
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

type DashboardActivity = {
  id: string;
  kind: "system" | "duty" | "person" | "vehicle";
  title: string;
  detail: string;
  timestamp: string;
};

type ProfileData = {
  name: string;
  imageUrl: string;
};

type ChatMessage = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  avatarUrl?: string;
  gradeDisplay?: string;
};

const CHAT_AUTO_DELETE_DISABLED = 0;

type BoardPost = {
  id: string;
  title: string;
  body: string;
  images: string[];
  author: string;
  createdAt: string;
};

type ShiftRecord = {
  id: string;
  title: string;
  note: string;
  createdAt: string;
};

type PlayerUiPayload = {
  name?: string;
  firstname?: string;
  lastname?: string;
  gradeDisplay?: string;
  gradeLevel?: number;
  gradeCount?: number;
};

type StartupValidationError = "meta_missing" | "modules_missing" | "translations_missing";

type IncidentRecord = {
  id: string;
  title: string;
  description: string;
  location: string;
  severity: "low" | "medium" | "high";
  status: "open" | "investigating" | "closed";
  linkedPersons: string[];
  linkedVehicles: string[];
  createdAt: string;
  updatedAt: string;
};

type BoloRecord = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "active" | "resolved";
  linkedPersons: string[];
  linkedVehicles: string[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEYS = {
  profile: "tg_mdt_profile",
  chat: "tg_mdt_chat_messages",
  incidents: "tg_mdt_incidents",
  bolos: "tg_mdt_bolos",
  boardPosts: "tg_mdt_board_posts",
  shifts: "tg_mdt_shifts",
};

const DEFAULT_PROFILE: ProfileData = {
  name: "",
  imageUrl: "",
};

const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [];
const DEFAULT_INCIDENTS: IncidentRecord[] = [];
const DEFAULT_BOLOS: BoloRecord[] = [];
const DEFAULT_BOARD_POSTS: BoardPost[] = [];
const DEFAULT_SHIFTS: ShiftRecord[] = [];

const MAP_STYLE_KEY = "tg_mdt_map_style";

function normalizeMapStyle(value?: string): MapStyle {
  return value === "styleGrid" || value === "styleSatelite" ? value : "styleAtlas";
}

function isMapStyle(value?: string | null): value is MapStyle {
  return value === "styleAtlas" || value === "styleGrid" || value === "styleSatelite";
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function loadJsonArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function loadJsonObject<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeJobKey(job?: string): string {
  return typeof job === "string" ? job.trim().toLowerCase() : "";
}

function resolveJobAkteModels(meta: NuiMetaPayload, job?: string) {
  const basePerson = meta.akteModels?.person;
  const baseVehicle = meta.akteModels?.vehicle;
  const byJob = meta.akteModels?.job_models || {};
  const viewerJob = normalizeJobKey(job);

  const matchesViewerJob = (cfg?: { jobs?: string[]; shared_with?: string[] }) => {
    if (!cfg) return false;
    const jobs = Array.isArray(cfg.jobs) ? cfg.jobs : [];
    const sharedWith = Array.isArray(cfg.shared_with) ? cfg.shared_with : [];
    return (
      jobs.some((entry) => normalizeJobKey(entry) === viewerJob) ||
      sharedWith.some((entry) => normalizeJobKey(entry) === viewerJob)
    );
  };

  const compartmentFrom = (cfg?: { compartment?: string }) => normalizeJobKey(cfg?.compartment) || viewerJob || "default";

  if (viewerJob && byJob[viewerJob]) {
    return {
      compartment: compartmentFrom(byJob[viewerJob]),
      person: byJob[viewerJob].person || basePerson,
      vehicle: byJob[viewerJob].vehicle || baseVehicle,
    };
  }

  if (viewerJob) {
    for (const [_, cfg] of Object.entries(byJob)) {
      if (!matchesViewerJob(cfg)) continue;
      return {
        compartment: compartmentFrom(cfg),
        person: cfg?.person || basePerson,
        vehicle: cfg?.vehicle || baseVehicle,
      };
    }
  }

  return {
    compartment: viewerJob || "default",
    person: basePerson,
    vehicle: baseVehicle,
  };
}

export default function Home() {
  const [isHandshakeDone, setHandshakeDone] = useState(true);
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
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [profileData, setProfileData] = useState<ProfileData>(DEFAULT_PROFILE);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(DEFAULT_CHAT_MESSAGES);
  const [incidentRecords, setIncidentRecords] = useState<IncidentRecord[]>(DEFAULT_INCIDENTS);
  const [boloRecords, setBoloRecords] = useState<BoloRecord[]>(DEFAULT_BOLOS);
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>(DEFAULT_BOARD_POSTS);
  const [shiftRecords, setShiftRecords] = useState<ShiftRecord[]>(DEFAULT_SHIFTS);
  const [startupValidationError, setStartupValidationError] = useState<StartupValidationError | null>(null);
  const seededActivityRef = useRef(false);
  const previousDutyRef = useRef<boolean | null>(null);
  const previousAkteSyncRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedProfile = loadJsonObject<ProfileData>(STORAGE_KEYS.profile, DEFAULT_PROFILE);
    const storedChat = loadJsonArray<ChatMessage>(STORAGE_KEYS.chat, DEFAULT_CHAT_MESSAGES);
    const storedIncidents = loadJsonArray<IncidentRecord>(STORAGE_KEYS.incidents, DEFAULT_INCIDENTS);
    const storedBolos = loadJsonArray<BoloRecord>(STORAGE_KEYS.bolos, DEFAULT_BOLOS);
    const storedBoardPosts = loadJsonArray<BoardPost>(STORAGE_KEYS.boardPosts, DEFAULT_BOARD_POSTS);
    const storedShifts = loadJsonArray<ShiftRecord>(STORAGE_KEYS.shifts, DEFAULT_SHIFTS);

    setProfileData((prev) => ({
      ...prev,
      ...storedProfile,
    }));
    setChatMessages(storedChat);
    setIncidentRecords(storedIncidents);
    setBoloRecords(storedBolos);
    setBoardPosts(storedBoardPosts);
    setShiftRecords(storedShifts);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profileData));
    } catch {
      // Ignore storage errors.
    }
  }, [profileData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.chat, JSON.stringify(chatMessages));
    } catch {
      // Ignore storage errors.
    }
  }, [chatMessages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.incidents, JSON.stringify(incidentRecords));
    } catch {
      // Ignore storage errors.
    }
  }, [incidentRecords]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.bolos, JSON.stringify(boloRecords));
    } catch {
      // Ignore storage errors.
    }
  }, [boloRecords]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.boardPosts, JSON.stringify(boardPosts));
    } catch {
      // Ignore storage errors.
    }
  }, [boardPosts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.shifts, JSON.stringify(shiftRecords));
    } catch {
      // Ignore storage errors.
    }
  }, [shiftRecords]);

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

  useEffect(() => {
    if (!isHandshakeDone) return;

    let isCancelled = false;

    const loadBootstrap = async () => {
      try {
        const bootstrap = await fetchNui<{
          persons?: PersonRecord[];
          vehicles?: VehicleRecord[];
          akteBootstrap?: {
            personAkten?: Record<string, PersonAkte>;
            vehicleAkten?: Record<string, VehicleAkte>;
          };
        }>("getTabletBootstrap", {});

        if (isCancelled || !bootstrap) return;

        if (Array.isArray(bootstrap.persons)) {
          setScreenData((prev) => ({ ...prev, persons: bootstrap.persons }));
        }

        if (Array.isArray(bootstrap.vehicles)) {
          setScreenData((prev) => ({ ...prev, vehicles: bootstrap.vehicles }));
        }

        if (bootstrap.akteBootstrap?.personAkten) {
          setScreenData((prev) => ({ ...prev, personAkten: bootstrap.akteBootstrap?.personAkten }));
        }

        if (bootstrap.akteBootstrap?.vehicleAkten) {
          setScreenData((prev) => ({ ...prev, vehicleAkten: bootstrap.akteBootstrap?.vehicleAkten }));
        }
      } catch {
        // Keep the UI usable even if the proxy callback is unavailable.
      }
    };

    void loadBootstrap();

    return () => {
      isCancelled = true;
    };
  }, [isHandshakeDone]);

  useNuiEvent<NuiVisibilityPayload>("setVisible", (data) => {
    const nextVisible = Boolean(data?.visible);
    setVisible(nextVisible);
    setActiveScreen(data?.screen ?? (nextVisible ? "tablet" : null));
  });

  useNuiEvent<NuiScreenPayload>("setScreen", (data) => {
    setActiveScreen(data?.screen ?? "tablet");
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
  const show_ui = is_browser || isVisible || activeScreen !== null;

  const meta = (screenData?.meta as any) || {};
  const typedMeta = meta as NuiMetaPayload;
  const current_modules = typedMeta.modules || defaultMockupModules;
  const allowMapStyleChange = Boolean(typedMeta.mdt?.allow_map_style_change);
  const baseMapStyle = normalizeMapStyle(typedMeta.mdt?.default_map_style);
  const chatAutoDeleteAfterMinutes = Number(typedMeta.mdt?.chat?.auto_delete_after_minutes ?? CHAT_AUTO_DELETE_DISABLED);
  const chatAutoDeleteMs = chatAutoDeleteAfterMinutes > 0 ? chatAutoDeleteAfterMinutes * 60 * 1000 : 0;
  const baseLocale = normalizeLocale(typedMeta.locale);
  const activeLocale = localeOverride || baseLocale;
  const activeMapStyle = allowMapStyleChange ? (mapStyleOverride || baseMapStyle) : baseMapStyle;
  const translationsByLocale = typedMeta.translationsByLocale || {};
  const activeTranslations =
    translationsByLocale[activeLocale] ||
    (activeLocale === baseLocale ? typedMeta.translations : undefined) ||
    translationsByLocale.en ||
    typedMeta.translations;

  useEffect(() => {
    const isOpen = isVisible || activeScreen !== null;
    if (is_browser || !isHandshakeDone || !isOpen) {
      setStartupValidationError(null);
      return;
    }

    const validateStartupPayload = (): StartupValidationError | null => {
      if (!typedMeta || typeof typedMeta !== "object" || Array.isArray(typedMeta)) {
        return "meta_missing";
      }

      const modulesOk =
        typedMeta.modules &&
        typeof typedMeta.modules === "object" &&
        !Array.isArray(typedMeta.modules) &&
        Object.keys(typedMeta.modules).length > 0;
      if (!modulesOk) {
        return "modules_missing";
      }

      const directTranslationsOk =
        typedMeta.translations &&
        typeof typedMeta.translations === "object" &&
        !Array.isArray(typedMeta.translations) &&
        Object.keys(typedMeta.translations).length > 0;

      const byLocaleEn = typedMeta.translationsByLocale?.en;
      const byLocaleOk =
        byLocaleEn &&
        typeof byLocaleEn === "object" &&
        !Array.isArray(byLocaleEn) &&
        Object.keys(byLocaleEn).length > 0;

      if (!directTranslationsOk && !byLocaleOk) {
        return "translations_missing";
      }

      return null;
    };

    const immediateError = validateStartupPayload();
    if (!immediateError) {
      setStartupValidationError(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      const deferredError = validateStartupPayload();
      setStartupValidationError(deferredError);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [activeScreen, isHandshakeDone, isVisible, is_browser, typedMeta]);

  useEffect(() => {
    if (chatAutoDeleteMs <= 0) return;

    const pruneExpiredChatMessages = () => {
      setChatMessages((prev) => {
        const now = Date.now();
        const next = prev.filter((message) => {
          const createdAt = Date.parse(message.createdAt);
          if (Number.isNaN(createdAt)) return true;
          return now - createdAt < chatAutoDeleteMs;
        });
        return next.length === prev.length ? prev : next;
      });
    };

    pruneExpiredChatMessages();
    const interval = window.setInterval(pruneExpiredChatMessages, Math.min(chatAutoDeleteMs, 60 * 1000));
    return () => window.clearInterval(interval);
  }, [chatAutoDeleteMs]);

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
  const clockData = (screenData?.clock as ClockPayload | undefined) || undefined;
  const dutyState = ((screenData?.duty as DutyState | undefined) || { onDuty: true }) as DutyState;
  const sessionData = (screenData?.session as { job?: string } | undefined) || {};
  const sessionJob = normalizeJobKey(sessionData.job);
  const player_data =
    ((screenData?.player as PlayerUiPayload | undefined) || { name: t("tablet.player.unknown_user"), gradeDisplay: "" }) as PlayerUiPayload;
  const actorName =
    typeof (player_data as { name?: unknown })?.name === "string" &&
    ((player_data as { name?: string }).name || "").trim() !== ""
      ? ((player_data as { name?: string }).name as string)
      : t("tablet.player.unknown_user");
  const fallbackNameParts = actorName.trim().split(/\s+/).filter(Boolean);
  const fallbackFirstName = fallbackNameParts[0] || "";
  const fallbackLastName = fallbackNameParts.length > 1 ? fallbackNameParts[fallbackNameParts.length - 1] : "";
  const playerFirstName = typeof player_data.firstname === "string" ? player_data.firstname.trim() : fallbackFirstName;
  const playerLastName = typeof player_data.lastname === "string" ? player_data.lastname.trim() : fallbackLastName;
  const playerNameMode = typedMeta.mdt?.player_name_mode || "fullname";
  const greetingName =
    playerNameMode === "firstname" && playerFirstName !== ""
      ? playerFirstName
      : playerNameMode === "lastname" && playerLastName !== ""
        ? playerLastName
        : actorName;
  const jobBrandingOverrides = sessionJob ? typedMeta.mdt?.branding?.job_overrides?.[sessionJob] : undefined;
  const jobDisplayName = sessionJob !== "" ? sessionJob.toUpperCase() : "TG";
  const computedBrandTitle =
    (jobBrandingOverrides?.title || typedMeta.mdt?.branding?.title_template || "{job} MDT").replace("{job}", jobDisplayName);
  const computedBrandLogo = jobBrandingOverrides?.logo_url || typedMeta.mdt?.branding?.logo_url || "";
  const branding = {
    ...defaultMockupBranding,
    ...(typedMeta.branding as NuiBrandingPayload | undefined),
    name: computedBrandTitle,
    logoUrl: computedBrandLogo,
    accent: accentOverride || typedMeta.branding?.accent || defaultMockupBranding.accent,
    greeting:
      clockData?.period === "evening"
        ? t("tablet.dashboard.greeting_evening", { name: greetingName })
        : t("tablet.dashboard.greeting_morning", { name: greetingName }),
    dateLabel: clockData?.label || typedMeta.branding?.dateLabel || defaultMockupBranding.dateLabel,
    timeLabel: clockData?.label || typedMeta.branding?.dateLabel || defaultMockupBranding.dateLabel,
  };
  const actorGrade =
    typeof (player_data as { gradeDisplay?: unknown })?.gradeDisplay === "string"
      ? (((player_data as { gradeDisplay?: string }).gradeDisplay as string) || "").trim()
      : "";
  const actorGradeLevel =
    typeof (player_data as { gradeLevel?: unknown })?.gradeLevel === "number"
      ? ((player_data as { gradeLevel?: number }).gradeLevel as number)
      : null;
  const actorGradeCount =
    typeof (player_data as { gradeCount?: unknown })?.gradeCount === "number"
      ? ((player_data as { gradeCount?: number }).gradeCount as number)
      : null;
  const boardAdminThreshold = actorGradeCount !== null ? Math.max(0, actorGradeCount - 2) : 2;
  const isBoardAdmin = actorGradeLevel !== null ? actorGradeLevel >= boardAdminThreshold : false;
  const profileName = profileData.name.trim() !== "" ? profileData.name.trim() : actorName;
  const actorLabel = actorGrade !== "" ? `${profileName} (${actorGrade})` : profileName;
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
  const resolvedAkteModels = resolveJobAkteModels(typedMeta, sessionJob);
  const activeAkteCompartment = normalizeJobKey(resolvedAkteModels.compartment);
  const personAkteFields = resolvedAkteModels.person?.fields || [];
  const vehicleAkteFields = resolvedAkteModels.vehicle?.fields || [];
  const personDataFields = resolvedAkteModels.person?.data_fields || [];
  const vehicleDataFields = resolvedAkteModels.vehicle?.data_fields || [];
  const akteSyncMatchesScope =
    !akteSyncData?.compartment || normalizeJobKey(akteSyncData.compartment) === activeAkteCompartment;
  const personAkteSync = akteSyncData?.kind === "person" && akteSyncMatchesScope ? akteSyncData : undefined;
  const vehicleAkteSync = akteSyncData?.kind === "vehicle" && akteSyncMatchesScope ? akteSyncData : undefined;
  const createActivity = (activity: Omit<DashboardActivity, "id" | "timestamp"> & { timestamp?: string }) => ({
    id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    timestamp: activity.timestamp || new Date().toISOString(),
    ...activity,
  });

  useEffect(() => {
    const currentDuty = Boolean(dutyState?.onDuty);
    if (previousDutyRef.current === null) {
      previousDutyRef.current = currentDuty;
      return;
    }

    if (previousDutyRef.current !== currentDuty) {
      previousDutyRef.current = currentDuty;
      setRecentActivity((prev) =>
        [
          createActivity({
            kind: "duty",
            title: currentDuty ? t("tablet.dashboard.activity.duty_on") : t("tablet.dashboard.activity.duty_off"),
            detail: actorLabel,
          }),
          ...prev,
        ].slice(0, 6)
      );
    }
  }, [actorLabel, dutyState?.onDuty, t]);

  useEffect(() => {
    if (!akteSyncData) return;

    const recordKey = akteSyncData.kind === "person" ? `person:${akteSyncData.identifier || ""}` : `vehicle:${akteSyncData.plate || ""}`;
    const syncSignature = `${recordKey}:${JSON.stringify(akteSyncData.akte || {})}`;
    if (previousAkteSyncRef.current === syncSignature) return;
    previousAkteSyncRef.current = syncSignature;

    const changedFields = Object.keys((akteSyncData.akte as Record<string, string>) || {});
    const fieldCount = changedFields.length;
    const fieldLabel = fieldCount === 1 ? "field" : "fields";
    const personName = personsData.find((person) => person.identifier === akteSyncData.identifier)?.name || akteSyncData.identifier || t("tablet.persons.not_available");
    const vehiclePlate = vehiclesData.find((vehicle) => vehicle.plate === akteSyncData.plate)?.plate || akteSyncData.plate || t("tablet.vehicles.not_available");

    setRecentActivity((prev) => {
      const nextEntry = createActivity({
        kind: akteSyncData.kind === "person" ? "person" : "vehicle",
        title:
          akteSyncData.kind === "person"
            ? t("tablet.dashboard.activity.person_updated")
            : t("tablet.dashboard.activity.vehicle_updated"),
        detail:
          akteSyncData.kind === "person"
            ? `${personName} • ${fieldCount} ${fieldLabel} • ${actorLabel}`
            : `${vehiclePlate} • ${fieldCount} ${fieldLabel} • ${actorLabel}`,
      });

      return [nextEntry, ...prev].slice(0, 6);
    });
  }, [akteSyncData, actorLabel, personsData, t, vehiclesData]);

  useEffect(() => {
    if (seededActivityRef.current) return;
    if (personsData.length === 0 && vehiclesData.length === 0) return;

    seededActivityRef.current = true;
    setRecentActivity((prev) =>
      [
        createActivity({
          kind: "system",
          title: t("tablet.dashboard.activity.dashboard_synced"),
          detail: `${personsData.length} people • ${vehiclesData.length} vehicles`,
        }),
        ...prev,
      ].slice(0, 6)
    );
  }, [personsData.length, t, vehiclesData.length]);

  const dashboardData = {
    personsCount: personsData.length,
    vehiclesCount: vehiclesData.length,
    personAktenCount: Object.keys(personAktenData || {}).length,
    vehicleAktenCount: Object.keys(vehicleAktenData || {}).length,
    enabledModulesCount: Object.values(current_modules || {}).filter((value) => value !== false).length,
    totalModulesCount: Object.keys(current_modules || {}).length,
    dutyState,
    actorName: profileName,
    actorImageUrl: profileData.imageUrl,
    recentActivity,
    recentChat: chatMessages.slice(0, 5),
    recentIncidents: incidentRecords.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 4),
    recentBolos: boloRecords.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 4),
    boardPosts,
    shifts: shiftRecords,
    boardAdmin: isBoardAdmin,
  };
  const sidebarProfileData = {
    ...player_data,
    name: profileName,
    imageUrl: profileData.imageUrl,
    gradeDisplay: actorGrade,
  };
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

    if (typeof window !== "undefined") {
      if (selected.targetScreen === "persons" && id.startsWith("person:")) {
        window.localStorage.setItem("tg_mdt_selected_person", id.slice("person:".length));
      } else if (selected.targetScreen === "vehicles" && id.startsWith("vehicle:")) {
        window.localStorage.setItem("tg_mdt_selected_vehicle", id.slice("vehicle:".length));
      }
    }

    setGlobalSearch(selected.query);
    setActiveScreen(selected.targetScreen);
  };

  const handleSearchSubmit = () => {
    if (searchSuggestions.length === 0) return;
    const best = searchSuggestions[0];
    handleSearchSelect(best.id);
  };

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      fetchNui("hideUI", {}).catch(() => setVisible(false));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible]);

  const updateProfile = (patch: Partial<ProfileData>) => {
    setProfileData((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const captureProfilePhoto = async (mode: "standard" | "selfie" = "standard") => {
    const result = await fetchNui<{ ok?: boolean; images?: string[] }>("openAktePhotoMode", {
      kind: "person",
      screen: "profile",
      mode,
    }).catch(() => null);

    if (!result?.ok || !Array.isArray(result.images) || result.images.length === 0) return;

    const nextImage = result.images[result.images.length - 1];
    if (typeof nextImage === "string" && nextImage.trim() !== "") {
      updateProfile({ imageUrl: nextImage.trim() });
    }
  };

  const sendChatMessage = (text: string) => {
    const trimmed = text.trim();
    if (trimmed === "") return;

    setChatMessages((prev) => [
      {
        id: createId("chat"),
        author: profileName,
        text: trimmed,
        createdAt: new Date().toISOString(),
        avatarUrl: profileData.imageUrl,
        gradeDisplay: actorGrade,
      },
      ...prev,
    ].slice(0, 60));
  };

  const deleteChatMessage = (messageId: string) => {
    setChatMessages((prev) => prev.filter((message) => message.id !== messageId));
  };

  const createIncident = (incident: Omit<IncidentRecord, "id" | "createdAt" | "updatedAt">) => {
    const timestamp = new Date().toISOString();
    const nextIncident: IncidentRecord = {
      id: createId("incident"),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...incident,
    };
    setIncidentRecords((prev) => [nextIncident, ...prev]);
    const activity: DashboardActivity = {
      id: createId("activity"),
      kind: "system",
      title: t("tablet.incidents.new_incident"),
      detail: nextIncident.title,
      timestamp,
    };
    setRecentActivity((prev) => [
      activity,
      ...prev,
    ].slice(0, 6));
  };

  const updateIncident = (id: string, patch: Partial<IncidentRecord>) => {
    setIncidentRecords((prev) =>
      prev.map((incident) =>
        incident.id === id
          ? {
              ...incident,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : incident
      )
    );
  };

  const deleteIncident = (id: string) => {
    setIncidentRecords((prev) => prev.filter((incident) => incident.id !== id));
  };

  const createBolo = (bolo: Omit<BoloRecord, "id" | "createdAt" | "updatedAt">) => {
    const timestamp = new Date().toISOString();
    const nextBolo: BoloRecord = {
      id: createId("bolo"),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...bolo,
    };
    setBoloRecords((prev) => [nextBolo, ...prev]);
    const activity: DashboardActivity = {
      id: createId("activity"),
      kind: "system",
      title: t("tablet.bolo.title"),
      detail: nextBolo.title,
      timestamp,
    };
    setRecentActivity((prev) => [
      activity,
      ...prev,
    ].slice(0, 6));
  };

  const updateBolo = (id: string, patch: Partial<BoloRecord>) => {
    setBoloRecords((prev) =>
      prev.map((bolo) =>
        bolo.id === id
          ? {
              ...bolo,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : bolo
      )
    );
  };

  const deleteBolo = (id: string) => {
    setBoloRecords((prev) => prev.filter((bolo) => bolo.id !== id));
  };

  const createBoardPost = (post: Omit<BoardPost, "id" | "createdAt" | "author">) => {
    if (!isBoardAdmin) return;
    const timestamp = new Date().toISOString();
    const nextPost: BoardPost = {
      id: createId("board-post"),
      author: profileName,
      createdAt: timestamp,
      ...post,
    };
    setBoardPosts((prev) => [nextPost, ...prev].slice(0, 20));
  };

  const captureBoardImage = async () => {
    if (!isBoardAdmin) return null;
    const result = await fetchNui<{ ok?: boolean; images?: string[] }>("openAktePhotoMode", {
      kind: "person",
      screen: "dashboard",
    }).catch(() => null);

    if (!result?.ok || !Array.isArray(result.images) || result.images.length === 0) return null;
    const nextImage = result.images[result.images.length - 1];
    return typeof nextImage === "string" && nextImage.trim() !== "" ? nextImage.trim() : null;
  };

  const createShift = (shift: Omit<ShiftRecord, "id" | "createdAt">) => {
    const timestamp = new Date().toISOString();
    const nextShift: ShiftRecord = {
      id: createId("shift"),
      createdAt: timestamp,
      ...shift,
    };
    setShiftRecords((prev) => [nextShift, ...prev].slice(0, 20));
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
              playerData={sidebarProfileData}
              dutyState={dutyState}
              branding={branding}
              t={t}
              onOpenProfile={() => setActiveScreen("profile")}
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
                onClose={() => fetchNui("hideUI", {}).catch(() => setVisible(false))}
              />
              
              <div className="flex-1 overflow-hidden p-6">
                <div key={activeScreen || "dashboard"} className="h-full w-full animate-mdt-view">
                  {startupValidationError ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-full max-w-xl rounded-2xl border border-red-500/40 bg-[rgba(20,0,0,0.7)] p-6 text-center shadow-2xl">
                        <p className="text-xs uppercase tracking-[0.22em] text-red-300">{t("tablet.error.startup_tag")}</p>
                        <h2 className="mt-2 text-2xl font-bold text-white">{t("tablet.error.startup_title")}</h2>
                        <p className="mt-3 text-sm text-zinc-300">{t("tablet.error.startup_message")}</p>
                        <p className="mt-2 text-sm font-semibold text-red-200">{t("tablet.error.contact_admin")}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                  {(!activeScreen || activeScreen === "dashboard" || activeScreen === "tablet") && <DashboardView branding={branding} modules={current_modules} data={dashboardData} onSendChat={sendChatMessage} onTakeBoardImage={captureBoardImage} onCreateBoardPost={createBoardPost} onCreateShift={createShift} t={t} />}
                  {activeScreen === "blackboard" && (
                    <BlackboardView
                      t={t}
                      boardPosts={boardPosts}
                      boardAdmin={isBoardAdmin}
                      onTakeBoardImage={captureBoardImage}
                      onCreateBoardPost={createBoardPost}
                    />
                  )}
                  {activeScreen === "profile" && (
                    <ProfileView
                      t={t}
                      profile={{
                        name: profileData.name || actorName,
                        imageUrl: profileData.imageUrl,
                        gradeDisplay: actorGrade,
                      }}
                      onSave={updateProfile}
                      onCapturePhoto={captureProfilePhoto}
                    />
                  )}
                  {activeScreen === "dispatch" && (
                    <DispatchView
                      t={t}
                      incidents={incidentRecords}
                      persons={personsData}
                      vehicles={vehiclesData}
                      onCreateIncident={createIncident}
                      onUpdateIncident={updateIncident}
                      onDeleteIncident={deleteIncident}
                    />
                  )}
                  {activeScreen === "chat" && (
                    <ChatView
                      t={t}
                      messages={chatMessages}
                      onSend={sendChatMessage}
                      onDeleteMessage={deleteChatMessage}
                      actorName={profileName}
                      actorImageUrl={profileData.imageUrl}
                      currentUserName={profileName}
                      radioMembers={(screenData as any).radioMembers || []}
                      meta={typedMeta}
                    />
                  )}
                  {activeScreen === "persons" && (
                    <PersonsView
                      t={t}
                      actorName={actorLabel}
                      persons={personsData}
                      globalSearch={globalSearch}
                      initialAkten={personAktenData}
                      akteSync={personAkteSync}
                      akteFields={personAkteFields}
                      dataFields={personDataFields}
                      incidents={incidentRecords}
                      bolos={boloRecords}
                      akteScope={activeAkteCompartment}
                      meta={typedMeta}
                      viewerJob={sessionJob}
                    />
                  )}
                  {activeScreen === "vehicles" && (
                    <VehiclesView
                      t={t}
                      actorName={actorLabel}
                      vehicles={vehiclesData}
                      globalSearch={globalSearch}
                      initialAkten={vehicleAktenData}
                      akteSync={vehicleAkteSync}
                      akteFields={vehicleAkteFields}
                      dataFields={vehicleDataFields}
                      incidents={incidentRecords}
                      bolos={boloRecords}
                      akteScope={activeAkteCompartment}
                      meta={typedMeta}
                      viewerJob={sessionJob}
                    />
                  )}
                  {activeScreen === "warrants" && <WarrantsView t={t} />}
                  {activeScreen === "penalties" && <PenaltiesView t={t} />}
                  {activeScreen === "bolo" && (
                    <BoloView
                      t={t}
                      bolos={boloRecords}
                      persons={personsData}
                      vehicles={vehiclesData}
                      onCreate={createBolo}
                      onUpdate={updateBolo}
                      onDelete={deleteBolo}
                    />
                  )}
                  {activeScreen === "livemap" && <LiveMapView t={t} />}
                  {activeScreen === "shifts" && (
                    <ShiftsView t={t} shifts={shiftRecords} boardAdmin={isBoardAdmin} onCreateShift={createShift} />
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
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>
      )}
    </main>
  );
}
