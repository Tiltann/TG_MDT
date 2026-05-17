"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, CarFront, UserRound, Fingerprint } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";

type VehicleRecord = {
  plate: string;
  ownerIdentifier?: string | null;
  ownerName?: string | null;
  model?: string | number | null;
  state?: string | number | null;
};

export default function VehiclesView({ t, vehicles }: { t: TFunction; vehicles: VehicleRecord[] }) {
  const [search, setSearch] = useState("");
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);
  const [aktenByVehicle, setAktenByVehicle] = useState<Record<string, boolean>>({});

  const normalizedVehicles = useMemo(
    () =>
      (vehicles || []).map((vehicle) => ({
        ...vehicle,
        plate: (vehicle.plate || "UNKNOWN").toUpperCase(),
      })),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return normalizedVehicles;

    return normalizedVehicles.filter((vehicle) => {
      const haystack = [
        vehicle.plate,
        vehicle.ownerName,
        vehicle.ownerIdentifier,
        vehicle.model,
        vehicle.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [normalizedVehicles, search]);

  useEffect(() => {
    if (filteredVehicles.length === 0) {
      setSelectedPlate(null);
      return;
    }

    const stillVisible = filteredVehicles.some((vehicle) => vehicle.plate === selectedPlate);
    if (!stillVisible) {
      setSelectedPlate(filteredVehicles[0].plate);
    }
  }, [filteredVehicles, selectedPlate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("tg_mdt_vehicle_akten");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      if (parsed && typeof parsed === "object") {
        setAktenByVehicle(parsed);
      }
    } catch {
      // Ignore malformed localStorage data.
    }
  }, []);

  const selectedVehicle =
    filteredVehicles.find((vehicle) => vehicle.plate === selectedPlate) || filteredVehicles[0] || null;

  const setVehicleAkte = (plate: string) => {
    setAktenByVehicle((prev) => {
      const next = { ...prev, [plate]: true };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("tg_mdt_vehicle_akten", JSON.stringify(next));
        } catch {
          // Ignore storage errors in restricted contexts.
        }
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl card-title">{t("tablet.sidebar.vehicles")}</h3>
          <p className="card-sub mt-1">{t("tablet.vehicles.subtitle")}</p>
        </div>
        <div className="px-3 py-1 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] text-xs text-[var(--mdt-text-muted)]">
          {t("tablet.vehicles.total")}: <span className="text-white font-semibold">{normalizedVehicles.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        <Card className="col-span-5 p-3 flex flex-col gap-3 min-h-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mdt-text-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("tablet.vehicles.search_placeholder")}
              className="w-full pl-9 pr-3 py-2 rounded-md bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] text-sm text-white"
            />
          </div>

          <div className="text-xs text-[var(--mdt-text-muted)] px-1">
            {filteredVehicles.length === normalizedVehicles.length
              ? `${normalizedVehicles.length} ${t("tablet.sidebar.vehicles")}`
              : `${filteredVehicles.length} / ${normalizedVehicles.length}`}
          </div>

          <div className="flex-1 overflow-auto space-y-2 pr-1">
            {filteredVehicles.length === 0 ? (
              <div className="h-full min-h-24 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]">
                {normalizedVehicles.length > 0 ? t("tablet.vehicles.no_match") : t("tablet.vehicles.empty")}
              </div>
            ) : (
              filteredVehicles.map((vehicle) => {
                const isActive = selectedVehicle?.plate === vehicle.plate;
                return (
                  <button
                    key={vehicle.plate}
                    type="button"
                    onClick={() => setSelectedPlate(vehicle.plate)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      isActive
                        ? "border-[var(--mdt-accent-primary)] bg-[rgba(255,145,0,0.12)]"
                        : "border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.03)]"
                    }`}
                  >
                    <p className="text-sm text-white font-medium truncate">{vehicle.plate}</p>
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <p className="text-xs text-[var(--mdt-text-muted)] truncate">
                        {vehicle.ownerName || t("tablet.vehicles.not_available")}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          aktenByVehicle[vehicle.plate]
                            ? "border-[var(--mdt-status-success)] text-[var(--mdt-status-success)]"
                            : "border-[var(--mdt-border)] text-[var(--mdt-text-muted)]"
                        }`}
                      >
                        {aktenByVehicle[vehicle.plate]
                          ? t("tablet.vehicles.akte.exists")
                          : t("tablet.vehicles.akte.missing")}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="col-span-7 p-4 min-h-0 overflow-auto">
          {!selectedVehicle ? (
            <div className="h-full min-h-24 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]">
              {t("tablet.vehicles.empty")}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--mdt-text-muted)]">{t("tablet.vehicles.detail_title")}</p>
                <h4 className="text-2xl text-white font-semibold mt-1">{selectedVehicle.plate}</h4>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                  <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2"><CarFront className="w-4 h-4" />{t("tablet.vehicles.field.model")}</p>
                  <p className="text-sm text-white mt-1">{String(selectedVehicle.model || t("tablet.vehicles.not_available"))}</p>
                </div>

                <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                  <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2"><UserRound className="w-4 h-4" />{t("tablet.vehicles.field.owner")}</p>
                  <p className="text-sm text-white mt-1">{selectedVehicle.ownerName || t("tablet.vehicles.not_available")}</p>
                </div>

                <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                  <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2"><Fingerprint className="w-4 h-4" />{t("tablet.vehicles.field.owner_identifier")}</p>
                  <p className="text-sm text-white mt-1 break-all">{selectedVehicle.ownerIdentifier || t("tablet.vehicles.not_available")}</p>
                </div>

                <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                  <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.vehicles.field.state")}</p>
                  <p className="text-sm text-white mt-1">{String(selectedVehicle.state || t("tablet.vehicles.not_available"))}</p>
                </div>
              </div>

              <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.vehicles.akte.title")}</p>
                  <p className="text-sm text-white mt-1">
                    {aktenByVehicle[selectedVehicle.plate]
                      ? t("tablet.vehicles.akte.exists")
                      : t("tablet.vehicles.akte.missing")}
                  </p>
                </div>
                <Button
                  variant={aktenByVehicle[selectedVehicle.plate] ? "ghost" : "primary"}
                  onClick={() => setVehicleAkte(selectedVehicle.plate)}
                >
                  {aktenByVehicle[selectedVehicle.plate]
                    ? t("tablet.vehicles.akte.open")
                    : t("tablet.vehicles.akte.create")}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
