import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Cpu,
  ExternalLink,
} from "lucide-react";
import SensorBreachMeter from "./SensorBreachMeter";
import { formatDateTime, formatTimeAgo } from "../../utils/date";
import { OperationalStatusBadge, MachineHealthBadge } from "../common/StatusBadge";

export default function MachineIncidentCard({
  group,
  onAcknowledgeAlert,
  onResolveAlert,
  onResolveMachine,
  onDispatchWorkOrder,
}) {
  const [isResolving, setIsResolving] = useState(false);
  const { machineId, displayId, machine, alerts, openAlerts, worstSeverity } = group;

  const isCritical = worstSeverity === "CRITICAL";

  async function handleResolveGroup() {
    setIsResolving(true);
    try {
      await onResolveMachine(machineId);
    } finally {
      setIsResolving(false);
    }
  }

  const latestAlert = alerts[0];

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
        isCritical ? "border-red-200 ring-1 ring-red-100" : "border-slate-200"
      }`}
    >
      {/* Card Header with Machine, Operational Status, and Machine Health */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isCritical ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/machines/${machineId}`}
                className="text-base font-bold text-slate-900 hover:text-slate-700 inline-flex items-center gap-1"
              >
                {displayId}
                <span className="text-xs font-normal text-slate-400">({machine?.machineType || "Equipment"})</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </Link>

              {/* Explicit badges for Operational and Machine Health */}
              <OperationalStatusBadge status={machine?.operationalStatus || machine?.status || "ACTIVE"} />
              <MachineHealthBadge health={machine?.machineHealth || "UNKNOWN"} />

              {openAlerts.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {openAlerts.length} active {openAlerts.length === 1 ? "alert" : "alerts"}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Latest alert: <strong className="font-semibold text-slate-700">{latestAlert?.alertType || latestAlert?.title}</strong> •{" "}
              {latestAlert?.createdAt ? formatTimeAgo(latestAlert.createdAt) : "Recently"}
            </p>
          </div>
        </div>

        {/* Action Buttons for this machine incident */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => onDispatchWorkOrder(latestAlert)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Work Order
          </button>

          {openAlerts.length > 0 && (
            <button
              type="button"
              disabled={isResolving}
              onClick={handleResolveGroup}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {isResolving ? "Resolving..." : `Resolve All (${openAlerts.length})`}
            </button>
          )}

          <Link
            to={`/machines/${machineId}`}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Inspect <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* Alert items for this machine */}
      <div className="mt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          Alert Events ({alerts.length})
        </h4>

        <div className="space-y-3">
          {alerts.map((alert) => {
            const isOpen = alert.status === "OPEN" && !alert.resolved;
            const isAck = alert.status === "ACKNOWLEDGED" && !alert.resolved;

            return (
              <div
                key={alert.id}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs transition hover:bg-slate-50"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {/* Severity */}
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          alert.severity === "CRITICAL"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {alert.severity}
                      </span>

                      {/* Source: SENSOR vs ML */}
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          alert.source === "ML"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {alert.source || "SENSOR"}
                      </span>

                      {/* Alert Type */}
                      <span className="font-bold text-slate-900">
                        {alert.alertType || alert.title}
                      </span>

                      {/* Status */}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isOpen
                            ? "bg-amber-100 text-amber-800"
                            : isAck
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {alert.status}
                      </span>

                      {/* Occurred At */}
                      <span className="text-slate-400 text-[11px] ml-auto">
                        {formatDateTime(alert.createdAt)}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-slate-600 text-xs mb-2 leading-relaxed">{alert.message}</p>

                    {/* Values & Limits */}
                    {alert.source === "SENSOR" && alert.sensorValue != null && alert.threshold != null ? (
                      <SensorBreachMeter
                        sensorName={alert.sensorName}
                        sensorLabel={alert.sensorLabel}
                        sensorCategory={alert.sensorCategory}
                        sensorValue={alert.sensorValue}
                        threshold={alert.threshold}
                        unit={alert.unit}
                        percentOver={alert.percentOver}
                        severity={alert.severity}
                      />
                    ) : alert.sensorValue != null && alert.threshold != null ? (
                      <div className="font-mono text-[11px] text-slate-700">
                        Value: <strong className="text-red-600">{alert.sensorValue}</strong> (Threshold: {alert.threshold})
                      </div>
                    ) : null}
                  </div>

                  {/* Actions for this individual alert */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0">
                    {isOpen && onAcknowledgeAlert && (
                      <button
                        type="button"
                        onClick={() => onAcknowledgeAlert(alert.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 shadow-sm"
                        title="Acknowledge alert"
                      >
                        <Check className="h-3 w-3" />
                        Ack
                      </button>
                    )}
                    {!alert.resolved && onResolveAlert && (
                      <button
                        type="button"
                        onClick={() => onResolveAlert(alert.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-sm"
                        title="Resolve alert"
                      >
                        <CheckCheck className="h-3 w-3" />
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
