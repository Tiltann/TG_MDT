"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Clock3,
  CarFront,
  FileText,
  Layers3,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Users,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
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

// ...existing code...

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
  searchedPersons?: Array<{
    identifier: string;
    name: string;
    status?: string;
  }>;
  boardPosts?: BoardPost[];
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

function ClockBadge({ label }: { label: string }) {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      setCurrentTime(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
    };

    updateClock();
    const interval = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return <span>{currentTime || label}</span>;
}

export function DashboardView({
  branding,
  t,
  modules: _modules,
  data,
  onSendChat,
  onTakeBoardImage: _onTakeBoardImage,
  onCreateBoardPost: _onCreateBoardPost,
  onShortcutNavigate,
}: {
  branding: Branding;
  modules?: Record<string, boolean>;
  t: TFunction;
  data?: DashboardData;
  onSendChat?: (text: string) => void;
  onTakeBoardImage?: () => Promise<string | null>;
  onCreateBoardPost?: (post: { title: string; body: string; images: string[] }) => void;
  onShortcutNavigate?: (screen: DashboardShortcutScreen) => void;
}) {
  const isOnDuty = Boolean(data?.dutyState?.onDuty);
  const personsCount = data?.personsCount ?? 0;
  const vehiclesCount = data?.vehiclesCount ?? 0;
  const actorName = data?.actorName || t("tablet.player.unknown_user");
  const recentChat = data?.recentChat || [];
  const recentIncidents = data?.recentIncidents || [];
  const recentBolos = data?.recentBolos || [];
  const searchedPersons = data?.searchedPersons || [];
  const boardPosts = data?.boardPosts || [];
  const accent = branding.accent || "#ff9100";
  const sortedBoardPosts = useMemo(
    () => [...boardPosts].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    [boardPosts]
  );
  const [showAllBoardPosts, setShowAllBoardPosts] = useState(false);
  const visibleBoardPosts = useMemo(
    () => (showAllBoardPosts ? sortedBoardPosts : sortedBoardPosts.slice(0, 6)),
    [showAllBoardPosts, sortedBoardPosts]
  );

  const [chatDraft, setChatDraft] = useState("");

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
      accentLine: "from-amber-500 to-amber-600",
    },
    {
      label: t("tablet.dashboard.stats.vehicles", undefined, "Vehicles"),
      value: vehiclesCount,
      icon: CarFront,
      glow: "hover:border-blue-500/40 hover:shadow-blue-500/5",
      tone: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      accentLine: "from-blue-500 to-cyan-400",
    },
    {
      label: t("tablet.dashboard.stats.incidents", undefined, "Incidents"),
      value: recentIncidents.length,
      icon: Activity,
      glow: "hover:border-rose-500/40 hover:shadow-rose-500/5",
      tone: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      accentLine: "from-rose-500 to-red-600",
    },
    {
      label: t("tablet.dashboard.stats.bolos", undefined, "BOLOs"),
      value: recentBolos.length,
      icon: AlertTriangle,
      glow: "hover:border-violet-500/40 hover:shadow-violet-500/5",
      tone: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      accentLine: "from-violet-500 to-purple-600",
    },
  ];

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-3 pb-4 flex flex-col gap-6 premium-scroll animate-in fade-in duration-500">
      
      {/* 1. Welcoming Dynamic Banner */}
      <div className="relative overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-br from-zinc-955 via-zinc-900 to-black p-6 lg:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.55)] group">
        {/* Tech decorative corners */}
        <div className="absolute top-4 left-4 w-3.5 h-3.5 border-t-2 border-l-2 border-zinc-700/60 pointer-events-none" />
        <div className="absolute top-4 right-4 w-3.5 h-3.5 border-t-2 border-r-2 border-zinc-700/60 pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-3.5 h-3.5 border-b-2 border-l-2 border-zinc-700/60 pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-3.5 h-3.5 border-b-2 border-r-2 border-zinc-700/60 pointer-events-none" />

        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,145,0,0.14),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_48%)] transition-all duration-1000 group-hover:scale-105" />
        
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl space-y-3.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px]  font-black uppercase tracking-[0.25em] text-zinc-400 shadow-sm backdrop-blur-md">
              <Layers3 className="h-3 w-3 text-[var(--mdt-accent-primary)] animate-pulse" />
              {branding.subtitle || t("tablet.branding.subtitle")}
            </div>

            <h2 className="text-3xl lg:text-5xl  font-black tracking-tight text-white leading-none">
              {branding.greeting || t("tablet.dashboard.greeting_default")}
              {actorName !== t("tablet.player.unknown_user") && (
                <span className="block mt-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent [text-shadow:0_4px_12px_rgba(245,158,11,0.15)] uppercase">
                  {actorName}
                </span>
              )}
            </h2>

            <p className="max-w-md text-xs lg:text-sm text-zinc-400 font-medium leading-relaxed ">
              {t("tablet.dashboard.overview_subtitle")}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px]  font-semibold tracking-wide transition-all shadow-md ${
                isOnDuty 
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
                  : "border-amber-500/20 bg-amber-500/10 text-amber-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-amber-400"}`} />
                {isOnDuty ? t("tablet.dashboard.stats.active_shift") : t("tablet.topbar.duty_off")}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[10px]  font-semibold text-zinc-300 shadow-md">
                <Clock3 className="h-3 w-3 text-zinc-400" />
                <ClockBadge label={branding.timeLabel || t("tablet.topbar.date_fallback")} />
              </div>
            </div>
          </div>

          {/* Stat Grid inside Welcome Banner */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-fit ">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card 
                  key={stat.label} 
                  className={`rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4 transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl relative overflow-hidden group/card ${stat.glow}`}
                >
                  {/* Category Accent Line */}
                  <div className={`absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r ${stat.accentLine}`} />
                  
                  <div className={`inline-flex rounded-xl border p-2 shrink-0 ${stat.tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="mt-3.5 text-3xl font-black leading-none text-white tracking-tight">{stat.value}</p>
                  <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500 truncate">{stat.label}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Content Row: Blackboard & Sidebar Log */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(460px,1fr)] flex-1 min-h-0">
        
        {/* Left Column: Blackboard */}
        <Card className="overflow-hidden border border-zinc-900 bg-zinc-950/30 rounded-3xl flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-900 bg-black/25 px-6 py-4">
            <div>
              <p className="text-[8px]  font-black uppercase tracking-[0.25em] text-zinc-500">{t("tablet.dashboard.black_board")}</p>
              <h4 className="mt-0.5 text-lg  font-black tracking-tight text-white flex items-center gap-1.5 uppercase">
                <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                {t("tablet.dashboard.black_board_title")}
              </h4>
            </div>
            <div className="rounded-full border border-zinc-900 bg-black/50 px-3 py-0.5 text-[9px]  font-bold text-zinc-400">
              {sortedBoardPosts.length} ACTIVE NOTICES
            </div>
            {sortedBoardPosts.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllBoardPosts((prev) => !prev)}
                className="ml-3 rounded-full border border-zinc-900 bg-black/40 px-3 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-zinc-800 hover:text-white"
              >
                {showAllBoardPosts ? "Show less" : `Show all (${sortedBoardPosts.length})`}
              </button>
            )}
          </div>

          <div className="space-y-4 p-5 overflow-y-auto max-h-[30rem] premium-scroll">
            {sortedBoardPosts.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-900 bg-black/10 px-6 py-8 text-center ">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 border border-zinc-900 text-zinc-650">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-zinc-400">{t("tablet.blackboard.empty_posts")}</p>
                <p className="mt-1 max-w-xs text-[10px] text-zinc-650 leading-relaxed">{t("tablet.dashboard.black_board_hint")}</p>
              </div>
            ) : (
              visibleBoardPosts.map((post, index) => (
                <article 
                  key={post.id} 
                  className="rounded-2xl border border-zinc-900 bg-black/15 p-5 hover:border-zinc-800 transition-all duration-300 relative group animate-mdt-fade-in-up"
                  style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
                >
                  {/* Spine bar decoration */}
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-amber-500/60 to-orange-600/40 rounded-l-2xl group-hover:from-amber-400 transition-colors" />

                  <div className="mb-3.5 flex items-start justify-between gap-3 ">
                    <div className="min-w-0 pl-1">
                      <h5 className="text-sm font-bold tracking-tight text-white uppercase group-hover:text-[var(--mdt-accent-primary)] transition-colors">{post.title}</h5>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[10px] font-black text-amber-500/80 uppercase">{post.author}</span>
                        <span className="text-zinc-800 text-[10px]">•</span>
                        <span className="text-[10px] text-zinc-500 font-semibold">{formatRelativeTime(post.createdAt, t)}</span>
                      </div>
                    </div>
                    <span className="rounded border border-zinc-900 bg-zinc-950 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 shrink-0">{t("tablet.blackboard.announcement_tag")}</span>
                  </div>

                  <div className="prose prose-invert max-w-none text-xs leading-relaxed text-zinc-300 font-medium pl-1 prose-p:my-1.5 prose-strong:text-white prose-strong:font-bold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{post.body}</ReactMarkdown>
                  </div>

                  {post.images.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 pl-1">
                      {post.images.map((image, idx) => (
                        <div key={`${post.id}-${idx}`} className="overflow-hidden rounded-xl border border-zinc-900 bg-zinc-950/40 relative group/img">
                          <img src={image} alt={`${post.title}-${idx + 1}`} className="h-28 w-full object-cover group-hover/img:scale-102 transition-transform duration-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

        </Card>

        {/* Right Column: Dynamic Side Widgets */}
        <div className="space-y-6 flex flex-col min-h-0">

          {/* SEARCHED Alert Panel */}
          <Card className="overflow-hidden border border-red-900/70 bg-gradient-to-b from-red-950/45 to-black/40 rounded-3xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-red-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                SEARCHED BY FACTION
              </h4>
              <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                {searchedPersons.length}
              </span>
            </div>

            {searchedPersons.length === 0 ? (
              <p className="rounded-xl border border-zinc-900 bg-black/25 px-3 py-2 text-xs text-zinc-500 italic">
                {t("tablet.persons.not_flagged", undefined, "No searched persons right now.")}
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto premium-scroll space-y-2 pr-1">
                {searchedPersons.map((entry) => (
                  <div key={entry.identifier} className="rounded-xl border border-red-800/40 bg-red-950/20 px-3 py-2">
                    <p className="text-sm font-bold text-red-200 truncate">{entry.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-red-300/80 mt-0.5">
                      {entry.status || t("tablet.status.searched", undefined, "SEARCHED")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          
          {/* Quick Actions Panel */}
          <Card className="overflow-hidden border border-zinc-900 bg-zinc-950/30 rounded-3xl p-4 shadow-xl">
            <h4 className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-3.5">
              {t("tablet.dashboard.quick_access")}
            </h4>
            <div className="grid gap-2.5 grid-cols-1 2xl:grid-cols-2">
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
                    className="group min-w-0 rounded-2xl border border-zinc-900 bg-black/15 p-3.5 hover:border-zinc-800 hover:bg-black/30 transition-all duration-300 text-left active:scale-[0.97] cursor-pointer"
                  >
                    <div className={`inline-flex rounded-xl border p-2 ${act.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="mt-3 text-xs font-bold text-white group-hover:text-[var(--mdt-accent-primary)] transition-colors flex items-center gap-1 tracking-wide break-words">
                      {act.title}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
                    </p>
                    <p className="mt-1 text-[9px] text-zinc-500 leading-normal font-medium">{act.desc}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Radio Chat Panel */}
          <Card className="overflow-hidden border border-zinc-900 bg-zinc-950/30 rounded-3xl flex-1 flex flex-col justify-between shadow-xl min-h-[300px]">
            <div className="bg-black/35 border-b border-zinc-900 shrink-0 px-4 py-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {t("tablet.sidebar.chat", undefined, "Radio / Chat")}
              </h4>
            </div>

            <>
              <div className="space-y-3 p-5 overflow-y-auto max-h-[14rem] flex-1 premium-scroll">
                {recentChat.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-900 bg-black/10 p-5 text-center text-xs text-zinc-650 italic ">
                    {t("tablet.chat.empty")}
                  </div>
                ) : (
                  recentChat.slice(0, 6).map((message, idx) => (
                    <div 
                      key={message.id || idx} 
                      className="rounded-xl border border-zinc-900/60 bg-black/20 p-3.5 flex justify-between items-start hover:border-zinc-800 transition-all "
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-zinc-200 truncate">{message.author}</p>
                          {message.gradeDisplay && (
                            <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-900 text-zinc-500 font-bold uppercase tracking-wider shrink-0">{message.gradeDisplay}</span>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-400 font-medium whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
                      </div>
                      <span className="text-[8.5px] text-zinc-600 font-semibold shrink-0">{formatRelativeTime(message.createdAt, t)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-zinc-900 bg-black/25 p-4.5 shrink-0 ">
                <div className="flex gap-2">
                  <input
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSendChat();
                      }
                    }}
                    placeholder={t("tablet.chat.placeholder")}
                    className="w-full rounded-xl border border-zinc-900 bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-650 outline-none focus:border-zinc-800 transition-colors"
                  />
                  <Button 
                    onClick={handleSendChat} 
                    disabled={!chatDraft.trim()} 
                    className="h-9 text-[10px] font-bold rounded-xl px-4 bg-zinc-200 text-black hover:bg-white transition-all shrink-0 active:scale-95 uppercase tracking-wider"
                  >
                    {t("tablet.chat.send")}
                  </Button>
                </div>
              </div>
            </>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;