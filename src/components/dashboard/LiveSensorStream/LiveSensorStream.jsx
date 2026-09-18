import { useEffect, useMemo, useRef, useState } from "react";
import { getMachineTelemetry, getLatestTelemetry } from "../../../services/telemetryApi";
import { getLatestPrediction } from "../../../services/predictionApi";
import MachineSelectorBar from "./MachineSelectorBar";
import SensorMetricsGrid from "./SensorMetricsGrid";
import LiveTelemetryChart from "./LiveTelemetryChart";
import TelemetryPipelineFlow from "./TelemetryPipelineFlow";
import LiveMlAnalysisPanel from "./LiveMlAnalysisPanel";

const ROLLING_WINDOW_LIMIT = 40;
const POLLING_INTERVAL_MS = 2500;
const STALE_THRESHOLD_SECONDS = 15;

export default function LiveSensorStream({ machines = [] }) {
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Derive the active machine ID safely without synchronous effect state updates
  const activeMachineId = useMemo(() => {
    if (selectedMachineId && machines.some((m) => String(m.machineId || m.id) === selectedMachineId)) {
      return selectedMachineId;
    }
    if (machines.length > 0) {
      return String(machines[0].machineId || machines[0].id);
    }
    return "1";
  }, [machines, selectedMachineId]);

  const selectedMachine = machines.find(
    (m) => String(m.machineId || m.id) === activeMachineId
  );

  // Telemetry buffer & active readings
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [currentTelemetry, setCurrentTelemetry] = useState(null);
  const [activeMetric, setActiveMetric] = useState("vibrationRms");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ref to track last seen telemetry key (id + timestamp) to detect actual new arrivals
  const lastSeenTelemetryKeyRef = useRef(null);

  // ML Prediction for this machine
  const [prediction, setPrediction] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Timing & Liveness state
  const [lastReceivedAt, setLastReceivedAt] = useState(null);
  const [lastUpdateText, setLastUpdateText] = useState("Waiting for telemetry...");
  const [isLive, setIsLive] = useState(false);

  const isMountedRef = useRef(true);

  // Freshness calculation ticker (updates every 500ms)
  useEffect(() => {
    isMountedRef.current = true;
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
      } else if (elapsedSec < STALE_THRESHOLD_SECONDS) {
        setLastUpdateText(`${elapsedSec}s ago`);
        setIsLive(true);
      } else {
        setLastUpdateText(`Telemetry delayed (${elapsedSec}s ago)`);
        setIsLive(false);
      }
    }, 500);

    return () => {
      isMountedRef.current = false;
      clearInterval(ticker);
    };
  }, [lastReceivedAt]);

  // Telemetry stream and ML prediction lifecycle
  useEffect(() => {
    let isCancelled = false;

    const loadInitialData = async () => {
      setIsRefreshing(true);
      setMlLoading(true);
      try {
        const [history, latest, pred] = await Promise.all([
          getMachineTelemetry(activeMachineId),
          getLatestTelemetry(activeMachineId),
          getLatestPrediction(activeMachineId),
        ]);

        if (isCancelled) return;

        setPrediction(pred);
        setMlLoading(false);

        const validHistory = Array.isArray(history) ? history : [];
        setTelemetryHistory(validHistory.slice(-ROLLING_WINDOW_LIMIT));

        if (latest && latest.timestamp) {
          const key = `${latest.id || ""}_${latest.timestamp || ""}`;
          lastSeenTelemetryKeyRef.current = key;
          setCurrentTelemetry(latest);
          setLastReceivedAt(new Date());
          setIsLive(true);

          setTelemetryHistory((prev) => {
            const exists = prev.some(
              (p) => (p.id && p.id === latest.id) || p.timestamp === latest.timestamp
            );
            if (exists) return prev;
            const next = [...prev, latest];
            return next.slice(-ROLLING_WINDOW_LIMIT);
          });
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
        console.error("Telemetry stream initialization error", err);
        if (!isCancelled) {
          setIsLive(false);
          setMlLoading(false);
        }
      } finally {
        if (!isCancelled) {
          setIsRefreshing(false);
        }
      }
    };

    loadInitialData();

    // Start polling loop for ongoing telemetry
    const interval = setInterval(async () => {
      try {
        const nextPoint = await getLatestTelemetry(activeMachineId);
        if (isCancelled || !nextPoint || !nextPoint.timestamp) return;

        const nextKey = `${nextPoint.id || ""}_${nextPoint.timestamp || ""}`;
        // Only update current reading and liveness if this is an actual new reading from backend
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
            return updated.slice(-ROLLING_WINDOW_LIMIT);
          });
        }
      } catch {
        // Network or server blip: handled gracefully by freshness ticker
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [activeMachineId, refreshKey]);

  const handleSelectMachine = (newId) => {
    if (newId === selectedMachineId) return;
    lastSeenTelemetryKeyRef.current = null;
    setTelemetryHistory([]);
    setCurrentTelemetry(null);
    setPrediction(null);
    setLastReceivedAt(null);
    setSelectedMachineId(newId);
  };

  const handleManualRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-6 shadow-sm">
      {/* 1. Header with Machine Selector & Asset Fleet Status */}
      <MachineSelectorBar
        machines={machines}
        selectedMachineId={activeMachineId}
        onSelectMachine={handleSelectMachine}
        selectedMachine={selectedMachine}
        isRefreshing={isRefreshing}
        onRefresh={handleManualRefresh}
      />

      {/* 2. Main Live Telemetry Waveform Graph */}
      <LiveTelemetryChart
        telemetryHistory={telemetryHistory}
        activeMetric={activeMetric}
        onChangeMetric={setActiveMetric}
        isLive={isLive}
      />

      {/* 3. Live Sensor Metric Cards (Vibration, Temp, Current, RPM, Pressure, Ambient) */}
      <SensorMetricsGrid
        currentTelemetry={currentTelemetry}
        isLive={isLive}
        activeMetric={activeMetric}
        onSelectMetric={setActiveMetric}
      />

      {/* 4. Bottom Grid: Telemetry Pipeline Flow & Live ML Inference */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TelemetryPipelineFlow
          isLive={isLive}
          lastUpdateText={lastUpdateText}
          mlStatus={prediction ? "READY" : "NO_PREDICTION"}
        />

        <LiveMlAnalysisPanel
          prediction={prediction}
          loading={mlLoading}
          machineId={activeMachineId}
        />
      </div>
    </section>
  );
}
