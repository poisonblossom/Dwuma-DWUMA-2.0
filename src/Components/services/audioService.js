const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://dwuma-api.onrender.com/api"
).trim().replace(/\/$/, "");

function getToken() {
  return (
    localStorage.getItem("dwumaToken") ||
    sessionStorage.getItem("dwumaToken")
  );
}

function appendValue(formData, name, value) {
  formData.append(name, String(value ?? ""));
}

export async function evaluateVoiceInterviewAnswer(
  {
    sessionId,
    questionId,
    jobTitle,
    companyName,
    jobDescription,
    question,
    audioBlob,
  },
  { signal } = {},
) {
  const token = getToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const contentType = String(audioBlob.type || "audio/webm")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const normalizedAudio =
    contentType === audioBlob.type
      ? audioBlob
      : new Blob([audioBlob], { type: contentType });
  const extension = contentType.includes("mp4") ? "mp4" : "webm";
  const formData = new FormData();
  appendValue(formData, "SessionId", sessionId);
  appendValue(formData, "QuestionId", questionId);
  appendValue(formData, "JobTitle", jobTitle);
  appendValue(formData, "CompanyName", companyName);
  appendValue(formData, "JobDescription", jobDescription);
  appendValue(formData, "Question", question);
  formData.append("AudioFile", normalizedAudio, `interview-answer.${extension}`);

  const response = await fetch(`${API_BASE_URL}/interview/evaluate-voice`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    signal,
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.error ||
        "The voice interview answer could not be evaluated. Please try again.",
    );
  }

  const transcription = String(result?.transcription || "").trim();
  if (!transcription) throw new Error("No speech was detected in that recording.");
  if (!result?.feedback) throw new Error("No interview feedback was returned.");

  return { transcription, feedback: result.feedback };
}
