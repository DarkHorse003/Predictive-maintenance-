import { useContext } from "react";
import { AlertContext } from "./AlertContextDef";

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlerts must be used within an AlertProvider");
  }
  return ctx;
}
