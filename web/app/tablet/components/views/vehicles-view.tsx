"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { fetchNui } from "../../../../lib/useNui";
import type { TFunction } from "../../lib/i18n";

type VehicleRecord = {
  plate: string;
  ownerIdentifier?: string | null;
  ownerName?: string | null;
  model?: string | number | null;
  state?: string | number | null;
  [key: string]: string | number | null | undefined;
};

type VehicleAkte = Record<string, string>;

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

type NearbyAgencyPlayer = {
  source: number;
  name: string;
  job?: string;
  distance?: number;
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
  { key: "vehicleImage", label_key: "tablet.vehicles.akte.image", type: "text", default: "", editable: true },
  { key: "color", label_key: "tablet.vehicles.akte.color", type: "text", default: "", editable: true },
  {
    key: "registrationStatus",
    label_key: "tablet.vehicles.akte.registration",
    type: "select",
    default: "valid",
    editable: true,
    options: [
      { value: "valid", label_key: "tablet.vehicles.akte.registration.valid" },
      { value: "expired", label_key: "tablet.vehicles.akte.registration.expired" },
      { value: "revoked", label_key: "tablet.vehicles.akte.registration.revoked" },
    ],
  },
  {
    key: "insuranceStatus",
    label_key: "tablet.vehicles.akte.insurance",
    type: "select",
    default: "active",
    editable: true,
    options: [
      { value: "active", label_key: "tablet.vehicles.akte.insurance.active" },
      { value: "expired", label_key: "tablet.vehicles.akte.insurance.expired" },
      { value: "none", label_key: "tablet.vehicles.akte.insurance.none" },
    ],
  },
  {
    key: "stolenStatus",
    label_key: "tablet.vehicles.akte.stolen",
    type: "select",
    default: "no",
    editable: true,
    options: [
      { value: "no", label_key: "tablet.vehicles.akte.stolen.no" },
      { value: "yes", label_key: "tablet.vehicles.akte.stolen.yes" },
      { value: "investigation", label_key: "tablet.vehicles.akte.stolen.investigation" },
    ],
  },
  { key: "notes", label_key: "tablet.vehicles.akte.notes", type: "textarea", default: "", editable: true },
];

const FALLBACK_DATA_FIELDS: DataField[] = [
  { key: "model", label_key: "tablet.vehicles.field.model", fallback: "-" },
  { key: "ownerName", label_key: "tablet.vehicles.field.owner", fallback: "-" },
  { key: "state", label_key: "tablet.vehicles.field.state", fallback: "-" },
];

const SELECTED_VEHICLE_STORAGE_KEY = "tg_mdt_selected_vehicle";

const defaultsFromFields = (fields: AkteField[]) => {
  const defaults: VehicleAkte = {};
  for (const field of fields) {
    defaults[field.key] = field.default || "";
  }
  return defaults;
};

function normalizeScopeName(value?: string): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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

