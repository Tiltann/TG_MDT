"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { fetchNui, useNuiEvent } from "@/lib/useNui";
import { Sidebar } from "./tablet/components/sidebar";
import { Topbar } from "./tablet/components/topbar";
import DashboardView from "./tablet/components/dashboard-view";
import BlackboardView from "./tablet/components/views/blackboard-view";
import DispatchView from "./tablet/components/views/dispatch-view";
import type {
  DispatchAssignedUnit,
  DispatchAssignedVehicle,
  DispatchGroup,
  DispatchLiveCall,
  DispatchOfficer,
  DispatchStatus,
  DispatchStatusOption,
} from "./tablet/components/views/dispatch-view";
import ChatView from "./tablet/components/views/chat-view";
import BoloView from "./tablet/components/views/bolo-view";
import PenaltiesView from "./tablet/components/views/penalties-view";
import PersonsView from "./tablet/components/views/persons-view";
import VehiclesView from "./tablet/components/views/vehicles-view";
import ProfileView from "./tablet/components/views/profile-view";
import LiveMapView from "./tablet/components/views/livemap-view";
import SettingsView from "./tablet/components/views/settings-view";
import { defaultMockupBranding, defaultMockupModules } from "./tablet/lib/mockup-config";
import { createTranslator, normalizeLocale, type SupportedLocale } from "./tablet/lib/i18n";
import devTranslationsEn from "./tablet/lib/dev-translations.en.json";
import devTranslationsDe from "./tablet/lib/dev-translations.de.json";

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
    departments?: Record<string, { label: string; jobs: string[]; logo_url?: string; subtitle?: string }>;
    branding?: {
      title_template?: string;
      subtitle?: string;
      logo_url?: string;
      job_overrides?: Record<string, { title?: string; subtitle?: string; logo_url?: string }>;
    };
    dispatch?: {
      share_between_jobs?: boolean | string | Array<string | string[]>;
      default_status?: string;
      off_duty_status?: string;
      status_codes?: Array<{ code?: string; label_key?: string; label?: string; color?: "green" | "blue" | "yellow" | "purple" | "gray" | "red" }>;
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
  expiresAt?: string;
};

