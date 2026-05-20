"use client";

import { useState, useEffect } from "react";
import { Send, Trash2, Radio, Volume2, Wifi, WifiOff, Smartphone, Sparkles, PhoneOff } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";
import { fetchNui } from "../../../../lib/useNui";

export type ChatMessage = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  avatarUrl?: string;
  gradeDisplay?: string;
};

export type RadioMember = {
  source: number;
  name: string;
  gradeDisplay?: string;
  avatarUrl?: string;
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
  radioMembers = [],
  meta,
}: {
  t: TFunction;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onDeleteMessage: (messageId: string) => void;
  actorName: string;
  actorImageUrl?: string;
  currentUserName: string;
  radioMembers?: RadioMember[];
  meta?: any;
}) {
  const [message, setMessage] = useState("");
  
  // Radio System State
  const activeSystem = meta?.radio?.activeSystem || "standalone";
  const [radioFreq, setRadioFreq] = useState(meta?.radio?.activeFrequency || "103.5");
  const [currentFreq, setCurrentFreq] = useState(meta?.radio?.activeFrequency || "");
  const [isTransmitting, setIsTransmitting] = useState(false);

  useEffect(() => {
    if (meta?.radio?.activeFrequency) {
      setRadioFreq(meta.radio.activeFrequency);
      setCurrentFreq(meta.radio.activeFrequency);
    }
  }, [meta?.radio?.activeFrequency]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage("");
  };

  const handleJoinRadio = async () => {
    if (!radioFreq) return;
    try {
      setIsTransmitting(true);
      const res: any = await fetchNui("joinRadioChannel", { frequency: radioFreq });
      if (res?.ok) {
        setCurrentFreq(radioFreq);
      }
    } catch (err) {
      console.error("Failed to join radio", err);
    } finally {
      setTimeout(() => setIsTransmitting(false), 800);
    }
  };

  const handleLeaveRadio = async () => {
    try {
      setIsTransmitting(true);
      const res: any = await fetchNui("leaveRadioChannel");
      if (res?.ok) {
        setCurrentFreq("");
      }
    } catch (err) {
      console.error("Failed to leave radio", err);
    } finally {
      setTimeout(() => setIsTransmitting(false), 800);
    }
  };

  const handleNumpadPress = (val: string) => {
    if (currentFreq) return; // Disallow editing while connected
    setRadioFreq((prev: string) => {
      if (val === "C") return "";
      if (val === "<") return prev.slice(0, -1);
      if (val === "." && prev.includes(".")) return prev;
      if (prev.length >= 6) return prev;
      return prev + val;
    });
  };

  const systemLabel =
    activeSystem === "pma-voice"
      ? "PMA-Voice Active"
      : activeSystem === "saltychat"
      ? "SaltyChat Active"
      : "MDT Standalone Radio";

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-[rgba(255,255,255,0.85)]" />
            {t("tablet.chat.title")}
          </h3>
          <p className="text-sm text-[var(--mdt-text-muted)] mt-1">{t("tablet.chat.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1.5 text-xs text-white/80 font-medium">
          <span className={`w-2 h-2 rounded-full ${currentFreq ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          {currentFreq ? `ON AIR - Channel: ${currentFreq} MHz` : "DISCONNECTED"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left Column: Radio Device */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-full min-h-0">
          <Card className="p-4 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 border-zinc-800/80 rounded-2xl flex-1 flex flex-col justify-between overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="space-y-4">
              {/* Radio Screen */}
              <div className="rounded-xl border border-zinc-800/80 bg-black/40 p-4 relative overflow-hidden shadow-inner flex flex-col gap-2">
                <div className="absolute top-1 right-2 flex items-center gap-1.5">
                  <span className="text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">
                    {systemLabel}
                  </span>
                  {currentFreq ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>
                
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                  Transmitter RF
                </span>
                
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-3xl font-mono font-bold tracking-widest text-emerald-400/90 [text-shadow:0_0_12px_rgba(52,211,153,0.3)]">
                    {radioFreq || "0.0"} <span className="text-sm font-sans text-zinc-400">MHz</span>
                  </div>
                  {currentFreq && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
                      CONNECTED
                    </div>
                  )}
                </div>

                {/* Pulsing Visualizer Waves when connected */}
                {currentFreq ? (
                  <div className="flex items-end gap-1 h-6 mt-2 overflow-hidden px-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-emerald-400/80 rounded-t-sm"
                        style={{
                          height: `${h * 12}%`,
                          animation: `pulse 1.2s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.08}s`
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-6 border-b border-dashed border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600 tracking-wider">
                    STBY FREQ READY
                  </div>
                )}
              </div>

              {/* Digital Numpad Grid */}
              <div className="grid grid-cols-3 gap-2 px-1">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "C"].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleNumpadPress(key)}
                    disabled={!!currentFreq}
                    className="h-10 text-sm font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all active:scale-95 disabled:opacity-40 disabled:hover:bg-zinc-900"
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Transmitter Controls */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex gap-3">
              {currentFreq ? (
                <Button
                  onClick={handleLeaveRadio}
                  disabled={isTransmitting}
                  className="flex-1 bg-red-950/40 border border-red-800/60 hover:bg-red-900/40 text-red-300 rounded-xl h-11 transition-all active:scale-[0.98]"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={handleJoinRadio}
                  disabled={isTransmitting || !radioFreq}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 transition-all active:scale-[0.98] shadow-lg shadow-emerald-950/20"
                >
                  <Radio className="w-4 h-4 mr-2" />
                  Transmit on Freq
                </Button>
              )}
            </div>
          </Card>

          {/* Connected Colleagues Section */}
          <Card className="p-4 bg-zinc-900/90 border-zinc-800/80 rounded-2xl h-[12.5rem] flex flex-col gap-3 overflow-hidden">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
              <span>Channel Colleagues ({radioMembers.length})</span>
              <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
            </h4>
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {radioMembers.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-600 italic">
                  {currentFreq ? "No other users on this frequency." : "Join a frequency to list colleagues."}
                </div>
              ) : (
                radioMembers.map((member) => (
                  <div
                    key={member.source}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs text-white overflow-hidden">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                          renderInitials(member.name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{member.name}</p>
                        {member.gradeDisplay && (
                          <p className="text-[10px] text-zinc-500 truncate">{member.gradeDisplay}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Text Chat */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-full min-h-0">
          <Card className="p-4 bg-zinc-950/80 border-[var(--mdt-border)] rounded-2xl flex-1 flex flex-col gap-4 overflow-hidden shadow-xl">
            <div className="flex-1 overflow-auto space-y-3 pr-1">
              {messages.length === 0 ? (
                <div className="h-full min-h-48 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]">
                  {t("tablet.chat.empty")}
                </div>
              ) : (
                messages.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-3 hover:bg-[rgba(255,255,255,0.03)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0">
                          {item.avatarUrl ? (
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
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--mdt-text-muted)] hover:text-white hover:bg-white/10 transition-all"
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
                  {actorImageUrl ? (
                    <img src={actorImageUrl} alt={actorName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-semibold text-white/80">{actorName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {actorName}
              </div>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={2}
                className="w-full p-3 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-xl text-white text-sm placeholder-[var(--mdt-text-muted)] focus:outline-none focus:border-zinc-700 transition-colors"
                placeholder={t("tablet.chat.placeholder")}
              />
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" className="h-9 rounded-lg" onClick={() => setMessage("")}>
                  {t("cancel")}
                </Button>
                <Button className="h-9 rounded-lg px-4 bg-zinc-200 text-black hover:bg-white" onClick={handleSend}>
                  <Send className="w-4 h-4 mr-2" />
                  {t("tablet.chat.send")}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Visualizer CSS embedded safely */}
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.3; transform: scaleY(0.4); }
          100% { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
