const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://dwuma-api.onrender.com/api"
).replace(/\/$/, "");

function getToken() {
  return localStorage.getItem("dwumaToken") || sessionStorage.getItem("dwumaToken");
}

async function profileRequest(method = "GET", body, signal) {
  const token = getToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch(`${API_BASE_URL}/Profile${method === "GET" ? "/me" : ""}`, {
    method,
    signal,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.title || "Onboarding information could not be saved.");
  return data;
}

export function isCompletedProfile(profile) {
  const skills = [...(profile?.techSkills || []), ...(profile?.softSkills || [])];
  return Boolean(profile?.fieldOfStudy?.trim() && profile?.careerGoal?.trim() && skills.length);
}

function profileToOnboarding(profile) {
  const skills = [...(profile.techSkills || []), ...(profile.softSkills || [])];
  return {
    desiredRole: profile.careerGoal || "",
    fieldOfWork: profile.fieldOfStudy || "",
    location: profile.workLocation || "",
    skills,
  };
}

export async function loadSavedOnboarding({ signal } = {}) {
  const profile = await profileRequest("GET", null, signal);
  const completed = isCompletedProfile(profile);
  if (completed) {
    localStorage.setItem("dwumaOnboardingData", JSON.stringify(profileToOnboarding(profile)));
    localStorage.setItem("isOnboarded", "true");
  } else {
    localStorage.setItem("isOnboarded", "false");
  }
  return { completed, profile };
}

export async function saveOnboarding(onboarding) {
  const existing = await profileRequest("GET");
  const storedUser = JSON.parse(
    localStorage.getItem("dwumaUser") || sessionStorage.getItem("dwumaUser") || "{}"
  );
  const displayName = String(storedUser.fullName || storedUser.username || "").trim();
  const [firstName, ...lastParts] = displayName.split(/\s+/).filter(Boolean);

  const payload = {
    firstName: existing.firstName || firstName || "Dwuma",
    lastName: existing.lastName || lastParts.join(" ") || "User",
    email: existing.email || storedUser.email || "",
    phone: existing.phone || null,
    location: onboarding.location,
    linkedIn: existing.linkedIn || null,
    institution: existing.institution || null,
    degreeLevel: existing.degreeLevel || null,
    fieldOfStudy: onboarding.fieldOfWork,
    graduationYear: existing.graduationYear || null,
    classification: existing.classification || null,
    certifications: existing.certifications || [],
    techSkills: onboarding.skills,
    softSkills: existing.softSkills || [],
    languages: existing.languages || [],
    yearsExp: existing.yearsExp || null,
    industries: existing.industries || [],
    workLocation: onboarding.location,
    careerGoal: onboarding.desiredRole,
  };

  await profileRequest("POST", payload);
  localStorage.setItem("dwumaOnboardingData", JSON.stringify(onboarding));
  localStorage.setItem("isOnboarded", "true");
  sessionStorage.removeItem("dwumaPendingOnboarding");
}
