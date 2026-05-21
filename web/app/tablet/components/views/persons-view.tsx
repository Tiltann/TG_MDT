"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { fetchNui } from "../../../../lib/useNui";
import type { TFunction } from "../../lib/i18n";

type PersonRecord = {
  identifier: string;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  dob?: string | null;
  gender?: string | number | null;
  job?: string | null;
  address?: string | null;
  [key: string]: string | number | null | undefined;
};

type PersonAkte = Record<string, string>;

type AkteField = {
  key: string;
  label_key?: string;
  type?: "text" | "textarea" | "select";
  default?: string;
  editable?: boolean;
  options?: Array<{ value: string; label_key?: string; label?: string }>;
};

type DataField = {
  key: string;
  label_key?: string;
  fallback?: string;
};

type AkteSyncPayload = {
  kind?: "person" | "vehicle";
  identifier?: string;
  plate?: string;
  compartment?: string;
  akte?: Record<string, string>;
};

type CompartmentOption = {
  value: string;
  label: string;
  logoUrl?: string;
};

type RelatedIncident = {
  id: string;
  title: string;
  location: string;
  severity: string;
  status: string;
  linkedPersons: string[];
  linkedVehicles: string[];
};

type RelatedBolo = {
  id: string;
  title: string;
  priority: string;
  status: string;
  linkedPersons: string[];
  linkedVehicles: string[];
};

type RelatedDispatchHistory = {
  id: string;
  title: string;
  location?: string;
  createdAt: string;
  closedAt?: string;
  callerIdentifier?: string;
  callerName?: string;
  anonymous?: boolean;
  acceptedBy?: Array<{ id: string; name: string; at?: string }>;
};

type AkteNote = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  expiresAt?: string;
};

type ExpiryMode = "none" | "relative" | "custom";
type ExpiryUnit = "minutes" | "hours" | "days";

const FALLBACK_FIELDS: AkteField[] = [
  { key: "personImage", label_key: "tablet.persons.akte.image", type: "text", default: "", editable: true },
  { key: "phone", label_key: "tablet.persons.akte.phone", type: "text", default: "", editable: true },
  {
    key: "warrantStatus",
    label_key: "tablet.persons.akte.warrant",
    type: "select",
    default: "none",
    editable: true,
    options: [
      { value: "none", label_key: "tablet.persons.akte.warrant.none" },
      { value: "active", label_key: "tablet.persons.akte.warrant.active" },
      { value: "served", label_key: "tablet.persons.akte.warrant.served" },
    ],
  },
  {
    key: "dangerLevel",
    label_key: "tablet.persons.akte.danger",
    type: "select",
    default: "low",
    editable: true,
    options: [
      { value: "low", label_key: "tablet.persons.akte.danger.low" },
      { value: "medium", label_key: "tablet.persons.akte.danger.medium" },
      { value: "high", label_key: "tablet.persons.akte.danger.high" },
    ],
  },
  {
    key: "driverLicense",
    label_key: "tablet.persons.akte.driver_license",
    type: "select",
    default: "valid",
    editable: true,
    options: [
      { value: "valid", label_key: "tablet.persons.akte.license.valid" },
      { value: "suspended", label_key: "tablet.persons.akte.license.suspended" },
      { value: "revoked", label_key: "tablet.persons.akte.license.revoked" },
    ],
  },
  {
    key: "weaponLicense",
    label_key: "tablet.persons.akte.weapon_license",
    type: "select",
    default: "none",
    editable: true,
    options: [
      { value: "none", label_key: "tablet.persons.akte.weapon.none" },
      { value: "valid", label_key: "tablet.persons.akte.weapon.valid" },
      { value: "revoked", label_key: "tablet.persons.akte.weapon.revoked" },
    ],
  },
  { key: "notes", label_key: "tablet.persons.akte.notes", type: "textarea", default: "", editable: true },
];

const FALLBACK_DATA_FIELDS: DataField[] = [
  { key: "name", label_key: "tablet.persons.field.name", fallback: "-" },
  { key: "dob", label_key: "tablet.persons.field.dob", fallback: "-" },
  { key: "gender", label_key: "tablet.persons.field.gender", fallback: "-" },
  { key: "job", label_key: "tablet.persons.akte.occupation", fallback: "-" },
  { key: "address", label_key: "tablet.persons.akte.address", fallback: "-" },
];

const SELECTED_PERSON_STORAGE_KEY = "tg_mdt_selected_person";

const defaultsFromFields = (fields: AkteField[]) => {
  const defaults: PersonAkte = {};
  for (const field of fields) {
    defaults[field.key] = field.default || "";
  }
  return defaults;
};

function normalizeScopeName(value?: string): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeGender(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "-";
  if (value === 0 || value === "0" || value === "m" || value === "M" || value === "male") return "M";
  if (value === 1 || value === "1" || value === "f" || value === "F" || value === "female") return "F";
  return String(value).toUpperCase();
}

function decodeImages(raw?: string): string[] {
  if (!raw || raw.trim() === "") return [];

  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      return [];
    }
  }

  return [trimmed];
}

function encodeImages(items: string[]): string {
  return JSON.stringify(items.filter((item) => item.trim().length > 0));
}

function parseAkteNotes(raw?: string): AkteNote[] {
  if (!raw || raw.trim() === "") return [];

  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && typeof item === "object" && typeof item.text === "string")
          .map((item, index) => ({
            id: typeof item.id === "string" && item.id !== "" ? item.id : `note-${index}`,
            text: String(item.text || "").trim(),
            author: typeof item.author === "string" && item.author !== "" ? item.author : "Unknown",
            createdAt:
              typeof item.createdAt === "string" && item.createdAt !== ""
                ? item.createdAt
                : new Date().toISOString(),
            expiresAt: typeof item.expiresAt === "string" && item.expiresAt !== "" ? item.expiresAt : undefined,
          }))
          .filter((note) => note.text !== "");
      }
    } catch {
      return [];
    }
  }

  return [
    {
      id: "legacy-note",
      text: trimmed,
      author: "Unknown",
      createdAt: new Date().toISOString(),
    },
  ];
}

function encodeAkteNotes(notes: AkteNote[]): string {
  return JSON.stringify(notes);
}

function resolveLogoUrl(value?: string): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  if (/^(https?:|data:|blob:|nui:|\/|\.\/|\.\.)/i.test(trimmed)) {
    return trimmed;
  }

  return `./${trimmed.replace(/^\/+/, "")}`;
}

function isNoteExpired(note: AkteNote): boolean {
  if (!note.expiresAt) return false;
  const expires = Date.parse(note.expiresAt);
  if (Number.isNaN(expires)) return false;
  return expires <= Date.now();
}

function formatRelativeTime(timestamp: string): string {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return "";

  const diffMs = parsed - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  let value = 0;
  let unit = "minute";

  if (absMs >= day) {
    value = Math.max(1, Math.round(absMs / day));
    unit = value === 1 ? "day" : "days";
  } else if (absMs >= hour) {
    value = Math.max(1, Math.round(absMs / hour));
    unit = value === 1 ? "hour" : "hours";
  } else {
    value = Math.max(1, Math.round(absMs / minute));
    unit = value === 1 ? "minute" : "minutes";
  }

  return diffMs < 0 ? `${value} ${unit} ago` : `in ${value} ${unit}`;
}

