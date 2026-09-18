# Step 7 — API integration layer

The frontend now reads machine data through `src/services/machineApi.js` and telemetry through `src/services/telemetryApi.js`.

## Backend endpoints currently wired

- `GET /api/machines/get/all/machine`
- `GET /api/machines/get/machine/{id}`
- `GET /api/telemetry/machine/{machineId}`
- `GET /api/telemetry/machine/{machineId}/latest`
- `GET /api/telemetry/machine/{machineId}/range?start=...&end=...`

## Configuration

Copy `.env.example` to `.env` if needed and set:

`VITE_API_BASE_URL=http://localhost:8080`

## Fallback behavior

If the API is unavailable, the UI falls back to `src/data/mockData.js`. The dashboard/machines pages show whether data came from the API or the fallback. Machine Details uses API telemetry when available and generates demo telemetry only when the telemetry endpoint is unavailable.

Prediction integration is isolated in `src/services/predictionApi.js` and will be enabled after the AI service contract is finalized.
