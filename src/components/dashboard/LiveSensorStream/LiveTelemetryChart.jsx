import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SENSOR_CONFIG } from "../../../utils/telemetryThresholds";

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur ring-1 ring-slate-900/5">
      <p className="font-mono text-xs font-semibold text-slate-500 mb-2">
        Time: {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const config = SENSOR_CONFIG[entry.dataKey];
          if (!config) return null;
          const val = entry.value != null ? Number(entry.value).toFixed(2) : "N/A";
          const isOver = config.threshold != null && entry.value > config.threshold;

          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-medium text-slate-700">{config.label}:</span>
              </div>
              <span className={`font-mono font-bold ${isOver ? "text-red-600" : "text-slate-900"}`}>
                {val} {config.unit}
                {isOver && " (Over Limit!)"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LiveTelemetryChart({
  telemetryHistory = [],
  activeMetric = "vibrationRms",
  onChangeMetric,
  isLive,
}) {
  const selectedConfig = SENSOR_CONFIG[activeMetric] || SENSOR_CONFIG.vibrationRms;

  // Format data for chart display
  const chartData = useMemo(() => {
    return telemetryHistory.map((item, idx) => {
      let timeLabel = `T-${telemetryHistory.length - idx}`;
      if (item.timestamp) {
        try {
          const d = new Date(item.timestamp);
          if (!isNaN(d.getTime())) {
            timeLabel = d.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
          }
        } catch {
          // fallback to relative label
        }
      }

      return {
        time: timeLabel,
        timestamp: item.timestamp,
        vibrationRms: item.vibrationRms != null ? Number(item.vibrationRms) : null,
        temperatureMotor: item.temperatureMotor != null ? Number(item.temperatureMotor) : null,
        currentPhaseAvg: item.currentPhaseAvg != null ? Number(item.currentPhaseAvg) : null,
        rpm: item.rpm != null ? Number(item.rpm) : null,
        pressureLevel: item.pressureLevel != null ? Number(item.pressureLevel) : null,
        ambientTemp: item.ambientTemp != null ? Number(item.ambientTemp) : null,
      };
    });
  }, [telemetryHistory]);

  const metrics = [
    { key: "vibrationRms", label: "Vibration" },
    { key: "temperatureMotor", label: "Temperature" },
    { key: "currentPhaseAvg", label: "Current" },
    { key: "rpm", label: "RPM" },
    { key: "all", label: "Multi-Sensor" },
  ];

  const isMulti = activeMetric === "all";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      {/* Chart Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight text-slate-900">
              Live Telemetry Waveform
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isLive
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {isLive ? "STREAMING" : "WAITING"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Rolling window showing recent {telemetryHistory.length} readings (updates arrive on right, shift left)
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
          {metrics.map((m) => {
            const isActive = activeMetric === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => onChangeMetric(m.key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Waveform Canvas */}
      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center p-6">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping mb-2" />
            <p className="text-xs font-semibold text-slate-700">Connecting to telemetry buffer...</p>
            <p className="text-[11px] text-slate-400 mt-1">Waiting for initial sensor readings to plot</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomChartTooltip activeMetric={activeMetric} />} />

              {/* Threshold reference line if focused on single metric */}
              {!isMulti && selectedConfig.threshold != null && (
                <ReferenceLine
                  y={selectedConfig.threshold}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Limit: ${selectedConfig.threshold} ${selectedConfig.unit}`,
                    position: "insideTopRight",
                    fill: "#ef4444",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Multi-line or single focused line */}
              {isMulti ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="vibrationRms"
                    stroke={SENSOR_CONFIG.vibrationRms.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperatureMotor"
                    stroke={SENSOR_CONFIG.temperatureMotor.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="currentPhaseAvg"
                    stroke={SENSOR_CONFIG.currentPhaseAvg.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rpm"
                    stroke={SENSOR_CONFIG.rpm.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey={activeMetric}
                  stroke={selectedConfig.color}
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: selectedConfig.color }}
                  activeDot={{ r: 5, stroke: "#ffffff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Threshold / Legend Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          {isMulti ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SENSOR_CONFIG.vibrationRms.color }} />
                <span>Vibration (mm/s)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SENSOR_CONFIG.temperatureMotor.color }} />
                <span>Temperature (°C)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SENSOR_CONFIG.currentPhaseAvg.color }} />
                <span>Current (A)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SENSOR_CONFIG.rpm.color }} />
                <span>RPM</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">{selectedConfig.label}:</span>
              <span>{selectedConfig.description}</span>
            </div>
          )}
        </div>

        {!isMulti && selectedConfig.threshold != null && (
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="h-2 w-4 border-b-2 border-dashed border-red-500 inline-block" />
            <span>Configured Safe Limit: <strong>{selectedConfig.threshold} {selectedConfig.unit}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
