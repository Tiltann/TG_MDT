"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
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
  address?: string | null;
  [key: string]: string | number | null | undefined;
};

type PersonAkte = Record<string, string>;

type AkteField = {
  key: string;
  label_key?: string;
  type?: "text" | "textarea" | "select";
  default?: string;
  editable?: boolean;
  options?: Array<{ value: string; label_key?: string; label?: string }>;
};

type DataField = {
  key: string;
  label_key?: string;
  fallback?: string;
};

type AkteSyncPayload = {
  kind?: "person" | "vehicle";
  identifier?: string;
  plate?: string;
  akte?: Record<string, string>;
};

const FALLBACK_FIELDS: AkteField[] = [
  { key: "phone", label_key: "tablet.persons.akte.phone", type: "text", default: "", editable: true },
  {
    key: "warrantStatus",
    label_key: "tablet.persons.akte.warrant",
    type: "select",
    default: "none",
    editable: true,
    options: [
      { value: "none", label_key: "tablet.persons.akte.warrant.none" },
      { value: "active", label_key: "tablet.persons.akte.warrant.active" },
      { value: "served", label_key: "tablet.persons.akte.warrant.served" },
    ],
  },
  {
    key: "dangerLevel",
    label_key: "tablet.persons.akte.danger",
    type: "select",
    default: "low",
    editable: true,
    options: [
      { value: "low", label_key: "tablet.persons.akte.danger.low" },
      { value: "medium", label_key: "tablet.persons.akte.danger.medium" },
      { value: "high", label_key: "tablet.persons.akte.danger.high" },
    ],
  },
  {
    key: "driverLicense",
    label_key: "tablet.persons.akte.driver_license",
    type: "select",
    default: "valid",
    editable: true,
    options: [
      { value: "valid", label_key: "tablet.persons.akte.license.valid" },
      { value: "suspended", label_key: "tablet.persons.akte.license.suspended" },
      { value: "revoked", label_key: "tablet.persons.akte.license.revoked" },
    ],
  },
  {
    key: "weaponLicense",
    label_key: "tablet.persons.akte.weapon_license",
    type: "select",
    default: "none",
    editable: true,
    options: [
      { value: "none", label_key: "tablet.persons.akte.weapon.none" },
      { value: "valid", label_key: "tablet.persons.akte.weapon.valid" },
      { value: "revoked", label_key: "tablet.persons.akte.weapon.revoked" },
    ],
  },
  { key: "notes", label_key: "tablet.persons.akte.notes", type: "textarea", default: "", editable: true },
];

const FALLBACK_DATA_FIELDS: DataField[] = [
  { key: "name", label_key: "tablet.persons.field.name", fallback: "-" },
  { key: "dob", label_key: "tablet.persons.field.dob", fallback: "-" },
  { key: "gender", label_key: "tablet.persons.field.gender", fallback: "-" },
  { key: "job", label_key: "tablet.persons.akte.occupation", fallback: "-" },
  { key: "address", label_key: "tablet.persons.akte.address", fallback: "-" },
];

