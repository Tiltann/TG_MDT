"use client";

import { useMemo, useState, useEffect } from "react";
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
  const EQUALIZER_HEIGHTS = [30, 55, 45, 80, 25, 60, 75, 40, 65, 50, 85, 30, 55, 70, 35, 90, 45, 60, 30, 55, 75, 40, 80, 45];
  const [message, setMessage] = useState("");
  
  // Radio System State
  const activeSystem = meta?.radio?.activeSystem || "disabled";
  const radioEnabled = meta?.radio?.enabled !== false && activeSystem !== "disabled";
  const [radioFreq, setRadioFreq] = useState(meta?.radio?.activeFrequency || "103.5");
  const [currentFreq, setCurrentFreq] = useState(meta?.radio?.activeFrequency || "");
  const [isTransmitting, setIsTransmitting] = useState(false);
  const visibleMessages = useMemo(() => messages.slice(-80), [messages]);
  const hiddenMessageCount = Math.max(0, messages.length - visibleMessages.length);

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
    if (!radioEnabled) return;
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
    if (!radioEnabled) return;
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
    if (!radioEnabled) return;
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
      : activeSystem === "standalone"
      ? "MDT Standalone Radio"
      : "Radio Disabled";

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
          <span className={`w-2 h-2 rounded-full ${radioEnabled && currentFreq ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          {radioEnabled ? (currentFreq ? `ON AIR - Channel: ${currentFreq} MHz` : "DISCONNECTED") : "RADIO DISABLED"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left Column: Radio Device */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-full min-h-0">
          <Card className="p-5 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 border-zinc-800/80 rounded-2xl flex-1 flex flex-col justify-between overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="space-y-5">
              {/* Radio Screen - Glowing CRT LCD look */}
              <div className="rounded-xl border border-emerald-500/20 bg-black/60 p-4 relative overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),_0_0_15px_rgba(16,185,129,0.03)] flex flex-col gap-2 radio-led-screen">
                {/* Scanline pattern overlay */}
                <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.06]" />
                {/* Glowing gradient back-light */}
                <div className="absolute -inset-10 bg-radial-glow pointer-events-none opacity-[0.12]" />

                <div className="absolute top-1.5 right-2.5 flex items-center gap-1.5 z-10">
                  <span className="text-[8px] font-bold tracking-widest text-zinc-500 uppercase">
                    {systemLabel}
                  </span>
                  {currentFreq ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>
                
                <span className="text-[10px] text-emerald-500/60 uppercase tracking-widest  font-bold flex items-center gap-1.5 z-10">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500/50" />
                  Transmitter RF
                </span>
                
                <div className="flex items-baseline justify-between mt-1 z-10">
                  <div className="text-3xl  font-bold tracking-widest text-emerald-400 [text-shadow:0_0_12px_rgba(52,211,153,0.55)]">
                    {radioFreq || "0.0"} <span className="text-sm font-sans text-emerald-500/60 font-semibold">MHz</span>
                  </div>
                  {currentFreq && (
                    <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-extrabold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded tracking-wider shadow-[0_0_8px_rgba(52,211,153,0.25)]">
                      CONNECTED
                    </div>
                  )}
                </div>

                {/* Pulsing Visualizer Waves when connected */}
                {currentFreq ? (
                  <div className="flex items-end gap-[3px] h-8 mt-2 overflow-hidden px-1 bg-black/40 py-1.5 rounded-lg border border-emerald-950/30">
                    {EQUALIZER_HEIGHTS.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-emerald-400/85 rounded-t-[1px] origin-bottom animate-mdt-wave-equalizer"
                        style={{
                          height: `${h}%`,
                          animationDelay: `${i * 0.03}s`
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-8 border-b border-dashed border-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 tracking-widest ">
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
                    disabled={!!currentFreq || !radioEnabled}
                    className="h-11 text-sm  font-semibold rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/60 hover:text-emerald-400 hover:border-emerald-500/30 transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:hover:bg-zinc-900/90 disabled:active:scale-100 shadow-sm"
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Transmitter Controls */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex gap-3">
              {currentFreq && radioEnabled ? (
                <Button
                  onClick={handleLeaveRadio}
                  disabled={isTransmitting || !radioEnabled}
                  className="flex-1 bg-red-950/40 border border-red-800/60 hover:bg-red-900/40 text-red-300 rounded-xl h-11 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-black/20"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={handleJoinRadio}
                  disabled={isTransmitting || !radioFreq || !radioEnabled}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-emerald-950/30"
                >
                  <Radio className="w-4 h-4 mr-2 animate-pulse" />
                  Transmit on Freq
                </Button>
              )}
            </div>
          </Card>

          {/* Connected Colleagues Section */}
          <Card className="p-4 bg-zinc-900/40 border-zinc-800/80 rounded-2xl h-[12.5rem] flex flex-col gap-3 overflow-hidden glass-panel">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
              <span>Channel Colleagues ({radioMembers.length})</span>
              <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
            </h4>
            <div className="flex-1 overflow-auto space-y-2 pr-1 premium-scroll">
              {radioMembers.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
                  {!radioEnabled
                    ? "Radio is disabled by server configuration."
                    : currentFreq
                      ? "No other users on this frequency."
                      : "Join a frequency to list colleagues."}
                </div>
              ) : (
                radioMembers.map((member, i) => (
                  <div
                    key={member.source}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800/40 hover:bg-zinc-900/60 hover:border-zinc-800 transition-all duration-200 animate-mdt-fade-in-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/5 flex items-center justify-center text-xs font-semibold text-zinc-300 overflow-hidden">
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
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Text Chat */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-full min-h-0">
          <Card className="p-5 bg-zinc-950/40 border-zinc-800/80 rounded-2xl flex-1 flex flex-col gap-4 overflow-hidden shadow-2xl relative glass-panel">
            {hiddenMessageCount > 0 && (
              <div className="rounded-xl border border-zinc-800/60 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Showing newest {visibleMessages.length} of {messages.length} messages
              </div>
            )}
            <div className="flex-1 overflow-auto space-y-3.5 pr-1.5 premium-scroll">
              {visibleMessages.length === 0 ? (
                <div className="h-full min-h-48 flex items-center justify-center text-sm text-zinc-500 italic">
                  {t("tablet.chat.empty")}
                </div>
              ) : (
                visibleMessages.map((item, i) => {
                  const isMe = item.author === currentUserName;
                  return (
                    <div
                      key={item.id}
                      className={`group rounded-2xl border p-3.5 transition-all duration-300 relative animate-mdt-fade-in-up ${
                        isMe
                          ? "bg-zinc-900/20 border-emerald-500/10 hover:bg-zinc-900/30 hover:border-emerald-500/20"
                          : "bg-zinc-950/30 border-zinc-800/60 hover:bg-zinc-950/50 hover:border-zinc-800"
                      }`}
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      {isMe && (
                        <div className="absolute top-0 bottom-0 left-0 w-[3px] rounded-l-2xl bg-emerald-500/75 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 overflow-hidden rounded-full border border-white/5 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center shrink-0 shadow-inner">
                            {item.avatarUrl ? (
                              <img src={item.avatarUrl} alt={item.author} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-300">{renderInitials(item.author)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{item.author}</p>
                            {item.gradeDisplay && (
                              <p className="text-[10px] text-zinc-500 truncate mt-0.5">{item.gradeDisplay}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-zinc-500  tracking-wider">
                            {formatRelativeTime(item.createdAt, t)}
                          </span>
                          {item.author === currentUserName && (
                            <button
                              type="button"
                              onClick={() => onDeleteMessage(item.id)}
                              className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 rounded-full border border-red-500/10 bg-red-950/20 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-red-400 hover:text-white hover:bg-red-900/40 hover:border-red-500/30 transition-all duration-200"
                              title={t("tablet.chat.delete_message", undefined, "Delete message")}
                            >
                              <Trash2 className="h-3 w-3" />
                              {t("tablet.chat.delete_message", undefined, "Delete")}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-300 mt-2.5 whitespace-pre-wrap break-words leading-relaxed font-sans pl-1">
                        {item.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Composer Box */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/10 p-3.5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
                  <div className="h-7 w-7 overflow-hidden rounded-full border border-white/5 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center shrink-0">
                    {actorImageUrl ? (
                      <img src={actorImageUrl} alt={actorName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-300">
                        {actorName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                    <span className="text-zinc-300 font-medium">{actorName}</span>
                  </div>
                </div>
                <div className="text-[10px]  text-zinc-500 tracking-wider">
                  {message.length} chars
                </div>
              </div>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                rows={2}
                className="w-full p-3 bg-black/40 border border-zinc-800/60 focus:border-zinc-700/80 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none transition-all duration-300 resize-none"
                placeholder={t("tablet.chat.placeholder")}
              />
              <div className="flex items-center justify-end gap-2">
                <span className="mr-auto text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Ctrl+Enter to send
                </span>
                <Button
                  variant="ghost"
                  className="h-9 rounded-xl hover:bg-zinc-900/60 text-zinc-400 hover:text-white transition-all active:scale-95 duration-100"
                  onClick={() => setMessage("")}
                >
                  {t("cancel")}
                </Button>
                <Button
                  className="h-9 rounded-xl px-4 bg-zinc-100 text-black hover:bg-white transition-all active:scale-95 duration-100 shadow-lg shadow-black/25 flex items-center font-medium"
                  onClick={handleSend}
                >
                  <Send className="w-3.5 h-3.5 mr-2" />
                  {t("tablet.chat.send")}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* High-Fidelity Radio CRT Scanline Styles */}
      <style jsx global>{`
        .bg-scanlines {
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%, 
            rgba(0, 0, 0, 0.25) 50%
          ), linear-gradient(
            90deg, 
            rgba(16, 185, 129, 0.04), 
            rgba(16, 185, 129, 0.01), 
            rgba(16, 185, 129, 0.04)
          );
          background-size: 100% 4px, 4px 100%;
        }
        .bg-radial-glow {
          background: radial-gradient(
            circle, 
            rgba(16, 185, 129, 0.15) 0%, 
            rgba(0, 0, 0, 0) 70%
          );
        }
      `}</style>
    </div>
  );
}
