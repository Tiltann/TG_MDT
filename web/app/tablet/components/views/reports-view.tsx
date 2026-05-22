"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, FileText, Plus, RefreshCw, Search, Save, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { fetchNui } from "@/lib/useNui";
import type { TFunction } from "../../lib/i18n";

type ReportItem = {
  id: number;
  title: string;
  category: string;
  subjectIdentifier: string;
  subjectName: string;
  location: string;
  priority: string;
  status: string;
  body: string;
  authorName: string;
  authorIdentifier: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string;
};

type ReportResponse = {
  items?: ReportItem[];
  total?: number;
};

type ReportForm = {
  title: string;
  category: string;
  subjectIdentifier: string;
  subjectName: string;
  location: string;
  priority: string;
  status: string;
  body: string;
};

const EMPTY_FORM: ReportForm = {
  title: "",
  category: "incident",
  subjectIdentifier: "",
  subjectName: "",
  location: "",
  priority: "medium",
  status: "draft",
  body: "",
};

const CATEGORY_OPTIONS = [
  { value: "incident", label: "Incident" },
  { value: "treatment", label: "Treatment" },
  { value: "operation", label: "Operation" },
  { value: "administrative", label: "Administrative" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function ReportsView({ t }: { t: TFunction }) {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM);

  const fetchReports = useCallback(() => {
    setLoading(true);
    fetchNui<ReportResponse>("getReports", {})
      .then((data) => {
        setReports(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((err) => console.error("Error fetching reports:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const visibleReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      if (statusFilter !== "all" && report.status !== statusFilter) {
        return false;
      }

      return [
        report.title,
        report.category,
        report.subjectName,
        report.subjectIdentifier,
        report.location,
        report.priority,
        report.status,
        report.body,
        report.authorName,
      ]
        .filter((value): value is string => typeof value === "string" && value !== "")
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [reports, search, statusFilter]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const startNewReport = () => {
    setSelectedReportId(null);
    setForm(EMPTY_FORM);
  };

  const openReport = (report: ReportItem) => {
    setSelectedReportId(report.id);
    setForm({
      title: report.title || "",
      category: report.category || "incident",
      subjectIdentifier: report.subjectIdentifier || "",
      subjectName: report.subjectName || "",
      location: report.location || "",
      priority: report.priority || "medium",
      status: report.status || "draft",
      body: report.body || "",
    });
  };

  const handleSave = () => {
    setSaving(true);
    fetchNui<{ ok?: boolean; reportId?: number }>("saveReport", {
      reportId: selectedReportId,
      ...form,
    })
      .then((result) => {
        if (result?.ok) {
          if (typeof result.reportId === "number") {
            setSelectedReportId(result.reportId);
          }
          fetchReports();
        }
      })
      .catch((err) => console.error("Error saving report:", err))
      .finally(() => setSaving(false));
  };

  const handleArchive = () => {
    if (!selectedReport) return;

    fetchNui<{ ok?: boolean }>("archiveReport", { reportId: selectedReport.id })
      .then((result) => {
        if (result?.ok) {
          fetchReports();
        }
      })
      .catch((err) => console.error("Error archiving report:", err));
  };

  const handleDelete = () => {
    if (!selectedReport) return;
    if (!window.confirm(`Delete report "${selectedReport.title}"?`)) return;

    fetchNui<{ ok?: boolean }>("deleteReport", { reportId: selectedReport.id })
      .then((result) => {
        if (result?.ok) {
          startNewReport();
          fetchReports();
        }
      })
      .catch((err) => console.error("Error deleting report:", err));
  };

  const statusTone = (status: string) => {
    switch (status) {
      case "approved":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
      case "archived":
        return "border-zinc-700 bg-zinc-900/80 text-zinc-300";
      case "open":
        return "border-sky-500/30 bg-sky-500/10 text-sky-300";
      default:
        return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    }
  };

  const priorityTone = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-rose-300";
      case "low":
        return "text-emerald-300";
      default:
        return "text-sky-300";
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 border-b border-zinc-900/70 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white">
            <FileText className="h-6 w-6 text-zinc-400" />
            {t("tablet.sidebar.reports", undefined, "Reports")}
          </h3>
          <p className="mt-1 text-xs text-[var(--mdt-text-muted)]">
            {t("tablet.reports.placeholder", undefined, "Create, review, approve, and archive structured reports.")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={fetchReports} variant="secondary" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("tablet.actions.view_all", undefined, "Refresh")}
          </Button>
          <Button onClick={startNewReport} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("tablet.form.create", undefined, "Create")}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5 flex min-h-0 flex-col border-[var(--mdt-border)] bg-zinc-950/80 p-4 shadow-xl">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("tablet.topbar.search_placeholder", undefined, "Search reports...")}
              className="w-full rounded-xl border border-zinc-800 bg-[var(--mdt-bg-base)] py-2 pl-10 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
            />
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { value: "all", label: "All" },
              ...STATUS_OPTIONS,
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                  statusFilter === option.value
                    ? "border-[var(--mdt-accent-primary)] bg-[var(--mdt-accent-primary)]/15 text-white"
                    : "border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 premium-scroll">
            {visibleReports.length === 0 ? (
              <div className="rounded-2xl border border-zinc-900 bg-black/20 px-4 py-8 text-center text-sm text-zinc-500">
                {loading ? t('tablet.reports.loading', undefined, 'Loading reports...') : t('tablet.reports.empty', undefined, 'No reports found.')}
              </div>
            ) : (
              visibleReports.map((report) => {
                const active = report.id === selectedReportId;
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => openReport(report)}
                    className={`w-full rounded-2xl border p-3 text-left transition-all duration-200 ${
                      active
                        ? "border-[var(--mdt-accent-primary)] bg-[var(--mdt-accent-primary)]/10"
                        : "border-zinc-900 bg-zinc-950/50 hover:border-zinc-800 hover:bg-zinc-900/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">{report.title}</p>
                        <p className="mt-1 truncate text-[11px] text-zinc-500">
                          {report.subjectName || report.subjectIdentifier || report.category}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] ${statusTone(report.status)}`}>
                          {report.status}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${priorityTone(report.priority)}`}>
                          {report.priority}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{report.body || t('tablet.reports.no_description', undefined, 'No description.')}</p>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="xl:col-span-7 flex min-h-0 flex-col border-[var(--mdt-border)] bg-zinc-950/80 p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-black text-white">
                {selectedReport ? selectedReport.title : t('tablet.reports.placeholder', undefined, 'New report draft')}
              </h4>
              <p className="text-xs text-zinc-500">
                {selectedReport ? `#${selectedReport.id} • ${selectedReport.authorName || t('tablet.common.unknown', undefined, 'Unknown')}` : t('tablet.reports.draft_editor', undefined, 'Draft editor')}
              </p>
            </div>
            {selectedReport && (
              <span className={`rounded border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusTone(selectedReport.status)}`}>
                {selectedReport.status}
              </span>
            )}
          </div>

          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1 lg:grid-cols-2 premium-scroll">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t("tablet.form.title")}</span>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-white focus:border-zinc-700 focus:outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t("tablet.form.category")}</span>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-white focus:border-zinc-700 focus:outline-none"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t('tablet.form.subject_name', undefined, 'Subject name')}</span>
              <input
                value={form.subjectName}
                onChange={(e) => setForm((prev) => ({ ...prev, subjectName: e.target.value }))}
                className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-white focus:border-zinc-700 focus:outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t('tablet.form.subject_identifier', undefined, 'Subject identifier')}</span>
              <input
                value={form.subjectIdentifier}
                onChange={(e) => setForm((prev) => ({ ...prev, subjectIdentifier: e.target.value }))}
                className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-white focus:border-zinc-700 focus:outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t("tablet.form.location")}</span>
              <input
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-white focus:border-zinc-700 focus:outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t("tablet.form.priority")}</span>
              <select
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-white focus:border-zinc-700 focus:outline-none"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t("tablet.form.status")}</span>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-white focus:border-zinc-700 focus:outline-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 lg:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t("tablet.form.description")}</span>
              <textarea
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                className="min-h-48 w-full rounded-2xl border border-zinc-800 bg-black/30 px-3 py-3 text-sm leading-6 text-white focus:border-zinc-700 focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900 pt-4">
            <div className="text-xs text-zinc-500">
              {selectedReport ? `Updated ${selectedReport.updatedAt || selectedReport.createdAt}` : "Unsaved draft"}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedReport && (
                <Button type="button" variant="secondary" onClick={handleArchive} className="gap-2">
                  <Archive className="h-4 w-4" />
                  {t('tablet.actions.archive', undefined, 'Archive')}
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={handleDelete} className="gap-2" disabled={!selectedReport}>
                <Trash2 className="h-4 w-4" />
                {t("delete")}
              </Button>
              <Button type="button" onClick={handleSave} className="gap-2" disabled={saving || form.title.trim() === ""}>
                <Save className={`h-4 w-4 ${saving ? "animate-pulse" : ""}`} />
                {saving ? t("loading") : t("save")}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
