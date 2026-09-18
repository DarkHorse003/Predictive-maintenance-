import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Cpu,
  Gauge,
  Layers,
  MapPin,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Thermometer,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { OperationalStatusBadge, MachineHealthBadge, AlertBadge } from "../components/common/StatusBadge";
import { getMachineById } from "../services/machineApi";
import { getMachineTelemetry, getLatestTelemetry } from "../services/telemetryApi";
import { runPrediction } from "../services/predictionApi";
import { useAlerts } from "../context/useAlerts";
import {
  formatFailureRisk,
  formatRul,
  formatSensorValue,
} from "../utils/machineHealth";
import { formatDateTime, formatTimeAgo } from "../utils/date";

const telemetryChartConfigs = {
  temperature: {
    label: "Motor Temperature",
    unit: "°C",
    key: "temperature",
    stroke: "#ef4444",
    icon: Thermometer,
    desc: "Motor thermal condition over time",
  },
  vibration: {
    label: "Vibration RMS",
    unit: "mm/s",
    key: "vibration",
    stroke: "#f59e0b",
    icon: Activity,
    desc: "Mechanical vibration & imbalance",
  },
  current: {
    label: "Phase Current",
    unit: "A",
    key: "current",
    stroke: "#3b82f6",
    icon: Zap,
    desc: "Electrical draw across phases",
  },
  pressure: {
    label: "Operating Pressure",
    unit: "bar",
    key: "pressure",
    stroke: "#8b5cf6",
    icon: Gauge,
    desc: "Hydraulic / pneumatic system pressure",
  },
  rpm: {
    label: "Rotational Speed",
    unit: "RPM",
    key: "rpm",
    stroke: "#10b981",
    icon: Cpu,
    desc: "Spindle / rotor rotational speed",
  },
  ambient: {
    label: "Ambient Temperature",
    unit: "°C",
    key: "ambient",
    stroke: "#64748b",
    icon: Thermometer,
    desc: "Surrounding environment temperature",
  },
};

