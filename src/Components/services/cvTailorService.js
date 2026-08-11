const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://dwuma-api.onrender.com/api"
).replace(/\/$/, "");

function getToken() {
  return (
    localStorage.getItem("dwumaToken") ||
    sessionStorage.getItem("dwumaToken")
  );
}

export async function tailorCv({ file, jobTitle, jobDescription, companyName }) {
  const token = getToken();
  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const formData = new FormData();
  formData.append("File", file);
  formData.append("JobTitle", jobTitle);
  formData.append("JobDescription", jobDescription || "");
  formData.append("CompanyName", companyName || "");

  const response = await fetch(`${API_BASE_URL}/ResumeTailor/tailor`, {
    method: "POST",
    headers: {
      Accept: "application/json",
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
      "We couldn't tailor this CV. Please try again.";
    throw new Error(message);
  }

  if (!data?.tailoredCv?.trim()) {
    throw new Error("The tailored CV response did not include any content.");
  }

  return data;
}

export async function downloadTailoredCv({ tailoredCv, jobTitle, companyName }) {
  const token = getToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch(`${API_BASE_URL}/ResumeTailor/download`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tailoredCv, jobTitle, companyName }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || data?.title || "The Word document could not be generated.");
  }

  return response.blob();
}
