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
  Sparkles,
  ArrowRight,
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

type DashboardShortcutScreen = "persons" | "vehicles" | "penalties" | "chat";

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
  onShortcutNavigate,
}: {
  branding: Branding;
  modules?: Record<string, boolean>;
  t: TFunction;
  data?: DashboardData;
  onSendChat?: (text: string) => void;
  onTakeBoardImage?: () => Promise<string | null>;
  onCreateBoardPost?: (post: { title: string; body: string; images: string[] }) => void;
  onCreateShift?: (shift: { title: string; note: string }) => void;
  onShortcutNavigate?: (screen: DashboardShortcutScreen) => void;
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
      glow: "hover:border-amber-500/40 hover:shadow-amber-500/5",
      tone: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    {
      label: t("tablet.dashboard.stats.vehicles", undefined, "Vehicles"),
      value: vehiclesCount,
      icon: CarFront,
      glow: "hover:border-blue-500/40 hover:shadow-blue-500/5",
      tone: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      label: t("tablet.dashboard.stats.incidents", undefined, "Incidents"),
      value: recentIncidents.length,
      icon: Activity,
      glow: "hover:border-rose-500/40 hover:shadow-rose-500/5",
      tone: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
    {
      label: t("tablet.dashboard.stats.bolos", undefined, "BOLOs"),
      value: recentBolos.length,
      icon: AlertTriangle,
      glow: "hover:border-violet-500/40 hover:shadow-violet-500/5",
      tone: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    },
  ];

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-3 pb-4 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent animate-in fade-in duration-500">
      
      {/* 1. Welcoming Dynamic Banner */}
      <div className="relative overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 lg:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,145,0,0.18),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_48%)] transition-all duration-1000 group-hover:scale-105" />
        
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 shadow-sm backdrop-blur-md">
              <Layers3 className="h-3.5 w-3.5 text-[var(--mdt-accent-primary)] animate-pulse" />
              {branding.subtitle || t("tablet.branding.subtitle")}
            </div>

            <h2 className="text-3xl lg:text-5xl font-black tracking-tight text-white leading-none">
              {branding.greeting || t("tablet.dashboard.greeting_default")}
              {actorName !== t("tablet.player.unknown_user") && (
                <span className="block mt-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent [text-shadow:0_4px_12px_rgba(245,158,11,0.15)]">
                  {actorName}
                </span>
              )}
            </h2>

            <p className="max-w-md text-xs lg:text-sm text-zinc-400 font-medium leading-relaxed">
              {t("tablet.dashboard.overview_subtitle")}
            </p>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tracking-wide transition-all shadow-md ${
                isOnDuty 
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
                  : "border-amber-500/20 bg-amber-500/10 text-amber-400"
              }`}>
                <span className={`w-2 h-2 rounded-full ${isOnDuty ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {isOnDuty ? t("tablet.dashboard.stats.active_shift") : t("tablet.topbar.duty_off")}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold text-zinc-300 shadow-md">
                <Clock3 className="h-3.5 w-3.5 text-zinc-400" />
                {branding.timeLabel || t("tablet.topbar.date_fallback")}
              </div>
            </div>
          </div>

          {/* Stat Grid inside Welcome Banner */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-fit">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card 
                  key={stat.label} 
                  className={`min-w-[135px] rounded-2xl border border-zinc-800/80 bg-black/40 p-4 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${stat.glow}`}
                >
                  <div className={`inline-flex rounded-xl border p-2 shrink-0 ${stat.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-4 text-3xl font-black leading-none text-white tracking-tight">{stat.value}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">{stat.label}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Content Row: Blackboard & Sidebar Log */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr] flex-1 min-h-0">
        
        {/* Left Column: Blackboard */}
        <Card className="overflow-hidden border border-zinc-800/80 bg-zinc-950/40 rounded-3xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">{t("tablet.dashboard.black_board")}</p>
              <h4 className="mt-0.5 text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                {t("tablet.dashboard.black_board_title")}
              </h4>
            </div>
            <div className="rounded-full border border-zinc-800 bg-black/35 px-3 py-1 text-[11px] font-semibold text-zinc-400">
              {boardPosts.length} updates
            </div>
          </div>

          <div className="space-y-4 p-6 overflow-y-auto max-h-[30rem] scrollbar-thin scrollbar-thumb-zinc-800">
            {boardPosts.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-white/[0.01] px-6 py-8 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
                  <CalendarDays className="h-5 w-5 animate-bounce" />
                </div>
                <p className="text-sm font-bold text-zinc-300">{t("tablet.blackboard.empty_posts")}</p>
                <p className="mt-1 max-w-xs text-xs text-zinc-500">{t("tablet.dashboard.black_board_hint")}</p>
              </div>
            ) : (
              boardPosts.slice(0, 2).map((post) => (
                <article 
                  key={post.id} 
                  className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 hover:border-zinc-700/80 transition-all duration-300 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h5 className="text-base font-bold tracking-tight text-white">{post.title}</h5>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-amber-400/80">{post.author}</span>
                        <span className="text-zinc-700 text-xs">•</span>
                        <span className="text-[11px] text-zinc-500">{formatRelativeTime(post.createdAt, t)}</span>
                      </div>
                    </div>
                    <span className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 shrink-0">{t("tablet.blackboard.announcement_tag")}</span>
                  </div>

                  <div className="prose prose-invert max-w-none text-xs leading-relaxed text-zinc-300 prose-p:my-1.5 prose-strong:text-white prose-a:text-amber-400 font-medium">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
                  </div>

                  {post.images.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {post.images.slice(0, 2).map((image, index) => (
                        <div key={`${post.id}-${index}`} className="overflow-hidden rounded-xl border border-zinc-800 bg-black/40 relative group/img">
                          <img src={image} alt={`${post.title}-${index + 1}`} className="h-28 w-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          {boardAdmin && (
            <div className="border-t border-zinc-800/80 bg-zinc-900/10 p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-500">{t("tablet.blackboard.admin_title")}</p>
                  <p className="text-xs font-bold text-white">{t("tablet.blackboard.admin_subtitle")}</p>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={handleTakeBoardImage} 
                  disabled={boardBusy}
                  className="h-8.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/40 text-xs"
                >
                  <Camera className="mr-1.5 h-3.5 w-3.5 text-zinc-400" />
                  {boardBusy ? t("tablet.blackboard.capturing") : t("tablet.blackboard.add_image")}
                </Button>
              </div>

              <div className="grid gap-3">
                <input
                  value={boardTitle}
                  onChange={(event) => setBoardTitle(event.target.value)}
                  placeholder={t("tablet.blackboard.title_placeholder")}
                  className="w-full rounded-xl border border-zinc-800/80 bg-black/30 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
                />
                <textarea
                  value={boardBody}
                  onChange={(event) => setBoardBody(event.target.value)}
                  placeholder={t("tablet.blackboard.body_placeholder")}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-zinc-800/80 bg-black/30 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
                />

                {boardImages.length > 0 && (
                  <div className="grid gap-2 grid-cols-4">
                    {boardImages.map((image, index) => (
                      <div key={`${image}-${index}`} className="overflow-hidden rounded-lg border border-zinc-800 bg-black/40 relative">
                        <img src={image} alt={`draft-${index + 1}`} className="h-14 w-full object-cover" />
                        <button 
                          onClick={() => setBoardImages((prev) => prev.filter((_, idx) => idx !== index))}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black/90 p-0.5 rounded text-white"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button 
                    variant="ghost" 
                    className="h-8.5 text-xs rounded-lg"
                    onClick={() => { setBoardTitle(""); setBoardBody(""); setBoardImages([]); }}
                  >
                    {t("tablet.actions.clear")}
                  </Button>
                  <Button 
                    onClick={handleCreateBoardPost} 
                    className="h-8.5 text-xs rounded-lg px-4 bg-zinc-200 text-black hover:bg-white transition-all"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t("tablet.blackboard.publish")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Right Column: Dynamic Side Widgets */}
        <div className="space-y-6 flex flex-col min-h-0">
          
          {/* Quick Actions Panel */}
          <Card className="overflow-hidden border border-zinc-800/80 bg-zinc-950/40 rounded-3xl p-5 shadow-lg">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 mb-3.5">
              {t("tablet.dashboard.quick_access")}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: t("tablet.actions.new_person", undefined, "Person Search"),
                  desc: t("tablet.dashboard.shortcut.persons_desc"),
                  screen: "persons" as const,
                  icon: Users,
                  color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
                },
                {
                  title: t("tablet.actions.new_vehicle", undefined, "Vehicle Search"),
                  desc: t("tablet.dashboard.shortcut.vehicles_desc"),
                  screen: "vehicles" as const,
                  icon: CarFront,
                  color: "text-blue-400 border-blue-500/20 bg-blue-500/5",
                },
                {
                  title: t("tablet.actions.penalty_catalog", undefined, "Penalty Catalog"),
                  desc: t("tablet.dashboard.shortcut.penalties_desc"),
                  screen: "penalties" as const,
                  icon: ClipboardList,
                  color: "text-rose-400 border-rose-500/20 bg-rose-500/5",
                },
                {
                  title: t("tablet.sidebar.chat", undefined, "Radio Channels"),
                  desc: t("tablet.dashboard.shortcut.chat_desc"),
                  screen: "chat" as const,
                  icon: MessageSquare,
                  color: "text-violet-400 border-violet-500/20 bg-violet-500/5",
                },
              ].map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.title}
                    type="button"
                    onClick={() => onShortcutNavigate?.(act.screen)}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-900/10 p-3.5 hover:border-zinc-700/80 transition-all hover:bg-zinc-900/20 duration-300"
                  >
                    <div className={`inline-flex rounded-xl border p-2 ${act.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-xs font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1">
                      {act.title}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-500 leading-normal font-medium">{act.desc}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Active Shifts Service Log */}
          <Card className="overflow-hidden border border-zinc-800/80 bg-zinc-950/40 rounded-3xl flex-1 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-800/80 p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">{t("tablet.sidebar.shifts")}</p>
                <h4 className="mt-0.5 text-base font-bold text-white tracking-tight">{t("tablet.shifts.log_title")}</h4>
              </div>
            </div>

            <div className="space-y-2.5 p-5 overflow-y-auto max-h-[14rem] scrollbar-thin scrollbar-thumb-zinc-800">
              {shifts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 bg-white/[0.01] p-5 text-center text-xs text-zinc-500 italic">
                  {t("tablet.shifts.log_empty")}
                </div>
              ) : (
                shifts.slice(0, 3).map((sh) => (
                  <div 
                    key={sh.id} 
                    className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-3 flex justify-between items-start hover:border-zinc-700 transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white truncate">{sh.title}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500 truncate">{sh.note || t("tablet.shifts.log_note_fallback")}</p>
                    </div>
                    <span className="text-[9px] text-zinc-600 font-bold shrink-0">{formatRelativeTime(sh.createdAt, t)}</span>
                  </div>
                ))
              )}
            </div>

            {boardAdmin && (
              <div className="border-t border-zinc-800/80 bg-zinc-900/10 p-5">
                <div className="space-y-2">
                  <input
                    value={shiftTitle}
                    onChange={(event) => setShiftTitle(event.target.value)}
                    placeholder={t("tablet.shifts.input_title_placeholder")}
                    className="w-full rounded-xl border border-zinc-800/80 bg-black/35 px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
                  />
                  <textarea
                    value={shiftNote}
                    onChange={(event) => setShiftNote(event.target.value)}
                    placeholder={t("tablet.shifts.input_note_placeholder")}
                    rows={1}
                    className="w-full resize-none rounded-xl border border-zinc-800/80 bg-black/35 px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button 
                      variant="ghost" 
                      className="h-8 text-[11px] rounded-lg"
                      onClick={() => { setShiftTitle(""); setShiftNote(""); }}
                    >
                      {t("tablet.actions.clear")}
                    </Button>
                    <Button 
                      onClick={handleCreateShift} 
                      disabled={shiftBusy || !shiftTitle.trim()} 
                      className="h-8 text-[11px] rounded-lg px-3 bg-zinc-200 hover:bg-white text-black transition-colors"
                    >
                      {t("tablet.shifts.add_entry")}
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