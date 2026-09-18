import api from "./api";
import { getLatestPrediction } from "./predictionApi";
import { getLatestTelemetry } from "./telemetryApi";
import { calculateMachineHealth, normalizeOperationalStatus } from "../utils/machineHealth";

const endpoints = {
  all: "/api/machines/get/all/machine",
  byId: (id) => `/api/machines/get/machine/${id}`,
};

function toDisplayId(machineId) {
  const numeric = String(machineId ?? "").replace(/^M-/i, "");
  if (/^\d+$/.test(numeric)) return `M-${numeric.padStart(2, "0")}`;
  return String(machineId ?? "M-UNKNOWN");
}

function processMachine(machine, prediction = null, telemetry = null) {
  const rawId = machine?.machineId ?? machine?.id;
  const operationalStatus = normalizeOperationalStatus(machine?.status || "ACTIVE");
  const machineHealth = calculateMachineHealth(prediction);

  // ML Prediction values - strictly from prediction API without fake mock values
  const failureProbability =
    prediction?.failureProbability != null && !isNaN(Number(prediction.failureProbability))
      ? Number(prediction.failureProbability)
      : null;

  const rulHours =
    prediction?.rulHours != null && !isNaN(Number(prediction.rulHours))
      ? Number(prediction.rulHours)
      : null;

  const failureWithin24h =
    prediction?.failureWithin24h != null && !isNaN(Number(prediction.failureWithin24h))
      ? Number(prediction.failureWithin24h)
      : null;

  const failureType = prediction?.failureType || null;
  const failureTypeProbabilities = prediction?.failureTypeProbabilities || null;
  const predictionCreatedAt = prediction?.createdAt || null;

  // Real Telemetry values
  const temperatureMotor =
    telemetry?.temperatureMotor != null && !isNaN(Number(telemetry.temperatureMotor))
      ? Number(telemetry.temperatureMotor)
      : null;

  const vibrationRms =
    telemetry?.vibrationRms != null && !isNaN(Number(telemetry.vibrationRms))
      ? Number(telemetry.vibrationRms)
      : null;

  const currentPhaseAvg =
    telemetry?.currentPhaseAvg != null && !isNaN(Number(telemetry.currentPhaseAvg))
      ? Number(telemetry.currentPhaseAvg)
      : null;

  const pressureLevel =
    telemetry?.pressureLevel != null && !isNaN(Number(telemetry.pressureLevel))
      ? Number(telemetry.pressureLevel)
      : null;

  const rpm =
    telemetry?.rpm != null && !isNaN(Number(telemetry.rpm))
      ? Number(telemetry.rpm)
      : null;

  const ambientTemp =
    telemetry?.ambientTemp != null && !isNaN(Number(telemetry.ambientTemp))
      ? Number(telemetry.ambientTemp)
      : null;

  const lastUpdated =
    telemetry?.timestamp ||
    prediction?.createdAt ||
    machine?.lastUpdated ||
    machine?.updatedAt ||
    new Date().toISOString();

  return {
    ...machine,
    machineId: String(rawId ?? ""),
    displayId: toDisplayId(rawId),
    name: machine?.name || `Machine ${rawId}`,
    machineType: machine?.machineType || "Industrial Equipment",
    location: machine?.location || "Main Plant",

    // 1. OPERATIONAL STATUS (from Machine.status)
    operationalStatus,
    status: operationalStatus, // Ensure status is operational status, NOT health

    // 2. MACHINE HEALTH (derived strictly from latest ML prediction)
    machineHealth,

    // Real ML output
    failureProbability,
    rulHours,
    failureWithin24h,
    failureType,
    failureTypeProbabilities,
    predictionCreatedAt,
    predictionSource: prediction ? "api" : "none",

    // Real telemetry output
    temperatureMotor,
    vibrationRms,
    currentPhaseAvg,
    pressureLevel,
    rpm,
    ambientTemp,
    lastUpdated,
    telemetrySource: telemetry ? "api" : "none",

    dataSource: "api",
  };
}

async function enrichMachine(machine) {
  const machineId = machine?.machineId ?? machine?.id;

  const [predictionResult, telemetryResult] = await Promise.allSettled([
    getLatestPrediction(machineId),
    getLatestTelemetry(machineId),
  ]);

  const prediction = predictionResult.status === "fulfilled" ? predictionResult.value : null;
  const telemetry = telemetryResult.status === "fulfilled" ? telemetryResult.value : null;

  return processMachine(machine, prediction, telemetry);
}

export async function getMachines() {
  try {
    const response = await api.get(endpoints.all);
    const data = Array.isArray(response.data) ? response.data : [];
    if (data.length > 0) {
      return Promise.all(data.map(enrichMachine));
    }
  } catch (error) {
    console.warn("Machine API error:", error?.message);
  }

  // Fallback: If backend is completely offline, return standard machine list with UNKNOWN health
  const fallbackList = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    machineId: String(i + 1),
    name: `Machine ${String(i + 1).padStart(2, "0")}`,
    machineType: i < 5 ? "CNC" : i < 10 ? "Pump" : i < 15 ? "Compressor" : "Robotic Arm",
    status: "ACTIVE",
    location: "Plant Floor",
  }));

  return fallbackList.map((m) => processMachine(m, null, null));
}

export async function getMachineById(id) {
  try {
    const response = await api.get(endpoints.byId(id));
    if (response.data) {
      return enrichMachine(response.data);
    }
  } catch (error) {
    console.warn(`Machine ${id} API error:`, error?.message);
  }

  // Fallback if not found: create single placeholder with UNKNOWN health
  return processMachine(
    {
      id: Number(id) || 1,
      machineId: String(id),
      name: `Machine ${id}`,
      machineType: "Industrial Equipment",
      status: "ACTIVE",
      location: "Plant Floor",
    },
    null,
    null
  );
}
