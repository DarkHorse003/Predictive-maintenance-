import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  CheckCircle2,
  Layers,
  ListFilter,
  RefreshCw,
  Search,
  ShieldAlert,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from "lucide-react";

import { useAlerts } from "../context/useAlerts";
import { getMachines } from "../services/machineApi";
import { formatDateTime, formatTimeAgo } from "../utils/date";
import { getConnectionMeta } from "../utils/connectionStatus";
import AlertWorkOrderModal from "../components/alerts/AlertWorkOrderModal";
import MachineIncidentCard from "../components/alerts/MachineIncidentCard";
import SensorBreachMeter from "../components/alerts/SensorBreachMeter";

export default function Alerts() {
  const {
    alerts,
    loading,
    openCount,
    criticalCount,
    warningCount,
    acknowledgedCount,
    resolvedCount,
    connectionState,
    transport,
    lastUpdate,
    soundEnabled,
    toggleSound,
    acknowledgeAlert,
    resolveAlert,
    acknowledgeMultiple,
    resolveMultiple,
    resolveMachine,
    resolveAllOpen,
    refreshAlerts,
  } = useAlerts();

  const connectionMeta = getConnectionMeta(connectionState, transport, lastUpdate);

  // Machine directory from API (replaces mockData)
  const [machineDirectory, setMachineDirectory] = useState([]);

  useEffect(() => {
    let isMounted = true;
    getMachines()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setMachineDirectory(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // View mode: 'incident' (Group by Machine) vs 'feed' (Chronological Feed)
  const [viewMode, setViewMode] = useState("incident");

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkResolving, setIsBulkResolving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfirmAllModal, setShowConfirmAllModal] = useState(false);
  const [isResolvingAll, setIsResolvingAll] = useState(false);

  // Action feedback message (banner)
  const [actionFeedback, setActionFeedback] = useState(null);

  // Work order dispatch modal target
  const [workOrderTarget, setWorkOrderTarget] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("ALL");
  const [status, setStatus] = useState("OPEN"); // Default to open alerts to reduce noise
  const [sourceFilter, setSourceFilter] = useState("ALL"); // ALL, SENSOR, ML
  const [machineFilter, setMachineFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");

  // List of machines that have alerts for the filter dropdown
  const machinesWithAlerts = useMemo(() => {
    const ids = new Set(alerts.map((a) => String(a.machineId)).filter(Boolean));
    const known = machineDirectory.filter((m) => ids.has(String(m.machineId)));
    const knownIds = new Set(known.map((m) => String(m.machineId)));

    // Ensure any machine in alerts is present in dropdown
    ids.forEach((id) => {
      if (!knownIds.has(id)) {
        known.push({
          machineId: id,
          displayId: `M-${String(id).padStart(2, "0")}`,
          name: `Machine ${id}`,
          machineType: "Industrial Equipment",
        });
      }
    });

    return known.sort((a, b) => Number(a.machineId) - Number(b.machineId));
  }, [alerts, machineDirectory]);

  // Filtered alerts list
  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...alerts]
      .filter((alert) => {
        if (severity !== "ALL" && alert.severity !== severity) return false;
        if (status !== "ALL" && alert.status !== status) return false;
        if (sourceFilter !== "ALL" && alert.source !== sourceFilter) return false;
        if (machineFilter !== "ALL" && String(alert.machineId) !== String(machineFilter)) return false;

        if (!query) return true;

        return [
          alert.id,
          alert.displayAlertId,
          alert.displayId,
          alert.machineId,
          alert.title,
          alert.message,
          alert.source,
          alert.alertType,
          alert.sensorLabel,
          alert.sensorName,
        ].some((val) => String(val || "").toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (sortOrder === "OLDEST") return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortOrder === "SEVERITY") {
          const rank = { CRITICAL: 3, HIGH: 2, WARNING: 1 };
          return (rank[b.severity] || 0) - (rank[a.severity] || 0);
        }
        if (sortOrder === "BREACH_DELTA") {
          return (b.percentOver || 0) - (a.percentOver || 0);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [alerts, search, severity, status, sourceFilter, machineFilter, sortOrder]);

  // Grouped by Machine for the Incident View
  const machineGroups = useMemo(() => {
    const groupMap = new Map();

    filteredAlerts.forEach((alert) => {
      const mId = String(alert.machineId || "1");
      if (!groupMap.has(mId)) {
        const machineObj = machineDirectory.find((m) => String(m.machineId) === mId) || {
          machineId: mId,
          displayId: alert.displayId || `M-${String(mId).padStart(2, "0")}`,
          name: `Machine ${mId}`,
          machineType: "Industrial Equipment",
          operationalStatus: "ACTIVE",
          status: "ACTIVE",
          machineHealth: "UNKNOWN",
        };

        groupMap.set(mId, {
          machineId: mId,
          displayId: alert.displayId || `M-${mId.padStart(2, "0")}`,
          machine: machineObj,
          alerts: [],
          openAlerts: [],
          worstSeverity: "WARNING",
        });
      }

      const group = groupMap.get(mId);
      group.alerts.push(alert);
      if (alert.status === "OPEN" && !alert.resolved) {
        group.openAlerts.push(alert);
      }
      if (alert.severity === "CRITICAL") {
        group.worstSeverity = "CRITICAL";
      }
    });

    return Array.from(groupMap.values());
  }, [filteredAlerts, machineDirectory]);

  // Selection handlers
  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredAlerts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAlerts.map((a) => a.id)));
    }
  }

  // Bulk resolution handler
  async function handleBulkResolve() {
    if (selectedIds.size === 0) return;
    setIsBulkResolving(true);
    const count = selectedIds.size;
    try {
      await resolveMultiple(Array.from(selectedIds));
      setSelectedIds(new Set());
      setActionFeedback({
        type: "success",
        message: `${count} alert${count !== 1 ? "s" : ""} resolved successfully.`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch {
      setActionFeedback({
        type: "error",
        message: "Failed to resolve selected alerts. Please try again.",
      });
    } finally {
      setIsBulkResolving(false);
    }
  }

  // Bulk acknowledge handler
  async function handleBulkAcknowledge() {
    if (selectedIds.size === 0) return;
    setIsBulkResolving(true);
    const count = selectedIds.size;
    try {
      await acknowledgeMultiple(Array.from(selectedIds));
      setSelectedIds(new Set());
      setActionFeedback({
        type: "success",
        message: `${count} alert${count !== 1 ? "s" : ""} acknowledged.`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch {
      setActionFeedback({
        type: "error",
        message: "Failed to acknowledge selected alerts.",
      });
    } finally {
      setIsBulkResolving(false);
    }
  }

  // Manual refresh with spin animation
  async function handleManualRefresh() {
    setIsRefreshing(true);
    try {
      await refreshAlerts();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }

  // Individual resolution with feedback
  async function handleSingleResolve(alertId, displayAlertId) {
    try {
      await resolveAlert(alertId);
      setActionFeedback({
        type: "success",
        message: `Alert ${displayAlertId || alertId} marked as resolved.`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch {
      setActionFeedback({
        type: "error",
        message: `Could not resolve alert ${displayAlertId || alertId}.`,
      });
    }
  }

  const hasFilters =
    search ||
    severity !== "ALL" ||
    status !== "OPEN" ||
    sourceFilter !== "ALL" ||
    machineFilter !== "ALL";

  function clearFilters() {
    setSearch("");
    setSeverity("ALL");
    setStatus("ALL");
    setSourceFilter("ALL");
    setMachineFilter("ALL");
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Authoritative Status Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Active Alerts & Incidents
            </h1>

            {/* Authoritative Stream/Connection Indicator */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${connectionMeta.badgeClass}`}
              title={connectionMeta.pageDesc}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${connectionMeta.dotClass}`} />
              {connectionMeta.badgeText}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {connectionMeta.pageDesc}
          </p>
        </div>

        {/* Global Control Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
              soundEnabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            title={soundEnabled ? "Mute audio alarms" : "Enable live audio alarms"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>{soundEnabled ? "Audio On" : "Muted"}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleManualRefresh}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            title="Sync alerts"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          {/* Bulk Resolve All Open Button */}
          {openCount > 0 && (
            <button
              type="button"
              onClick={() => setShowConfirmAllModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
            >
              <CheckCheck className="h-4 w-4" />
              Resolve All Open ({openCount})
            </button>
          )}
        </div>
      </section>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-3 text-xs font-semibold shadow-sm transition ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5 REQUIRED KPI METRICS                                   */}
      {/* 1. Total Active Alerts, 2. Critical, 3. Warning,        */}
      {/* 4. Acknowledged, 5. Resolved                            */}
      {/* ======================================================== */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* 1. Total Active Alerts */}
        <div
          className={`rounded-2xl border p-4 shadow-sm transition ${
            openCount > 0
              ? "border-amber-200 bg-amber-50/40 ring-1 ring-amber-100"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
              Total Active Alerts
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ShieldAlert className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900">{openCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-amber-700">Unresolved events</p>
        </div>

        {/* 2. Critical Alerts */}
        <div
          className={`rounded-2xl border p-4 shadow-sm transition ${
            criticalCount > 0
              ? "border-red-200 bg-red-50/50 ring-1 ring-red-100"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-700">
              Critical Alerts
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-700">{criticalCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-red-600">Immediate hazard</p>
        </div>

        {/* 3. Warning Alerts */}
        <div
          className={`rounded-2xl border p-4 shadow-sm transition ${
            warningCount > 0
              ? "border-amber-200 bg-amber-50/50 ring-1 ring-amber-100"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Warning Alerts
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{warningCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-amber-600">Elevated threshold</p>
        </div>

        {/* 4. Acknowledged Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              Acknowledged
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Check className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900">{acknowledgedCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-blue-600">In review / working</p>
        </div>

        {/* 5. Resolved Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Resolved Alerts
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{resolvedCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Cleared & safe</p>
        </div>
      </section>

      {/* Filter and View Control Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search alerts by machine, source, alert type, or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Selects */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Source Filter: SENSOR vs ML */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">All Sources</option>
              <option value="SENSOR">Sensor Alerts</option>
              <option value="ML">ML Prediction Alerts</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning Only</option>
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="OPEN">Open (Active)</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
              <option value="ALL">All Statuses</option>
            </select>

            {/* Machine Filter */}
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">All Machines</option>
              {machinesWithAlerts.map((m) => (
                <option key={m.machineId} value={m.machineId}>
                  {m.displayId || `M-${m.machineId}`} ({m.machineType})
                </option>
              ))}
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="NEWEST">Newest First</option>
              <option value="SEVERITY">Highest Severity</option>
              <option value="BREACH_DELTA">Largest % Breach</option>
              <option value="OLDEST">Oldest First</option>
            </select>

            {/* Dual View Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode("incident")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "incident"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Group alerts by Machine Incident to reduce noise"
              >
                <Layers className="h-3.5 w-3.5" />
                Incident View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("feed")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "feed"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="View all alerts in chronological stream"
              >
                <ListFilter className="h-3.5 w-3.5" />
                Feed View
              </button>
            </div>
          </div>
        </div>

        {/* Filter Badges & Reset */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-medium">Active Filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-medium">
                Search: "{search}"
                <button type="button" onClick={() => setSearch("")} className="hover:text-slate-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {severity !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-medium">
                Severity: {severity}
                <button type="button" onClick={() => setSeverity("ALL")} className="hover:text-slate-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {status !== "OPEN" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-medium">
                Status: {status}
                <button type="button" onClick={() => setStatus("OPEN")} className="hover:text-slate-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {sourceFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-medium">
                Source: {sourceFilter}
                <button type="button" onClick={() => setSourceFilter("ALL")} className="hover:text-slate-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {machineFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-medium">
                Machine: M-{machineFilter}
                <button type="button" onClick={() => setMachineFilter("ALL")} className="hover:text-slate-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline ml-auto"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* Bulk Action Toolbar (Appears when items are selected in Feed View) */}
      {viewMode === "feed" && selectedIds.size > 0 && (
        <div className="sticky top-20 z-20 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold">
              {selectedIds.size} alert{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isBulkResolving}
              onClick={handleBulkAcknowledge}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Acknowledge Selected
            </button>
            <button
              type="button"
              disabled={isBulkResolving}
              onClick={handleBulkResolve}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Resolve Selected
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN ALERTS PRESENTATION: Incident View vs Feed View     */}
      {/* ======================================================== */}
      <section>
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              <p className="text-sm font-medium text-slate-600">Loading plant alerts...</p>
            </div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              {hasFilters ? "No alerts match your filter criteria" : "No active alerts"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {hasFilters
                ? "Try relaxing your search terms or filter constraints to view more alerts."
                : "All machines are currently operating within safe configured thresholds."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : viewMode === "incident" ? (
          /* ======================================================== */
          /* 1. Incident View: Grouped by Machine Incident Card      */
          /* ======================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-500">
                Displaying {machineGroups.length} machine incident groups ({filteredAlerts.length} total alerts)
              </span>
            </div>

            <div className="space-y-4">
              {machineGroups.map((group) => (
                <MachineIncidentCard
                  key={group.machineId}
                  group={group}
                  onAcknowledgeAlert={acknowledgeAlert}
                  onResolveAlert={(id) => handleSingleResolve(id, group.displayId)}
                  onResolveMachine={resolveMachine}
                  onDispatchWorkOrder={(alert) => setWorkOrderTarget(alert)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* 2. Feed View: Chronological Alerts Stream                */
          /* ======================================================== */
          <div className="space-y-3">
            {/* Feed Header with Select All */}
            <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-semibold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filteredAlerts.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span>Select All ({filteredAlerts.length} alerts)</span>
              </label>
              <span>Sorted by {sortOrder.toLowerCase().replace("_", " ")}</span>
            </div>

            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const isSelected = selectedIds.has(alert.id);
                const isCritical = alert.severity === "CRITICAL";
                const isOpen = alert.status === "OPEN" && !alert.resolved;
                const isAck = alert.status === "ACKNOWLEDGED" && !alert.resolved;
                const isResolved = alert.resolved || alert.status === "RESOLVED";

                return (
                  <article
                    key={alert.id}
                    className={`flex flex-col gap-4 rounded-2xl border p-4 shadow-sm transition lg:flex-row lg:items-center lg:justify-between ${
                      isSelected
                        ? "border-slate-800 bg-slate-50/50 ring-1 ring-slate-800"
                        : isCritical && isOpen
                        ? "border-red-200 bg-red-50/20"
                        : isAck
                        ? "border-blue-100 bg-blue-50/10"
                        : isResolved
                        ? "border-slate-200 bg-slate-50/40 opacity-75"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    {/* Left: Checkbox + Details */}
                    <div className="flex items-start gap-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(alert.id)}
                        className="mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {alert.displayAlertId}
                          </span>

                          <Link
                            to={`/machines/${alert.machineId}`}
                            className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700 hover:bg-slate-200"
                          >
                            {alert.displayId}
                          </Link>

                          {/* Source Badge */}
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              alert.source === "ML"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {alert.source}
                          </span>

                          {/* Severity Badge */}
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isCritical
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {alert.severity}
                          </span>

                          {/* Lifecycle Status Badge */}
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isOpen
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                : isAck
                                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            }`}
                          >
                            {alert.status}
                          </span>
                        </div>

                        {/* Title and Message */}
                        <h3 className="mt-2 text-sm font-bold text-slate-900">
                          {alert.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-600 max-w-3xl leading-relaxed">
                          {alert.message}
                        </p>

                        {/* Current Value & Threshold Visual Meter */}
                        {alert.source === "SENSOR" && alert.sensorValue != null && alert.threshold != null ? (
                          <div className="mt-3 max-w-md">
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
                          </div>
                        ) : alert.sensorValue != null && alert.threshold != null ? (
                          <div className="mt-2 font-mono text-xs text-slate-700">
                            Current Value: <strong className="text-red-600">{alert.sensorValue}</strong> | Safe Threshold: {alert.threshold}
                          </div>
                        ) : null}

                        {/* Timestamps */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                          <span>Occurred: {formatDateTime(alert.createdAt)}</span>
                          <span>({formatTimeAgo(alert.createdAt)})</span>
                          {alert.occurrenceCount > 1 && (
                            <span className="font-semibold text-amber-700">
                              Repeated {alert.occurrenceCount} times
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-end">
                      {/* Work order creation */}
                      <button
                        type="button"
                        onClick={() => setWorkOrderTarget(alert)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        Work Order
                      </button>

                      {/* Acknowledge */}
                      {isOpen && (
                        <button
                          type="button"
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Acknowledge
                        </button>
                      )}

                      {/* Resolve */}
                      {!alert.resolved && (
                        <button
                          type="button"
                          onClick={() => handleSingleResolve(alert.id, alert.displayAlertId)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Resolve
                        </button>
                      )}

                      <Link
                        to={`/machines/${alert.machineId}`}
                        className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                      >
                        Inspect
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Confirmation Modal for Resolve All Open */}
      {showConfirmAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Resolve All Open Alerts?</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              This will mark all <strong className="text-slate-900 font-semibold">{openCount}</strong> active open alerts as resolved across the plant.
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span>Critical alerts to resolve:</span>
                <span className="font-bold text-red-600">{criticalCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Warning alerts to resolve:</span>
                <span className="font-bold text-amber-600">{warningCount}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isResolvingAll}
                onClick={() => setShowConfirmAllModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResolvingAll}
                onClick={async () => {
                  try {
                    setIsResolvingAll(true);
                    const countToResolve = openCount;
                    await resolveAllOpen();
                    setShowConfirmAllModal(false);
                    setActionFeedback({
                      type: "success",
                      message: `${countToResolve} alert${countToResolve !== 1 ? "s" : ""} resolved successfully.`,
                    });
                    setTimeout(() => setActionFeedback(null), 5000);
                  } catch {
                    setActionFeedback({
                      type: "error",
                      message: "Failed to resolve open alerts. Please check network connection.",
                    });
                  } finally {
                    setIsResolvingAll(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
              >
                {isResolvingAll ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Resolving alerts...</span>
                  </>
                ) : (
                  <span>Yes, Resolve All ({openCount})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Work Order Modal */}
      {workOrderTarget && (
        <AlertWorkOrderModal
          alert={workOrderTarget}
          onClose={() => setWorkOrderTarget(null)}
          onSuccess={() => {
            setWorkOrderTarget(null);
            refreshAlerts();
          }}
        />
      )}
    </div>
  );
}
