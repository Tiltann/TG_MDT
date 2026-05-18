"use client";
import { Card } from "../ui/card";
import type { TFunction } from "../../lib/i18n";

const defaultPenalties = [
  { code: "§315b", labelKey: "tablet.penalties.item.one", amount: "1500$" },
  { code: "§240", labelKey: "tablet.penalties.item.two", amount: "900$" },
  { code: "§142", labelKey: "tablet.penalties.item.three", amount: "450$" },
  { code: "§21", labelKey: "tablet.penalties.item.four", amount: "300$" },
];

export default function PenaltiesView({ t }: { t: TFunction }) {
  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h3 className="text-xl card-title">{t("tablet.sidebar.penalty_catalog")}</h3>
        <p className="card-sub mt-1">{t("tablet.penalties.subtitle")}</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-12 text-xs uppercase tracking-wider text-[var(--mdt-text-muted)] border-b border-[var(--mdt-border)] pb-2">
          <div className="col-span-2">{t("tablet.penalties.header.code")}</div>
          <div className="col-span-7">{t("tablet.penalties.header.offense")}</div>
          <div className="col-span-3 text-right">{t("tablet.penalties.header.amount")}</div>
        </div>

        <div className="mt-2 space-y-2">
          {defaultPenalties.map((entry) => (
            <div key={entry.code} className="grid grid-cols-12 items-center p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
              <div className="col-span-2 text-sm text-white font-medium">{entry.code}</div>
              <div className="col-span-7 text-sm text-white">{t(entry.labelKey)}</div>
              <div className="col-span-3 text-sm text-right text-[var(--mdt-accent-primary)] font-semibold">{entry.amount}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
