import { MoreHorizontal } from "lucide-react";

function SkillGapCard({ analysis, loading = false, error = "" }) {
  const gaps = Array.isArray(analysis?.skills)
    ? analysis.skills.filter((skill) => ["partial", "absent"].includes(skill.status?.toLowerCase()))
    : [];
  const score = Math.max(0, Math.min(100, Number(analysis?.matchPercentage) || 0));
  const hasAnalysis = Boolean(analysis);

  return (
    <article className="dashboard-card skill-card">
      <div className="dashboard-card-header">
        <h2>Skill Gap Analysis</h2>

        <button
          type="button"
          aria-label="Skill card options"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {loading ? (
        <div className="dashboard-empty-state" aria-live="polite">
          <div className="empty-donut"><span>...</span></div>
          <div><h3>Analysing your skills</h3><p>Comparing your saved skills with your field and desired role.</p></div>
        </div>
      ) : hasAnalysis ? (
        <div className="skill-card-content">
          <div className="skill-chart" style={{ "--match-score": `${score * 3.6}deg` }}>
            <div className="skill-chart-centre">
              <strong>{score}%</strong>
              <span>Role match</span>
            </div>
          </div>

          <div className="skill-list">
            {gaps.slice(0, 4).map((skill) => (
              <div
                className="skill-list-item"
                key={skill.name}
                title={skill.description}
              >
                <span className="skill-colour" />

                <p>{skill.name}</p>

                <strong>
                  {skill.status === "partial" ? "Developing" : "Missing"}
                </strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="dashboard-empty-state">
          <div className="empty-donut">
            <span>—</span>
          </div>

          <div><h3>Analysis unavailable</h3><p>{error || "Your saved onboarding analysis could not be loaded."}</p></div>
        </div>
      )}

      <p className="skill-card-caption">
        {hasAnalysis
          ? (gaps.length ? analysis.summary : "No missing skills were identified for your selected role.")
          : "Skill gaps are based on your saved onboarding information."}
      </p>
    </article>
  );
}

export default SkillGapCard;
