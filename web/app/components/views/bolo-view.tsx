"use client";
import { Card } from "../ui/card";
import type { TFunction } from "../../lib/i18n";

export default function BoloView({ t }: { t: TFunction }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl card-title">{t("tablet.bolo.title")}</h3>
      <Card className="p-4">
        <p className="card-sub">{t("tablet.bolo.subtitle")}</p>
      </Card>
    </div>
  );
}
