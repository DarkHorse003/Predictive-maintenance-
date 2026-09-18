/**
 * Machine Health, Operational Status, and Alert Calculation Utilities.
 * 
 * Strict separation:
 * 1. OPERATIONAL STATUS: comes from Machine.status (ACTIVE, INACTIVE, MAINTENANCE, OFFLINE).
 * 2. MACHINE HEALTH: derived strictly from latest ML prediction (HEALTHY, WARNING, CRITICAL, UNKNOWN).
 * 3. ACTIVE ALERTS: separate events from sensor thresholds or ML rules (OPEN, ACKNOWLEDGED, RESOLVED).
 */

/**
 * Health classification rules:
 * 
 * HEALTHY:
 * - failureWithin24h == 0
 * - failureProbability < 0.40
 * - RUL > 72 hours
 * 
 * WARNING:
 * - failureProbability >= 0.40 AND < 0.75
 * OR
 * - RUL <= 72 hours AND > 24 hours
 * 
 * CRITICAL:
 * - failureWithin24h == 1
 * OR
 * - failureProbability >= 0.75
 * OR
 * - RUL <= 24 hours
 * 
 * UNKNOWN:
 * - If ML prediction is unavailable, null, or has missing values.
 */
export function calculateMachineHealth(prediction) {
  if (!prediction) return "UNKNOWN";

  const { failureWithin24h, failureProbability, rulHours } = prediction;

  if (failureProbability == null || rulHours == null) {
    return "UNKNOWN";
  }

  const fWithin24 = Number(failureWithin24h);
  const fProb = Number(failureProbability);
  const rul = Number(rulHours);

  if (isNaN(fProb) || isNaN(rul)) {
    return "UNKNOWN";
  }

  // 1. CRITICAL checks
  if (fWithin24 === 1 || fProb >= 0.75 || rul <= 24) {
    return "CRITICAL";
  }

  // 2. WARNING checks
  if ((fProb >= 0.40 && fProb < 0.75) || (rul <= 72 && rul > 24)) {
    return "WARNING";
  }

  // 3. HEALTHY checks
  if (fWithin24 === 0 && fProb < 0.40 && rul > 72) {
    return "HEALTHY";
  }

  return "UNKNOWN";
}

/**
 * Normalizes operational status from Machine.status
 */
export function normalizeOperationalStatus(rawStatus) {
  if (!rawStatus) return "UNKNOWN";
  const upper = String(rawStatus).trim().toUpperCase();
  if (["ACTIVE", "INACTIVE", "MAINTENANCE", "OFFLINE"].includes(upper)) {
    return upper;
  }
  return upper || "UNKNOWN";
}

/**
 * Format failure risk percentage cleanly without NaN or fake values.
 */
export function formatFailureRisk(prob) {
  if (prob == null || isNaN(Number(prob))) return "N/A";
  const num = Number(prob);
  const pct = num * 100;
  if (pct === 0) return "0.0%";
  if (pct < 0.01) return "< 0.01%";
  return `${pct.toFixed(2)}%`;
}

/**
 * Format RUL in hours without NaN or fake values.
 */
export function formatRul(rul) {
  if (rul == null || isNaN(Number(rul))) return "N/A";
  return `${Number(rul).toFixed(1)} h`;
}

/**
 * Format a sensor reading with unit.
 */
export function formatSensorValue(val, unit = "") {
  if (val == null || isNaN(Number(val))) return "N/A";
  return `${Number(val).toFixed(1)}${unit ? ` ${unit}` : ""}`;
}

/**
 * Summarize active alerts for a machine.
 * Returns { total, critical, warning, text, hasAlerts }
 */
export function getMachineAlertSummary(alerts = [], machineId) {
  if (!machineId || !alerts || !alerts.length) {
    return {
      total: 0,
      critical: 0,
      warning: 0,
      text: "None",
      hasAlerts: false,
    };
  }

  const mIdStr = String(machineId);
  const machineOpenAlerts = alerts.filter(
    (a) => String(a.machineId) === mIdStr && !a.resolved && a.status === "OPEN"
  );

  const critical = machineOpenAlerts.filter((a) => a.severity === "CRITICAL").length;
  const warning = machineOpenAlerts.filter(
    (a) => a.severity === "WARNING" || a.severity === "HIGH"
  ).length;
  const total = machineOpenAlerts.length;

  let text = "None";
  if (total > 0) {
    const parts = [];
    if (critical > 0) parts.push(`${critical} Critical`);
    if (warning > 0) parts.push(`${warning} Warning`);
    text = parts.length > 0 ? parts.join(", ") : `${total} Open`;
  }

  return {
    total,
    critical,
    warning,
    text,
    hasAlerts: total > 0,
    alerts: machineOpenAlerts,
  };
}
