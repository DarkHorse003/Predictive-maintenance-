/**
 * Authoritative Connection Status Utilities
 * Unifies connection state across Alerts page, Topbar, and Sidebar.
 */

export function getConnectionMeta(connectionState, transport, lastUpdate) {
  // Format last update relative text
  let lastUpdateText = "Waiting for first update...";
  if (lastUpdate instanceof Date && !isNaN(lastUpdate.getTime())) {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
    if (elapsedSeconds < 3) {
      lastUpdateText = "just now";
    } else if (elapsedSeconds < 60) {
      lastUpdateText = `${elapsedSeconds}s ago`;
    } else {
      const minutes = Math.floor(elapsedSeconds / 60);
      lastUpdateText = `${minutes}m ago`;
    }
  }

  if (connectionState === "connected") {
    if (transport === "sse") {
      return {
        label: "LIVE",
        badgeText: "Live SSE",
        sidebarTitle: "System Connected",
        sidebarDesc: "Real-time alert stream active",
        pageDesc: `Real-time alert stream connected • Last event: ${lastUpdateText}`,
        dotClass: "bg-emerald-500 animate-pulse",
        badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
        lastUpdateText,
      };
    }

    // Polling transport
    return {
      label: "Connected",
      badgeText: "Connected (Polling)",
      sidebarTitle: "System Connected",
      sidebarDesc: "Polling for alert updates",
      pageDesc: `Polling for new alerts • Last update: ${lastUpdateText}`,
      dotClass: "bg-emerald-500",
      badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
      lastUpdateText,
    };
  }

  if (connectionState === "connecting") {
    return {
      label: "Connecting",
      badgeText: "Connecting...",
      sidebarTitle: "System Connecting",
      sidebarDesc: "Establishing alert connection",
      pageDesc: "Establishing live alert connection...",
      dotClass: "bg-amber-500 animate-ping",
      badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
      lastUpdateText,
    };
  }

  if (connectionState === "reconnecting") {
    return {
      label: "Reconnecting",
      badgeText: "Reconnecting...",
      sidebarTitle: "System Reconnecting",
      sidebarDesc: "Attempting to restore alert connection",
      pageDesc: `Attempting to restore alert stream... • Last successful update: ${lastUpdateText}`,
      dotClass: "bg-amber-500 animate-pulse",
      badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
      lastUpdateText,
    };
  }

  // Disconnected state
  return {
    label: "Disconnected",
    badgeText: "Disconnected",
    sidebarTitle: "System Disconnected",
    sidebarDesc: "Alert updates unavailable",
    pageDesc: `Live alert updates unavailable • Last successful update: ${lastUpdateText}`,
    dotClass: "bg-red-500",
    badgeClass: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    lastUpdateText,
  };
}
