import { useEffect, useState } from "react";
import DashboardLayout from "../Components/dashboard/DashboardLayout";
import InterviewScoreCard from "../Components/dashboard/InterviewScoreCard";
import RecommendedJobs from "../Components/dashboard/RecommendedJobs";
import SkillGapCard from "../Components/dashboard/SkillGapCard";

import "../Components/dashboard/Dashboard.css";
import { getLatestInterview } from "../Components/services/interviewService";

function Dashboard() {
  /*
    Replace these null and empty values with backend data later.

    Example endpoint:
    GET /api/dashboard
  */

  const [latestInterview, setLatestInterview] = useState(null);

  useEffect(() => {
    let active = true;
    getLatestInterview()
      .then((result) => { if (active) setLatestInterview(result); })
      .catch(() => { if (active) setLatestInterview(null); });
    return () => { active = false; };
  }, []);

  const dashboardData = null;

  const user = dashboardData?.user ?? null;
  const skills = dashboardData?.trendingSkills ?? [];
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
        <SkillGapCard skills={skills} />

        <InterviewScoreCard interview={interview} />
      </section>

      <RecommendedJobs jobs={jobs} />
    </DashboardLayout>
  );
}

export default Dashboard;
