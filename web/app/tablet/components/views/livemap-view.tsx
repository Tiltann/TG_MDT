"use client";

import { Card } from "../ui/card";
import type { TFunction } from "../../lib/i18n";

export default function LiveMapView({ t }: { t: TFunction }) {
  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h3 className="text-2xl card-title">{t("tablet.sidebar.livemap")}</h3>
        <p className="card-sub mt-1">WIP</p>
      </div>

      <Card className="p-4 flex-1 overflow-hidden flex items-center justify-center border-dashed border-[var(--mdt-border)] bg-[radial-gradient(circle_at_top,rgba(255,145,0,0.10),transparent_40%),rgba(255,255,255,0.02)]">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-white">Live map is work in progress</p>
          <p className="text-sm text-[var(--mdt-text-muted)]">The live map section will return here.</p>
        </div>
      </Card>
    </div>
  );
}
