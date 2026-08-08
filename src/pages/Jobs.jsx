import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  BriefcaseBusiness,
  Building2,
  Funnel,
  MapPin,
  Search,
  SlidersHorizontal,
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

function Jobs() {
  const [, navigate] = useLocation();
  const onboarding = useMemo(() => readOnboarding(), []);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(onboarding.desiredRole || "");
  const [location, setLocation] = useState(onboarding.location || "");
  const [jobType, setJobType] = useState(onboarding.jobType || "");
  const [workArrangement, setWorkArrangement] = useState(onboarding.jobForm || "");
  const [sort, setSort] = useState("newest");
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

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
    getJobs({
      query,
      location,
      jobType,
      remote: workArrangement === "Remote" ? true : workArrangement === "Onsite" ? false : undefined,
      signal: controller.signal,
    })
      .then((result) => {
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
  // Onboarding values intentionally seed the first backend search only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setLocation("");
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
          <h1>Jobs</h1>
          <p>Discover opportunities that match your skills and career goals.</p>
        </header>

        <form className="jobs-filter-bar" onSubmit={handleSearch}>
          <label className="jobs-search-field">
            <span className="sr-only">Search jobs</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search jobs, companies, or keywords..."
            />
            <Search size={22} aria-hidden="true" />
          </label>

          <input value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Filter by location" placeholder="Location, e.g. Accra, Ghana" />

          <select value={jobType} onChange={(event) => setJobType(event.target.value)} aria-label="Filter by job type">
            <option value="">Job Type</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>

          <select value={workArrangement} onChange={(event) => setWorkArrangement(event.target.value)} aria-label="Filter by work arrangement">
            <option value="">Remote or onsite</option>
            <option value="Remote">Remote</option>
            <option value="Onsite">Onsite</option>
            <option value="Hybrid">Hybrid</option>
          </select>

          <button type="submit" className="jobs-search-button">Search jobs</button>
          <button type="button" className="jobs-filter-button" onClick={resetFilters} aria-label="Clear all job filters" title="Clear filters">
            <SlidersHorizontal size={21} />
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
