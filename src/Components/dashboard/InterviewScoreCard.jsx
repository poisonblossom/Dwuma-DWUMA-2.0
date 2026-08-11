import { useLocation } from "wouter";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Target,
  UserRound,
} from "lucide-react";

import interviewImage from "../../assets/interview.svg";

function InterviewScoreCard({ interview }) {
  const [, navigate] = useLocation();

  const hasInterview =
    interview?.completed === true &&
    typeof interview?.score === "number";
  const answers = Array.isArray(interview?.answers) ? interview.answers : [];
  const questionCount = Number(interview?.questionCount) || answers.length;
  const answeredCount = answers.filter((answer) => answer?.transcript || answer?.answer || answer?.feedback).length || questionCount;
  const strongCount = answers.filter((answer) => Number(answer?.feedback?.score ?? answer?.score) >= 75).length;
  const durationSeconds = Number(interview?.totalTimeSeconds ?? interview?.durationSeconds ?? interview?.duration) || 0;
  const duration = durationSeconds
    ? `${Math.floor(durationSeconds / 60)}m ${String(Math.round(durationSeconds % 60)).padStart(2, "0")}s`
    : "—";
  const role = interview?.role || "practice";
  const weaknesses = [
    ...answers.flatMap((answer) => answer?.feedback?.improvements || answer?.improvements || []),
    ...(Array.isArray(interview?.weaknesses) ? interview.weaknesses : []),
  ].filter(Boolean);
  const weaknessPoints = [...new Set(weaknesses)].slice(0, 3);
  const fallbackWeaknesses = [
    "Make answers more specific and directly relevant to each question.",
    "Support responses with clear examples from your experience.",
    "Improve answer structure, confidence, and delivery.",
  ];
  while (weaknessPoints.length < 3) weaknessPoints.push(fallbackWeaknesses[weaknessPoints.length]);

  return (
    <article className="dashboard-card interview-card">
      <div className="interview-dashboard-heading">
        <h2>Interview Score</h2>
        <p>Track your performance and improvement</p>
      </div>

      <div className="interview-card-body interview-dashboard-body">
        {hasInterview ? (
          <>
            <div className="interview-dashboard-main">
              <div className="interview-score-ring" style={{ "--score": `${Math.min(Math.max(interview.score, 0), 100) * 3.6}deg` }}>
                <div><strong>{interview.score}%</strong><span>Final score</span></div>
              </div>
              <div className="interview-card-message">
                <h3>Latest {role} interview: {interview.score}%</h3>
                <p>Completed all {questionCount} questions.</p>
              </div>
              <img src={interviewImage} alt="Interview participant celebrating" className="interview-card-image" />
            </div>

            <div className="interview-dashboard-stats">
              <div><ClipboardList /><strong>{questionCount}</strong><span>Questions</span></div>
              <div><CheckCircle2 /><strong>{answeredCount}</strong><span>Answered</span></div>
              <div><Target /><strong>{strongCount}</strong><span>Strong</span></div>
              <div><Clock3 /><strong>{duration}</strong><span>Total time</span></div>
            </div>

            <div className="interview-performance-summary">
              <div>
                <strong>Performance Summary</strong>
                <ul>{weaknessPoints.map((weakness, index) => <li key={`${weakness}-${index}`}>{weakness}</li>)}</ul>
              </div>
            </div>

            <div className="interview-dashboard-tip">
              <span><UserRound /></span>
              <div><strong>Tip</strong><p>Focus on your weak areas and keep practising. Consistency is key to improvement.</p></div>
            </div>
          </>
        ) : (
          <div className="interview-empty-content">
            <div className="empty-score-ring">
              <strong>—</strong>
              <span>No score</span>
            </div>

            <div>
              <h3>Complete an interview</h3>

              <p>
                Your latest interview score and
                feedback will appear here.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/dashboard/interview-coach",
                  )
                }
              >
                Start interview
              </button>
            </div>
          </div>
        )}

      </div>
    </article>
  );
}

export default InterviewScoreCard;
