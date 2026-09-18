import { useState } from "react";
import { ClipboardList, ShieldAlert, Wrench, X } from "lucide-react";
import { addWorkOrder } from "../../services/workOrderStorage";
import { useAlerts } from "../../context/useAlerts";

export default function AlertWorkOrderModal({ alertItem, onClose, onCreated }) {
  const { acknowledgeAlert } = useAlerts();

  const [machineId] = useState(alertItem?.machineId || "1");
  const [displayId] = useState(alertItem?.displayId || `M-${String(alertItem?.machineId || "01").padStart(2, "0")}`);
  const [priority, setPriority] = useState(() => (alertItem?.severity === "CRITICAL" ? "HIGH" : "MEDIUM"));
  const [category, setCategory] = useState(() => {
    if (alertItem?.sensorCategory === "Vibration") return "Mechanical Balancing & Bearing";
    if (alertItem?.sensorCategory === "Thermal") return "Cooling System & Lubrication";
    if (alertItem?.sensorCategory === "Electrical") return "Electrical & Phase Calibration";
    if (alertItem?.sensorCategory === "Pressure") return "Pneumatic & Seal Inspection";
    return "Corrective Maintenance";
  });
  const [assignedTo, setAssignedTo] = useState("Mechanical Team");
  const [recommendation, setRecommendation] = useState(
    alertItem
      ? `Investigate threshold breach on ${alertItem.displayId}: ${alertItem.title}. Reading: ${alertItem.sensorValue ?? "N/A"} ${alertItem.unit || ""} (Safe threshold: ${alertItem.threshold ?? "N/A"}). Inspect hardware components and replace worn parts.`
      : "Emergency inspection of machine sensors."
  );
  const [autoAcknowledge, setAutoAcknowledge] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const created = addWorkOrder({
        machineId,
        displayId,
        priority,
        category,
        assignedTo,
        recommendation,
        dueDate: new Date(Date.now() + (priority === "HIGH" ? 24 : 72) * 3600 * 1000).toISOString(),
      });

      if (autoAcknowledge && alertItem?.id && !alertItem?.resolved) {
        await acknowledgeAlert(alertItem.id);
      }

      if (onCreated) {
        onCreated(created);
      }
      onClose();
    } catch (err) {
      console.error("Failed to create work order from alert", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Wrench className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Dispatch Work Order</h2>
              <p className="text-xs text-slate-500">
                Generate maintenance action for {displayId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex items-start gap-3 text-xs">
            <ShieldAlert
              className={`h-5 w-5 shrink-0 ${
                alertItem?.severity === "CRITICAL" ? "text-red-600" : "text-amber-600"
              }`}
            />
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <span>{alertItem?.displayAlertId || "Alert"}</span>
                <span>•</span>
                <span>{alertItem?.title}</span>
              </div>
              <p className="mt-0.5 text-slate-500">{alertItem?.message}</p>
              {alertItem?.percentOver != null && (
                <p className="mt-1 font-semibold text-red-600">
                  Breach Delta: +{alertItem.percentOver}% above safe threshold
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-slate-400"
              >
                <option value="HIGH">High (Urgent Attention)</option>
                <option value="MEDIUM">Medium (Scheduled)</option>
                <option value="LOW">Low (Preventative)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Team
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-slate-400"
              >
                <option value="Mechanical Team">Mechanical Team</option>
                <option value="Electrical Team">Electrical Team</option>
                <option value="Maintenance Team A">Maintenance Team A</option>
                <option value="Reliability Engineering">Reliability Engineering</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Maintenance Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-slate-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Action Plan & Diagnostic Notes
            </label>
            <textarea
              rows={3}
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none focus:border-slate-400"
              required
            />
          </div>

          {alertItem && !alertItem.resolved && (
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={autoAcknowledge}
                onChange={(e) => setAutoAcknowledge(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-xs text-slate-600 font-medium">
                Automatically acknowledge this alert once work order is created
              </span>
            </label>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-50"
            >
              <ClipboardList className="h-4 w-4" />
              {isSubmitting ? "Dispatching..." : "Create & Dispatch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
