import { ArrowRight, Cpu, Database, Radio, Server, Sparkles } from "lucide-react";

export default function TelemetryPipelineFlow({
  isLive,
  lastUpdateText,
  mlStatus = "READY",
}) {
  const steps = [
    {
      name: "Sensor Stream",
      subtext: "Simulated Replay",
      icon: Radio,
      status: isLive ? "ACTIVE" : "WAITING",
    },
    {
      name: "MQTT Broker",
      subtext: "Telemetry Broker",
      icon: Cpu,
      status: isLive ? "ACTIVE" : "WAITING",
    },
    {
      name: "Spring Boot",
      subtext: "PostgreSQL & API",
      icon: Server,
      status: isLive ? "CONNECTED" : "CONNECTING",
    },
    {
      name: "ML Service",
      subtext: "FastAPI Engine",
      icon: Sparkles,
      status: mlStatus === "READY" ? "READY" : mlStatus === "NO_PREDICTION" ? "STANDBY" : "OFFLINE",
    },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Pipeline Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Database className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Telemetry Pipeline
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[9px] font-bold ${
                isLive
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {isLive ? "LIVE · SIMULATED SENSOR STREAM" : "TELEMETRY DELAYED"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Last telemetry received: <strong className="text-slate-700">{lastUpdateText}</strong>
          </p>
        </div>
      </div>

      {/* Pipeline Steps with directional arrows */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === steps.length - 1;
          const isStepLive = step.status === "ACTIVE" || step.status === "CONNECTED" || step.status === "READY";

          return (
            <div key={step.name} className="flex items-center gap-1.5 shrink-0">
              <div
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition ${
                  isStepLive
                    ? "border-slate-200 bg-slate-50/80"
                    : "border-slate-100 bg-slate-50 opacity-60"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                    isStepLive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-800">
                      {step.name}
                    </span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isStepLive ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 block -mt-0.5">
                    {step.subtext}
                  </span>
                </div>
              </div>

              {!isLast && (
                <ArrowRight className={`h-3 w-3 ${isLive ? "text-slate-400 animate-pulse" : "text-slate-300"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