export default function VehiclesView({
  t,
  actorName,
  vehicles,
  globalSearch,
  initialAkten,
  akteSync,
  akteFields,
  dataFields,
  incidents,
  bolos,
  akteScope,
  meta,
  viewerJob,
}: {
  t: TFunction;
  actorName?: string;
  vehicles: VehicleRecord[];
  globalSearch: string;
  initialAkten: Record<string, VehicleAkte>;
  akteSync?: AkteSyncPayload;
  akteFields?: AkteField[];
  dataFields?: DataField[];
  incidents?: RelatedIncident[];
  bolos?: RelatedBolo[];
  akteScope?: string;
  meta?: any;
  viewerJob?: string;
}) {
  const resolvedFields = akteFields && akteFields.length > 0 ? akteFields : FALLBACK_FIELDS;
  const resolvedDataFields = dataFields && dataFields.length > 0 ? dataFields : FALLBACK_DATA_FIELDS;
  const defaultAkte = useMemo(() => defaultsFromFields(resolvedFields), [resolvedFields]);
  const baseScope = (akteScope || "default").trim().toLowerCase() || "default";

  const akteKey = (plate: string, scope: string) => `${plate}::${scope.trim().toLowerCase() || "default"}`;

  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);
  const [aktenByVehicle, setAktenByVehicle] = useState<Record<string, VehicleAkte>>({});
  const [selectedCompartment, setSelectedCompartment] = useState(baseScope);
  const [shareTarget, setShareTarget] = useState("");
  const [sharedCompartments, setSharedCompartments] = useState<string[]>([]);
  const [removingCompartments, setRemovingCompartments] = useState<Record<string, boolean>>({});
  const [nearbyShareOpen, setNearbyShareOpen] = useState(false);
  const [nearbyAgencyPlayers, setNearbyAgencyPlayers] = useState<NearbyAgencyPlayer[]>([]);
  const [nearbyShareLoading, setNearbyShareLoading] = useState(false);
  const [nearbyShareBusy, setNearbyShareBusy] = useState(false);
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
    const candidates = ["vehicleImage", "image", "imageUrl", "photo", "photoUrl"];
    for (const key of candidates) {
      if (resolvedFields.some((field) => field.key === key)) return key;
    }
    return "vehicleImage";
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
    setAktenByVehicle((prev) => {
      const next = { ...prev };
      for (const [plate, akte] of Object.entries(initialAkten || {})) {
        const key = akteKey(plate, baseScope);
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
    if (!akteSync || akteSync.kind !== "vehicle" || !akteSync.plate || !akteSync.akte) return;
    const scope = (akteSync.compartment || baseScope).trim().toLowerCase() || baseScope;
    setAktenByVehicle((prev) => ({
      ...prev,
      [akteKey(akteSync.plate as string, scope)]: {
        ...defaultAkte,
        ...(prev[akteKey(akteSync.plate as string, scope)] || {}),
        ...(akteSync.akte || {}),
      },
    }));
  }, [akteSync, defaultAkte]);

  const normalizedVehicles = useMemo(
    () =>
      (vehicles || []).map((vehicle) => {
        const resolvedOwner =
          vehicle.ownerName ||
          (vehicle as Record<string, unknown>).owner ||
          (vehicle as Record<string, unknown>).halter ||
          vehicle.ownerIdentifier ||
          null;
        const resolvedModel =
          vehicle.model ||
          (vehicle as Record<string, unknown>).modelName ||
          (vehicle as Record<string, unknown>).vehicleModel ||
          (vehicle as Record<string, unknown>).displayName ||
          null;

        return {
          ...vehicle,
          plate: (vehicle.plate || "UNKNOWN").toUpperCase(),
          ownerName: resolvedOwner == null || resolvedOwner === "" ? null : String(resolvedOwner),
          model: resolvedModel == null || resolvedModel === "" ? "-" : String(resolvedModel),
        };
      }),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();
    if (!term) return normalizedVehicles;

    return normalizedVehicles.filter((vehicle) => {
      const haystack = [vehicle.plate, vehicle.ownerName, vehicle.model, vehicle.state]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [normalizedVehicles, globalSearch]);

  useEffect(() => {
    if (!selectedPlate) return;
    const exists = filteredVehicles.some((vehicle) => vehicle.plate === selectedPlate);
    if (!exists) {
      setSelectedPlate(null);
    }
  }, [filteredVehicles, selectedPlate]);

  const selectedVehicle = filteredVehicles.find((vehicle) => vehicle.plate === selectedPlate) || null;
  const currentAkteKey = selectedVehicle ? akteKey(selectedVehicle.plate, selectedCompartment) : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(SELECTED_VEHICLE_STORAGE_KEY);
    if (saved && saved.trim() !== "") {
      setSelectedPlate(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedPlate) {
      window.localStorage.removeItem(SELECTED_VEHICLE_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SELECTED_VEHICLE_STORAGE_KEY, selectedPlate);
  }, [selectedPlate]);

  useEffect(() => {
    if (!selectedVehicle) return;
    const scopeKey = currentAkteKey;
    if (aktenByVehicle[scopeKey]) return;

    fetchNui<VehicleAkte>("getVehicleAkte", { plate: selectedVehicle.plate, compartment: selectedCompartment })
      .then((akte) => {
        setAktenByVehicle((prev) => ({
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
  }, [selectedVehicle, selectedCompartment, currentAkteKey, aktenByVehicle, defaultAkte, baseScope]);

  const currentAkte: VehicleAkte = selectedVehicle
    ? aktenByVehicle[currentAkteKey] || {
        ...defaultAkte,
      }
    : defaultAkte;

  const vehicleImages = decodeImages(currentAkte[imageFieldKey] ?? "");
  const allNotes = useMemo(
    () => parseAkteNotes(currentAkte[notesFieldKey] ?? "").sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [currentAkte, notesFieldKey]
  );
  const activeNotes = allNotes.filter((note) => !isNoteExpired(note));
  const expiredNotesCount = allNotes.length - activeNotes.length;
  const relatedIncidents = (incidents || []).filter((incident) => incident.linkedVehicles.includes(selectedVehicle?.plate || ""));
  const relatedBolos = (bolos || []).filter((bolo) => bolo.linkedVehicles.includes(selectedVehicle?.plate || ""));
  const activeImage = vehicleImages[activeImageIndex] || vehicleImages[0] || "";
  const activeImageIsDataUrl = activeImage.startsWith("data:");
  const activeImageIsHttpUrl = /^https?:\/\//i.test(activeImage);
  const normalizedSelectedCompartment = normalizeScopeName(selectedCompartment);

  useEffect(() => {
    if (!selectedVehicle) {
      setSharedCompartments([]);
      return;
    }

    fetchNui<string[]>("getAkteCompartments", {
      kind: "vehicle",
      value: selectedVehicle.plate,
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
  }, [selectedVehicle?.plate, normalizedSelectedCompartment]);

  const persistAkte = (plate: string, nextAkte: VehicleAkte) => {
    fetchNui<VehicleAkte>("saveVehicleAkte", { plate, akte: nextAkte, compartment: selectedCompartment })
      .then((saved) => {
        const savedImageCount = decodeImages(saved?.[imageFieldKey] ?? "").length;
        void fetchNui("debugUiLog", {
          tag: "vehicles-save",
          message: `plate=${plate} scope=${selectedCompartment} savedImages=${savedImageCount}`,
        });

        if (!saved) return;
        setAktenByVehicle((prev) => ({
          ...prev,
          [akteKey(plate, selectedCompartment)]: {
            ...defaultAkte,
            ...(prev[akteKey(plate, selectedCompartment)] || {}),
            ...(saved || {}),
          },
        }));
      })
      .catch(() => {
        // Ignore save errors for now; local view state remains.
      });
  };

  const updateAkteField = (field: string, value: string, editable = true) => {
    if (!selectedVehicle) return;
    if (!editable) return;

    const plate = selectedVehicle.plate;

    setAktenByVehicle((prev) => {
      const nextAkte: VehicleAkte = {
        ...defaultAkte,
        ...(prev[akteKey(plate, selectedCompartment)] || {}),
        [field]: value,
      };

      return {
        ...prev,
        [akteKey(plate, selectedCompartment)]: nextAkte,
      };
    });

    persistAkte(plate, { [field]: value });
  };

  const saveAkte = () => {
    if (!selectedVehicle) return;
    persistAkte(selectedVehicle.plate, currentAkte);
  };

  const shareCurrentAkte = () => {
    if (!selectedVehicle) return;
    const target = shareTarget.trim().toLowerCase();
    if (target === "" || target === selectedCompartment) return;

    fetchNui<VehicleAkte>("saveVehicleAkte", {
      plate: selectedVehicle.plate,
      akte: currentAkte,
      compartment: target,
    }).then((saved) => {
      if (!saved) return;
      setAktenByVehicle((prev) => ({
        ...prev,
        [akteKey(selectedVehicle.plate, target)]: {
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
    if (!selectedVehicle) return;
    const normalizedScope = normalizeScopeName(scope);
    if (normalizedScope === "" || configProtectedCompartments.has(normalizedScope)) return;

    setRemovingCompartments((prev) => ({ ...prev, [normalizedScope]: true }));

    fetchNui<{ ok?: boolean }>("removeAkteCompartment", {
      kind: "vehicle",
      value: selectedVehicle.plate,
      compartment: normalizedScope,
    })
      .then((result) => {
        if (!result?.ok) return;

        setSharedCompartments((prev) => prev.filter((entry) => normalizeScopeName(entry) !== normalizedScope));
        setAktenByVehicle((prev) => {
          const next = { ...prev };
          delete next[akteKey(selectedVehicle.plate, normalizedScope)];
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

  const openNearbySharePicker = () => {
    if (!selectedVehicle || nearbyShareLoading) return;
    setNearbyShareLoading(true);
    fetchNui<NearbyAgencyPlayer[]>("getNearbyAgencyPlayers", {
      compartment: selectedCompartment,
      maxDistance: 20,
    })
      .then((result) => {
        const next = Array.isArray(result)
          ? result
              .filter((entry) => Number.isFinite(entry?.source) && entry.source > 0)
              .map((entry) => ({
                source: entry.source,
                name: String(entry.name || `Player ${entry.source}`),
                job: entry.job ? String(entry.job) : "",
                distance: typeof entry.distance === "number" ? entry.distance : undefined,
              }))
          : [];
        setNearbyAgencyPlayers(next);
        setNearbyShareOpen(true);
      })
      .catch(() => {
        setNearbyAgencyPlayers([]);
        setNearbyShareOpen(true);
      })
      .finally(() => {
        setNearbyShareLoading(false);
      });
  };

  const shareAkteWithNearbyPlayer = (targetSource: number) => {
    if (!selectedVehicle || nearbyShareBusy) return;
    setNearbyShareBusy(true);

    fetchNui<{ ok?: boolean }>("shareAkteWithPlayer", {
      kind: "vehicle",
      value: selectedVehicle.plate,
      targetSource,
      compartment: selectedCompartment,
    })
      .then((result) => {
        if (!result?.ok) return;
        setNearbyShareOpen(false);
      })
      .finally(() => {
        setNearbyShareBusy(false);
      });
  };

  useEffect(() => {
    setActiveImageIndex(0);
    setManualImageUrl("");
  }, [selectedPlate]);


  useEffect(() => {
    if (activeImageIndex < vehicleImages.length) return;
    setActiveImageIndex(0);
  }, [activeImageIndex, vehicleImages.length]);

  const captureVehicleImage = async () => {
    if (!selectedVehicle || captureBusy) return;

    const plate = selectedVehicle.plate;

    setCaptureBusy(true);
    try {
      const result = await fetchNui<{ ok?: boolean; images?: string[] }>("openAktePhotoMode", {
        kind: "vehicle",
        plate,
        screen: "vehicles",
      });

      const incomingCount = Array.isArray(result?.images) ? result.images.length : 0;
      const firstPrefix =
        incomingCount > 0 && typeof result?.images?.[0] === "string"
          ? String(result.images[0]).slice(0, 24)
          : "none";
      void fetchNui("debugUiLog", {
        tag: "vehicles-capture",
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
        tag: "vehicles-image-opt",
        message: `plate=${plate} rawMax=${rawLongest} optimizedMax=${optimizedLongest} limit=${MAX_IMAGE_DATA_URL_LENGTH}`,
      });

      const scopeKey = akteKey(plate, selectedCompartment);
      const serverAkte = await fetchNui<VehicleAkte>("getVehicleAkte", { plate, compartment: selectedCompartment });
      const localAkte: VehicleAkte = {
        ...defaultAkte,
        ...(aktenByVehicle[scopeKey] || {}),
      };
      const serverImages = decodeImages(serverAkte?.[imageFieldKey] ?? "");
      const localImages = decodeImages(localAkte[imageFieldKey] ?? "");
      const baseImages = serverImages.length >= localImages.length ? serverImages : localImages;
      const merged = [...baseImages, ...newImages];
      if (merged.length === 0) return;

      void fetchNui("debugUiLog", {
        tag: "vehicles-merge",
        message: `plate=${plate} server=${serverImages.length} local=${localImages.length} new=${newImages.length} merged=${merged.length}`,
      });

      const nextAkte: VehicleAkte = {
        ...defaultAkte,
        ...(serverAkte || {}),
        ...localAkte,
        [imageFieldKey]: encodeImages(merged),
      };

      setAktenByVehicle((prev) => ({
        ...prev,
        [scopeKey]: nextAkte,
      }));
      persistAkte(plate, nextAkte);
      setActiveImageIndex(Math.max(0, merged.length - 1));
    } finally {
      setCaptureBusy(false);
    }
  };

  const deleteCurrentImage = () => {
    if (!selectedVehicle || vehicleImages.length === 0) return;

    const nextImages = vehicleImages.filter((_, index) => index !== activeImageIndex);
    updateAkteField(imageFieldKey, encodeImages(nextImages), true);

    if (nextImages.length === 0) {
      setActiveImageIndex(0);
      return;
    }

    setActiveImageIndex(Math.max(0, Math.min(activeImageIndex, nextImages.length - 1)));
  };

  const retakeCurrentImage = async () => {
    if (!selectedVehicle || captureBusy || vehicleImages.length === 0) return;

    setCaptureBusy(true);
    try {
      const result = await fetchNui<{ ok?: boolean; images?: string[] }>("openAktePhotoMode", {
        kind: "vehicle",
        plate: selectedVehicle.plate,
        screen: "vehicles",
      });

      if (!result?.ok || !Array.isArray(result.images) || result.images.length === 0) {
        return;
      }

      const rawNextImage = result.images[result.images.length - 1];
      const nextImage = rawNextImage ? await optimizeAkteImageUrl(rawNextImage) : "";
      if (!nextImage || nextImage.trim() === "") {
        return;
      }

      const nextImages = [...vehicleImages];
      nextImages[activeImageIndex] = nextImage;
      updateAkteField(imageFieldKey, encodeImages(nextImages), true);
    } finally {
      setCaptureBusy(false);
    }
  };

  const updateCurrentHttpImageUrl = (nextUrl: string) => {
    if (!selectedVehicle || vehicleImages.length === 0) return;
    if (nextUrl.trim() !== "" && !/^https?:\/\//i.test(nextUrl.trim())) return;

    const nextImages = [...vehicleImages];
    nextImages[activeImageIndex] = nextUrl.trim();
    updateAkteField(imageFieldKey, encodeImages(nextImages), true);
  };

  const addManualHttpImage = () => {
    const nextUrl = manualImageUrl.trim();
    if (nextUrl === "") return;
    if (!/^https?:\/\//i.test(nextUrl)) return;

    const merged = [...vehicleImages, nextUrl];
    updateAkteField(imageFieldKey, encodeImages(merged), true);
    setActiveImageIndex(merged.length - 1);
    setManualImageUrl("");
  };

  const addNote = () => {
    if (!selectedVehicle) return;
    const text = newNoteText.trim();
    if (text === "") return;

    const expiresAt = getExpiryFromInput(newNoteExpiryMode, newNoteExpiryAmount, newNoteExpiryUnit, newNoteCustomAt);
    if (expiresAt) {
      const expiresAtMs = Date.parse(expiresAt);
      if (!Number.isNaN(expiresAtMs) && expiresAtMs <= Date.now()) {
        return;
      }
    }

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

  if (!selectedVehicle) {
    return (
      <div key="list" className="h-full flex flex-col gap-4 animate-mdt-view">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl card-title  uppercase tracking-wider">{t("tablet.sidebar.vehicles")}</h3>
            <p className="card-sub mt-1  text-[11px]">{t("tablet.vehicles.subtitle")}</p>
          </div>
          <div className="px-3 py-1 rounded border border-zinc-800 bg-black/30 text-xs text-zinc-400  font-bold tracking-wider">
            {filteredVehicles.length} / {normalizedVehicles.length} {t("tablet.common.recorded")}
          </div>
        </div>

        <Card className="p-4 flex-1 overflow-y-auto premium-scroll glass-panel animate-mdt-scale-in">
          {filteredVehicles.length === 0 ? (
            <div className="h-full min-h-28 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]  italic">
              {t("tablet.vehicles.no_match")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {filteredVehicles.map((vehicle, index) => {
                const vehicleAkte = aktenByVehicle[akteKey(vehicle.plate, baseScope)] || defaultAkte;
                const isStolen = vehicleAkte?.stolenStatus === "yes";
                const isWanted = vehicleAkte?.stolenStatus === "investigation";
                const serialCode = `V-${vehicle.plate.slice(0, 6).toUpperCase()}`;

                return (
                  <button
                    key={vehicle.plate}
                    type="button"
                    onClick={() => setSelectedPlate(vehicle.plate)}
                    className="w-full flex flex-col items-stretch text-left hover-card-grow animate-mdt-fade-in-up duration-300 relative group active:scale-[0.98] transition-all cursor-pointer"
                    style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
                  >
                    {/* Top folder binder tab */}
                    <div className="flex">
                      <div className="bg-zinc-950/80 group-hover:bg-zinc-900 border-t border-x border-zinc-800/80 rounded-t-lg px-3 py-1 text-[9px]  font-black tracking-wider text-zinc-500 group-hover:text-[var(--mdt-accent-primary)] transition-colors">
                        {serialCode}
                      </div>
                      <div className="flex-1 border-b border-zinc-800/80" />
                    </div>
                    
                    {/* Main folder sheet */}
                    <div className="relative p-4 rounded-b-xl rounded-tr-xl border border-zinc-800/80 bg-zinc-950/20 group-hover:bg-zinc-900/10 group-hover:border-zinc-700/60 shadow-lg shadow-black/35 flex flex-col justify-between h-28 overflow-hidden">
                      {/* Folder Spine Visual */}
                      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-r from-zinc-800 to-transparent opacity-80" />
                      <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-amber-600/30 group-hover:bg-[var(--mdt-accent-primary)] transition-colors" />

                      <div className="flex items-start justify-between gap-3 w-full pl-1">
                        <p className="text-sm text-white font-bold tracking-wide truncate group-hover:text-[var(--mdt-accent-primary)] transition-colors  uppercase">{vehicle.plate}</p>
                        <div className="flex items-center gap-1">
                          {isStolen && (
                            <span className="rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[8px] font-bold text-red-400 tracking-widest  animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.1)]">
                              {t("tablet.vehicles.status.stolen")}
                            </span>
                          )}
                          {isWanted && (
                            <span className="rounded border border-orange-500/40 bg-orange-500/10 px-1.5 py-0.5 text-[8px] font-bold text-orange-400 tracking-widest  animate-pulse">
                              {t("tablet.vehicles.status.bolo")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto pl-1 ">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span>{t("tablet.vehicles.field.model_short")}</span>
                          <span className="text-zinc-300 font-semibold truncate max-w-[125px]">{vehicle.model !== "-" ? vehicle.model : t("tablet.vehicles.not_available")}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                          <span>{t("tablet.vehicles.field.owner_short")}</span>
                          <span className="text-zinc-400 truncate max-w-[125px]">{vehicle.ownerName || t("tablet.vehicles.not_available")}</span>
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
    <div key={selectedPlate || "details"} className="h-full flex flex-col gap-4 animate-mdt-view relative">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
        <Button variant="ghost" onClick={() => setSelectedPlate(null)} className="inline-flex items-center gap-2 self-start transition-all duration-200 active:scale-95 border border-zinc-800/80 hover:bg-zinc-800/50">
          <ArrowLeft className="w-4 h-4" />
          {t("tablet.actions.back")}
        </Button>
        <div className="flex items-center gap-2 self-end">
          <Button onClick={saveAkte} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all duration-200 active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            {t("tablet.form.save_akte")}
          </Button>
        </div>
      </div>

      {/* Main Dossier Folder Binder Body */}
      <div className="relative grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-0 border-l-[6px] border-zinc-900 bg-zinc-950/25 rounded-2xl p-5 shadow-[inset_12px_0_24px_-10px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Metal Binder Spine rings on the left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-950 border-r border-zinc-800 z-20 rounded-l-md" />
        
        {currentAkte.stolenStatus === "yes" && (
          <div className="absolute top-16 right-8 select-none border-2 border-dashed border-red-500/30 text-red-500/60 px-4 py-1.5 rounded text-[10px]  font-black tracking-widest uppercase rotate-[2deg] mix-blend-screen shadow-[0_0_8px_rgba(239,68,68,0.05)] pointer-events-none z-10 animate-pulse">
            {t("tablet.vehicles.reported_stolen")}
          </div>
        )}

        {/* Left Column: Vehicle details (resembling a clamped paper record) */}
        <div className="xl:col-span-5 col-span-12 relative flex flex-col bg-zinc-950/50 rounded-2xl border border-zinc-900 shadow-xl overflow-hidden animate-mdt-scale-in max-h-[calc(100vh-260px)]">
          {/* Metal paper clip on top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4.5 bg-gradient-to-b from-zinc-300 to-zinc-200 border-x border-b border-zinc-500 rounded-b-lg shadow-md z-10 flex items-center justify-center">
            <span className="text-[7px] font-semibold tracking-wide text-zinc-200">{t("tablet.common.information", undefined, "Information")}</span>
          </div>

          <div className="p-6 pt-8 space-y-5 overflow-y-auto premium-scroll flex-1">
            <div>
              <p className="text-[9px]  tracking-[0.25em] text-[var(--mdt-text-muted)] font-black uppercase">{t("tablet.vehicles.dossier_header")}</p>
              <h4 className="text-2xl text-white  font-black mt-1.5 tracking-wide uppercase">{selectedVehicle.plate}</h4>
              
              <div className="flex flex-wrap gap-1.5 mt-2">
                {currentAkte.stolenStatus === "yes" && (
                  <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[8px] font-bold text-red-400 tracking-wider ">
                    {t("tablet.vehicles.status.stolen")}
                  </span>
                )}
                {currentAkte.stolenStatus === "investigation" && (
                  <span className="rounded border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[8px] font-bold text-orange-400 tracking-wider ">
                    {t("tablet.vehicles.status.bolo")}
                  </span>
                )}
                {currentAkte.registrationStatus === "revoked" && (
                  <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[8px] font-bold text-red-400 tracking-wider ">
                    {t("tablet.vehicles.status.reg_revoked")}
                  </span>
                )}
                {currentAkte.registrationStatus === "expired" && (
                  <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[8px] font-bold text-amber-400 tracking-wider ">
                    {t("tablet.vehicles.status.reg_expired")}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3 ">
              {resolvedDataFields.map((field) => {
                const label = field.label_key ? t(field.label_key) : field.key;
                const rawValue =
                  (selectedVehicle as Record<string, unknown>)[field.key] ??
                  (field.key === "ownerName" ? (selectedVehicle as Record<string, unknown>).owner : undefined) ??
                  (field.key === "ownerName" ? (selectedVehicle as Record<string, unknown>).halter : undefined) ??
                  (field.key === "model" ? (selectedVehicle as Record<string, unknown>).modelName : undefined);
                const value = String(rawValue ?? field.fallback ?? t("tablet.vehicles.not_available"));

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

        {/* Right Column: Akte Management */}
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
                {t("tablet.vehicles.akte.title")}
              </h4>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500  uppercase tracking-widest">{t("tablet.akte.scope")}: {selectedCompartment}</span>
              </div>
            </div>

            {/* Sharing Interface */}
            <div className="p-3.5 rounded-xl border border-zinc-900 bg-black/25 space-y-3 ">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">{t("tablet.akte.sharing_controls")}</p>
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
                  <Button
                    variant="ghost"
                    onClick={openNearbySharePicker}
                    disabled={!selectedVehicle || nearbyShareLoading}
                    className="px-3 py-1.5 text-xs transition-all active:scale-95 hover:bg-zinc-800/40"
                  >
                    {nearbyShareLoading
                      ? t("tablet.actions.loading")
                      : t("tablet.actions.share_with_nearby")}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-900 bg-black/10 p-2.5">
                <p className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">{t("tablet.akte.active_secure_shares")}</p>
                {sharedCompartments.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 italic">{t("tablet.akte.no_external_shares")}</p>
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
                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-zinc-805 text-zinc-500 font-bold">{t("tablet.akte.system_share")}</span>
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

            {nearbyShareOpen && (
              <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
                <button
                  type="button"
                  className="absolute inset-0 bg-black/70"
                  onClick={() => setNearbyShareOpen(false)}
                  aria-label="Close nearby share dialog"
                />
                <div className="relative w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h5 className="text-sm font-bold uppercase tracking-wide text-zinc-200">
                      {t("tablet.actions.share_with_nearby")}
                    </h5>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                      onClick={() => setNearbyShareOpen(false)}
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {nearbyAgencyPlayers.length === 0 ? (
                    <p className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 text-xs text-zinc-400">
                      {t("tablet.akte.no_nearby_agency_members") || "No nearby agency members found."}
                    </p>
                  ) : (
                    <div className="max-h-[320px] space-y-2 overflow-y-auto premium-scroll">
                      {nearbyAgencyPlayers.map((entry) => (
                        <div
                          key={entry.source}
                          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black/25 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-100">{entry.name}</p>
                            <p className="truncate text-[11px] uppercase tracking-wide text-zinc-500">
                              {entry.job || "-"}
                              {typeof entry.distance === "number" ? ` • ${entry.distance.toFixed(1)}m` : ""}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            onClick={() => shareAkteWithNearbyPlayer(entry.source)}
                            disabled={nearbyShareBusy}
                            className="px-3 py-1.5 text-xs"
                          >
                            {t("tablet.actions.share") || "Share"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                          className="w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] animate-pulse"
                        />
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--mdt-accent-primary)] border border-black flex items-center justify-center shadow-md">
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
                      <div className="w-16 h-16 rounded-full bg-[rgba(255,145,0,0.1)] border border-[rgba(255,145,0,0.3)] flex items-center justify-center shadow-lg shadow-[rgba(255,145,0,0.05)]">
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
                      <label className="text-xs uppercase tracking-widest text-[var(--mdt-text-muted)] font-bold">{t("tablet.vehicles.akte.image")}</label>
                      <Button onClick={captureVehicleImage} disabled={captureBusy} className="px-3.5 py-1.5 text-xs bg-[var(--mdt-accent-primary)] text-black font-semibold transition-all duration-200 active:scale-95 shadow-[0_0_8px_rgba(255,145,0,0.1)]">
                        {captureBusy ? t("tablet.akte.capture_image_busy") : t("tablet.akte.capture_image")}
                      </Button>
                    </div>

                    {activeImage ? (
                      <div className="relative group overflow-hidden rounded-lg border border-[var(--mdt-border)] bg-black/40 h-64 md:h-72">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeImage}
                          alt={selectedVehicle.plate}
                          onClick={() => setFullscreenImage(activeImage)}
                          className="w-full h-full object-cover cursor-zoom-in group-hover:scale-102 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                          <span className="text-[10px] text-white/90 bg-black/60 px-2.5 py-1 rounded-full font-medium backdrop-blur-md border border-white/10">
                            {t("tablet.akte.photos_count", { count: vehicleImages.length })} • Active #{activeImageIndex + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={retakeCurrentImage}
                              disabled={captureBusy}
                              className="p-1.5 rounded bg-black/70 hover:bg-black/90 text-white/80 hover:text-white text-[10px] font-semibold border border-white/5 backdrop-blur-sm transition-colors"
                            >
                                {t("tablet.akte.retake_image")}
                            </button>
                            <button
                              type="button"
                              onClick={deleteCurrentImage}
                              disabled={captureBusy}
                              className="p-1.5 rounded bg-red-950/70 hover:bg-red-900/90 text-red-300 hover:text-red-200 text-[10px] font-semibold border border-red-500/20 backdrop-blur-sm transition-colors"
                            >
                                {t("tablet.akte.delete_image")}
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

                    {vehicleImages.length > 1 && (
                      <div className="grid grid-cols-6 gap-2">
                        {vehicleImages.map((image, index) => (
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
                            <img src={image} alt={`${selectedVehicle.plate}-${index + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {vehicleImages.length > 0 && !activeImageIsDataUrl && (
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
                      <label className="text-xs uppercase tracking-widest text-[var(--mdt-text-muted)] font-bold">{t("tablet.vehicles.akte.notes")}</label>
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
                                  {t("tablet.notes.posted_relative", { time: formatRelativeTime(note.createdAt) })}
                                  {note.expiresAt ? ` • ${t("tablet.notes.expires_relative", { time: formatRelativeTime(note.expiresAt) })}` : ""}
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
                      <p className="text-[10px] text-[var(--mdt-text-muted)] font-medium">{t("tablet.notes.markdown_supported")}</p>
                      
                      <textarea
                        value={newNoteText}
                        onChange={(event) => setNewNoteText(event.target.value)}
                        rows={3}
                        className="w-full p-3 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)] focus:border-transparent transition-all"
                        placeholder={t("tablet.notes.placeholder")}
                      />

                      {newNoteText.trim() !== "" && (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.02] p-3 animate-mdt-scale-in glass-panel">
                          <p className="text-[9px] uppercase tracking-widest text-amber-500 font-bold mb-1.5">{t("tablet.notes.preview")}</p>
                          <div className="text-xs text-zinc-200 prose prose-invert max-w-none prose-p:my-1 prose-li:my-0 leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{newNoteText}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap bg-black/10 p-2.5 rounded-lg border border-zinc-800/40">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-[var(--mdt-text-muted)] uppercase tracking-wider font-semibold">{t("tablet.notes.expiry_label")}:</label>
                          <select
                            value={newNoteExpiryMode}
                            onChange={(event) => setNewNoteExpiryMode(event.target.value as ExpiryMode)}
                            className="p-1.5 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)]"
                          >
                            <option value="none">{t("tablet.notes.expiry.none")}</option>
                            <option value="relative">{t("tablet.notes.expiry.relative")}</option>
                            <option value="custom">{t("tablet.notes.expiry.custom")}</option>
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
                              <option value="minutes">{t("tablet.notes.expiry.minutes")}</option>
                              <option value="hours">{t("tablet.notes.expiry.hours")}</option>
                              <option value="days">{t("tablet.notes.expiry.days")}</option>
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
                  <div className="grid gap-4 md:grid-cols-2">
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
                  </div>

                  {/* Additional Details Fields */}
                  <div className="p-4 rounded-xl border border-[var(--mdt-border)] bg-white/[0.01] hover:bg-white/[0.02] hover:border-zinc-800 transition-all duration-300 space-y-3">
                    <p className="text-xs uppercase tracking-widest text-[var(--mdt-text-muted)] font-bold border-b border-zinc-900 pb-1.5">{t("tablet.akte.attributes")}</p>
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
              alt={selectedVehicle.plate}
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
