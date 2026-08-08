import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { loadSavedOnboarding } from "./services/onboardingService";

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

  const locallyOnboarded = localStorage.getItem("isOnboarded") === "true";
  const [onboardingCheck, setOnboardingCheck] = useState({
    token,
    status: locallyOnboarded ? "complete" : token ? "checking" : "incomplete",
  });
  const effectiveOnboardingStatus = locallyOnboarded
    ? "complete"
    : onboardingCheck.token === token
      ? onboardingCheck.status
      : "checking";
  const hasPendingOnboarding =
    sessionStorage.getItem("dwumaPendingOnboarding") === "true";

  const isPublicPath = whitelistPaths.includes(location);
  const isOnboardingPath = onboardingPaths.includes(location);

  useEffect(() => {
    if (!token || locallyOnboarded || isOnboardingPath) return;

    const controller = new AbortController();
    loadSavedOnboarding({ signal: controller.signal })
      .then(({ completed }) => setOnboardingCheck({
        token,
        status: completed ? "complete" : "incomplete",
      }))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setOnboardingCheck({ token, status: "incomplete" });
        }
      });
    return () => controller.abort();
  }, [token, locallyOnboarded, isOnboardingPath]);

  useEffect(() => {
    if (!token && !isPublicPath && !(isOnboardingPath && hasPendingOnboarding)) {
      navigate("/", { replace: true });
      return;
    }

    if (token && effectiveOnboardingStatus === "incomplete" && !isOnboardingPath) {
      navigate("/onboarding/step-1", { replace: true });
    }
  }, [token, effectiveOnboardingStatus, isOnboardingPath, isPublicPath, hasPendingOnboarding, navigate]);

  if (!token && !isPublicPath && !(isOnboardingPath && hasPendingOnboarding)) {
    return null;
  }

  if (token && effectiveOnboardingStatus !== "complete" && !isOnboardingPath) {
    return null;
  }

  return children;
}

export default ProtectedRoute;
