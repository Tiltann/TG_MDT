"use client";

import { useEffect, useState } from "react";
import { Camera, Save, Smartphone } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";

export type ProfileViewData = {
  name: string;
  imageUrl: string;
  gradeDisplay?: string;
};

export default function ProfileView({
  t,
  profile,
  onSave,
  onCapturePhoto,
}: {
  t: TFunction;
  profile: ProfileViewData;
  onSave: (patch: Partial<ProfileViewData>) => void;
  onCapturePhoto: (mode: "standard" | "selfie") => Promise<void>;
}) {
  const [name, setName] = useState(profile.name || "");
  const [imageUrl, setImageUrl] = useState(profile.imageUrl || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(profile.name || "");
    setImageUrl(profile.imageUrl || "");
  }, [profile.imageUrl, profile.name]);

  const handleCapture = async () => {
    setBusy(true);
    try {
      await onCapturePhoto("standard");
    } finally {
      setBusy(false);
    }
  };

  const handleSelfie = async () => {
    setBusy(true);
    try {
      await onCapturePhoto("selfie");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    onSave({
      name: name.trim(),
      imageUrl: imageUrl.trim(),
    });
  };

  const avatar = imageUrl.trim();
  const displayInitial = (name.trim() || t("tablet.player.unknown_user")).charAt(0).toUpperCase();

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h3 className="text-2xl card-title">{t("tablet.profile.title")}</h3>
        <p className="card-sub mt-1">{t("tablet.profile.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 flex-1 min-h-0">
        <Card className="p-5 overflow-hidden">
          <div className="relative rounded-3xl border border-[var(--mdt-border)] bg-[radial-gradient(circle_at_top,rgba(255,145,0,0.14),transparent_40%),rgba(255,255,255,0.02)] p-6 flex flex-col items-center gap-4">
            <div className="w-36 h-36 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center text-4xl text-white font-semibold">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={name || "profile"} className="w-full h-full object-cover" />
              ) : (
                displayInitial
              )}
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{name.trim() || t("tablet.player.unknown_user")}</p>
              <p className="text-xs text-[var(--mdt-text-muted)] mt-1">{profile.gradeDisplay || t("tablet.player.duty_profile")}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Button variant="ghost" onClick={handleCapture} disabled={busy}>
                <Camera className="w-4 h-4 mr-2" />
                {busy ? t("tablet.akte.capture_image_busy") : "Take picture"}
              </Button>
              <Button variant="ghost" onClick={handleSelfie} disabled={busy}>
                <Smartphone className="w-4 h-4 mr-2" />
                {busy ? t("tablet.akte.capture_image_busy") : "Take selfie"}
              </Button>
            </div>
            <p className="text-[11px] text-[var(--mdt-text-muted)] text-center max-w-sm">
              Selfie mode uses a front-facing phone camera style capture.
            </p>
          </div>
        </Card>

        <Card className="p-5 overflow-auto space-y-4">
          <div>
            <label className="block text-xs text-[var(--mdt-text-muted)] mb-2">{t("tablet.profile.name")}</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full p-3 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-xl text-white"
              placeholder={t("tablet.player.unknown_user")}
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--mdt-text-muted)] mb-2">{t("tablet.profile.image_url")}</label>
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              className="w-full p-3 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-xl text-white"
              placeholder="https://..."
            />
            <p className="text-xs text-[var(--mdt-text-muted)] mt-2">{t("tablet.profile.image_hint")}</p>
          </div>

          <div className="rounded-2xl border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--mdt-text-muted)]">{t("tablet.profile.preview")}</p>
            <p className="text-white text-lg font-semibold">{name.trim() || t("tablet.player.unknown_user")}</p>
            <p className="text-xs text-[var(--mdt-text-muted)]">{profile.gradeDisplay || t("tablet.player.duty_profile")}</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {t("tablet.profile.save")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
