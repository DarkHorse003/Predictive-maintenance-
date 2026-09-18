import { useState, useEffect, useCallback } from "react";
import { getMachines } from "../services/machineApi";

export function useMachines(pollInterval = 30000) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState("api");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const data = await getMachines();
        if (!isCancelled) {
          setMachines(Array.isArray(data) ? data : []);
          setDataSource(data?.[0]?.dataSource || "api");
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn("Failed to fetch machines:", err);
          setError(err);
          setLoading(false);
        }
      }
    };

    load();

    let timer = null;
    if (pollInterval > 0) {
      timer = setInterval(load, pollInterval);
    }

    return () => {
      isCancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [pollInterval, refreshTrigger]);

  return {
    machines,
    loading,
    error,
    dataSource,
    refresh,
  };
}
