"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { fetchNui } from "../../../lib/useNui";
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
  akte?: Record<string, string>;
};

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

export default function VehiclesView({
  t,
  vehicles,
  globalSearch,
  initialAkten,
  akteSync,
  akteFields,
  dataFields,
}: {
  t: TFunction;
  vehicles: VehicleRecord[];
  globalSearch: string;
  initialAkten: Record<string, VehicleAkte>;
  akteSync?: AkteSyncPayload;
  akteFields?: AkteField[];
  dataFields?: DataField[];
}) {
  const resolvedFields = akteFields && akteFields.length > 0 ? akteFields : FALLBACK_FIELDS;
  const resolvedDataFields = dataFields && dataFields.length > 0 ? dataFields : FALLBACK_DATA_FIELDS;
  const defaultAkte = useMemo(() => defaultsFromFields(resolvedFields), [resolvedFields]);

  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);
  const [aktenByVehicle, setAktenByVehicle] = useState<Record<string, VehicleAkte>>(initialAkten || {});
  const [captureBusy, setCaptureBusy] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const imageFieldKey = useMemo(() => {
    const candidates = ["vehicleImage", "image", "imageUrl", "photo", "photoUrl"];
    for (const key of candidates) {
      if (resolvedFields.some((field) => field.key === key)) return key;
    }
    return "vehicleImage";
  }, [resolvedFields]);

  useEffect(() => {
    setAktenByVehicle((prev) => ({ ...initialAkten, ...prev }));
  }, [initialAkten]);

  useEffect(() => {
    if (!akteSync || akteSync.kind !== "vehicle" || !akteSync.plate || !akteSync.akte) return;
    setAktenByVehicle((prev) => ({
      ...prev,
      [akteSync.plate as string]: {
        ...defaultAkte,
        ...(prev[akteSync.plate as string] || {}),
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
    if (aktenByVehicle[selectedVehicle.plate]) return;

    fetchNui<VehicleAkte>("getVehicleAkte", { plate: selectedVehicle.plate })
      .then((akte) => {
        setAktenByVehicle((prev) => ({
          ...prev,
          [selectedVehicle.plate]: {
            ...defaultAkte,
            ...(akte || {}),
          },
        }));
      })
      .catch(() => {
        // Keep defaults when callback fails.
      });
  }, [selectedVehicle, aktenByVehicle, defaultAkte]);

  const currentAkte: VehicleAkte = selectedVehicle
    ? aktenByVehicle[selectedVehicle.plate] || {
        ...defaultAkte,
      }
    : defaultAkte;

  const vehicleImages = decodeImages(currentAkte[imageFieldKey] ?? "");
  const activeImage = vehicleImages[activeImageIndex] || vehicleImages[0] || "";
  const activeImageIsDataUrl = activeImage.startsWith("data:");
  const activeImageIsHttpUrl = /^https?:\/\//i.test(activeImage);

  const persistAkte = (plate: string, nextAkte: VehicleAkte) => {
    fetchNui<VehicleAkte>("saveVehicleAkte", { plate, akte: nextAkte })
      .then((saved) => {
        const savedImageCount = decodeImages(saved?.[imageFieldKey] ?? "").length;
        void fetchNui("debugUiLog", {
          tag: "vehicles-save",
          message: `plate=${plate} savedImages=${savedImageCount}`,
        });

        if (!saved) return;
        setAktenByVehicle((prev) => ({
          ...prev,
          [plate]: {
            ...defaultAkte,
            ...(prev[plate] || {}),
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
    const nextAkte: VehicleAkte = {
      ...defaultAkte,
      ...(aktenByVehicle[plate] || {}),
      [field]: value,
    };

    setAktenByVehicle((prev) => ({
      ...prev,
      [plate]: nextAkte,
    }));

    persistAkte(plate, nextAkte);
  };

  const saveAkte = () => {
    if (!selectedVehicle) return;
    persistAkte(selectedVehicle.plate, currentAkte);
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

      const newImages = result.images.filter((item) => typeof item === "string" && item.trim() !== "");
      if (newImages.length === 0) return;

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

      const nextImage = result.images[result.images.length - 1];
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
                className="w-full h-44 object-cover rounded-md border border-[var(--mdt-border)] cursor-zoom-in"
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
            .filter((field) => field.type === "textarea")
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
          onClick={() => setFullscreenImage(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-md bg-black/50 text-white border border-white/20"
            onClick={(event) => {
              event.stopPropagation();
              setFullscreenImage(null);
            }}
            aria-label={t("close_mdt")}
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenImage}
            alt={selectedVehicle.plate}
            className="max-w-full max-h-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