const defaultsFromFields = (fields: AkteField[]) => {
  const defaults: PersonAkte = {};
  for (const field of fields) {
    defaults[field.key] = field.default || "";
  }
  return defaults;
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
  akteFields,
  dataFields,
}: {
  t: TFunction;
  persons: PersonRecord[];
  globalSearch: string;
  initialAkten: Record<string, PersonAkte>;
  akteSync?: AkteSyncPayload;
  akteFields?: AkteField[];
  dataFields?: DataField[];
}) {
  const resolvedFields = akteFields && akteFields.length > 0 ? akteFields : FALLBACK_FIELDS;
  const resolvedDataFields = dataFields && dataFields.length > 0 ? dataFields : FALLBACK_DATA_FIELDS;
  const defaultAkte = useMemo(() => defaultsFromFields(resolvedFields), [resolvedFields]);

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
        ...defaultAkte,
        ...(prev[akteSync.identifier as string] || {}),
        ...(akteSync.akte || {}),
      },
    }));
  }, [akteSync, defaultAkte]);

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
            ...defaultAkte,
            ...(akte || {}),
          },
        }));
      })
      .catch(() => {
        // Keep defaults when callback fails.
      });
  }, [selectedPerson, aktenByPerson, defaultAkte]);

  const currentAkte: PersonAkte = selectedPerson
    ? aktenByPerson[selectedPerson.identifier] || {
        ...defaultAkte,
      }
    : defaultAkte;

  const persistAkte = (identifier: string, nextAkte: PersonAkte) => {
    fetchNui<PersonAkte>("savePersonAkte", { identifier, akte: nextAkte })
      .then((saved) => {
        if (!saved) return;
        setAktenByPerson((prev) => ({
          ...prev,
          [identifier]: {
            ...defaultAkte,
            ...(prev[identifier] || {}),
            ...(saved || {}),
          },
        }));
      })
      .catch(() => {
        // Ignore save errors for now; local view state remains.
      });
  };

  const updateAkteField = (field: string, value: string, editable = true) => {
    if (!selectedPerson) return;
    if (!editable) return;

    const identifier = selectedPerson.identifier;
    const nextAkte: PersonAkte = {
      ...defaultAkte,
      ...(aktenByPerson[identifier] || {}),
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

          {resolvedDataFields.map((field) => {
            const label = field.label_key ? t(field.label_key) : field.key;
            const rawValue = (selectedPerson as Record<string, unknown>)[field.key];
            const value = field.key === "gender"
              ? normalizeGender(rawValue as string | number | null | undefined)
              : String(rawValue ?? field.fallback ?? t("tablet.persons.not_available"));

            return (
              <div key={field.key} className="p-3 rounded-md border border-[var(--mdt-border)] bg-[rgba(255,255,255,0.01)]">
                <p className="text-xs text-[var(--mdt-text-muted)]">{label}</p>
                <p className="text-sm text-white mt-1">{value}</p>
              </div>
            );
          })}
        </Card>

        <Card className="col-span-7 p-4 overflow-auto space-y-3">
          <h4 className="card-title">{t("tablet.persons.akte.title")}</h4>

          <div className="grid grid-cols-2 gap-3">
            {resolvedFields
              .filter((field) => field.type !== "textarea")
              .map((field) => {
                const label = field.label_key ? t(field.label_key) : field.key;
                const editable = field.editable !== false;
                const value = currentAkte[field.key] ?? field.default ?? "";

                if (field.type === "select") {
                  return (
                    <div key={field.key}>
                      <label className="block text-xs mdt-muted mb-1">{label}</label>
                      <select
                        value={value}
                        disabled={!editable}
                        onChange={(event) => updateAkteField(field.key, event.target.value, editable)}
                        className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white disabled:opacity-60"
                      >
                        {(field.options || []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label_key ? t(option.label_key) : option.label || option.value}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                return (
                  <div key={field.key}>
                    <label className="block text-xs mdt-muted mb-1">{label}</label>
                    <input
                      value={value}
                      disabled={!editable}
                      onChange={(event) => updateAkteField(field.key, event.target.value, editable)}
                      className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white disabled:opacity-60"
                    />
                  </div>
                );
              })}
          </div>

          {resolvedFields
            .filter((field) => field.type === "textarea")
            .map((field) => {
              const label = field.label_key ? t(field.label_key) : field.key;
              const editable = field.editable !== false;
              const value = currentAkte[field.key] ?? field.default ?? "";

              return (
                <div key={field.key}>
                  <label className="block text-xs mdt-muted mb-1">{label}</label>
                  <textarea
                    value={value}
                    disabled={!editable}
                    onChange={(event) => updateAkteField(field.key, event.target.value, editable)}
                    rows={6}
                    className="w-full p-2 bg-[var(--mdt-bg-base)] border border-[var(--mdt-border)] rounded-md text-white disabled:opacity-60"
                  />
                </div>
              );
            })}
        </Card>
      </div>
    </div>
  );
}
