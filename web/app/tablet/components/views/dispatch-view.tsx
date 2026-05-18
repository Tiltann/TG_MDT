"use client";

import { Card } from "../ui/card";
import { Button } from "../ui/button";
import IncidentsView, { type IncidentRecord } from "./incidents-view";
import type { TFunction } from "../../lib/i18n";

type PersonRecord = { identifier: string; name?: string | null; firstname?: string | null; lastname?: string | null };
type VehicleRecord = { plate: string; ownerName?: string | null; model?: string | number | null };

export default function DispatchView({
  t,
  incidents,
  persons,
  vehicles,
  onCreateIncident,
  onUpdateIncident,
  onDeleteIncident,
}: {
  t: TFunction;
  incidents: IncidentRecord[];
  persons: PersonRecord[];
  vehicles: VehicleRecord[];
  onCreateIncident: (incident: Omit<IncidentRecord, "id" | "createdAt" | "updatedAt">) => void;
  onUpdateIncident: (id: string, patch: Partial<IncidentRecord>) => void;
  onDeleteIncident: (id: string) => void;
}) {
  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <h3 className="text-xl card-title">{t("tablet.sidebar.dispatch")}</h3>
          <p className="card-sub mt-1">{t("tablet.dispatch.console")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost">{t("tablet.dispatch.active_units")}</Button>
          <Button>{t("tablet.dispatch.assign")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 flex-1 min-h-0">
        <Card className="p-4 xl:col-span-2 min-h-0 overflow-hidden">
          <p className="card-sub">{t("tablet.dispatch.console")}</p>
          <div className="mt-4 h-full rounded-2xl border border-[var(--mdt-border)] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_42%),linear-gradient(180deg,rgba(13,15,20,0.95),rgba(8,9,12,0.96))] p-4 text-sm text-[var(--mdt-text-muted)]">
            {t("tablet.dispatch.placeholder")}
          </div>
        </Card>

        <div className="xl:col-span-3 min-h-0 overflow-hidden">
          <IncidentsView
            t={t}
            incidents={incidents}
            persons={persons}
            vehicles={vehicles}
            onCreate={onCreateIncident}
            onUpdate={onUpdateIncident}
            onDelete={onDeleteIncident}
          />
        </div>
      </div>
    </div>
  );
}
