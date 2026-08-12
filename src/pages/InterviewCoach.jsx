import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Eye,
  FileText,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";

import DashboardLayout from "../Components/dashboard/DashboardLayout";
import SimliInterviewer from "../Components/interview/SimliInterviewer";
import {
  generateInterviewQuestions,
  evaluateInterviewAnswer,
  completeInterview,
  cacheCompletedInterview,
  clearCachedInterviewResult,
  uploadInterviewVideoSession,
} from "../Components/services/interviewService";
import "../Components/dashboard/Dashboard.css";
import "./InterviewCoach.css";

const SESSION_KEY = "dwumaInterviewSession";
const MAX_ANSWER_LENGTH = 4000;
const MAX_RECORDING_SECONDS = 5 * 60;

const EMPTY_SETUP = {
  jobTitle: "",
  companyName: "",
  jobDescription: "",
  candidateSkills: "",
  candidateExperience: "",
  numberOfQuestions: 5,
};

function restoreSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (value?.sessionId && value?.setup && Array.isArray(value.questions) &&
        value.questions.length && value.questions.every((question) => question.id)) {
      return value;
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
  return null;
}

function persistSession(session) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
}

function ScoreRing({ score, label = "Answer score" }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="coach-score-ring" style={{ "--score": `${safeScore * 3.6}deg` }}>
      <div><strong>{safeScore}</strong><span>{label}</span></div>
    </div>
  );
}

function getPreferredFemaleVoice(voices) {
  if (!voices?.length) {
    return null;
  }

  const preferredNames = [
    "Microsoft Jenny",
    "Microsoft Aria",
    "Microsoft Zira",
    "Samantha",
    "Google US English",
    "Victoria",
    "Karen",
  ];

  for (const name of preferredNames) {
    const voice = voices.find((item) =>
      item.name
        .toLowerCase()
        .includes(name.toLowerCase())
    );

    if (voice) {
      return voice;
    }
  }

  return (
    voices.find(
      (voice) =>
        voice.lang === "en-US"
    ) ||
    voices.find((voice) =>
      voice.lang
        ?.toLowerCase()
        .startsWith("en")
    ) ||
    null
  );
}

function InterviewCoach() {
  const restored = useMemo(() => restoreSession(), []);
  const restoredReviewedAnswer =
    restored?.answers?.[restored.currentIndex];
  const [setup, setSetup] = useState(restored?.setup || EMPTY_SETUP);
  const [questions, setQuestions] = useState(restored?.questions || []);
  const [sessionId, setSessionId] = useState(restored?.sessionId || null);
  const [answers, setAnswers] = useState(restored?.answers || []);
  const [currentIndex, setCurrentIndex] = useState(restored?.currentIndex || 0);
  const [answer, setAnswer] = useState(
    restored?.draftAnswer || restoredReviewedAnswer?.answer || ""
  );
  const [feedback, setFeedback] = useState(
    restored?.feedback || restoredReviewedAnswer?.feedback || null
  );
  const [phase, setPhase] = useState(
    restored?.phase === "complete"
      ? "complete"
      : restored
        ? "interview"
        : "setup"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speechState, setSpeechState] = useState("idle");
  const [simliAvailable, setSimliAvailable] = useState(false);
  const [voiceMode, setVoiceMode] = useState("simli");
  const [availableVoices, setAvailableVoices] = useState([]);
  const [cameraEnabled, setCameraEnabled] =  useState(false);
  const [cameraError, setCameraError] =  useState("");
  const [sessionRecording, setSessionRecording] =  useState(false);
  const [sessionRecordingSeconds, setSessionRecordingSeconds] =  useState(0);
  const [recordedSessionBlob, setRecordedSessionBlob] =  useState(null);
  const [recordedSessionUrl, setRecordedSessionUrl] =  useState("");
  const [questionTimings, setQuestionTimings] = useState([]);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [answerRecording, setAnswerRecording] = useState(false);
  const [processingStage, setProcessingStage] = useState("idle");
  const [processingCurrent, setProcessingCurrent] = useState(0);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [expandedExamples, setExpandedExamples] = useState({});

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const utteranceRef = useRef(null);
  const simliInterviewerRef = useRef(null);
  const speechRequestIdRef = useRef(0);
  const sessionRecorderRef =  useRef(null);
  const sessionChunksRef =  useRef([]);
  const sessionTimerRef =  useRef(null);
  const sessionStreamRef =  useRef(null);
  const sessionStartedAtRef = useRef(null);
  const answerStartedAtRef = useRef(null);
  const questionStartedAtRef = useRef(null);
  const recordingStopResolverRef = useRef(null);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState("");
  const speechRecognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const shouldRecognitionRunRef = useRef(false);
 
  

  const currentQuestion = questions[currentIndex];
  const interviewerSpeaking = speechState === "playing";
  const interviewerPreparing = speechState === "loading";
  const interviewerActive = interviewerSpeaking || interviewerPreparing;
  const completedCount = answers.length;
  const evaluatedAnswers =
  answers.filter(
    (item) =>
      item.feedback &&
      Number.isFinite(
        Number(
          item.feedback.score
        )
      )
  );

const averageScore =
  evaluatedAnswers.length
    ? Math.round(
        evaluatedAnswers.reduce(
          (sum, item) =>
            sum +
            Number(
              item.feedback.score
            ),
          0
        ) /
          evaluatedAnswers.length
      )
    : 0;

  useEffect(() => {
  return () => {
    clearInterval(
      sessionTimerRef.current
    );

    window.speechSynthesis
      ?.cancel();

    simliInterviewerRef.current?.stop?.();

    shouldRecognitionRunRef.current = false;

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort();
      } catch {
        // Ignore cleanup errors.
      }

      speechRecognitionRef.current = null;
    }
    if (
      sessionRecorderRef.current &&
      sessionRecorderRef.current.state !==
        "inactive"
    ) {
      sessionRecorderRef.current.stop();
    }

    sessionStreamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop()
      );

    cameraStreamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop()
      );
  
    };
}, []);


