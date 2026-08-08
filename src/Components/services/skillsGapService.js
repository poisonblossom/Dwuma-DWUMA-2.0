const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://dwuma-api.onrender.com/api"
).replace(/\/$/, "");

function getToken() {
  return localStorage.getItem("dwumaToken") || sessionStorage.getItem("dwumaToken");
}

async function fetchJson(endpoint, options = {}) {
  const token = getToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.title || "Skills analysis could not be loaded.");
  }
  return data;
}

function getOnboardingData() {
  try {
    return JSON.parse(localStorage.getItem("dwumaOnboardingData") || "null");
  } catch {
    return null;
  }
}

export async function getUserSkillsGap({ signal } = {}) {
  const onboarding = getOnboardingData();
  const skills = Array.isArray(onboarding?.skills)
    ? [...new Set(onboarding.skills.map((skill) => String(skill).trim()).filter(Boolean))]
    : [];
  const fieldOfStudy = String(onboarding?.fieldOfWork || "").trim();
  const jobTitle = String(onboarding?.desiredRole || "").trim();

  if (!skills.length || !fieldOfStudy || !jobTitle) {
    throw new Error("Your saved onboarding information is incomplete. Please finish onboarding to generate your skills analysis.");
  }

  const analysis = await fetchJson("/SkillsGap/analyse", {
    method: "POST",
    signal,
    body: JSON.stringify({ skills, fieldOfStudy, jobTitle }),
  });

  return analysis;
}
