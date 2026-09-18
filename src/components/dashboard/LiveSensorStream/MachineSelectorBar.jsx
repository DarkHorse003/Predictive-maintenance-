import { Cpu, RefreshCw } from "lucide-react";
import { OperationalStatusBadge, MachineHealthBadge } from "../../common/StatusBadge";

export default function MachineSelectorBar({
  machines = [],
  selectedMachineId,
  onSelectMachine,
  selectedMachine,
  isRefreshing,
  onRefresh,
}) {
  const onlineCount = machines.filter(
    (m) => (m.operationalStatus || m.status) === "ACTIVE"
  ).length;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Machine Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
          <Cpu className="h-5 w-5" />
        </div>

        <div>
          <label htmlFor="live-machine-select" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Monitored Asset
          </label>
          <div className="flex items-center gap-2">
            <select
              id="live-machine-select"
              value={selectedMachineId || ""}
              onChange={(e) => onSelectMachine(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
            >
              {machines.map((m) => {
                const id = String(m.machineId || m.id);
                const disp = m.displayId || `M-${id.padStart(2, "0")}`;
                return (
                  <option key={id} value={id}>
                    {disp} — {m.name || `Machine ${id}`} ({m.machineType || "CNC"})
                  </option>
                );
              })}
            </select>

            {selectedMachine && (
              <div className="hidden sm:flex items-center gap-1.5">
                <OperationalStatusBadge
                  status={selectedMachine.operationalStatus || selectedMachine.status || "ACTIVE"}
                />
                <MachineHealthBadge
                  health={selectedMachine.machineHealth || "UNKNOWN"}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Asset Fleet Metadata & Sync */}
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-700">
            <strong className="text-slate-900">{onlineCount || machines.length}</strong> / {machines.length} Active Machines
          </span>
        </div>

        <button
          type="button"
          disabled={isRefreshing}
          onClick={onRefresh}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          title="Refresh telemetry stream"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Sync</span>
        </button>
      </div>
    </div>
  );
}
