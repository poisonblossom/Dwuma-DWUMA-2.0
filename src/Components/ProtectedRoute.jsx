import { useEffect } from "react";
import { useLocation } from "wouter";

const whitelistPaths = [
  "/login",
  "/create-account",
  "/forgot-password",
  "/email-verification",
];

const onboardingPaths = ["/onboarding/step-1", "/onboarding/step-2"];

function ProtectedRoute({ children }) {
  const [, navigate] = useLocation();

  const token =
    localStorage.getItem("dwumaToken") ||
    sessionStorage.getItem("dwumaToken");

  const isOnboarded = localStorage.getItem("isOnboarded")

  useEffect(() => {
    if (
      !token && 
      !whitelistPaths.includes(window.location.pathname) &&
      !onboardingPaths.includes(window.location.pathname)
    ) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  if (
    !isOnboarded && 
    !whitelistPaths.includes(window.location.pathname) &&
    !onboardingPaths.includes(window.location.pathname) 
  ) {
    navigate("/onboarding/step-1", { replace: true });
    return null;
  }

  return children;
}

export default ProtectedRoute;