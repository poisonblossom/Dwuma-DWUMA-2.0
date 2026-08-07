const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://dwuma-api.onrender.com/api"
).replace(/\/$/, "");

function getToken() {
  return (
    localStorage.getItem("dwumaToken") ||
    sessionStorage.getItem("dwumaToken")
  );
}

export async function parseCv(file) {
  const token = getToken();
  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const formData = new FormData();
  formData.append("File", file);

  const response = await fetch(`${API_BASE_URL}/ResumeTailor/parse-cv`, {
    method: "POST",
    headers: {
      Accept: "*/*",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // The API may return an empty body for an infrastructure error.
  }

  if (!response.ok) {
    const message =
      data?.message || data?.title || data?.error ||
      "We couldn't read this CV. Please check the file and try again.";
    throw new Error(message);
  }

  if (!data?.text?.trim()) {
    throw new Error("No readable text was found in this CV.");
  }

  return data;
}

export async function tailorCv(payload) {
  const token = getToken();
  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch(`${API_BASE_URL}/ResumeTailor/tailor`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // The API may return an empty body for an infrastructure error.
  }

  if (!response.ok) {
    const message =
      data?.message || data?.title || data?.error ||
      "We couldn't tailor this CV. Please try again.";
    throw new Error(message);
  }

  if (!data?.tailoredCv?.trim()) {
    throw new Error("The tailored CV response did not include any content.");
  }

  return data;
}
