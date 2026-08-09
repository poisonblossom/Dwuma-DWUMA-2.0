import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Target,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";

import DashboardLayout from "../Components/dashboard/DashboardLayout";
import {
  evaluateInterviewAnswer,
  generateInterviewQuestions,
  completeInterview,
  cacheCompletedInterview,
  clearCachedInterviewResult,
} from "../Components/services/interviewService";
import {
  evaluateVoiceInterviewAnswer,
} from "../Components/services/audioService";
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

function getAvailableUsername() {
  try {
    const user = JSON.parse(
      localStorage.getItem("dwumaUser") ||
        sessionStorage.getItem("dwumaUser") ||
        "{}",
    );
    const value =
      user.username || user.fullName || user.name || user.firstName || "";
    return String(value).trim().split(/\s+/)[0] || "there";
  } catch {
    return "there";
  }
}

function ScoreRing({ score, label = "Answer score" }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="coach-score-ring" style={{ "--score": `${safeScore * 3.6}deg` }}>
      <div><strong>{safeScore}</strong><span>{label}</span></div>
    </div>
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
  const [recordingState, setRecordingState] = useState("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechState, setSpeechState] = useState("idle");
  const mediaRecorderRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const discardRecordingRef = useRef(false);
  const recordingTimerRef = useRef(null);
  const utteranceRef = useRef(null);
  const transcriptionRequestRef = useRef(null);

  const currentQuestion = questions[currentIndex];
  const completedCount = answers.length;
  const averageScore = completedCount
    ? Math.round(answers.reduce((sum, item) => sum + Number(item.feedback.score || 0), 0) / completedCount)
    : 0;

  useEffect(() => {
    if (!questions.length || phase === "setup") return;
    persistSession({
      setup,
      sessionId,
      questions,
      answers,
      currentIndex,
      draftAnswer: answer,
      feedback,
      phase,
    });
  }, [setup, sessionId, questions, answers, currentIndex, answer, feedback, phase]);

  useEffect(() => () => {
    clearInterval(recordingTimerRef.current);
    transcriptionRequestRef.current?.abort();
    window.speechSynthesis?.cancel();
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function stopCoachAudio() {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setSpeechState("idle");
  }

  function pauseCoachAudio() {
    if (!window.speechSynthesis || speechState !== "playing") return;
    window.speechSynthesis.pause();
    setSpeechState("paused");
  }

  function resumeCoachAudio() {
    if (!window.speechSynthesis || speechState !== "paused") return;
    window.speechSynthesis.resume();
    setSpeechState("playing");
  }

  function playCoachAudio(text) {
    stopCoachAudio();
    setError("");
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setError("Spoken questions are not supported by this browser.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
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
    window.speechSynthesis.speak(utterance);
    setSpeechState("playing");
  }

  function releaseMicrophone() {
    clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
    mediaRecorderRef.current = null;
  }

  async function startRecording() {
    if (feedback || recordingState === "transcribing") return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Audio recording is not supported by this browser. You can still type your answer.");
      return;
    }
    stopCoachAudio();
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      discardRecordingRef.current = false;
      microphoneStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", async () => {
        const recordingType = (recorder.mimeType || "audio/webm")
          .split(";", 1)[0]
          .trim()
          .toLowerCase();
        const audioBlob = new Blob(recordingChunksRef.current, {
          type: recordingType,
        });
        recordingChunksRef.current = [];
        releaseMicrophone();
        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          return;
        }
        if (!audioBlob.size) {
          setRecordingState("idle");
          setError("No audio was recorded. Please try again.");
          return;
        }
        setRecordingState("transcribing");
        const controller = new AbortController();
        transcriptionRequestRef.current = controller;
        try {
          const result = await evaluateVoiceInterviewAnswer({
            sessionId,
            questionId: currentQuestion.id,
            jobTitle: setup.jobTitle,
            companyName: setup.companyName,
            jobDescription: setup.jobDescription,
            question: currentQuestion.question,
            audioBlob,
          }, { signal: controller.signal });
          if (!controller.signal.aborted) {
            setAnswer(result.transcription.slice(0, MAX_ANSWER_LENGTH));
            setFeedback(result.feedback);
            setAnswers((current) => [...current, {
              question: currentQuestion,
              answer: result.transcription,
              feedback: result.feedback,
            }]);
            setRecordingState("ready");
          }
        } catch (requestError) {
          if (requestError.name !== "AbortError") {
            setRecordingState("error");
            setError(requestError.message);
          }
        } finally {
          if (transcriptionRequestRef.current === controller) {
            transcriptionRequestRef.current = null;
          }
        }
      }, { once: true });
      recorder.start();
      setRecordingSeconds(0);
      setRecordingState("recording");
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((seconds) => {
          const next = seconds + 1;
          if (next >= MAX_RECORDING_SECONDS && recorder.state === "recording") {
            recorder.stop();
          }
          return next;
        });
      }, 1000);
    } catch (requestError) {
      releaseMicrophone();
      setRecordingState("error");
      setError(
        requestError.name === "NotAllowedError"
          ? "Microphone access was denied. You can allow it in your browser settings or type your answer."
          : "The microphone could not be started. Please try again or type your answer.",
      );
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }

  function clearVoiceActivity() {
    stopCoachAudio();
    transcriptionRequestRef.current?.abort();
    transcriptionRequestRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") {
      discardRecordingRef.current = true;
      mediaRecorderRef.current.stop();
    }
    releaseMicrophone();
    recordingChunksRef.current = [];
    setRecordingSeconds(0);
    setRecordingState("idle");
  }

  function formatRecordingTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function updateSetup(event) {
    const { name, value } = event.target;
    setSetup((current) => ({
      ...current,
      [name]: name === "numberOfQuestions" ? Number(value) : value,
    }));
    setError("");
  }

  async function startInterview(event) {
    event.preventDefault();
    if (!setup.jobTitle.trim() || !setup.companyName.trim() || !setup.jobDescription.trim()) {
      setError("Add a job title, company, and short job description to continue.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await generateInterviewQuestions({
        ...setup,
        jobTitle: setup.jobTitle.trim(),
        companyName: setup.companyName.trim(),
        jobDescription: setup.jobDescription.trim(),
        candidateSkills: setup.candidateSkills.trim(),
        candidateExperience: setup.candidateExperience.trim(),
      });
      if (!Array.isArray(result?.questions) || !result.questions.length) {
        throw new Error("No interview questions were returned. Please try again.");
      }
      const nextSetup = {
        ...setup,
        jobTitle: result.jobTitle || setup.jobTitle,
        companyName: result.companyName || setup.companyName,
      };
      setSetup(nextSetup);
      clearCachedInterviewResult();
      setQuestions(result.questions);
      setSessionId(result.sessionId);
      setAnswers([]);
      setCurrentIndex(0);
      setPhase("interview");
      persistSession({
        setup: nextSetup,
        sessionId: result.sessionId,
        questions: result.questions,
        answers: [],
        currentIndex: 0,
        draftAnswer: "",
        feedback: null,
        phase: "interview",
      });
      const firstQuestion = result.questions[0]?.question;
      if (firstQuestion) {
        playCoachAudio(
          `Hi ${getAvailableUsername()}, welcome to your interview practice. Let's begin. Here is your first question. ${firstQuestion}`,
        );
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (feedback) return;
    const cleanAnswer = answer.trim();
    if (cleanAnswer.length < 10) {
      setError("Give your coach a little more detail before submitting.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await evaluateInterviewAnswer({
        sessionId,
        questionId: currentQuestion.id,
        jobTitle: setup.jobTitle,
        companyName: setup.companyName,
        jobDescription: setup.jobDescription,
        question: currentQuestion.question,
        candidateAnswer: cleanAnswer,
      });
      setFeedback(result);
      setAnswers((current) => [...current, {
        question: currentQuestion,
        answer: cleanAnswer,
        feedback: result,
      }]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function goToQuestion(index) {
    clearVoiceActivity();
    const reviewedAnswer = answers[index];
    setCurrentIndex(index);
    setAnswer(reviewedAnswer?.answer || "");
    setFeedback(reviewedAnswer?.feedback || null);
    setError("");
    const nextQuestion = questions[index]?.question;
    if (nextQuestion) {
      playCoachAudio(`Question ${index + 1}. ${nextQuestion}`);
    }
  }

  function previousQuestion() {
    if (currentIndex > 0) goToQuestion(currentIndex - 1);
  }

  function selectQuestion(event) {
    goToQuestion(Number(event.currentTarget.dataset.questionIndex));
  }

  async function nextQuestion() {
    if (currentIndex + 1 >= questions.length) {
      setLoading(true);
      setError("");
      try {
        const completion = await completeInterview(sessionId);
        const finalResult = {
          ...completion,
          completed: true,
          score: Number(completion?.score ?? averageScore),
          role: setup.jobTitle,
          company: setup.companyName,
          message: `${setup.jobTitle} interview completed`,
          feedback: `Final evaluation based on all ${answers.length} interview questions.`,
        };
        cacheCompletedInterview(finalResult);
        setPhase("complete");
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
      return;
    }
    goToQuestion(currentIndex + 1);
  }

  function resetInterview() {
    clearVoiceActivity();
    persistSession(null);
    setSetup(EMPTY_SETUP);
    setQuestions([]);
    setSessionId(null);
    setAnswers([]);
    setCurrentIndex(0);
    setAnswer("");
    setFeedback(null);
    setError("");
    setPhase("setup");
  }

  function renderSetup() {
    return (
      <div className="coach-setup-grid">
        <section className="coach-intro-panel">
          <span className="coach-eyebrow"><Sparkles size={15} /> AI interview coach</span>
          <h2>Practice for the role you actually want.</h2>
          <p>Get tailored questions and clear, practical feedback after every answer.</p>
          <div className="coach-feature-list">
            <div><Target /><span><strong>Role-specific practice</strong>Questions shaped around the job and company.</span></div>
            <div><MessageSquareText /><span><strong>Instant feedback</strong>See strengths, improvements, and a stronger answer.</span></div>
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
          <button className="coach-primary-button" disabled={loading}>{loading ? <><LoaderCircle className="coach-spinner" />Preparing your interview...</> : <>Generate my interview<ArrowRight size={17} /></>}</button>
          <p className="coach-privacy">Your active interview is saved only in this browser tab.</p>
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
    const progress = ((currentIndex + (feedback ? 1 : 0)) / questions.length) * 100;
    return (
      <div className="coach-session">
        <div className="coach-session-topbar">
          <button className="coach-text-button" onClick={resetInterview}><ArrowLeft />End session</button>
          <div className="coach-session-role"><strong>{setup.jobTitle}</strong><span>{setup.companyName}</span></div>
          <span className="coach-progress-label">{currentIndex + 1} of {questions.length}</span>
        </div>
        <div className="coach-progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="coach-interview-workspace">
          <section className="coach-question-card">
            <div className="coach-question-meta"><span className={`coach-category coach-category-${currentQuestion.category}`}>{currentQuestion.category || "general"}</span><span>{currentQuestion.difficulty || "practice"}</span></div>
            <p className="coach-question-number">Question {currentIndex + 1}</p>
            <h2>{currentQuestion.question}</h2>
            <div className="coach-voice-controls" aria-label="Interview voice controls">
              {speechState === "playing" ? (
                <button type="button" className="coach-voice-button" onClick={pauseCoachAudio}><Pause />Pause coach</button>
              ) : speechState === "paused" ? (
                <button type="button" className="coach-voice-button" onClick={resumeCoachAudio}><Play />Resume coach</button>
              ) : (
                <button type="button" className="coach-voice-button" onClick={() => playCoachAudio(currentQuestion.question)}>
                  <Volume2 />Read question aloud
                </button>
              )}
              {(speechState === "playing" || speechState === "paused") && <button type="button" className="coach-voice-button coach-voice-stop" onClick={stopCoachAudio}><VolumeX />Stop</button>}
            </div>
            {currentQuestion.whatInterviewerLooksFor && <details><summary><Lightbulb size={15} />What the interviewer is looking for</summary><p>{currentQuestion.whatInterviewerLooksFor}</p></details>}
            <form onSubmit={submitAnswer} className="coach-answer-form">
              <label htmlFor="interview-answer">{feedback ? "Your submitted answer" : "Your answer"}</label>
              {!feedback && <div className="coach-recording-controls">
                {recordingState === "recording" ? (
                  <button type="button" className="coach-record-button coach-recording-active" onClick={stopRecording}><Square />Stop recording <span>{formatRecordingTime(recordingSeconds)}</span></button>
                ) : (
                  <button type="button" className="coach-record-button" onClick={startRecording} disabled={recordingState === "transcribing"}>
                    {recordingState === "transcribing" ? <LoaderCircle className="coach-spinner" /> : <Mic />}{recordingState === "transcribing" ? "Transcribing and evaluating..." : recordingState === "ready" ? "Answer evaluated" : "Record answer"}
                  </button>
                )}
                <span>{recordingState === "ready" ? "Your transcription and feedback are ready." : "Voice input is optional."}</span>
              </div>}
              <textarea id="interview-answer" value={answer} onChange={(event) => { setAnswer(event.target.value); setError(""); }} maxLength={MAX_ANSWER_LENGTH} rows="8" placeholder="Structure your thinking, give a specific example, and explain the outcome..." autoFocus={!feedback} readOnly={Boolean(feedback)} />
              {!feedback && <div className="coach-answer-footer"><span>{answer.length.toLocaleString()} / {MAX_ANSWER_LENGTH.toLocaleString()}</span><button className="coach-primary-button" disabled={loading || answer.trim().length < 10}>{loading ? <><LoaderCircle className="coach-spinner" />Reviewing...</> : <>Get feedback<ArrowRight size={17} /></>}</button></div>}
              {error && <p className="coach-error" role="alert"><CircleAlert size={16} />{error}</p>}
            </form>
          </section>
          {feedback ? renderFeedback() : <aside className="coach-remarks-empty"><div><Sparkles /></div><span className="coach-eyebrow">AI remarks</span><h2>Your feedback will appear here</h2><p>Submit your answer to receive a score, focused coaching points, a stronger example, and a delivery tip.</p></aside>}
        </div>
        <nav className="coach-question-navigation" aria-label="Interview question navigation">
          <button className="coach-secondary-button" onClick={previousQuestion} disabled={currentIndex === 0}><ArrowLeft size={16} />Previous question</button>
          <div className="coach-question-dots">{questions.map((question, index) => <button key={question.number || index} data-question-index={index} className={index === currentIndex ? "coach-dot-active" : index < answers.length ? "coach-dot-complete" : ""} onClick={selectQuestion} disabled={index > answers.length} aria-label={`Go to question ${index + 1}`} aria-current={index === currentIndex ? "step" : undefined}>{index + 1}</button>)}</div>
          <button className="coach-primary-button" onClick={nextQuestion} disabled={!feedback || loading}>{currentIndex + 1 === questions.length ? <>{loading ? "Finalising..." : "View results"}<Trophy size={17} /></> : <>Next question<ChevronRight size={18} /></>}</button>
        </nav>
      </div>
    );
  }

  function renderComplete() {
    return <section className="coach-complete">
      <div className="coach-trophy"><Trophy /></div><span className="coach-eyebrow">Session complete</span><h2>You finished your {setup.jobTitle} practice interview.</h2><p>Use the feedback as a rehearsal guide, then come back and try the questions again in your own words.</p>
      <ScoreRing score={averageScore} label="Average score" />
      <div className="coach-results-list">{answers.map((item, index) => <div key={`${item.question.number}-${index}`}><span>{index + 1}</span><p>{item.question.question}</p><strong>{item.feedback.score}/100</strong></div>)}</div>
      <button className="coach-primary-button" onClick={resetInterview}><RotateCcw size={17} />Start a new interview</button>
    </section>;
  }

  return <DashboardLayout><div className="coach-page"><header className="coach-page-header"><div><span className="coach-eyebrow"><Sparkles size={14} />Personalised practice</span><h1>Interview Coach</h1><p>Build confidence with questions tailored to your next opportunity.</p></div>{phase !== "setup" && <div className="coach-header-stat"><strong>{completedCount}</strong><span>answers reviewed</span></div>}</header>{phase === "setup" ? renderSetup() : phase === "complete" ? renderComplete() : renderInterview()}</div></DashboardLayout>;
}

export default InterviewCoach;