function getExpiryFromInput(mode: ExpiryMode, amount: string, unit: ExpiryUnit, customAt: string): string | undefined {
  if (mode === "none") return undefined;

  if (mode === "custom") {
    if (!customAt || customAt.trim() === "") return undefined;
    const customDate = new Date(customAt);
    if (Number.isNaN(customDate.getTime())) return undefined;
    return customDate.toISOString();
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return undefined;

  const multipliers: Record<ExpiryUnit, number> = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + numericAmount * multipliers[unit]).toISOString();
}

const MAX_IMAGE_DATA_URL_LENGTH = 50000;

function isDataImageUrl(value: string): boolean {
  return /^data:image\//i.test(value);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function optimizeAkteImageUrl(raw: string): Promise<string> {
  const value = raw.trim();
  if (value === "" || !isDataImageUrl(value)) return value;
  if (value.length <= MAX_IMAGE_DATA_URL_LENGTH) return value;

  try {
    const image = await loadImage(value);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return value;

    const maxWidths = [1920, 1600, 1280, 1024, 896, 768, 640];
    const qualities = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.6];
    let best = value;

    for (const maxWidth of maxWidths) {
      const scale = Math.min(1, maxWidth / Math.max(1, image.width));
      const width = Math.max(1, Math.floor(image.width * scale));
      const height = Math.max(1, Math.floor(image.height * scale));

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);

      for (const quality of qualities) {
        const candidate = canvas.toDataURL("image/jpeg", quality);
        if (candidate.length < best.length) {
          best = candidate;
        }
        if (candidate.length <= MAX_IMAGE_DATA_URL_LENGTH) {
          return candidate;
        }
      }
    }

    return best;
  } catch {
    return value;
  }
}

