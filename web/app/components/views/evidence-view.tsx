"use client";
import { Card } from "../ui/card";
import type { TFunction } from "../../lib/i18n";

export default function EvidenceView({ t }: { t: TFunction }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl card-title">{t("tablet.sidebar.evidence")}</h3>
      <Card className="p-4">
        <p className="card-sub">{t("tablet.evidence.placeholder")}</p>
      </Card>
    </div>
  );
}
