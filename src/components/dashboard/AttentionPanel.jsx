import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { OperationalStatusBadge, MachineHealthBadge, AlertBadge } from "../common/StatusBadge";
import { useAlerts } from "../../context/useAlerts";
import { formatFailureRisk, formatRul, getMachineAlertSummary } from "../../utils/machineHealth";

export default function AttentionPanel({ machines }) {
  const navigate = useNavigate();
  const { alerts } = useAlerts();

  // Find machines requiring attention based on either:
  // 1. Machine Health is WARNING or CRITICAL
  // 2. OR machine has active open alerts
  const attentionList = machines
    .map((m) => {
      const alertSummary = getMachineAlertSummary(alerts, m.machineId);
      const isHealthAttention = m.machineHealth === "WARNING" || m.machineHealth === "CRITICAL";
      const hasActiveAlerts = alertSummary.hasAlerts;
      return {
        machine: m,
        alertSummary,
        needsAttention: isHealthAttention || hasActiveAlerts,
        riskScore: (m.failureProbability || 0) + (alertSummary.critical * 2) + alertSummary.warning,
      };
    })
    .filter((item) => item.needsAttention)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);

  if (attentionList.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">All Systems Stable</h2>
            <p className="text-xs text-slate-500">No active alerts or elevated failure risks detected across assets.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-slate-900">Attention Required</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Monitored machines with active threshold alerts or elevated ML failure risk.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/machines")}
          className="inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:self-auto"
        >
          View all machines
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {attentionList.map(({ machine, alertSummary }) => (
          <button
            type="button"
            key={machine.machineId}
            onClick={() => navigate(`/machines/${machine.machineId}`)}
            className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                {machine.displayId}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{machine.displayId}</span>
                  <span className="text-xs text-slate-400">· {machine.machineType}</span>
                </div>
                {/* Clearly render the 3 concepts */}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span className="font-medium">Op:</span>
                    <OperationalStatusBadge status={machine.operationalStatus || machine.status} />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span className="font-medium">Health:</span>
                    <MachineHealthBadge health={machine.machineHealth} />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span className="font-medium">Alerts:</span>
                    <AlertBadge
                      total={alertSummary.total}
                      critical={alertSummary.critical}
                      warning={alertSummary.warning}
                      text={alertSummary.text}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 md:min-w-[240px]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Failure Risk</p>
                <p className="mt-0.5 text-sm font-bold text-slate-800">
                  {formatFailureRisk(machine.failureProbability)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">RUL</p>
                <p className="mt-0.5 text-sm font-bold text-slate-800">
                  {formatRul(machine.rulHours)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
