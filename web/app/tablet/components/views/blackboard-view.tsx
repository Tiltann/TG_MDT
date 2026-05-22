"use client";

import { useMemo, useState } from "react";
import { Camera, Plus, ClipboardList, Sparkles, BookOpen, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";

type BoardPost = {
  id: string;
  title: string;
  body: string;
  images: string[];
  author: string;
  createdAt: string;
  expiresAt?: string;
  avatarUrl?: string;
  gradeDisplay?: string;
};

type BlackboardViewProps = {
  t: TFunction;
  boardPosts: BoardPost[];
  boardAdmin: boolean;
  onTakeBoardImage?: () => Promise<string | null>;
  onCreateBoardPost?: (post: { title: string; body: string; images: string[]; expiresAt?: string }) => void;
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

export default function BlackboardView({ t, boardPosts, boardAdmin, onTakeBoardImage, onCreateBoardPost }: BlackboardViewProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [expiryHours, setExpiryHours] = useState("48");
  const [showAllPosts, setShowAllPosts] = useState(false);

  const visibleBoardPosts = useMemo(
    () => (showAllPosts ? boardPosts : boardPosts.slice(0, 6)),
    [boardPosts, showAllPosts]
  );

  const handleTakeImage = async () => {
    if (!boardAdmin || !onTakeBoardImage) return;
    setBusy(true);
    try {
      const image = await onTakeBoardImage();
      if (image && image.trim() !== "") {
        setImages((prev) => [...prev, image.trim()].slice(0, 6));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreatePost = () => {
    if (!boardAdmin) return;
    const nextTitle = title.trim();
    const nextBody = body.trim();
    if (nextTitle === "" || nextBody === "") return;
    const hours = Number.parseInt(expiryHours, 10);
    const boundedHours = Number.isFinite(hours) ? Math.max(1, Math.min(48, hours)) : 48;
    const expiresAt = new Date(Date.now() + boundedHours * 60 * 60 * 1000).toISOString();

    onCreateBoardPost?.({ title: nextTitle, body: nextBody, images, expiresAt });
    setTitle("");
    setBody("");
    setImages([]);
    setExpiryHours("48");
  };

  return (
    <div className="h-full flex flex-col gap-4 min-h-0 animate-mdt-view">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
            <BookOpen className="w-6 h-6 text-zinc-400" />
            {t("tablet.sidebar.blackboard")}
          </h3>
          <p className="text-xs text-[var(--mdt-text-muted)] mt-1">{t("tablet.dashboard.black_board_hint")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs text-zinc-300 font-bold uppercase tracking-wider shadow-sm">
            {boardPosts.length} Active Posts
          </div>
          {boardPosts.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllPosts((prev) => !prev)}
              className="rounded-full border border-zinc-800 bg-black/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white"
            >
              {showAllPosts ? "Show less" : `Show all (${boardPosts.length})`}
            </button>
          )}
        </div>
      </div>

      <Card className="p-5 flex-1 bg-zinc-950/80 border-[var(--mdt-border)] rounded-2xl flex flex-col gap-5 overflow-hidden shadow-2xl">
        <div className="flex-1 min-h-0 overflow-auto pr-1.5 space-y-4 premium-scroll">
          {boardPosts.length === 0 ? (
            <div className="h-full min-h-48 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 p-10 text-center animate-mdt-scale-in">
              <ClipboardList className="w-10 h-10 text-zinc-600 mb-3 animate-pulse" />
              <p className="text-sm font-bold text-zinc-300">{t("tablet.blackboard.empty_title")}</p>
              <p className="mt-1 max-w-xs text-xs text-zinc-500 leading-normal">
                {t("tablet.dashboard.black_board_hint")}
              </p>
            </div>
          ) : (
            visibleBoardPosts.map((post, index) => (
              <article 
                key={post.id} 
                style={{ animationDelay: `${index * 55}ms`, animationFillMode: "both" }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/15 p-5 hover-card-grow hover:bg-zinc-900/25 group animate-mdt-fade-in-up opacity-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-9.5 w-9.5 overflow-hidden rounded-full border border-zinc-800 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center shrink-0 shadow-md">
                      {post.avatarUrl ? (
                        <img src={post.avatarUrl} alt={post.author} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[11px] font-black text-amber-400 tracking-wider">{renderInitials(post.author)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors truncate tracking-tight">{post.title}</h5>
                      <p className="text-[10.5px] font-medium text-zinc-500 truncate mt-0.5">
                        <span className="text-amber-400/80 font-bold">{post.author}</span>
                        {post.gradeDisplay ? ` • ${post.gradeDisplay}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-bold text-zinc-600 shrink-0 uppercase tracking-wider mt-1">
                    {formatRelativeTime(post.createdAt, t)}
                  </span>
                </div>

                <div className="prose prose-invert max-w-none mt-4 text-xs leading-relaxed text-zinc-300 prose-p:my-1.5 prose-li:my-0.5 font-medium border-t border-zinc-800/40 pt-3">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
                </div>

                {post.images.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {post.images.map((image, index) => (
                      <div key={`${post.id}-${index}`} className="overflow-hidden rounded-xl border border-zinc-800 bg-black/40 relative group/img shadow-md">
                        <img src={image} alt={`${post.title}-${index + 1}`} className="h-44 w-full object-cover group-hover/img:scale-102 transition-transform duration-500" />
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {boardAdmin && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-4 shrink-0 glass-panel animate-mdt-scale-in">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-500">{t("tablet.blackboard.admin_title")}</p>
                <p className="text-xs font-bold text-white mt-0.5">{t("tablet.blackboard.admin_subtitle")}</p>
              </div>
              <Button 
                variant="ghost" 
                onClick={handleTakeImage} 
                disabled={busy}
                className="h-9 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/60 hover-glow-accent text-xs font-semibold"
              >
                <Camera className="w-4 h-4 mr-2 text-zinc-400" />
                {busy ? t("tablet.blackboard.capturing") : t("tablet.blackboard.add_image")}
              </Button>
            </div>

            <div className="grid gap-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("tablet.blackboard.title_placeholder")}
                className="w-full rounded-xl border border-zinc-800/80 bg-black/40 p-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700/80 focus:ring-1 focus:ring-[var(--mdt-accent-primary)]/20 transition-all"
              />
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={t("tablet.blackboard.body_placeholder")}
                rows={3}
                className="w-full rounded-xl border border-zinc-800/80 bg-black/40 p-3 text-xs text-white outline-none resize-none placeholder:text-zinc-600 focus:border-zinc-700/80 focus:ring-1 focus:ring-[var(--mdt-accent-primary)]/20 transition-all"
              />
              {images.length > 0 && (
                <div className="grid gap-2 grid-cols-6 animate-mdt-scale-in">
                  {images.map((image, index) => (
                    <div key={`${image}-${index}`} className="overflow-hidden rounded-lg border border-zinc-800 bg-black/40 relative group/draft">
                      <img src={image} alt={`draft-${index + 1}`} className="h-14 w-full object-cover" />
                      <button 
                        onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== index))}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 p-0.5 rounded-full text-white w-4 h-4 flex items-center justify-center text-[10px] shadow-md transition-all scale-90 opacity-80 hover:opacity-100"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  {t("tablet.blackboard.auto_delete")}
                </label>
                <select
                  value={expiryHours}
                  onChange={(event) => setExpiryHours(event.target.value)}
                  className="dispatch-input px-2 py-1 text-xs"
                >
                  <option value="1">1h</option>
                  <option value="2">2h</option>
                  <option value="6">6h</option>
                  <option value="12">12h</option>
                  <option value="24">24h</option>
                  <option value="48">48h</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button 
                  variant="ghost" 
                  className="h-9 text-xs rounded-xl"
                  onClick={() => { setTitle(""); setBody(""); setImages([]); }}
                >
                  {t("tablet.actions.clear")}
                </Button>
                <Button 
                  onClick={handleCreatePost}
                  disabled={!title.trim() || !body.trim()}
                  className="h-9 text-xs rounded-xl px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold shadow-md shadow-amber-950/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:from-amber-500 disabled:hover:to-orange-600"
                >
                  <Plus className="w-4 h-4 mr-1.5 stroke-[3]" />
                  {t("tablet.blackboard.publish")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
