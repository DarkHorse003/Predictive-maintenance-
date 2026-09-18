import { Activity, Flame, Zap, Compass, Gauge, Wind } from "lucide-react";
import { SENSOR_CONFIG, evaluateSensorBreach } from "../../../utils/telemetryThresholds";

const ICONS = {
  vibrationRms: Activity,
  temperatureMotor: Flame,
  currentPhaseAvg: Zap,
  rpm: Compass,
  pressureLevel: Gauge,
  ambientTemp: Wind,
};

export default function SensorMetricsGrid({
  currentTelemetry,
  isLive,
  activeMetric,
  onSelectMetric,
}) {
  const sensors = [
    "vibrationRms",
    "temperatureMotor",
    "currentPhaseAvg",
    "rpm",
    "pressureLevel",
    "ambientTemp",
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {sensors.map((key) => {
        const config = SENSOR_CONFIG[key];
        const rawValue = currentTelemetry ? currentTelemetry[key] : null;
        const Icon = ICONS[key] || Activity;
        const breachState = evaluateSensorBreach(key, rawValue);
        const isSelected = activeMetric === key;

        let formattedValue = "N/A";
        if (rawValue != null && !isNaN(Number(rawValue))) {
          const num = Number(rawValue);
          // Format with sensible precision
          formattedValue = key === "rpm" ? Math.round(num).toString() : num.toFixed(2);
        }

        const isCritical = breachState === "CRITICAL";
        const isWarning = breachState === "WARNING";

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectMetric(key)}
            className={`group flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
              isSelected
                ? "border-slate-800 bg-slate-900 text-white shadow-md ring-1 ring-slate-800"
                : isCritical
                ? "border-red-200 bg-red-50/40 hover:bg-red-50"
                : isWarning
                ? "border-amber-200 bg-amber-50/40 hover:bg-amber-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            {/* Header: Icon + Label */}
            <div className="flex items-center justify-between">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  isSelected
                    ? "bg-white/10 text-white"
                    : isCritical
                    ? "bg-red-100 text-red-600"
                    : isWarning
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>

              {/* Status Pill */}
              <span
                className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  isSelected
                    ? "bg-white/15 text-slate-200"
                    : isLive
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                {isLive ? "Live" : "Stale"}
              </span>
            </div>

            {/* Value & Unit */}
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-xl font-bold tracking-tight font-mono ${
                    isSelected
                      ? "text-white"
                      : isCritical
                      ? "text-red-700"
                      : isWarning
                      ? "text-amber-700"
                      : "text-slate-900"
                  }`}
                >
                  {formattedValue}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isSelected ? "text-slate-300" : "text-slate-400"
                  }`}
                >
                  {config.unit}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span
                  className={`font-semibold truncate ${
                    isSelected ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {config.shortLabel}
                </span>

                <span
                  className={`text-[10px] font-medium ${
                    isSelected ? "text-slate-400" : "text-slate-400"
                  }`}
                  title={`Safe threshold: ${config.threshold} ${config.unit}`}
                >
                  Limit: {config.threshold}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
