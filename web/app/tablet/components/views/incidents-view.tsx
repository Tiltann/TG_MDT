"use client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";

export default function IncidentsView({ t }: { t: TFunction }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl card-title">{t("tablet.sidebar.incidents")}</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost">{t("tablet.actions.filters")}</Button>
          <Button>{t("tablet.incidents.new_incident")}</Button>
        </div>
      </div>

      <Card className="p-4">
        <p className="card-sub">{t("tablet.incidents.recent_list")}</p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.02)] rounded-md">
            <div>
              <p className="font-medium text-white">{t("tablet.incidents.sample_title")}</p>
              <p className="text-xs mdt-muted">Pillbox Hill · 10:16</p>
            </div>
            <div className="text-sm text-[var(--mdt-status-medium)] font-semibold">MEDIUM</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
