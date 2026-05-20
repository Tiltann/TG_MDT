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

  const departmentTabs = useMemo<CompartmentOption[]>(() => {
    return allowedJobs.map((job: string) => ({
      value: job.toLowerCase(),
      label: job.toUpperCase(),
    }));
  }, [allowedJobs]);

  const hasAccessToJobTab = (targetJob: string) => {
    const allowed = meta?.mdt?.allowed_jobs || [];
    if (allowed.length === 0) return true;

    if (!viewerJob) return false;
    const normViewer = viewerJob.trim().toLowerCase();
    const normTarget = targetJob.trim().toLowerCase();

    if (normViewer === normTarget) return true;

    const jobModels = meta?.akteModels?.job_models || {};
    const targetConfig = jobModels[normTarget];
    if (targetConfig) {
      const jobs = Array.isArray(targetConfig.jobs) ? targetConfig.jobs.map((j: string) => j.trim().toLowerCase()) : [];
      const sharedWith = Array.isArray(targetConfig.shared_with) ? targetConfig.shared_with.map((s: string) => s.trim().toLowerCase()) : [];
      if (jobs.includes(normViewer) || sharedWith.includes(normViewer)) {
        return true;
      }
    }

    const viewerConfig = jobModels[normViewer];
    if (viewerConfig) {
      const viewerCompartment = (viewerConfig.compartment || normViewer).trim().toLowerCase();
      const targetCompartment = (targetConfig?.compartment || normTarget).trim().toLowerCase();
      if (viewerCompartment === targetCompartment) return true;
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
      (vehicles || []).map((vehicle) => ({
        ...vehicle,
        plate: (vehicle.plate || "UNKNOWN").toUpperCase(),
        model: vehicle.model == null || vehicle.model === "" ? "-" : String(vehicle.model),
      })),
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
      setSelectedCompartment(target);
      setShareTarget("");
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

      const serverAkte = await fetchNui<VehicleAkte>("getVehicleAkte", { plate });
      const localAkte: VehicleAkte = {
        ...defaultAkte,
        ...(aktenByVehicle[plate] || {}),
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
        [plate]: nextAkte,
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
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl card-title">{t("tablet.sidebar.vehicles")}</h3>
            <p className="card-sub mt-1">{t("tablet.vehicles.subtitle")}</p>
          </div>
          <div className="px-3 py-1 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] text-xs text-[var(--mdt-text-muted)]">
            {filteredVehicles.length} / {normalizedVehicles.length}
          </div>
        </div>

        <Card className="p-4 flex-1 overflow-auto">
          {filteredVehicles.length === 0 ? (
            <div className="h-full min-h-28 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]">
              {t("tablet.vehicles.no_match")}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredVehicles.map((vehicle) => (
                <button
                  key={vehicle.plate}
                  type="button"
                  onClick={() => setSelectedPlate(vehicle.plate)}
                  className="w-full p-3 text-left rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <p className="text-sm text-white font-medium">{vehicle.plate}</p>
                  <p className="text-xs text-[var(--mdt-text-muted)] mt-1">
                    {String(vehicle.model || "-")} - {vehicle.ownerName || t("tablet.vehicles.not_available")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setSelectedPlate(null)} className="inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {t("tablet.actions.back")}
        </Button>
        <Button onClick={saveAkte}>{t("tablet.form.save_akte")}</Button>
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        <Card className="col-span-5 p-4 space-y-3 overflow-auto">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--mdt-text-muted)]">{t("tablet.vehicles.detail_title")}</p>
            <h4 className="text-2xl text-white font-semibold mt-1">{selectedVehicle.plate}</h4>
          </div>

          {resolvedDataFields.map((field) => {
            const label = field.label_key ? t(field.label_key) : field.key;
            const rawValue = (selectedVehicle as Record<string, unknown>)[field.key];
            const value = String(rawValue ?? field.fallback ?? t("tablet.vehicles.not_available"));

            return (
              <div key={field.key} className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                <p className="text-xs text-[var(--mdt-text-muted)]">{label}</p>
                <p className="text-sm text-white mt-1">{value}</p>
              </div>
            );
          })}
        </Card>

        <Card className="col-span-7 p-4 overflow-auto space-y-3">
          <h4 className="card-title">{t("tablet.vehicles.akte.title")}</h4>

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] p-2">
            <div className="flex flex-wrap gap-2">
              {departmentTabs.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedCompartment(option.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    option.value === selectedCompartment
                      ? "border-[var(--mdt-accent-primary)] bg-[rgba(255,145,0,0.15)] text-[var(--mdt-accent-primary)]"
                      : "border-[var(--mdt-border)] bg-[rgba(255,255,255,0.03)] text-[var(--mdt-text-muted)] hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select
                value={shareTarget}
                onChange={(event) => setShareTarget(event.target.value)}
                className="min-w-[180px] rounded-md border border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)]"
              >
                <option value="">{t("tablet.actions.select_department") || "Select department..."}</option>
                {allowedJobs
                  .filter((job: string) => job.toLowerCase() !== selectedCompartment.toLowerCase())
                  .map((job: string) => (
                    <option key={job} value={job.toLowerCase()}>
                      {job.toUpperCase()}
                    </option>
                  ))}
              </select>
              <Button variant="ghost" onClick={shareCurrentAkte} disabled={shareTarget.trim() === ""}>
                Share with
              </Button>
            </div>
          </div>

          {!hasAccessToJobTab(selectedCompartment) ? (
            <div className="relative overflow-hidden rounded-md border border-[var(--mdt-border)] bg-black/40 backdrop-blur-xl p-8 py-16 flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
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
              <div className="space-y-2">
                <h5 className="text-lg font-semibold text-white tracking-wide">
                  Access Restricted
                </h5>
                <p className="text-xs text-[var(--mdt-text-muted)] max-w-sm">
                  Your department does not have the clearance level required to view or edit files in the <span className="text-[var(--mdt-accent-primary)] font-medium uppercase">{selectedCompartment}</span> database.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-xs mdt-muted">{t("tablet.vehicles.akte.image")}</label>
                  <Button onClick={captureVehicleImage} disabled={captureBusy}>
                    {captureBusy ? t("tablet.akte.capture_image_busy") : t("tablet.akte.capture_image")}
                  </Button>
                </div>

                {vehicleImages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={retakeCurrentImage} disabled={captureBusy}>
                      {t("tablet.akte.retake_image")}
                    </Button>
                    <Button variant="ghost" onClick={deleteCurrentImage} disabled={captureBusy}>
                      {t("tablet.akte.delete_image")}
                    </Button>
                  </div>
                )}

                {activeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeImage}
                    alt={selectedVehicle.plate}
                    onClick={() => setFullscreenImage(activeImage)}
                    className="w-full h-64 md:h-72 object-cover rounded-md border border-[var(--mdt-border)] cursor-zoom-in"
                  />
                ) : (
                  <div className="h-32 rounded-md border border-dashed border-[var(--mdt-border)] flex items-center justify-center text-xs text-[var(--mdt-text-muted)]">
                    {t("tablet.akte.image_hint")}
                  </div>
                )}

                {vehicleImages.length > 0 && (
                  <>
                    <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.akte.photos_count", { count: vehicleImages.length })}</p>
                    <div className="grid grid-cols-4 gap-2">
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
                          className={`rounded-md overflow-hidden border ${index === activeImageIndex ? "border-white" : "border-[var(--mdt-border)]"}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image} alt={`${selectedVehicle.plate}-${index + 1}`} className="w-full h-16 object-cover" />
                        </button>
                      ))}
                    </div>

                    {activeImageIsDataUrl ? (
                      <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.akte.url_hidden")}</p>
                    ) : (
                      <div>
                        <label className="block text-xs mdt-muted mb-1">{t("tablet.akte.image_url")}</label>
                        <input
                          value={activeImageIsHttpUrl ? activeImage : ""}
                          onChange={(event) => updateCurrentHttpImageUrl(event.target.value)}
                          className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white disabled:opacity-60"
                          placeholder="https://..."
                        />
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-xs mdt-muted mb-1">{t("tablet.akte.add_https_url")}</label>
                  <div className="flex items-center gap-2">
                    <input
                      value={manualImageUrl}
                      onChange={(event) => setManualImageUrl(event.target.value)}
                      className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
                      placeholder="https://..."
                    />
                    <Button onClick={addManualHttpImage}>{t("tablet.akte.add_url")}</Button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-xs mdt-muted">{t("tablet.vehicles.akte.notes")}</label>
                  {expiredNotesCount > 0 && (
                    <span className="text-xs text-[var(--mdt-text-muted)]">
                      {t("tablet.notes.expired_hidden", { count: expiredNotesCount })}
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-44 overflow-auto">
                  {activeNotes.length === 0 ? (
                    <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.notes.none")}</p>
                  ) : (
                    activeNotes.map((note) => (
                      <div key={note.id} className="rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs text-[var(--mdt-text-muted)]">
                            {note.author} - posted {formatRelativeTime(note.createdAt)}
                            {note.expiresAt ? ` | removing {formatRelativeTime(note.expiresAt)}` : ""}
                          </p>
                          <button
                            type="button"
                            className="text-xs text-red-300 hover:text-red-200"
                            onClick={() => removeNote(note.id)}
                          >
                            {t("tablet.notes.remove")}
                          </button>
                        </div>
                        <div className="text-sm text-white whitespace-pre-wrap break-words prose prose-invert max-w-none prose-p:my-1 prose-li:my-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.text}</ReactMarkdown>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-[var(--mdt-text-muted)]">Markdown supported (headings, lists, **bold**, links, checklists).</p>
                  <textarea
                    value={newNoteText}
                    onChange={(event) => setNewNoteText(event.target.value)}
                    rows={3}
                    className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
                    placeholder={t("tablet.notes.placeholder")}
                  />
                  {newNoteText.trim() !== "" && (
                    <div className="rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-2">
                      <p className="text-xs text-[var(--mdt-text-muted)] mb-1">Preview</p>
                      <div className="text-sm text-white prose prose-invert max-w-none prose-p:my-1 prose-li:my-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{newNoteText}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={newNoteExpiryMode}
                      onChange={(event) => setNewNoteExpiryMode(event.target.value as ExpiryMode)}
                      className="p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
                    >
                      <option value="none">{t("tablet.notes.expiry.none")}</option>
                      <option value="relative">Duration</option>
                      <option value="custom">Date & time</option>
                    </select>

                    {newNoteExpiryMode === "relative" && (
                      <>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={newNoteExpiryAmount}
                          onChange={(event) => setNewNoteExpiryAmount(event.target.value)}
                          className="w-24 p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
                        />
                        <select
                          value={newNoteExpiryUnit}
                          onChange={(event) => setNewNoteExpiryUnit(event.target.value as ExpiryUnit)}
                          className="p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </>
                    )}

                    {newNoteExpiryMode === "custom" && (
                      <input
                        type="datetime-local"
                        value={newNoteCustomAt}
                        onChange={(event) => setNewNoteCustomAt(event.target.value)}
                        className="p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
                      />
                    )}
                    <Button onClick={addNote}>{t("tablet.notes.add")}</Button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-xs mdt-muted">{t("tablet.vehicles.related")}</label>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-3 space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--mdt-text-muted)]">{t("tablet.incidents.recent_list")}</p>
                    {relatedIncidents.length === 0 ? (
                      <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.notes.none")}</p>
                    ) : (
                      relatedIncidents.map((incident) => (
                        <div key={incident.id} className="text-xs rounded-xl bg-white/5 p-2">
                          <p className="text-white font-medium">{incident.title}</p>
                          <p className="text-[var(--mdt-text-muted)]">{incident.location} • {incident.severity} • {incident.status}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="rounded-2xl border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-3 space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--mdt-text-muted)]">{t("tablet.bolo.title")}</p>
                    {relatedBolos.length === 0 ? (
                      <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.notes.none")}</p>
                    ) : (
                      relatedBolos.map((bolo) => (
                        <div key={bolo.id} className="text-xs rounded-xl bg-white/5 p-2">
                          <p className="text-white font-medium">{bolo.title}</p>
                          <p className="text-[var(--mdt-text-muted)]">{bolo.priority} • {bolo.status}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {resolvedFields
                  .filter((field) => field.type !== "textarea" && field.key !== imageFieldKey)
                  .map((field) => {
                    const label = field.label_key ? t(field.label_key) : field.key;
                    const editable = field.editable !== false;
                    const value = currentAkte[field.key] ?? field.default ?? "";

                    if (field.type === "select") {
                      return (
                        <div key={field.key}>
                          <label className="block text-xs mdt-muted mb-1">{label}</label>
                          <select
                            value={value}
                            disabled={!editable}
                            onChange={(event) => updateAkteField(field.key, event.target.value, editable)}
                            className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white disabled:opacity-60"
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
                      <div key={field.key}>
                        <label className="block text-xs mdt-muted mb-1">{label}</label>
                        <input
                          value={value}
                          disabled={!editable}
                          onChange={(event) => updateAkteField(field.key, event.target.value, editable)}
                          className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white disabled:opacity-60"
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
                    <div key={field.key}>
                      <label className="block text-xs mdt-muted mb-1">{label}</label>
                      <textarea
                        value={value}
                        disabled={!editable}
                        onChange={(event) => updateAkteField(field.key, event.target.value, editable)}
                        rows={6}
                        className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white disabled:opacity-60"
                      />
                    </div>
                  );
                })}
            </>
          )}
        </Card>
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
