"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { fetchNui } from "@/lib/useNui";
import type { TFunction } from "../../lib/i18n";
import { Shield, Search, RefreshCw, UserCheck, Activity, ToggleLeft, ToggleRight, Radio, Award } from "lucide-react";

type LeadershipMember = {
  identifier: string;
  name: string;
  grade: number;
  gradeLabel: string;
  online: boolean;
  source?: number | null;
  status: string;
  radioCode?: string | null;
  avatarUrl?: string | null;
  permissions: {
    manageMembers?: boolean;
    manageBulletins?: boolean;
    approveReports?: boolean;
    viewAuditLogs?: boolean;
  };
};

type JobGrade = {
  level: number;
  label: string;
  name: string;
};

type AuditLog = {
  id: number;
  timestamp: string;
  action: string;
  actor_name: string;
  actor_identifier: string;
  target_name?: string | null;
  details?: string | null;
  job: string;
};

type LeadershipViewProps = {
  t: TFunction;
  actorGrade?: string;
  actorName?: string;
};

const PERMISSION_KEYS = [
  { key: "manageMembers", label: "Mitglieder & Ränge verwalten", desc: "Erlaubt das Befördern, Degradieren und Zuweisen von Rechten." },
  { key: "manageBulletins", label: "Gesetze & Tafel verwalten", desc: "Erlaubt das Ändern des Gesetzesbuches (Gesetze-Tab) und der Pinnwand." },
  { key: "approveReports", label: "Berichte freigeben", desc: "Erlaubt das Freigeben oder Archivieren von offiziellen Berichten." },
  { key: "viewAuditLogs", label: "Aktivitätsprotokoll einsehen", desc: "Erlaubt den Zugriff auf das chronologische Führungsprotokoll." },
] as const;