useEffect(() => {
  if (!window.speechSynthesis) {
    return;
  }

  function loadVoices() {
    const voices =
      window.speechSynthesis.getVoices();

    setAvailableVoices(voices);

    console.log(
      "Available TTS voices:",
      voices.map((voice) => ({
        name: voice.name,
        lang: voice.lang,
      }))
    );
  }

  loadVoices();

  window.speechSynthesis.addEventListener(
    "voiceschanged",
    loadVoices
  );

  return () => {
    window.speechSynthesis.removeEventListener(
      "voiceschanged",
      loadVoices
    );
  };
}, []);


useEffect(() => {
  if (
    !cameraEnabled ||
    !videoRef.current ||
    !cameraStreamRef.current
  ) {
    return;
  }

  const videoElement =
    videoRef.current;

  videoElement.srcObject =
    cameraStreamRef.current;

  videoElement
    .play()
    .catch((error) => {
      console.error(
        "Unable to play camera preview:",
        error
      );
    });

  return () => {
    if (videoElement) {
      videoElement.srcObject = null;
    }
  };
}, [cameraEnabled]);

useEffect(() => {
  if (
    phase !== "interview" ||
    interviewerActive ||
    !microphoneEnabled ||
    answerRecording
  ) {
    return;
  }

  const timer =
    setTimeout(() => {
      console.log(
        "Starting browser transcription"
      );

      startSpeechRecognition();

      setAnswerRecording(true);
    }, 250);

  return () => {
    clearTimeout(timer);
  };
}, [
  phase,
  interviewerActive,
  microphoneEnabled,
  answerRecording,
  currentIndex,
]);


async function startInterviewSession() {
  setCameraError("");

  if (
    !navigator.mediaDevices?.getUserMedia
  ) {
    setCameraError(
      "Camera and microphone access are not supported by this browser."
    );

    return;
  }

  try {
    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },

        audio: true,
      });

      const videoTracks =
        stream.getVideoTracks();

      const audioTracks =
        stream.getAudioTracks();

      console.log(
        "Video tracks:",
        videoTracks
      );

      console.log(
        "Audio tracks:",
        audioTracks
      );

      if (videoTracks.length === 0) {
        throw new Error(
          "No camera video track was provided."
        );
      }

      if (audioTracks.length === 0) {
        throw new Error(
          "No microphone audio track was provided."
        );
      }

      setMicrophoneEnabled(true);

    sessionStreamRef.current =
      stream;

    cameraStreamRef.current =
      stream;

    setCameraEnabled(true);

    sessionChunksRef.current = [];

    let options = {};

    if (
      MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp9,opus"
      )
    ) {
      options.mimeType =
        "video/webm;codecs=vp9,opus";
    } else if (
      MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp8,opus"
      )
    ) {
      options.mimeType =
        "video/webm;codecs=vp8,opus";
    } else if (
      MediaRecorder.isTypeSupported(
        "video/webm"
      )
    ) {
      options.mimeType =
        "video/webm";
    }

    console.log(
  "Recording stream:",
  {
    videoTracks:
      stream
        .getVideoTracks()
        .map((track) => ({
          label: track.label,
          enabled: track.enabled,
          readyState:
            track.readyState,
        })),

    audioTracks:
      stream
        .getAudioTracks()
        .map((track) => ({
          label: track.label,
          enabled: track.enabled,
          readyState:
            track.readyState,
        })),
  }
);

    const recorder =
      new MediaRecorder(
        stream,
        {
          ...options,
          videoBitsPerSecond: 1_200_000,
          audioBitsPerSecond: 64_000,
        }
      );

    sessionRecorderRef.current =
      recorder;

    recorder.ondataavailable =
      (event) => {
        if (event.data.size > 0) {
          sessionChunksRef.current.push(
            event.data
          );
        }
      };

    recorder.onstop = () => {
  const blob =
    new Blob(
      sessionChunksRef.current,
      {
        type:
          recorder.mimeType ||
          "video/webm",
      }
    );

  setRecordedSessionBlob(
    blob
  );

  setRecordedSessionUrl(
    (currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(
          currentUrl
        );
      }

      return URL.createObjectURL(
        blob
      );
    }
  );

  if (
    recordingStopResolverRef.current
  ) {
    recordingStopResolverRef.current(
      blob
    );

    recordingStopResolverRef.current =
      null;
  }
};

    sessionStartedAtRef.current = performance.now();

    setQuestionTimings([]);

    recorder.start(1000);

    setSessionRecording(true);
    setSessionRecordingSeconds(0);

    clearInterval(
      sessionTimerRef.current
    );

    sessionTimerRef.current =
      setInterval(() => {
        setSessionRecordingSeconds(
          (previous) =>
            previous + 1
        );
      }, 1000);
  } catch (error) {
    console.error(
      "Unable to start interview session:",
      error
    );

    setSessionRecording(false);

    if (
      error.name ===
      "NotAllowedError"
    ) {
      setCameraError(
        "Camera or microphone permission was denied."
      );

      return;
    }

    if (
      error.name ===
      "NotFoundError"
    ) {
      setCameraError(
        "A camera or microphone could not be found."
      );

      return;
    }

    setCameraError(
      "Unable to start the video interview."
    );
  }
}

function getSessionElapsedSeconds() {
  if (!sessionStartedAtRef.current) {
    return 0;
  }

  return Number(
    (
      (
        performance.now() -
        sessionStartedAtRef.current
      ) /
      1000
    ).toFixed(2)
  );
}

async function endInterviewSession() {
  clearInterval(
    sessionTimerRef.current
  );

  sessionTimerRef.current =
    null;

  setSessionRecording(false);

  stopCoachAudio();

  let finalBlob = null;

  if (
    sessionRecorderRef.current &&
    sessionRecorderRef.current.state !==
      "inactive"
  ) {
    finalBlob =
      await new Promise(
        (resolve) => {
          recordingStopResolverRef.current =
            resolve;

          sessionRecorderRef.current.stop();
        }
      );
  } else {
    finalBlob =
      recordedSessionBlob;
  }

  sessionStreamRef.current
    ?.getTracks()
    .forEach(
      (track) =>
        track.stop()
    );

    setMicrophoneEnabled(false);

  sessionStreamRef.current =
    null;

  cameraStreamRef.current =
    null;

  if (videoRef.current) {
    videoRef.current.srcObject =
      null;
  }

  setCameraEnabled(false);

  return finalBlob;
}



function formatVideoTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

  function stopCoachAudio() {
    speechRequestIdRef.current += 1;
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    simliInterviewerRef.current?.clear?.();
    setSpeechState("idle");
  }

  function pauseCoachAudio() {
    if (!window.speechSynthesis || speechState !== "playing" || voiceMode !== "browser") return;
    window.speechSynthesis.pause();
    setSpeechState("paused");
  }

  function resumeCoachAudio() {
    if (!window.speechSynthesis || speechState !== "paused" || voiceMode !== "browser") return;
    window.speechSynthesis.resume();
    setSpeechState("playing");
  }

  function playBrowserCoachAudio(text) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setError("Spoken questions are not supported by this browser.");
      setSpeechState("idle");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const preferredVoice = getPreferredFemaleVoice(availableVoices);

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.lang = preferredVoice?.lang || "en-US";
    utterance.rate = 0.93;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        answerStartedAtRef.current = getSessionElapsedSeconds();
        setSpeechState("idle");
        
      }
    };

    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") return;
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setSpeechState("idle");
        setError("The interview question could not be spoken by this browser.");
      }
    };

    utteranceRef.current = utterance;
    setSpeechState("playing");
    window.speechSynthesis.speak(utterance);
  }

  async function playCoachAudio(text) {
  stopCoachAudio();
  setError("");

  questionStartedAtRef.current =
    getSessionElapsedSeconds();

  const requestId =
    speechRequestIdRef.current + 1;

  speechRequestIdRef.current = requestId;

  setSpeechState("loading");

  if (!simliInterviewerRef.current) {
    setSpeechState("idle");

    setError(
      "The live interviewer is not ready."
    );

    return;
  }

  try {
    console.log(
      "Sending question through Simli:",
      text
    );

    await simliInterviewerRef.current.speak(
      text
    );

    if (
      speechRequestIdRef.current !== requestId
    ) {
      return;
    }

    answerStartedAtRef.current =
      getSessionElapsedSeconds();

    setSpeechState("idle");
    prepareNextQuestion(currentIndex);
  } catch (simliError) {
    console.error(
      "SIMLI SPEECH FAILED:",
      simliError
    );

    if (
      speechRequestIdRef.current !== requestId
    ) {
      return;
    }

    setSpeechState("idle");

    setError(
      `Live interviewer speech failed: ${
        simliError?.message ||
        "Unknown Simli/TTS error"
      }`
    );
  }
}


  function updateSetup(event) {
    const { name, value } = event.target;
    setSetup((current) => ({
      ...current,
      [name]: name === "numberOfQuestions" ? Number(value) : value,
    }));
    setError("");
  }

  function startSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn(
      "Browser speech recognition is not supported."
    );

    setSpeechRecognitionSupported(false);
    setAnswerRecording(false);

    return;
  }

  // Stop any previous recognizer without
  // allowing it to restart.
  shouldRecognitionRunRef.current =
    false;

  if (speechRecognitionRef.current) {
    try {
      speechRecognitionRef.current.abort();
    } catch {
      // Ignore already-stopped recognizer.
    }

    speechRecognitionRef.current =
      null;
  }

  // This new recognizer may now run/restart.
  shouldRecognitionRunRef.current =
    true;

  finalTranscriptRef.current = "";
  setLiveTranscript("");

  const recognition =
    new SpeechRecognition();

  recognition.lang = "en-US";

  recognition.continuous = true;

  recognition.interimResults = true;

  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    console.log(
      "Browser transcription started"
    );
  };

  recognition.onresult = (event) => {
    let interimText = "";
    let finalText =
      finalTranscriptRef.current;

    for (
      let index = event.resultIndex;
      index < event.results.length;
      index++
    ) {
      const result =
        event.results[index];

      const text =
        result[0]?.transcript || "";

      if (result.isFinal) {
        finalText +=
          `${text.trim()} `;
      } else {
        interimText +=
          `${text.trim()} `;
      }
    }

    finalTranscriptRef.current =
      finalText.trim();

    const combined =
      `${finalTranscriptRef.current} ${interimText}`
        .trim();

    setLiveTranscript(combined);
  };

  recognition.onerror = (event) => {
    if (event.error === "no-speech" || event.error === "aborted") {
      return;
    }

    console.warn("Speech recognition warning:", event.error);
    setError(
      "Live transcription had a problem, but your interview recording is still active."
    );
  };

  recognition.onend = () => {
  console.log(
    "Browser transcription stopped"
  );

  if (
    shouldRecognitionRunRef.current
  ) {
    setTimeout(() => {
      if (
        !shouldRecognitionRunRef.current
      ) {
        return;
      }

      try {
        recognition.start();
      } catch (error) {
        console.warn(
          "Recognition restart skipped:",
          error
        );
      }
    }, 250);
  }
};

  speechRecognitionRef.current =
    recognition;

  try {
    recognition.start();
  } catch (error) {
    console.error(
      "Unable to start browser transcription:",
      error
    );
  }
}

