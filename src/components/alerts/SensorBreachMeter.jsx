import { Activity, Gauge, Flame, Zap, Wind, Compass } from "lucide-react";

export default function SensorBreachMeter({
  sensorName,
  sensorLabel,
  sensorCategory,
  sensorValue,
  threshold,
  unit = "",
  percentOver,
  severity = "WARNING",
}) {
  const isCritical = severity === "CRITICAL";

  // Calculate meter percentage: safe zone is 0-70%, threshold is 70%, breach extends to 100%
  let ratio = 100;
  if (threshold && sensorValue) {
    // If sensorValue is e.g. 61 and threshold is 60 -> 70% + (percentOver / 100) * 30%
    const calculated = 70 + Math.min(30, (percentOver || 0) * 0.6);
    ratio = Math.min(100, Math.max(10, calculated));
  }

  const categoryIcons = {
    Vibration: Activity,
    Thermal: Flame,
    Electrical: Zap,
    Pressure: Gauge,
    Speed: Compass,
    Environmental: Wind,
  };

  const IconComponent = categoryIcons[sensorCategory] || Activity;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-lg ${
              isCritical ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
            }`}
          >
            <IconComponent className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-semibold text-slate-800">
            {sensorLabel || sensorName || "Sensor"}
          </span>
        </div>

        {percentOver != null && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              isCritical
                ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                : "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
            }`}
          >
            +{percentOver}%
          </span>
        )}
      </div>

      {/* Numerical Comparison */}
      <div className="mt-2.5 flex items-baseline justify-between text-xs">
        <div>
          <span className="text-slate-400">Reading: </span>
          <span className="font-bold text-slate-900">
            {sensorValue ?? "—"} {unit}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Safe Limit: </span>
          <span className="font-semibold text-slate-600">
            {threshold ?? "—"} {unit}
          </span>
        </div>
      </div>

      {/* Visual Level Bar */}
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isCritical ? "bg-red-500" : "bg-amber-500"
          }`}
          style={{ width: `${ratio}%` }}
        />
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>0</span>
        <span className="font-medium text-slate-500">Threshold ({threshold} {unit})</span>
        <span className="text-red-500">Danger Zone</span>
      </div>
    </div>
  );
}
