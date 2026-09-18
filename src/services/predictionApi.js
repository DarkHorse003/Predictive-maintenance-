import api from "./api";

const endpoints = {
  predict: (machineId) => `/api/ml/predict/${machineId}`,
  all: (machineId) => `/api/ml/predictions/${machineId}`,
  latest: (machineId) => `/api/ml/predictions/${machineId}/latest`,
};

function normalizePrediction(item = {}) {
  let failureTypeProbabilities = item.failureTypeProbabilities;

  if (typeof failureTypeProbabilities === "string") {
    try {
      failureTypeProbabilities = JSON.parse(failureTypeProbabilities);
    } catch {
      // Keep the original value when the backend returns non-JSON text.
    }
  }

  return {
    id: item.id,
    machineId: String(item.machineId ?? ""),
    windowStart: item.windowStart,
    windowEnd: item.windowEnd,
    failureWithin24h: Number(item.failureWithin24h ?? 0),
    failureProbability: Number(item.failureProbability ?? 0),
    rulHours: item.rulHours == null ? null : Number(item.rulHours),
    failureType: item.failureType ?? null,
    failureTypeProbabilities,
    createdAt: item.createdAt,
  };
}

export async function getPrediction(machineId) {
  if (!api.defaults.baseURL) {
    return null;
  }
  try {
    const response = await api.get(endpoints.latest(machineId));
    return normalizePrediction(response.data);
  } catch {
    return null;
  }
}

export async function getLatestPrediction(machineId) {
  return getPrediction(machineId);
}

export async function getPredictionHistory(machineId) {
  if (!api.defaults.baseURL) {
    return [];
  }
  try {
    const response = await api.get(endpoints.all(machineId));
    const data = Array.isArray(response.data) ? response.data : [];
    return data.map(normalizePrediction);
  } catch {
    return [];
  }
}

export async function runPrediction(machineId) {
  if (!api.defaults.baseURL) {
    return {
      machineId: String(machineId),
      failureProbability: 0.15,
      rulHours: 180,
      failureWithin24h: 0,
      createdAt: new Date().toISOString(),
    };
  }
  try {
    const response = await api.post(endpoints.predict(machineId));
    return normalizePrediction(response.data);
  } catch {
    return null;
  }
}
