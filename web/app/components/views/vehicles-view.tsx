"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CarFront, UserRound } from "lucide-react";
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
};

type VehicleAkte = {
  modelName: string;
  color: string;
  registrationStatus: string;
  insuranceStatus: string;
  stolenStatus: string;
  notes: string;
};

type AkteSyncPayload = {
  kind?: "person" | "vehicle";
  identifier?: string;
  plate?: string;
  akte?: VehicleAkte;
};

const DEFAULT_AKTE: VehicleAkte = {
  modelName: "",
  color: "",
  registrationStatus: "valid",
  insuranceStatus: "active",
  stolenStatus: "no",
  notes: "",
};

const MODEL_HASH_NAMES: Record<string, string> = {
  "1663218586": "Sultan RS",
};

function normalizeModelName(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "Unknown";
  const key = String(value);
  if (MODEL_HASH_NAMES[key]) return MODEL_HASH_NAMES[key];
  if (/^\d+$/.test(key)) return `Unknown (${key})`;
  return key;
}

export default function VehiclesView({
  t,
  vehicles,
  globalSearch,
  initialAkten,
  akteSync,
}: {
  t: TFunction;
  vehicles: VehicleRecord[];
  globalSearch: string;
  initialAkten: Record<string, VehicleAkte>;
  akteSync?: AkteSyncPayload;
}) {
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);
  const [aktenByVehicle, setAktenByVehicle] = useState<Record<string, VehicleAkte>>(initialAkten || {});

  useEffect(() => {
    setAktenByVehicle((prev) => ({ ...initialAkten, ...prev }));
  }, [initialAkten]);

  useEffect(() => {
    if (!akteSync || akteSync.kind !== "vehicle" || !akteSync.plate || !akteSync.akte) return;
    setAktenByVehicle((prev) => ({
      ...prev,
      [akteSync.plate as string]: {
        ...DEFAULT_AKTE,
        ...(prev[akteSync.plate as string] || {}),
        ...(akteSync.akte || {}),
      },
    }));
  }, [akteSync]);

  const normalizedVehicles = useMemo(
    () =>
      (vehicles || []).map((vehicle) => ({
        ...vehicle,
        plate: (vehicle.plate || "UNKNOWN").toUpperCase(),
        modelName: normalizeModelName(vehicle.model),
      })),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();
    if (!term) return normalizedVehicles;

    return normalizedVehicles.filter((vehicle) => {
      const haystack = [vehicle.plate, vehicle.ownerName, vehicle.modelName, vehicle.state]
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
    if (!selectedVehicle) return;
    if (aktenByVehicle[selectedVehicle.plate]) return;

    fetchNui<VehicleAkte>("getVehicleAkte", { plate: selectedVehicle.plate })
      .then((akte) => {
        setAktenByVehicle((prev) => ({
          ...prev,
          [selectedVehicle.plate]: {
            ...DEFAULT_AKTE,
            ...(akte || {}),
            modelName: (akte && akte.modelName) || selectedVehicle.modelName,
          },
        }));
      })
      .catch(() => {
        // Keep defaults when callback fails.
      });
  }, [selectedVehicle, aktenByVehicle]);

  const currentAkte = selectedVehicle
    ? aktenByVehicle[selectedVehicle.plate] || {
        ...DEFAULT_AKTE,
        modelName: selectedVehicle.modelName,
      }
    : DEFAULT_AKTE;

  const persistAkte = (plate: string, nextAkte: VehicleAkte) => {
    fetchNui<VehicleAkte>("saveVehicleAkte", { plate, akte: nextAkte })
      .then((saved) => {
        if (!saved) return;
        setAktenByVehicle((prev) => ({
          ...prev,
          [plate]: {
            ...DEFAULT_AKTE,
            ...(prev[plate] || {}),
            ...(saved || {}),
          },
        }));
      })
      .catch(() => {
        // Ignore save errors for now; local view state remains.
      });
  };

  const updateAkteField = (field: keyof VehicleAkte, value: string) => {
    if (!selectedVehicle) return;

    const plate = selectedVehicle.plate;
    const nextAkte: VehicleAkte = {
      ...DEFAULT_AKTE,
      ...(aktenByVehicle[plate] || { modelName: selectedVehicle.modelName }),
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
                    {vehicle.modelName} - {vehicle.ownerName || t("tablet.vehicles.not_available")}
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

          <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
            <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2">
              <CarFront className="w-4 h-4" />
              {t("tablet.vehicles.field.model")}
            </p>
            <p className="text-sm text-white mt-1">{selectedVehicle.modelName}</p>
          </div>

          <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
            <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2">
              <UserRound className="w-4 h-4" />
              {t("tablet.vehicles.field.owner")}
            </p>
            <p className="text-sm text-white mt-1">{selectedVehicle.ownerName || t("tablet.vehicles.not_available")}</p>
          </div>

          <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
            <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.vehicles.field.state")}</p>
            <p className="text-sm text-white mt-1">{String(selectedVehicle.state || t("tablet.vehicles.not_available"))}</p>
          </div>
        </Card>

        <Card className="col-span-7 p-4 overflow-auto space-y-3">
          <h4 className="card-title">{t("tablet.vehicles.akte.title")}</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.vehicles.field.model")}</label>
              <input
                value={currentAkte.modelName}
                onChange={(event) => updateAkteField("modelName", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              />
            </div>
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.vehicles.akte.color")}</label>
              <input
                value={currentAkte.color}
                onChange={(event) => updateAkteField("color", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              />
            </div>
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.vehicles.akte.registration")}</label>
              <select
                value={currentAkte.registrationStatus}
                onChange={(event) => updateAkteField("registrationStatus", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              >
                <option value="valid">{t("tablet.vehicles.akte.registration.valid")}</option>
                <option value="expired">{t("tablet.vehicles.akte.registration.expired")}</option>
                <option value="revoked">{t("tablet.vehicles.akte.registration.revoked")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.vehicles.akte.insurance")}</label>
              <select
                value={currentAkte.insuranceStatus}
                onChange={(event) => updateAkteField("insuranceStatus", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              >
                <option value="active">{t("tablet.vehicles.akte.insurance.active")}</option>
                <option value="expired">{t("tablet.vehicles.akte.insurance.expired")}</option>
                <option value="none">{t("tablet.vehicles.akte.insurance.none")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.vehicles.akte.stolen")}</label>
              <select
                value={currentAkte.stolenStatus}
                onChange={(event) => updateAkteField("stolenStatus", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              >
                <option value="no">{t("tablet.vehicles.akte.stolen.no")}</option>
                <option value="yes">{t("tablet.vehicles.akte.stolen.yes")}</option>
                <option value="investigation">{t("tablet.vehicles.akte.stolen.investigation")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mdt-muted mb-1">{t("tablet.vehicles.akte.notes")}</label>
            <textarea
              value={currentAkte.notes}
              onChange={(event) => updateAkteField("notes", event.target.value)}
              rows={6}
              className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
