"use client";

import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { SupportedLocale, TFunction } from "../../lib/i18n";

type SettingsViewProps = {
  t: TFunction;
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  accentColor: string;
  defaultAccent: string;
  onAccentColorChange: (accent: string) => void;
  onResetAccent: () => void;
};

export default function SettingsView({
  t,
  locale,
  onLocaleChange,
  accentColor,
  defaultAccent,
  onAccentColorChange,
  onResetAccent,
}: SettingsViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl card-title">{t("tablet.settings.title")}</h3>
      </div>

      <Card className="p-4 space-y-5">
        <div>
          <p className="card-sub">{t("tablet.settings.locale_section")}</p>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-white" htmlFor="locale-select">
              {t("tablet.settings.locale_label")}
            </label>
            <select
              id="locale-select"
              value={locale}
              onChange={(event) => onLocaleChange(event.target.value as SupportedLocale)}
              className="bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md px-3 py-2 text-sm text-white"
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>

        <div>
          <p className="card-sub">{t("tablet.settings.accent_section")}</p>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-white" htmlFor="accent-color-input">
              {t("tablet.settings.accent_label")}
            </label>
            <input
              id="accent-color-input"
              type="color"
              value={accentColor}
              onChange={(event) => onAccentColorChange(event.target.value)}
              className="h-10 w-14 rounded-md border border-[var(--mdt-border)] bg-transparent p-1"
            />
            <Button variant="ghost" onClick={onResetAccent}>
              {t("tablet.settings.accent_reset")}
            </Button>
          </div>
          <p className="mt-2 text-xs text-[var(--mdt-text-muted)]">
            {t("tablet.settings.accent_hint", { color: accentColor })}
          </p>
          <p className="mt-1 text-xs text-[var(--mdt-text-muted)]">
            {t("tablet.settings.accent_default", { color: defaultAccent })}
          </p>
        </div>
      </Card>
    </div>
  );
}
