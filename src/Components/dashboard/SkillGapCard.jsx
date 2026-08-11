import {
  BarChart3,
  BriefcaseBusiness,
  Calculator,
  CircleAlert,
  ExternalLink,
  Laptop,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

function getResourceForSkill(skill, resources, index) {
  const directUrl = skill?.resourceUrl || skill?.url;
  if (directUrl) return { name: skill.name, url: directUrl };
  if (!resources.length) return null;

  const terms = String(`${skill.name} ${skill.description || ""}`)
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((term) => term.length > 3) || [];

  const ranked = resources
    .map((resource) => {
      const searchable = `${resource.name || ""} ${resource.platform || ""} ${resource.description || ""}`.toLowerCase();
      return { resource, score: terms.filter((term) => searchable.includes(term)).length };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0
    ? ranked[0].resource
    : resources[index % resources.length];
}

function safeResourceUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function SkillGapCard({ analysis, loading = false, error = "" }) {
  const gaps = Array.isArray(analysis?.skills)
    ? analysis.skills.filter((skill) => ["partial", "absent"].includes(skill.status?.toLowerCase()))
    : [];
  const score = Math.max(0, Math.min(100, Number(analysis?.matchPercentage) || 0));
  const hasAnalysis = Boolean(analysis);
  const developingCount = gaps.filter((skill) => skill.status?.toLowerCase() === "partial").length;
  const missingCount = gaps.filter((skill) => skill.status?.toLowerCase() === "absent").length;
  const skillIcons = [ShieldCheck, Calculator, Laptop, BarChart3];
  const resources = Array.isArray(analysis?.resources)
    ? analysis.resources.filter((resource) => safeResourceUrl(resource?.url))
    : [];

  return (
    <article className="dashboard-card skill-card">
      <div className="dashboard-card-header">
        <h2><span className="skill-header-icon"><BarChart3 /></span>Skill Gap Analysis</h2>
      </div>

      {loading ? (
        <div className="dashboard-empty-state" aria-live="polite">
          <div className="empty-donut"><span>...</span></div>
          <div><h3>Analysing your skills</h3><p>Comparing your saved skills with your field and desired role.</p></div>
        </div>
      ) : hasAnalysis ? (
        <div className="skill-card-content">
          <div className="skill-score-column">
            <div className="skill-chart" style={{ "--match-score": `${score * 3.6}deg` }}>
              <div className="skill-chart-centre">
                <strong>{score}%</strong>
                <span>Role match</span>
              </div>
            </div>

            <div className="skill-gap-counts">
              <div><span><TrendingUp /></span><strong>{developingCount}</strong><small>Developing</small></div>
              <div><span><CircleAlert /></span><strong>{missingCount}</strong><small>Missing</small></div>
            </div>
          </div>

          <div className="skill-list">
            <div className="skill-list-head"><span>Skill</span><span>Gap status</span></div>
            {gaps.slice(0, 4).map((skill, index) => {
              const SkillIcon = skillIcons[index] || BarChart3;
              const developing = skill.status?.toLowerCase() === "partial";
              const resource = getResourceForSkill(skill, resources, index);
              const resourceUrl = safeResourceUrl(resource?.url);
              const SkillRow = resourceUrl ? "a" : "div";
              return (
                <SkillRow
                  className={`skill-list-item ${resourceUrl ? "skill-list-link" : ""}`}
                  key={skill.name}
                  {...(resourceUrl ? {
                    href: resourceUrl,
                    target: "_blank",
                    rel: "noreferrer",
                    "aria-label": `Open ${resource?.name || skill.name} learning resource`,
                  } : {})}
                >
                  <span className={`skill-row-icon skill-row-icon-${index + 1}`}><SkillIcon /></span>
                  <div><strong>{skill.name}</strong><p>{skill.description || "Develop this skill to strengthen your role readiness."}</p></div>
                  <span className={`skill-status ${developing ? "developing" : "missing"}`}>
                    {developing ? <TrendingUp /> : <CircleAlert />}{developing ? "Developing" : "Missing"}
                  </span>
                  {resourceUrl && <ExternalLink className="skill-resource-link-icon" />}
                </SkillRow>
              );
            })}
          </div>

          <div className="skill-recommendation">
            <span><BriefcaseBusiness /></span>
            <div><strong>Recommendation</strong><p>{gaps.length ? analysis.summary : "No missing skills were identified for your selected role."}</p></div>
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

      {!hasAnalysis && <p className="skill-card-caption">Skill gaps are based on your saved onboarding information.</p>}
    </article>
  );
}

export default SkillGapCard;
