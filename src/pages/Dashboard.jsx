import { useEffect, useState } from "react";
import DashboardLayout from "../Components/dashboard/DashboardLayout";
import InterviewScoreCard from "../Components/dashboard/InterviewScoreCard";
import RecommendedJobs from "../Components/dashboard/RecommendedJobs";
import SkillGapCard from "../Components/dashboard/SkillGapCard";

import "../Components/dashboard/Dashboard.css";
import {
  cacheCompletedInterview,
  getCachedInterviewResult,
  getLatestInterview,
  hasActiveInterview,
} from "../Components/services/interviewService";
import { getUserSkillsGap } from "../Components/services/skillsGapService";

function Dashboard() {
  /*
    Replace these null and empty values with backend data later.

    Example endpoint:
    GET /api/dashboard
  */

  const [latestInterview, setLatestInterview] = useState(() => getCachedInterviewResult());
  const [skillsGap, setSkillsGap] = useState(null);
  const [skillsGapLoading, setSkillsGapLoading] = useState(true);
  const [skillsGapError, setSkillsGapError] = useState("");

  useEffect(() => {
    if (hasActiveInterview()) {
      return undefined;
    }
    let active = true;
    getLatestInterview()
      .then((result) => {
        if (!active) return;
        setLatestInterview(result);
        if (result) cacheCompletedInterview(result);
      })
      .catch(() => {
        // Keep the last confirmed completion visible during a temporary API failure.
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getUserSkillsGap({ signal: controller.signal })
      .then((analysis) => {
        setSkillsGap(analysis);
        setSkillsGapError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setSkillsGapError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSkillsGapLoading(false);
      });
    return () => controller.abort();
  }, []);

  const dashboardData = null;

  const user = dashboardData?.user ?? null;
  const interview = latestInterview;
  const jobs = dashboardData?.recommendedJobs ?? [];
  const unreadNotifications =
    dashboardData?.unreadNotifications ?? 0;

  return (
    <DashboardLayout
      user={user}
      unreadNotifications={unreadNotifications}
    >
      <section className="dashboard-overview-grid">
        <SkillGapCard
          analysis={skillsGap}
          loading={skillsGapLoading}
          error={skillsGapError}
        />

        <InterviewScoreCard interview={interview} />
      </section>

      <RecommendedJobs jobs={jobs} />
    </DashboardLayout>
  );
}

export default Dashboard;
