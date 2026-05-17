"use client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";

export default function DispatchView({ t }: { t: TFunction }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl card-title">{t("tablet.sidebar.dispatch")}</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost">{t("tablet.dispatch.active_units")}</Button>
          <Button>{t("tablet.dispatch.assign")}</Button>
        </div>
      </div>

      <Card className="p-4">
        <p className="card-sub">{t("tablet.dispatch.console")}</p>
        <div className="mt-4">{t("tablet.dispatch.placeholder")}</div>
      </Card>
    </div>
  );
}
