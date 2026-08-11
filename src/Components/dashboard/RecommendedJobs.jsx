import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  MapPin,
} from "lucide-react";

import { useLocation } from "wouter";

function valueOf(job, ...keys) {
  for (const key of keys) {
    if (job?.[key] !== undefined && job[key] !== null && job[key] !== "") return job[key];
  }
  return "";
}

function RecommendedJobs({ jobs = [], loading = false, error = "" }) {
  const [, navigate] = useLocation();

  const hasJobs =
    Array.isArray(jobs) && jobs.length > 0;

  function handleViewAll() {
    navigate("/dashboard/jobs");
  }

  function handleViewJob(job) {
    sessionStorage.setItem("dwumaSelectedJob", JSON.stringify(job));
    navigate(`/dashboard/jobs/${valueOf(job, "id", "jobId", "externalId")}`);
  }

  return (
    <section className="dashboard-card jobs-card">
      <div className="jobs-card-header">
        <h2>Recommended Jobs</h2>

        <button
          type="button"
          onClick={handleViewAll}
        >
          <span>View all</span>
          <ArrowRight
            size={15}
            aria-hidden="true"
          />
        </button>
      </div>

      {hasJobs ? (
        <div className="jobs-list">
          {jobs.map((job, index) => {
            const id = valueOf(job, "id", "jobId", "externalId");
            const title = valueOf(job, "title", "jobTitle", "position") || "Untitled role";
            const company = valueOf(job, "company", "companyName", "employer") || "Company";
            const location = valueOf(job, "location", "city") || "Location not specified";
            const type = valueOf(job, "jobType", "type", "employmentType") || "Job";
            const workMode = job.isRemote === true ? "Remote" : valueOf(job, "workMode", "workArrangement");
            const logoUrl = valueOf(job, "logoUrl", "companyLogoUrl");

            return (
            <article
              key={id || `${title}-${index}`}
              className="job-row"
            >
              <div className="job-main-details">
                <div className="job-company-logo">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${company} logo`}
                    />
                  ) : (
                    <Building2
                      size={20}
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div>
                  <h3>{title}</h3>
                  <p>{company}</p>
                </div>
              </div>

              <div className="job-location-details">
                <span>
                  <MapPin
                    size={13}
                    aria-hidden="true"
                  />

                  {location}
                </span>

                <span>
                  <BriefcaseBusiness
                    size={13}
                    aria-hidden="true"
                  />

                  {type}
                </span>
              </div>

              {workMode && (
                <span className="job-work-mode">
                  {workMode}
                </span>
              )}

              <button
                type="button"
                className="job-view-button"
                onClick={() =>
                  handleViewJob(job)
                }
              >
                View job
              </button>
            </article>
            );
          })}
        </div>
      ) : (
        <div className="jobs-empty-state">
          <div className="jobs-empty-icon">
            <BriefcaseBusiness
              size={30}
              aria-hidden="true"
            />
          </div>

          <h3>{loading ? "Finding recommended jobs" : "No recommended jobs available"}</h3>

          <p>
            {loading
              ? "Searching for roles that match your preferences."
              : error || "No matching roles were returned for your role and location."}
          </p>
        </div>
      )}
    </section>
  );
}

export default RecommendedJobs;
