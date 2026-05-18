"use client";

import { useState } from "react";
import { RadioReceiver, MapPin, MessageSquare, CalendarDays, Users, CarFront } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import Modal from "./ui/modal";
import type { TFunction } from "../lib/i18n";

type Branding = {
  greeting?: string;
  name?: string;
  accent?: string;
};

export function DashboardView({
  branding,
  t,
}: {
  branding: Branding;
  modules: Record<string, boolean>;
  t: TFunction;
}) {
  const [newRecordOpen, setNewRecordOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const accent = branding.accent || "#ff9100";

  const handleCreateRecord = (e: any) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    setSavedMessage(t("tablet.dashboard.record_created", { title }));
    setNewRecordOpen(false);
    setTimeout(() => setSavedMessage(""), 4000);
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-white">{branding.greeting || t("tablet.dashboard.greeting_default")}</h2>
          <p className="text-[var(--mdt-text-muted)] mt-1">{t("tablet.dashboard.overview_subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setQuickActionOpen(true)}>{t("tablet.dashboard.quick_access")}</Button>
          <Button variant="primary" onClick={() => setNewRecordOpen(true)} style={{ backgroundColor: accent }}>{t("tablet.dashboard.new_record")}</Button>
        </div>
      </div>

      {savedMessage && <div className="p-3 rounded-md bg-[rgba(255,255,255,0.02)] text-sm text-[var(--mdt-text-active)] shrink-0">{savedMessage}</div>}

      <div className="grid grid-cols-3 gap-4 shrink-0">
        <Card className="p-5 flex items-center gap-5 border-b-2 border-b-[var(--mdt-accent-primary)]">
          <div className="p-3 bg-orange-500/10 rounded-lg text-[var(--mdt-accent-primary)]">
            <RadioReceiver className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--mdt-text-muted)] font-medium uppercase tracking-wider">{t("tablet.dashboard.stats.own_calls")}</p>
            <p className="text-3xl font-bold text-white leading-tight">12</p>
            <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.dashboard.stats.open_cases_today")}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-5 border-b-2 border-b-[var(--mdt-status-low)]">
          <div className="p-3 bg-blue-500/10 rounded-lg text-[var(--mdt-status-low)]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--mdt-text-muted)] font-medium uppercase tracking-wider">{t("tablet.dashboard.stats.news_hints")}</p>
            <p className="text-3xl font-bold text-white leading-tight">4</p>
            <p className="text-xs text-[var(--mdt-status-low)]">{t("tablet.dashboard.stats.new_messages")}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-5 border-b-2 border-b-[var(--mdt-status-success)]">
          <div className="p-3 bg-green-500/10 rounded-lg text-[var(--mdt-status-success)]">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--mdt-text-muted)] font-medium uppercase tracking-wider">{t("tablet.dashboard.stats.shift_status")}</p>
            <p className="text-3xl font-bold text-white leading-tight">7h 24m</p>
            <p className="text-xs text-[var(--mdt-status-success)]">{t("tablet.dashboard.stats.active_shift")}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between shrink-0">
            <h4 className="card-title">{t("tablet.dashboard.active_entries")}</h4>
            <Button variant="ghost" onClick={() => setViewAllOpen(true)}>{t("tablet.actions.view_all")}</Button>
          </div>
          <div className="flex-1 overflow-auto">
            <ul className="space-y-3">
              <li className="flex items-start justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[var(--mdt-text-muted)]">10:42</span>
                    <p className="text-sm text-white font-medium">{t("tablet.dashboard.entries.new_person_file")}</p>
                  </div>
                  <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.dashboard.entries.new_person_file_desc")}</p>
                </div>
                <div className="px-2 py-1 bg-red-500/10 text-xs text-[var(--mdt-status-high)] font-semibold rounded">HIGH</div>
              </li>
              <li className="flex items-start justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[var(--mdt-text-muted)]">10:30</span>
                    <p className="text-sm text-white font-medium">{t("tablet.dashboard.entries.vehicle_file_reviewed")}</p>
                  </div>
                  <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.dashboard.entries.vehicle_file_reviewed_desc")}</p>
                </div>
                <div className="px-2 py-1 bg-orange-500/10 text-xs text-[var(--mdt-status-medium)] font-semibold rounded">MEDIUM</div>
              </li>
              <li className="flex items-start justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[var(--mdt-text-muted)]">10:15</span>
                    <p className="text-sm text-white font-medium">{t("tablet.dashboard.entries.report_ready")}</p>
                  </div>
                  <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.dashboard.entries.report_ready_desc")}</p>
                </div>
                <div className="px-2 py-1 bg-blue-500/10 text-xs text-[var(--mdt-status-low)] font-semibold rounded">LOW</div>
              </li>
            </ul>
          </div>
        </Card>

        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h4 className="card-title">{t("tablet.dashboard.live_map")}</h4>
            <Button variant="ghost">{t("tablet.actions.view_map")}</Button>
          </div>
          <div className="flex-1 bg-[#0b0d11] rounded-md border border-[var(--mdt-border)] flex items-center justify-center relative overflow-hidden">
             <MapPin className="w-10 h-10 text-[var(--mdt-text-muted)] opacity-50 absolute" />
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,145,0,0.12),transparent_55%)]" />
             <div className="absolute bottom-4 left-4 text-xs text-[var(--mdt-text-muted)]">{t("tablet.dashboard.live_map_desc")}</div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between shrink-0">
            <h4 className="card-title">{t("tablet.dashboard.shift_team")}</h4>
            <Button variant="ghost">{t("tablet.actions.view_all")}</Button>
          </div>
          <div className="flex-1 overflow-auto">
            <ul className="space-y-3">
              <li className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div>
                    <p className="text-sm text-white font-medium">M-10</p>
                    <p className="text-xs text-[var(--mdt-text-muted)]">Medic J. Carter</p>
                  </div>
                </div>
                <div className="text-xs text-green-500 font-semibold">{t("tablet.status.on_scene")}</div>
              </li>
              <li className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <div>
                    <p className="text-sm text-white font-medium">J-14</p>
                    <p className="text-xs text-[var(--mdt-text-muted)]">Jurist M. Smith</p>
                  </div>
                </div>
                <div className="text-xs text-orange-500 font-semibold">{t("tablet.status.en_route")}</div>
              </li>
              <li className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-sm text-white font-medium">T-22</p>
                    <p className="text-xs text-[var(--mdt-text-muted)]">Technik D. Jones</p>
                  </div>
                </div>
                <div className="text-xs text-blue-500 font-semibold">{t("tablet.status.available")}</div>
              </li>
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h4 className="card-title">{t("tablet.dashboard.workflow_preview")}</h4>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs text-red-500 font-semibold">REC</span>
            </div>
          </div>
          <div className="flex-1 bg-[#0b0d11] rounded-md border border-[var(--mdt-border)] flex items-end p-4 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 w-full h-full"></div>
             <p className="text-sm text-white font-mono z-20">{t("tablet.dashboard.workflow_preview_desc")}</p>
          </div>
        </Card>
        
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between shrink-0">
            <h4 className="card-title">{t("tablet.dashboard.module_status")}</h4>
            <Button variant="ghost">{t("tablet.actions.view_all")}</Button>
          </div>
          <div className="flex-1 overflow-auto">
            <ul className="space-y-3">
              <li className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--mdt-bg-base)] rounded flex items-center justify-center text-[var(--mdt-text-muted)] border border-[var(--mdt-border)]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{t("tablet.dashboard.modules.person_file")}</p>
                    <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.dashboard.modules.person_file_desc")}</p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-red-500/10 text-xs text-[var(--mdt-status-high)] font-semibold rounded">{t("tablet.status.active")}</div>
              </li>
              <li className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--mdt-bg-base)] rounded flex items-center justify-center text-[var(--mdt-text-muted)] border border-[var(--mdt-border)]">
                    <CarFront className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{t("tablet.dashboard.modules.vehicle_file")}</p>
                    <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.dashboard.modules.vehicle_file_desc")}</p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-red-500/10 text-xs text-[var(--mdt-status-high)] font-semibold rounded">{t("tablet.status.active")}</div>
              </li>
            </ul>
          </div>
        </Card>
      </div>

      <Modal open={newRecordOpen} onClose={() => setNewRecordOpen(false)} title={t("tablet.dashboard.new_record")}>
        <form onSubmit={handleCreateRecord} className="space-y-3">
          <div>
            <label className="block text-xs mdt-muted mb-1">{t("tablet.form.title")}</label>
            <input name="title" required className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md" />
          </div>
          <div>
            <label className="block text-xs mdt-muted mb-1">{t("tablet.form.category")}</label>
            <input name="location" className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewRecordOpen(false)}>{t("cancel")}</Button>
            <Button type="submit">{t("tablet.form.create")}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={quickActionOpen} onClose={() => setQuickActionOpen(false)} title={t("tablet.dashboard.quick_action")}>
        <div className="space-y-3">
          <p className="card-sub">{t("tablet.dashboard.quick_action_sub")}</p>
          <div className="flex gap-2">
            <Button onClick={() => { setQuickActionOpen(false); setSavedMessage(t("tablet.dashboard.quick_search_opened")); setTimeout(()=>setSavedMessage(''),3000); }}>{t("tablet.dashboard.search_record")}</Button>
            <Button onClick={() => { setQuickActionOpen(false); setSavedMessage(t("tablet.dashboard.internal_chat_opened")); setTimeout(()=>setSavedMessage(''),3000); }} variant="ghost">{t("tablet.sidebar.chat")}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={viewAllOpen} onClose={() => setViewAllOpen(false)} title={t("tablet.dashboard.all_entries")}>
        <div className="space-y-3">
          <p className="card-sub">{t("tablet.dashboard.all_entries_sub")}</p>
          <ul className="mt-2 space-y-2">
            <li className="p-2 bg-[rgba(255,255,255,0.02)] rounded">{t("tablet.dashboard.all_entries_item_one")}</li>
            <li className="p-2 bg-[rgba(255,255,255,0.02)] rounded">{t("tablet.dashboard.all_entries_item_two")}</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}

export default DashboardView;