export default function MachineDetails() {
  const { machineId } = useParams();
  const [machine, setMachine] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [currentTelemetry, setCurrentTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningPredict, setRunningPredict] = useState(false);
  const [predictMessage, setPredictMessage] = useState(null);
  const [activeChartKey, setActiveChartKey] = useState("temperature");

  // Freshness & live telemetry state
  const [lastReceivedAt, setLastReceivedAt] = useState(null);
  const [lastUpdateText, setLastUpdateText] = useState("Waiting for telemetry...");
  const [isLive, setIsLive] = useState(false);
  const lastSeenTelemetryKeyRef = useRef(null);

  const {
    alerts,
    acknowledgeAlert,
    resolveAlert,
    refreshAlerts,
  } = useAlerts();

  // Freshness ticker (runs every 500ms)
  useEffect(() => {
    const ticker = setInterval(() => {
      if (!lastReceivedAt) {
        setLastUpdateText("Waiting for telemetry...");
        setIsLive(false);
        return;
      }
      const elapsedSec = Math.floor((Date.now() - lastReceivedAt.getTime()) / 1000);
      if (elapsedSec < 2) {
        setLastUpdateText("Just now (< 2s)");
        setIsLive(true);
      } else if (elapsedSec < 15) {
        setLastUpdateText(`${elapsedSec}s ago`);
        setIsLive(true);
      } else {
        setLastUpdateText(`Telemetry delayed (${elapsedSec}s ago)`);
        setIsLive(false);
      }
    }, 500);

    return () => clearInterval(ticker);
  }, [lastReceivedAt]);

  // Load Machine info and telemetry
  const reloadData = useCallback(async (showSpinner = false) => {
    if (!machineId) return;
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const [mData, tData, latest] = await Promise.all([
        getMachineById(machineId),
        getMachineTelemetry(machineId),
        getLatestTelemetry(machineId),
      ]);
      setMachine(mData);
      const validHistory = Array.isArray(tData) ? tData : [];
      setTelemetryHistory(validHistory);

      if (latest && latest.timestamp) {
        const key = `${latest.id || ""}_${latest.timestamp || ""}`;
        lastSeenTelemetryKeyRef.current = key;
        setCurrentTelemetry(latest);
        setLastReceivedAt(new Date());
        setIsLive(true);
      } else if (validHistory.length > 0) {
        const latestFromHist = validHistory[validHistory.length - 1];
        const key = `${latestFromHist.id || ""}_${latestFromHist.timestamp || ""}`;
        lastSeenTelemetryKeyRef.current = key;
        setCurrentTelemetry(latestFromHist);
        setLastReceivedAt(new Date());
        setIsLive(true);
      } else {
        lastSeenTelemetryKeyRef.current = null;
        setCurrentTelemetry(null);
        setLastReceivedAt(null);
        setIsLive(false);
      }
    } catch (err) {
      console.error("Failed to load machine data", err);
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  useEffect(() => {
    let active = true;
    lastSeenTelemetryKeyRef.current = null;

    (async () => {
      try {
        const [mData, tData, latest] = await Promise.all([
          getMachineById(machineId),
          getMachineTelemetry(machineId),
          getLatestTelemetry(machineId),
        ]);
        if (!active) return;
        setMachine(mData);
        const validHistory = Array.isArray(tData) ? tData : [];
        setTelemetryHistory(validHistory);

        if (latest && latest.timestamp) {
          const key = `${latest.id || ""}_${latest.timestamp || ""}`;
          lastSeenTelemetryKeyRef.current = key;
          setCurrentTelemetry(latest);
          setLastReceivedAt(new Date());
          setIsLive(true);
        } else if (validHistory.length > 0) {
          const latestFromHist = validHistory[validHistory.length - 1];
          const key = `${latestFromHist.id || ""}_${latestFromHist.timestamp || ""}`;
          lastSeenTelemetryKeyRef.current = key;
          setCurrentTelemetry(latestFromHist);
          setLastReceivedAt(new Date());
          setIsLive(true);
        }
      } catch (err) {
        console.error("Failed to load initial machine data", err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    // Live polling loop every 2500ms
    const interval = setInterval(async () => {
      try {
        const nextPoint = await getLatestTelemetry(machineId);
        if (!active || !nextPoint || !nextPoint.timestamp) return;

        const nextKey = `${nextPoint.id || ""}_${nextPoint.timestamp || ""}`;
        // Only trigger update if a genuinely new reading arrived from the simulator
        if (nextKey !== lastSeenTelemetryKeyRef.current) {
          lastSeenTelemetryKeyRef.current = nextKey;
          setCurrentTelemetry(nextPoint);
          setLastReceivedAt(new Date());
          setIsLive(true);

          setTelemetryHistory((currentHistory) => {
            const exists = currentHistory.some(
              (p) => (p.id && p.id === nextPoint.id) || p.timestamp === nextPoint.timestamp
            );
            if (exists) return currentHistory;
            const updated = [...currentHistory, nextPoint];
            return updated.slice(-40);
          });
        }
      } catch {
        // Network blip handled gracefully
      }
    }, 2500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [machineId, reloadData]);

  // Merge live telemetry values with machine record
  const activeSensors = useMemo(() => {
    return {
      temperatureMotor: currentTelemetry?.temperatureMotor ?? machine?.temperatureMotor,
      vibrationRms: currentTelemetry?.vibrationRms ?? machine?.vibrationRms,
      currentPhaseAvg: currentTelemetry?.currentPhaseAvg ?? machine?.currentPhaseAvg,
      pressureLevel: currentTelemetry?.pressureLevel ?? machine?.pressureLevel,
      rpm: currentTelemetry?.rpm ?? machine?.rpm,
      ambientTemp: currentTelemetry?.ambientTemp ?? machine?.ambientTemp,
      eventTimestamp: currentTelemetry?.timestamp ?? machine?.lastUpdated,
    };
  }, [currentTelemetry, machine]);

  // Alerts for this machine
  const machineAlerts = useMemo(() => {
    return alerts.filter((a) => String(a.machineId) === String(machineId));
  }, [alerts, machineId]);

  const openAlerts = useMemo(
    () => machineAlerts.filter((a) => !a.resolved && a.status === "OPEN"),
    [machineAlerts]
  );

  const acknowledgedAlerts = useMemo(
    () => machineAlerts.filter((a) => !a.resolved && a.status === "ACKNOWLEDGED"),
    [machineAlerts]
  );

  const resolvedAlerts = useMemo(
    () => machineAlerts.filter((a) => a.resolved || a.status === "RESOLVED"),
    [machineAlerts]
  );

  const criticalOpenAlerts = useMemo(
    () => openAlerts.filter((a) => a.severity === "CRITICAL"),
    [openAlerts]
  );

  const warningOpenAlerts = useMemo(
    () => openAlerts.filter((a) => a.severity === "WARNING" || a.severity === "HIGH"),
    [openAlerts]
  );

  // Trigger manual ML prediction inference
  const handleRunPrediction = async () => {
    if (!machineId) return;
    setRunningPredict(true);
    setPredictMessage(null);
    try {
      const pred = await runPrediction(machineId);
      if (pred) {
        setPredictMessage("ML Inference successful. Model health updated.");
        const refreshed = await getMachineById(machineId);
        if (refreshed) setMachine(refreshed);
        refreshAlerts();
      } else {
        setPredictMessage("Prediction executed.");
      }
    } catch (err) {
      setPredictMessage("ML service inference error: " + (err?.message || "Unavailable"));
    } finally {
      setRunningPredict(false);
      setTimeout(() => setPredictMessage(null), 5000);
    }
  };

  // Format telemetry chart points
  const chartPoints = useMemo(() => {
    if (!telemetryHistory.length) {
      // If telemetryHistory is empty, build a single point from machine's current readings
      if (!machine) return [];
      return [
        {
          time: "Current",
          temperature: machine.temperatureMotor,
          vibration: machine.vibrationRms,
          current: machine.currentPhaseAvg,
          pressure: machine.pressureLevel,
          rpm: machine.rpm,
          ambient: machine.ambientTemp,
        },
      ];
    }

    return telemetryHistory.map((pt, idx) => {
      let timeStr = `T-${telemetryHistory.length - idx}`;
      if (pt.timestamp) {
        try {
          const d = new Date(pt.timestamp);
          if (!isNaN(d.getTime())) {
            timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          }
        } catch {
          timeStr = "Logged";
        }
      }
      return {
        time: timeStr,
        temperature: pt.temperatureMotor != null ? Number(pt.temperatureMotor) : null,
        vibration: pt.vibrationRms != null ? Number(pt.vibrationRms) : null,
        current: pt.currentPhaseAvg != null ? Number(pt.currentPhaseAvg) : null,
        pressure: pt.pressureLevel != null ? Number(pt.pressureLevel) : null,
        rpm: pt.rpm != null ? Math.round(Number(pt.rpm)) : null,
        ambient: pt.ambientTemp != null ? Number(pt.ambientTemp) : null,
      };
    });
  }, [telemetryHistory, machine]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
        <p className="mt-3 text-sm font-medium text-slate-500">Loading machine details...</p>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Machine not found</h1>
        <p className="mt-2 text-sm text-slate-500">The requested machine ID could not be loaded.</p>
        <Link
          to="/machines"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <ArrowLeft size={16} /> Back to Machines
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/machines"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Fleet Inventory
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reloadData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Real-Time
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION A: STATUS HIERARCHY & PHYSICAL MACHINE STATE     */}
      {/* ======================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <span>Section A</span>
                <span>•</span>
                <span>Physical Machine State & Telemetry Liveness</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {machine.displayId} — {machine.name || `Machine ${machine.machineId}`}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  Type: <strong className="font-semibold text-slate-700">{machine.machineType}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  Location: <strong className="font-semibold text-slate-700">{machine.location || "Production Floor"}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                  Telemetry Event:{" "}
                  <strong className="font-semibold text-slate-700 font-mono">
                    {activeSensors.eventTimestamp ? activeSensors.eventTimestamp.replace("T", " ") : "N/A"}
                  </strong>
                </span>
                <span className="flex items-center gap-1">
                  <Radio className="h-3.5 w-3.5 text-slate-400" />
                  Arrival: <strong className="font-semibold text-slate-700">{lastUpdateText}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* 4-Part Status Hierarchy: Operational Status, Telemetry Freshness, Machine Health, Active Alerts */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-slate-50/80 p-3 border border-slate-100">
            {/* 1. Operational Status */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                1. Operational Status
              </span>
              <div className="mt-1.5">
                <OperationalStatusBadge status={machine.operationalStatus || machine.status} size="md" />
              </div>
            </div>

            {/* 2. Telemetry Stream Liveness */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                2. Telemetry Stream
              </span>
              <div className="mt-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isLive
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-slate-200/80 text-slate-600 ring-1 ring-slate-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  {isLive ? `LIVE · ${lastUpdateText}` : `STALE · ${lastUpdateText}`}
                </span>
              </div>
            </div>

            {/* 3. Predicted Health */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                3. Predicted Health
              </span>
              <div className="mt-1.5">
                <MachineHealthBadge health={machine.machineHealth} size="md" />
              </div>
            </div>

            {/* 4. Active Alerts */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                4. Active Alerts
              </span>
              <div className="mt-1.5">
                <AlertBadge
                  total={openAlerts.length}
                  critical={criticalOpenAlerts.length}
                  warning={warningOpenAlerts.length}
                  size="md"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION B: MACHINE HEALTH (DERIVED FROM ML PREDICTION)   */}
      {/* ======================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <Sparkles className="h-4 w-4" />
              <span>Section B</span>
              <span>•</span>
              <span>Machine Health (ML Prediction Intelligence)</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Predictive Health & Remaining Useful Life
            </h2>
            <p className="text-xs text-slate-500">
              Classified from ML model failure probability, 24-hour failure classification, and RUL estimation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Health:</span>
              <MachineHealthBadge health={machine.machineHealth} size="lg" />
            </div>

            <button
              type="button"
              disabled={runningPredict}
              onClick={handleRunPrediction}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition"
              title="Run inference via FastAPI ML model"
            >
              <Cpu className={`h-3.5 w-3.5 ${runningPredict ? "animate-spin" : ""}`} />
              {runningPredict ? "Inferring..." : "Run ML Prediction"}
            </button>
          </div>
        </div>

        {predictMessage && (
          <div className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
            {predictMessage}
          </div>
        )}

        {/* ML Metric Cards */}
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Failure Probability
            </span>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatFailureRisk(machine.failureProbability)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {machine.failureProbability == null
                ? "Inference unavailable"
                : machine.failureProbability >= 0.75
                ? "Critical hazard (≥ 75%)"
                : machine.failureProbability >= 0.4
                ? "Warning risk (40-75%)"
                : "Safe threshold (< 40%)"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Failure Within 24 Hours
            </span>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {machine.failureWithin24h === 1 ? (
                <span className="text-red-600">Yes (Imminent)</span>
              ) : machine.failureWithin24h === 0 ? (
                <span className="text-emerald-700">No (Safe)</span>
              ) : (
                <span className="text-slate-400">N/A</span>
              )}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Binary 24h shutdown classifier
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Remaining Useful Life (RUL)
            </span>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatRul(machine.rulHours)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {machine.rulHours == null
                ? "Estimation pending"
                : machine.rulHours <= 24
                ? "Depleted (≤ 24h shutdown)"
                : machine.rulHours <= 72
                ? "Elevated wear (24-72h)"
                : "Extended life (> 72h)"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Predicted Failure Type
            </span>
            <p className="mt-1 text-lg font-bold text-slate-900 truncate">
              {machine.failureType || "None / Nominal"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {machine.predictionCreatedAt
                ? `Inferred ${formatTimeAgo(machine.predictionCreatedAt)}`
                : "Awaiting next model cycle"}
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION C: ACTIVE ALERTS (THRESHOLD & INCIDENT RULES)    */}
      {/* ======================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600">
              <ShieldAlert className="h-4 w-4" />
              <span>Section C</span>
              <span>•</span>
              <span>Active Alerts (Sensor Threshold & Anomaly Rules)</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Machine Incident & Threshold Alarms
            </h2>
            <p className="text-xs text-slate-500">
              Distinct event triggers generated by telemetry breaches or specific ML rule violations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Open Alerts:
            </span>
            <AlertBadge
              total={openAlerts.length}
              critical={criticalOpenAlerts.length}
              warning={warningOpenAlerts.length}
              size="lg"
            />
          </div>
        </div>

        {/* Alert Summary Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <span className="text-slate-400 font-medium">Total Logged:</span>
            <p className="mt-0.5 text-base font-bold text-slate-800">{machineAlerts.length}</p>
          </div>
          <div className="rounded-xl bg-amber-50/50 p-3 border border-amber-100">
            <span className="text-amber-700 font-medium">Open & Active:</span>
            <p className="mt-0.5 text-base font-bold text-amber-900">{openAlerts.length}</p>
          </div>
          <div className="rounded-xl bg-blue-50/50 p-3 border border-blue-100">
            <span className="text-blue-700 font-medium">Acknowledged:</span>
            <p className="mt-0.5 text-base font-bold text-blue-900">{acknowledgedAlerts.length}</p>
          </div>
          <div className="rounded-xl bg-emerald-50/50 p-3 border border-emerald-100">
            <span className="text-emerald-700 font-medium">Resolved:</span>
            <p className="mt-0.5 text-base font-bold text-emerald-900">{resolvedAlerts.length}</p>
          </div>
        </div>

        {/* Alerts List / Table */}
        <div className="mt-5">
          {machineAlerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500">
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
              <p className="mt-2 font-semibold text-slate-700">No alerts on record for this machine</p>
              <p className="mt-0.5 text-slate-400">All sensor readings remain within configured safety boundaries.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2.5">Severity</th>
                      <th className="px-3.5 py-2.5">Source</th>
                      <th className="px-3.5 py-2.5">Alert Type & Message</th>
                      <th className="px-3.5 py-2.5">Value vs Safe Limit</th>
                      <th className="px-3.5 py-2.5">Occurred At</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {machineAlerts.map((alert) => {
                      const isCritical = alert.severity === "CRITICAL";
                      const isOpen = alert.status === "OPEN" && !alert.resolved;
                      const isAck = alert.status === "ACKNOWLEDGED" && !alert.resolved;

                      return (
                        <tr
                          key={alert.id}
                          className={`transition ${isOpen ? "bg-amber-50/20" : "hover:bg-slate-50"}`}
                        >
                          <td className="px-3.5 py-3 font-semibold">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isCritical
                                  ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              }`}
                            >
                              {alert.severity}
                            </span>
                          </td>
                          <td className="px-3.5 py-3">
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                alert.source === "ML"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {alert.source || "SENSOR"}
                            </span>
                          </td>
                          <td className="px-3.5 py-3">
                            <p className="font-bold text-slate-900">{alert.alertType || alert.title}</p>
                            <p className="mt-0.5 text-slate-500 max-w-sm truncate">{alert.message}</p>
                          </td>
                          <td className="px-3.5 py-3 font-mono">
                            {alert.sensorValue != null && alert.threshold != null ? (
                              <div>
                                <span className="font-bold text-red-600">
                                  {alert.sensorValue} {alert.unit}
                                </span>
                                <span className="text-slate-400"> / Safe limit {alert.threshold} {alert.unit}</span>
                                {alert.percentOver != null && (
                                  <span className="ml-1 text-[10px] text-red-500 font-semibold">
                                    (+{alert.percentOver}%)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">Rule triggered</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-slate-500">
                            {formatDateTime(alert.createdAt)}
                          </td>
                          <td className="px-3.5 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isOpen
                                  ? "bg-amber-100 text-amber-800"
                                  : isAck
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {alert.status}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isOpen && (
                                <button
                                  type="button"
                                  onClick={() => acknowledgeAlert(alert.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
                                  title="Acknowledge alert"
                                >
                                  <Check className="h-3 w-3" />
                                  Ack
                                </button>
                              )}
                              {!alert.resolved && (
                                <button
                                  type="button"
                                  onClick={() => resolveAlert(alert.id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-sm"
                                  title="Resolve alert"
                                >
                                  <CheckCheck className="h-3 w-3" />
                                  Resolve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION D: RECENT TELEMETRY (SENSOR READINGS & CHARTS)   */}
      {/* ======================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Activity className="h-4 w-4" />
              <span>Section D</span>
              <span>•</span>
              <span>Recent Telemetry (Live Sensor Metrics)</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              High-Frequency Sensor Readings & Trends
            </h2>
            <p className="text-xs text-slate-500">
              Real-time MQTT telemetry streamed from machine vibration, thermal, and electrical transducers.
            </p>
          </div>

          <span className="text-xs text-slate-400">
            {telemetryHistory.length === 1
              ? "1 reading logged"
              : `${telemetryHistory.length} readings logged`}
          </span>
        </div>

        {/* 6 Key Telemetry Metric Cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <TelemetryMetricCard
            label="Motor Temp"
            value={formatSensorValue(activeSensors.temperatureMotor, "°C")}
            icon={Thermometer}
            active={activeChartKey === "temperature"}
            onClick={() => setActiveChartKey("temperature")}
          />
          <TelemetryMetricCard
            label="Vibration RMS"
            value={formatSensorValue(activeSensors.vibrationRms, "mm/s")}
            icon={Activity}
            active={activeChartKey === "vibration"}
            onClick={() => setActiveChartKey("vibration")}
          />
          <TelemetryMetricCard
            label="Phase Current"
            value={formatSensorValue(activeSensors.currentPhaseAvg, "A")}
            icon={Zap}
            active={activeChartKey === "current"}
            onClick={() => setActiveChartKey("current")}
          />
          <TelemetryMetricCard
            label="Pressure"
            value={formatSensorValue(activeSensors.pressureLevel, "bar")}
            icon={Gauge}
            active={activeChartKey === "pressure"}
            onClick={() => setActiveChartKey("pressure")}
          />
          <TelemetryMetricCard
            label="RPM"
            value={activeSensors.rpm != null ? Math.round(activeSensors.rpm).toLocaleString() : "N/A"}
            icon={Cpu}
            active={activeChartKey === "rpm"}
            onClick={() => setActiveChartKey("rpm")}
          />
          <TelemetryMetricCard
            label="Ambient Temp"
            value={formatSensorValue(activeSensors.ambientTemp, "°C")}
            icon={Thermometer}
            active={activeChartKey === "ambient"}
            onClick={() => setActiveChartKey("ambient")}
          />
        </div>

        {/* Interactive Sensor Chart */}
        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {telemetryChartConfigs[activeChartKey]?.label} Trend
              </span>
              <span className="text-xs text-slate-400">
                ({telemetryChartConfigs[activeChartKey]?.unit})
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs">
              {Object.keys(telemetryChartConfigs).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setActiveChartKey(k)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    activeChartKey === k
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {telemetryChartConfigs[k].label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "0.75rem",
                    color: "#f8fafc",
                    fontSize: "0.75rem",
                  }}
                  formatter={(val) => [`${val} ${telemetryChartConfigs[activeChartKey].unit}`, telemetryChartConfigs[activeChartKey].label]}
                />
                <Line
                  type="monotone"
                  dataKey={telemetryChartConfigs[activeChartKey].key}
                  stroke={telemetryChartConfigs[activeChartKey].stroke}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: telemetryChartConfigs[activeChartKey].stroke }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

function TelemetryMetricCard({ label, value, icon: Icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl p-3 text-left transition border ${
        active
          ? "border-slate-900 bg-white ring-2 ring-slate-900 shadow-sm"
          : "border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-1 text-base font-bold text-slate-900 truncate">{value}</p>
    </button>
  );
}
