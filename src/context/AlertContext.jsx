import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertContext } from "./AlertContextDef";
import {
  acknowledgeAlertApi,
  acknowledgeMultipleAlerts,
  createAlertEventSource,
  getActiveAlerts,
  normalizeAlert,
  resolveAlert as resolveAlertApi,
  resolveMultipleAlerts,
  toNumericAlertId,
} from "../services/alertApi";
import { playAlertTone } from "../utils/sound";

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Authoritative connection states:
  // connectionState: "connected" | "connecting" | "reconnecting" | "disconnected"
  // transport: "sse" | "polling"
  const [connectionState, setConnectionState] = useState("connecting");
  const [transport, setTransport] = useState("sse");
  const [lastUpdate, setLastUpdate] = useState(null);

  // Local ticker for UI relative timestamp formatting (just now, Xs ago)
  const [, setTick] = useState(0);

  const [toasts, setToasts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("alert_sound_enabled") === "true";
    } catch {
      return false;
    }
  });

  const soundRef = useRef(soundEnabled);
  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  // Periodic UI tick every 4 seconds to update "last updated X seconds ago"
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 10000);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("alert_sound_enabled", String(next));
      } catch (err) {
        console.warn("Could not save sound preference", err);
      }
      return next;
    });
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToasts((current) => current.filter((t) => t.toastId !== toastId));
  }, []);

  const pushToast = useCallback((alertItem) => {
    const toastId = `${alertItem.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const toast = { ...alertItem, toastId };

    setToasts((current) => [toast, ...current.slice(0, 4)]);

    setTimeout(() => {
      dismissToast(toastId);
    }, 6000);
  }, [dismissToast]);

  // Primary fetch function
  const loadAlerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getActiveAlerts();
      setAlerts(data);
      setLastUpdate(new Date());
      setConnectionState("connected");
      return data;
    } catch (err) {
      console.error("AlertContext loadAlerts error", err);
      setError(err?.message || "Failed to load alerts");
      setConnectionState("disconnected");
      throw err;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let isCancelled = false;
    getActiveAlerts()
      .then((data) => {
        if (!isCancelled) {
          setAlerts(data);
          setLastUpdate(new Date());
          setConnectionState("connected");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err?.message || "Failed to load alerts");
          setConnectionState("disconnected");
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Hybrid Real-time SSE with Honest Fallback Polling
  useEffect(() => {
    let pollingInterval = null;
    let isMounted = true;

    // Helper to start polling when SSE is unavailable
    const startFallbackPolling = () => {
      if (pollingInterval) return;
      setTransport("polling");
      setConnectionState("reconnecting");

      // Immediate fetch
      getActiveAlerts()
        .then((data) => {
          if (!isMounted) return;
          setAlerts(data);
          setLastUpdate(new Date());
          setConnectionState("connected");
        })
        .catch(() => {
          if (!isMounted) return;
          setConnectionState("disconnected");
        });

      // Poll every 6 seconds
      pollingInterval = setInterval(() => {
        getActiveAlerts()
          .then((data) => {
            if (!isMounted) return;
            setAlerts(data);
            setLastUpdate(new Date());
            setConnectionState("connected");
          })
          .catch(() => {
            if (!isMounted) return;
            setConnectionState("disconnected");
          });
      }, 6000);
    };

    const stopFallbackPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };

    let eventSource = null;
    try {
      eventSource = createAlertEventSource();
    } catch {
      startFallbackPolling();
      return () => stopFallbackPolling();
    }

    if (!eventSource) {
      startFallbackPolling();
      return () => stopFallbackPolling();
    }

    eventSource.onopen = () => {
      if (!isMounted) return;
      stopFallbackPolling();
      setTransport("sse");
      setConnectionState("connected");
      setLastUpdate(new Date());
    };

    const handleIncoming = (raw) => {
      try {
        const item = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!item || !item.id) return;
        const normalized = normalizeAlert(item);

        setAlerts((current) => {
          // Deduplication: Match by same id OR same machineId + (sensorName / alertType)
          const existingIndex = current.findIndex(
            (a) =>
              a.id === normalized.id ||
              (String(a.machineId) === String(normalized.machineId) &&
                ((a.sensorName && a.sensorName === normalized.sensorName) ||
                  (a.alertType && a.alertType === normalized.alertType)) &&
                !a.resolved)
          );

          if (existingIndex >= 0) {
            const existing = current[existingIndex];
            const updated = {
              ...existing,
              ...normalized,
              id: existing.id,
              occurrenceCount: (existing.occurrenceCount || 1) + 1,
              sensorValue: normalized.sensorValue ?? existing.sensorValue,
              percentOver: normalized.percentOver ?? existing.percentOver,
              createdAt: normalized.createdAt || existing.createdAt,
            };
            const nextList = [...current];
            nextList[existingIndex] = updated;
            return nextList;
          }

          return [normalized, ...current];
        });

        setLastUpdate(new Date());
        setConnectionState("connected");
        setTransport("sse");

        // Trigger notification and sound only if open
        if (!normalized.resolved) {
          pushToast(normalized);
          if (soundRef.current) {
            playAlertTone(normalized.severity);
          }
        }
      } catch {
        // Heartbeat or non-json message
      }
    };

    eventSource.onmessage = (e) => {
      handleIncoming(e.data);
    };

    eventSource.addEventListener("alert", (e) => {
      handleIncoming(e.data);
    });

    eventSource.addEventListener("connected", () => {
      if (!isMounted) return;
      stopFallbackPolling();
      setTransport("sse");
      setConnectionState("connected");
      setLastUpdate(new Date());
    });

    eventSource.onerror = () => {
      if (!isMounted) return;
      // Start truthful fallback polling while SSE reconnects
      startFallbackPolling();
    };

    return () => {
      isMounted = false;
      stopFallbackPolling();
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [pushToast]);

  // Acknowledge single alert: OPEN -> ACKNOWLEDGED
  const acknowledgeAlert = useCallback(async (alertId) => {
    const numericId = toNumericAlertId(alertId);

    setAlerts((current) =>
      current.map((a) =>
        a.id === numericId || a.id === alertId
          ? {
              ...a,
              status: "ACKNOWLEDGED",
              acknowledgedAt: new Date().toISOString(),
            }
          : a
      )
    );

    try {
      await acknowledgeAlertApi(alertId);
      return true;
    } catch (err) {
      console.warn(`Acknowledge alert ${alertId} error, maintaining local state`, err);
      return true;
    }
  }, []);

  // Resolve single alert: OPEN / ACKNOWLEDGED -> RESOLVED
  const resolveAlert = useCallback(async (alertId) => {
    const numericId = toNumericAlertId(alertId);

    setAlerts((current) =>
      current.map((a) =>
        a.id === numericId || a.id === alertId
          ? {
              ...a,
              status: "RESOLVED",
              resolved: true,
              resolvedAt: new Date().toISOString(),
            }
          : a
      )
    );

    try {
      await resolveAlertApi(alertId);
      setLastUpdate(new Date());
      return true;
    } catch (err) {
      console.error(`Failed to resolve alert ${alertId}`, err);
      loadAlerts(true);
      throw err;
    }
  }, [loadAlerts]);

  // Bulk acknowledge alerts
  const acknowledgeMultiple = useCallback(async (alertIds) => {
    if (!alertIds || !alertIds.length) return;
    const idSet = new Set(alertIds.map(toNumericAlertId).filter(Boolean));

    setAlerts((current) =>
      current.map((a) =>
        idSet.has(a.id)
          ? {
              ...a,
              status: "ACKNOWLEDGED",
              acknowledgedAt: new Date().toISOString(),
            }
          : a
      )
    );

    try {
      await acknowledgeMultipleAlerts(alertIds);
    } catch (err) {
      console.warn("Bulk acknowledge error:", err);
    }
  }, []);

  // Bulk resolve alerts
  const resolveMultiple = useCallback(async (alertIds) => {
    if (!alertIds || !alertIds.length) return [];
    const idSet = new Set(alertIds.map(toNumericAlertId).filter(Boolean));

    setAlerts((current) =>
      current.map((a) =>
        idSet.has(a.id)
          ? {
              ...a,
              status: "RESOLVED",
              resolved: true,
              resolvedAt: new Date().toISOString(),
            }
          : a
      )
    );

    try {
      const results = await resolveMultipleAlerts(alertIds);
      setLastUpdate(new Date());
      return results;
    } catch (err) {
      console.error("Bulk resolve error:", err);
      loadAlerts(true);
      throw err;
    }
  }, [loadAlerts]);

  // Resolve all alerts for a specific machine
  const resolveMachine = useCallback(
    async (machineId) => {
      const machineAlerts = alerts.filter(
        (a) => String(a.machineId) === String(machineId) && !a.resolved
      );
      const ids = machineAlerts.map((a) => a.id);
      if (ids.length > 0) {
        return await resolveMultiple(ids);
      }
      return [];
    },
    [alerts, resolveMultiple]
  );

  // Acknowledge all alerts for a machine
  const acknowledgeMachine = useCallback(
    async (machineId) => {
      const machineAlerts = alerts.filter(
        (a) => String(a.machineId) === String(machineId) && !a.resolved && a.status === "OPEN"
      );
      const ids = machineAlerts.map((a) => a.id);
      if (ids.length > 0) {
        await acknowledgeMultiple(ids);
      }
    },
    [alerts, acknowledgeMultiple]
  );

  // Resolve all open alerts
  const resolveAllOpen = useCallback(async () => {
    const openIds = alerts.filter((a) => !a.resolved).map((a) => a.id);
    if (openIds.length > 0) {
      const results = await resolveMultiple(openIds);
      return results;
    }
    return [];
  }, [alerts, resolveMultiple]);

  // Acknowledge all open alerts
  const acknowledgeAllOpen = useCallback(async () => {
    const openIds = alerts.filter((a) => !a.resolved && a.status === "OPEN").map((a) => a.id);
    if (openIds.length > 0) {
      await acknowledgeMultiple(openIds);
    }
  }, [alerts, acknowledgeMultiple]);

  // Derived alert collections
  const openAlerts = useMemo(
    () => alerts.filter((a) => a.status === "OPEN" && !a.resolved),
    [alerts]
  );

  const criticalAlerts = useMemo(
    () => openAlerts.filter((a) => a.severity === "CRITICAL"),
    [openAlerts]
  );

  const warningAlerts = useMemo(
    () => openAlerts.filter((a) => a.severity === "WARNING" || a.severity === "HIGH"),
    [openAlerts]
  );

  const acknowledgedAlerts = useMemo(
    () => alerts.filter((a) => a.status === "ACKNOWLEDGED" && !a.resolved),
    [alerts]
  );

  const resolvedAlerts = useMemo(
    () => alerts.filter((a) => a.resolved || a.status === "RESOLVED"),
    [alerts]
  );

  // Helper to query alerts for any machine
  const getMachineActiveAlerts = useCallback(
    (machineId) => {
      if (!machineId) return [];
      const mStr = String(machineId);
      return alerts.filter((a) => String(a.machineId) === mStr && !a.resolved && a.status === "OPEN");
    },
    [alerts]
  );

  // Backwards compatibility alias
  const sseConnected = connectionState === "connected" && transport === "sse";

  const value = useMemo(
    () => ({
      alerts,
      loading,
      error,
      openAlerts,
      criticalAlerts,
      warningAlerts,
      acknowledgedAlerts,
      resolvedAlerts,
      // Metric counts (guaranteed non-null)
      openCount: openAlerts.length,
      criticalCount: criticalAlerts.length,
      warningCount: warningAlerts.length,
      acknowledgedCount: acknowledgedAlerts.length,
      resolvedCount: resolvedAlerts.length,
      totalCount: alerts.length,
      // Authoritative Connection State & Transport
      connectionState,
      transport,
      lastUpdate,
      sseConnected,
      soundEnabled,
      toggleSound,
      toasts,
      dismissToast,
      acknowledgeAlert,
      resolveAlert,
      acknowledgeMultiple,
      resolveMultiple,
      acknowledgeMachine,
      resolveMachine,
      acknowledgeAllOpen,
      resolveAllOpen,
      getMachineActiveAlerts,
      refreshAlerts: loadAlerts,
    }),
    [
      alerts,
      loading,
      error,
      openAlerts,
      criticalAlerts,
      warningAlerts,
      acknowledgedAlerts,
      resolvedAlerts,
      connectionState,
      transport,
      lastUpdate,
      sseConnected,
      soundEnabled,
      toggleSound,
      toasts,
      dismissToast,
      acknowledgeAlert,
      resolveAlert,
      acknowledgeMultiple,
      resolveMultiple,
      acknowledgeMachine,
      resolveMachine,
      acknowledgeAllOpen,
      resolveAllOpen,
      getMachineActiveAlerts,
      loadAlerts,
    ]
  );

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}
