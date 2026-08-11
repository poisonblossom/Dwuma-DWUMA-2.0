import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  BriefcaseBusiness,
  Building2,
  Funnel,
  FunnelX,
  MapPin,
  Search,
  WalletCards,
} from "lucide-react";

import DashboardLayout from "../Components/dashboard/DashboardLayout";
import { getJobs } from "../Components/services/jobsService";
import "./Jobs.css";

function valueOf(job, ...keys) {
  for (const key of keys) {
    if (job?.[key] !== undefined && job[key] !== null) return job[key];
  }
  return "";
}

function readOnboarding() {
  try {
    return JSON.parse(localStorage.getItem("dwumaOnboardingData") || "{}");
  } catch {
    return {};
  }
}

function cleanLocationPart(value) {
  return String(value || "")
    .replace(/^(onsite|remote|hybrid)\s*[:;,\-]?\s*/i, "")
    .trim();
}

function getSavedLocationPart(onboarding, part) {
  if (onboarding[part]) return cleanLocationPart(onboarding[part]);
  const [city = "", region = ""] = String(onboarding.location || "")
    .split(",")
    .map((value) => value.trim());
  return cleanLocationPart(part === "city" ? city : region);
}

function Jobs() {
  const [currentLocation, navigate] = useLocation();
  const onboarding = useMemo(() => readOnboarding(), []);
  const headerQuery = useMemo(() => {
    const queryString = currentLocation.includes("?")
      ? currentLocation.slice(currentLocation.indexOf("?") + 1)
      : window.location.search.slice(1);
    return new URLSearchParams(queryString).get("q")?.trim() || "";
  }, [currentLocation]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(headerQuery || onboarding.desiredRole || "");
  const [city, setCity] = useState(() => getSavedLocationPart(onboarding, "city"));
  const [region, setRegion] = useState(() => getSavedLocationPart(onboarding, "region"));
  const [jobType, setJobType] = useState(onboarding.jobType || "");
  const [workArrangement, setWorkArrangement] = useState(onboarding.jobForm || "");
  const [sort, setSort] = useState("newest");
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const location = [cleanLocationPart(city), cleanLocationPart(region)].filter(Boolean).join(", ");

  async function searchJobs({ append = false, token, signal } = {}) {
    setLoading(true);
    setError("");
    try {
      const result = await getJobs({
        query,
        location,
        jobType,
        remote: workArrangement === "Remote" ? true : workArrangement === "Onsite" ? false : undefined,
        nextPageToken: token,
        signal,
      });
      setJobs((current) => append ? [...current, ...result.jobs] : result.jobs);
      setNextPageToken(result.nextPageToken);
      setHasMore(result.hasMore);
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        if (!append) setJobs([]);
        setError(requestError.message);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const requestedQuery = headerQuery || query;
    getJobs({
      query: requestedQuery,
      location,
      jobType,
      remote: workArrangement === "Remote" ? true : workArrangement === "Onsite" ? false : undefined,
      signal: controller.signal,
    })
      .then((result) => {
        if (headerQuery) setQuery(headerQuery);
        setJobs(result.jobs);
        setNextPageToken(result.nextPageToken);
        setHasMore(result.hasMore);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setJobs([]);
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  // The header query triggers a fresh backend search when it changes.
  // Other filters are submitted through the Jobs page form.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerQuery]);

  const visibleJobs = useMemo(() => {
    const filtered = [...jobs];

    return filtered.sort((a, b) => {
      const dateA = new Date(valueOf(a, "postedAt", "createdAt", "datePosted") || 0);
      const dateB = new Date(valueOf(b, "postedAt", "createdAt", "datePosted") || 0);
      if (sort === "oldest") return dateA - dateB;
      if (sort === "title") return String(valueOf(a, "title", "jobTitle")).localeCompare(valueOf(b, "title", "jobTitle"));
      return dateB - dateA;
    });
  }, [jobs, sort]);

  function resetFilters() {
    setQuery("");
    setCity("");
    setRegion("");
    setJobType("");
    setWorkArrangement("");
  }

  function handleSearch(event) {
    event.preventDefault();
    searchJobs();
  }

  function openJobDetails(job) {
    sessionStorage.setItem("dwumaSelectedJob", JSON.stringify(job));
    navigate(`/dashboard/jobs/${job.id || job.externalId}`);
  }

  return (
    <DashboardLayout pageTitle="Jobs">
      <section className="jobs-page">
        <header className="jobs-page-heading">
          <h1>Find Jobs</h1>
          <p>Discover opportunities that match your skills and career goals.</p>
        </header>

        <form className="jobs-filter-bar" onSubmit={handleSearch}>
          <label className="jobs-search-field">
            <span className="sr-only">Search jobs</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Job role"
            />
            <Search size={22} aria-hidden="true" />
          </label>

          <input value={cleanLocationPart(city)} onChange={(event) => setCity(event.target.value)} aria-label="Filter by city" placeholder="City" />

          <input value={region} onChange={(event) => setRegion(event.target.value)} aria-label="Filter by region" placeholder="Region" />

          <select value={jobType} onChange={(event) => setJobType(event.target.value)} aria-label="Filter by job type">
            <option value="">Job Type</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>

          <select value={workArrangement} onChange={(event) => setWorkArrangement(event.target.value)} aria-label="Filter by work arrangement">
            <option value="">Job mode</option>
            <option value="Remote">Remote</option>
            <option value="Onsite">Onsite</option>
            <option value="Hybrid">Hybrid</option>
          </select>

          <button type="submit" className="jobs-search-button">Search jobs</button>
          <button type="button" className="jobs-filter-button" onClick={resetFilters} aria-label="Clear all job filters" title="Clear filters">
            <FunnelX size={25} />
          </button>
        </form>

        <div className="jobs-results-toolbar">
          <p>{loading ? "Loading jobs..." : `Showing ${visibleJobs.length} ${visibleJobs.length === 1 ? "job" : "jobs"}`}</p>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort jobs">
            <option value="newest">Sort by: Newest</option>
            <option value="oldest">Sort by: Oldest</option>
            <option value="title">Sort by: Job title</option>
          </select>
        </div>

        {visibleJobs.length > 0 ? (
          <div className="jobs-results-list">
            {visibleJobs.map((job, index) => {
              const title = valueOf(job, "title", "jobTitle", "position") || "Untitled role";
              const company = valueOf(job, "company", "companyName", "employer") || "Company";
              const place = valueOf(job, "location", "city") || "Location not specified";
              const type = valueOf(job, "jobType", "type", "employmentType") || "Job";
              const salary = valueOf(job, "salary", "compensation", "salaryRange");
              const arrangement = job.isRemote === true ? "Remote" : job.isRemote === false ? "Onsite" : "Not specified";
              return (
                <article className="jobs-result-card" key={valueOf(job, "id", "jobId") || `${title}-${index}`}>
                  <div className="jobs-result-main">
                    <div className="jobs-company-mark"><Building2 size={21} /></div>
                    <div className="jobs-result-copy">
                      <h2>{title}</h2>
                      <p className="jobs-company-name">{company}</p>
                    </div>
                  </div>
                  <div className="jobs-result-location">
                    <span><MapPin size={14} />{place}</span>
                    <span><BriefcaseBusiness size={14} />{type}</span>
                    {salary && <span><WalletCards size={14} />{salary}</span>}
                  </div>
                  <span className="jobs-work-mode">{arrangement}</span>
                  <button type="button" className="jobs-more-info" onClick={() => openJobDetails(job)}>More info</button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="jobs-page-empty">
            <div className="jobs-empty-icon"><Funnel size={30} strokeWidth={2} /></div>
            <h2>{loading ? "Loading jobs" : "No matching jobs found"}</h2>
            <p>{loading ? "Please wait while we find opportunities for you." : error || "Try broadening your role, location, or work arrangement."}</p>
          </div>
        )}
        {hasMore && <button type="button" className="jobs-load-more" disabled={loading} onClick={() => searchJobs({ append: true, token: nextPageToken })}>{loading ? "Loading..." : "Load more jobs"}</button>}
      </section>
    </DashboardLayout>
  );
}

export default Jobs;