export default function LeadershipView({ t, actorGrade, actorName }: LeadershipViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"members" | "audit">("members");
  const [members, setMembers] = useState<LeadershipMember[]>([]);
  const [grades, setGrades] = useState<JobGrade[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [logActionFilter, setLogActionFilter] = useState("all");
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchMembers = () => {
    setLoading(true);
    fetchNui<{ members: LeadershipMember[]; grades: JobGrade[] }>("getLeadershipMembers", {})
      .then((data) => {
        if (data) {
          setMembers(data.members || []);
          setGrades(data.grades || []);
        }
      })
      .catch((err) => console.error("Error fetching leadership members:", err))
      .finally(() => setLoading(false));
  };

  const fetchLogs = useCallback(() => {
    setLogsLoading(true);
    fetchNui<AuditLog[]>("getAuditLogs", {
      action: logActionFilter,
      search: logSearch,
    })
      .then((data) => {
        if (data) {
          setAuditLogs(data);
        }
      })
      .catch((err) => console.error("Error fetching audit logs:", err))
      .finally(() => setLogsLoading(false));
  }, [logActionFilter, logSearch]);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (activeSubTab !== "audit") return;

    const timeout = window.setTimeout(() => {
      fetchLogs();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [activeSubTab, fetchLogs]);

  const selectedMember = useMemo(() => {
    return members.find((m) => m.identifier === selectedMemberId) || null;
  }, [members, selectedMemberId]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (query === "") return members;
    return members.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(query) ||
        (m.gradeLabel || "").toLowerCase().includes(query) ||
        m.identifier.toLowerCase().includes(query)
    );
  }, [members, memberSearch]);

  const handleGradeChange = (targetIdentifier: string, newGradeLevel: number, memberName: string) => {
    const updatedMembers = members.map((m) => {
      if (m.identifier === targetIdentifier) {
        const foundGrade = grades.find((g) => g.level === newGradeLevel);
        return {
          ...m,
          grade: newGradeLevel,
          gradeLabel: foundGrade ? foundGrade.label : `Grade ${newGradeLevel}`,
        };
      }
      return m;
    });
    setMembers(updatedMembers);

    fetchNui<{ ok?: boolean }>("setLeadershipMemberPermission", {
      identifier: targetIdentifier,
      grade: newGradeLevel,
      name: memberName,
    })
      .then((result) => {
        if (result?.ok) fetchMembers();
      })
      .catch((err) => console.error("Error promoting/demoting member:", err));
  };

  const handleTogglePermission = (
    targetIdentifier: string,
    permKey: keyof NonNullable<LeadershipMember["permissions"]>,
    memberName: string
  ) => {
    if (!selectedMember) return;

    const currentPerms = selectedMember.permissions || {};
    const updatedPerms = {
      ...currentPerms,
      [permKey]: !currentPerms[permKey],
    };

    const updatedMembers = members.map((m) => {
      if (m.identifier === targetIdentifier) {
        return {
          ...m,
          permissions: updatedPerms,
        };
      }
      return m;
    });
    setMembers(updatedMembers);

    fetchNui<{ ok?: boolean }>("setLeadershipMemberPermission", {
      identifier: targetIdentifier,
      permissions: updatedPerms,
      name: memberName,
    })
      .then((result) => {
        if (result?.ok) fetchMembers();
      })
      .catch((err) => console.error("Error setting custom permissions:", err));
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case "rank_change":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
      case "permission_change":
        return "border-purple-500/20 bg-purple-500/10 text-purple-400";
      case "laws_update":
        return "border-amber-500/20 bg-amber-500/10 text-amber-400";
      default:
        return "border-zinc-800 bg-zinc-900 text-zinc-300";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "rank_change":
        return "Beförderung / Rang";
      case "permission_change":
        return "Rechteänderung";
      case "laws_update":
        return "Gesetze geändert";
      default:
        return action;
    }
  };

  return (
    <div className="space-y-5 animate-mdt-view flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3 flex-shrink-0">
        <div>
          <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--mdt-accent-primary)]" />
            {t("tablet.leadership.title", undefined, "Dienststellenleitung")}
          </h3>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
            {t("tablet.leadership.subtitle", undefined, "Führungs- & Personalverwaltung")}
          </p>
        </div>
        <div className="text-right border-l border-zinc-900 pl-4">
          <p className="text-xs font-semibold text-zinc-200">{actorName || "-"}</p>
          <p className="text-[9px] uppercase tracking-wider text-[var(--mdt-accent-primary)] font-bold">{actorGrade || "-"}</p>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-zinc-900 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveSubTab("members")}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b-2 -mb-px flex items-center gap-2 ${
            activeSubTab === "members"
              ? "border-[var(--mdt-accent-primary)] text-white bg-[var(--mdt-accent-primary)]/5"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          {t("tablet.leadership.subtab.members", undefined, "Mitglieder & Berechtigungen")}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("audit")}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b-2 -mb-px flex items-center gap-2 ${
            activeSubTab === "audit"
              ? "border-[var(--mdt-accent-primary)] text-white bg-[var(--mdt-accent-primary)]/5"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Activity className="h-4 w-4" />
          {t("tablet.leadership.subtab.audit", undefined, "Aktivitätsprotokoll")}
        </button>
      </div>

      {/* View Contents */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeSubTab === "members" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-full min-h-0">
            {/* Members List Panel */}
            <Card className="lg:col-span-1 rounded-xl border border-zinc-900 bg-black/35 p-4 flex flex-col h-full min-h-0 shadow-lg">
              <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  {t("tablet.leadership.members", undefined, "Dienstnummern")}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[9px] text-zinc-400 font-bold">
                    {filteredMembers.length}
                  </span>
                  <button
                    onClick={fetchMembers}
                    className="p-1 rounded bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    title="Aktualisieren"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3 flex-shrink-0">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Mitglied suchen..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)] focus:border-transparent transition-all"
                />
              </div>

              {/* Scrollable Members List */}
              <div className="flex-1 overflow-y-auto premium-scroll space-y-1.5 pr-1 min-h-0">
                {filteredMembers.length === 0 ? (
                  <p className="rounded-lg border border-zinc-900 bg-black/10 px-3 py-4 text-xs text-center text-zinc-500 italic">
                    {loading ? "Lade Mitglieder..." : "Keine Mitglieder gefunden."}
                  </p>
                ) : (
                  filteredMembers.map((member) => (
                    <button
                      key={member.identifier}
                      onClick={() => setSelectedMemberId(member.identifier)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all duration-200 ${
                        selectedMemberId === member.identifier
                          ? "border-[var(--mdt-accent-primary)] bg-[var(--mdt-accent-primary)]/10"
                          : "border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Status marker */}
                        <span
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            member.online
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                              : "bg-zinc-600"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-100 truncate">{member.name}</p>
                          <p className="text-[10px] text-zinc-500 truncate flex items-center gap-1.5 mt-0.5">
                            <span className="font-medium text-zinc-400">{member.gradeLabel}</span>
                            {member.online && member.radioCode && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-[var(--mdt-accent-primary)] font-bold">
                                <Radio className="h-2.5 w-2.5" />
                                {member.radioCode}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        member.online ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {member.online ? "ON" : "OFF"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </Card>

            {/* Selected Member Details & Actions */}
            <Card className="lg:col-span-2 rounded-xl border border-zinc-900 bg-black/35 p-5 flex flex-col h-full min-h-0 shadow-lg justify-start">
              {selectedMember ? (
                <div className="space-y-6 overflow-y-auto premium-scroll flex-1 pr-1">
                  {/* Mini Profile header */}
                  <div className="rounded-xl border border-zinc-900 bg-zinc-950/45 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-lg text-white">
                        {selectedMember.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{selectedMember.name}</h4>
                        <p className="text-[10px] text-zinc-500 tracking-wide font-mono mt-0.5 select-all">
                          ID: {selectedMember.identifier}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        selectedMember.online ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-900 text-zinc-500 border border-zinc-900"
                      }`}>
                        {selectedMember.online ? `Online (Source ${selectedMember.source})` : "Offline"}
                      </span>
                      {selectedMember.online && selectedMember.radioCode && (
                        <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 justify-end font-semibold">
                          <Radio className="h-3 w-3 text-[var(--mdt-accent-primary)]" />
                          Funk: {selectedMember.radioCode} MHz
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Promote / Demote Action */}
                  <div className="space-y-2 border-t border-zinc-900 pt-4">
                    <h5 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-[var(--mdt-accent-primary)]" />
                      Dienstgrad / Beförderung
                    </h5>
                    <p className="text-[11px] text-zinc-500">
                      Wähle einen Dienstgrad aus, um das Mitglied direkt zu befördern oder zu degradieren. Bei Online-Mitgliedern wird dies synchronisiert.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <select
                        value={selectedMember.grade}
                        onChange={(e) =>
                          handleGradeChange(selectedMember.identifier, Number(e.target.value), selectedMember.name)
                        }
                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)] flex-1"
                      >
                        {grades.map((grade) => (
                          <option key={grade.level} value={grade.level}>
                            Level {grade.level} - {grade.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Permissions Management */}
                  <div className="space-y-3 border-t border-zinc-900 pt-4">
                    <h5 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-[var(--mdt-accent-primary)]" />
                      Granulare Berechtigungen
                    </h5>
                    <p className="text-[11px] text-zinc-500">
                      Diese Berechtigungen erlauben es dem Beamten, bestimmte Verwaltungs- und Sonderaktionen im Tablet durchzuführen.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {PERMISSION_KEYS.map(({ key, label, desc }) => {
                        const hasPerm = Boolean(selectedMember.permissions?.[key]);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleTogglePermission(selectedMember.identifier, key, selectedMember.name)}
                            className={`p-3 rounded-lg border text-left flex items-start gap-3 transition-all duration-200 hover:bg-zinc-900/20 ${
                              hasPerm ? "border-emerald-900/40 bg-emerald-950/5" : "border-zinc-900 bg-zinc-950/20"
                            }`}
                          >
                            <span className="mt-0.5 text-zinc-400">
                              {hasPerm ? (
                                <ToggleRight className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-zinc-600" />
                              )}
                            </span>
                            <div>
                              <p className={`text-xs font-semibold ${hasPerm ? "text-emerald-300" : "text-zinc-300"}`}>
                                {label}
                              </p>
                              <p className="text-[10px] text-zinc-500 leading-normal mt-0.5">{desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                  <Shield className="h-12 w-12 text-zinc-700 stroke-[1.5] mb-3" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Keine Auswahl</h4>
                  <p className="text-[11px] max-w-sm mt-1.5 leading-relaxed">
                    Wähle links ein Mitglied aus, um dessen Beförderungen, Dienstgrad und granulare Zugriffsrechte direkt zu verwalten.
                  </p>
                </div>
              )}
            </Card>
          </div>
        ) : (
          /* Audit Logs Panel */
          <Card className="rounded-xl border border-zinc-900 bg-black/35 p-4 flex flex-col h-full min-h-0 shadow-lg">
            {/* Filters Bar */}
            <div className="flex flex-wrap gap-3 items-center justify-between pb-3 border-b border-zinc-900 mb-4 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  Aktivitätsprotokoll
                </h4>
                {/* Action select */}
                <select
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)]"
                >
                  <option value="all">Alle Aktionen</option>
                  <option value="rank_change">Beförderung / Rang</option>
                  <option value="permission_change">Berechtigungen</option>
                  <option value="laws_update">Gesetzesbuch</option>
                </select>

                {/* Log Search */}
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Suchen nach Akteur/Empfänger..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[var(--mdt-accent-primary)]"
                  />
                </div>
                <Button onClick={fetchLogs} className="px-3 py-1.5 text-xs h-auto bg-zinc-900 hover:bg-zinc-800/80">
                  Anwenden
                </Button>
              </div>

              <button
                onClick={fetchLogs}
                className="p-1.5 rounded bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Aktualisieren"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Scrollable Timeline */}
            <div className="flex-1 overflow-y-auto premium-scroll space-y-2 pr-1 min-h-0">
              {logsLoading ? (
                <p className="text-xs text-zinc-500 italic text-center py-8">Lade Protokolle...</p>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-zinc-500 italic text-center py-8">Keine Protokolleinträge gefunden.</p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-zinc-900 bg-zinc-950/40 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-[4px] border text-[9px] font-bold uppercase tracking-wider ${getActionBadgeClass(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                        <p className="font-semibold text-zinc-200">
                          {log.actor_name}{" "}
                          {log.target_name && (
                            <>
                              &rarr; <span className="text-[var(--mdt-accent-primary)] font-bold">{log.target_name}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <p className="text-zinc-400 leading-normal font-medium">{log.details}</p>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-semibold font-mono whitespace-nowrap self-end md:self-center">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
