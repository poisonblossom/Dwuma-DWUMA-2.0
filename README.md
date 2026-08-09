# Dwuma Frontend

React and Vite frontend for the Dwuma platform.

## Local development

```bash
npm install
npm run dev
```

Create a local `.env` containing the deployed API base URL:

```env
VITE_API_BASE_URL=https://dwuma-api.onrender.com/api
```

Restart Vite after changing environment variables.

## Interview Coach voice support

Voice transcription and evaluation use the existing deployed Dwuma backend. No separate speech API URL or frontend provider key is required.

### Typed answers

```text
POST /api/interview/evaluate
Content-Type: application/json
Authorization: Bearer <logged-in browser token>
```

### Recorded answers

```text
POST /api/interview/evaluate-voice
Content-Type: multipart/form-data
Authorization: Bearer <logged-in browser token>
```

The frontend sends these multipart fields:

| Field | Description |
| --- | --- |
| `SessionId` | Active interview session ID. |
| `QuestionId` | Current interview question ID. |
| `JobTitle` | Interview role. |
| `CompanyName` | Interview company. |
| `JobDescription` | Role description. |
| `Question` | Current question text. |
| `AudioFile` | Candidate recording in a backend-supported audio format. |

Browser codec parameters such as `audio/webm;codecs=opus` are normalized to
the backend-supported base MIME type (`audio/webm`) before upload.

Expected response:

```json
{
  "transcription": "The candidate's transcribed answer.",
  "feedback": {
    "score": 80,
    "overallAssessment": "A clear and relevant answer.",
    "strengths": [],
    "improvements": [],
    "improvedAnswer": "An improved example answer.",
    "deliveryTip": "Keep the result concise."
  }
}
```

The response fills the submitted-answer field and displays the returned evaluation. Completing the session continues through the existing completion endpoint, and its final score is displayed on the dashboard.

### Text-to-speech

Questions are spoken with the browser's `SpeechSynthesis` API. This provides:

- A username greeting when a newly generated interview begins.
- Automatic reading whenever an interview question appears.
- Listen, pause, resume, and stop controls.
- Automatic speech cancellation when recording starts or the question changes.
- A text-only fallback when browser speech synthesis is unavailable.

TTS does not call the backend and does not require an API key.

## Voice behaviour

1. Starting an interview greets the available username and reads the first question.
2. Every subsequent question is read aloud automatically when it appears; the candidate can pause, resume, stop, or replay it.
3. Selecting **Record answer** stops question playback and requests microphone permission.
4. Selecting **Stop recording** uploads the answer to `/api/interview/evaluate-voice`.
5. The returned transcription and feedback are displayed together.
6. Typed answers remain available when recording is unsupported or permission is denied.
7. Ending the interview or changing questions stops microphone and speech activity.

## Security and privacy

- The frontend uses the logged-in browser bearer token for interview requests.
- No bearer token, AI-provider key, or speech-service secret is hardcoded.
- Recordings are sent only to the authenticated deployed backend endpoint.
- Microphone access is requested only after a user action.
- Active microphone tracks are stopped after recording or navigation.

## Verification

```bash
npm run build
npx eslint src/pages/InterviewCoach.jsx src/Components/services/audioService.js
```

Test microphone permission, silence, background noise, supported mobile browsers, Ghanaian English accents, and the text-only fallback before production release.
