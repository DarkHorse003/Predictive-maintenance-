import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { formatRul } from "../../../utils/machineHealth";

function formatPredictionTime(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return null;
  }
}

export default function LiveMlAnalysisPanel({ prediction, loading, machineId }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-center h-full min-h-[140px]">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Sparkles className="h-4 w-4 animate-spin text-purple-600" />
          <span>Evaluating ML predictive intelligence...</span>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              ML Predictive Intelligence
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            No Prediction Available
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          No active ML prediction record found for Machine {machineId}. Telemetry is currently being buffered for inference window.
        </p>
      </div>
    );
  }

  const {
    failureProbability,
    rulHours,
    failureWithin24h,
    failureType,
    createdAt,
  } = prediction;

  const formattedTime = formatPredictionTime(createdAt);

  const riskPercent =
    failureProbability != null && !isNaN(Number(failureProbability))
      ? (Number(failureProbability) * 100).toFixed(1)
      : null;

  const isHighRisk = failureWithin24h === 1 || (failureProbability != null && failureProbability >= 0.75);
  const isWarningRisk = failureProbability != null && failureProbability >= 0.4 && failureProbability < 0.75;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
              ML Predictive Intelligence
            </span>
            {formattedTime && (
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                Prediction generated: {formattedTime}
              </span>
            )}
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isHighRisk
              ? "bg-red-50 text-red-700 ring-1 ring-red-200"
              : isWarningRisk
              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isHighRisk ? "bg-red-500" : isWarningRisk ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
          {isHighRisk ? "High Risk" : isWarningRisk ? "Elevated Risk" : "Normal Operation"}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Failure Probability */}
        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Failure Probability
          </span>
          <span
            className={`text-lg font-bold font-mono mt-0.5 block ${
              isHighRisk ? "text-red-700" : isWarningRisk ? "text-amber-700" : "text-slate-900"
            }`}
          >
            {riskPercent != null ? `${riskPercent}%` : "N/A"}
          </span>
          <span className="text-[10px] text-slate-400">Next 24h horizon</span>
        </div>

        {/* RUL */}
        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Remaining Life (RUL)
          </span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
            {formatRul(rulHours)}
          </span>
          <span className="text-[10px] text-slate-400">Estimated runtime</span>
        </div>

        {/* Predicted Failure Type */}
        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Failure Mode
          </span>
          <span className="text-sm font-bold capitalize text-slate-900 mt-1 block truncate">
            {failureType ? failureType.replace(/_/g, " ") : "None Detected"}
          </span>
          <span className="text-[10px] text-slate-400">Primary failure mechanism</span>
        </div>

        {/* 24h Risk Flag */}
        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            24h Failure Alert
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            {failureWithin24h === 1 ? (
              <>
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-bold text-red-700">Imminent Risk</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">Safe Window</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-slate-400">ML binary classifier</span>
        </div>
      </div>
    </div>
  );
}
