import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  ExternalLink,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { machines } from "../data/mockData";
import { getStoredWorkOrders, saveStoredWorkOrders } from "../services/workOrderStorage";

const priorityStyles = {
  HIGH: "bg-red-50 text-red-700 ring-red-600/20",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-600/20",
  LOW: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const priorityLabels = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
const statusLabels = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};
const statusStyles = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Badge({ children, className }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

function Select({ value, onChange, options, icon }) {
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pr-9 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 ${icon ? "pl-10" : "pl-3"}`}
      >
        {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function SummaryCard({ icon, label, value, description, tone = "default" }) {
  const tones = {
    default: "bg-slate-50 text-slate-700",
    danger: "bg-red-50 text-red-700",
    warning: "bg-amber-50 text-amber-700",
    success: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export default function WorkOrders() {
  const [orders, setOrders] = useState(() => getStoredWorkOrders());
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("NEWEST");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const summary = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.status === "PENDING").length,
    inProgress: orders.filter((order) => order.status === "IN_PROGRESS").length,
    completed: orders.filter((order) => order.status === "COMPLETED").length,
  }), [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    const priorityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };

    return [...orders]
      .filter((order) => {
        if (priority !== "ALL" && order.priority !== priority) return false;
        if (status !== "ALL" && order.status !== status) return false;
        if (!query) return true;
        return [order.id, order.displayId, order.recommendation, order.status, order.priority, order.assignedTo, order.category]
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (sort === "PRIORITY") return priorityRank[b.priority] - priorityRank[a.priority];
        if (sort === "DUE_SOON") return new Date(a.dueDate) - new Date(b.dueDate);
        if (sort === "OLDEST") return new Date(a.createdAt) - new Date(b.createdAt);
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [orders, search, priority, status, sort]);

  function clearFilters() {
    setSearch("");
    setPriority("ALL");
    setStatus("ALL");
    setSort("NEWEST");
  }

  function updateStatus(orderId, nextStatus) {
    setOrders((current) => {
      const next = current.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order));
      saveStoredWorkOrders(next);
      return next;
    });
    setSelectedOrder((current) => (current?.id === orderId ? { ...current, status: nextStatus } : current));
  }

  function createWorkOrder(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const machine = machines.find((item) => item.machineId === form.get("machineId"));
    const order = {
      id: `WO-${String(orders.length + 1).padStart(3, "0")}`,
      machineId: machine ? machine.machineId : form.get("machineId"),
      displayId: machine ? machine.displayId : `Machine ${form.get("machineId")}`,
      priority: form.get("priority"),
      recommendation: form.get("recommendation"),
      status: "PENDING",
      createdAt: new Date().toISOString(),
      assignedTo: form.get("assignedTo"),
      dueDate: form.get("dueDate"),
      category: form.get("category"),
    };
    setOrders((current) => {
      const next = [order, ...current];
      saveStoredWorkOrders(next);
      return next;
    });
    setShowCreate(false);
    event.currentTarget.reset();
  }

  const hasFilters = search || priority !== "ALL" || status !== "ALL" || sort !== "NEWEST";

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><ClipboardList className="h-4 w-4" /> Maintenance execution</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Work Orders</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Turn machine-risk insights into trackable maintenance actions and monitor execution status.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
          <Plus className="h-4 w-4" /> Create work order
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<ClipboardList className="h-5 w-5" />} label="Total Orders" value={summary.total} description="Maintenance actions" />
        <SummaryCard icon={<Clock3 className="h-5 w-5" />} label="Pending" value={summary.pending} description="Waiting to start" tone="warning" />
        <SummaryCard icon={<CalendarClock className="h-5 w-5" />} label="In Progress" value={summary.inProgress} description="Currently being handled" />
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={summary.completed} description="Closed maintenance work" tone="success" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search work order, machine, assignee..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100" />
            </div>
            <Select value={priority} onChange={setPriority} options={[["ALL", "All priority"], ["HIGH", "High"], ["MEDIUM", "Medium"], ["LOW", "Low"]]} />
            <Select value={status} onChange={setStatus} options={[["ALL", "All status"], ["PENDING", "Pending"], ["IN_PROGRESS", "In progress"], ["COMPLETED", "Completed"]]} />
            <Select value={sort} onChange={setSort} options={[["NEWEST", "Newest first"], ["OLDEST", "Oldest first"], ["PRIORITY", "Highest priority"], ["DUE_SOON", "Due soon"]]} />
            {hasFilters ? <button type="button" onClick={clearFilters} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" /> Clear</button> : <div />}
          </div>
          <p className="mt-4 text-xs text-slate-400">Showing {filteredOrders.length} of {orders.length} work orders</p>
        </div>

        {filteredOrders.length ? (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order) => (
              <article key={order.id} className="p-4 transition hover:bg-slate-50/70 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={priorityStyles[order.priority]}>{priorityLabels[order.priority]} priority</Badge>
                      <Badge className={statusStyles[order.status]}>{statusLabels[order.status]}</Badge>
                      <span className="text-xs font-medium text-slate-400">{order.id}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="font-semibold text-slate-900">{order.displayId}</h2>
                      <span className="text-xs text-slate-400">{order.category}</span>
                    </div>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{order.recommendation}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> {order.assignedTo}</span>
                      <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Due {formatDateTime(order.dueDate)}</span>
                      <span>Created {formatDateTime(order.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <Link to={`/machines/${order.machineId}`} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-white">View machine <ExternalLink className="h-3.5 w-3.5" /></Link>
                    <button type="button" onClick={() => setSelectedOrder(order)} className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800">Manage</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center"><ClipboardList className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 font-semibold text-slate-900">No work orders found</h2><p className="mt-1 text-sm text-slate-500">Try changing your filters or create a new work order.</p></div>
        )}
      </section>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSubmit={createWorkOrder} />}
      {selectedOrder && <ManageModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={updateStatus} />}
    </div>
  );
}

function CreateModal({ onClose, onSubmit }) {
  return (
    <Modal title="Create work order" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Machine<select name="machineId" required className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="">Select machine</option>{machines.map((machine) => <option key={machine.machineId} value={machine.machineId}>{machine.displayId} · {machine.machineType}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Priority<select name="priority" defaultValue="MEDIUM" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></label>
          <label className="text-sm font-medium text-slate-700">Category<select name="category" defaultValue="Preventive Maintenance" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option>Preventive Maintenance</option><option>Inspection</option><option>Corrective Maintenance</option></select></label>
          <label className="text-sm font-medium text-slate-700">Assigned to<input name="assignedTo" required defaultValue="Maintenance Team A" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
        </div>
        <label className="block text-sm font-medium text-slate-700">Due date<input name="dueDate" required type="datetime-local" defaultValue="2026-09-11T12:00" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
        <label className="block text-sm font-medium text-slate-700">Maintenance action<textarea name="recommendation" required rows="3" placeholder="Describe the required maintenance action..." className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-100" /></label>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600">Cancel</button><button type="submit" className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">Create order</button></div>
      </form>
    </Modal>
  );
}

function ManageModal({ order, onClose, onStatusChange }) {
  return (
    <Modal title={`${order.id} · ${order.displayId}`} onClose={onClose}>
      <div className="space-y-5">
        <div><div className="flex flex-wrap gap-2"><Badge className={priorityStyles[order.priority]}>{priorityLabels[order.priority]} priority</Badge><Badge className={statusStyles[order.status]}>{statusLabels[order.status]}</Badge></div><p className="mt-3 text-sm leading-6 text-slate-600">{order.recommendation}</p></div>
        <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><Info label="Assigned to" value={order.assignedTo} /><Info label="Due" value={formatDateTime(order.dueDate)} /><Info label="Category" value={order.category} /><Info label="Created" value={formatDateTime(order.createdAt)} /></div>
        <div><p className="text-sm font-semibold text-slate-900">Update status</p><div className="mt-2 grid gap-2 sm:grid-cols-3">{Object.keys(statusLabels).map((value) => <button key={value} type="button" onClick={() => onStatusChange(order.id, value)} className={`rounded-xl border px-3 py-2 text-sm font-medium ${order.status === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{statusLabels[value]}</button>)}</div></div>
        <div className="flex justify-end"><button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600">Close</button></div>
      </div>
    </Modal>
  );
}

function Info({ label, value }) { return <div><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-700">{value}</p></div>; }

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="text-lg font-bold text-slate-900">{title}</h2><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button></div><div className="p-5">{children}</div></div></div>;
}
