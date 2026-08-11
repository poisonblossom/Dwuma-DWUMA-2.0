# DWUMA Simli Interviewer Setup

The Interview Coach now uses Simli for the live interviewer avatar and Gemini TTS for the interviewer voice.

## 1. Install the frontend dependency

```bash
npm install simli-client@^3.0.2
```

## 2. Create a Simli account

In Simli, create/select a face and copy:

- API key
- Face ID

## 3. Add backend environment variables

On the .NET backend / Render service add:

```text
SIMLI_API_KEY=your_simli_api_key
SIMLI_FACE_ID=your_simli_face_id
```

The backend also needs the Gemini key already used by DWUMA. The new speech endpoint accepts either:

```text
GEMINI_API_KEY=your_gemini_api_key
```

or the existing .NET configuration key `Gemini:ApiKey`.

Never put the Simli API key in a Vite `VITE_*` variable. Vite variables are shipped to the browser.

## 4. New flow

1. React asks `POST /api/interview/simli/session-token` for a short-lived Simli token.
2. React asks `POST /api/interview/speech` for Gemini TTS PCM audio.
3. Gemini returns 24 kHz PCM audio.
4. The frontend resamples it to 16 kHz PCM.
5. The audio is sent to Simli over its WebRTC client.
6. Simli returns the synchronized interviewer video/audio stream.
7. `speaking` and `silent` events control candidate turn-taking.

If Simli fails or the free quota is exhausted, DWUMA automatically falls back to browser speech instead of breaking the interview.

## Files added/changed

- `src/Components/interview/SimliInterviewer.jsx` (new)
- `src/Components/services/interviewService.js`
- `src/pages/InterviewCoach.jsx`
- `src/pages/InterviewCoach.css`
- `Dwuma/Controllers/InterviewCoachController.cs`
- `Dwuma/Models/Interview/InterviewerSpeechRequest.cs` (new)
- `package.json`

## Important

The uploaded branch contains only a partial copy of the .NET project (`Controllers`, `Services`, and interview models), so the backend could not be compiled in this workspace. Merge the modified controller/model files into the complete backend project before deploying.

## Important backend merge note
Do not replace your full InterviewCoachController with a reduced/partial controller.
The corrected controller in this package preserves the existing endpoints, including:
- POST /api/interview/video-session
- POST /api/interview/transcribe-answer
- POST /api/interview/evaluate-voice
- POST /api/interview/sessions/{sessionId}/complete

The Simli endpoints are merged into that controller:
- POST /api/interview/simli/session-token
- POST /api/interview/speech

The speech endpoint now uses Gemini 2.5 Flash Preview TTS and sends its 24 kHz PCM output to the frontend, which resamples it to the 16 kHz PCM input required by Simli.
