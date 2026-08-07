import { CheckCircle2, FileSearch, Files, Type } from "lucide-react";

const SECTION_HEADINGS = [
  "Professional Summary",
  "Career Summary",
  "Work Experience",
  "Professional Experience",
  "Employment History",
  "Education",
  "Skills",
  "Technical Skills",
  "Projects",
  "Certifications",
  "Leadership",
  "Awards",
  "Publications",
  "Volunteer Experience",
  "References",
];

function escapeExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSections(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();
  if (!cleanText) return [];

  const headingPattern = [...SECTION_HEADINGS]
    .sort((first, second) => second.length - first.length)
    .map(escapeExpression)
    .join("|");
  const matcher = new RegExp(`\\b(${headingPattern})\\b`, "gi");
  const matches = [...cleanText.matchAll(matcher)];

  if (!matches.length) {
    return [{ heading: "Extracted content", content: cleanText }];
  }

  const sections = [];
  const introduction = cleanText.slice(0, matches[0].index).trim();
  if (introduction) sections.push({ heading: "CV header", content: introduction });

  matches.forEach((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? cleanText.length;
    const content = cleanText.slice(start, end).trim();
    if (content) {
      sections.push({
        heading: match[0].replace(/\b\w/g, (letter) => letter.toUpperCase()),
        content,
      });
    }
  });

  return sections;
}

function ParsedCvResponse({ text, fileName, tailored = false }) {
  const sections = parseSections(text);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="parsed-cv-response">
      <div className="parsed-cv-response-summary">
        <div className="parsed-cv-response-status">
          <CheckCircle2 size={17} />
          <div><strong>{tailored ? "Tailored CV ready" : "Text extraction complete"}</strong><span>{fileName}</span></div>
        </div>
        <div className="parsed-cv-response-metrics">
          <span><Type size={14} /><strong>{wordCount.toLocaleString()}</strong> words</span>
          <span><Files size={14} /><strong>{sections.length}</strong> sections</span>
        </div>
      </div>

      <div className="parsed-cv-document">
        {sections.map((section, index) => (
          <section key={`${section.heading}-${index}`} className="parsed-cv-section">
            <h3>{section.heading}</h3>
            <p>{section.content}</p>
          </section>
        ))}
      </div>

      <p className="parsed-cv-response-note">
        <FileSearch size={14} /> {tailored ? "Review the tailored wording and confirm every detail remains accurate." : "Check the extracted content against your original CV before continuing."}
      </p>
    </div>
  );
}

export default ParsedCvResponse;