async function stopSpeechRecognition() {
  shouldRecognitionRunRef.current = false;

  const recognition =
    speechRecognitionRef.current;

  if (!recognition) {
    return finalTranscriptRef.current.trim();
  }

  return await new Promise((resolve) => {
    let finished = false;

    const finish = () => {
      if (finished) {
        return;
      }

      finished = true;

      speechRecognitionRef.current =
        null;

      resolve(
        finalTranscriptRef.current.trim()
      );
    };

    const previousOnEnd =
      recognition.onend;

    recognition.onend = (event) => {
      previousOnEnd?.(event);
      finish();
    };

    try {
      recognition.stop();
    } catch {
      finish();
    }

    // Prevent browser recognition from
    // blocking the UI indefinitely.
    setTimeout(
      finish,
      1200
    );
  });
}

  async function startInterview(event) {
  event.preventDefault();

  if (
    !setup.jobTitle.trim() ||
    !setup.companyName.trim() ||
    !setup.jobDescription.trim()
  ) {
    setError(
      "Add a job title, company, and short job description to continue."
    );
    return;
  }

  setLoading(true);
  setError("");

  try {
    const result =
      await generateInterviewQuestions({
        ...setup,

        jobTitle:
          setup.jobTitle.trim(),

        companyName:
          setup.companyName.trim(),

        jobDescription:
          setup.jobDescription.trim(),

        candidateSkills:
          setup.candidateSkills.trim(),

        candidateExperience:
          setup.candidateExperience.trim(),
      });

    if (
      !Array.isArray(result?.questions) ||
      !result.questions.length
    ) {
      throw new Error(
        "No interview questions were returned. Please try again."
      );
    }

    setAnswerRecording(false);

    // Preserve the job/company returned
    // by the backend.
    const nextSetup = {
      ...setup,

      jobTitle:
        result.jobTitle ||
        setup.jobTitle,

      companyName:
        result.companyName ||
        setup.companyName,
    };

    const firstQuestion =
      result.questions[0]?.question;

    const firstSpeechText =
      firstQuestion
        ? `Hi, welcome to your interview practice. Let's begin. Here is your first question. ${firstQuestion}`
        : null;

    // Start the user's camera/microphone.
    await startInterviewSession();

    setSetup(nextSetup);

    clearCachedInterviewResult();

    setQuestions(
      result.questions
    );

    setSessionId(
      result.sessionId
    );

    setAnswers([]);

    setCurrentIndex(0);

    setPhase("interview");

    persistSession({
      setup: nextSetup,

      sessionId:
        result.sessionId,

      questions:
        result.questions,

      answers: [],

      currentIndex: 0,

      draftAnswer: "",

      feedback: null,

      phase: "interview",
    });

    // Wait briefly for SimliInterviewer to mount.
    if (firstSpeechText) {
      setTimeout(() => {
        playCoachAudio(
          firstSpeechText
        );
      }, 350);
    }
  } catch (requestError) {
    console.error(
      "Unable to start interview:",
      requestError
    );

    setError(
      requestError?.message ||
      "Unable to start the interview."
    );
  } finally {
    setLoading(false);
  }
}


  function prepareNextQuestion(index) {
  const nextQuestion =
    questions[index + 1]?.question;

  if (
    !nextQuestion ||
    !simliInterviewerRef.current
  ) {
    return;
  }

  const text =
    `Question ${index + 2}. ${nextQuestion}`;

  simliInterviewerRef.current
    .prepare(text)
    .catch((error) => {
      console.warn(
        "Next question preload failed:",
        error
      );
    });
}

  

  async function finishInterview(
  finalAnswers,
  finalQuestionTimings
) {
  setLoading(true);
setError("");
setPhase("processing");

setProcessingStage("recording");
setProcessingCurrent(0);
setProcessingTotal(finalAnswers.length);

try {
    // Stop recording and wait until the
    // complete WebM blob has been created.
    setPhase("processing");
    const videoBlob =
      await endInterviewSession();

    if (!videoBlob?.size) {
      throw new Error(
        "The interview recording could not be created."
      );
    }
    
    setProcessingStage("uploading");
    // Upload the complete interview video together with all question timings.
    const uploadResult = await uploadInterviewVideoSession({
      sessionId,
      jobTitle: setup.jobTitle,
      companyName: setup.companyName,
      jobDescription: setup.jobDescription,
      videoBlob,
      questionTimings: finalQuestionTimings,
    });

    console.log("Full interview video uploaded:", uploadResult);


setProcessingStage("evaluating");
setProcessingCurrent(0);

const answersWithTranscripts =
  finalAnswers;

  console.log(
  "Evaluating transcribed answers..."
);

const evaluatedResults = [];

for (
  let index = 0;
  index < answersWithTranscripts.length;
  index++
) {

  setProcessingCurrent(index + 1);
  const item =
    answersWithTranscripts[index];

  const transcript =
    item.transcript?.trim();

  if (!transcript) {
    evaluatedResults.push({
      ...item,
      feedback: {
        score: 0,
        overallAssessment:
          "No spoken answer was captured.",
        strengths: [],
        improvements: [
          "Provide a spoken response to this question.",
        ],
        improvedAnswer: "",
        deliveryTip:
          "Take a moment to organise your thoughts before answering.",
      },
    });

    continue;
  }

  console.log(
    `Evaluating answer ${index + 1}...`
  );

  const evaluation =
    await evaluateInterviewAnswer({
      sessionId,

      questionId:
        item.question.id,

      jobTitle:
        setup.jobTitle,

      companyName:
        setup.companyName,

      jobDescription:
        setup.jobDescription,

      question:
        item.question.question,

      candidateAnswer:
        transcript,
    });

  evaluatedResults.push({
    ...item,
    feedback:
      evaluation,
  });
}

setProcessingStage("finalizing");
setProcessingCurrent(
  finalAnswers.length
);

console.log(
  "Evaluated interview answers:",
  evaluatedResults
);

console.log(
  "Merged interview answers:",
  answersWithTranscripts
);

    // Keep existing completion call for now.
    const completion =
      await completeInterview(
        sessionId
      );

    const scoredAnswers =
  evaluatedResults.filter(
    (item) =>
      Number.isFinite(
        Number(
          item.feedback?.score
        )
      )
  );

const calculatedAverage =
  scoredAnswers.length
    ? Math.round(
        scoredAnswers.reduce(
          (sum, item) =>
            sum +
            Number(
              item.feedback.score
            ),
          0
        ) /
          scoredAnswers.length
      )
    : 0;

    const finalResult = {
        ...completion,

        completed: true,

        score:
          calculatedAverage,

        role:
          setup.jobTitle,

        company:
          setup.companyName,

        message:
          `${setup.jobTitle} interview completed`,

        feedback:
          `Final evaluation based on all ${evaluatedResults.length} interview questions.`,

        answers:
          evaluatedResults,

        videoUploaded:
          true,
      };

    cacheCompletedInterview(
      finalResult
    );

    persistSession({
        setup,
        sessionId,
        questions,

        answers:
          evaluatedResults,

        currentIndex:
          questions.length - 1,

        draftAnswer: "",

        feedback: null,

        phase: "complete",
      });

      setAnswers(
        evaluatedResults
      );


      setProcessingStage("complete");
    setPhase("complete");
  } catch (requestError) {
    console.error(
      "Interview completion error:",
      requestError
    );

    setError(
      requestError.message ||
        "Unable to complete the interview."
    );
  } finally {
    setLoading(false);
  }
}

  async function submitSpokenAnswer() {
  if (
    interviewerSpeaking ||
    !microphoneEnabled
  ) {
    return;
  }

  setLoading(true);
  setError("");

  try {
    const browserTranscript =
    await stopSpeechRecognition();

  setAnswerRecording(false);

  console.log(
    "Browser transcript:",
    browserTranscript
  );

  if (!browserTranscript.trim()) {
    throw new Error(
      "No speech was detected. Please answer the question aloud before continuing."
    );
  }

    const answerEndedAt =
      getSessionElapsedSeconds();

    const answerStartedAt =
      answerStartedAtRef.current ??
      answerEndedAt;

    const questionTiming = {
      questionId:
        currentQuestion.id,

      questionNumber:
        currentIndex + 1,

      question:
        currentQuestion.question,

      questionStartedAt:
        questionStartedAtRef.current ??
        0,

      answerStartedAt,

      answerEndedAt,

      duration:
        Number(
          (
            answerEndedAt -
            answerStartedAt
          ).toFixed(2)
        ),
    };

    const finalQuestionTimings = [
      ...questionTimings,
      questionTiming,
    ];

    setQuestionTimings(
      finalQuestionTimings
    );

    answerStartedAtRef.current =
      null;

    questionStartedAtRef.current =
      null;
// Store the question and browser-generated
// transcript locally. Evaluation is added
// after the interview finishes.
    const completedAnswer = {
      question: currentQuestion,

      transcript:  browserTranscript,

      feedback: null,

      timing: questionTiming,

    };


    


    const updatedAnswers = [
      ...answers,
      completedAnswer,
    ];

    setAnswers(
      updatedAnswers
    );

    if (
      currentIndex + 1 >=
      questions.length
    ) {
      await finishInterview(
        updatedAnswers,
        finalQuestionTimings
      );

      return;
    }

    goToQuestion(
      currentIndex + 1
    );
  } catch (requestError) {
    setError(
      requestError.message ||
      "Unable to continue the interview."
    );
  } finally {
    setLoading(false);
  }
}

  function goToQuestion(index) {
  stopCoachAudio();

  setCurrentIndex(index);
  setAnswer("");
  setFeedback(null);
  setError("");

  setAnswerRecording(false);

  answerStartedAtRef.current = null;
  questionStartedAtRef.current = null;

  finalTranscriptRef.current = "";
  setLiveTranscript("");

  const nextQuestion =
    questions[index]?.question;

  if (nextQuestion) {
    setTimeout(() => {
      playCoachAudio(
        `Question ${index + 1}. ${nextQuestion}`
      );
    }, 150);
  }
}




