import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const WORKSPACE_PATHS = {
  home: "/app/today",
  tracker: "/app/applications",
  essays: "/app/essays",
  compose: "/app/essays/new",
  interviews: "/app/interviews",
  deadlines: "/app/calendar",
  requirements: "/app/requirements",
  matrix: "/app/compare",
  docs: "/app/documents",
  research: "/app/research",
  share: "/app/export",
  profile: "/app/profile",
  settings: "/app/settings",
  notifications: "/app/notifications",
  admin: "/app/admin",
};

export function useWorkspaceNavigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeNav =
    Object.keys(WORKSPACE_PATHS).find(
      (key) => WORKSPACE_PATHS[key] === pathname.replace(/\/$/, ""),
    ) || "home";
  const setActiveNav = useCallback(
    (section) => {
      const nextPath = WORKSPACE_PATHS[section] || WORKSPACE_PATHS.home;
      if (pathname !== nextPath) navigate(nextPath);
    },
    [navigate, pathname],
  );
  return [activeNav, setActiveNav];
}
