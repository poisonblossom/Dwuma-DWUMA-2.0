const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://dwuma-api.onrender.com/api";

function getAuthToken() {
  return (
    localStorage.getItem("dwumaToken") ||
    sessionStorage.getItem("dwumaToken")
  );
}

export async function getJobs({ query, location, jobType, remote, nextPageToken, signal } = {}) {
  const token = getAuthToken();
  const parameters = new URLSearchParams();
  if (query?.trim()) parameters.set("query", query.trim());
  if (location?.trim()) parameters.set("location", location.trim());
  if (jobType?.trim()) parameters.set("jobType", jobType.trim());
  if (typeof remote === "boolean") parameters.set("remote", String(remote));
  if (nextPageToken) parameters.set("nextPageToken", nextPageToken);

  const response = await fetch(`${API_BASE_URL}/jobs/search?${parameters.toString()}`, {
    method: "GET",
    signal,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error("Jobs could not be loaded.");
  }

  const payload = await response.json();
  const jobs = Array.isArray(payload)
    ? payload
    : payload.jobs || payload.items || payload.data || [];

  return {
    jobs: Array.isArray(jobs) ? jobs : [],
    nextPageToken: payload?.nextPageToken || null,
    hasMore: Boolean(payload?.hasMore && payload?.nextPageToken),
  };
}
