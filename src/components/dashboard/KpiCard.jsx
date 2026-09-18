export default function KpiCard({ title, value, description, icon: Icon, tone = "default" }) {
  const toneClasses = {
    default: {
      card: "border-slate-200 bg-white",
      icon: "bg-slate-100 text-slate-600",
      value: "text-slate-900",
    },
    success: {
      card: "border-emerald-200 bg-emerald-50/40 ring-1 ring-emerald-100",
      icon: "bg-emerald-100 text-emerald-700",
      value: "text-emerald-700",
    },
    warning: {
      card: "border-amber-200 bg-amber-50/40 ring-1 ring-amber-100",
      icon: "bg-amber-100 text-amber-700",
      value: "text-amber-700",
    },
    critical: {
      card: "border-red-200 bg-red-50/40 ring-1 ring-red-100",
      icon: "bg-red-100 text-red-700",
      value: "text-red-700",
    },
  };

  const currentTone = toneClasses[tone] || toneClasses.default;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition ${currentTone.card}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${currentTone.icon}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`mt-2 text-3xl font-bold font-mono tracking-tight ${currentTone.value}`}>
        {value ?? 0}
      </p>
      {description && (
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      )}
    </div>
  );
}
