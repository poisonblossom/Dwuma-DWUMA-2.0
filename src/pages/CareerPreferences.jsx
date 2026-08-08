import { useState } from "react";
import { useLocation } from "wouter";
import "./CareerPreferences.css";

const JOB_ROLES = [
  "Account Officer",
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Mobile App Developer",
  "Data Analyst",
  "Data Scientist",
  "Artificial Intelligence Engineer",
  "Cybersecurity Analyst",
  "Network Engineer",
  "Cloud Engineer",
  "DevOps Engineer",
  "UI/UX Designer",
  "Graphic Designer",
  "Product Manager",
  "Project Manager",
  "Business Analyst",
  "Accountant",
  "Financial Analyst",
  "Human Resource Officer",
  "Marketing Officer",
  "Sales Executive",
  "Customer Service Representative",
  "Administrative Officer",
  "Procurement Officer",
  "Civil Engineer",
  "Mechanical Engineer",
  "Electrical Engineer",
  "Quantity Surveyor",
  "Registered Nurse",
  "Medical Laboratory Scientist",
  "Pharmacist",
  "Teacher",
  "Lecturer",
  "Agricultural Officer",
  "Agronomist",
  "Architect",
  "Auditor",
  "Banking Officer",
  "Biomedical Scientist",
  "Brand Manager",
  "Business Development Manager",
  "Chef",
  "Compliance Officer",
  "Content Writer",
  "Data Engineer",
  "Database Administrator",
  "Digital Marketing Specialist",
  "Electrical Technician",
  "Environmental Health Officer",
  "Event Coordinator",
  "Executive Assistant",
  "Food Scientist",
  "Front Desk Officer",
  "Health and Safety Officer",
  "Hotel Manager",
  "Insurance Officer",
  "Laboratory Technician",
  "Legal Officer",
  "Logistics Coordinator",
  "Maintenance Technician",
  "Mechanical Technician",
  "Monitoring and Evaluation Officer",
  "Operations Manager",
  "Physician Assistant",
  "Procurement Manager",
  "Public Relations Officer",
  "Quality Assurance Officer",
  "Research Assistant",
  "Restaurant Manager",
  "Risk Analyst",
  "Social Media Manager",
  "Supply Chain Analyst",
  "Surveyor",
  "Tax Officer",
  "Warehouse Officer",
  "Web Developer",
];

function CareerPreferences() {
  const [, navigate] = useLocation();

  const [formData, setFormData] = useState({
    desiredRole: "",
  });

  const [errorMessage, setErrorMessage] = useState("");

  const isFormComplete =
    formData.desiredRole;

  function handleSelectChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setErrorMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!isFormComplete) {
      setErrorMessage(
        "Please select your desired role."
      );
      return;
    }

    localStorage.setItem(
      "dwumaCareerPreferences",
      JSON.stringify(formData)
    );

    navigate("/onboarding/step-2");
  }

  return (
    <main className="career-page">
      <section className="career-card">
        <div className="career-progress-section">
          <p className="career-step">Step 1 of 2</p>

          <div
            className="career-progress-track"
            aria-label="Onboarding progress"
          >
            <div className="career-progress-value" />
          </div>
        </div>

        <div className="career-heading">
          <h1>What role do you want to find?</h1>

          <p>
            Tell us about the job you&apos;re targeting so we can
            tailor your search and recommendations.
          </p>
        </div>

        <form className="career-form" onSubmit={handleSubmit}>
          <div className="career-field">
            <label htmlFor="desiredRole">Your role</label>

            <div className="select-wrapper">
              <select
                id="desiredRole"
                name="desiredRole"
                value={formData.desiredRole}
                onChange={handleSelectChange}
                required
              >
                <option value="" disabled>
                  Select your desired role
                </option>

                {JOB_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMessage && (
            <p className="career-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="career-next-button"
            disabled={!isFormComplete}
          >
            Next
          </button>

          <p className="career-privacy-note">
            We use this information to personalise your job
            recommendations, CV improvements, interview coaching and
            skill-gap analysis.
          </p>
        </form>
      </section>
    </main>
  );
}

export default CareerPreferences;
