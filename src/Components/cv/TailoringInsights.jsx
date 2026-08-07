import { Check, CircleAlert, ListChecks, Sparkles } from "lucide-react";

function KeywordList({ title, keywords, tone }) {
  return (
    <div className="tailoring-keyword-group">
      <h3>{tone === "matched" ? <Check size={14} /> : <CircleAlert size={14} />}{title}</h3>
      {keywords.length ? (
        <div className={`tailoring-keywords tailoring-keywords-${tone}`}>
          {keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
        </div>
      ) : <p>None reported.</p>}
    </div>
  );
}

function TailoringInsights({ result }) {
  const matched = Array.isArray(result.matchedKeywords) ? result.matchedKeywords : [];
  const missing = Array.isArray(result.missingKeywords) ? result.missingKeywords : [];
  const changelog = Array.isArray(result.changelog) ? result.changelog : [];

  return (
    <article className="tailoring-insights-card">
      <div className="cv-improvements-heading"><Sparkles /><h2>AI tailoring insights</h2></div>
      {result.atsSummary && <div className="tailoring-ats-summary"><strong>ATS assessment</strong><p>{result.atsSummary}</p></div>}
      <KeywordList title="Matched keywords" keywords={matched} tone="matched" />
      <KeywordList title="Skills to strengthen" keywords={missing} tone="missing" />
      <div className="tailoring-changelog">
        <h3><ListChecks size={15} /> Changes made</h3>
        {changelog.length ? changelog.map((change, index) => (
          <div className="tailoring-change" key={`${change.section}-${index}`}>
            <span>{change.type || "update"}</span>
            <div><strong>{change.section || "CV content"}</strong><p>{change.reason}</p></div>
          </div>
        )) : <p className="cv-no-improvements">No changelog was returned.</p>}
      </div>
    </article>
  );
}

export default TailoringInsights;
