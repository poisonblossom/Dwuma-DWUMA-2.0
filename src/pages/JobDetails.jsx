import { useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ExternalLink,
  MapPin,
  WalletCards,
} from "lucide-react";

import DashboardLayout from "../Components/dashboard/DashboardLayout";
import "./JobDetails.css";

function readSelectedJob() {
  try {
    return JSON.parse(sessionStorage.getItem("dwumaSelectedJob") || "null");
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "Date not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date not specified"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function getJobDescription(description) {
  const text = String(description || "").trim();
  if (!text) return "No description was provided for this role.";

  const descriptionMarkers = [
    "Position Overview",
    "Job Description",
    "Role Overview",
    "About the Role",
  ];
  const markerPositions = descriptionMarkers
    .map((marker) => ({ marker, index: text.toLowerCase().indexOf(marker.toLowerCase()) }))
    .filter(({ index }) => index >= 0)
    .sort((a, b) => a.index - b.index);

  const roleDescription = markerPositions.length
    ? text
        .slice(markerPositions[0].index + markerPositions[0].marker.length)
        .replace(/^\s*[:\-–—]\s*/, "")
        .trim()
    : text;
  const unwantedMarkers = [
    "Latest Career Advice",
    "SHARE with someone special",
  ];
  const unwantedPositions = unwantedMarkers
    .map((marker) => roleDescription.toLowerCase().indexOf(marker.toLowerCase()))
    .filter((index) => index >= 0);

  const cleanedDescription = unwantedPositions.length
    ? roleDescription.slice(0, Math.min(...unwantedPositions)).trim()
    : roleDescription;

  return cleanedDescription || "No description was provided for this role.";
}

function JobDetails() {
  const [, navigate] = useLocation();
  const job = useMemo(() => readSelectedJob(), []);

  if (!job) {
    return (
      <DashboardLayout pageTitle="Job Details">
        <section className="job-detail-empty">
          <BriefcaseBusiness size={34} />
          <h1>Job details unavailable</h1>
          <p>Return to Jobs and select an opportunity to see its full details.</p>
          <button type="button" onClick={() => navigate("/dashboard/jobs")}>Back to jobs</button>
        </section>
      </DashboardLayout>
    );
  }

  const applicationUrl = job.sourceUrl || job.applicationUrl || job.applyUrl || job.url;
  const arrangement = job.isRemote === true ? "Remote" : job.isRemote === false ? "Onsite" : "Not specified";

  return (
    <DashboardLayout pageTitle="Job Details">
      <article className="job-detail-page">
        <button type="button" className="job-detail-back" onClick={() => navigate("/dashboard/jobs")}>
          <ArrowLeft size={16} />Back to jobs
        </button>

        <header className="job-detail-hero">
          <div className="job-detail-company-icon"><Building2 size={28} /></div>
          <div className="job-detail-heading">
            <span>Job opportunity</span>
            <h1>{job.title || "Untitled role"}</h1>
            <p>{job.company || "Company not specified"}</p>
          </div>
        </header>

        <section className="job-detail-meta" aria-label="Job summary">
          <div><MapPin /><span>Location<strong>{job.location || "Not specified"}</strong></span></div>
          <div><BriefcaseBusiness /><span>Job type<strong>{job.jobType || "Not specified"}</strong></span></div>
          <div><Building2 /><span>Work arrangement<strong>{arrangement}</strong></span></div>
          <div><WalletCards /><span>Salary<strong>{job.salary || "Not specified"}</strong></span></div>
          <div><CalendarDays /><span>Posted<strong>{formatDate(job.postedAt)}</strong></span></div>
        </section>

        <section className="job-detail-content">
          <h2>About this role</h2>
          <div className="job-detail-description">{getJobDescription(job.description)}</div>
        </section>

        {applicationUrl && (
          <footer className="job-detail-footer">
            <div><strong>Interested in this opportunity?</strong><p>Continue to the employer’s application page.</p></div>
            <a className="job-detail-apply" href={applicationUrl} target="_blank" rel="noreferrer">Apply now<ExternalLink size={16} /></a>
          </footer>
        )}
      </article>
    </DashboardLayout>
  );
}

export default JobDetails;