async function cancelInterview() {
  await endInterviewSession();

  stopCoachAudio();

  persistSession(null);

  setQuestions([]);
  setSessionId(null);
  setAnswers([]);
  setQuestionTimings([]);

  setCurrentIndex(0);
  setAnswer("");
  setFeedback(null);
  setError("");

  setAnswerRecording(false);

  shouldRecognitionRunRef.current = false;

  if (speechRecognitionRef.current) {
    try {
      speechRecognitionRef.current.abort();
    } catch {
      // Ignore.
    }

    speechRecognitionRef.current = null;
  }

finalTranscriptRef.current = "";
setLiveTranscript("");

  sessionStartedAtRef.current = null;

  questionStartedAtRef.current = null;

  answerStartedAtRef.current = null;

  setPhase("setup");
}

  async function resetInterview() {
  await endInterviewSession();
  stopCoachAudio();

  persistSession(null);

  setSetup(EMPTY_SETUP);
  setQuestions([]);
  setSessionId(null);
  setAnswers([]);
  setQuestionTimings([]);

  setCurrentIndex(0);
  setAnswer("");
  setFeedback(null);
  setError("");

  sessionStartedAtRef.current = null;
  questionStartedAtRef.current = null;
  answerStartedAtRef.current = null;

  setAnswerRecording(false);

  shouldRecognitionRunRef.current = false;

  if (speechRecognitionRef.current) {
    try {
      speechRecognitionRef.current.abort();
    } catch {
      // Ignore.
    }

    speechRecognitionRef.current = null;
  }

  setRecordedSessionBlob(null);

  if (recordedSessionUrl) {
    URL.revokeObjectURL(
      recordedSessionUrl
    );
  }

  setRecordedSessionUrl("");

  setPhase("setup");
}

  function renderSetup() {
    return (
      <div className="coach-setup-grid">
        <section className="coach-intro-panel">
          <span className="coach-eyebrow"><Sparkles size={15} /> AI interview coach</span>
          <h2>Practice for the role you actually want.</h2>
          <p>Complete a realistic interview session and receive detailed feedback when you finish.</p>
          <div className="coach-feature-list">
            <div><Target /><span><strong>Role-specific practice</strong>Questions shaped around the job and company.</span></div>
            <div><MessageSquareText /><span><strong>End-of-session feedback</strong>Review every answer together with your final interview score.</span></div>
            <div><Trophy /><span><strong>Track your score</strong>Finish with a clear session summary.</span></div>
          </div>
        </section>

        <form className="coach-setup-card" onSubmit={startInterview}>
          <div className="coach-card-heading"><div><span>Set up your session</span><h2>Tell us about the opportunity</h2></div><BriefcaseBusiness /></div>
          <div className="coach-form-grid">
            <label>Job title *<input name="jobTitle" value={setup.jobTitle} onChange={updateSetup} placeholder="e.g. DevOps Engineer" /></label>
            <label>Company *<input name="companyName" value={setup.companyName} onChange={updateSetup} placeholder="e.g. Google" /></label>
            <label className="coach-wide">Job description *<textarea name="jobDescription" value={setup.jobDescription} onChange={updateSetup} placeholder="Paste the key responsibilities or describe the role..." rows="4" /></label>
            <label>Key skills<input name="candidateSkills" value={setup.candidateSkills} onChange={updateSetup} placeholder="Python, React, CI/CD" /></label>
            <label>Experience<input name="candidateExperience" value={setup.candidateExperience} onChange={updateSetup} placeholder="e.g. 4 years in DevOps" /></label>
            <label className="coach-wide">Number of questions<select name="numberOfQuestions" value={setup.numberOfQuestions} onChange={updateSetup}><option value="5">5 questions · Quick practice</option><option value="10">10 questions · Full interview</option></select></label>
          </div>
          {error && <p className="coach-error" role="alert"><CircleAlert size={16} />{error}</p>}
          <button
            className="coach-primary-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle
                  className="coach-spinner"
                />

                Preparing your interview...
              </>
            ) : (
              <>
                Generate my interview
                <ArrowRight size={17} />
              </>
            )}
          </button>          
        </form>
      </div>
    );
  }

  function renderFeedback() {
    return (
      <aside className="coach-feedback" aria-live="polite">
        <div className="coach-feedback-summary"><ScoreRing score={feedback.score} /><div><span className="coach-eyebrow"><CheckCircle2 size={14} /> Answer reviewed</span><h2>{feedback.overallAssessment}</h2></div></div>
        <div className="coach-feedback-grid">
          <div className="coach-feedback-card coach-strengths"><h3><CheckCircle2 /> What worked</h3><ul>{(feedback.strengths || []).map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className="coach-feedback-card coach-improvements"><h3><Target /> Make it stronger</h3><ul>{(feedback.improvements || []).map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
        {feedback.improvedAnswer && <div className="coach-model-answer"><h3><Sparkles /> A stronger answer</h3><p>{feedback.improvedAnswer}</p></div>}
        {feedback.deliveryTip && <div className="coach-delivery-tip"><Lightbulb /><div><strong>Delivery tip</strong><p>{feedback.deliveryTip}</p></div></div>}
      </aside>
    );
  }

  function renderInterview() {
    const progress = ((currentIndex + 1) / questions.length) * 100;
    return (
      <div className="coach-session">
        <div className="coach-session-topbar">
          {sessionRecording && (
  <div className="coach-session-recording">

    <span className="coach-recording-dot" />

    <span>
      Interview recording
    </span>

    <strong>
      {formatVideoTime(
        sessionRecordingSeconds
      )}
    </strong>

  </div>
)}
          <button className="coach-text-button" onClick={cancelInterview}><ArrowLeft />End session</button>
          <div className="coach-session-role"><strong>{setup.jobTitle}</strong><span>{setup.companyName}</span></div>
          <span className="coach-progress-label">{currentIndex + 1} of {questions.length}</span>
        </div>
        <div className="coach-progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="coach-interview-workspace">
          <section className="coach-question-card">
          <div className="coach-interview-room">

  {/* AI INTERVIEWER */}
  <div className="coach-person-panel">

    <div className={`coach-avatar-frame ${interviewerSpeaking ? "coach-avatar-speaking" : ""}`}>
      <SimliInterviewer
        ref={simliInterviewerRef}
        onSpeakingChange={(speaking) => {
          setSpeechState(speaking ? "playing" : "idle");
        }}
        onAvailabilityChange={(available) => {
          setSimliAvailable(available);
          if (available) setVoiceMode("simli");
        }}
      />
    </div>

    <div className="coach-person-details">

      <strong>
        DWUMA Interviewer
      </strong>

      <span
        className={
          interviewerSpeaking
            ? "coach-person-status active"
            : ""
        }
      >
        {interviewerSpeaking
          ? "Speaking..."
          : interviewerPreparing
            ? "Preparing response..."
            : simliAvailable
              ? "Listening"
              : "Ready"}
      </span>

    </div>

  </div>


  {/* CANDIDATE */}
  <div className="coach-person-panel">

    <div className="coach-candidate-frame">

      {cameraEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="coach-camera-video"
        />
      ) : (
        <div className="coach-camera-placeholder">

          <LoaderCircle
            className="coach-spinner"
            size={30}
          />

          <span>
            Starting camera...
          </span>

        </div>
      )}

      {sessionRecording && (
        <div className="coach-live-badge">
          <span />
          REC
        </div>
      )}

    </div>

    <div className="coach-person-details">

      <strong>
        You
      </strong>

      <span>
        {interviewerActive
          ? "Interviewer speaking"
          : microphoneEnabled
            ? "Microphone on"
            : "Microphone unavailable"}
      </span>

    </div>

  </div>

</div>
            <div className="coach-question-meta"><span className={`coach-category coach-category-${currentQuestion.category}`}>{currentQuestion.category || "general"}</span><span>{currentQuestion.difficulty || "practice"}</span></div>
            <p className="coach-question-number">Question {currentIndex + 1}</p>
            <h2>{currentQuestion.question}</h2>
            <div className="coach-voice-controls" aria-label="Interview voice controls">
              {voiceMode === "browser" && speechState === "playing" ? (
                <button type="button" className="coach-voice-button" onClick={pauseCoachAudio}>
                  <Pause />Pause coach
                </button>
              ) : voiceMode === "browser" && speechState === "paused" ? (
                <button type="button" className="coach-voice-button" onClick={resumeCoachAudio}>
                  <Play />Resume coach
                </button>
              ) : speechState === "idle" ? (
                <button type="button" className="coach-voice-button" onClick={() => playCoachAudio(currentQuestion.question)}>
                  <Volume2 />Read question aloud
                </button>
              ) : null}

              {(speechState === "playing" || speechState === "paused" || speechState === "loading") && (
                <button type="button" className="coach-voice-button coach-voice-stop" onClick={stopCoachAudio}>
                  <VolumeX />Stop
                </button>
              )}
            </div>
            {currentQuestion.whatInterviewerLooksFor && <details><summary><Lightbulb size={15} />What the interviewer is looking for</summary><p>{currentQuestion.whatInterviewerLooksFor}</p></details>}
            <div className="coach-spoken-answer">

              <div className="coach-spoken-answer-status">

                <span
                  className={
                    microphoneEnabled
                      ? "coach-mic-status active"
                      : "coach-mic-status"
                  }
                />

                <div>
                  <strong>
                    {answerRecording
                      ? "Your answer is being recorded"
                      : interviewerSpeaking
                        ? "Waiting for interviewer..."
                        : microphoneEnabled
                          ? "Preparing microphone..."
                          : "Microphone unavailable"}
                  </strong>

                  <p>
                    Answer the question aloud, then continue when you are finished.
                  </p>
                  {liveTranscript && (
                    <div className="coach-live-transcript">
                      <span>Live transcript</span>

                      <p>
                        {liveTranscript}
                      </p>
                    </div>
                  )}
                </div>

              </div>

              {error && (
                <p
                  className="coach-error"
                  role="alert"
                >
                  <CircleAlert size={16} />
                  {error}
                </p>
              )}

              {!speechRecognitionSupported && (
                <p
                  className="coach-error"
                  role="alert"
                >
                  <CircleAlert size={16} />
                  Live transcription is not supported
                  in this browser. Please use Chrome
                  or Microsoft Edge.
                </p>
              )}

              <button
                type="button"
                className="coach-primary-button"
                disabled={
                  loading ||
                  interviewerSpeaking ||
                  !microphoneEnabled ||
                  !speechRecognitionSupported
                }
                onClick={submitSpokenAnswer}
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      className="coach-spinner"
                      size={17}
                    />
                    Processing...
                  </>
                ) : currentIndex + 1 ===
                    questions.length ? (
                  <>
                    Finish Interview
                    <Trophy size={17} />
                  </>
                ) : (
                  <>
                    Finish Answer
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

            </div>
          </section>
        </div>
        <nav className="coach-question-navigation" aria-label="Interview question navigation">
        <div className="coach-question-dots">

          {questions.map(
            (question, index) => (
              <span
                key={
                  question.number ||
                  index
                }
                className={
                  index === currentIndex
                    ? "coach-dot-active"
                    : index < currentIndex
                      ? "coach-dot-complete"
                      : ""
                }
              >
                {index + 1}
              </span>
            )
          )}

        </div>          
        </nav>
      </div>
    );
    
  }

  function renderProcessing() {
  const stageText = {
  recording:
    "Finishing your interview recording...",

  uploading:
    "Uploading your interview recording...",

  evaluating:
    `Evaluating answer ${processingCurrent} of ${processingTotal}...`,

  finalizing:
    "Preparing your final interview report...",

  complete:
    "Your results are ready.",
};

  const progress =
    processingTotal > 0
      ? Math.round(
          (
            processingCurrent /
            processingTotal
          ) * 100
        )
      : 0;

  return (
    <section className="coach-processing">
      <LoaderCircle
        className="coach-spinner coach-processing-spinner"
        size={42}
      />

      <span className="coach-eyebrow">
        Interview complete
      </span>

      <h2>
        Preparing your interview results...
      </h2>

      <p>
        {stageText[processingStage] ||
          "Processing your interview..."}
      </p>

      {processingStage === "evaluating" && (
        <div className="coach-processing-progress">
          <div className="coach-processing-progress-track">
            <span
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <strong>
            {progress}%
          </strong>
        </div>
      )}

      <div className="coach-processing-steps">
        <div
          className={
            processingStage !== "recording"
              ? "active"
              : ""
          }
        >
          <CheckCircle2 size={18} />
          <span>
            Interview recorded
          </span>
        </div>

        <div
          className={
            [
              "uploading",
              "evaluating",
              "finalizing",
              "complete",
            ].includes(processingStage)
              ? "active"
              : ""
          }
        >
          {processingStage ===
          "uploading" ? (
            <LoaderCircle
              className="coach-spinner"
              size={18}
            />
          ) : (
            <CheckCircle2 size={18} />
          )}

          <span>
            Recording uploaded
          </span>
        </div>

        <div
          className={
            [
              "evaluating",
              "finalizing",
              "complete",
            ].includes(processingStage)
              ? "active"
              : ""
          }
        >
          {processingStage ===
          "evaluating" ? (
            <LoaderCircle
              className="coach-spinner"
              size={18}
            />
          ) : (
            <CheckCircle2 size={18} />
          )}

          <span>
            Answers evaluated
          </span>
        </div>

        <div
          className={
            [
              "finalizing",
              "complete",
            ].includes(processingStage)
              ? "active"
              : ""
          }
        >
          {processingStage ===
          "finalizing" ? (
            <LoaderCircle
              className="coach-spinner"
              size={18}
            />
          ) : (
            <CheckCircle2 size={18} />
          )}

          <span>
            Final report
          </span>
        </div>
      </div>

      <p className="coach-processing-note">
        Keep this page open while processing finishes.
      </p>
    </section>
  );
}

  function renderComplete() {
  const scoredAnswers = answers.filter((item) => item.feedback?.score != null);
  const totalSeconds = Math.max(
    sessionRecordingSeconds,
    ...questionTimings.map((timing) => Number(timing?.endSeconds) || 0),
    0
  );
  const scoreTone = (score) => {
    if (score == null) return "neutral";
    if (Number(score) >= 75) return "high";
    if (Number(score) >= 50) return "medium";
    return "low";
  };
  const shareResults = async () => {
    const text = `I scored ${averageScore}/100 in my ${setup.jobTitle || "job"} practice interview on DWUMA.`;
    if (navigator.share) {
      await navigator.share({ title: "DWUMA Interview Coach results", text });
      return;
    }
    await navigator.clipboard?.writeText(text);
  };

  return (
    <section className="coach-complete">
      <div className="coach-results-hero">
        <div className="coach-results-intro">
          <div className="coach-results-icon"><Trophy /></div>
          <div>
            <span className="coach-eyebrow">Session complete</span>
            <h2>You finished your {setup.jobTitle || "role"} practice interview.</h2>
            <p>Great job! Review your interview recording and results below.</p>
          </div>
        </div>

        <div className="coach-results-scoreboard">
          <ScoreRing score={averageScore} label="out of 100" />
          <div className="coach-average-score">
            <span>Average score</span>
            <strong>{averageScore}<small>/100</small></strong>
            <p>{averageScore >= 75 ? "Excellent work—keep building on your strengths." : averageScore >= 50 ? "Good progress. Review your feedback to improve." : "Keep practising to improve your performance!"}</p>
          </div>
          <div className="coach-results-stats">
            <div><CheckCircle2 /><span><strong>{answers.length}</strong>Questions answered</span></div>
            <div><Trophy /><span><strong>{scoredAnswers.length ? Math.round(averageScore / 10) : 0}</strong>Score out of 10</span></div>
            <div><Clock3 /><span><strong>{formatVideoTime(Math.round(totalSeconds))}</strong>Total time</span></div>
          </div>
        </div>
      </div>

      <div className="coach-results-grid">
        <div className="coach-results-left">
          <section className="coach-recording-panel">
            <h3><span><BriefcaseBusiness /></span>Your recorded interview</h3>
            {recordedSessionUrl ? (
              <>
                <video src={recordedSessionUrl} controls playsInline className="coach-recorded-video-player" />
                <div className="coach-recording-meta">
                  <a href={recordedSessionUrl} download={`dwuma-${setup.jobTitle || "interview"}-recording.webm`}><Download />Download recording</a>
                  <span>Duration {formatVideoTime(Math.round(totalSeconds))}</span>
                </div>
              </>
            ) : (
              <p className="coach-no-recording">No interview recording is available for this session.</p>
            )}
          </section>

          <div className="coach-results-actions">
            <button type="button" className="coach-primary-button" onClick={resetInterview}><RotateCcw />Start a new interview</button>
            <button type="button" className="coach-share-button" onClick={shareResults}><Share2 />Share results</button>
          </div>
        </div>

        <div className="coach-results-right">
          <section className="coach-summary-panel">
            <div className="coach-summary-title"><h3><span><CheckCircle2 /></span>Question summary</h3><span>{answers.length} answered</span></div>
            <div className="coach-results-list">
              {answers.map((item, index) => (
                <details key={`${item.question.number}-${index}`} className="coach-result-card">
                  <summary className="coach-result-summary">
                    <span className="coach-result-number">{index + 1}</span>
                    <div className="coach-result-heading">
                      <p className="coach-result-question">{item.question.question}</p>
                      <span className="coach-result-hint"><Eye />View answer</span>
                    </div>
                    <strong className={`coach-result-score ${scoreTone(item.feedback?.score)}`}>
                      {item.feedback?.score != null ? `${item.feedback.score}/100` : "—"}
                    </strong>
                  </summary>

                  <div className="coach-result-details">
        <section className="coach-result-section coach-result-answer">
          <h4><span className="coach-detail-icon"><FileText /></span>Your answer</h4>

          {item.transcript ? (
            <p>{item.transcript}</p>
          ) : (
            <p className="coach-no-transcript">
              No transcript was captured for this answer.
            </p>
          )}
        </section>

        {item.feedback && (
          <>
            {item.feedback.overallAssessment && (
              <section className="coach-result-section coach-result-assessment">
                <h4><span className="coach-detail-icon"><FileText /></span>Assessment</h4>

                <p>
                  {item.feedback.overallAssessment}
                </p>
              </section>
            )}

            <div className="coach-feedback-grid">
              <section className="coach-result-section coach-result-strengths">
                <h4>
                  <span className="coach-detail-icon"><Check /></span>
                  What worked
                </h4>

                {item.feedback.strengths?.length ? (
                  <ul>
                    {item.feedback.strengths.map(
                      (strength, strengthIndex) => (
                        <li
                          key={`${index}-strength-${strengthIndex}`}
                        >
                          <Check />
                          {strength}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p>
                    No specific strengths were identified.
                  </p>
                )}
              </section>

              <section className="coach-result-section coach-result-improvements">
                <h4>
                  <span className="coach-detail-icon"><FileText /></span>
                  What to improve
                </h4>

                {item.feedback.improvements?.length ? (
                  <ul>
                    {item.feedback.improvements.map(
                      (
                        improvement,
                        improvementIndex
                      ) => (
                        <li
                          key={`${index}-improvement-${improvementIndex}`}
                        >
                          <Check />
                          {improvement}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p>
                    No specific improvements were identified.
                  </p>
                )}
              </section>
            </div>

            {item.feedback.improvedAnswer && (
              <section className={`coach-result-section coach-model-answer ${expandedExamples[index] ? "expanded" : ""}`}>
                <h4>
                  <span className="coach-detail-icon"><FileText /></span>
                  Stronger answer example
                </h4>

                <p>
                  {item.feedback.improvedAnswer}
                </p>
                <button
                  type="button"
                  aria-expanded={Boolean(expandedExamples[index])}
                  onClick={() => setExpandedExamples((current) => ({
                    ...current,
                    [index]: !current[index],
                  }))}
                >
                  {expandedExamples[index] ? "Hide full example" : "View full example"}
                  <ChevronRight />
                </button>
              </section>
            )}

            {item.feedback.deliveryTip && (
              <section className="coach-result-section coach-delivery-tip">
                <span className="coach-detail-icon"><UserRound /></span>

                <div>
                  <h4>Delivery tip</h4>

                  <p>
                    {item.feedback.deliveryTip}
                  </p>
                </div>
              </section>
            )}
          </>
        )}
                  </div>
                </details>
              ))}
            </div>
          </section>
          <div className="coach-results-tip"><Lightbulb /><p><strong>Tip:</strong> Review your answers and feedback to identify areas to improve.<br />Practise regularly to boost your score!</p></div>
        </div>
      </div>
    </section>
  );
}

  return <DashboardLayout pageTitle="Interview Coach"><div className="coach-page"><header className="coach-page-header"><div><span className="coach-eyebrow"><Sparkles size={14} />Personalised practice</span><h1>Interview Coach</h1><p>Build confidence with questions tailored to your next opportunity.</p></div>{phase === "interview" && (
  <div className="coach-header-stat">
    <strong>{completedCount}</strong>
    <span>answers completed</span>
  </div>
)}</header>{phase === "setup"? renderSetup() : phase === "processing" ? renderProcessing(): phase === "complete" ? renderComplete() : renderInterview()}</div></DashboardLayout>;

}
export default InterviewCoach;


