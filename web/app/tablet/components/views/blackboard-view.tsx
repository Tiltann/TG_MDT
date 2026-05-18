"use client";

import { useState } from "react";
import { Camera, Plus } from "lucide-react";
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
  avatarUrl?: string;
  gradeDisplay?: string;
};

type BlackboardViewProps = {
  t: TFunction;
  boardPosts: BoardPost[];
  boardAdmin: boolean;
  onTakeBoardImage?: () => Promise<string | null>;
  onCreateBoardPost?: (post: { title: string; body: string; images: string[] }) => void;
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
    onCreateBoardPost?.({ title: nextTitle, body: nextBody, images });
    setTitle("");
    setBody("");
    setImages([]);
  };

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <div>
        <h3 className="text-2xl card-title">{t("tablet.sidebar.blackboard")}</h3>
        <p className="card-sub mt-1">{t("tablet.dashboard.black_board_hint")}</p>
      </div>

      <Card className="p-4 flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
        <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-3">
          {boardPosts.length === 0 ? (
            <div className="h-full min-h-48 flex items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-[var(--mdt-text-muted)]">
              {t("tablet.dashboard.black_board_hint")}
            </div>
          ) : (
            boardPosts.map((post) => (
              <article key={post.id} className="rounded-3xl border border-white/8 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0">
                      {post.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.avatarUrl} alt={post.author} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-semibold text-white/80">{renderInitials(post.author)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-base font-semibold text-white truncate">{post.title}</h5>
                      <p className="text-[11px] text-[var(--mdt-text-muted)] truncate">
                        {post.author}
                        {post.gradeDisplay ? ` • ${post.gradeDisplay}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--mdt-text-muted)]">{formatRelativeTime(post.createdAt, t)}</span>
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
              <Button variant="ghost" onClick={handleTakeImage} disabled={busy}>
                <Camera className="w-4 h-4 mr-2" />
                {busy ? "Capturing..." : "Take image"}
              </Button>
            </div>

            <div className="grid gap-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Post title"
                className="w-full rounded-2xl border border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] p-3 text-white outline-none"
              />
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write markdown here..."
                rows={5}
                className="w-full rounded-2xl border border-[var(--mdt-border)] bg-[var(--mdt-bg-base)] p-3 text-white outline-none resize-none"
              />
              {images.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {images.map((image, index) => (
                    <div key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt={`draft-${index + 1}`} className="h-32 w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => { setTitle(""); setBody(""); setImages([]); }}>
                  Clear
                </Button>
                <Button onClick={handleCreatePost}>
                  <Plus className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
