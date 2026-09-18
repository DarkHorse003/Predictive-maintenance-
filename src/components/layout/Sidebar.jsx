import { Activity, Bell, ClipboardList, Cpu, LayoutDashboard } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAlerts } from "../../context/useAlerts";
import { getConnectionMeta } from "../../utils/connectionStatus";

export default function Sidebar() {
  const { openCount, criticalCount, connectionState, transport, lastUpdate } = useAlerts();

  const connectionMeta = getConnectionMeta(connectionState, transport, lastUpdate);

  const navigation = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Machines", icon: Cpu, path: "/machines" },
    {
      name: "Alerts",
      icon: Bell,
      path: "/alerts",
      badge: openCount,
      isCritical: criticalCount > 0,
    },
    { name: "Work Orders", icon: ClipboardList, path: "/work-orders" },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900">MySoftHeaven</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Predictive Maintenance</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Monitoring</p>
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge > 0 ? (
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : item.isCritical
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Authoritative System Status Panel */}
      <div className="border-t border-slate-200 p-4">
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${connectionMeta.dotClass}`} />
            <span className="text-xs font-semibold text-slate-800">{connectionMeta.sidebarTitle}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 leading-tight">{connectionMeta.sidebarDesc}</p>
        </div>
      </div>
    </aside>
  );
}
