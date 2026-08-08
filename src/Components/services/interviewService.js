const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://dwuma-api.onrender.com/api"
).replace(/\/$/, "");
const LATEST_INTERVIEW_KEY = "dwumaLatestInterview";
const ACTIVE_INTERVIEW_KEY = "dwumaInterviewInProgress";

function getToken() {
  return (
    localStorage.getItem("dwumaToken") ||
    sessionStorage.getItem("dwumaToken")
  );
}

async function postInterview(endpoint, payload) {
  const token = getToken();

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch(`${API_BASE_URL}/interview/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Some server errors do not include a JSON body.
  }

  if (!response.ok) {
    const message =
      data?.message || data?.title || data?.error ||
      "We couldn't reach your interview coach. Please try again.";
    throw new Error(message);
  }

  return data;
}

async function requestInterview(endpoint, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/interview/${endpoint}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "The interview request failed.");
  return data;
}

export function generateInterviewQuestions(payload) {
  return postInterview("questions", payload);
}

export function evaluateInterviewAnswer(payload) {
  return postInterview("evaluate", payload);
}

export function completeInterview(sessionId) {
  return requestInterview(`sessions/${sessionId}/complete`, { method: "POST" });
}

export function getLatestInterview() {
  return requestInterview("latest");
}

export function clearCachedInterviewResult() {
  localStorage.removeItem(LATEST_INTERVIEW_KEY);
  localStorage.setItem(ACTIVE_INTERVIEW_KEY, "true");
}

export function cacheCompletedInterview(result) {
  if (!result?.completed || typeof result?.score !== "number") return;
  localStorage.setItem(LATEST_INTERVIEW_KEY, JSON.stringify(result));
  localStorage.removeItem(ACTIVE_INTERVIEW_KEY);
}

export function getCachedInterviewResult() {
  if (localStorage.getItem(ACTIVE_INTERVIEW_KEY) === "true") return null;
  try {
    const result = JSON.parse(localStorage.getItem(LATEST_INTERVIEW_KEY) || "null");
    return result?.completed && typeof result?.score === "number" ? result : null;
  } catch {
    localStorage.removeItem(LATEST_INTERVIEW_KEY);
    return null;
  }
}

export function hasActiveInterview() {
  return localStorage.getItem(ACTIVE_INTERVIEW_KEY) === "true";
}
