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

export async function uploadInterviewVideoSession({
  sessionId,
  jobTitle,
  companyName,
  jobDescription,
  videoBlob,
  questionTimings,
}) {
  const token =
    localStorage.getItem("dwumaToken") ||
    sessionStorage.getItem("dwumaToken");

  if (!token) {
    throw new Error(
      "Your login session has expired. Please sign in again."
    );
  }

  if (!sessionId) {
    throw new Error(
      "Interview session ID is missing."
    );
  }

  if (!videoBlob?.size) {
    throw new Error(
      "Interview recording is missing."
    );
  }

  const formData =
    new FormData();

  formData.append(
    "SessionId",
    String(sessionId)
  );

  formData.append(
    "JobTitle",
    jobTitle || ""
  );

  formData.append(
    "CompanyName",
    companyName || ""
  );

  formData.append(
    "JobDescription",
    jobDescription || ""
  );

  formData.append(
    "QuestionTimingsJson",
    JSON.stringify(
      questionTimings || []
    )
  );

  formData.append(
    "VideoFile",
    videoBlob,
    "interview.webm"
  );

  console.log(
    "Uploading interview video:",
    {
      sessionId,
      jobTitle,
      companyName,
      jobDescription,
      videoSize: videoBlob.size,
      videoType: videoBlob.type,
      questionTimings,
    }
  );

  const response =
    await fetch(
      `${API_BASE_URL}/interview/video-session`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },

        body:
          formData,
      }
    );

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    console.error(
      "Video session upload failed:",
      {
        status:
          response.status,

        data,
      }
    );

    if (data?.errors) {
      const messages =
        Object.entries(
          data.errors
        ).flatMap(
          ([field, values]) =>
            (Array.isArray(values)
              ? values
              : [values]
            ).map(
              (message) =>
                `${field}: ${message}`
            )
        );

      if (messages.length) {
        throw new Error(
          messages.join(" | ")
        );
      }
    }

    throw new Error(
      data?.message ||
      data?.title ||
      `Interview video upload failed (${response.status}).`
    );
  }

  return data;
}

export async function transcribeInterviewAnswer(
  audioBlob
) {
  const token =
    localStorage.getItem("dwumaToken") ||
    sessionStorage.getItem("dwumaToken");

  if (!token) {
    throw new Error(
      "Your login session has expired."
    );
  }

  if (!audioBlob?.size) {
    throw new Error(
      "The answer recording is empty."
    );
  }

  const formData =
    new FormData();

  formData.append(
    "audioFile",
    audioBlob,
    "answer.webm"
  );

  const response =
    await fetch(
      `${API_BASE_URL}/interview/transcribe-answer`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },

        body:
          formData,
      }
    );

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.title ||
      `Answer transcription failed (${response.status}).`
    );
  }

  return data;
}
export async function createSimliSession() {
  const token = getToken();

  if (!token) {
    throw new Error("Your login session has expired. Please sign in again.");
  }

  const response = await fetch(`${API_BASE_URL}/interview/simli/session-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        "The live interviewer could not connect. Standard voice mode will be used."
    );
  }

  return {
    sessionToken: data?.sessionToken || data?.session_token,
  };
}

export async function generateInterviewerSpeech(text) {
  const token = getToken();

  if (!token) {
    throw new Error("Your login session has expired. Please sign in again.");
  }

  const response = await fetch(`${API_BASE_URL}/interview/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.message ||
        "The interviewer voice could not be generated. Standard voice mode will be used."
    );
  }

  const pcmBytes = new Uint8Array(await response.arrayBuffer());
  const sampleRate = Number(response.headers.get("X-Audio-Sample-Rate")) || 24000;

  return { pcmBytes, sampleRate };
}
