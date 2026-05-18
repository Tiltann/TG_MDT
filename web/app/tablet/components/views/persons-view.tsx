"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
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
  akte?: Record<string, string>;
};

type AkteNote = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  expiresAt?: string;
};

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

function isNoteExpired(note: AkteNote): boolean {
  if (!note.expiresAt) return false;
  const expires = Date.parse(note.expiresAt);
  if (Number.isNaN(expires)) return false;
  return expires <= Date.now();
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
}: {
  t: TFunction;
  actorName?: string;
  persons: PersonRecord[];
  globalSearch: string;
  initialAkten: Record<string, PersonAkte>;
  akteSync?: AkteSyncPayload;
  akteFields?: AkteField[];
  dataFields?: DataField[];
}) {
  const resolvedFields = akteFields && akteFields.length > 0 ? akteFields : FALLBACK_FIELDS;
  const resolvedDataFields = dataFields && dataFields.length > 0 ? dataFields : FALLBACK_DATA_FIELDS;
  const defaultAkte = useMemo(() => defaultsFromFields(resolvedFields), [resolvedFields]);

  const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null);
  const [aktenByPerson, setAktenByPerson] = useState<Record<string, PersonAkte>>(initialAkten || {});
  const [captureBusy, setCaptureBusy] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteExpiryDays, setNewNoteExpiryDays] = useState("never");

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

  useEffect(() => {
    setAktenByPerson((prev) => ({ ...initialAkten, ...prev }));
  }, [initialAkten]);

  useEffect(() => {
    if (!akteSync || akteSync.kind !== "person" || !akteSync.identifier || !akteSync.akte) return;
    setAktenByPerson((prev) => ({
      ...prev,
      [akteSync.identifier as string]: {
        ...defaultAkte,
        ...(prev[akteSync.identifier as string] || {}),
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
    if (aktenByPerson[selectedPerson.identifier]) return;

    fetchNui<PersonAkte>("getPersonAkte", { identifier: selectedPerson.identifier })
      .then((akte) => {
        setAktenByPerson((prev) => ({
          ...prev,
          [selectedPerson.identifier]: {
            ...defaultAkte,
            ...(akte || {}),
          },
        }));
      })
      .catch(() => {
        // Keep defaults when callback fails.
      });
  }, [selectedPerson, aktenByPerson, defaultAkte]);

  const currentAkte: PersonAkte = selectedPerson
    ? aktenByPerson[selectedPerson.identifier] || {
        ...defaultAkte,
      }
    : defaultAkte;

  const personImages = decodeImages(currentAkte[imageFieldKey] ?? "");
  const allNotes = useMemo(
    () => parseAkteNotes(currentAkte[notesFieldKey] ?? "").sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [currentAkte, notesFieldKey]
  );
  const activeNotes = allNotes.filter((note) => !isNoteExpired(note));
  const expiredNotesCount = allNotes.length - activeNotes.length;
  const activeImage = personImages[activeImageIndex] || personImages[0] || "";
  const activeImageIsDataUrl = activeImage.startsWith("data:");
  const activeImageIsHttpUrl = /^https?:\/\//i.test(activeImage);

  const persistAkte = (identifier: string, nextAkte: PersonAkte) => {
    fetchNui<PersonAkte>("savePersonAkte", { identifier, akte: nextAkte })
      .then((saved) => {
        const savedImageCount = decodeImages(saved?.[imageFieldKey] ?? "").length;
        void fetchNui("debugUiLog", {
          tag: "persons-save",
          message: `identifier=${identifier} savedImages=${savedImageCount}`,
        });

        if (!saved) return;
        setAktenByPerson((prev) => ({
          ...prev,
          [identifier]: {
            ...defaultAkte,
            ...(prev[identifier] || {}),
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
        ...(prev[identifier] || {}),
        [field]: value,
      };

      return {
        ...prev,
        [identifier]: nextAkte,
      };
    });

    // Persist only the changed field so stale defaults cannot overwrite image data.
    persistAkte(identifier, { [field]: value });
  };

  const saveAkte = () => {
    if (!selectedPerson) return;
    persistAkte(selectedPerson.identifier, currentAkte);
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

      const serverAkte = await fetchNui<PersonAkte>("getPersonAkte", { identifier });
      const localAkte: PersonAkte = {
        ...defaultAkte,
        ...(aktenByPerson[identifier] || {}),
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
        [identifier]: nextAkte,
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

    const expiresAt =
      newNoteExpiryDays === "never"
        ? undefined
        : new Date(Date.now() + Number(newNoteExpiryDays) * 24 * 60 * 60 * 1000).toISOString();

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
    setNewNoteExpiryDays("never");
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
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl card-title">{t("tablet.sidebar.persons")}</h3>
            <p className="card-sub mt-1">{t("tablet.persons.subtitle")}</p>
          </div>

          <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-xs mdt-muted">{t("tablet.persons.akte.notes")}</label>
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
                        {note.author} - {new Date(note.createdAt).toLocaleString()}
                        {note.expiresAt
                          ? ` - ${t("tablet.notes.expires_at")} ${new Date(note.expiresAt).toLocaleString()}`
                          : ""}
                      </p>
                      <button
                        type="button"
                        className="text-xs text-red-300 hover:text-red-200"
                        onClick={() => removeNote(note.id)}
                      >
                        {t("tablet.notes.remove")}
                      </button>
                    </div>
                    <p className="text-sm text-white whitespace-pre-wrap break-words">{note.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <textarea
                value={newNoteText}
                onChange={(event) => setNewNoteText(event.target.value)}
                rows={3}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
                placeholder={t("tablet.notes.placeholder")}
              />
              <div className="flex items-center gap-2">
                <select
                  value={newNoteExpiryDays}
                  onChange={(event) => setNewNoteExpiryDays(event.target.value)}
                  className="p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
                >
                  <option value="never">{t("tablet.notes.expiry.none")}</option>
                  <option value="1">{t("tablet.notes.expiry.day_1")}</option>
                  <option value="7">{t("tablet.notes.expiry.day_7")}</option>
                  <option value="30">{t("tablet.notes.expiry.day_30")}</option>
                </select>
                <Button onClick={addNote}>{t("tablet.notes.add")}</Button>
              </div>
            </div>
          </div>
          <div className="px-3 py-1 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] text-xs text-[var(--mdt-text-muted)]">
            {filteredPersons.length} / {normalizedPersons.length}
          </div>
        </div>

        <Card className="p-4 flex-1 overflow-auto">
          {filteredPersons.length === 0 ? (
            <div className="h-full min-h-28 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]">
              {t("tablet.persons.no_match")}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPersons.map((person) => (
                <button
                  key={person.identifier}
                  type="button"
                  onClick={() => setSelectedIdentifier(person.identifier)}
                  className="w-full p-3 text-left rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <p className="text-sm text-white font-medium">{person.name}</p>
                  <p className="text-xs text-[var(--mdt-text-muted)] mt-1">
                    {person.job || t("tablet.persons.not_available")}
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
        <Button variant="ghost" onClick={() => setSelectedIdentifier(null)} className="inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {t("tablet.actions.back")}
        </Button>
        <Button onClick={saveAkte}>{t("tablet.form.save_akte")}</Button>
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        <Card className="col-span-5 p-4 space-y-3 overflow-auto">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--mdt-text-muted)]">{t("tablet.persons.detail_title")}</p>
            <h4 className="text-2xl text-white font-semibold mt-1">{selectedPerson.name}</h4>
          </div>

          {resolvedDataFields.map((field) => {
            const label = field.label_key ? t(field.label_key) : field.key;
            const rawValue = (selectedPerson as Record<string, unknown>)[field.key];
            const value = field.key === "gender"
              ? normalizeGender(rawValue as string | number | null | undefined)
              : String(rawValue ?? field.fallback ?? t("tablet.persons.not_available"));

            return (
              <div key={field.key} className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                <p className="text-xs text-[var(--mdt-text-muted)]">{label}</p>
                <p className="text-sm text-white mt-1">{value}</p>
              </div>
            );
          })}
        </Card>

        <Card className="col-span-7 p-4 overflow-auto space-y-3">
          <h4 className="card-title">{t("tablet.persons.akte.title")}</h4>

          <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-xs mdt-muted">{t("tablet.persons.akte.image")}</label>
              <Button onClick={capturePersonImage} disabled={captureBusy}>
                {captureBusy ? t("tablet.akte.capture_image_busy") : t("tablet.akte.capture_image")}
              </Button>
            </div>

            {personImages.length > 0 && (
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
                alt={selectedPerson.name || t("tablet.player.unknown_user")}
                onClick={() => setFullscreenImage(activeImage)}
                className="w-full h-64 md:h-72 object-cover rounded-md border border-[var(--mdt-border)] cursor-zoom-in"
              />
            ) : (
              <div className="h-32 rounded-md border border-dashed border-[var(--mdt-border)] flex items-center justify-center text-xs text-[var(--mdt-text-muted)]">
                {t("tablet.akte.image_hint")}
              </div>
            )}

            {personImages.length > 0 && (
              <>
                <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.akte.photos_count", { count: personImages.length })}</p>
                <div className="grid grid-cols-4 gap-2">
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
                      className={`rounded-md overflow-hidden border ${index === activeImageIndex ? "border-white" : "border-[var(--mdt-border)]"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt={`${selectedPerson.name || "person"}-${index + 1}`} className="w-full h-16 object-cover" />
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
