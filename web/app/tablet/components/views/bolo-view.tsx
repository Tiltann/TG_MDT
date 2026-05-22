"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import Modal from "../ui/modal";
import type { TFunction } from "../../lib/i18n";

export type BoloRecord = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "active" | "resolved";
  linkedPersons: string[];
  linkedVehicles: string[];
  createdAt: string;
  updatedAt: string;
};

type PersonRecord = { identifier: string; name?: string | null; firstname?: string | null; lastname?: string | null };
type VehicleRecord = { plate: string; ownerName?: string | null; model?: string | number | null };

type DraftBolo = {
  title: string;
  description: string;
  priority: BoloRecord["priority"];
  status: BoloRecord["status"];
  linkedPersons: string[];
  linkedVehicles: string[];
};

const EMPTY_DRAFT: DraftBolo = {
  title: "",
  description: "",
  priority: "medium",
  status: "active",
  linkedPersons: [],
  linkedVehicles: [],
};

const priorityTone: Record<BoloRecord["priority"], string> = {
  low: "text-sky-300 bg-sky-500/10",
  medium: "text-orange-300 bg-orange-500/10",
  high: "text-red-300 bg-red-500/10",
};

const statusTone: Record<BoloRecord["status"], string> = {
  active: "text-red-300 bg-red-500/10",
  resolved: "text-emerald-300 bg-emerald-500/10",
};

function getPersonLabel(person: PersonRecord): string {
  return person.name || [person.firstname, person.lastname].filter(Boolean).join(" ") || person.identifier;
}

function getVehicleLabel(vehicle: VehicleRecord): string {
  return `${vehicle.plate}${vehicle.model ? ` • ${vehicle.model}` : ""}`;
}

