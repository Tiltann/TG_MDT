"use client";
import { Card } from "../ui/card";
import type { TFunction } from "../../lib/i18n";

export default function ReportsView({ t }: { t: TFunction }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl card-title">{t("tablet.sidebar.reports")}</h3>
      <Card className="p-4">
        <p className="card-sub">{t("tablet.reports.placeholder")}</p>
      </Card>
    </div>
  );
}
