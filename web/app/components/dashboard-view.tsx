"use client";

import { useState } from "react";
import { RadioReceiver, FileText, MapPin, MessageSquare, CalendarDays, Users, CarFront, BellRing } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import Modal from "./ui/modal";

type Branding = {
  greeting?: string;
  name?: string;
  accent?: string;
};

export function DashboardView({ branding }: { branding: Branding; modules: Record<string, boolean> }) {
  const [newRecordOpen, setNewRecordOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const accent = branding.accent || "#ff9100";

  const handleCreateRecord = (e: any) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    setSavedMessage(`Eintrag "${title}" erstellt`);
    setNewRecordOpen(false);
    setTimeout(() => setSavedMessage(""), 4000);
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-white">{branding.greeting || "Good morning, Agent Nova."}</h2>
          <p className="text-[var(--mdt-text-muted)] mt-1">Deine Übersicht über Akten, Teamstatus, Nachrichten und Live-Daten.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setQuickActionOpen(true)}>Schnellzugriff</Button>
          <Button variant="primary" onClick={() => setNewRecordOpen(true)} style={{ backgroundColor: accent }}>Neue Akte</Button>
        </div>
      </div>

      {savedMessage && <div className="p-3 rounded-md bg-[rgba(255,255,255,0.02)] text-sm text-[var(--mdt-text-active)] shrink-0">{savedMessage}</div>}

      <div className="grid grid-cols-3 gap-4 shrink-0">
        <Card className="p-5 flex items-center gap-5 border-b-2 border-b-[var(--mdt-accent-primary)]">
          <div className="p-3 bg-orange-500/10 rounded-lg text-[var(--mdt-accent-primary)]">
            <RadioReceiver className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--mdt-text-muted)] font-medium uppercase tracking-wider">Eigene Einsätze</p>
            <p className="text-3xl font-bold text-white leading-tight">12</p>
            <p className="text-xs text-[var(--mdt-text-muted)]">Offene Fälle heute</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-5 border-b-2 border-b-[var(--mdt-status-low)]">
          <div className="p-3 bg-blue-500/10 rounded-lg text-[var(--mdt-status-low)]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--mdt-text-muted)] font-medium uppercase tracking-wider">News & Hinweise</p>
            <p className="text-3xl font-bold text-white leading-tight">4</p>
            <p className="text-xs text-[var(--mdt-status-low)]">Neue Mitteilungen</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-5 border-b-2 border-b-[var(--mdt-status-success)]">
          <div className="p-3 bg-green-500/10 rounded-lg text-[var(--mdt-status-success)]">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--mdt-text-muted)] font-medium uppercase tracking-wider">Schichtstatus</p>
            <p className="text-3xl font-bold text-white leading-tight">7h 24m</p>
            <p className="text-xs text-[var(--mdt-status-success)]">Aktive Schicht</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between shrink-0">
            <h4 className="card-title">Aktive Einträge</h4>
            <Button variant="ghost" onClick={() => setViewAllOpen(true)}>View All</Button>
          </div>
          <div className="flex-1 overflow-auto">
            <ul className="space-y-3">
              <li className="flex items-start justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[var(--mdt-text-muted)]">10:42</span>
                    <p className="text-sm text-white font-medium">Neue Personenakte</p>
                  </div>
                  <p className="text-xs text-[var(--mdt-text-muted)]">Name-Suche, Foto, Register und Verknüpfungen</p>
                </div>
                <div className="px-2 py-1 bg-red-500/10 text-xs text-[var(--mdt-status-high)] font-semibold rounded">HIGH</div>
              </li>
              <li className="flex items-start justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[var(--mdt-text-muted)]">10:30</span>
                    <p className="text-sm text-white font-medium">Fahrzeugakte geprüft</p>
                  </div>
                  <p className="text-xs text-[var(--mdt-text-muted)]">Halter, Versicherung, Vermerke und Status</p>
                </div>
                <div className="px-2 py-1 bg-orange-500/10 text-xs text-[var(--mdt-status-medium)] font-semibold rounded">MEDIUM</div>
              </li>
              <li className="flex items-start justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[var(--mdt-text-muted)]">10:15</span>
                    <p className="text-sm text-white font-medium">Bericht zur Freigabe</p>
                  </div>
                  <p className="text-xs text-[var(--mdt-text-muted)]">Einsatzbericht, Anzeige oder Behandlungsnotiz</p>
                </div>
                <div className="px-2 py-1 bg-blue-500/10 text-xs text-[var(--mdt-status-low)] font-semibold rounded">LOW</div>
              </li>
            </ul>
          </div>
        </Card>

        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h4 className="card-title">Live Map</h4>
            <Button variant="ghost">View Map</Button>
          </div>
          <div className="flex-1 bg-[#0b0d11] rounded-md border border-[var(--mdt-border)] flex items-center justify-center relative overflow-hidden">
             <MapPin className="w-10 h-10 text-[var(--mdt-text-muted)] opacity-50 absolute" />
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,145,0,0.12),transparent_55%)]" />
             <div className="absolute bottom-4 left-4 text-xs text-[var(--mdt-text-muted)]">Kollegen, Marker, Einsätze und POIs</div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between shrink-0">
            <h4 className="card-title">Schicht / Team</h4>
            <Button variant="ghost">View All</Button>
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
                <div className="text-xs text-green-500 font-semibold">ON SCENE</div>
              </li>
              <li className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <div>
                    <p className="text-sm text-white font-medium">J-14</p>
                    <p className="text-xs text-[var(--mdt-text-muted)]">Jurist M. Smith</p>
                  </div>
                </div>
                <div className="text-xs text-orange-500 font-semibold">EN ROUTE</div>
              </li>
              <li className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-sm text-white font-medium">T-22</p>
                    <p className="text-xs text-[var(--mdt-text-muted)]">Technik D. Jones</p>
                  </div>
                </div>
                <div className="text-xs text-blue-500 font-semibold">AVAILABLE</div>
              </li>
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h4 className="card-title">Arbeitsvorschau</h4>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs text-red-500 font-semibold">REC</span>
            </div>
          </div>
          <div className="flex-1 bg-[#0b0d11] rounded-md border border-[var(--mdt-border)] flex items-end p-4 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 w-full h-full"></div>
             <p className="text-sm text-white font-mono z-20">Modular preview - role based widget space</p>
          </div>
        </Card>
        
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between shrink-0">
            <h4 className="card-title">Modulstatus</h4>
            <Button variant="ghost">View All</Button>
          </div>
          <div className="flex-1 overflow-auto">
            <ul className="space-y-3">
              <li className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--mdt-bg-base)] rounded flex items-center justify-center text-[var(--mdt-text-muted)] border border-[var(--mdt-border)]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Personenakte</p>
                    <p className="text-xs text-[var(--mdt-text-muted)]">Foto, Identität, Register, Lizenzen und Freigaben</p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-red-500/10 text-xs text-[var(--mdt-status-high)] font-semibold rounded">ACTIVE</div>
              </li>
              <li className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.01)] rounded-md border border-[var(--mdt-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--mdt-bg-base)] rounded flex items-center justify-center text-[var(--mdt-text-muted)] border border-[var(--mdt-border)]">
                    <CarFront className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Fahrzeugakte</p>
                    <p className="text-xs text-[var(--mdt-text-muted)]">Halter, Versicherung, Vermerke und Status</p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-red-500/10 text-xs text-[var(--mdt-status-high)] font-semibold rounded">ACTIVE</div>
              </li>
            </ul>
          </div>
        </Card>
      </div>

      <Modal open={newRecordOpen} onClose={() => setNewRecordOpen(false)} title="Neue Akte">
        <form onSubmit={handleCreateRecord} className="space-y-3">
          <div>
            <label className="block text-xs mdt-muted mb-1">Titel</label>
            <input name="title" required className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md" />
          </div>
          <div>
            <label className="block text-xs mdt-muted mb-1">Kategorie</label>
            <input name="location" className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewRecordOpen(false)}>Abbrechen</Button>
            <Button type="submit">Erstellen</Button>
          </div>
        </form>
      </Modal>

      <Modal open={quickActionOpen} onClose={() => setQuickActionOpen(false)} title="Quick Action">
        <div className="space-y-3">
          <p className="card-sub">Schnellzugriffe für modulare Arbeit</p>
          <div className="flex gap-2">
            <Button onClick={() => { setQuickActionOpen(false); setSavedMessage('Schnellsuche geöffnet'); setTimeout(()=>setSavedMessage(''),3000); }}>Akte suchen</Button>
            <Button onClick={() => { setQuickActionOpen(false); setSavedMessage('Interner Chat geöffnet'); setTimeout(()=>setSavedMessage(''),3000); }} variant="ghost">Funk / Chat</Button>
          </div>
        </div>
      </Modal>

      <Modal open={viewAllOpen} onClose={() => setViewAllOpen(false)} title="Alle Einträge">
        <div className="space-y-3">
          <p className="card-sub">Vorschau für den modularen Dashboard-Flow</p>
          <ul className="mt-2 space-y-2">
            <li className="p-2 bg-[rgba(255,255,255,0.02)] rounded">Personenakte — Identität geprüft</li>
            <li className="p-2 bg-[rgba(255,255,255,0.02)] rounded">Fahrzeugakte — Versicherung offen</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}

export default DashboardView;