type DispatchHistoryEntry = {
  id: string;
  title: string;
  location?: string;
  createdAt: string;
  closedAt?: string;
  callerIdentifier?: string;
  callerName?: string;
  anonymous?: boolean;
  acceptedBy?: Array<{ id: string; name: string; at?: string }>;
  assignedUnits?: Array<{ id: string; name: string }>;
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
type RadioMember = {
  source: number;
  name: string;
  gradeDisplay?: string;
  jobName?: string;
  jobLabel?: string;
  avatarUrl?: string;
  status?: string;
};

type HomeProps = {
  devMode?: boolean;
};

const STORAGE_KEYS = {
  profile: "tg_mdt_profile",
  chat: "tg_mdt_chat_messages",
  incidents: "tg_mdt_incidents",
  bolos: "tg_mdt_bolos",
  boardPosts: "tg_mdt_board_posts",
  dispatchStatuses: "tg_mdt_dispatch_statuses",
  dispatchGroups: "tg_mdt_dispatch_groups",
};

const DEFAULT_PROFILE: ProfileData = {
  name: "",
  imageUrl: "",
};

const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [];
const DEFAULT_INCIDENTS: IncidentRecord[] = [];
const DEFAULT_BOLOS: BoloRecord[] = [];
const DEFAULT_BOARD_POSTS: BoardPost[] = [];
const DEFAULT_DISPATCH_STATUSES: Record<string, DispatchStatus> = {};
const DEFAULT_DISPATCH_GROUPS: DispatchGroup[] = [];
const DEV_PROFILE: ProfileData = {
  name: "Tiltann",
  imageUrl: "",
};

const DEV_TRANSLATIONS_EN = devTranslationsEn as Record<string, string>;
const DEV_TRANSLATIONS_DE = devTranslationsDe as Record<string, string>;

const DEV_INCIDENTS: IncidentRecord[] = [
  {
    id: "incident-001",
    title: "Traffic Stop Escalation",
    description: "Routine stop escalated after the driver attempted to flee on foot.",
    location: "Mission Row",
    severity: "medium",
    status: "investigating",
    linkedPersons: ["char-002"],
    linkedVehicles: ["LSPD-204"],
    createdAt: "2026-05-22T09:48:00.000Z",
    updatedAt: "2026-05-22T10:02:00.000Z",
  },
  {
    id: "incident-002",
    title: "Medical Scene Response",
    description: "EMS requested police support for crowd control during patient transport.",
    location: "Pillbox Hill",
    severity: "low",
    status: "open",
    linkedPersons: ["char-003"],
    linkedVehicles: ["EMS-911"],
    createdAt: "2026-05-22T08:15:00.000Z",
    updatedAt: "2026-05-22T08:27:00.000Z",
  },
];

const DEV_BOLOS: BoloRecord[] = [
  {
    id: "bolo-001",
    title: "Wanted for Felony Evading",
    description: "Be on the lookout for Noah Mercer following a felony evading charge.",
    priority: "high",
    status: "active",
    linkedPersons: ["char-002"],
    linkedVehicles: ["LSPD-204"],
    createdAt: "2026-05-22T09:10:00.000Z",
    updatedAt: "2026-05-22T09:55:00.000Z",
  },
  {
    id: "bolo-002",
    title: "Witness Vehicle Request",
    description: "Locate EMS-911 for a statement regarding a downtown collision.",
    priority: "medium",
    status: "active",
    linkedPersons: ["char-003"],
    linkedVehicles: ["EMS-911"],
    createdAt: "2026-05-22T07:42:00.000Z",
    updatedAt: "2026-05-22T08:03:00.000Z",
  },
];

const DEV_PERSONS: PersonRecord[] = [
  {
    identifier: "char-001",
    firstname: "Maya",
    lastname: "Carter",
    name: "Maya Carter",
    dob: "1994-03-12",
    gender: "F",
    job: "police",
  },
  {
    identifier: "char-002",
    firstname: "Noah",
    lastname: "Mercer",
    name: "Noah Mercer",
    dob: "1989-11-05",
    gender: "M",
    job: "police",
  },
  {
    identifier: "char-003",
    firstname: "Lea",
    lastname: "Ortiz",
    name: "Lea Ortiz",
    dob: "1998-08-23",
    gender: "F",
    job: "ambulance",
  },
];

const DEV_VEHICLES: VehicleRecord[] = [
  {
    plate: "LSPD-204",
    ownerIdentifier: "char-001",
    ownerName: "Maya Carter",
    model: "Buffalo STX",
    state: "garage",
  },
  {
    plate: "EMS-911",
    ownerIdentifier: "char-003",
    ownerName: "Lea Ortiz",
    model: "Ambulance",
    state: "out",
  },
];

const DEV_PERSON_AKTEN: Record<string, PersonAkte> = {
  "char-001": {
    personImage: JSON.stringify(["https://picsum.photos/seed/mdt-char-001/1200/800"]),
    phone: "+1-555-0114",
    warrantStatus: "none",
    dangerLevel: "low",
    driverLicense: "valid",
    weaponLicense: "valid",
    notes: JSON.stringify([
      {
        id: "n1",
        text: "Known to cooperate with officers.",
        author: "Sgt. Hale",
        createdAt: "2026-05-20T09:15:00.000Z",
      },
    ]),
  },
  "char-002": {
    personImage: JSON.stringify(["https://picsum.photos/seed/mdt-char-002/1200/800"]),
    phone: "+1-555-0188",
    warrantStatus: "active",
    dangerLevel: "medium",
    driverLicense: "suspended",
    weaponLicense: "none",
    notes: JSON.stringify([
      {
        id: "n2",
        text: "Open warrant linked to traffic evasion.",
        author: "Officer Tiltann",
        createdAt: "2026-05-21T18:40:00.000Z",
      },
    ]),
    searchStatus: "searched",
    searchedAt: "2026-05-21T18:42:00.000Z",
  },
};

const DEV_VEHICLE_AKTEN: Record<string, VehicleAkte> = {
  "LSPD-204": {
    notes: "Unit vehicle in active patrol rotation.",
  },
  "EMS-911": {
    notes: "Medical response unit.",
  },
};

const DEV_META: NuiMetaPayload = {
  locale: "en",
  modules: defaultMockupModules,
  translations: DEV_TRANSLATIONS_EN,
  translationsByLocale: {
    en: DEV_TRANSLATIONS_EN,
    de: DEV_TRANSLATIONS_DE,
  },
  branding: {
    accent: "#ff9100",
    dateLabel: "May 22, 2026",
  },
  mdt: {
    player_name_mode: "fullname",
    allow_map_style_change: true,
    default_map_style: "styleAtlas",
    allowed_jobs: ["police", "ambulance"],
    departments: {
      police: {
        label: "Police Department",
        jobs: ["police"],
        subtitle: "Law Enforcement Operations Desk",
      },
      ambulance: {
        label: "Emergency Medical",
        jobs: ["ambulance"],
        subtitle: "Medical Response Coordination Desk",
      },
    },
    branding: {
      subtitle: "Agency Operations Terminal",
    },
    dispatch: {
      share_between_jobs: true,
      default_status: "10-8",
      off_duty_status: "10-7",
      status_codes: [
        { code: "10-8", label_key: "tablet.dispatch.status.10-8", label: "Available", color: "green" },
        { code: "10-6", label_key: "tablet.dispatch.status.10-6", label: "Busy", color: "yellow" },
        { code: "10-97", label_key: "tablet.dispatch.status.10-97", label: "On Scene", color: "blue" },
        { code: "10-7", label_key: "tablet.dispatch.status.10-7", label: "Out of Service", color: "gray" },
      ],
    },
  },
  akteModels: {
    job_models: {
      police: {
        compartment: "police",
      },
      ambulance: {
        compartment: "ambulance",
        shared_with: ["police"],
      },
    },
  },
};

function buildDevScreenData(): Record<string, unknown> {
  return {
    meta: DEV_META,
    player: {
      name: "Tiltann",
      firstname: "Tiltann",
      lastname: "",
      gradeDisplay: "Sergeant",
      gradeLevel: 3,
      gradeCount: 5,
    },
    duty: {
      enabled: true,
      onDuty: true,
      framework: "dev",
      jobName: "police",
      dutyJobName: "police",
      switchJobEnabled: false,
      offDutyJobName: "offpolice",
    },
    session: {
      job: "police",
    },
    clock: {
      hour: 10,
      minute: 32,
      period: "morning",
      label: "10:32",
    },
    persons: DEV_PERSONS,
    vehicles: DEV_VEHICLES,
    personAkten: DEV_PERSON_AKTEN,
    vehicleAkten: DEV_VEHICLE_AKTEN,
    map: {
      markers: [
        { x: 0.41, y: 0.52, label: "Downtown" },
        { x: 0.58, y: 0.37, label: "Mission Row" },
      ],
      playerPosition: { x: 0.54, y: 0.46 },
    },
    radioMembers: [
      {
        source: 12,
        name: "Unit 12 - R. Hale",
        gradeDisplay: "Officer",
        jobName: "police",
        status: "10-23",
      },
      {
        source: 21,
        name: "Medic 21 - L. Ortiz",
        gradeDisplay: "Paramedic",
        jobName: "ambulance",
        status: "10-8",
      },
    ],
  };
}

const BOARD_POST_DEFAULT_EXPIRY_HOURS = 48;

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

function boardPostExpiresAtFrom(createdAt: string, expiresAt?: string): string {
  if (typeof expiresAt === "string" && expiresAt.trim() !== "") return expiresAt;
  const created = Date.parse(createdAt);
  const base = Number.isNaN(created) ? Date.now() : created;
  return new Date(base + BOARD_POST_DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
}

function isBoardPostExpired(post: BoardPost): boolean {
  return Date.parse(boardPostExpiresAtFrom(post.createdAt, post.expiresAt)) <= Date.now();
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

function normalizeScreenId(screen?: string | null): string | null {
  if (!screen) return null;
  return screen === "shifts" ? "chat" : screen;
}

function buildEffectiveModules(modules?: Record<string, boolean>): Record<string, boolean> {
  const resolved = { ...(modules || {}) };
  const tabletEnabled = resolved.tablet !== false;
  const coupledEnabled = tabletEnabled && resolved.dispatch !== false && resolved.livemap !== false;

  resolved.dispatch = coupledEnabled;
  resolved.livemap = coupledEnabled;

  return resolved;
}

function resolveAllowedScreen(screen: string | null, modules: Record<string, boolean>): string | null {
  const normalized = normalizeScreenId(screen);
  if (!normalized) return null;

  if ((normalized === "dispatch" || normalized === "livemap") && modules[normalized] === false) {
    return "dashboard";
  }

  return normalized;
}

export default function Home({ devMode = false }: HomeProps) {
  const [isHandshakeDone, setHandshakeDone] = useState(true);
  const [isVisible, setVisible] = useState(devMode);
  const [activeScreen, setActiveScreen] = useState<string | null>(devMode ? "dashboard" : null);
  const [screenData, setScreenData] = useState<Record<string, unknown>>(() => (devMode ? buildDevScreenData() : {}));
  const [localeOverride, setLocaleOverride] = useState<SupportedLocale | null>(null);
  const [accentOverride, setAccentOverride] = useState<string | null>(null);
  const [isLocaleReady, setLocaleReady] = useState(false);
  const [mapStyleOverride, setMapStyleOverride] = useState<MapStyle | null>(null);
  const [isMapStyleReady, setMapStyleReady] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [isDutyBusy, setDutyBusy] = useState(false);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [profileData, setProfileData] = useState<ProfileData>(devMode ? DEV_PROFILE : DEFAULT_PROFILE);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(DEFAULT_CHAT_MESSAGES);
  const [incidentRecords, setIncidentRecords] = useState<IncidentRecord[]>(devMode ? DEV_INCIDENTS : DEFAULT_INCIDENTS);
  const [boloRecords, setBoloRecords] = useState<BoloRecord[]>(devMode ? DEV_BOLOS : DEFAULT_BOLOS);
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>(DEFAULT_BOARD_POSTS);
  const [dispatchStatuses, setDispatchStatuses] = useState<Record<string, DispatchStatus>>(DEFAULT_DISPATCH_STATUSES);
  const [dispatchGroups, setDispatchGroups] = useState<DispatchGroup[]>(DEFAULT_DISPATCH_GROUPS);
  const [startupValidationError, setStartupValidationError] = useState<StartupValidationError | null>(null);
  const seededActivityRef = useRef(false);
  const previousDutyRef = useRef<boolean | null>(null);
  const previousAkteSyncRef = useRef<string | null>(null);
  const hasSeededDevDataRef = useRef(false);

  useEffect(() => {
    if (!devMode) return;
    if (hasSeededDevDataRef.current) return;

    hasSeededDevDataRef.current = true;
    setVisible(true);
    setActiveScreen("dashboard");
    setScreenData((prev) => ({
      ...buildDevScreenData(),
      ...prev,
    }));
  }, [devMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (devMode) {
      setProfileData(DEV_PROFILE);
      setChatMessages(DEFAULT_CHAT_MESSAGES);
      setIncidentRecords(DEV_INCIDENTS);
      setBoloRecords(DEV_BOLOS);
      setBoardPosts(DEFAULT_BOARD_POSTS);
      setDispatchStatuses(DEFAULT_DISPATCH_STATUSES);
      setDispatchGroups(DEFAULT_DISPATCH_GROUPS);
      return;
    }

    const storedProfile = loadJsonObject<ProfileData>(STORAGE_KEYS.profile, DEFAULT_PROFILE);
    const storedChat = loadJsonArray<ChatMessage>(STORAGE_KEYS.chat, DEFAULT_CHAT_MESSAGES);
    const storedIncidents = loadJsonArray<IncidentRecord>(STORAGE_KEYS.incidents, DEFAULT_INCIDENTS);
    const storedBolos = loadJsonArray<BoloRecord>(STORAGE_KEYS.bolos, DEFAULT_BOLOS);
    const storedBoardPosts = loadJsonArray<BoardPost>(STORAGE_KEYS.boardPosts, DEFAULT_BOARD_POSTS).filter(
      (post) => !isBoardPostExpired(post)
    );
    const storedDispatchStatuses = loadJsonObject<Record<string, DispatchStatus>>(
      STORAGE_KEYS.dispatchStatuses,
      DEFAULT_DISPATCH_STATUSES
    );
    const storedDispatchGroups = loadJsonArray<DispatchGroup>(
      STORAGE_KEYS.dispatchGroups,
      DEFAULT_DISPATCH_GROUPS
    );
    setProfileData((prev) => ({
      ...prev,
      ...storedProfile,
    }));
    setChatMessages(storedChat);
    setIncidentRecords(storedIncidents);
    setBoloRecords(storedBolos);
    setBoardPosts(storedBoardPosts);
    setDispatchStatuses(storedDispatchStatuses);
    setDispatchGroups(storedDispatchGroups);
  }, [devMode]);

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
    const interval = window.setInterval(() => {
      setBoardPosts((prev) => prev.filter((post) => !isBoardPostExpired(post)));
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.dispatchStatuses, JSON.stringify(dispatchStatuses));
    } catch {
      // Ignore storage errors.
    }
  }, [dispatchStatuses]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.dispatchGroups, JSON.stringify(dispatchGroups));
    } catch {
      // Ignore storage errors.
    }
  }, [dispatchGroups]);

  // ...existing code...

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
    setScreenSafe(normalizeScreenId(data?.screen) ?? (nextVisible ? "tablet" : null));
  });

  useNuiEvent<NuiScreenPayload>("setScreen", (data) => {
    setScreenSafe(normalizeScreenId(data?.screen) ?? "tablet");
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
  const show_ui = devMode || is_browser || isVisible || activeScreen !== null;

  const meta = (screenData?.meta as any) || {};
  const typedMeta = meta as NuiMetaPayload;
  const current_modules = useMemo(
    () => buildEffectiveModules((typedMeta.modules || defaultMockupModules) as Record<string, boolean>),
    [typedMeta.modules]
  );
  const dispatchModuleEnabled = current_modules.dispatch !== false;
  const livemapModuleEnabled = current_modules.livemap !== false;
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

  const setScreenSafe = (nextScreen: string | null) => {
    setActiveScreen(resolveAllowedScreen(nextScreen, current_modules));
  };

  useEffect(() => {
    const next = resolveAllowedScreen(activeScreen, current_modules);
    if (next !== activeScreen) {
      setActiveScreen(next);
    }
  }, [activeScreen, current_modules]);

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
  const departmentSubtitle = useMemo(() => {
    const departments = typedMeta.mdt?.departments || {};
    if (!sessionJob) return undefined;

    for (const department of Object.values(departments)) {
      if (!department || !Array.isArray(department.jobs)) continue;
      const matches = department.jobs.some((job) => normalizeJobKey(job) === sessionJob);
      if (matches && typeof department.subtitle === "string" && department.subtitle.trim() !== "") {
        return department.subtitle.trim();
      }
    }

    return undefined;
  }, [typedMeta.mdt?.departments, sessionJob]);
  const jobDisplayName = sessionJob !== "" ? sessionJob.toUpperCase() : "TG";
  const computedBrandTitle =
    (jobBrandingOverrides?.title || typedMeta.mdt?.branding?.title_template || "{job} MDT").replace("{job}", jobDisplayName);
  const computedBrandLogo = jobBrandingOverrides?.logo_url || typedMeta.mdt?.branding?.logo_url || "";
  const computedBrandSubtitle =
    jobBrandingOverrides?.subtitle ||
    departmentSubtitle ||
    typedMeta.mdt?.branding?.subtitle ||
    typedMeta.branding?.subtitle ||
    defaultMockupBranding.subtitle;
  const branding = {
    ...defaultMockupBranding,
    ...(typedMeta.branding as NuiBrandingPayload | undefined),
    name: computedBrandTitle,
    subtitle: computedBrandSubtitle,
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
  const radioMembers = Array.isArray((screenData as { radioMembers?: unknown[] })?.radioMembers)
    ? ((screenData as { radioMembers?: RadioMember[] }).radioMembers || [])
    : [];
  const playerPosition =
    (mapData.playerPosition as { x: number; y: number } | undefined) || undefined;
  const liveDispatchCalls = Array.isArray((screenData as { dispatchState?: unknown[] })?.dispatchState)
    ? (((screenData as { dispatchState?: DispatchLiveCall[] }).dispatchState || []) as DispatchLiveCall[])
    : [];
  const dispatchHistory = Array.isArray((screenData as { dispatchHistory?: unknown[] })?.dispatchHistory)
    ? (((screenData as { dispatchHistory?: DispatchHistoryEntry[] }).dispatchHistory || []) as DispatchHistoryEntry[])
    : [];
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
  const currentOfficerId = "self";
  const dispatchStatusOptions = useMemo<DispatchStatusOption[]>(() => {
    const rawOptions = typedMeta.mdt?.dispatch?.status_codes;
    if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
      return [
        { code: "10-8", label: t("tablet.dispatch.status.10-8", undefined, "Available"), color: "green" },
        { code: "10-6", label: t("tablet.dispatch.status.10-6", undefined, "Busy"), color: "yellow" },
        { code: "10-97", label: t("tablet.dispatch.status.10-97", undefined, "On Scene"), color: "blue" },
        { code: "10-23", label: t("tablet.dispatch.status.10-23", undefined, "En Route"), color: "blue" },
        { code: "10-7", label: t("tablet.dispatch.status.10-7", undefined, "Out of Service"), color: "gray" },
      ];
    }

    return rawOptions
      .map((entry) => {
        const code = typeof entry?.code === "string" ? entry.code : "";
        const fallback = typeof entry?.label === "string" ? entry.label : (code || "Status");
        const labelKey = typeof entry?.label_key === "string" ? entry.label_key : "";

        return {
          code,
          label: labelKey !== "" ? t(labelKey, undefined, fallback) : fallback,
          color: entry?.color,
        };
      })
      .filter((entry) => entry.code !== "");
  }, [t, typedMeta.mdt?.dispatch?.status_codes]);
  const dispatchDefaultStatus =
    (typeof typedMeta.mdt?.dispatch?.default_status === "string" && typedMeta.mdt?.dispatch?.default_status) ||
    (dispatchStatusOptions[0]?.code || "10-8");
  const dispatchOffDutyStatus =
    (typeof typedMeta.mdt?.dispatch?.off_duty_status === "string" && typedMeta.mdt?.dispatch?.off_duty_status) ||
    "10-7";
  const dispatchShareBetweenJobs = typedMeta.mdt?.dispatch?.share_between_jobs !== false;

  const departmentLabelByJob = useMemo(() => {
    const map = new Map<string, string>();
    const departments = typedMeta.mdt?.departments || {};

    for (const department of Object.values(departments)) {
      if (!department || !Array.isArray(department.jobs)) continue;
      for (const jobName of department.jobs) {
        const key = normalizeJobKey(jobName);
        if (!key) continue;
        map.set(key, department.label || jobName.toUpperCase());
      }
    }

    return map;
  }, [typedMeta.mdt?.departments]);

  const resolveDispatchJobLabel = (jobName?: string, fallbackLabel?: string): string | undefined => {
    if (typeof fallbackLabel === "string" && fallbackLabel.trim() !== "") {
      return fallbackLabel.trim();
    }

    const normalized = normalizeJobKey(jobName);
    if (!normalized) return undefined;
    return departmentLabelByJob.get(normalized) || normalized.toUpperCase();
  };

  const currentDispatchStatus =
    dispatchStatuses[currentOfficerId] ||
    (dutyState?.onDuty === false ? dispatchOffDutyStatus : dispatchDefaultStatus);

  const dispatchOfficers = useMemo<DispatchOfficer[]>(() => {
    const officersById = new Map<string, DispatchOfficer>();
    const normalizedProfileName = profileName.trim().toLowerCase();

    officersById.set(currentOfficerId, {
      id: currentOfficerId,
      name: profileName,
      gradeDisplay: actorGrade,
      job: sessionJob || undefined,
      jobLabel: resolveDispatchJobLabel(sessionJob),
      online: true,
      onDuty: dutyState?.onDuty !== false,
      status: dispatchStatuses[currentOfficerId] || (dutyState?.onDuty === false ? dispatchOffDutyStatus : dispatchDefaultStatus),
    });

    for (const member of radioMembers) {
      if (/^colleague\s+\d+$/i.test(member.name || "")) {
        continue;
      }

      if ((member.name || "").trim().toLowerCase() === normalizedProfileName) {
        continue;
      }

      const id = `radio:${member.source}`;
      officersById.set(id, {
        id,
        name: member.name,
        gradeDisplay: member.gradeDisplay,
        job: normalizeJobKey(member.jobName),
        jobLabel: resolveDispatchJobLabel(member.jobName, member.jobLabel),
        online: true,
        onDuty: (dispatchStatuses[id] || member.status || dispatchDefaultStatus) !== dispatchOffDutyStatus,
        status: dispatchStatuses[id] || member.status || dispatchDefaultStatus,
      });
    }

    for (const person of personsData) {
      const job = normalizeJobKey(person.job || "");
      const looksLikeOfficer =
        job.includes("police") ||
        job.includes("sheriff") ||
        job.includes("trooper") ||
        job.includes("state") ||
        job.includes("lspd") ||
        job.includes("bcso") ||
        job.includes("fib") ||
        job.includes("ems") ||
        job.includes("ambulance");
      if (!looksLikeOfficer) continue;

      const id = `person:${person.identifier}`;
      const personName =
        person.name || [person.firstname, person.lastname].filter(Boolean).join(" ") || t("tablet.player.unknown_user");
      if (officersById.has(id)) continue;
      officersById.set(id, {
        id,
        name: personName,
        job: job || undefined,
        jobLabel: resolveDispatchJobLabel(job),
        online: false,
        onDuty: false,
        status: dispatchStatuses[id] || dispatchOffDutyStatus,
      });
    }

    return Array.from(officersById.values()).sort((a, b) => {
      if (a.id === currentOfficerId) return -1;
      if (b.id === currentOfficerId) return 1;
      if (a.online !== b.online) return a.online ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [
    actorGrade,
    currentOfficerId,
    dispatchDefaultStatus,
    dispatchOffDutyStatus,
    dispatchStatuses,
    dutyState?.onDuty,
    personsData,
    profileName,
    radioMembers,
    resolveDispatchJobLabel,
    sessionJob,
    t,
  ]);
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
    boardPosts: boardPosts.filter((post) => !isBoardPostExpired(post)),
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

  const handleSetOwnDispatchStatus = (status: DispatchStatus) => {
    if (!dispatchModuleEnabled) return;
    setDispatchStatuses((prev) => ({ ...prev, [currentOfficerId]: status }));
    fetchNui("setDispatchStatus", { status }).catch(() => null);
  };

  useEffect(() => {
    if (dispatchStatuses[currentOfficerId]) return;
    const fallback = dutyState?.onDuty === false ? dispatchOffDutyStatus : dispatchDefaultStatus;
    setDispatchStatuses((prev) => ({ ...prev, [currentOfficerId]: fallback }));
  }, [currentOfficerId, dispatchDefaultStatus, dispatchOffDutyStatus, dispatchStatuses, dutyState?.onDuty]);

  useEffect(() => {
    if (!dispatchModuleEnabled) return;
    const status = dispatchStatuses[currentOfficerId];
    if (!status) return;
    fetchNui("setDispatchStatus", { status }).catch(() => null);
  }, [currentOfficerId, dispatchModuleEnabled, dispatchStatuses]);

  const handleCreateDispatchGroup = (name: string, memberIds: string[]) => {
    const trimmed = name.trim();
    if (trimmed === "" || memberIds.length === 0) return;
    setDispatchGroups((prev) => [
      {
        id: createId("dispatch-group"),
        name: trimmed,
        memberIds: Array.from(new Set(memberIds)),
      },
      ...prev,
    ]);
  };

  const handleUpdateDispatchGroupMembers = (groupId: string, memberIds: string[]) => {
    setDispatchGroups((prev) =>
      prev.map((group) =>
        group.id === groupId ? { ...group, memberIds: Array.from(new Set(memberIds)) } : group
      )
    );
  };

  const handleDeleteDispatchGroup = (groupId: string) => {
    setDispatchGroups((prev) => prev.filter((group) => group.id !== groupId));
  };

  const updateDispatchCallsLocal = (updater: (prev: DispatchLiveCall[]) => DispatchLiveCall[]) => {
    setScreenData((prev) => {
      const current = Array.isArray((prev as { dispatchState?: unknown[] }).dispatchState)
        ? (((prev as { dispatchState?: DispatchLiveCall[] }).dispatchState || []) as DispatchLiveCall[])
        : [];
      return {
        ...prev,
        dispatchState: updater(current),
      };
    });
  };

  const handleAssignDispatchUnit = async (dispatchId: string, officer: DispatchOfficer) => {
    if (!dispatchId || !officer?.id) return;

    updateDispatchCallsLocal((prev) =>
      prev.map((call) => {
        if (call.id !== dispatchId) return call;
        const unit: DispatchAssignedUnit = {
          id: officer.id,
          name: officer.name,
          status: officer.status,
          assignedAt: Date.now(),
        };
        const nextUnits = [...(call.assignedUnits || []).filter((entry) => entry.id !== unit.id), unit];
        return { ...call, assignedUnits: nextUnits };
      })
    );

    await fetchNui<{ ok?: boolean }>("assignDispatchUnit", {
      dispatchId,
      unitId: officer.id,
      unitName: officer.name,
      status: officer.status,
    }).catch(() => null);
  };

  const handleUnassignDispatchUnit = async (dispatchId: string, unitId: string) => {
    if (!dispatchId || !unitId) return;

    updateDispatchCallsLocal((prev) =>
      prev.map((call) =>
        call.id === dispatchId
          ? { ...call, assignedUnits: (call.assignedUnits || []).filter((entry) => entry.id !== unitId) }
          : call
      )
    );

    await fetchNui<{ ok?: boolean }>("unassignDispatchUnit", { dispatchId, unitId }).catch(() => null);
  };

  const handleAssignDispatchVehicle = async (dispatchId: string, vehicle: VehicleRecord) => {
    if (!dispatchId || !vehicle?.plate) return;

    updateDispatchCallsLocal((prev) =>
      prev.map((call) => {
        if (call.id !== dispatchId) return call;
        const entry: DispatchAssignedVehicle = {
          plate: vehicle.plate,
          model: typeof vehicle.model === "string" ? vehicle.model : String(vehicle.model || ""),
          assignedAt: Date.now(),
        };
        const nextVehicles = [...(call.assignedVehicles || []).filter((item) => item.plate !== entry.plate), entry];
        return { ...call, assignedVehicles: nextVehicles };
      })
    );

    await fetchNui<{ ok?: boolean }>("assignDispatchVehicle", {
      dispatchId,
      plate: vehicle.plate,
      model: typeof vehicle.model === "string" ? vehicle.model : String(vehicle.model || ""),
    }).catch(() => null);
  };

  const handleUnassignDispatchVehicle = async (dispatchId: string, plate: string) => {
    if (!dispatchId || !plate) return;

    updateDispatchCallsLocal((prev) =>
      prev.map((call) =>
        call.id === dispatchId
          ? { ...call, assignedVehicles: (call.assignedVehicles || []).filter((entry) => entry.plate !== plate) }
          : call
      )
    );

    await fetchNui<{ ok?: boolean }>("unassignDispatchVehicle", { dispatchId, plate }).catch(() => null);
  };

  const handleAcceptDispatchCase = async (dispatchId: string) => {
    if (!dispatchId) return;

    await handleAssignDispatchUnit(dispatchId, {
      id: currentOfficerId,
      name: profileName,
      gradeDisplay: actorGrade,
      online: true,
      onDuty: dutyState?.onDuty !== false,
      status: currentDispatchStatus,
    });

    await fetchNui<{ ok?: boolean }>("acceptDispatchCase", { dispatchId }).catch(() => null);
  };

  const handleCloseDispatchCase = async (dispatchId: string) => {
    if (!dispatchId) return;

    updateDispatchCallsLocal((prev) => prev.filter((call) => call.id !== dispatchId));
    await fetchNui<{ ok?: boolean }>("closeDispatchCase", { dispatchId }).catch(() => null);
  };

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
    setScreenSafe(selected.targetScreen);
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

    const lowered = trimmed.toLowerCase();
    if (lowered === "/mdt" || lowered.startsWith("/mdt ")) {
      fetchNui("hideUI", {}).catch(() => setVisible(false));
      return;
    }

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

  const createBoardPost = (post: Omit<BoardPost, "id" | "createdAt" | "author"> & { expiresAt?: string }) => {
    if (!isBoardAdmin) return;
    const timestamp = new Date().toISOString();
    const nextPost: BoardPost = {
      id: createId("board-post"),
      author: profileName,
      createdAt: timestamp,
      expiresAt: boardPostExpiresAtFrom(timestamp, post.expiresAt),
      ...post,
    };
    setBoardPosts((prev) => [nextPost, ...prev].filter((entry) => !isBoardPostExpired(entry)).slice(0, 20));
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

  // show absolutely nothing until NUI handshake is done.
  if (!isHandshakeDone && !is_browser && !devMode) return null;

  return (
    <main className="nui-root" data-visible={show_ui ? "true" : "false"} style={rootStyle}>
      {devMode && (
        <div className="fixed right-5 top-5 z-130 rounded-md border border-amber-400/60 bg-black/75 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.22)]">
          Dev Mock Mode
        </div>
      )}
      <div className="nui-layer nui-layer-bg" />

      {show_ui && (
        <section className="nui-layer nui-layer-tablet" aria-label="tablet-ui">
          <div className="tablet-shell flex text-sm text-[--mdt-text-muted]">
            
            {/* Modular Sidebar Component */}
            <Sidebar 
              currentView={activeScreen || "dashboard"} 
              modules={current_modules}
              playerData={sidebarProfileData}
              dutyState={dutyState}
              branding={branding}
              t={t}
              onOpenProfile={() => setScreenSafe("profile")}
              onScreenChange={(screen) => setScreenSafe(normalizeScreenId(screen))}
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
                dispatchStatus={currentDispatchStatus}
                dispatchStatusOptions={dispatchModuleEnabled ? dispatchStatusOptions : []}
                onDispatchStatusChange={handleSetOwnDispatchStatus}
                isDutyBusy={isDutyBusy}
                onToggleDuty={handleToggleDuty}
                onClose={() => fetchNui("hideUI", {}).catch(() => setVisible(false))}
              />
              
              <div className="flex-1 overflow-hidden p-6">
                <div className="h-full w-full animate-mdt-view">
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
                  {(!activeScreen || activeScreen === "dashboard" || activeScreen === "tablet") && (
                    <DashboardView
                      branding={branding}
                      modules={current_modules}
                      data={dashboardData}
                      onSendChat={sendChatMessage}
                      onTakeBoardImage={captureBoardImage}
                      onCreateBoardPost={createBoardPost}
                      onShortcutNavigate={(screen) => setScreenSafe(normalizeScreenId(screen))}
                      t={t}
                    />
                  )}
                  {activeScreen === "blackboard" && (
                    <BlackboardView
                      t={t}
                      boardPosts={boardPosts.filter((post) => !isBoardPostExpired(post))}
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
                  {activeScreen === "dispatch" && dispatchModuleEnabled && (
                    <DispatchView
                      t={t}
                      vehicles={vehiclesData}
                      officers={dispatchOfficers}
                      showSharedJobLabel={dispatchShareBetweenJobs}
                      liveCalls={liveDispatchCalls}
                      statusOptions={dispatchStatusOptions}
                      groups={dispatchGroups}
                      currentOfficerId={currentOfficerId}
                      onSetOwnStatus={handleSetOwnDispatchStatus}
                      onAssignUnit={handleAssignDispatchUnit}
                      onUnassignUnit={handleUnassignDispatchUnit}
                      onAssignVehicle={handleAssignDispatchVehicle}
                      onUnassignVehicle={handleUnassignDispatchVehicle}
                      onCreateGroup={handleCreateDispatchGroup}
                      onUpdateGroupMembers={handleUpdateDispatchGroupMembers}
                      onDeleteGroup={handleDeleteDispatchGroup}
                      onAcceptCase={handleAcceptDispatchCase}
                      onCloseCase={handleCloseDispatchCase}
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
                      radioMembers={radioMembers}
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
                      dispatchHistory={dispatchHistory}
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
                  {activeScreen === "livemap" && livemapModuleEnabled && <LiveMapView t={t} />}
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
