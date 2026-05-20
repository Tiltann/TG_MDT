"use client";

import { useState } from "react";
import { Plus, CalendarDays, ClipboardList, Clock3, Sparkles } from "lucide-react";
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
    <div className="h-full flex flex-col gap-4 min-h-0 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
            <CalendarDays className="w-6 h-6 text-zinc-400" />
            {t("tablet.sidebar.shifts")}
          </h3>
          <p className="text-xs text-[var(--mdt-text-muted)] mt-1">{t("tablet.dashboard.shift_team")}</p>
        </div>
        <div className="rounded-full border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-1 text-xs text-zinc-300 font-bold uppercase tracking-wider">
          {shifts.length} Records
        </div>
      </div>

      <Card className="p-5 flex-1 bg-zinc-950/80 border-[var(--mdt-border)] rounded-2xl flex flex-col gap-5 overflow-hidden shadow-2xl">
        <div className="flex-1 min-h-0 overflow-auto pr-1.5 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {shifts.length === 0 ? (
            <div className="h-full min-h-48 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-900/10 p-10 text-center">
              <ClipboardList className="w-10 h-10 text-zinc-600 mb-3 animate-pulse" />
              <p className="text-sm font-bold text-zinc-300">Shift log is empty</p>
              <p className="mt-1 max-w-xs text-xs text-zinc-500 leading-normal">
                No active duty records or shift assignments have been compiled yet.
              </p>
            </div>
          ) : (
            shifts.map((shift, idx) => (
              <div 
                key={shift.id} 
                className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5 hover:border-zinc-700/80 hover:bg-zinc-900/30 transition-all duration-300 group flex items-start gap-4"
              >
                {/* Visual colored left accent */}
                <div 
                  className={`w-1 h-12 rounded-full self-center ${
                    idx % 3 === 0 
                      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                      : idx % 3 === 1 
                      ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                      : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  }`} 
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">{shift.title}</p>
                    <span className="text-[10.5px] font-bold text-zinc-600 shrink-0 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock3 className="w-3.5 h-3.5" />
                      {formatRelativeTime(shift.createdAt, t)}
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-900/50 pt-2 font-medium">{shift.note}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {boardAdmin && onCreateShift && (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/10 p-5 space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-500">Service Logs</p>
                <p className="text-xs font-bold text-white mt-0.5">Register new shift record</p>
              </div>
            </div>

            <div className="grid gap-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Shift title or roster name..."
                className="w-full rounded-xl border border-zinc-800/80 bg-black/30 p-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
              />
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder=" Roster notes, vehicle codes, active personnel, or shift highlights..."
                rows={3}
                className="w-full rounded-xl border border-zinc-800/80 bg-black/30 p-3 text-xs text-white outline-none resize-none placeholder:text-zinc-600 focus:border-zinc-700 transition-colors"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button 
                  variant="ghost" 
                  className="h-8.5 text-xs rounded-lg"
                  onClick={() => { setTitle(""); setNote(""); }}
                >
                  Clear
                </Button>
                <Button 
                  onClick={handleCreateShift}
                  disabled={!title.trim()}
                  className="h-8.5 text-xs rounded-lg px-4 bg-zinc-200 hover:bg-white text-black font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add shift entry
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
