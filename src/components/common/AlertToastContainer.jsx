import { Link } from "react-router-dom";
import { AlertTriangle, Check, ExternalLink, X } from "lucide-react";
import { useAlerts } from "../../context/useAlerts";

export default function AlertToastContainer() {
  const { toasts, dismissToast, acknowledgeAlert } = useAlerts();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 flex max-w-sm flex-col gap-2.5 sm:right-6">
      {toasts.map((toast) => {
        const isCritical = toast.severity === "CRITICAL";

        return (
          <div
            key={toast.toastId}
            className={`pointer-events-auto flex flex-col gap-2 rounded-2xl border p-4 shadow-xl backdrop-blur transition-all duration-300 ${
              isCritical
                ? "border-red-300 bg-white/95 text-slate-900 ring-2 ring-red-500/20"
                : "border-amber-300 bg-white/95 text-slate-900 ring-1 ring-amber-500/20"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    isCritical ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {toast.displayId || `Machine ${toast.machineId}`}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        isCritical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {toast.severity}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">{toast.title}</h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.toastId)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">{toast.message}</p>

            {toast.percentOver != null && (
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span>Reading:</span>
                <span className="font-semibold text-slate-800">
                  {toast.sensorValue} {toast.unit}
                </span>
                <span>(Limit: {toast.threshold} {toast.unit})</span>
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                  +{toast.percentOver}%
                </span>
              </div>
            )}

            <div className="mt-1 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
              <Link
                to={`/machines/${toast.machineId}`}
                onClick={() => dismissToast(toast.toastId)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                View machine <ExternalLink className="h-3 w-3" />
              </Link>

              <button
                type="button"
                onClick={async () => {
                  await acknowledgeAlert(toast.id);
                  dismissToast(toast.toastId);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                <Check className="h-3 w-3" /> Acknowledge
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
