import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AlertProvider } from "./context/AlertContext";
import DashboardLayout from "./layouts/DashboardLayout";

import Dashboard from "./pages/Dashboard";
import Machines from "./pages/Machines";
import MachineDetails from "./pages/MachineDetails";
import Alerts from "./pages/Alerts";
import WorkOrders from "./pages/WorkOrders";

export default function App() {
  return (
    <BrowserRouter>
      <AlertProvider>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/machines" element={<Machines />} />
            <Route path="/machines/:machineId" element={<MachineDetails />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/work-orders" element={<WorkOrders />} />
          </Route>
        </Routes>
      </AlertProvider>
    </BrowserRouter>
  );
}
