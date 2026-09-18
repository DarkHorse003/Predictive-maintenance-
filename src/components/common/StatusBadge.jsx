import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

/**
 * 1. OPERATIONAL STATUS BADGE
 * Displays Machine.status: ACTIVE, INACTIVE, MAINTENANCE, OFFLINE
 */
export function OperationalStatusBadge({ status, size = "sm" }) {
  const norm = String(status || "UNKNOWN").toUpperCase();

  const configs = {
    ACTIVE: {
      label: "Active",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
      dot: "bg-emerald-500",
    },
    INACTIVE: {
      label: "Inactive",
      className: "bg-slate-100 text-slate-600 ring-slate-400/20",
      dot: "bg-slate-400",
    },
    MAINTENANCE: {
      label: "Maintenance",
      className: "bg-purple-50 text-purple-700 ring-purple-600/20",
      dot: "bg-purple-500",
    },
    OFFLINE: {
      label: "Offline",
      className: "bg-zinc-100 text-zinc-600 ring-zinc-400/20",
      dot: "bg-zinc-400",
    },
    UNKNOWN: {
      label: "Unknown",
      className: "bg-slate-100 text-slate-500 ring-slate-300/30",
      dot: "bg-slate-400",
    },
  };

  const cfg = configs[norm] || configs.UNKNOWN;
  const sizeClasses = size === "lg" ? "px-3 py-1.5 text-xs font-semibold" : "px-2.5 py-0.5 text-xs font-medium";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset ${cfg.className} ${sizeClasses}`}
      title={`Operational Status: ${cfg.label}`}
    >
      <span className="h-1.5 w-1.5 rounded-full ${cfg.dot}" />
      {cfg.label}
    </span>
  );
}

/**
 * 2. MACHINE HEALTH BADGE
 * Derived strictly from latest ML prediction: HEALTHY, WARNING, CRITICAL, UNKNOWN
 */
export function MachineHealthBadge({ health, size = "sm" }) {
  const norm = String(health || "UNKNOWN").toUpperCase();

  const configs = {
    HEALTHY: {
      label: "Healthy",
      className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 border-emerald-200",
      icon: CheckCircle2,
      iconClass: "text-emerald-600",
      dot: "bg-emerald-500",
    },
    WARNING: {
      label: "Warning",
      className: "bg-amber-50 text-amber-800 ring-amber-600/20 border-amber-200",
      icon: AlertTriangle,
      iconClass: "text-amber-600",
      dot: "bg-amber-500",
    },
    CRITICAL: {
      label: "Critical",
      className: "bg-red-50 text-red-800 ring-red-600/20 border-red-200",
      icon: ShieldAlert,
      iconClass: "text-red-600",
      dot: "bg-red-500",
    },
    UNKNOWN: {
      label: "Unknown",
      className: "bg-slate-100 text-slate-600 ring-slate-400/20 border-slate-200",
      icon: null,
      iconClass: "text-slate-400",
      dot: "bg-slate-400",
    },
  };

  const cfg = configs[norm] || configs.UNKNOWN;
  const Icon = cfg.icon;
  const sizeClasses = size === "lg" ? "px-3 py-1 text-xs font-bold" : "px-2.5 py-0.5 text-xs font-semibold";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset ${cfg.className} ${sizeClasses}`}
      title={`Machine Health: ${cfg.label}`}
    >
      {Icon ? <Icon className={`h-3 w-3 ${cfg.iconClass}`} /> : <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
}

/**
 * 3. ACTIVE ALERTS BADGE
 * Displays active alert count and severities separately from health
 */
export function AlertBadge({ total = 0, critical = 0, warning = 0, text = null, size = "sm" }) {
  if (total === 0 && !text) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 font-medium text-slate-500 ring-1 ring-inset ring-slate-200 ${
        size === "lg" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]"
      }`}>
        None
      </span>
    );
  }

  const isCritical = critical > 0;
  const isWarning = warning > 0 || total > 0;

  const bgClass = isCritical
    ? "bg-red-50 text-red-700 ring-red-600/20"
    : isWarning
    ? "bg-amber-50 text-amber-700 ring-amber-600/20"
    : "bg-slate-100 text-slate-600 ring-slate-200";

  let displayText = text;
  if (!displayText) {
    if (critical > 0 && warning > 0) {
      displayText = `${critical} Crit, ${warning} Warn`;
    } else if (critical > 0) {
      displayText = `${critical} ${critical === 1 ? "Critical" : "Critical"}`;
    } else if (warning > 0) {
      displayText = `${warning} ${warning === 1 ? "Warning" : "Warnings"}`;
    } else {
      displayText = `${total} Open`;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset ${
        size === "lg" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]"
      } ${bgClass}`}
      title={`Active Alerts: ${displayText}`}
    >
      {isCritical ? (
        <ShieldAlert className="h-3 w-3 text-red-600" />
      ) : isWarning ? (
        <AlertTriangle className="h-3 w-3 text-amber-600" />
      ) : null}
      {displayText}
    </span>
  );
}

/**
 * Default StatusBadge backwards-compatibility wrapper
 */
export default function StatusBadge({ status, type = "operational" }) {
  const upper = String(status || "").toUpperCase();

  if (type === "health" || ["HEALTHY", "CRITICAL", "UNKNOWN"].includes(upper)) {
    return <MachineHealthBadge health={upper} />;
  }

  if (["ACTIVE", "INACTIVE", "MAINTENANCE", "OFFLINE"].includes(upper)) {
    return <OperationalStatusBadge status={upper} />;
  }

  // Warning can be health or alert; default to health if unspecified
  if (upper === "WARNING") {
    return <MachineHealthBadge health="WARNING" />;
  }

  return <OperationalStatusBadge status={upper} />;
}
