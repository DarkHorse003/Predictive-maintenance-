import { workOrders as initialWorkOrders } from "../data/mockData";

const STORAGE_KEY = "iot_work_orders_store";

export function getStoredWorkOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Error reading stored work orders", err);
  }

  // Fallback initial mock orders
  return initialWorkOrders.map((order, index) => ({
    ...order,
    assignedTo:
      order.assignedTo ||
      ["Maintenance Team A", "Mechanical Team", "Electrical Team"][index % 3],
    dueDate:
      order.dueDate ||
      ["2026-09-18T16:00:00", "2026-09-19T12:00:00", "2026-09-20T10:00:00"][index % 3],
    category: order.category || "Preventive Maintenance",
  }));
}

export function saveStoredWorkOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.warn("Error saving stored work orders", err);
  }
}

export function addWorkOrder(newOrder) {
  const current = getStoredWorkOrders();
  const nextId = `WO-${String(current.length + 1).padStart(3, "0")}`;

  const created = {
    id: nextId,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    assignedTo: "Unassigned",
    category: "Emergency Repair",
    ...newOrder,
  };

  const updated = [created, ...current];
  saveStoredWorkOrders(updated);
  return created;
}
