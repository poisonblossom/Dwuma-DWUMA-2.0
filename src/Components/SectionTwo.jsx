import findJob from "../assets/findjob.svg";
import { useLocation } from "wouter";

function SectionTwo() {
  const [, navigate] = useLocation();

  return (
    <section className="section-two">
      <div className="section-two-content">

        <div className="section-two-text">
          <h4>Find jobs on</h4>

          <h2>DWUMA</h2>

          <p>
            Say goodbye to the overwhelming job search.
            Dwuma is your AI-powered career agent that
            searches and matches you with the right jobs.
          </p>

          <div className="section-buttons">
            <button
              type="button"
              className="primary-btn"
              onClick={() => navigate("/create-account")}
            >
              Sign up
            </button>
          </div>
        </div>

        <div className="section-two-image">
          <img src={findJob} alt="Find Jobs Illustration" />
        </div>

      </div>

      <div className="stats-row">
        {[...Array(10)].map((_, index) => (
          <div key={index} className="stat-item">
            <span>Built</span>
            <p>{index % 2 === 0 ? "for students" : "by students"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default SectionTwo;
