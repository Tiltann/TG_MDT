"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";

export type ChatMessage = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  avatarUrl?: string;
  gradeDisplay?: string;
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

export default function ChatView({
  t,
  messages,
  onSend,
  onDeleteMessage,
  actorName,
  actorImageUrl,
  currentUserName,
}: {
  t: TFunction;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onDeleteMessage: (messageId: string) => void;
  actorName: string;
  actorImageUrl?: string;
  currentUserName: string;
}) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage("");
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h3 className="text-2xl card-title">{t("tablet.chat.title")}</h3>
        <p className="card-sub mt-1">{t("tablet.chat.subtitle")}</p>
      </div>

      <Card className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
        <div className="flex-1 overflow-auto space-y-3 pr-1">
          {messages.length === 0 ? (
            <div className="h-full min-h-48 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]">
              {t("tablet.chat.empty")}
            </div>
          ) : (
            messages.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-3">
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
                      <p className="text-sm text-white font-medium truncate">{item.author}</p>
                      {item.gradeDisplay && <p className="text-[11px] text-[var(--mdt-text-muted)] truncate">{item.gradeDisplay}</p>}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-[var(--mdt-text-muted)]">{formatRelativeTime(item.createdAt, t)}</span>
                    {item.author === currentUserName && (
                      <button
                        type="button"
                        onClick={() => onDeleteMessage(item.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--mdt-text-muted)] hover:text-white hover:bg-white/10"
                        title={t("tablet.chat.delete_message", undefined, "Delete message")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("tablet.chat.delete_message", undefined, "Delete")}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[var(--mdt-text-muted)] mt-2 whitespace-pre-wrap break-words">{item.text}</p>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-3 space-y-3">
          <div className="flex items-center gap-3 text-xs text-[var(--mdt-text-muted)] uppercase tracking-[0.22em]">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0">
              {actorImageUrl ? <img src={actorImageUrl} alt={actorName} className="h-full w-full object-cover" /> : <span className="text-[10px] font-semibold text-white/80">{actorName.slice(0, 2).toUpperCase()}</span>}
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {actorName}
          </div>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            className="w-full p-3 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-xl text-white"
            placeholder={t("tablet.chat.placeholder")}
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setMessage("")}>{t("cancel")}</Button>
            <Button onClick={handleSend}>
              <Send className="w-4 h-4 mr-2" />
              {t("tablet.chat.send")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
