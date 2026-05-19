"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Camera,
  CarFront,
  ClipboardList,
  Clock3,
  FileText,
  Layers3,
  MapPin,
  MessageSquare,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import type { TFunction } from "../lib/i18n";

type Branding = {
  name?: string;
  subtitle?: string;
  accent?: string;
  greeting?: string;
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
  avatarUrl?: string;
  gradeDisplay?: string;
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
    kind: "system" | "duty" | "person" | "vehicle" | "chat" | "shift";
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
  if (!trimmed) return "U";

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function activityIcon(kind: string) {
  switch (kind) {
    case "person":
      return Users;
    case "vehicle":
      return CarFront;
    case "chat":
      return MessageSquare;
    case "shift":
      return CalendarDays;
    case "duty":
      return ShieldCheck;
    default:
      return ClipboardList;
  }
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
  const accent = branding.accent || "#ff9100";

  const [boardTitle, setBoardTitle] = useState("");
  const [boardBody, setBoardBody] = useState("");
  const [boardImages, setBoardImages] = useState<string[]>([]);
  const [shiftTitle, setShiftTitle] = useState("");
  const [shiftNote, setShiftNote] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [boardBusy, setBoardBusy] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);

  const handleTakeBoardImage = async () => {
    if (!boardAdmin || !onTakeBoardImage) return;

    setBoardBusy(true);
    try {
      const image = await onTakeBoardImage();
      if (image && image.trim() !== "") {
        setBoardImages((prev) => [...prev, image.trim()].slice(0, 4));
      }
    } finally {
      setBoardBusy(false);
    }
  };

  const handleCreateBoardPost = () => {
    if (!boardAdmin) return;

    const title = boardTitle.trim();
    const body = boardBody.trim();
    if (!title || !body) return;

    onCreateBoardPost?.({ title, body, images: boardImages });
    setBoardTitle("");
    setBoardBody("");
    setBoardImages([]);
  };

  const handleCreateShift = () => {
    if (!boardAdmin) return;

    const title = shiftTitle.trim();
    const note = shiftNote.trim();
    if (!title) return;

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
    if (!message) return;

    onSendChat(message);
    setChatDraft("");
  };

  const statCards = [
    {
      label: t("tablet.dashboard.stats.people", undefined, "Persons"),
      value: personsCount,
      icon: Users,
      tone: "bg-[rgba(255,145,0,0.12)] text-[var(--mdt-accent-primary)] border-[rgba(255,145,0,0.2)]",
    },
    {
      label: t("tablet.dashboard.stats.vehicles", undefined, "Vehicles"),
      value: vehiclesCount,
      icon: CarFront,
      tone: "bg-[rgba(59,130,246,0.12)] text-blue-400 border-[rgba(59,130,246,0.2)]",
    },
    {
      label: t("tablet.dashboard.stats.incidents", undefined, "Incidents"),
      value: recentIncidents.length,
      icon: Activity,
      tone: "bg-[rgba(239,68,68,0.12)] text-red-400 border-[rgba(239,68,68,0.2)]",
    },
    {
      label: t("tablet.dashboard.stats.bolos", undefined, "BOLOs"),
      value: recentBolos.length,
      icon: AlertTriangle,
      tone: "bg-[rgba(168,85,247,0.12)] text-purple-400 border-[rgba(168,85,247,0.2)]",
    },
  ];

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-3 pb-2 flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/5 bg-[linear-gradient(135deg,rgba(14,17,23,0.98),rgba(10,12,16,0.94))] p-6 lg:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,145,0,0.14),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_38%)]" />
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              <Layers3 className="h-3.5 w-3.5 text-[var(--mdt-accent-primary)]" />
              {branding.subtitle || t("tablet.branding.subtitle")}
            </div>

            <h2 className="text-3xl lg:text-5xl font-bold leading-tight tracking-tight text-white">
              {branding.greeting || t("tablet.dashboard.greeting_default")}
              {actorName !== t("tablet.player.unknown_user") && <span className="ml-2 text-[var(--mdt-accent-primary)]">{actorName}</span>}
            </h2>

            <p className="max-w-xl text-sm lg:text-base leading-relaxed text-white/60">
              {t("tablet.dashboard.overview_subtitle")}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 shadow-inner">
                <Activity className="h-3.5 w-3.5" />
                {isOnDuty ? t("tablet.dashboard.stats.active_shift") : t("tablet.topbar.duty_off")}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 shadow-inner">
                <Clock3 className="h-3.5 w-3.5 text-[var(--mdt-accent-primary)]" />
                {branding.timeLabel || t("tablet.topbar.date_fallback")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-fit">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="min-w-[145px] rounded-2xl border border-white/5 bg-white/[0.03] p-4 shadow-sm">
                  <div className={`inline-flex rounded-xl border p-2.5 ${stat.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-4 text-2xl font-bold leading-none text-white">{stat.value}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{stat.label}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-white/5 bg-white/[0.03] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--mdt-text-muted)]">{t("tablet.dashboard.stats.active_shift")}</p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{isOnDuty ? t("tablet.dashboard.stats.active_shift") : t("tablet.topbar.duty_off")}</p>
              <p className="mt-1 text-sm text-white/45">{branding.timeLabel || t("tablet.topbar.date_fallback")}</p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${isOnDuty ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-white/50"}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border border-white/5 bg-white/[0.03] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--mdt-text-muted)]">{t("tablet.dashboard.active_entries")}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-2xl font-bold text-white">{personsCount}</p>
              <p className="mt-1 text-xs text-white/45">{t("tablet.dashboard.stats.people", undefined, "Persons")}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-2xl font-bold text-white">{vehiclesCount}</p>
              <p className="mt-1 text-xs text-white/45">{t("tablet.dashboard.stats.vehicles", undefined, "Vehicles")}</p>
            </div>
          </div>
        </Card>

        <Card className="border border-white/5 bg-white/[0.03] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--mdt-text-muted)]">{t("tablet.dashboard.stats.news_hints")}</p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{recentActivity.length + recentChat.length}</p>
              <p className="mt-1 text-sm text-white/45">Recent updates</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(255,145,0,0.2)] bg-[rgba(255,145,0,0.1)] text-[var(--mdt-accent-primary)]">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="overflow-hidden border border-white/5 bg-[linear-gradient(180deg,rgba(16,19,26,0.98),rgba(11,13,17,0.94))]">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 lg:px-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--mdt-text-muted)]">{t("tablet.dashboard.black_board")}</p>
              <h4 className="mt-1 text-xl font-bold text-white">{t("tablet.dashboard.black_board_title")}</h4>
            </div>
            <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-white/60">
              {boardPosts.length} posts
            </div>
          </div>

          <div className="space-y-4 p-5 lg:p-6">
            {boardPosts.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-8 py-10 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/40">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <p className="text-lg font-semibold text-white/80">No blackboard posts yet</p>
                <p className="mt-1 max-w-sm text-sm text-white/40">{t("tablet.dashboard.black_board_hint")}</p>
              </div>
            ) : (
              boardPosts.slice(0, 2).map((post) => (
                <article key={post.id} className="rounded-[24px] border border-white/5 bg-white/[0.02] p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h5 className="text-lg font-bold tracking-tight text-white">{post.title}</h5>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--mdt-accent-primary)]">{post.author}</span>
                        <span className="text-xs text-white/30">•</span>
                        <span className="text-xs text-white/40">{formatRelativeTime(post.createdAt, t)}</span>
                      </div>
                    </div>
                    <span className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Note</span>
                  </div>

                  <div className="prose prose-invert max-w-none text-sm leading-relaxed text-white/75 prose-p:my-2 prose-strong:text-white prose-a:text-[var(--mdt-accent-primary)]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
                  </div>

                  {post.images.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {post.images.slice(0, 2).map((image, index) => (
                        <div key={`${post.id}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image} alt={`${post.title}-${index + 1}`} className="h-32 w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          {boardAdmin && (
            <div className="border-t border-white/5 bg-black/20 p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--mdt-accent-primary)]">Admin Controls</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">Compact post composer</p>
                </div>
                <Button variant="ghost" onClick={handleTakeBoardImage} disabled={boardBusy}>
                  <Camera className="mr-2 h-3.5 w-3.5 text-white/70" />
                  {boardBusy ? "Capturing..." : "Image"}
                </Button>
              </div>

              <div className="mt-4 grid gap-3">
                <input
                  value={boardTitle}
                  onChange={(event) => setBoardTitle(event.target.value)}
                  placeholder="Announcement title..."
                  className="w-full rounded-2xl border border-white/10 bg-black/35 p-3 text-sm text-white placeholder:text-white/30 outline-none"
                />
                <textarea
                  value={boardBody}
                  onChange={(event) => setBoardBody(event.target.value)}
                  placeholder="Short update, markdown supported..."
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/35 p-3 text-sm text-white placeholder:text-white/30 outline-none"
                />

                {boardImages.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {boardImages.map((image, index) => (
                      <div key={`${image}-${index}`} className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt={`draft-${index + 1}`} className="h-28 w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setBoardTitle(""); setBoardBody(""); setBoardImages([]); }}>
                    Clear
                  </Button>
                  <Button onClick={handleCreateBoardPost} style={{ backgroundColor: accent }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Publish
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden border border-white/5 bg-[linear-gradient(180deg,rgba(16,19,26,0.98),rgba(11,13,17,0.94))]">
            <div className="flex items-center justify-between border-b border-white/5 p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--mdt-text-muted)]">{t("tablet.sidebar.livemap")}</p>
                <h4 className="mt-1 text-lg font-bold text-white">Live Map</h4>
              </div>
              <Button variant="ghost">Open</Button>
            </div>

            <div className="p-5">
              <div className="relative overflow-hidden rounded-[24px] border border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(255,145,0,0.15),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-5">
                <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="relative z-10 flex min-h-[240px] flex-col justify-between rounded-[20px] border border-white/5 bg-[rgba(5,7,10,0.55)] p-5">
                  <div className="flex items-center justify-between text-xs text-white/45">
                    <span>District coverage</span>
                    <span>Live markers</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-red-400" />
                    <span className="text-sm text-white/80">Current assignment area</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/20 bg-blue-400/10 text-blue-300">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Unit markers</p>
                      <p className="text-xs text-white/45">Shared positions update live</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/45">
                    <span>POIs enabled</span>
                    <span>Route overlay on</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border border-white/5 bg-[linear-gradient(180deg,rgba(16,19,26,0.98),rgba(11,13,17,0.94))]">
            <div className="flex items-center justify-between border-b border-white/5 p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--mdt-text-muted)]">{t("tablet.sidebar.chat")}</p>
                <h4 className="mt-1 text-lg font-bold text-white">Internal chat</h4>
              </div>
              <Button variant="ghost">Open</Button>
            </div>

            <div className="space-y-3 p-5">
              {recentChat.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-white/45">
                  No recent messages.
                </div>
              ) : (
                recentChat.slice(0, 2).map((message) => (
                  <div key={message.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-white/80">
                        {message.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={message.avatarUrl} alt={message.author} className="h-full w-full object-cover" />
                        ) : (
                          renderInitials(message.author)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-white">{message.author}</p>
                          <span className="text-xs text-white/35">{formatRelativeTime(message.createdAt, t)}</span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-white/65">{message.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="rounded-2xl border border-white/5 bg-black/25 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    placeholder={t("tablet.sidebar.chat")}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
                  />
                  <Button onClick={handleSendChat}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border border-white/5 bg-[linear-gradient(180deg,rgba(16,19,26,0.98),rgba(11,13,17,0.94))]">
            <div className="flex items-center justify-between border-b border-white/5 p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--mdt-text-muted)]">{t("tablet.dashboard.stats.active_shift")}</p>
                <h4 className="mt-1 text-lg font-bold text-white">Live activity</h4>
              </div>
              <Button variant="ghost">Refresh</Button>
            </div>

            <div className="space-y-3 p-5">
              {recentActivity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-white/45">
                  No recent activity.
                </div>
              ) : (
                recentActivity.slice(0, 4).map((entry) => {
                  const Icon = activityIcon(entry.kind);
                  return (
                    <div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--mdt-accent-primary)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-white">{entry.title}</p>
                          <span className="text-xs text-white/35">{formatRelativeTime(entry.timestamp, t)}</span>
                        </div>
                        <p className="mt-1 text-sm text-white/60">{entry.detail}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden border border-white/5 bg-[linear-gradient(180deg,rgba(16,19,26,0.98),rgba(11,13,17,0.94))]">
            <div className="flex items-center justify-between border-b border-white/5 p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--mdt-text-muted)]">{t("tablet.dashboard.quick_access")}</p>
                <h4 className="mt-1 text-lg font-bold text-white">Quick actions</h4>
              </div>
              <Button variant="ghost">View all</Button>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {[
                {
                  title: t("tablet.actions.new_person", undefined, "Open Person Record"),
                  description: "Search by name, ID or plate and open the matching record.",
                  icon: Users,
                },
                {
                  title: t("tablet.actions.new_vehicle", undefined, "Open Vehicle Record"),
                  description: "Vehicle holder, insurance, notes and status history.",
                  icon: CarFront,
                },
                {
                  title: t("tablet.actions.new_report", undefined, "Write Report"),
                  description: "Incident, medical, case or internal report depending on role.",
                  icon: FileText,
                },
                {
                  title: t("tablet.actions.penalty_catalog", undefined, "Penalty Catalog"),
                  description: "Issue fines or procedures directly from the codebook.",
                  icon: ClipboardList,
                },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.title} className="group rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/[0.04]">
                    <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2.5 text-[var(--mdt-accent-primary)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white">{action.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/45">{action.description}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="overflow-hidden border border-white/5 bg-[linear-gradient(180deg,rgba(16,19,26,0.98),rgba(11,13,17,0.94))]">
            <div className="flex items-center justify-between border-b border-white/5 p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--mdt-text-muted)]">{t("tablet.sidebar.warrants")}</p>
                <h4 className="mt-1 text-lg font-bold text-white">Service log</h4>
              </div>
              <Button variant="ghost">View all</Button>
            </div>

            <div className="space-y-3 p-5">
              {shifts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-white/45">
                  No shift log entries yet.
                </div>
              ) : (
                shifts.slice(0, 3).map((shift) => (
                  <div key={shift.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{shift.title}</p>
                        <p className="mt-1 text-xs text-white/45">{shift.note || t("tablet.dashboard.shift_hint")}</p>
                      </div>
                      <span className="text-xs text-white/35">{formatRelativeTime(shift.createdAt, t)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {boardAdmin && (
              <div className="border-t border-white/5 bg-black/20 p-5">
                <div className="space-y-3">
                  <input
                    value={shiftTitle}
                    onChange={(event) => setShiftTitle(event.target.value)}
                    placeholder="New shift entry..."
                    className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-white/30 outline-none"
                  />
                  <textarea
                    value={shiftNote}
                    onChange={(event) => setShiftNote(event.target.value)}
                    placeholder="Optional note"
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-white/30 outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => { setShiftTitle(""); setShiftNote(""); }}>
                      Clear
                    </Button>
                    <Button onClick={handleCreateShift} disabled={shiftBusy} style={{ backgroundColor: accent }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add entry
                    </Button>
                  </div>
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