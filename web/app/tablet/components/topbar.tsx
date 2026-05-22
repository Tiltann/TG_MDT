"use client";

import { useEffect, useRef, useState } from "react";
import { Power, Search, X } from "lucide-react";
import type { TFunction } from "../lib/i18n";

type Branding = {
  accent?: string;
  dateLabel?: string;
  timeLabel?: string;
};

type SearchSuggestion = {
  id: string;
  label: string;
  subtitle: string;
};

type DutyState = {
  enabled?: boolean;
  onDuty?: boolean;
  switchJobEnabled?: boolean;
};

type DispatchStatusOption = {
  code: string;
  label: string;
};

export function Topbar({
  branding,
  t,
  searchValue,
  onSearchChange,
  searchSuggestions,
  onSearchSelect,
  onSearchSubmit,
  dutyState,
  dispatchStatus,
  dispatchStatusOptions,
  onDispatchStatusChange,
  isDutyBusy,
  onToggleDuty,
  onClose,
}: {
  branding: Branding;
  t: TFunction;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchSuggestions: SearchSuggestion[];
  onSearchSelect: (id: string) => void;
  onSearchSubmit: () => void;
  dutyState: DutyState;
  dispatchStatus: string;
  dispatchStatusOptions: DispatchStatusOption[];
  onDispatchStatusChange: (status: string) => void;
  isDutyBusy: boolean;
  onToggleDuty: () => void;
  onClose: () => void;
}) {
  const isOnDuty = dutyState?.onDuty !== false;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    if (searchValue.trim().length === 0) {
      setShowSuggestions(false);
    }
  }, [searchValue]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      setCurrentTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      setCurrentDate(`${day}.${month}.${year}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-transparent">
      
      {/* Global Search */}
      <div className="relative w-96">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-(--mdt-text-muted)" />
        <input 
          ref={inputRef}
          type="text" 
          value={searchValue}
          onChange={(event) => {
            onSearchChange(event.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (searchValue.trim().length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setShowSuggestions(false), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearchSubmit();
              setShowSuggestions(false);
              inputRef.current?.blur();
            }
          }}
          placeholder={t("tablet.topbar.search_placeholder")}
          className="w-full bg-(--mdt-bg-panel) border border-(--mdt-border) rounded-full py-2 pl-10 pr-4 text-sm text-(--mdt-text-active) placeholder-(--mdt-text-muted) focus:outline-none focus:border-(--mdt-text-muted) transition-colors"
        />

        {showSuggestions && searchValue.trim().length > 0 && searchSuggestions.length > 0 && (
          <div className="absolute top-11 left-0 right-0 z-30 rounded-xl border border-(--mdt-border) bg-(--mdt-bg-panel) overflow-hidden shadow-xl">
            {searchSuggestions.map((result) => (
              <button
                key={result.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSearchSelect(result.id);
                  setShowSuggestions(false);
                  inputRef.current?.blur();
                }}
                className="w-full text-left px-3 py-2 hover:bg-[rgba(255,255,255,0.05)] border-b border-(--mdt-border) last:border-b-0"
              >
                <p className="text-sm text-white font-medium truncate">{result.label}</p>
                <p className="text-xs text-(--mdt-text-muted) truncate">{result.subtitle}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6">
        <button
          onClick={onToggleDuty}
          disabled={isDutyBusy}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isOnDuty
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15"
              : "bg-yellow-500/10 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/15"
          }`}
          title={t("tablet.topbar.toggle_duty")}
        >
          <Power className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider font-semibold">
            {isDutyBusy
              ? t("loading")
              : isOnDuty
                ? t("tablet.topbar.duty_on")
                : t("tablet.topbar.duty_off")}
          </span>
        </button>

        {isOnDuty && dispatchStatusOptions.length > 0 && (
          <div className="inline-flex items-center gap-2 px-2 py-2 rounded-lg border border-(--mdt-border) bg-(--mdt-bg-panel)">
            <span className="text-[10px] uppercase tracking-wider text-(--mdt-text-muted) font-semibold">
              {t("tablet.dispatch.my_status", undefined, "Status")}
            </span>
            <select
              value={dispatchStatus}
              onChange={(event) => onDispatchStatusChange(event.target.value)}
              className="rounded bg-transparent text-xs text-white outline-none"
            >
              {dispatchStatusOptions.map((option) => (
                <option key={option.code} value={option.code} className="bg-(--mdt-bg-panel) text-white">
                  {option.code} - {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="text-right">
          <p className="text-white font-medium">{currentTime || branding.timeLabel || t("tablet.topbar.date_fallback")}</p>
          <p className="text-xs text-(--mdt-text-muted) uppercase tracking-wider">{currentDate || branding.dateLabel || t("tablet.topbar.date_fallback")}</p>
        </div>

        <button 
          onClick={onClose}
          className="p-2 rounded-lg bg-(--mdt-bg-panel) border border-(--mdt-border) text-red-400 hover:bg-red-500/10 transition-colors"
          title={t("tablet.topbar.close_tablet")}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

    </header>
  );
}