export default function PersonsView({
  t,
  actorName,
  persons,
  globalSearch,
  initialAkten,
  akteSync,
  akteFields,
  dataFields,
  incidents,
  bolos,
  dispatchHistory,
  akteScope,
  meta,
  viewerJob,
}: {
  t: TFunction;
  actorName?: string;
  persons: PersonRecord[];
  globalSearch: string;
  initialAkten: Record<string, PersonAkte>;
  akteSync?: AkteSyncPayload;
  akteFields?: AkteField[];
  dataFields?: DataField[];
  incidents?: RelatedIncident[];
  bolos?: RelatedBolo[];
  dispatchHistory?: RelatedDispatchHistory[];
  akteScope?: string;
  meta?: any;
  viewerJob?: string;
}) {
  const resolvedFields = akteFields && akteFields.length > 0 ? akteFields : FALLBACK_FIELDS;
  const resolvedDataFields = dataFields && dataFields.length > 0 ? dataFields : FALLBACK_DATA_FIELDS;
  const defaultAkte = useMemo(() => defaultsFromFields(resolvedFields), [resolvedFields]);
  const baseScope = (akteScope || "default").trim().toLowerCase() || "default";

  const akteKey = (identifier: string, scope: string) => `${identifier}::${scope.trim().toLowerCase() || "default"}`;

  const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null);
  const [aktenByPerson, setAktenByPerson] = useState<Record<string, PersonAkte>>({});
  const [selectedCompartment, setSelectedCompartment] = useState(baseScope);
  const [shareTarget, setShareTarget] = useState("");
  const [sharedCompartments, setSharedCompartments] = useState<string[]>([]);
  const [removingCompartments, setRemovingCompartments] = useState<Record<string, boolean>>({});
  const [captureBusy, setCaptureBusy] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteExpiryMode, setNewNoteExpiryMode] = useState<ExpiryMode>("none");
  const [newNoteExpiryAmount, setNewNoteExpiryAmount] = useState("1");
  const [newNoteExpiryUnit, setNewNoteExpiryUnit] = useState<ExpiryUnit>("days");
  const [newNoteCustomAt, setNewNoteCustomAt] = useState("");

  const imageFieldKey = useMemo(() => {
    const candidates = ["personImage", "image", "imageUrl", "photo", "photoUrl", "mugshot"];
    for (const key of candidates) {
      if (resolvedFields.some((field) => field.key === key)) return key;
    }
    return "personImage";
  }, [resolvedFields]);

  const notesFieldKey = useMemo(() => {
    if (resolvedFields.some((field) => field.key === "notes")) return "notes";
    return "notes";
  }, [resolvedFields]);

  const allowedJobs = useMemo(() => {
    const jobs = meta?.mdt?.allowed_jobs || [];
    if (jobs.length === 0) {
      return [baseScope];
    }
    return jobs;
  }, [meta, baseScope]);

  const departments = meta?.mdt?.departments;

  const departmentTabs = useMemo<CompartmentOption[]>(() => {
    if (!departments || Object.keys(departments).length === 0) {
      return allowedJobs.map((job: string) => ({
        value: job.toLowerCase(),
        label: job.toUpperCase(),
      }));
    }
    return Object.entries(departments).map(([deptKey, deptCfg]: [string, any]) => ({
      value: deptKey.toLowerCase(),
      label: deptCfg.label || deptKey.toUpperCase(),
      logoUrl: resolveLogoUrl(deptCfg.logo_url),
    }));
  }, [departments, allowedJobs]);

  const compartmentLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const tab of departmentTabs) {
      labels[normalizeScopeName(tab.value)] = tab.label;
    }
    return labels;
  }, [departmentTabs]);

  const configProtectedCompartments = useMemo(() => {
    const selected = normalizeScopeName(selectedCompartment);
    const protectedScopes = new Set<string>([selected]);
    const jobModels = meta?.akteModels?.job_models || {};

    const resolveCompartment = (jobKey: string, cfg: any) => {
      const fromConfig = normalizeScopeName(cfg?.compartment);
      return fromConfig !== "" ? fromConfig : normalizeScopeName(jobKey);
    };

    const normalizeShareTargets = (entries: unknown[]) =>
      entries
        .map((entry) => normalizeScopeName(String(entry || "")))
        .filter((entry) => entry !== "")
        .map((entry) => {
          const cfg = jobModels[entry];
          if (cfg) {
            return resolveCompartment(entry, cfg);
          }
          return entry;
        });

    for (const [jobKey, cfg] of Object.entries(jobModels as Record<string, any>)) {
      const compartment = resolveCompartment(jobKey, cfg);
      const sharedWith = normalizeShareTargets(Array.isArray(cfg?.shared_with) ? cfg.shared_with : []);

      if (compartment === selected) {
        for (const share of sharedWith) {
          protectedScopes.add(share);
        }
      }

      if (sharedWith.includes(selected)) {
        protectedScopes.add(compartment);
      }
    }

    return protectedScopes;
  }, [meta, selectedCompartment]);

  const hasAccessToJobTab = (targetDeptKey: string) => {
    const normTarget = targetDeptKey.trim().toLowerCase();

    if (!departments || Object.keys(departments).length === 0) {
      const allowed = meta?.mdt?.allowed_jobs || [];
      if (allowed.length === 0) return true;
      if (!viewerJob) return false;
      return allowed.map((j: string) => j.toLowerCase()).includes(viewerJob.trim().toLowerCase());
    }

    if (!viewerJob) return false;
    const normViewer = viewerJob.trim().toLowerCase();

    // 1. Direct department membership
    const targetDept = departments[normTarget];
    const jobModels = meta?.akteModels?.job_models || {};
    const viewerConfig = jobModels[normViewer];
    const viewerCompartment = (viewerConfig?.compartment || normViewer).trim().toLowerCase();

    if (targetDept) {
      const deptJobs = Array.isArray(targetDept.jobs)
        ? targetDept.jobs.map((j: string) => j.trim().toLowerCase())
        : [];
      if (deptJobs.includes(normViewer)) return true;

      for (const deptJob of deptJobs) {
        const deptJobConfig = jobModels[deptJob];
        const deptJobCompartment = (deptJobConfig?.compartment || deptJob).trim().toLowerCase();
        if (deptJobCompartment === viewerCompartment) return true;

        const sharedWith = Array.isArray(deptJobConfig?.shared_with)
          ? deptJobConfig.shared_with.map((s: string) => s.trim().toLowerCase())
          : [];
        if (sharedWith.includes(normViewer) || sharedWith.includes(viewerCompartment)) {
          return true;
        }
      }
    }

    // 2. Compartment/job sharing fallback
    const targetCompartment = (jobModels[normTarget]?.compartment || normTarget).trim().toLowerCase();
    if (viewerCompartment === targetCompartment) return true;

    const targetConfig = jobModels[normTarget] || jobModels[targetCompartment];
    if (targetConfig) {
      const sharedWith = Array.isArray(targetConfig.shared_with)
        ? targetConfig.shared_with.map((s: string) => s.trim().toLowerCase())
        : [];
      if (sharedWith.includes(normViewer) || sharedWith.includes(viewerCompartment)) {
        return true;
      }
    }

    return false;
  };

  useEffect(() => {
    setAktenByPerson((prev) => {
      const next = { ...prev };
      for (const [identifier, akte] of Object.entries(initialAkten || {})) {
        const key = akteKey(identifier, baseScope);
        if (!next[key]) {
          next[key] = {
            ...defaultAkte,
            ...(akte || {}),
          };
        }
      }
      return next;
    });
  }, [initialAkten, baseScope, defaultAkte]);

  useEffect(() => {
    if (!akteSync || akteSync.kind !== "person" || !akteSync.identifier || !akteSync.akte) return;
    const scope = (akteSync.compartment || baseScope).trim().toLowerCase() || baseScope;
    setAktenByPerson((prev) => ({
      ...prev,
      [akteKey(akteSync.identifier as string, scope)]: {
        ...defaultAkte,
        ...(prev[akteKey(akteSync.identifier as string, scope)] || {}),
        ...(akteSync.akte || {}),
      },
    }));
  }, [akteSync, defaultAkte]);

  const normalizedPersons = useMemo(
    () =>
      (persons || []).map((person) => {
        const displayName =
          person.name ||
          [person.firstname, person.lastname].filter(Boolean).join(" ") ||
          t("tablet.player.unknown_user");

        return {
          ...person,
          name: displayName,
        };
      }),
    [persons, t]
  );

  const filteredPersons = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();
    if (!term) return normalizedPersons;

    return normalizedPersons.filter((person) => {
      const haystack = [person.name, person.firstname, person.lastname, person.job, person.dob]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [normalizedPersons, globalSearch]);

  useEffect(() => {
    if (!selectedIdentifier) return;
    const exists = filteredPersons.some((person) => person.identifier === selectedIdentifier);
    if (!exists) {
      setSelectedIdentifier(null);
    }
  }, [filteredPersons, selectedIdentifier]);

  const selectedPerson =
    filteredPersons.find((person) => person.identifier === selectedIdentifier) || null;

  const currentAkteKey = selectedPerson ? akteKey(selectedPerson.identifier, selectedCompartment) : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(SELECTED_PERSON_STORAGE_KEY);
    if (saved && saved.trim() !== "") {
      setSelectedIdentifier(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedIdentifier) {
      window.localStorage.removeItem(SELECTED_PERSON_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SELECTED_PERSON_STORAGE_KEY, selectedIdentifier);
  }, [selectedIdentifier]);

  useEffect(() => {
    if (!selectedPerson) return;
    const scopeKey = currentAkteKey;
    if (aktenByPerson[scopeKey]) return;

    fetchNui<PersonAkte>("getPersonAkte", { identifier: selectedPerson.identifier, compartment: selectedCompartment })
      .then((akte) => {
        setAktenByPerson((prev) => ({
          ...prev,
          [scopeKey]: {
            ...defaultAkte,
            ...(akte || {}),
          },
        }));
      })
      .catch(() => {
        // Keep defaults when callback fails.
      });
  }, [selectedPerson, selectedCompartment, currentAkteKey, aktenByPerson, defaultAkte, baseScope]);

  const currentAkte: PersonAkte = selectedPerson
    ? aktenByPerson[currentAkteKey] || {
        ...defaultAkte,
      }
    : defaultAkte;
  const currentSearchState = String(currentAkte.searchStatus || currentAkte.searchedAt || "").trim();
  const isSelectedSearched = currentSearchState !== "" && currentSearchState !== "none";

  const personImages = decodeImages(currentAkte[imageFieldKey] ?? "");
  const allNotes = useMemo(
    () => parseAkteNotes(currentAkte[notesFieldKey] ?? "").sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [currentAkte, notesFieldKey]
  );
  const activeNotes = allNotes.filter((note) => !isNoteExpired(note));
  const expiredNotesCount = allNotes.length - activeNotes.length;
  const relatedIncidents = (incidents || []).filter((incident) => incident.linkedPersons.includes(selectedPerson?.identifier || ""));
  const relatedBolos = (bolos || []).filter((bolo) => bolo.linkedPersons.includes(selectedPerson?.identifier || ""));
  const relatedDispatches = (dispatchHistory || [])
    .filter((entry) => entry.callerIdentifier === (selectedPerson?.identifier || ""))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const activeImage = personImages[activeImageIndex] || personImages[0] || "";
  const activeImageIsDataUrl = activeImage.startsWith("data:");
  const activeImageIsHttpUrl = /^https?:\/\//i.test(activeImage);
  const normalizedSelectedCompartment = normalizeScopeName(selectedCompartment);

  useEffect(() => {
    if (!selectedPerson) {
      setSharedCompartments([]);
      return;
    }

    fetchNui<string[]>("getAkteCompartments", {
      kind: "person",
      value: selectedPerson.identifier,
    })
      .then((result) => {
        const next = Array.isArray(result)
          ? result
              .map((item) => normalizeScopeName(item))
              .filter((item) => item !== "" && item !== "default" && item !== normalizedSelectedCompartment)
          : [];
        setSharedCompartments(Array.from(new Set(next)).sort());
      })
      .catch(() => {
        setSharedCompartments([]);
      });
  }, [selectedPerson?.identifier, normalizedSelectedCompartment]);

  const persistAkte = (identifier: string, nextAkte: PersonAkte) => {
    fetchNui<PersonAkte>("savePersonAkte", { identifier, akte: nextAkte, compartment: selectedCompartment })
      .then((saved) => {
        const savedImageCount = decodeImages(saved?.[imageFieldKey] ?? "").length;
        void fetchNui("debugUiLog", {
          tag: "persons-save",
          message: `identifier=${identifier} scope=${selectedCompartment} savedImages=${savedImageCount}`,
        });

        if (!saved) return;
        setAktenByPerson((prev) => ({
          ...prev,
          [akteKey(identifier, selectedCompartment)]: {
            ...defaultAkte,
            ...(prev[akteKey(identifier, selectedCompartment)] || {}),
            ...(saved || {}),
          },
        }));
      })
      .catch(() => {
        // Ignore save errors for now; local view state remains.
      });
  };

  const updateAkteField = (field: string, value: string, editable = true) => {
    if (!selectedPerson) return;
    if (!editable) return;

    const identifier = selectedPerson.identifier;

    setAktenByPerson((prev) => {
      const nextAkte: PersonAkte = {
        ...defaultAkte,
        ...(prev[akteKey(identifier, selectedCompartment)] || {}),
        [field]: value,
      };

      return {
        ...prev,
        [akteKey(identifier, selectedCompartment)]: nextAkte,
      };
    });

    // Persist only the changed field so stale defaults cannot overwrite image data.
    persistAkte(identifier, { [field]: value });
  };

  const saveAkte = () => {
    if (!selectedPerson) return;
    persistAkte(selectedPerson.identifier, currentAkte);
  };

  const shareCurrentAkte = () => {
    if (!selectedPerson) return;
    const target = shareTarget.trim().toLowerCase();
    if (target === "" || target === selectedCompartment) return;

    fetchNui<PersonAkte>("savePersonAkte", {
      identifier: selectedPerson.identifier,
      akte: currentAkte,
      compartment: target,
    }).then((saved) => {
      if (!saved) return;
      setAktenByPerson((prev) => ({
        ...prev,
        [akteKey(selectedPerson.identifier, target)]: {
          ...defaultAkte,
          ...(saved || {}),
        },
      }));
      setSharedCompartments((prev) => {
        const next = new Set(prev.map((entry) => normalizeScopeName(entry)));
        if (target !== "default" && target !== normalizedSelectedCompartment) {
          next.add(target);
        }
        return Array.from(next).sort();
      });
      setShareTarget("");
    });
  };

  const removeSharedCompartment = (scope: string) => {
    if (!selectedPerson) return;
    const normalizedScope = normalizeScopeName(scope);
    if (normalizedScope === "" || configProtectedCompartments.has(normalizedScope)) return;

    setRemovingCompartments((prev) => ({ ...prev, [normalizedScope]: true }));

    fetchNui<{ ok?: boolean }>("removeAkteCompartment", {
      kind: "person",
      value: selectedPerson.identifier,
      compartment: normalizedScope,
    })
      .then((result) => {
        if (!result?.ok) return;

        setSharedCompartments((prev) => prev.filter((entry) => normalizeScopeName(entry) !== normalizedScope));
        setAktenByPerson((prev) => {
          const next = { ...prev };
          delete next[akteKey(selectedPerson.identifier, normalizedScope)];
          return next;
        });
      })
      .finally(() => {
        setRemovingCompartments((prev) => {
          const next = { ...prev };
          delete next[normalizedScope];
          return next;
        });
      });
  };

  const setSelectedPersonSearchState = (searched: boolean) => {
    if (!selectedPerson) return;
    updateAkteField("searchStatus", searched ? "searched" : "", true);
    updateAkteField("searchedAt", searched ? new Date().toISOString() : "", true);
  };

  useEffect(() => {
    setActiveImageIndex(0);
    setManualImageUrl("");
  }, [selectedIdentifier]);

  useEffect(() => {
    if (activeImageIndex < personImages.length) return;
    setActiveImageIndex(0);
  }, [activeImageIndex, personImages.length]);

  const capturePersonImage = async () => {
    if (!selectedPerson || captureBusy) return;

    const identifier = selectedPerson.identifier;

    setCaptureBusy(true);
    try {
      const result = await fetchNui<{ ok?: boolean; images?: string[] }>("openAktePhotoMode", {
        kind: "person",
        identifier,
        screen: "persons",
      });

      const incomingCount = Array.isArray(result?.images) ? result.images.length : 0;
      const firstPrefix =
        incomingCount > 0 && typeof result?.images?.[0] === "string"
          ? String(result.images[0]).slice(0, 24)
          : "none";
      void fetchNui("debugUiLog", {
        tag: "persons-capture",
        message: `ok=${String(Boolean(result?.ok))} incoming=${incomingCount} first=${firstPrefix}`,
      });

      if (!result?.ok || !Array.isArray(result.images) || result.images.length === 0) {
        return;
      }

      const rawImages = result.images.filter((item) => typeof item === "string" && item.trim() !== "");
      if (rawImages.length === 0) return;

      const newImages = (await Promise.all(rawImages.map((item) => optimizeAkteImageUrl(item)))).filter(
        (item) => item.trim() !== ""
      );
      if (newImages.length === 0) return;

      const rawLongest = rawImages.reduce((max, item) => Math.max(max, item.length), 0);
      const optimizedLongest = newImages.reduce((max, item) => Math.max(max, item.length), 0);
      void fetchNui("debugUiLog", {
        tag: "persons-image-opt",
        message: `identifier=${identifier} rawMax=${rawLongest} optimizedMax=${optimizedLongest} limit=${MAX_IMAGE_DATA_URL_LENGTH}`,
      });

      const scopeKey = akteKey(identifier, selectedCompartment);
      const serverAkte = await fetchNui<PersonAkte>("getPersonAkte", { identifier, compartment: selectedCompartment });
      const localAkte: PersonAkte = {
        ...defaultAkte,
        ...(aktenByPerson[scopeKey] || {}),
      };
      const serverImages = decodeImages(serverAkte?.[imageFieldKey] ?? "");
      const localImages = decodeImages(localAkte[imageFieldKey] ?? "");
      const baseImages = serverImages.length >= localImages.length ? serverImages : localImages;
      const merged = [...baseImages, ...newImages];
      if (merged.length === 0) return;

      void fetchNui("debugUiLog", {
        tag: "persons-merge",
        message: `identifier=${identifier} server=${serverImages.length} local=${localImages.length} new=${newImages.length} merged=${merged.length}`,
      });

      const nextAkte: PersonAkte = {
        ...defaultAkte,
        ...(serverAkte || {}),
        ...localAkte,
        [imageFieldKey]: encodeImages(merged),
      };

      setAktenByPerson((prev) => ({
        ...prev,
        [scopeKey]: nextAkte,
      }));
      persistAkte(identifier, nextAkte);
      setActiveImageIndex(Math.max(0, merged.length - 1));
    } finally {
      setCaptureBusy(false);
    }
  };

  const deleteCurrentImage = () => {
    if (!selectedPerson || personImages.length === 0) return;

    const nextImages = personImages.filter((_, index) => index !== activeImageIndex);
    updateAkteField(imageFieldKey, encodeImages(nextImages), true);

    if (nextImages.length === 0) {
      setActiveImageIndex(0);
      return;
    }

    setActiveImageIndex(Math.max(0, Math.min(activeImageIndex, nextImages.length - 1)));
  };

  const retakeCurrentImage = async () => {
    if (!selectedPerson || captureBusy || personImages.length === 0) return;

    setCaptureBusy(true);
    try {
      const result = await fetchNui<{ ok?: boolean; images?: string[] }>("openAktePhotoMode", {
        kind: "person",
        identifier: selectedPerson.identifier,
        screen: "persons",
      });

      if (!result?.ok || !Array.isArray(result.images) || result.images.length === 0) {
        return;
      }

      const rawNextImage = result.images[result.images.length - 1];
      const nextImage = rawNextImage ? await optimizeAkteImageUrl(rawNextImage) : "";
      if (!nextImage || nextImage.trim() === "") {
        return;
      }

      const nextImages = [...personImages];
      nextImages[activeImageIndex] = nextImage;
      updateAkteField(imageFieldKey, encodeImages(nextImages), true);
    } finally {
      setCaptureBusy(false);
    }
  };

  const updateCurrentHttpImageUrl = (nextUrl: string) => {
    if (!selectedPerson || personImages.length === 0) return;
    if (nextUrl.trim() !== "" && !/^https?:\/\//i.test(nextUrl.trim())) return;

    const nextImages = [...personImages];
    nextImages[activeImageIndex] = nextUrl.trim();
    updateAkteField(imageFieldKey, encodeImages(nextImages), true);
  };

  const addManualHttpImage = () => {
    const nextUrl = manualImageUrl.trim();
    if (nextUrl === "") return;
    if (!/^https?:\/\//i.test(nextUrl)) return;

    const merged = [...personImages, nextUrl];
    updateAkteField(imageFieldKey, encodeImages(merged), true);
    setActiveImageIndex(merged.length - 1);
    setManualImageUrl("");
  };

  const addNote = () => {
    if (!selectedPerson) return;
    const text = newNoteText.trim();
    if (text === "") return;

    const expiresAt = getExpiryFromInput(newNoteExpiryMode, newNoteExpiryAmount, newNoteExpiryUnit, newNoteCustomAt);

    const nextNotes: AkteNote[] = [
      {
        id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        text,
        author: (actorName || t("tablet.player.unknown_user")).trim() || "Unknown",
        createdAt: new Date().toISOString(),
        expiresAt,
      },
      ...allNotes,
    ];

    updateAkteField(notesFieldKey, encodeAkteNotes(nextNotes), true);
    setNewNoteText("");
    setNewNoteExpiryMode("none");
    setNewNoteExpiryAmount("1");
    setNewNoteExpiryUnit("days");
    setNewNoteCustomAt("");
  };

  const removeNote = (id: string) => {
    const nextNotes = allNotes.filter((note) => note.id !== id);
    updateAkteField(notesFieldKey, encodeAkteNotes(nextNotes), true);
  };

  useEffect(() => {
    if (fullscreenImage) {
      setFullscreenZoom(1);
    }
  }, [fullscreenImage]);

  const zoomInFullscreen = () => setFullscreenZoom((prev) => Math.min(6, Number((prev + 0.25).toFixed(2))));
  const zoomOutFullscreen = () => setFullscreenZoom((prev) => Math.max(1, Number((prev - 0.25).toFixed(2))));
  const resetFullscreenZoom = () => setFullscreenZoom(1);

  if (!selectedPerson) {
    return (
      <div key="list" className="h-full flex flex-col gap-4 animate-mdt-view">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl card-title  uppercase tracking-wider">{t("tablet.sidebar.persons")}</h3>
            <p className="card-sub mt-1  text-[11px]">{t("tablet.persons.subtitle")}</p>
          </div>
          <div className="px-3 py-1 rounded border border-zinc-800 bg-black/30 text-xs text-zinc-400  font-bold tracking-wider">
            {filteredPersons.length} / {normalizedPersons.length} RECORDED
          </div>
        </div>

        <Card className="p-4 flex-1 overflow-y-auto premium-scroll glass-panel animate-mdt-scale-in">
          {filteredPersons.length === 0 ? (
            <div className="h-full min-h-28 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]  italic">
              {t("tablet.persons.no_match")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {filteredPersons.map((person, index) => {
                const personAkte = aktenByPerson[person.identifier] || defaultAkte;
                const isSearched = String(personAkte.searchStatus || personAkte.searchedAt || "").trim() !== "";

                return (
                  <button
                    key={person.identifier}
                    type="button"
                    onClick={() => setSelectedIdentifier(person.identifier)}
                    className="w-full flex flex-col items-stretch text-left hover-card-grow animate-mdt-fade-in-up duration-300 relative group active:scale-[0.98] transition-all cursor-pointer"
                    style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
                  >
                    <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/20 group-hover:bg-zinc-900/10 group-hover:border-zinc-700/60 shadow-lg shadow-black/35 flex flex-col justify-between h-28 overflow-hidden">
                      <div className="flex items-start justify-between gap-3 w-full">
                        <p className="text-sm text-white font-semibold truncate group-hover:text-[var(--mdt-accent-primary)] transition-colors">{person.name}</p>
                        {isSearched && <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 shrink-0">Flagged</span>}
                      </div>

                      <div className="mt-auto">
                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span>Job</span>
                          <span className="text-zinc-300 font-medium truncate max-w-[125px]">{person.job || t("tablet.persons.not_available")}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                          <span>DOB</span>
                          <span className="text-zinc-400">{person.dob || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div key={selectedIdentifier || "details"} className="h-full flex flex-col gap-4 animate-mdt-view relative">
      
      {/* Header controls (stays glassmorphic and elegant) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
        <Button variant="ghost" onClick={() => setSelectedIdentifier(null)} className="inline-flex items-center gap-2 self-start transition-all duration-200 active:scale-95 border border-zinc-800/80 hover:bg-zinc-800/50">
          <ArrowLeft className="w-4 h-4" />
          {t("tablet.actions.back")}
        </Button>
        <div className="flex items-center gap-2 self-end">
          <Button 
            variant={isSelectedSearched ? "ghost" : "primary"} 
            onClick={() => setSelectedPersonSearchState(!isSelectedSearched)}
            className={`transition-all duration-200 active:scale-95 ${isSelectedSearched ? "border border-amber-500/30 text-amber-400 hover:bg-amber-500/5" : "shadow-[0_0_12px_rgba(255,145,0,0.15)]"}`}
          >
            {isSelectedSearched ? t("tablet.actions.clear_searched") : t("tablet.actions.mark_searched")}
          </Button>
          <Button onClick={saveAkte} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all duration-200 active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            {t("tablet.form.save_akte")}
          </Button>
        </div>
      </div>

      {/* Main Dossier Folder Binder Body */}
      <div className="relative grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-0 border-l-[6px] border-zinc-900 bg-zinc-950/25 rounded-2xl p-5 shadow-[inset_12px_0_24px_-10px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Metal Binder Spine rings on the left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-950 border-r border-zinc-800 z-20 rounded-l-md" />
        
        {isSelectedSearched && (
          <div className="absolute top-16 right-8 select-none border-2 border-dashed border-amber-500/30 text-amber-500/60 px-4 py-1.5 rounded text-[10px]  font-black tracking-widest uppercase rotate-[2deg] mix-blend-screen shadow-[0_0_8px_rgba(245,158,11,0.05)] pointer-events-none z-10 animate-pulse">
            WARRANT RECORD ACTIVE
          </div>
        )}

        {/* Left Column: Personal details (resembling a clamped paper record) */}
        <div className="xl:col-span-5 col-span-12 relative flex flex-col bg-zinc-950/50 rounded-2xl border border-zinc-900 shadow-xl overflow-hidden animate-mdt-scale-in max-h-[calc(100vh-260px)]">
          {/* Metal paper clip on top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4.5 bg-gradient-to-b from-zinc-300 to-zinc-200 border-x border-b border-zinc-500 rounded-b-lg shadow-md z-10 flex items-center justify-center">
            <span className="text-[7px] font-semibold tracking-wide text-zinc-200">{t("tablet.common.information", undefined, "Information")}</span>
          </div>

          <div className="p-6 pt-8 space-y-5 overflow-y-auto premium-scroll flex-1">
            <div>
              <p className="text-[9px]  tracking-[0.25em] text-[var(--mdt-text-muted)] font-black uppercase">DOSSIER INDEX // PLAYER RECORD</p>
              <h4 className="text-2xl text-white  font-black mt-1.5 tracking-wide uppercase">{selectedPerson.name}</h4>
              <p className="text-[10px] text-zinc-650  mt-1">SERIAL KEY: P-{selectedPerson.identifier.slice(0, 10).toUpperCase()}</p>
            </div>

            <div className="space-y-3 ">
              {resolvedDataFields.map((field) => {
                const label = field.label_key ? t(field.label_key) : field.key;
                const rawValue = (selectedPerson as Record<string, unknown>)[field.key];
                const value = field.key === "gender"
                  ? normalizeGender(rawValue as string | number | null | undefined)
                  : String(rawValue ?? field.fallback ?? t("tablet.persons.not_available"));

                return (
                  <div key={field.key} className="p-3.5 rounded-lg border border-zinc-900 bg-black/35 hover:bg-black/50 hover:border-zinc-800 transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 w-[3px] h-full bg-zinc-800 group-hover:bg-[var(--mdt-accent-primary)] transition-colors" />
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">{label}</p>
                    <p className="text-xs text-zinc-200 mt-1 font-bold tracking-wide uppercase">{value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Akte Management (resembling a tabbed filing binder content) */}
        <div className="xl:col-span-7 col-span-12 relative flex flex-col bg-zinc-950/40 border border-zinc-900 shadow-xl rounded-2xl overflow-hidden animate-mdt-scale-in max-h-[calc(100vh-260px)]">
          
          {/* Protruding Index Tabs Section */}
          <div className="flex bg-black/40 border-b border-zinc-900 overflow-x-auto premium-scroll shrink-0">
            {departmentTabs.map((option) => {
              const isActive = option.value === selectedCompartment;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedCompartment(option.value)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs  font-bold tracking-wider transition-all duration-200 border-r border-zinc-900 cursor-pointer relative shrink-0 ${
                    isActive
                      ? "bg-zinc-900/60 text-[var(--mdt-accent-primary)] border-b-2 border-b-[var(--mdt-accent-primary)]"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/20"
                  }`}
                >
                  {option.logoUrl && (
                    <img
                      src={option.logoUrl}
                      alt={option.label}
                      className="h-3.5 w-3.5 object-contain"
                    />
                  )}
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-5 overflow-y-auto premium-scroll flex-1 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <h4 className="text-xs  font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--mdt-accent-primary)] animate-pulse" />
                {t("tablet.persons.akte.title")}
              </h4>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500  uppercase tracking-widest">Scope: {selectedCompartment}</span>
              </div>
            </div>

            {/* Sharing Interface */}
            <div className="p-3.5 rounded-xl border border-zinc-900 bg-black/25 space-y-3 ">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Compartment Sharing Controls</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={shareTarget}
                    onChange={(event) => setShareTarget(event.target.value)}
                    className="min-w-[150px] rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)] "
                  >
                    <option value="">{t("tablet.actions.select_department") || "Select department..."}</option>
                    {departmentTabs
                      .filter((opt) => opt.value !== selectedCompartment)
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                  <Button variant="ghost" onClick={shareCurrentAkte} disabled={shareTarget.trim() === ""} className="px-3 py-1.5 text-xs  transition-all active:scale-95 hover:bg-zinc-800/40">
                    {t("tablet.actions.share_with")}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-900 bg-black/10 p-2.5">
                <p className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">ACTIVE SECURE SHARES</p>
                {sharedCompartments.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 italic">No external department shares active for this file</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {sharedCompartments.map((scope) => {
                      const normalizedScope = normalizeScopeName(scope);
                      const removable = !configProtectedCompartments.has(normalizedScope);
                      return (
                        <span
                          key={normalizedScope}
                          className="inline-flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs text-white font-medium "
                        >
                          {compartmentLabels[normalizedScope] || normalizedScope.toUpperCase()}
                          {!removable && (
                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-zinc-805 text-zinc-500 font-bold">SYSTEM</span>
                          )}
                          {removable && (
                            <button
                              type="button"
                              className="text-red-400 hover:text-red-300 disabled:opacity-60 transition-colors cursor-pointer"
                              disabled={Boolean(removingCompartments[normalizedScope])}
                              onClick={() => removeSharedCompartment(normalizedScope)}
                              aria-label={`Remove share ${normalizedScope}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div key={selectedCompartment} className="space-y-4 animate-mdt-view">
              {!hasAccessToJobTab(selectedCompartment) ? (() => {
                const targetDept = departments ? departments[selectedCompartment] : null;
                const deptLogo = resolveLogoUrl(targetDept?.logo_url);
                const deptLabel = targetDept?.label || selectedCompartment.toUpperCase();
                return (
                  <div className="relative overflow-hidden rounded-xl border border-zinc-900 bg-black/40 backdrop-blur-xl p-8 py-16 flex flex-col items-center justify-center text-center space-y-4 ">
                    {deptLogo ? (
                      <div className="relative w-20 h-20 mb-2 flex items-center justify-center">
                        <img
                          src={deptLogo}
                          alt={deptLabel}
                          className="w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(255,145,0,0.25)] animate-pulse"
                        />
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--mdt-accent-primary)] border border-black flex items-center justify-center shadow-md animate-mdt-pulse-subtle">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5 text-black"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[rgba(255,145,0,0.1)] border border-[rgba(255,145,0,0.3)] flex items-center justify-center shadow-lg shadow-[rgba(255,145,0,0.05)] animate-mdt-pulse-subtle">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-8 h-8 text-[var(--mdt-accent-primary)]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    )}
                    <div className="space-y-2">
                      <h5 className="text-lg font-bold text-white tracking-wide uppercase">
                        {t("tablet.access.restricted_title")}
                      </h5>
                      <p className="text-xs text-[var(--mdt-text-muted)] max-w-sm">
                        {t("tablet.access.restricted_body", { department: deptLabel })}
                      </p>
                    </div>
                  </div>
                );
              })() : (
              <>
                {/* Photo Gallery & Camera */}
                <div className="p-4 rounded-xl border border-[var(--mdt-border)] bg-white/[0.01] hover:bg-white/[0.02] hover:border-zinc-800 transition-all duration-300 space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-zinc-800/40 pb-2.5">
                    <label className="text-xs uppercase tracking-widest text-[var(--mdt-text-muted)] font-bold">{t("tablet.persons.akte.image")}</label>
                    <Button onClick={capturePersonImage} disabled={captureBusy} className="px-3.5 py-1.5 text-xs bg-[var(--mdt-accent-primary)] text-black font-semibold transition-all duration-200 active:scale-95 shadow-[0_0_8px_rgba(255,145,0,0.1)]">
                      {captureBusy ? t("tablet.akte.capture_image_busy") : t("tablet.akte.capture_image")}
                    </Button>
                  </div>

                  {activeImage ? (
                    <div className="relative group overflow-hidden rounded-lg border border-[var(--mdt-border)] bg-black/40 h-64 md:h-72">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeImage}
                        alt={selectedPerson.name || t("tablet.player.unknown_user")}
                        onClick={() => setFullscreenImage(activeImage)}
                        className="w-full h-full object-cover cursor-zoom-in group-hover:scale-102 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <span className="text-[10px] text-white/90 bg-black/60 px-2.5 py-1 rounded-full font-medium backdrop-blur-md border border-white/10">
                          {t("tablet.akte.photos_count", { count: personImages.length })} • Active #{activeImageIndex + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={retakeCurrentImage}
                            disabled={captureBusy}
                            className="p-1.5 rounded bg-black/70 hover:bg-black/90 text-white/80 hover:text-white text-[10px] font-semibold border border-white/5 backdrop-blur-sm transition-colors"
                          >
                            Retake
                          </button>
                          <button
                            type="button"
                            onClick={deleteCurrentImage}
                            disabled={captureBusy}
                            className="p-1.5 rounded bg-red-950/70 hover:bg-red-900/90 text-red-300 hover:text-red-200 text-[10px] font-semibold border border-red-500/20 backdrop-blur-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-36 rounded-lg border border-dashed border-[var(--mdt-border)] flex flex-col items-center justify-center gap-2 bg-black/10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.akte.image_hint")}</span>
                    </div>
                  )}

                  {personImages.length > 1 && (
                    <div className="grid grid-cols-6 gap-2">
                      {personImages.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => {
                            if (index === activeImageIndex) {
                              setFullscreenImage(image);
                              return;
                            }
                            setActiveImageIndex(index);
                          }}
                          className={`rounded-lg overflow-hidden border-2 aspect-square relative group transition-all duration-200 hover:scale-103 ${
                            index === activeImageIndex 
                              ? "border-[var(--mdt-accent-primary)] shadow-[0_0_8px_rgba(255,145,0,0.2)]" 
                              : "border-[var(--mdt-border)] opacity-60 hover:opacity-100"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image} alt={`${selectedPerson.name || "person"}-${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {personImages.length > 0 && !activeImageIsDataUrl && (
                    <div className="space-y-1 bg-black/10 p-2.5 rounded-lg border border-zinc-800/40">
                      <label className="block text-[10px] uppercase tracking-wider text-[var(--mdt-text-muted)] font-semibold">{t("tablet.akte.image_url")}</label>
                      <input
                        value={activeImageIsHttpUrl ? activeImage : ""}
                        onChange={(event) => updateCurrentHttpImageUrl(event.target.value)}
                        className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)] disabled:opacity-60 transition-all"
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 p-3 rounded-lg border border-zinc-800/30 bg-black/5">
                    <label className="block text-[10px] uppercase tracking-wider text-[var(--mdt-text-muted)] font-semibold">{t("tablet.akte.add_https_url")}</label>
                    <div className="flex items-center gap-2">
                      <input
                        value={manualImageUrl}
                        onChange={(event) => setManualImageUrl(event.target.value)}
                        className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)]"
                        placeholder="https://..."
                      />
                      <Button onClick={addManualHttpImage} className="text-xs px-3.5 py-2 font-medium shrink-0 transition-all active:scale-95">{t("tablet.akte.add_url")}</Button>
                    </div>
                  </div>
                </div>

                {/* Case Notes */}
                <div className="p-4 rounded-xl border border-[var(--mdt-border)] bg-white/[0.01] hover:bg-white/[0.02] hover:border-zinc-800 transition-all duration-300 space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-zinc-800/40 pb-2.5">
                    <label className="text-xs uppercase tracking-widest text-[var(--mdt-text-muted)] font-bold">{t("tablet.persons.akte.notes")}</label>
                    {expiredNotesCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[var(--mdt-text-muted)] font-medium">
                        {t("tablet.notes.expired_hidden", { count: expiredNotesCount })}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 max-h-56 overflow-y-auto premium-scroll pr-1.5">
                    {activeNotes.length === 0 ? (
                      <p className="text-xs text-[var(--mdt-text-muted)] italic py-3 text-center">{t("tablet.notes.none")}</p>
                    ) : (
                      activeNotes.map((note, index) => (
                        <div 
                          key={note.id} 
                          className="rounded-lg border border-[var(--mdt-border)] bg-white/[0.01] hover:bg-white/[0.03] hover:border-zinc-800 p-3 transition-all duration-300 relative group overflow-hidden"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <div className="absolute top-0 left-0 w-[2px] h-full bg-zinc-800 group-hover:bg-zinc-600 transition-colors" />
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-xs text-white font-semibold">{note.author}</p>
                              <p className="text-[10px] text-[var(--mdt-text-muted)] mt-0.5">
                                Posted {formatRelativeTime(note.createdAt)}
                                {note.expiresAt ? ` • Expires ${formatRelativeTime(note.expiresAt)}` : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="text-[10px] text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded bg-red-950/20 border border-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer duration-200"
                              onClick={() => removeNote(note.id)}
                            >
                              {t("tablet.notes.remove")}
                            </button>
                          </div>
                          <div className="text-xs text-zinc-300 whitespace-pre-wrap break-words prose prose-invert max-w-none prose-p:my-1 prose-li:my-0 leading-relaxed font-medium bg-black/10 p-2.5 rounded border border-zinc-900">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.text}</ReactMarkdown>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Note Section */}
                  <div className="space-y-3 pt-3 border-t border-zinc-800/40">
                    <p className="text-[10px] text-[var(--mdt-text-muted)] font-medium">Markdown supported (headings, lists, **bold**, links, checklists).</p>
                    
                    <textarea
                      value={newNoteText}
                      onChange={(event) => setNewNoteText(event.target.value)}
                      rows={3}
                      className="w-full p-3 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)] focus:border-transparent transition-all"
                      placeholder={t("tablet.notes.placeholder")}
                    />

                    {newNoteText.trim() !== "" && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.02] p-3 animate-mdt-scale-in glass-panel">
                        <p className="text-[9px] uppercase tracking-widest text-amber-500 font-bold mb-1.5">Note Preview</p>
                        <div className="text-xs text-zinc-200 prose prose-invert max-w-none prose-p:my-1 prose-li:my-0 leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{newNoteText}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap bg-black/10 p-2.5 rounded-lg border border-zinc-800/40">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-[var(--mdt-text-muted)] uppercase tracking-wider font-semibold">Expiry:</label>
                        <select
                          value={newNoteExpiryMode}
                          onChange={(event) => setNewNoteExpiryMode(event.target.value as ExpiryMode)}
                          className="p-1.5 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)]"
                        >
                          <option value="none">{t("tablet.notes.expiry.none")}</option>
                          <option value="relative">Duration</option>
                          <option value="custom">Date & time</option>
                        </select>
                      </div>

                      {newNoteExpiryMode === "relative" && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={newNoteExpiryAmount}
                            onChange={(event) => setNewNoteExpiryAmount(event.target.value)}
                            className="w-16 p-1.5 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-xs text-white focus:outline-none focus:ring-1"
                          />
                          <select
                            value={newNoteExpiryUnit}
                            onChange={(event) => setNewNoteExpiryUnit(event.target.value as ExpiryUnit)}
                            className="p-1.5 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-xs text-white focus:outline-none"
                          >
                            <option value="minutes">Minutes</option>
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                          </select>
                        </div>
                      )}

                      {newNoteExpiryMode === "custom" && (
                        <input
                          type="datetime-local"
                          value={newNoteCustomAt}
                          onChange={(event) => setNewNoteCustomAt(event.target.value)}
                          className="p-1.5 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-xs text-white focus:outline-none focus:ring-1"
                        />
                      )}
                      
                      <Button onClick={addNote} disabled={newNoteText.trim() === ""} className="ml-auto text-xs px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-semibold text-white transition-all duration-200 active:scale-95 shadow-[0_0_8px_rgba(16,185,129,0.12)]">
                        {t("tablet.notes.add")}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Related Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-[var(--mdt-border)] bg-white/[0.01] hover:bg-white/[0.02] hover:border-zinc-800 transition-all duration-300 p-4 space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--mdt-text-muted)] font-bold border-b border-zinc-900 pb-1.5">{t("tablet.incidents.recent_list")}</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto premium-scroll pr-1">
                      {relatedIncidents.length === 0 ? (
                        <p className="text-xs text-zinc-650 italic text-center py-2">{t("tablet.notes.none")}</p>
                      ) : (
                        relatedIncidents.map((incident) => (
                          <div key={incident.id} className="text-xs rounded-lg bg-black/25 border border-zinc-900 p-2.5 hover:border-zinc-800 transition-colors">
                            <p className="text-white font-semibold">{incident.title}</p>
                            <p className="text-[10px] text-[var(--mdt-text-muted)] mt-1">{incident.location} • {incident.severity} • {incident.status}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--mdt-border)] bg-white/[0.01] hover:bg-white/[0.02] hover:border-zinc-800 transition-all duration-300 p-4 space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--mdt-text-muted)] font-bold border-b border-zinc-900 pb-1.5">{t("tablet.bolo.title")}</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto premium-scroll pr-1">
                      {relatedBolos.length === 0 ? (
                        <p className="text-xs text-zinc-650 italic text-center py-2">{t("tablet.notes.none")}</p>
                      ) : (
                        relatedBolos.map((bolo) => (
                          <div key={bolo.id} className="text-xs rounded-lg bg-black/25 border border-zinc-900 p-2.5 hover:border-zinc-800 transition-colors">
                            <p className="text-white font-semibold">{bolo.title}</p>
                            <p className="text-[10px] text-[var(--mdt-text-muted)] mt-1">{bolo.priority} • {bolo.status}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--mdt-border)] bg-white/[0.01] hover:bg-white/[0.02] hover:border-zinc-800 transition-all duration-300 p-4 space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--mdt-text-muted)] font-bold border-b border-zinc-900 pb-1.5">Dispatch Calls</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto premium-scroll pr-1">
                      {relatedDispatches.length === 0 ? (
                        <p className="text-xs text-zinc-650 italic text-center py-2">{t("tablet.notes.none")}</p>
                      ) : (
                        relatedDispatches.map((dispatchEntry) => (
                          <div key={dispatchEntry.id} className="text-xs rounded-lg bg-black/25 border border-zinc-900 p-2.5 hover:border-zinc-800 transition-colors">
                            <p className="text-white font-semibold">{dispatchEntry.title}</p>
                            <p className="text-[10px] text-[var(--mdt-text-muted)] mt-1">
                              {(dispatchEntry.location || "Unknown")} • {new Date(dispatchEntry.createdAt).toLocaleString()}
                            </p>
                            {Array.isArray(dispatchEntry.acceptedBy) && dispatchEntry.acceptedBy.length > 0 && (
                              <p className="text-[10px] text-[var(--mdt-text-muted)] mt-1">
                                Accepted: {dispatchEntry.acceptedBy.map((item) => item.name).join(", ")}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Details Fields */}
                <div className="p-4 rounded-xl border border-[var(--mdt-border)] bg-white/[0.01] hover:bg-white/[0.02] hover:border-zinc-800 transition-all duration-300 space-y-3">
                  <p className="text-xs uppercase tracking-widest text-[var(--mdt-text-muted)] font-bold border-b border-zinc-900 pb-1.5">Akte Attributes</p>
                  <div className="grid grid-cols-2 gap-3">
                    {resolvedFields
                      .filter((field) => field.type !== "textarea" && field.key !== imageFieldKey)
                      .map((field) => {
                        const label = field.label_key ? t(field.label_key) : field.key;
                        const editable = field.editable !== false;
                        const value = currentAkte[field.key] ?? field.default ?? "";

                        if (field.type === "select") {
                          return (
                            <div key={field.key} className="space-y-1">
                              <label className="block text-[10px] uppercase tracking-wider text-[var(--mdt-text-muted)] font-semibold">{label}</label>
                              <select
                                value={value}
                                disabled={!editable}
                                onChange={(event) => updateAkteField(field.key, event.target.value, editable)}
                                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)] disabled:opacity-60 transition-all"
                              >
                                {(field.options || []).map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label_key ? t(option.label_key) : option.label || option.value}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        return (
                          <div key={field.key} className="space-y-1">
                            <label className="block text-[10px] uppercase tracking-wider text-[var(--mdt-text-muted)] font-semibold">{label}</label>
                            <input
                              value={value}
                              disabled={!editable}
                              onChange={(event) => updateAkteField(field.key, event.target.value, editable)}
                              className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)] disabled:opacity-60 transition-all"
                            />
                          </div>
                        );
                      })}
                  </div>

                  {resolvedFields
                    .filter((field) => field.type === "textarea" && field.key !== notesFieldKey)
                    .map((field) => {
                      const label = field.label_key ? t(field.label_key) : field.key;
                      const editable = field.editable !== false;
                      const value = currentAkte[field.key] ?? field.default ?? "";

                      return (
                        <div key={field.key} className="space-y-1 pt-2">
                          <label className="block text-[10px] uppercase tracking-wider text-[var(--mdt-text-muted)] font-semibold">{label}</label>
                          <textarea
                            value={value}
                            disabled={!editable}
                            onChange={(event) => updateAkteField(field.key, event.target.value, editable)}
                            rows={4}
                            className="w-full p-3 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)] disabled:opacity-60 transition-all"
                          />
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4"
          onClick={() => {
            setFullscreenImage(null);
            setFullscreenZoom(1);
          }}
        >
          <div className="absolute top-4 left-4 flex items-center gap-2 z-[121]">
            <button
              type="button"
              className="px-3 py-2 rounded-md bg-black/50 text-white border border-white/20 text-sm"
              onClick={(event) => {
                event.stopPropagation();
                zoomOutFullscreen();
              }}
            >
              -
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-md bg-black/50 text-white border border-white/20 text-sm"
              onClick={(event) => {
                event.stopPropagation();
                zoomInFullscreen();
              }}
            >
              +
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-md bg-black/50 text-white border border-white/20 text-sm"
              onClick={(event) => {
                event.stopPropagation();
                resetFullscreenZoom();
              }}
            >
              100%
            </button>
          </div>
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-md bg-black/50 text-white border border-white/20"
            onClick={(event) => {
              event.stopPropagation();
              setFullscreenImage(null);
              setFullscreenZoom(1);
            }}
            aria-label={t("close_mdt")}
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="w-full h-full max-w-[96vw] max-h-[96vh] overflow-auto flex items-center justify-center"
            onWheel={(event) => {
              event.stopPropagation();
              if (event.deltaY < 0) {
                zoomInFullscreen();
              } else {
                zoomOutFullscreen();
              }
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullscreenImage}
              alt={selectedPerson.name || t("tablet.player.unknown_user")}
              className="max-w-none object-contain"
              style={{
                transform: `scale(${fullscreenZoom})`,
                transformOrigin: "center center",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
