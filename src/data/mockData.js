export const machines = Array.from({ length: 20 }, (_, i) => {
  const id = String(i + 1);
  const displayId = `M-${id.padStart(2, "0")}`;
  const types = ["CNC Mill", "Hydraulic Pump", "Centrifugal Compressor", "Robotic Arm", "Injection Molding"];
  const locations = ["Bay 1 - Machining", "Bay 2 - Assembly", "Bay 3 - Hydraulics", "Bay 4 - Packaging"];
  return {
    id: i + 1,
    machineId: id,
    displayId,
    name: `Machine ${id.padStart(2, "0")}`,
    machineType: types[i % types.length],
    location: locations[i % locations.length],
    status: "ACTIVE",
    operationalStatus: "ACTIVE",
    machineHealth: "UNKNOWN",
  };
});

export const workOrders = [
  {
    id: "WO-001",
    machineId: "1",
    displayId: "M-01",
    priority: "HIGH",
    status: "PENDING",
    recommendation: "Inspect motor winding and check cooling line for thermal dissipation issues.",
    assignedTo: "Electrical Team",
    dueDate: "2026-09-18T16:00:00.000Z",
    createdAt: "2026-09-17T08:30:00.000Z",
    category: "Corrective Maintenance",
  },
  {
    id: "WO-002",
    machineId: "4",
    displayId: "M-04",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    recommendation: "Perform scheduled vibration spectral check and dynamic shaft balancing.",
    assignedTo: "Mechanical Team",
    dueDate: "2026-09-19T12:00:00.000Z",
    createdAt: "2026-09-16T10:15:00.000Z",
    category: "Preventive Maintenance",
  },
  {
    id: "WO-003",
    machineId: "7",
    displayId: "M-07",
    priority: "HIGH",
    status: "PENDING",
    recommendation: "Check hydraulic manifold pressure and inspect seals for fluid leakage.",
    assignedTo: "Maintenance Team A",
    dueDate: "2026-09-18T18:00:00.000Z",
    createdAt: "2026-09-17T09:45:00.000Z",
    category: "Inspection",
  },
  {
    id: "WO-004",
    machineId: "2",
    displayId: "M-02",
    priority: "LOW",
    status: "COMPLETED",
    recommendation: "Quarterly lubrication top-up and general spindle bearing cleaning completed.",
    assignedTo: "Mechanical Team",
    dueDate: "2026-09-16T17:00:00.000Z",
    createdAt: "2026-09-15T08:00:00.000Z",
    category: "Preventive Maintenance",
  },
  {
    id: "WO-005",
    machineId: "10",
    displayId: "M-10",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    recommendation: "Calibrate three-phase current sensors and verify telemetry pipeline connection.",
    assignedTo: "Electrical Team",
    dueDate: "2026-09-20T10:00:00.000Z",
    createdAt: "2026-09-16T14:20:00.000Z",
    category: "Inspection",
  },
];
