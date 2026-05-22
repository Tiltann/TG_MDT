"use client";
import { Card } from "../ui/card";
import type { TFunction } from "../../lib/i18n";

export default function WarrantsView({ t }: { t: TFunction }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl card-title">{t("tablet.warrants.title")}</h3>
      <Card className="p-4">
        <p className="card-sub">{t("tablet.warrants.placeholder")}</p>
      </Card>
    </div>
  );
}
