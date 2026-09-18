/**
 * Telemetry Sensor Thresholds and Display Metadata
 * Aligned with backend threshold alerts and machine physics.
 */

export const SENSOR_CONFIG = {
  vibrationRms: {
    key: "vibrationRms",
    label: "Vibration RMS",
    shortLabel: "Vibration",
    unit: "mm/s",
    threshold: 1.0,
    color: "#f59e0b", // Amber
    fillColor: "rgba(245, 158, 11, 0.12)",
    icon: "Activity",
    description: "Mechanical vibration velocity & imbalance",
  },
  temperatureMotor: {
    key: "temperatureMotor",
    label: "Motor Temperature",
    shortLabel: "Temperature",
    unit: "°C",
    threshold: 60.0,
    color: "#ef4444", // Red
    fillColor: "rgba(239, 68, 68, 0.12)",
    icon: "Thermometer",
    description: "Motor winding thermal dissipation",
  },
  currentPhaseAvg: {
    key: "currentPhaseAvg",
    label: "Phase Current",
    shortLabel: "Current",
    unit: "A",
    threshold: 10.0,
    color: "#3b82f6", // Blue
    fillColor: "rgba(59, 130, 246, 0.12)",
    icon: "Zap",
    description: "Average three-phase electrical current draw",
  },
  rpm: {
    key: "rpm",
    label: "Rotational Speed",
    shortLabel: "RPM",
    unit: "RPM",
    threshold: 1200.0,
    color: "#10b981", // Emerald
    fillColor: "rgba(16, 185, 129, 0.12)",
    icon: "Cpu",
    description: "Spindle and rotor rotational velocity",
  },
  pressureLevel: {
    key: "pressureLevel",
    label: "Pressure Level",
    shortLabel: "Pressure",
    unit: "bar",
    threshold: 100.0,
    color: "#8b5cf6", // Purple
    fillColor: "rgba(139, 92, 246, 0.12)",
    icon: "Gauge",
    description: "Hydraulic and pneumatic pressure",
  },
  ambientTemp: {
    key: "ambientTemp",
    label: "Ambient Temp",
    shortLabel: "Ambient",
    unit: "°C",
    threshold: 35.0,
    color: "#64748b", // Slate
    fillColor: "rgba(100, 116, 139, 0.12)",
    icon: "Thermometer",
    description: "Surrounding plant ambient temperature",
  },
};

/**
 * Checks if a sensor value is exceeding or approaching its threshold
 * @returns {"NORMAL" | "WARNING" | "CRITICAL" | "NO_DATA"}
 */
export function evaluateSensorBreach(key, value) {
  if (value == null || isNaN(Number(value))) {
    return "NO_DATA";
  }
  const config = SENSOR_CONFIG[key];
  if (!config || config.threshold == null) {
    return "NORMAL";
  }

  const numVal = Number(value);
  const threshold = config.threshold;

  if (numVal > threshold) {
    return "CRITICAL";
  }
  if (numVal >= threshold * 0.9) {
    return "WARNING";
  }
  return "NORMAL";
}
