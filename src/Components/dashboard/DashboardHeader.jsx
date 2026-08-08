import {
  Bell,
  Menu,
  Search,
} from "lucide-react";
import { useLocation } from "wouter";

function getUserName(user) {
  return String(
    user?.username || user?.fullName || user?.name || user?.firstName || user?.email || ""
  ).trim();
}

function getInitial(user) {
  const firstName = getUserName(user);

  if (!firstName) {
    return "U";
  }

  return firstName.charAt(0).toUpperCase();
}

function DashboardHeader({
  user,
  unreadNotifications = 0,
  onOpenSidebar,
  pageTitle = "Dashboard",
}) {
  const [, navigate] = useLocation();
  const firstName = getUserName(user).split(/\s+/)[0];

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
        <button
          type="button"
          className="dashboard-menu-button"
          aria-label="Open navigation"
          onClick={onOpenSidebar}
        >
          <Menu size={21} />
        </button>

        <div className="dashboard-heading">
          <div className="dashboard-heading-row">
            <span className="dashboard-heading-icon">
              <span />
              <span />
              <span />
              <span />
            </span>

            <h1>{pageTitle}</h1>
          </div>

          <p>
            {firstName
              ? `Hi ${firstName},`
              : "Welcome to DWUMA"}
          </p>
        </div>
      </div>

      <div className="dashboard-header-actions">
        <form
          className="dashboard-search"
          onSubmit={(event) =>
            event.preventDefault()
          }
        >
          <Search size={17} />

          <input
            type="search"
            placeholder="Search jobs, skills..."
            aria-label="Search jobs and skills"
          />
        </form>

        <button
          type="button"
          className="dashboard-notification-button"
          aria-label="Notifications"
          onClick={() => navigate("/dashboard/notifications")}
        >
          <Bell size={20} />

          {unreadNotifications > 0 && (
            <span>
              {unreadNotifications > 9
                ? "9+"
                : unreadNotifications}
            </span>
          )}
        </button>

        <button
          type="button"
          className="dashboard-user-button"
          aria-label="Open profile"
          onClick={() => navigate("/dashboard/profile")}
        >
          {getInitial(user)}
        </button>
      </div>
    </header>
  );
}

export default DashboardHeader;
