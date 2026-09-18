import { Activity, ArrowUpRight, Gauge, Thermometer, Vibrate } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { OperationalStatusBadge, MachineHealthBadge, AlertBadge } from "../common/StatusBadge";
import { useAlerts } from "../../context/useAlerts";
import {
  formatFailureRisk,
  formatRul,
  formatSensorValue,
  getMachineAlertSummary,
} from "../../utils/machineHealth";

function getRiskTone(probability) {
  if (probability == null) return "text-slate-500";
  if (probability >= 0.75) return "text-red-600";
  if (probability >= 0.4) return "text-amber-600";
  return "text-emerald-600";
}

export default function MachineCard({ machine }) {
  const navigate = useNavigate();
  const { alerts } = useAlerts();

  // 3rd concept: Active Alerts for this machine
  const alertSummary = getMachineAlertSummary(alerts, machine.machineId);
  const riskTone = getRiskTone(machine.failureProbability);

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      {/* Header: Machine Identifier & Navigate button */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">{machine.displayId}</h3>
            <span className="text-xs font-normal text-slate-400">({machine.machineType})</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{machine.location || "Production Floor"}</p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/machines/${machine.machineId}`)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
          aria-label={`Open ${machine.displayId}`}
          title="View machine details"
        >
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>

      {/* THREE EXPLICIT CONCEPTS: Operational Status, Machine Health, Active Alerts */}
      <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50/80 p-2.5 border border-slate-100 text-xs">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Operational
          </span>
          <div className="mt-1">
            <OperationalStatusBadge status={machine.operationalStatus || machine.status} />
          </div>
        </div>

        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Health
          </span>
          <div className="mt-1">
            <MachineHealthBadge health={machine.machineHealth} />
          </div>
        </div>

        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Alerts
          </span>
          <div className="mt-1">
            <AlertBadge
              total={alertSummary.total}
              critical={alertSummary.critical}
              warning={alertSummary.warning}
              text={alertSummary.text}
            />
          </div>
        </div>
      </div>

      {/* ML Prediction Metrics: Failure Risk & RUL */}
      <div className="mt-4 flex items-end justify-between border-b border-slate-100 pb-3.5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Failure risk</p>
          <p className={`mt-0.5 text-xl font-bold ${riskTone}`}>
            {formatFailureRisk(machine.failureProbability)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">RUL</p>
          <p className="mt-0.5 text-base font-semibold text-slate-800">
            {formatRul(machine.rulHours)}
          </p>
        </div>
      </div>

      {/* Recent Telemetry: Temperature, Vibration, RPM */}
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <Metric
          icon={Thermometer}
          label="Temp"
          value={formatSensorValue(machine.temperatureMotor, "°C")}
        />
        <Metric
          icon={Vibrate}
          label="Vibration"
          value={formatSensorValue(machine.vibrationRms, "")}
        />
        <Metric
          icon={Gauge}
          label="RPM"
          value={machine.rpm != null ? Math.round(machine.rpm).toLocaleString() : "N/A"}
        />
      </div>

      {/* Timestamp */}
      <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100/60">
        <span className="flex items-center gap-1.5">
          <Activity className="h-3 w-3" />
          {machine.lastUpdated
            ? `Updated ${new Date(machine.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "Live telemetry"}
        </span>
        <span className="text-[10px] text-slate-400 font-medium">ID: {machine.machineId}</span>
      </div>
    </article>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50/50 p-2 border border-slate-100">
      <div className="flex items-center gap-1 text-slate-400">
        <Icon className="h-3 w-3" />
        <span className="truncate text-[10px] font-medium">{label}</span>
      </div>
      <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">{value}</p>
    </div>
  );
}
