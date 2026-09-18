import api from "./api";

const endpoints = {
  active: "/api/alerts",
  machine: (machineId) => `/api/alerts/machine/${machineId}`,
  stream: "/api/alerts/stream",
  acknowledge: (alertId) => `/api/alerts/${alertId}/acknowledge`,
  resolve: (alertId) => `/api/alerts/${alertId}/resolve`,
};

export const SENSOR_METADATA = {
  vibrationRms: {
    label: "Vibration RMS",
    category: "Vibration",
    unit: "mm/s",
    title: "Abnormal vibration threshold exceeded",
  },
  temperatureMotor: {
    label: "Motor Temperature",
    category: "Thermal",
    unit: "°C",
    title: "High motor temperature detected",
  },
  currentPhaseAvg: {
    label: "Phase Current",
    category: "Electrical",
    unit: "A",
    title: "High electrical current spike",
  },
  pressureLevel: {
    label: "Pressure Level",
    category: "Pressure",
    unit: "bar",
    title: "Abnormal pressure reading",
  },
  rpm: {
    label: "Rotational Speed",
    category: "Speed",
    unit: "RPM",
    title: "Dangerous RPM divergence",
  },
  ambientTemp: {
    label: "Ambient Temperature",
    category: "Environmental",
    unit: "°C",
    title: "High ambient temperature",
  },
};

export function getSensorMeta(sensorName) {
  return (
    SENSOR_METADATA[sensorName] || {
      label: sensorName ? sensorName.replace(/([A-Z])/g, " $1") : "Sensor",
      category: "Telemetry",
      unit: "",
      title: "Machine threshold alert",
    }
  );
}

