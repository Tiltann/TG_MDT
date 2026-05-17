"use client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";

export default function VehiclesView({ t }: { t: TFunction }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl card-title">{t("tablet.sidebar.vehicles")}</h3>
        <Button>{t("tablet.vehicles.new_vehicle")}</Button>
      </div>
      <Card className="p-4">
        <p className="card-sub">{t("tablet.vehicles.placeholder")}</p>
      </Card>
    </div>
  );
}
