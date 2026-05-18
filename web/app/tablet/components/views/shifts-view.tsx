"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";

type ShiftRecord = {
  id: string;
  title: string;
  note: string;
  createdAt: string;
};

type ShiftsViewProps = {
  t: TFunction;
  shifts: ShiftRecord[];
  boardAdmin: boolean;
  onCreateShift?: (shift: { title: string; note: string }) => void;
};

function formatRelativeTime(timestamp: string, t: TFunction): string {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return t("tablet.time.just_now", undefined, "just now");
  const diffSeconds = Math.max(1, Math.round((Date.now() - parsed) / 1000));
  if (diffSeconds < 60) return t("tablet.time.seconds_ago", { count: diffSeconds }, "{count}s ago");
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return t("tablet.time.minutes_ago", { count: diffMinutes }, "{count}m ago");
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return t("tablet.time.hours_ago", { count: diffHours }, "{count}h ago");
  return t("tablet.time.days_ago", { count: Math.round(diffHours / 24) }, "{count}d ago");
}

export default function ShiftsView({ t, shifts, boardAdmin, onCreateShift }: ShiftsViewProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  const handleCreateShift = () => {
    if (!boardAdmin) return;
    const nextTitle = title.trim();
    const nextNote = note.trim();
    if (nextTitle === "") return;
    onCreateShift?.({ title: nextTitle, note: nextNote });
    setTitle("");
    setNote("");
  };

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <div>
        <h3 className="text-2xl card-title">{t("tablet.sidebar.shifts")}</h3>
        <p className="card-sub mt-1">{t("tablet.dashboard.shift_team")}</p>
      </div>

      <Card className="p-4 flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
        <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-3">
          {shifts.length === 0 ? (
            <div className="h-full min-h-48 flex items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-[var(--mdt-text-muted)]">
              No shifts yet.
            </div>
          ) : (
            shifts.map((shift) => (
              <div key={shift.id} className="rounded-3xl border border-white/8 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{shift.title}</p>
                  <span className="text-[11px] text-[var(--mdt-text-muted)]">{formatRelativeTime(shift.createdAt, t)}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--mdt-text-muted)] leading-5">{shift.note}</p>
              </div>
            ))
          )}
        </div>

        {boardAdmin && onCreateShift && (
          <div className="rounded-3xl border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-4 space-y-3 shrink-0">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--mdt-text-muted)]">Admin</p>
              <p className="mt-1 text-sm text-white">Create shift</p>
            </div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Shift title"
              className="w-full rounded-2xl border border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] p-3 text-white outline-none"
            />
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Shift note"
              rows={3}
              className="w-full rounded-2xl border border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] p-3 text-white outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => { setTitle(""); setNote(""); }}>
                Clear
              </Button>
              <Button onClick={handleCreateShift}>
                <Plus className="w-4 h-4 mr-2" />
                Add shift
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
