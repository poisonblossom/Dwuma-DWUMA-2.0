import { useEffect, useState } from "react";

import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";

function readStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("dwumaUser") || sessionStorage.getItem("dwumaUser") || "null"
    );
  } catch {
    return null;
  }
}

function DashboardLayout({
  children,
  user,
  unreadNotifications,
  pageTitle = "Profile",
}) {
  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);
  const [loadedNotificationCount, setLoadedNotificationCount] = useState(
    typeof unreadNotifications === "number" ? unreadNotifications : 0
  );

  const displayUser = user || readStoredUser();
  const notificationCount = typeof unreadNotifications === "number"
    ? unreadNotifications
    : loadedNotificationCount;

  useEffect(() => {
    if (typeof unreadNotifications === "number") return;
    const token = localStorage.getItem("dwumaToken") || sessionStorage.getItem("dwumaToken");
    if (!token) return;
    const controller = new AbortController();
    const apiBase = (import.meta.env.VITE_API_BASE_URL || "https://dwuma-api.onrender.com/api").replace(/\/$/, "");

    fetch(`${apiBase}/notifications`, {
      signal: controller.signal,
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Notifications unavailable")))
      .then((data) => {
        const items = Array.isArray(data) ? data : data?.notifications || data?.items || [];
        setLoadedNotificationCount(items.filter((item) => !(item.isRead ?? item.read ?? false)).length);
      })
      .catch((error) => { if (error.name !== "AbortError") setLoadedNotificationCount(0); });

    return () => controller.abort();
  }, [unreadNotifications]);

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        user={displayUser}
        isOpen={isSidebarOpen}
        unreadNotifications={notificationCount}
        onClose={() => setIsSidebarOpen(false)}
      />

      {isSidebarOpen && (
        <button
          type="button"
          className="dashboard-sidebar-overlay"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="dashboard-main">
        <DashboardHeader
          user={displayUser}
          pageTitle={pageTitle}
          unreadNotifications={notificationCount}
          onOpenSidebar={() =>
            setIsSidebarOpen(true)
          }
        />

        <main className="dashboard-content">
          {children}
        </main>

        <footer className="dashboard-footer">
          © {new Date().getFullYear()} DWUMA. All
          rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default DashboardLayout;
