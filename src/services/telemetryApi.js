import api from "./api";

const endpoints = {
  machine: (machineId) => `/api/telemetry/machine/${machineId}`,
  latest: (machineId) => `/api/telemetry/machine/${machineId}/latest`,
  range: (machineId, start, end) =>
    `/api/telemetry/machine/${machineId}/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
};

function normalizeTelemetry(item = {}) {
  return {
    id: item.id,
    timestamp: item.timestamp ?? item.time ?? item.createdAt,
    vibrationRms: item.vibrationRms != null ? Number(item.vibrationRms) : (item.vibration_rms != null ? Number(item.vibration_rms) : null),
    temperatureMotor: item.temperatureMotor != null ? Number(item.temperatureMotor) : (item.temperature_motor != null ? Number(item.temperature_motor) : null),
    currentPhaseAvg: item.currentPhaseAvg != null ? Number(item.currentPhaseAvg) : (item.current_phase_avg != null ? Number(item.current_phase_avg) : null),
    pressureLevel: item.pressureLevel != null ? Number(item.pressureLevel) : (item.pressure_level != null ? Number(item.pressure_level) : null),
    rpm: item.rpm != null ? Number(item.rpm) : null,
    ambientTemp: item.ambientTemp != null ? Number(item.ambientTemp) : (item.ambient_temp != null ? Number(item.ambient_temp) : null),
  };
}

export async function getMachineTelemetry(machineId, limit = 40) {
  if (!api.defaults.baseURL) {
    return [];
  }
  try {
    const response = await api.get(endpoints.machine(machineId));
    const rawData = Array.isArray(response.data) ? response.data : [];
    if (rawData.length === 0) return [];

    // Deduplicate items by id or timestamp
    const seen = new Set();
    const deduped = [];
    for (const item of rawData) {
      const key = `${item.id || ""}_${item.timestamp || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    // Sort descending by timestamp to reliably get the latest readings
    deduped.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Slice the most recent `limit` readings
    const mostRecent = deduped.slice(0, limit);

    // Return in chronological order (oldest to newest) for chart plotting
    mostRecent.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return mostRecent.map(normalizeTelemetry);
  } catch (error) {
    console.warn(`Failed to fetch machine ${machineId} telemetry:`, error?.message);
    return [];
  }
}

export async function getLatestTelemetry(machineId) {
  if (!api.defaults.baseURL) {
    return null;
  }
  try {
    const response = await api.get(endpoints.latest(machineId));
    return normalizeTelemetry(response.data);
  } catch {
    return null;
  }
}

export async function getTelemetryRange(machineId, start, end) {
  if (!api.defaults.baseURL) {
    return [];
  }
  try {
    const response = await api.get(endpoints.range(machineId, start, end));
    const data = Array.isArray(response.data) ? response.data : [];
    return data.map(normalizeTelemetry);
  } catch {
    return [];
  }
}
