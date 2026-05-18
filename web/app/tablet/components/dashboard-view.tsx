"use client";

import { useMemo, useState } from "react";
import { Activity, CalendarDays, Camera, CarFront, Clock3, Plus, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import type { TFunction } from "../lib/i18n";

type Branding = {
  greeting?: string;
  name?: string;
  accent?: string;
  timeLabel?: string;
};

type DutyState = {
  onDuty?: boolean;
};

type BoardPost = {
  id: string;
  title: string;
  body: string;
  images: string[];
  author: string;
  createdAt: string;
};

type ShiftRecord = {
  id: string;
  title: string;
  note: string;
  createdAt: string;
};

type DashboardData = {
  personsCount?: number;
  vehiclesCount?: number;
  dutyState?: DutyState;
  actorName?: string;
  boardAdmin?: boolean;
  recentActivity?: Array<{
    id: string;
    kind: "system" | "duty" | "person" | "vehicle";
    title: string;
    detail: string;
    timestamp: string;
  }>;
  recentChat?: Array<{
    id: string;
    author: string;
    text: string;
    createdAt: string;
    avatarUrl?: string;
    gradeDisplay?: string;
  }>;
  recentIncidents?: Array<{
    id: string;
    title: string;
    location: string;
  }>;
  recentBolos?: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  boardPosts?: BoardPost[];
  shifts?: ShiftRecord[];
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

function renderInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return "U";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function DashboardView({
  branding,
  t,
  modules: _modules,
  data,
  onSendChat,
  onTakeBoardImage,
  onCreateBoardPost,
  onCreateShift,
}: {
  branding: Branding;
  modules?: Record<string, boolean>;
  t: TFunction;
  data?: DashboardData;
  onSendChat?: (text: string) => void;
  onTakeBoardImage?: () => Promise<string | null>;
  onCreateBoardPost?: (post: { title: string; body: string; images: string[] }) => void;
  onCreateShift?: (shift: { title: string; note: string }) => void;
}) {
  const isOnDuty = Boolean(data?.dutyState?.onDuty);
  const personsCount = data?.personsCount ?? 0;
  const vehiclesCount = data?.vehiclesCount ?? 0;
  const actorName = data?.actorName || t("tablet.player.unknown_user");
  const boardAdmin = data?.boardAdmin === true;
  const recentActivity = data?.recentActivity || [];
  const recentChat = data?.recentChat || [];
  const recentIncidents = data?.recentIncidents || [];
  const recentBolos = data?.recentBolos || [];
  const boardPosts = data?.boardPosts || [];
  const shifts = data?.shifts || [];

  const [boardTitle, setBoardTitle] = useState("");
  const [boardBody, setBoardBody] = useState("");
  const [boardImages, setBoardImages] = useState<string[]>([]);
  const [shiftTitle, setShiftTitle] = useState("");
  const [shiftNote, setShiftNote] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [boardBusy, setBoardBusy] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);

  const blackboardEmpty = boardPosts.length === 0;
  const heroStats = useMemo(
    () => [
      { label: "People", value: personsCount, tone: "bg-[rgba(255,145,0,0.12)] text-[var(--mdt-accent-primary)]" },
      { label: "Vehicles", value: vehiclesCount, tone: "bg-[rgba(59,130,246,0.12)] text-sky-300" },
    ],
    [personsCount, vehiclesCount]
  );

  const handleTakeBoardImage = async () => {
    if (!boardAdmin || !onTakeBoardImage) return;
    setBoardBusy(true);
    try {
      const image = await onTakeBoardImage();
      if (image && image.trim() !== "") {
        setBoardImages((prev) => [...prev, image.trim()].slice(0, 6));
      }
    } finally {
      setBoardBusy(false);
    }
  };

  const handleCreateBoardPost = () => {
    if (!boardAdmin) return;
    const title = boardTitle.trim();
    const body = boardBody.trim();
    if (title === "" || body === "") return;
    onCreateBoardPost?.({ title, body, images: boardImages });
    setBoardTitle("");
    setBoardBody("");
    setBoardImages([]);
  };

  const handleCreateShift = () => {
    if (!boardAdmin) return;
    const title = shiftTitle.trim();
    const note = shiftNote.trim();
    if (title === "") return;
    setShiftBusy(true);
    try {
      onCreateShift?.({ title, note });
      setShiftTitle("");
      setShiftNote("");
    } finally {
      setShiftBusy(false);
    }
  };

  const handleSendChat = () => {
    if (!onSendChat) return;
    const message = chatDraft.trim();
    if (message === "") return;
    onSendChat(message);
    setChatDraft("");
  };

  return (
    <div className="h-full flex flex-col gap-5 overflow-hidden">
      <div className="relative overflow-hidden rounded-[28px] border border-[var(--mdt-border)] bg-[radial-gradient(circle_at_top_left,rgba(255,145,0,0.18),transparent_38%),linear-gradient(135deg,rgba(11,13,17,0.98),rgba(13,17,24,0.92))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-0 opacity-40 pointer-events-none bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.04)_25%,transparent_50%,rgba(255,255,255,0.03)_75%,transparent_100%)]" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-3xl lg:text-5xl font-semibold text-white leading-tight">{branding.greeting || t("tablet.dashboard.greeting_default")}</h2>
            <p className="max-w-2xl text-sm lg:text-base text-[var(--mdt-text-muted)] leading-6">
              {t("tablet.dashboard.overview_subtitle")} {actorName !== t("tablet.player.unknown_user") ? ` ${actorName}` : ""}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border ${isOnDuty ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>
                <Activity className="h-3.5 w-3.5" />
                {isOnDuty ? t("tablet.dashboard.stats.active_shift") : t("tablet.topbar.duty_off")}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--mdt-text-muted)]">
                <Clock3 className="h-3.5 w-3.5 text-[var(--mdt-accent-primary)]" />
                {branding.timeLabel || t("tablet.topbar.date_fallback")}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:min-w-[420px]">
            {heroStats.map((stat) => (
              <Card key={stat.label} className="p-5 flex items-center gap-4 border border-[var(--mdt-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))]">
                <div className={`p-3 rounded-xl ${stat.tone}`}>
                  {stat.label === "People" ? <Users className="w-5 h-5" /> : <CarFront className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs text-[var(--mdt-text-muted)] uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold text-white leading-tight">{stat.value}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-5 flex-1 min-h-0">
        <Card className="p-5 flex flex-col gap-4 overflow-hidden min-h-0 bg-[linear-gradient(180deg,rgba(2,3,4,0.98),rgba(15,16,18,0.94))] border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between shrink-0">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--mdt-text-muted)]">{t("tablet.dashboard.black_board")}</p>
              <h4 className="mt-1 text-lg font-semibold text-white">{t("tablet.dashboard.black_board_title")}</h4>
            </div>
            <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-[var(--mdt-text-muted)]">
              {boardPosts.length} {t("tablet.dashboard.black_board_events")}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-3">
            {blackboardEmpty ? (
              <div className="min-h-full flex items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
                <div>
                  <p className="text-lg font-semibold text-white">No blackboard posts yet</p>
                  <p className="mt-2 text-sm text-[var(--mdt-text-muted)]">{t("tablet.dashboard.black_board_hint")}</p>
                </div>
              </div>
            ) : (
              boardPosts.map((post) => (
                <article key={post.id} className="rounded-3xl border border-white/8 bg-white/[0.04] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="text-base font-semibold text-white">{post.title}</h5>
                      <p className="text-[11px] text-[var(--mdt-text-muted)] mt-1">{post.author} • {formatRelativeTime(post.createdAt, t)}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--mdt-text-muted)]">MD</span>
                  </div>

                  <div className="prose prose-invert max-w-none mt-3 text-sm text-white/90 prose-p:my-2 prose-li:my-0 prose-ul:my-2 prose-ol:my-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
                  </div>

                  {post.images.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {post.images.map((image, index) => (
                        <div key={`${post.id}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image} alt={`${post.title}-${index + 1}`} className="h-40 w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          {boardAdmin && (
            <div className="rounded-3xl border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-4 space-y-3 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--mdt-text-muted)]">Admin</p>
                  <p className="mt-1 text-sm text-white">Create blackboard post</p>
                </div>
                <Button variant="ghost" onClick={handleTakeBoardImage} disabled={boardBusy}>
                  <Camera className="w-4 h-4 mr-2" />
                  {boardBusy ? "Capturing..." : "Take image"}
                </Button>
              </div>
              <div className="grid gap-3">
                <input
                  value={boardTitle}
                  onChange={(event) => setBoardTitle(event.target.value)}
                  placeholder="Post title"
                  className="w-full rounded-2xl border border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] p-3 text-white outline-none"
                />
                <textarea
                  value={boardBody}
                  onChange={(event) => setBoardBody(event.target.value)}
                  placeholder="Write markdown here..."
                  rows={5}
                  className="w-full rounded-2xl border border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] p-3 text-white outline-none resize-none"
                />
                {boardImages.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {boardImages.map((image, index) => (
                      <div key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt={`draft-${index + 1}`} className="h-32 w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setBoardTitle(""); setBoardBody(""); setBoardImages([]); }}>
                    Clear
                  </Button>
                  <Button onClick={handleCreateBoardPost}>
                    <Plus className="w-4 h-4 mr-2" />
                    Publish
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-5 min-h-0">
          <Card className="p-5 flex flex-col gap-4 overflow-hidden min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <h4 className="card-title">{t("tablet.dashboard.recent_activity")}</h4>
            </div>
            <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.dashboard.recent_activity_empty")}</p>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[var(--mdt-border)] bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-white font-medium truncate">{item.title}</p>
                      <span className="text-[11px] text-[var(--mdt-text-muted)]">{formatRelativeTime(item.timestamp, t)}</span>
                    </div>
                    <p className="text-xs text-[var(--mdt-text-muted)] mt-2 leading-5">{item.detail}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5 flex flex-col gap-4 overflow-hidden min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--mdt-text-muted)]">Live Chat</p>
                <h4 className="mt-1 text-lg font-semibold text-white">Dashboard chat</h4>
              </div>
              <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-[var(--mdt-text-muted)]">
                {recentChat.length}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-2">
              {recentChat.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[var(--mdt-text-muted)]">
                  No chat messages yet.
                </p>
              ) : (
                recentChat.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-white/5 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0">
                          {item.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.avatarUrl} alt={item.author} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-semibold text-white/80">{renderInitials(item.author)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{item.author}</p>
                          {item.gradeDisplay && <p className="text-[11px] text-[var(--mdt-text-muted)] truncate">{item.gradeDisplay}</p>}
                        </div>
                      </div>
                      <span className="text-[11px] text-[var(--mdt-text-muted)]">{formatRelativeTime(item.createdAt, t)}</span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--mdt-text-muted)] whitespace-pre-wrap break-words">{item.text}</p>
                  </div>
                ))
              )}
            </div>
            {onSendChat && (
              <div className="rounded-3xl border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-3 space-y-3 shrink-0">
                <textarea
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] p-3 text-white outline-none resize-none"
                  placeholder="Write a live chat message..."
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={() => setChatDraft("")}>Clear</Button>
                  <Button onClick={handleSendChat} disabled={chatDraft.trim() === ""}>
                    Send
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5 flex flex-col gap-4 overflow-hidden min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--mdt-text-muted)]">Shifts</p>
                <h4 className="mt-1 text-lg font-semibold text-white">Create shifts</h4>
              </div>
              <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-[var(--mdt-text-muted)]">
                {shifts.length}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-3">
              {shifts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-[var(--mdt-text-muted)]">
                  No shifts yet.
                </div>
              ) : (
                shifts.map((shift) => (
                  <div key={shift.id} className="rounded-3xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">{shift.title}</p>
                      <span className="text-[11px] text-[var(--mdt-text-muted)]">{formatRelativeTime(shift.createdAt, t)}</span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--mdt-text-muted)] leading-5">{shift.note}</p>
                  </div>
                ))
              )}
            </div>
            {boardAdmin && (
              <div className="rounded-3xl border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-4 space-y-3 shrink-0">
                <input
                  value={shiftTitle}
                  onChange={(event) => setShiftTitle(event.target.value)}
                  placeholder="Shift title"
                  className="w-full rounded-2xl border border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] p-3 text-white outline-none"
                />
                <textarea
                  value={shiftNote}
                  onChange={(event) => setShiftNote(event.target.value)}
                  placeholder="Shift note"
                  rows={3}
                  className="w-full rounded-2xl border border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] p-3 text-white outline-none resize-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setShiftTitle(""); setShiftNote(""); }}>
                    Clear
                  </Button>
                  <Button onClick={handleCreateShift} disabled={shiftBusy}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add shift
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