function MatchChip({
  selected,
  label,
  sublabel,
  onClick,
}: {
  selected: boolean;
  label: string;
  sublabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
        selected
          ? "border-[rgba(255,145,0,0.35)] bg-[rgba(255,145,0,0.12)]"
          : "border-[var(--mdt-border)] bg-white/5 hover:bg-white/10"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md border ${
          selected
            ? "border-[var(--mdt-accent-primary)] bg-[var(--mdt-accent-primary)] text-black"
            : "border-white/20 bg-transparent text-transparent"
        }`}
      >
        <Check className="h-3 w-3" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white truncate">{label}</span>
        {sublabel ? <span className="block text-xs text-[var(--mdt-text-muted)] truncate">{sublabel}</span> : null}
      </span>
    </button>
  );
}

export default function BoloView({
  t,
  bolos,
  persons,
  vehicles,
  onCreate,
  onUpdate,
  onDelete,
}: {
  t: TFunction;
  bolos: BoloRecord[];
  persons: PersonRecord[];
  vehicles: VehicleRecord[];
  onCreate: (bolo: Omit<BoloRecord, "id" | "createdAt" | "updatedAt">) => void;
  onUpdate: (id: string, patch: Partial<BoloRecord>) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftBolo>(EMPTY_DRAFT);
  const [personSearch, setPersonSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");

  const ordered = useMemo(() => bolos.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [bolos]);
  const filteredPersons = useMemo(() => {
    const query = personSearch.trim().toLowerCase();
    if (!query) return persons;
    return persons.filter((person) => `${getPersonLabel(person)} ${person.identifier}`.toLowerCase().includes(query));
  }, [personSearch, persons]);
  const filteredVehicles = useMemo(() => {
    const query = vehicleSearch.trim().toLowerCase();
    if (!query) return vehicles;
    return vehicles.filter((vehicle) => `${getVehicleLabel(vehicle)} ${vehicle.ownerName || ""}`.toLowerCase().includes(query));
  }, [vehicleSearch, vehicles]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setPersonSearch("");
    setVehicleSearch("");
    setOpen(true);
  };

  const openEdit = (bolo: BoloRecord) => {
    setEditingId(bolo.id);
    setDraft({
      title: bolo.title,
      description: bolo.description,
      priority: bolo.priority,
      status: bolo.status,
      linkedPersons: bolo.linkedPersons || [],
      linkedVehicles: bolo.linkedVehicles || [],
    });
    setPersonSearch("");
    setVehicleSearch("");
    setOpen(true);
  };

  const toggleLinkedPerson = (identifier: string) => {
    setDraft((prev) => ({
      ...prev,
      linkedPersons: prev.linkedPersons.includes(identifier)
        ? prev.linkedPersons.filter((item) => item !== identifier)
        : [...prev.linkedPersons, identifier],
    }));
  };

  const toggleLinkedVehicle = (plate: string) => {
    setDraft((prev) => ({
      ...prev,
      linkedVehicles: prev.linkedVehicles.includes(plate)
        ? prev.linkedVehicles.filter((item) => item !== plate)
        : [...prev.linkedVehicles, plate],
    }));
  };

  const save = () => {
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      priority: draft.priority,
      status: draft.status,
      linkedPersons: draft.linkedPersons,
      linkedVehicles: draft.linkedVehicles,
    };

    if (payload.title === "") return;

    if (editingId) {
      onUpdate(editingId, payload);
    } else {
      onCreate(payload);
    }
    setOpen(false);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl card-title">{t("tablet.bolo.title")}</h3>
          <p className="card-sub mt-1">{t("tablet.bolo.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t("tablet.form.create")}
        </Button>
      </div>

      <Card className="p-4 flex-1 overflow-auto">
        <div className="space-y-3">
          {ordered.length === 0 ? (
            <div className="min-h-40 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]">
              {t("tablet.bolo.empty")}
            </div>
          ) : (
            ordered.map((bolo) => (
              <div key={bolo.id} className="rounded-2xl border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-semibold text-lg">{bolo.title}</p>
                    <p className="text-xs text-[var(--mdt-text-muted)] mt-1">{bolo.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityTone[bolo.priority]}`}>{bolo.priority}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusTone[bolo.status]}`}>{bolo.status}</span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 text-xs text-[var(--mdt-text-muted)]">
                  <div>
                    <p className="uppercase tracking-[0.2em] mb-2">{t("tablet.sidebar.persons")}</p>
                    <div className="flex flex-wrap gap-2">
                      {bolo.linkedPersons.length === 0 ? <span>{t("tablet.notes.none")}</span> : bolo.linkedPersons.map((id) => <span key={id} className="px-2 py-1 rounded-full bg-white/5 text-white">{persons.find((person) => person.identifier === id)?.name || id}</span>)}
                    </div>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.2em] mb-2">{t("tablet.sidebar.vehicles")}</p>
                    <div className="flex flex-wrap gap-2">
                      {bolo.linkedVehicles.length === 0 ? <span>{t("tablet.notes.none")}</span> : bolo.linkedVehicles.map((plate) => <span key={plate} className="px-2 py-1 rounded-full bg-white/5 text-white">{vehicles.find((vehicle) => vehicle.plate === plate)?.plate || plate}</span>)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button variant="ghost" onClick={() => openEdit(bolo)}><Pencil className="w-4 h-4 mr-2" />{t("edit")}</Button>
                  <Button variant="ghost" onClick={() => onDelete(bolo.id)}><Trash2 className="w-4 h-4 mr-2" />{t("delete")}</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? t("edit") : t("tablet.bolo.title") }>
        <div className="space-y-3">
          <div>
            <label className="block text-xs mdt-muted mb-1">{t("tablet.form.title")}</label>
            <input value={draft.title} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} className="w-full p-3 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-xl text-white" />
          </div>
          <div>
            <label className="block text-xs mdt-muted mb-1">{t("tablet.form.description")}</label>
            <textarea value={draft.description} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} rows={4} className="w-full p-3 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-xl text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.form.priority")}</label>
              <select value={draft.priority} onChange={(event) => setDraft((prev) => ({ ...prev, priority: event.target.value as DraftBolo["priority"] }))} className="w-full p-3 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-xl text-white">
                <option value="low">{t("tablet.severity.low")}</option>
                <option value="medium">{t("tablet.severity.medium")}</option>
                <option value="high">{t("tablet.severity.high")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.form.status")}</label>
              <select value={draft.status} onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as DraftBolo["status"] }))} className="w-full p-3 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-xl text-white">
                <option value="active">{t("tablet.status.active")}</option>
                <option value="resolved">{t("tablet.status.resolved")}</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--mdt-border)] bg-white/5 px-3 py-2">
                <Search className="h-4 w-4 text-[var(--mdt-text-muted)]" />
                <input
                  value={personSearch}
                  onChange={(event) => setPersonSearch(event.target.value)}
                  placeholder={t("tablet.search.people")}
                  className="w-full bg-transparent text-sm text-white placeholder:text-[var(--mdt-text-muted)] outline-none"
                />
              </div>
              <div className="max-h-56 overflow-auto space-y-2 rounded-2xl border border-[var(--mdt-border)] p-3">
                {filteredPersons.length === 0 ? (
                  <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.persons.no_match")}</p>
                ) : (
                  filteredPersons.map((person) => (
                    <MatchChip
                      key={person.identifier}
                      selected={draft.linkedPersons.includes(person.identifier)}
                      label={getPersonLabel(person)}
                      sublabel={person.identifier}
                      onClick={() => toggleLinkedPerson(person.identifier)}
                    />
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--mdt-border)] bg-white/5 px-3 py-2">
                <Search className="h-4 w-4 text-[var(--mdt-text-muted)]" />
                <input
                  value={vehicleSearch}
                  onChange={(event) => setVehicleSearch(event.target.value)}
                  placeholder="Search vehicles"
                  className="w-full bg-transparent text-sm text-white placeholder:text-[var(--mdt-text-muted)] outline-none"
                />
              </div>
              <div className="max-h-56 overflow-auto space-y-2 rounded-2xl border border-[var(--mdt-border)] p-3">
                {filteredVehicles.length === 0 ? (
                  <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.vehicles.no_match")}</p>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <MatchChip
                      key={vehicle.plate}
                      selected={draft.linkedVehicles.includes(vehicle.plate)}
                      label={getVehicleLabel(vehicle)}
                      sublabel={vehicle.ownerName || vehicle.plate}
                      onClick={() => toggleLinkedVehicle(vehicle.plate)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={save}>{t("save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
