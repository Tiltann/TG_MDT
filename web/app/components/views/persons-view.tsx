"use client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";

export default function PersonsView({ t }: { t: TFunction }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl card-title">{t("tablet.sidebar.persons")}</h3>
        <Button>{t("tablet.persons.new_person")}</Button>
      </div>
      <Card className="p-4">
        <p className="card-sub">{t("tablet.persons.placeholder")}</p>
      </Card>
    </div>
  );
}
