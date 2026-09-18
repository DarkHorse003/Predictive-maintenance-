import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Menu,
  Search,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useAlerts } from "../../context/useAlerts";
import { getConnectionMeta } from "../../utils/connectionStatus";

export default function Topbar() {
  const {
    openAlerts,
    openCount,
    criticalCount,
    connectionState,
    transport,
    lastUpdate,
    soundEnabled,
    toggleSound,
    acknowledgeAlert,
    acknowledgeAllOpen,
  } = useAlerts();

  const connectionMeta = getConnectionMeta(connectionState, transport, lastUpdate);

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutRef = useRef(null);

  // Close flyout when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target)) {
        setFlyoutOpen(false);
      }
    }
    if (flyoutOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [flyoutOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden w-72 sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search machines or alerts..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        {/* Authoritative Alert Stream Status Indicator */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${connectionMeta.badgeClass}`}
          title={connectionMeta.pageDesc}
        >
          <span className={`h-2 w-2 rounded-full ${connectionMeta.dotClass}`} />
          <span className="hidden sm:inline font-semibold">
            {connectionMeta.badgeText}
          </span>
        </div>

        {/* Notification Bell with Flyout */}
        <div className="relative" ref={flyoutRef}>
          <button
            type="button"
            onClick={() => setFlyoutOpen((prev) => !prev)}
            className={`relative rounded-xl p-2 transition ${
              flyoutOpen
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {openCount > 0 && (
              <span
                className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm ${
                  criticalCount > 0 ? "bg-red-600 animate-pulse" : "bg-amber-600"
                }`}
              >
                {openCount > 99 ? "99+" : openCount}
              </span>
            )}
          </button>

          {/* Interactive Alert Flyout */}
          {flyoutOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Alert Center</h3>
                  {openCount > 0 && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {openCount} open
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleSound}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 transition"
                    title={soundEnabled ? "Mute alert chime" : "Unmute alert chime"}
                    aria-label="Toggle alert audio chime"
                  >
                    {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4" />}
                  </button>

                  {openCount > 0 && (
                    <button
                      type="button"
                      onClick={() => acknowledgeAllOpen()}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 transition"
                      title="Acknowledge all open alerts"
                      aria-label="Acknowledge all"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setFlyoutOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600"
                    aria-label="Close flyout"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Alerts List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {openAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
                      <Check className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">All systems clear</p>
                    <p className="text-xs text-slate-500 mt-1">
                      No active threshold breaches or unacknowledged alerts.
                    </p>
                  </div>
                ) : (
                  openAlerts.slice(0, 6).map((alert) => {
                    const isCritical = alert.severity === "CRITICAL";

                    return (
                      <div
                        key={alert.id}
                        className="p-3.5 transition hover:bg-slate-50 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                isCritical ? "bg-red-500" : "bg-amber-500"
                              }`}
                            />
                            <span className="text-xs font-bold text-slate-800">
                              {alert.displayId}
                            </span>
                            <span
                              className={`rounded px-1 text-[10px] font-bold uppercase ${
                                isCritical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {alert.severity}
                            </span>
                          </div>

                          <p className="mt-1 text-xs font-medium text-slate-900 truncate">
                            {alert.title}
                          </p>

                          {alert.percentOver != null && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {alert.sensorValue} {alert.unit} (Limit: {alert.threshold}){" "}
                              <span className="font-semibold text-red-600">
                                +{alert.percentOver}%
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                            title="Acknowledge alert"
                          >
                            Ack
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Flyout Footer */}
              <div className="border-t border-slate-100 p-2.5 bg-slate-50/60 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {openCount > 6 ? `Showing 6 of ${openCount} alerts` : `${openCount} open alerts`}
                </span>
                <Link
                  to="/alerts"
                  onClick={() => setFlyoutOpen(false)}
                  className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-slate-700"
                >
                  Open Alert Center <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile avatar */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
            M
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">Maintenance</p>
            <p className="text-[10px] text-slate-500">Engineer</p>
          </div>
        </div>
      </div>
    </header>
  );
}
