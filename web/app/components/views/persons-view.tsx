"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, ShieldAlert, UserRound } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { fetchNui } from "../../../lib/useNui";
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

type PersonAkte = {
  phone: string;
  address: string;
  occupation: string;
  dangerLevel: string;
  warrantStatus: string;
  driverLicense: string;
  weaponLicense: string;
  notes: string;
};

type AkteSyncPayload = {
  kind?: "person" | "vehicle";
  identifier?: string;
  plate?: string;
  akte?: Record<string, string>;
};

const DEFAULT_AKTE: PersonAkte = {
  phone: "",
  address: "",
  occupation: "",
  dangerLevel: "low",
  warrantStatus: "none",
  driverLicense: "valid",
  weaponLicense: "none",
  notes: "",
};

function normalizeGender(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "-";
  if (value === 0 || value === "0" || value === "m" || value === "M" || value === "male") return "M";
  if (value === 1 || value === "1" || value === "f" || value === "F" || value === "female") return "F";
  return String(value).toUpperCase();
}

export default function PersonsView({
  t,
  persons,
  globalSearch,
  initialAkten,
  akteSync,
}: {
  t: TFunction;
  persons: PersonRecord[];
  globalSearch: string;
  initialAkten: Record<string, PersonAkte>;
  akteSync?: AkteSyncPayload;
}) {
  const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null);
  const [aktenByPerson, setAktenByPerson] = useState<Record<string, PersonAkte>>(initialAkten || {});

  useEffect(() => {
    setAktenByPerson((prev) => ({ ...initialAkten, ...prev }));
  }, [initialAkten]);

  useEffect(() => {
    if (!akteSync || akteSync.kind !== "person" || !akteSync.identifier || !akteSync.akte) return;
    setAktenByPerson((prev) => ({
      ...prev,
      [akteSync.identifier as string]: {
        ...DEFAULT_AKTE,
        ...(prev[akteSync.identifier as string] || {}),
        ...(akteSync.akte || {}),
      },
    }));
  }, [akteSync]);

  const normalizedPersons = useMemo(
    () =>
      (persons || []).map((person) => {
        const displayName =
          person.name ||
          [person.firstname, person.lastname].filter(Boolean).join(" ") ||
          t("tablet.player.unknown_user");

        return {
          ...person,
          name: displayName,
        };
      }),
    [persons, t]
  );

  const filteredPersons = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();
    if (!term) return normalizedPersons;

    return normalizedPersons.filter((person) => {
      const haystack = [person.name, person.firstname, person.lastname, person.job, person.dob]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [normalizedPersons, globalSearch]);

  useEffect(() => {
    if (!selectedIdentifier) return;
    const exists = filteredPersons.some((person) => person.identifier === selectedIdentifier);
    if (!exists) {
      setSelectedIdentifier(null);
    }
  }, [filteredPersons, selectedIdentifier]);

  const selectedPerson =
    filteredPersons.find((person) => person.identifier === selectedIdentifier) || null;

  useEffect(() => {
    if (!selectedPerson) return;
    if (aktenByPerson[selectedPerson.identifier]) return;

    fetchNui<PersonAkte>("getPersonAkte", { identifier: selectedPerson.identifier })
      .then((akte) => {
        setAktenByPerson((prev) => ({
          ...prev,
          [selectedPerson.identifier]: {
            ...DEFAULT_AKTE,
            ...(akte || {}),
            occupation: (akte && akte.occupation) || selectedPerson.job || "",
          },
        }));
      })
      .catch(() => {
        // Keep defaults when callback fails.
      });
  }, [selectedPerson, aktenByPerson]);

  const currentAkte = selectedPerson
    ? aktenByPerson[selectedPerson.identifier] || {
        ...DEFAULT_AKTE,
        occupation: selectedPerson.job || "",
      }
    : DEFAULT_AKTE;

  const persistAkte = (identifier: string, nextAkte: PersonAkte) => {
    fetchNui<PersonAkte>("savePersonAkte", { identifier, akte: nextAkte })
      .then((saved) => {
        if (!saved) return;
        setAktenByPerson((prev) => ({
          ...prev,
          [identifier]: {
            ...DEFAULT_AKTE,
            ...(prev[identifier] || {}),
            ...(saved || {}),
          },
        }));
      })
      .catch(() => {
        // Ignore save errors for now; local view state remains.
      });
  };

  const updateAkteField = (field: keyof PersonAkte, value: string) => {
    if (!selectedPerson) return;

    const identifier = selectedPerson.identifier;
    const nextAkte: PersonAkte = {
      ...DEFAULT_AKTE,
      ...(aktenByPerson[identifier] || { occupation: selectedPerson.job || "" }),
      [field]: value,
    };

    setAktenByPerson((prev) => ({
      ...prev,
      [identifier]: nextAkte,
    }));

    persistAkte(identifier, nextAkte);
  };

  const saveAkte = () => {
    if (!selectedPerson) return;
    persistAkte(selectedPerson.identifier, currentAkte);
  };

  if (!selectedPerson) {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl card-title">{t("tablet.sidebar.persons")}</h3>
            <p className="card-sub mt-1">{t("tablet.persons.subtitle")}</p>
          </div>
          <div className="px-3 py-1 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.02)] text-xs text-[var(--mdt-text-muted)]">
            {filteredPersons.length} / {normalizedPersons.length}
          </div>
        </div>

        <Card className="p-4 flex-1 overflow-auto">
          {filteredPersons.length === 0 ? (
            <div className="h-full min-h-28 flex items-center justify-center text-sm text-[var(--mdt-text-muted)]">
              {t("tablet.persons.no_match")}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPersons.map((person) => (
                <button
                  key={person.identifier}
                  type="button"
                  onClick={() => setSelectedIdentifier(person.identifier)}
                  className="w-full p-3 text-left rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <p className="text-sm text-white font-medium">{person.name}</p>
                  <p className="text-xs text-[var(--mdt-text-muted)] mt-1">
                    {person.job || t("tablet.persons.not_available")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setSelectedIdentifier(null)} className="inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {t("tablet.actions.back")}
        </Button>
        <Button onClick={saveAkte}>{t("tablet.form.save_akte")}</Button>
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        <Card className="col-span-5 p-4 space-y-3 overflow-auto">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--mdt-text-muted)]">{t("tablet.persons.detail_title")}</p>
            <h4 className="text-2xl text-white font-semibold mt-1">{selectedPerson.name}</h4>
          </div>

          <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
            <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2">
              <UserRound className="w-4 h-4" />
              {t("tablet.persons.field.name")}
            </p>
            <p className="text-sm text-white mt-1">{selectedPerson.name}</p>
          </div>

          <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
            <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t("tablet.persons.field.dob")}
            </p>
            <p className="text-sm text-white mt-1">{selectedPerson.dob || t("tablet.persons.not_available")}</p>
          </div>

          <div className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
            <p className="text-xs text-[var(--mdt-text-muted)] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              {t("tablet.persons.field.gender")}
            </p>
            <p className="text-sm text-white mt-1">{normalizeGender(selectedPerson.gender)}</p>
          </div>
        </Card>

        <Card className="col-span-7 p-4 overflow-auto space-y-3">
          <h4 className="card-title">{t("tablet.persons.akte.title")}</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.persons.akte.phone")}</label>
              <input
                value={currentAkte.phone}
                onChange={(event) => updateAkteField("phone", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              />
            </div>
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.persons.akte.address")}</label>
              <input
                value={currentAkte.address}
                onChange={(event) => updateAkteField("address", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              />
            </div>
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.persons.akte.occupation")}</label>
              <input
                value={currentAkte.occupation}
                onChange={(event) => updateAkteField("occupation", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              />
            </div>
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.persons.akte.warrant")}</label>
              <select
                value={currentAkte.warrantStatus}
                onChange={(event) => updateAkteField("warrantStatus", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              >
                <option value="none">{t("tablet.persons.akte.warrant.none")}</option>
                <option value="active">{t("tablet.persons.akte.warrant.active")}</option>
                <option value="served">{t("tablet.persons.akte.warrant.served")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.persons.akte.danger")}</label>
              <select
                value={currentAkte.dangerLevel}
                onChange={(event) => updateAkteField("dangerLevel", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              >
                <option value="low">{t("tablet.persons.akte.danger.low")}</option>
                <option value="medium">{t("tablet.persons.akte.danger.medium")}</option>
                <option value="high">{t("tablet.persons.akte.danger.high")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.persons.akte.driver_license")}</label>
              <select
                value={currentAkte.driverLicense}
                onChange={(event) => updateAkteField("driverLicense", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              >
                <option value="valid">{t("tablet.persons.akte.license.valid")}</option>
                <option value="suspended">{t("tablet.persons.akte.license.suspended")}</option>
                <option value="revoked">{t("tablet.persons.akte.license.revoked")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mdt-muted mb-1">{t("tablet.persons.akte.weapon_license")}</label>
              <select
                value={currentAkte.weaponLicense}
                onChange={(event) => updateAkteField("weaponLicense", event.target.value)}
                className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
              >
                <option value="none">{t("tablet.persons.akte.weapon.none")}</option>
                <option value="valid">{t("tablet.persons.akte.weapon.valid")}</option>
                <option value="revoked">{t("tablet.persons.akte.weapon.revoked")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mdt-muted mb-1">{t("tablet.persons.akte.notes")}</label>
            <textarea
              value={currentAkte.notes}
              onChange={(event) => updateAkteField("notes", event.target.value)}
              rows={6}
              className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
