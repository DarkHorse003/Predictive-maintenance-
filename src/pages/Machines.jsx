import { useMemo, useState } from "react";
import {
  ChevronDown,
  Grid2X2,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMachines } from "../hooks/useMachines";
import { useAlerts } from "../context/useAlerts";
import MachineCard from "../components/dashboard/MachineCard";
import { OperationalStatusBadge, MachineHealthBadge, AlertBadge } from "../components/common/StatusBadge";
import {
  formatFailureRisk,
  formatRul,
  formatSensorValue,
  getMachineAlertSummary,
} from "../utils/machineHealth";

const HEALTH_OPTIONS = [
  { value: "ALL", label: "All Health" },
  { value: "HEALTHY", label: "Healthy" },
  { value: "WARNING", label: "Warning" },
  { value: "CRITICAL", label: "Critical" },
  { value: "UNKNOWN", label: "Unknown" },
];

const OPERATIONAL_OPTIONS = [
  { value: "ALL", label: "All Operational" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OFFLINE", label: "Offline" },
];

const ALERT_FILTER_OPTIONS = [
  { value: "ALL", label: "All Alerts" },
  { value: "HAS_ALERTS", label: "Active Alerts Only" },
  { value: "CRITICAL_ALERTS", label: "Critical Alerts Only" },
  { value: "NO_ALERTS", label: "No Active Alerts" },
];

const SORT_OPTIONS = [
  { value: "risk-desc", label: "Failure Risk: High to Low" },
  { value: "risk-asc", label: "Failure Risk: Low to High" },
  { value: "rul-asc", label: "RUL: Shortest First" },
  { value: "rul-desc", label: "RUL: Longest First" },
  { value: "id-asc", label: "Machine ID: Ascending" },
];

function getRiskTone(probability) {
  if (probability == null) return "text-slate-400";
  if (probability >= 0.75) return "text-red-600";
  if (probability >= 0.4) return "text-amber-600";
  return "text-emerald-600";
}

export default function Machines() {
  const { machines, loading, dataSource } = useMachines();
  const { alerts } = useAlerts();

  const typeOptions = ["ALL", ...new Set(machines.map((machine) => machine.machineType))];

  const [searchTerm, setSearchTerm] = useState("");
  const [healthFilter, setHealthFilter] = useState("ALL");
  const [operationalFilter, setOperationalFilter] = useState("ALL");
  const [alertFilter, setAlertFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("risk-desc");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const filteredMachines = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const result = machines.filter((machine) => {
      const matchesSearch =
        !normalizedSearch ||
        machine.displayId.toLowerCase().includes(normalizedSearch) ||
        String(machine.machineId).toLowerCase().includes(normalizedSearch) ||
        machine.machineType.toLowerCase().includes(normalizedSearch) ||
        (machine.location && machine.location.toLowerCase().includes(normalizedSearch));

      // 1. Operational status filter
      const machineOp = String(machine.operationalStatus || machine.status || "").toUpperCase();
      const matchesOp = operationalFilter === "ALL" || machineOp === operationalFilter;

      // 2. Machine health filter
      const machineHealth = String(machine.machineHealth || "UNKNOWN").toUpperCase();
      const matchesHealth = healthFilter === "ALL" || machineHealth === healthFilter;

      // 3. Type filter
      const matchesType = typeFilter === "ALL" || machine.machineType === typeFilter;

      // 4. Alert filter
      const alertSummary = getMachineAlertSummary(alerts, machine.machineId);
      let matchesAlert = true;
      if (alertFilter === "HAS_ALERTS") matchesAlert = alertSummary.hasAlerts;
      else if (alertFilter === "CRITICAL_ALERTS") matchesAlert = alertSummary.critical > 0;
      else if (alertFilter === "NO_ALERTS") matchesAlert = !alertSummary.hasAlerts;

      return matchesSearch && matchesOp && matchesHealth && matchesType && matchesAlert;
    });

    return [...result].sort((a, b) => {
      const probA = a.failureProbability ?? -1;
      const probB = b.failureProbability ?? -1;
      const rulA = a.rulHours ?? 99999;
      const rulB = b.rulHours ?? 99999;

      switch (sortBy) {
        case "risk-asc":
          return probA - probB;
        case "rul-asc":
          return rulA - rulB;
        case "rul-desc":
          return rulB - rulA;
        case "id-asc":
          return Number(a.machineId) - Number(b.machineId);
        case "risk-desc":
        default:
          return probB - probA;
      }
    });
  }, [machines, alerts, searchTerm, healthFilter, operationalFilter, alertFilter, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredMachines.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleMachines = filteredMachines.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const activeFilterCount =
    Number(healthFilter !== "ALL") +
    Number(operationalFilter !== "ALL") +
    Number(alertFilter !== "ALL") +
    Number(typeFilter !== "ALL");

  const resetFilters = () => {
    setSearchTerm("");
    setHealthFilter("ALL");
    setOperationalFilter("ALL");
    setAlertFilter("ALL");
    setTypeFilter("ALL");
    setSortBy("risk-desc");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
        <span>
          {loading
            ? "Loading machine data..."
            : dataSource === "api"
            ? "Machine data from Spring Boot API"
            : "Live API Connected"}
        </span>
        <span className="font-semibold text-emerald-600">Active Fleet Monitoring</span>
      </div>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Fleet Asset Inventory
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Monitored Machines
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {machines.length} registered assets
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Inspect operational status, ML health predictions, and active sensor threshold alerts independently across all plant equipment.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm lg:self-auto">
          <ViewButton
            active={viewMode === "grid"}
            label="Grid view"
            onClick={() => setViewMode("grid")}
          >
            <Grid2X2 className="h-4 w-4" />
          </ViewButton>
          <ViewButton
            active={viewMode === "table"}
            label="Table view"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </ViewButton>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              type="search"
              placeholder="Search by machine ID, type, or location..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SelectField
              label="Machine Health"
              value={healthFilter}
              options={HEALTH_OPTIONS}
              valueKey="value"
              labelKey="label"
              onChange={(val) => {
                setHealthFilter(val);
                setPage(1);
              }}
            />

            <SelectField
              label="Operational Status"
              value={operationalFilter}
              options={OPERATIONAL_OPTIONS}
              valueKey="value"
              labelKey="label"
              onChange={(val) => {
                setOperationalFilter(val);
                setPage(1);
              }}
            />

            <SelectField
              label="Sort"
              value={sortBy}
              options={SORT_OPTIONS}
              valueKey="value"
              labelKey="label"
              onChange={(val) => {
                setSortBy(val);
                setPage(1);
              }}
            />

            <button
              type="button"
              onClick={() => setShowFilters((c) => !c)}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                showFilters || activeFilterCount > 0
                  ? "border-slate-300 bg-slate-100 text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>More Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Active Alerts"
              value={alertFilter}
              options={ALERT_FILTER_OPTIONS}
              valueKey="value"
              labelKey="label"
              onChange={(val) => {
                setAlertFilter(val);
                setPage(1);
              }}
            />

            <SelectField
              label="Equipment Type"
              value={typeFilter}
              options={typeOptions}
              onChange={(val) => {
                setTypeFilter(val);
                setPage(1);
              }}
            />

            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* Counter */}
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-800">
            {filteredMachines.length} machine{filteredMachines.length === 1 ? "" : "s"} found
          </p>
          <p className="text-xs text-slate-400">
            Showing {filteredMachines.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredMachines.length)} of {filteredMachines.length}
          </p>
        </div>
      </section>

      {/* Grid or Table View */}
      {visibleMachines.length === 0 ? (
        <EmptyState onReset={resetFilters} />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visibleMachines.map((machine) => (
            <MachineCard key={machine.machineId} machine={machine} />
          ))}
        </div>
      ) : (
        <MachineTable machines={visibleMachines} alerts={alerts} />
      )}

      {/* Pagination */}
      {filteredMachines.length > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-2xl shadow-sm">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((c) => Math.max(1, c - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-medium text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function SelectField({ label, value, options, valueKey, labelKey, onChange }) {
  return (
    <label className="relative block min-w-36">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      >
        {options.map((option) => {
          const optionValue = valueKey ? option[valueKey] : option;
          const optionLabel = labelKey ? option[labelKey] : option === "ALL" ? `All ${label}` : option;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function ViewButton({ active, label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 transition ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function MachineTable({ machines: tableMachines, alerts }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50/80">
            <tr>
              {[
                "Machine",
                "Operational",
                "Machine Health",
                "Active Alerts",
                "Failure Risk",
                "RUL",
                "Temp",
                "Vibration",
                "RPM",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tableMachines.map((machine) => (
              <MachineRow key={machine.machineId} machine={machine} alerts={alerts} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MachineRow({ machine, alerts }) {
  const navigate = useNavigate();
  const alertSummary = getMachineAlertSummary(alerts, machine.machineId);

  return (
    <tr
      className="cursor-pointer transition hover:bg-slate-50"
      onClick={() => navigate(`/machines/${machine.machineId}`)}
    >
      <td className="px-4 py-4">
        <div>
          <p className="text-sm font-bold text-slate-900">{machine.displayId}</p>
          <p className="mt-0.5 text-xs text-slate-400">{machine.machineType}</p>
        </div>
      </td>
      <td className="px-4 py-4">
        <OperationalStatusBadge status={machine.operationalStatus || machine.status} />
      </td>
      <td className="px-4 py-4">
        <MachineHealthBadge health={machine.machineHealth} />
      </td>
      <td className="px-4 py-4">
        <AlertBadge
          total={alertSummary.total}
          critical={alertSummary.critical}
          warning={alertSummary.warning}
          text={alertSummary.text}
        />
      </td>
      <td className="px-4 py-4">
        <span className={`text-sm font-bold ${getRiskTone(machine.failureProbability)}`}>
          {formatFailureRisk(machine.failureProbability)}
        </span>
      </td>
      <td className="px-4 py-4 text-sm font-semibold text-slate-700">
        {formatRul(machine.rulHours)}
      </td>
      <td className="px-4 py-4 text-sm text-slate-600">
        {formatSensorValue(machine.temperatureMotor, "°C")}
      </td>
      <td className="px-4 py-4 text-sm text-slate-600">
        {formatSensorValue(machine.vibrationRms, "")}
      </td>
      <td className="px-4 py-4 text-sm text-slate-600">
        {machine.rpm != null ? Math.round(machine.rpm).toLocaleString() : "N/A"}
      </td>
    </tr>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Search className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900">No machines found</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
        Try adjusting your search criteria, machine health, or operational filters.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
      >
        Clear Filters
      </button>
    </div>
  );
}
