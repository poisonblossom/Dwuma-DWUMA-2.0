import { useEffect } from "react";
import { useLocation } from "wouter";

const whitelistPaths = [
  "/",
  "/login",
  "/create-account",
  "/forgot-password",
  "/email-verification",
  "/email-verified",
];

const onboardingPaths = ["/onboarding/step-1", "/onboarding/step-2"];

function ProtectedRoute({ children }) {
  const [location, navigate] = useLocation();

  const token =
    localStorage.getItem("dwumaToken") ||
    sessionStorage.getItem("dwumaToken");

  const isOnboarded =
    localStorage.getItem("isOnboarded") === "true";
  const hasPendingOnboarding =
    sessionStorage.getItem("dwumaPendingOnboarding") === "true";

  const isPublicPath = whitelistPaths.includes(location);
  const isOnboardingPath = onboardingPaths.includes(location);

  useEffect(() => {
    if (!token && !isPublicPath && !(isOnboardingPath && hasPendingOnboarding)) {
      navigate("/", { replace: true });
      return;
    }

    if (token && !isOnboarded && !isOnboardingPath) {
      navigate("/onboarding/step-1", { replace: true });
    }
  }, [token, isOnboarded, isOnboardingPath, isPublicPath, hasPendingOnboarding, navigate]);

  if (!token && !isPublicPath && !(isOnboardingPath && hasPendingOnboarding)) {
    return null;
  }

  if (token && !isOnboarded && !isOnboardingPath) {
    return null;
  }

  return children;
}

export default ProtectedRoute;
