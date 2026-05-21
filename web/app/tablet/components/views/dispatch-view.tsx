"use client";

import { useMemo, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import Modal from "../ui/modal";
import type { TFunction } from "../../lib/i18n";

type PersonRecord = { identifier: string; name?: string | null; firstname?: string | null; lastname?: string | null };
type VehicleRecord = { plate: string; ownerName?: string | null; model?: string | number | null };

export type DispatchStatus = string;

export type DispatchStatusOption = {
  code: string;
  label: string;
  color?: "green" | "blue" | "yellow" | "purple" | "gray" | "red";
};

export type DispatchOfficer = {
  id: string;
  name: string;
  gradeDisplay?: string;
  job?: string;
  jobLabel?: string;
  online: boolean;
  onDuty?: boolean;
  status: DispatchStatus;
};

export type DispatchGroup = {
  id: string;
  name: string;
  memberIds: string[];
};

export type DispatchAssignedUnit = {
  id: string;
  name: string;
  status?: string;
  assignedAt?: number;
};

export type DispatchAssignedVehicle = {
  plate: string;
  model?: string;
  assignedAt?: number;
};

export type DispatchLiveCall = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  priority?: "low" | "medium" | "high";
  status?: "open" | "investigating" | "closed";
  createdAt?: string;
  updatedAt?: string;
  assignedUnits: DispatchAssignedUnit[];
  assignedVehicles: DispatchAssignedVehicle[];
};

function statusBadgeClass(color?: DispatchStatusOption["color"]): string {
  if (color === "green") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (color === "blue") return "bg-blue-500/20 text-blue-300 border-blue-500/40";
  if (color === "yellow") return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  if (color === "purple") return "bg-violet-500/20 text-violet-300 border-violet-500/40";
  if (color === "gray") return "bg-zinc-500/20 text-zinc-300 border-zinc-500/40";
  return "bg-red-500/20 text-red-300 border-red-500/40";
}

