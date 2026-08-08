import { useEffect, useMemo, useState } from "react";
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
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import DashboardLayout from "../Components/dashboard/DashboardLayout";
import {
  evaluateInterviewAnswer,
  generateInterviewQuestions,
  completeInterview,
  cacheCompletedInterview,
  clearCachedInterviewResult,
} from "../Components/services/interviewService";
import "../Components/dashboard/Dashboard.css";
import "./InterviewCoach.css";

const SESSION_KEY = "dwumaInterviewSession";
const MAX_ANSWER_LENGTH = 4000;

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
    const reviewedAnswer = answers[index];
    setCurrentIndex(index);
    setAnswer(reviewedAnswer?.answer || "");
    setFeedback(reviewedAnswer?.feedback || null);
    setError("");
  }

  function previousQuestion() {
    if (currentIndex > 0) goToQuestion(currentIndex - 1);
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
            {currentQuestion.whatInterviewerLooksFor && <details><summary><Lightbulb size={15} />What the interviewer is looking for</summary><p>{currentQuestion.whatInterviewerLooksFor}</p></details>}
            <form onSubmit={submitAnswer} className="coach-answer-form">
              <label htmlFor="interview-answer">{feedback ? "Your submitted answer" : "Your answer"}</label>
              <textarea id="interview-answer" value={answer} onChange={(event) => { setAnswer(event.target.value); setError(""); }} maxLength={MAX_ANSWER_LENGTH} rows="8" placeholder="Structure your thinking, give a specific example, and explain the outcome..." autoFocus={!feedback} readOnly={Boolean(feedback)} />
              {!feedback && <div className="coach-answer-footer"><span>{answer.length.toLocaleString()} / {MAX_ANSWER_LENGTH.toLocaleString()}</span><button className="coach-primary-button" disabled={loading || answer.trim().length < 10}>{loading ? <><LoaderCircle className="coach-spinner" />Reviewing...</> : <>Get feedback<ArrowRight size={17} /></>}</button></div>}
              {error && <p className="coach-error" role="alert"><CircleAlert size={16} />{error}</p>}
            </form>
          </section>
          {feedback ? renderFeedback() : <aside className="coach-remarks-empty"><div><Sparkles /></div><span className="coach-eyebrow">AI remarks</span><h2>Your feedback will appear here</h2><p>Submit your answer to receive a score, focused coaching points, a stronger example, and a delivery tip.</p></aside>}
        </div>
        <nav className="coach-question-navigation" aria-label="Interview question navigation">
          <button className="coach-secondary-button" onClick={previousQuestion} disabled={currentIndex === 0}><ArrowLeft size={16} />Previous question</button>
          <div className="coach-question-dots">{questions.map((question, index) => <button key={question.number || index} className={index === currentIndex ? "coach-dot-active" : index < answers.length ? "coach-dot-complete" : ""} onClick={() => index <= answers.length && goToQuestion(index)} disabled={index > answers.length} aria-label={`Go to question ${index + 1}`} aria-current={index === currentIndex ? "step" : undefined}>{index + 1}</button>)}</div>
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
