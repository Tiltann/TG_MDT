"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, Briefcase, Calendar, Fingerprint } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";

type PersonRecord = {
  identifier: string;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  dob?: string | null;
  gender?: string | number | null;
  job?: string | null;
};

function normalizeGender(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "-";
  if (value === 0 || value === "0" || value === "m" || value === "M" || value === "male") return "M";
  if (value === 1 || value === "1" || value === "f" || value === "F" || value === "female") return "F";
  return String(value).toUpperCase();
}

export default function PersonsView({ t, persons }: { t: TFunction; persons: PersonRecord[] }) {
  const [search, setSearch] = useState("");
  const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null);
  const [aktenByPerson, setAktenByPerson] = useState<Record<string, boolean>>({});

  const normalizedPersons = useMemo(
    () =>
      (persons || []).map((person) => {
        const displayName =
          person.name ||
          [person.firstname, person.lastname].filter(Boolean).join(" ") ||
          person.identifier ||
          t("tablet.player.unknown_user");

        return {
          ...person,
          name: displayName,
        };
      }),
    [persons, t]
  );

  const filteredPersons = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return normalizedPersons;

    return normalizedPersons.filter((person) => {
      const haystack = [
        person.name,
        person.firstname,
        person.lastname,
        person.identifier,
        person.job,
        person.dob,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [normalizedPersons, search]);

  useEffect(() => {
    if (filteredPersons.length === 0) {
      setSelectedIdentifier(null);
      return;
    }

    const stillVisible = filteredPersons.some((person) => person.identifier === selectedIdentifier);
    if (!stillVisible) {
      setSelectedIdentifier(filteredPersons[0].identifier);
    }
  }, [filteredPersons, selectedIdentifier]);

  const selectedPerson =
    filteredPersons.find((person) => person.identifier === selectedIdentifier) || filteredPersons[0] || null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("tg_mdt_person_akten");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      if (parsed && typeof parsed === "object") {
        setAktenByPerson(parsed);
      }
    } catch {
      // Ignore malformed localStorage data.
    }
  }, []);

  const setPersonAkte = (identifier: string) => {
    setAktenByPerson((prev) => {
      const next = { ...prev, [identifier]: true };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("tg_mdt_person_akten", JSON.stringify(next));
        } catch {
          // Ignore storage errors in restricted contexts.
        }
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl card-title">{t("tablet.sidebar.persons")}</h3>
          <p className="card-sub mt-1">{t("tablet.persons.subtitle")}</p>
        </div>
        <div className="px-3 py-1 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] text-xs text-[var(--mdt-text-muted)]">
          {t("tablet.persons.total")}: <span className="text-white font-semibold">{normalizedPersons.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        <Card className="col-span-5 p-3 flex flex-col gap-3 min-h-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mdt-text-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("tablet.persons.search_placeholder")}
              className="w-full pl-9 pr-3 py-2 rounded-md bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] text-sm text-white"
            />
          </div>

          <div className="text-xs text-[var(--mdt-text-muted)] px-1">
            {filteredPersons.length === normalizedPersons.length
              ? `${normalizedPersons.length} ${t("tablet.sidebar.persons")}`
              : `${filteredPersons.length} / ${normalizedPersons.length}`}
          </div>

          <div className="flex-1 overflow-auto space-y-2 pr-1">
            {filteredPersons.length === 0 ? (
              <div className="h-full min-h-24 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]">
                {normalizedPersons.length > 0 ? t("tablet.persons.no_match") : t("tablet.persons.empty")}
              </div>
            ) : (
              filteredPersons.map((person) => {
                const isActive = selectedPerson?.identifier === person.identifier;
                return (
                  <button
                    key={person.identifier}
                    type="button"
                    onClick={() => setSelectedIdentifier(person.identifier)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      isActive
                        ? "border-[var(--mdt-accent-primary)] bg-[rgba(255,145,0,0.12)]"
                        : "border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.03)]"
                    }`}
                  >
                    <p className="text-sm text-white font-medium truncate">{person.name}</p>
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <p className="text-xs text-[var(--mdt-text-muted)] truncate">{person.identifier}</p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          aktenByPerson[person.identifier]
                            ? "border-[var(--mdt-status-success)] text-[var(--mdt-status-success)]"
                            : "border-[var(--mdt-border)] text-[var(--mdt-text-muted)]"
                        }`}
                      >
                        {aktenByPerson[person.identifier]
                          ? t("tablet.persons.akte.exists")
                          : t("tablet.persons.akte.missing")}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="col-span-7 p-4 min-h-0 overflow-auto">
          {!selectedPerson ? (
            <div className="h-full min-h-24 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]">
              {t("tablet.persons.empty")}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--mdt-text-muted)]">{t("tablet.persons.detail_title")}</p>
                <h4 className="text-2xl text-white font-semibold mt-1">{selectedPerson.name}</h4>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                  <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2"><Fingerprint className="w-4 h-4" />{t("tablet.persons.field.identifier")}</p>
                  <p className="text-sm text-white mt-1 break-all">{selectedPerson.identifier || t("tablet.persons.not_available")}</p>
                </div>

                <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                  <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2"><UserRound className="w-4 h-4" />{t("tablet.persons.field.name")}</p>
                  <p className="text-sm text-white mt-1">{selectedPerson.name || t("tablet.persons.not_available")}</p>
                </div>

                <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                  <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.persons.field.firstname")}</p>
                  <p className="text-sm text-white mt-1">{selectedPerson.firstname || t("tablet.persons.not_available")}</p>
                </div>

                <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                  <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.persons.field.lastname")}</p>
                  <p className="text-sm text-white mt-1">{selectedPerson.lastname || t("tablet.persons.not_available")}</p>
                </div>

                <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                  <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2"><Briefcase className="w-4 h-4" />{t("tablet.persons.field.job")}</p>
                  <p className="text-sm text-white mt-1">{selectedPerson.job || t("tablet.persons.not_available")}</p>
                </div>

                <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                  <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2"><Calendar className="w-4 h-4" />{t("tablet.persons.field.dob")}</p>
                  <p className="text-sm text-white mt-1">{selectedPerson.dob || t("tablet.persons.not_available")}</p>
                </div>
              </div>

              <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.persons.field.gender")}</p>
                <p className="text-sm text-white mt-1">{normalizeGender(selectedPerson.gender)}</p>
              </div>

              <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.persons.akte.title")}</p>
                  <p className="text-sm text-white mt-1">
                    {aktenByPerson[selectedPerson.identifier]
                      ? t("tablet.persons.akte.exists")
                      : t("tablet.persons.akte.missing")}
                  </p>
                </div>
                <Button
                  variant={aktenByPerson[selectedPerson.identifier] ? "ghost" : "primary"}
                  onClick={() => setPersonAkte(selectedPerson.identifier)}
                >
                  {aktenByPerson[selectedPerson.identifier]
                    ? t("tablet.persons.akte.open")
                    : t("tablet.persons.akte.create")}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