export function toNumericAlertId(alertId) {
  if (typeof alertId === "number") return alertId;
  const match = String(alertId || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function formatAlertId(id) {
  const num = toNumericAlertId(id);
  return num != null ? `ALT-${String(num).padStart(3, "0")}` : String(id || "ALT-000");
}

export function determineAlertSource(alert) {
  if (alert.source) {
    const s = String(alert.source).toUpperCase();
    if (s === "ML" || s === "SENSOR") return s;
  }
  if (alert.sensorName) return "SENSOR";
  const msg = String(alert.message || alert.title || "").toLowerCase();
  if (
    msg.includes("predict") ||
    msg.includes("rul") ||
    msg.includes("ml") ||
    msg.includes("bearing failure") ||
    msg.includes("probability")
  ) {
    return "ML";
  }
  return "SENSOR";
}

export function determineAlertType(alert, source, meta) {
  if (alert.alertType) return alert.alertType;
  if (source === "ML") {
    const msg = String(alert.message || alert.title || "").toLowerCase();
    if (msg.includes("within 24") || msg.includes("24 hour")) {
      return "Failure Predicted Within 24h";
    }
    if (msg.includes("rul") || msg.includes("useful life")) {
      return "Low Remaining Useful Life";
    }
    if (msg.includes("bearing")) {
      return "Predicted Bearing Failure";
    }
    return "High Predicted Failure Probability";
  }

  // SENSOR source
  if (alert.sensorName) {
    return `${meta.label} Threshold`;
  }
  return "Sensor Threshold Breach";
}

export function normalizeAlert(alert = {}) {
  const numericId = toNumericAlertId(alert.id);
  const resolved = Boolean(alert.resolved) || String(alert.status || "").toUpperCase() === "RESOLVED";
  const isAcknowledged =
    !resolved &&
    (String(alert.status || "").toUpperCase() === "ACKNOWLEDGED" || Boolean(alert.acknowledgedAt));

  const meta = getSensorMeta(alert.sensorName);
  const source = determineAlertSource(alert);
  const alertType = determineAlertType(alert, source, meta);

  const rawVal = alert.sensorValue != null ? Number(alert.sensorValue) : null;
  const rawThreshold = alert.threshold != null ? Number(alert.threshold) : null;

  let percentOver = null;
  if (rawVal != null && rawThreshold != null && rawThreshold > 0) {
    const diff = rawVal - rawThreshold;
    percentOver = Number(((diff / rawThreshold) * 100).toFixed(1));
  }

  const machineId = String(alert.machineId ?? "");
  const displayMachineId = alert.displayId || `M-${machineId.padStart(2, "0")}`;

  const currentStatus = resolved ? "RESOLVED" : isAcknowledged ? "ACKNOWLEDGED" : "OPEN";

  return {
    id: numericId ?? alert.id,
    numericId,
    displayAlertId: formatAlertId(alert.id),
    machineId,
    displayId: displayMachineId,
    severity: String(alert.severity || "WARNING").toUpperCase(),
    source, // "SENSOR" or "ML"
    alertType,
    title: alert.title || (source === "ML" ? alertType : meta.title),
    message: alert.message || `${meta.label} exceeded configured safe operating threshold.`,
    createdAt: alert.timestamp || alert.createdAt || new Date().toISOString(),
    status: currentStatus, // "OPEN", "ACKNOWLEDGED", "RESOLVED"
    resolved,
    acknowledgedAt: alert.acknowledgedAt || (isAcknowledged ? new Date().toISOString() : null),
    resolvedAt: alert.resolvedAt || (resolved ? new Date().toISOString() : null),
    sensorName: alert.sensorName || null,
    sensorLabel: meta.label,
    sensorCategory: meta.category,
    unit: meta.unit,
    sensorValue: rawVal,
    threshold: rawThreshold,
    percentOver,
    occurrenceCount: Number(alert.occurrenceCount || 1),
    ruleCode: alert.ruleCode || (alert.sensorName ? `RULE_${alert.sensorName.toUpperCase()}` : "RULE_DEFAULT"),
  };
}

export async function getActiveAlerts() {
  try {
    const response = await api.get(endpoints.active);
    const data = Array.isArray(response.data) ? response.data : [];
    return data.map(normalizeAlert);
  } catch (error) {
    console.warn("Alerts API unavailable:", error?.message);
    return [];
  }
}

export async function getMachineAlerts(machineId) {
  try {
    const response = await api.get(endpoints.machine(machineId));
    const data = Array.isArray(response.data) ? response.data : [];
    return data.map(normalizeAlert);
  } catch (error) {
    console.warn(`Machine ${machineId} alerts API unavailable:`, error?.message);
    return [];
  }
}

export async function acknowledgeAlertApi(alertId) {
  const numericId = toNumericAlertId(alertId);
  if (!numericId) {
    return { success: false, error: "Invalid alert ID" };
  }

  try {
    const response = await api.put(endpoints.acknowledge(numericId));
    return { success: true, id: numericId, data: response.data };
  } catch (error) {
    // If backend doesn't implement /acknowledge (404), record client acknowledgment
    if (error?.response?.status === 404) {
      return { success: true, id: numericId, localOnly: true };
    }
    console.warn(`Acknowledge alert ${numericId} failed:`, error?.message);
    throw error;
  }
}

export async function resolveAlert(alertId) {
  const numericId = toNumericAlertId(alertId);
  if (!numericId) {
    return { success: false, error: "Invalid alert ID" };
  }

  try {
    const response = await api.put(endpoints.resolve(numericId));
    return { success: true, id: numericId, data: response.data };
  } catch (error) {
    console.warn(`Resolve alert ${numericId} failed:`, error?.message);
    throw error;
  }
}

export async function resolveMultipleAlerts(alertIds) {
  if (!alertIds || !alertIds.length) return [];
  const results = await Promise.allSettled(
    alertIds.map((id) => resolveAlert(id))
  );
  return results.map((res, index) => ({
    id: alertIds[index],
    success: res.status === "fulfilled" && res.value?.success,
  }));
}

export async function acknowledgeMultipleAlerts(alertIds) {
  if (!alertIds || !alertIds.length) return [];
  const results = await Promise.allSettled(
    alertIds.map((id) => acknowledgeAlertApi(id))
  );
  return results.map((res, index) => ({
    id: alertIds[index],
    success: res.status === "fulfilled" && res.value?.success,
  }));
}

export function createAlertEventSource() {
  if (!api.defaults.baseURL) {
    return null;
  }
  return new EventSource(`${api.defaults.baseURL}${endpoints.stream}?ngrok-skip-browser-warning=true`);
}