export default function DispatchView({
  t,
  vehicles,
  officers,
  showSharedJobLabel,
  liveCalls,
  statusOptions,
  groups,
  currentOfficerId,
  onSetOwnStatus,
  onAssignUnit,
  onUnassignUnit,
  onAssignVehicle,
  onUnassignVehicle,
  onCreateGroup,
  onUpdateGroupMembers,
  onDeleteGroup,
  onAcceptCase,
  onCloseCase,
}: {
  t: TFunction;
  vehicles: VehicleRecord[];
  officers: DispatchOfficer[];
  showSharedJobLabel?: boolean;
  liveCalls: DispatchLiveCall[];
  statusOptions: DispatchStatusOption[];
  groups: DispatchGroup[];
  currentOfficerId: string;
  onSetOwnStatus: (status: DispatchStatus) => void;
  onAssignUnit: (dispatchId: string, officer: DispatchOfficer) => void;
  onUnassignUnit: (dispatchId: string, officerId: string) => void;
  onAssignVehicle: (dispatchId: string, vehicle: VehicleRecord) => void;
  onUnassignVehicle: (dispatchId: string, plate: string) => void;
  onCreateGroup: (name: string, memberIds: string[]) => void;
  onUpdateGroupMembers: (groupId: string, memberIds: string[]) => void;
  onDeleteGroup: (groupId: string) => void;
  onAcceptCase: (dispatchId: string) => void;
  onCloseCase: (dispatchId: string) => void;
}) {
  const [officerQuery, setOfficerQuery] = useState("");
  const [draftGroupName, setDraftGroupName] = useState("");
  const [selectedOfficerByCall, setSelectedOfficerByCall] = useState<Record<string, string>>({});
  const [selectedVehicleByCall, setSelectedVehicleByCall] = useState<Record<string, string>>({});
  const [selectedGroupByCall, setSelectedGroupByCall] = useState<Record<string, string>>({});
  const [assignModeByCall, setAssignModeByCall] = useState<Record<string, "officer" | "group">>({});
  const [isStatusMenuOpen, setStatusMenuOpen] = useState(false);
  const [isGroupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalTargetId, setGroupModalTargetId] = useState<string | null>(null);
  const [groupModalName, setGroupModalName] = useState("");
  const [groupModalMemberIds, setGroupModalMemberIds] = useState<string[]>([]);

  const selfOfficer = officers.find((officer) => officer.id === currentOfficerId) || null;

  const statusMap = useMemo(() => {
    const map = new Map<string, DispatchStatusOption>();
    for (const option of statusOptions) {
      map.set(option.code, option);
    }
    return map;
  }, [statusOptions]);

  const resolveStatusLabel = (statusCode: string) => statusMap.get(statusCode)?.label || statusCode;
  const resolveStatusColor = (statusCode: string) => statusMap.get(statusCode)?.color;

  const filteredOfficers = useMemo(() => {
    const needle = officerQuery.trim().toLowerCase();
    if (needle === "") return officers;
    return officers.filter((officer) => {
      const haystack = `${officer.name} ${officer.job || ""} ${officer.gradeDisplay || ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [officerQuery, officers]);

  const resolveDutyState = (officer: DispatchOfficer): boolean => {
    if (typeof officer.onDuty === "boolean") {
      return officer.onDuty;
    }
    return officer.online;
  };

  const toggleGroupModalMember = (officerId: string) => {
    setGroupModalMemberIds((prev) =>
      prev.includes(officerId) ? prev.filter((id) => id !== officerId) : [...prev, officerId]
    );
  };

  const openCreateGroupModal = () => {
    setGroupModalTargetId(null);
    setGroupModalName(draftGroupName.trim());
    setGroupModalMemberIds([]);
    setGroupModalOpen(true);
  };

  const openAddMembersModal = (group: DispatchGroup) => {
    setGroupModalTargetId(group.id);
    setGroupModalName(group.name);
    setGroupModalMemberIds(group.memberIds);
    setGroupModalOpen(true);
  };

  const handleSaveGroupModal = () => {
    const selectedMembers = Array.from(new Set(groupModalMemberIds));
    if (groupModalTargetId) {
      onUpdateGroupMembers(groupModalTargetId, selectedMembers);
      setGroupModalOpen(false);
      return;
    }

    const name = groupModalName.trim();
    if (name === "" || selectedMembers.length === 0) return;
    onCreateGroup(name, selectedMembers);
    setDraftGroupName("");
    setGroupModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <h3 className="text-xl card-title">{t("tablet.sidebar.dispatch")}</h3>
          <p className="card-sub mt-1">{t("tablet.dispatch.console", undefined, "Dispatch Console")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button>{t("tablet.dispatch.assign", undefined, "Assign")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 flex-1 min-h-0">
        <Card className="p-4 min-h-0 overflow-hidden flex flex-col gap-4">
          <div className="dispatch-block p-3">
            <p className="card-sub mb-2">{t("tablet.dispatch.my_status", undefined, "My Status")}</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <button
                  type="button"
                  className="dispatch-input w-full px-3 py-2 text-sm text-left flex items-center justify-between"
                  onClick={() => setStatusMenuOpen((prev) => !prev)}
                >
                  <span>{(selfOfficer?.status || "--") + " - " + resolveStatusLabel(selfOfficer?.status || "")}</span>
                  <span className="text-(--mdt-text-muted)">▾</span>
                </button>

                {isStatusMenuOpen && (
                  <div className="dispatch-list absolute z-20 mt-2 max-h-44 w-full overflow-auto rounded-lg border border-(--mdt-border) bg-(--mdt-bg-panel) p-1 shadow-xl">
                    {statusOptions.map((option) => (
                      <button
                        key={option.code}
                        type="button"
                        className="dispatch-action w-full px-2 py-2 text-left text-xs mb-1 last:mb-0"
                        onClick={() => {
                          onSetOwnStatus(option.code as DispatchStatus);
                          setStatusMenuOpen(false);
                        }}
                      >
                        {option.code} - {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs text-(--mdt-text-muted)">{selfOfficer?.online ? "Online" : "Offline"}</span>
            </div>
          </div>

          <div className="dispatch-block min-h-0 flex flex-col p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="card-sub">{t("tablet.dispatch.live_calls", undefined, "Live Dispatch Calls")}</p>
              <span className="text-xs text-(--mdt-text-muted)">{liveCalls.length}</span>
            </div>

            <div className="dispatch-list mt-3 min-h-0 flex-1 overflow-auto space-y-2 pr-1">
              {liveCalls.length === 0 ? (
                <p className="text-xs text-(--mdt-text-muted)">
                  {t("tablet.dispatch.no_live_calls", undefined, "No active dispatch calls")}
                </p>
              ) : (
                liveCalls.map((call) => {
                  const selectedOfficer = officers.find(
                    (officer) => officer.id === selectedOfficerByCall[call.id]
                  );
                  const selectedVehicle = vehicles.find(
                    (vehicle) => vehicle.plate === selectedVehicleByCall[call.id]
                  );

                  return (
                    <div key={call.id} className="dispatch-item p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{call.title}</p>
                          <p className="text-xs text-(--mdt-text-muted)">{call.location || t("tablet.common.unknown_location")}</p>
                        </div>
                        <span className="dispatch-chip border-(--mdt-border) text-white/80 text-[10px] uppercase tracking-wide">
                          {(call.priority || "medium").toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="dispatch-action px-2 py-1 text-xs"
                            onClick={() => onAcceptCase(call.id)}
                          >
                            {t("tablet.dispatch.accept_case", undefined, "Accept Case")}
                          </button>
                          <button
                            className="dispatch-action px-2 py-1 text-xs"
                            onClick={() => onCloseCase(call.id)}
                          >
                            {t("tablet.dispatch.close_case", undefined, "Close Case")}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            className={`dispatch-action px-2 py-1 text-xs ${
                              (assignModeByCall[call.id] || "officer") === "officer" ? "border-(--mdt-accent-primary)" : ""
                            }`}
                            onClick={() =>
                              setAssignModeByCall((prev) => ({ ...prev, [call.id]: "officer" }))
                            }
                          >
                            {t("tablet.dispatch.select_unit", undefined, "Select unit")}
                          </button>
                          <button
                            className={`dispatch-action px-2 py-1 text-xs ${
                              (assignModeByCall[call.id] || "officer") === "group" ? "border-(--mdt-accent-primary)" : ""
                            }`}
                            onClick={() =>
                              setAssignModeByCall((prev) => ({ ...prev, [call.id]: "group" }))
                            }
                          >
                            {t("tablet.dispatch.select_group", undefined, "Select group")}
                          </button>
                        </div>

                        {(assignModeByCall[call.id] || "officer") === "officer" ? (
                          <div className="flex items-center gap-2">
                            <select
                              className="dispatch-input flex-1 px-2 py-1 text-xs"
                              value={selectedOfficerByCall[call.id] || ""}
                              onChange={(event) =>
                                setSelectedOfficerByCall((prev) => ({ ...prev, [call.id]: event.target.value }))
                              }
                            >
                              <option value="">{t("tablet.dispatch.select_unit", undefined, "Select unit")}</option>
                              {officers.map((officer) => (
                                <option key={`${call.id}-${officer.id}`} value={officer.id}>
                                  {officer.name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="dispatch-action px-2 py-1 text-xs"
                              onClick={() => selectedOfficer && onAssignUnit(call.id, selectedOfficer)}
                            >
                              {t("tablet.dispatch.assign_unit", undefined, "Assign Unit")}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              className="dispatch-input flex-1 px-2 py-1 text-xs"
                              value={selectedGroupByCall[call.id] || ""}
                              onChange={(event) =>
                                setSelectedGroupByCall((prev) => ({ ...prev, [call.id]: event.target.value }))
                              }
                            >
                              <option value="">{t("tablet.dispatch.select_group", undefined, "Select group")}</option>
                              {groups.map((group) => (
                                <option key={`${call.id}-group-${group.id}`} value={group.id}>
                                  {group.name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="dispatch-action px-2 py-1 text-xs"
                              onClick={() => {
                                const selectedGroup = groups.find((group) => group.id === selectedGroupByCall[call.id]);
                                if (!selectedGroup) return;
                                for (const memberId of selectedGroup.memberIds) {
                                  const member = officers.find((officer) => officer.id === memberId);
                                  if (member) {
                                    onAssignUnit(call.id, member);
                                  }
                                }
                              }}
                            >
                              {t("tablet.dispatch.assign_group", undefined, "Assign Group")}
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <select
                            className="dispatch-input flex-1 px-2 py-1 text-xs"
                            value={selectedVehicleByCall[call.id] || ""}
                            onChange={(event) =>
                              setSelectedVehicleByCall((prev) => ({ ...prev, [call.id]: event.target.value }))
                            }
                          >
                            <option value="">{t("tablet.dispatch.select_vehicle", undefined, "Select vehicle")}</option>
                            {vehicles.map((vehicle) => (
                              <option key={`${call.id}-${vehicle.plate}`} value={vehicle.plate}>
                                {vehicle.plate}
                              </option>
                            ))}
                          </select>
                          <button
                            className="dispatch-action px-2 py-1 text-xs"
                            onClick={() => selectedVehicle && onAssignVehicle(call.id, selectedVehicle)}
                          >
                            {t("tablet.dispatch.assign_vehicle", undefined, "Assign Vehicle")}
                          </button>
                        </div>
                      </div>

                      {call.assignedUnits.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {call.assignedUnits.map((unit) => (
                            <button
                              key={`${call.id}-u-${unit.id}`}
                              className="dispatch-chip px-2 py-1 text-xs"
                              onClick={() => onUnassignUnit(call.id, unit.id)}
                            >
                              {unit.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {call.assignedVehicles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {call.assignedVehicles.map((vehicle) => (
                            <button
                              key={`${call.id}-v-${vehicle.plate}`}
                              className="dispatch-chip px-2 py-1 text-xs"
                              onClick={() => onUnassignVehicle(call.id, vehicle.plate)}
                            >
                              {vehicle.plate}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="dispatch-block min-h-0 flex flex-col p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="card-sub">{t("tablet.dispatch.officers", undefined, "Officers")}</p>
              <span className="text-xs text-(--mdt-text-muted)">{officers.length}</span>
            </div>
            <input
              className="dispatch-input mt-2 px-3 py-2 text-sm"
              placeholder={t("tablet.dispatch.search_officer", undefined, "Search officer")}
              value={officerQuery}
              onChange={(event) => setOfficerQuery(event.target.value)}
            />

            <div className="dispatch-list mt-3 min-h-0 flex-1 overflow-auto space-y-2 pr-1">
              {filteredOfficers.map((officer) => (
                <div key={officer.id} className="dispatch-item p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{officer.name}</p>
                      <p className="text-xs text-(--mdt-text-muted)">
                        {showSharedJobLabel && officer.jobLabel ? officer.jobLabel : (officer.gradeDisplay || "Officer")}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide ${statusBadgeClass(resolveStatusColor(officer.status))}`}>
                      {officer.status} - {resolveStatusLabel(officer.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-(--mdt-text-muted)">
                    <span>
                      {officer.online ? "Online" : "Offline"} - {resolveDutyState(officer) ? "On Duty" : "Off Duty"}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide">#{officer.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dispatch-block p-3">
            <p className="card-sub mb-2">{t("tablet.dispatch.groups", undefined, "Groups")}</p>
            <div className="flex items-center gap-2">
              <input
                className="dispatch-input flex-1 px-3 py-2 text-sm"
                placeholder={t("tablet.dispatch.group_name", undefined, "Group name")}
                value={draftGroupName}
                onChange={(event) => setDraftGroupName(event.target.value)}
              />
              <Button onClick={openCreateGroupModal}>{t("tablet.dispatch.create_group", undefined, "Create")}</Button>
            </div>

            <div className="dispatch-list mt-3 max-h-36 overflow-auto space-y-2 pr-1">
              {groups.length === 0 && (
                <p className="text-xs text-(--mdt-text-muted)">{t("tablet.dispatch.no_groups", undefined, "No groups yet")}</p>
              )}
              {groups.map((group) => (
                <div key={group.id} className="dispatch-item p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{group.name}</p>
                    <div className="flex items-center gap-2">
                      <button
                        className="dispatch-action px-2 py-1 text-xs"
                        onClick={() => openAddMembersModal(group)}
                      >
                        {t("tablet.dispatch.add_to_group", undefined, "Add")}
                      </button>
                      <button
                        className="text-xs text-red-300 hover:text-red-200"
                        onClick={() => onDeleteGroup(group.id)}
                      >
                        {t("tablet.dispatch.delete_group", undefined, "Delete")}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.memberIds.map((memberId) => {
                      const member = officers.find((officer) => officer.id === memberId);
                      if (!member) return null;
                      return (
                        <button
                          key={`${group.id}-${memberId}`}
                          className="dispatch-chip px-2 py-1 text-xs"
                          onClick={() =>
                            onUpdateGroupMembers(
                              group.id,
                              group.memberIds.filter((id) => id !== memberId)
                            )
                          }
                        >
                          {member.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={isGroupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title={groupModalTargetId ? t("tablet.dispatch.add_to_group", undefined, "Add") : t("tablet.dispatch.create_group", undefined, "Create")}
      >
        <div className="space-y-3">
          {!groupModalTargetId && (
            <input
              className="dispatch-input w-full px-3 py-2 text-sm"
              placeholder={t("tablet.dispatch.group_name", undefined, "Group name")}
              value={groupModalName}
              onChange={(event) => setGroupModalName(event.target.value)}
            />
          )}

          <div className="dispatch-list max-h-72 overflow-auto space-y-2 pr-1">
            {officers.map((officer) => {
              const selected = groupModalMemberIds.includes(officer.id);
              return (
                <button
                  key={`group-modal-${officer.id}`}
                  type="button"
                  className={`dispatch-item w-full p-2 text-left ${selected ? "border-(--mdt-accent-primary)" : ""}`}
                  onClick={() => toggleGroupModalMember(officer.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{officer.name}</p>
                      <p className="text-xs text-(--mdt-text-muted)">{officer.gradeDisplay || "Officer"}</p>
                    </div>
                    <span className="text-xs text-(--mdt-text-muted)">{selected ? "Selected" : "Select"}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setGroupModalOpen(false)}>{t("tablet.actions.close", undefined, "Close")}</Button>
            <Button onClick={handleSaveGroupModal}>{t("tablet.dispatch.add_to_group", undefined, "Add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
