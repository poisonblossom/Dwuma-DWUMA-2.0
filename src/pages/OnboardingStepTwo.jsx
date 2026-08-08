import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import "./CareerPreferences.css";
import { saveOnboarding } from "../Components/services/onboardingService";

const GHANA_LOCATIONS = {
  "Ahafo": ["Bechem", "Duayaw Nkwanta", "Goaso", "Hwidiem", "Kenyasi"],
  "Ashanti": ["Bekwai", "Ejisu", "Konongo", "Kumasi", "Mampong", "Obuasi"],
  "Bono": ["Berekum", "Dormaa Ahenkro", "Sunyani", "Wenchi"],
  "Bono East": ["Atebubu", "Kintampo", "Nkoranza", "Techiman"],
  "Central": ["Agona Swedru", "Cape Coast", "Kasoa", "Mankessim", "Winneba"],
  "Eastern": ["Aburi", "Akosombo", "Koforidua", "Kyebi", "Nkawkaw", "Suhum"],
  "Greater Accra": ["Accra", "Adenta", "Ashaiman", "Madina", "Tema", "Teshie"],
  "North East": ["Bunkpurugu", "Gambaga", "Nalerigu", "Walewale"],
  "Northern": ["Savelugu", "Tamale", "Yendi"],
  "Oti": ["Dambai", "Jasikan", "Kadjebi", "Nkwanta"],
  "Savannah": ["Bole", "Damongo", "Salaga", "Sawla"],
  "Upper East": ["Bawku", "Bolgatanga", "Navrongo", "Paga"],
  "Upper West": ["Jirapa", "Lawra", "Nandom", "Tumu", "Wa"],
  "Volta": ["Aflao", "Ho", "Hohoe", "Keta", "Kpando"],
  "Western": ["Axim", "Sekondi", "Takoradi", "Tarkwa"],
  "Western North": ["Bibiani", "Enchi", "Juaboso", "Sefwi Wiawso"],
};

const WORK_FIELDS = [
  "Accounting and Finance",
  "Administration",
  "Agriculture",
  "Architecture",
  "Arts and Design",
  "Business and Management",
  "Construction",
  "Customer Service",
  "Data and Analytics",
  "Education",
  "Engineering",
  "Healthcare",
  "Hospitality and Tourism",
  "Human Resources",
  "Information Technology",
  "Law",
  "Marketing and Communications",
  "Media and Entertainment",
  "Project Management",
  "Sales",
  "Science and Research",
  "Software Development",
  "Supply Chain and Procurement",
];

const AVAILABLE_SKILLS = [
  "Accounting",
  "Adaptability",
  "Adobe Illustrator",
  "Adobe Photoshop",
  "Agile Methodologies",
  "Amazon Web Services (AWS)",
  "Analytical Thinking",
  "Auditing",
  "AutoCAD",
  "Bash",
  "Business Analysis",
  "C#",
  "C++",
  "Cloud Computing",
  "Communication",
  "Conflict Resolution",
  "Content Creation",
  "Critical Thinking",
  "CSS",
  "Customer Service",
  "Cybersecurity",
  "Data Analysis",
  "Data Entry",
  "Database Management",
  "Digital Marketing",
  "Docker",
  "Figma",
  "Financial Reporting",
  "Git and GitHub",
  "Google Workspace",
  "Graphic Design",
  "HTML",
  "Interpersonal Skills",
  "Java",
  "JavaScript",
  "Leadership",
  "Linux",
  "Machine Learning",
  "Microsoft Excel",
  "Microsoft Office",
  "Microsoft Power BI",
  "Mobile App Development",
  "Networking",
  "Node.js",
  "PHP",
  "Presentation Skills",
  "Problem Solving",
  "Project Management",
  "Python",
  "React",
  "Research",
  "Sales",
  "SEO",
  "Social Media Management",
  "SQL",
  "Strategic Thinking",
  "Teamwork",
  "Time Management",
  "TypeScript",
  "UI/UX Design",
  "Verbal Communication",
  "Web Development",
  "Written Communication",
  "Accounts Payable",
  "Accounts Receivable",
  "Adobe InDesign",
  "Budgeting and Forecasting",
  "Building Information Modelling (BIM)",
  "Cash Flow Management",
  "Clinical Care",
  "Computer-Aided Design (CAD)",
  "Contract Management",
  "Copywriting",
  "Credit Analysis",
  "Customer Relationship Management (CRM)",
  "Electrical Installation",
  "Emergency Response",
  "Enterprise Resource Planning (ERP)",
  "Environmental Impact Assessment",
  "Event Planning",
  "Experimental Design",
  "Financial Modelling",
  "Food Safety and Quality Control",
  "Google Analytics",
  "Graphic Communication",
  "Human Resource Information Systems",
  "Inventory Management",
  "Laboratory Testing",
  "Legal Research",
  "Market Research",
  "Mechanical Maintenance",
  "Medical Records Management",
  "Monitoring and Evaluation",
  "Payroll Administration",
  "Procurement and Sourcing",
  "Product Development",
  "Quality Assurance",
  "QuickBooks",
  "Regulatory Compliance",
  "Risk Management",
  "Sage Accounting",
  "Salesforce",
  "Sensory Evaluation",
  "Statistical Analysis",
  "Stock Control",
  "Tax Compliance",
  "Technical Report Writing",
  "Tender Preparation",
  "Warehouse Management",
  "Xero",
];

function OnboardingStepTwo() {
  const [, navigate] = useLocation();

  const [formData, setFormData] = useState({
    fieldOfWork: "",
    region: "",
    city: "",
    skills: [],
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("dwumaCareerPreferences")) {
      navigate("/onboarding/step-1", { replace: true });
    }
  }, [navigate]);

  const isFormComplete =
    formData.fieldOfWork !== "" &&
    formData.region !== "" &&
    formData.city !== "" &&
    formData.skills.length > 0;

  function handleFieldChange(event) {
    setFormData((currentData) => ({
      ...currentData,
      fieldOfWork: event.target.value,
    }));

    setErrorMessage("");
  }

  function handleRegionChange(event) {
    setFormData((currentData) => ({
      ...currentData,
      region: event.target.value,
      city: "",
    }));
    setErrorMessage("");
  }

  function handleCityChange(event) {
    setFormData((currentData) => ({
      ...currentData,
      city: event.target.value,
    }));
    setErrorMessage("");
  }

  function handleSkillSelect(event) {
    const skill = event.target.value;
    if (!skill) return;
    setFormData((currentData) => ({
      ...currentData,
      skills: currentData.skills.includes(skill)
        ? currentData.skills
        : [...currentData.skills, skill],
    }));
    setErrorMessage("");
  }

  function removeSkill(skill) {
    setFormData((currentData) => ({
      ...currentData,
      skills: currentData.skills.filter(
        (selectedSkill) => selectedSkill !== skill
      ),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isFormComplete) {
      setErrorMessage(
        "Please select your field of work, region, city and at least one skill."
      );
      return;
    }

    let stepOneData = {};

    try {
      const savedStepOneData = localStorage.getItem(
        "dwumaCareerPreferences"
      );

      if (savedStepOneData) {
        stepOneData = JSON.parse(savedStepOneData);
      }
    } catch {
      stepOneData = {};
    }

    const completeOnboardingData = {
      ...stepOneData,
      ...formData,
      location: `${formData.city}, ${formData.region}`,
    };

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await saveOnboarding(completeOnboardingData);
      localStorage.removeItem("dwumaCareerPreferences");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "Your onboarding information could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function goBack() {
    navigate("/onboarding/step-1");
  }

  return (
    <main className="career-page">
      <section className="career-card">
        <div className="career-progress-section">
          <p className="career-step">Step 2 of 2</p>

          <div
            className="career-progress-track"
            aria-label="Onboarding progress"
          >
            <div className="career-progress-value step-two-progress" />
          </div>
        </div>

        <div className="career-heading">
          <h1>Tell us more about your work preferences</h1>

          <p>
            Select how you would like to work, your professional field
            and the skills you currently have.
          </p>
        </div>

        <form className="career-form" onSubmit={handleSubmit}>
          <div className="career-field">
            <label htmlFor="fieldOfWork">Field of work</label>

            <div className="select-wrapper">
              <select
                id="fieldOfWork"
                name="fieldOfWork"
                value={formData.fieldOfWork}
                onChange={handleFieldChange}
                required
              >
                <option value="" disabled>
                  Select your field of work
                </option>

                {WORK_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="onboarding-location-grid">
            <div className="career-field">
              <label htmlFor="region">Region</label>
              <div className="select-wrapper">
                <select id="region" name="region" value={formData.region} onChange={handleRegionChange} required>
                  <option value="" disabled>Select your region</option>
                  {Object.keys(GHANA_LOCATIONS).map((region) => <option key={region} value={region}>{region}</option>)}
                </select>
              </div>
            </div>

            <div className="career-field">
              <label htmlFor="city">City or town</label>
              <div className="select-wrapper">
                <select id="city" name="city" value={formData.city} onChange={handleCityChange} disabled={!formData.region} required>
                  <option value="" disabled>{formData.region ? "Select your city or town" : "Select a region first"}</option>
                  {(GHANA_LOCATIONS[formData.region] || []).map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="career-field skills-field">
            <label htmlFor="skills">Skills</label>
            <div className="select-wrapper">
              <select id="skills" value="" onChange={handleSkillSelect}>
                <option value="">Select a skill to add</option>
                {AVAILABLE_SKILLS.map((skill) => (
                  <option key={skill} value={skill} disabled={formData.skills.includes(skill)}>
                    {skill}
                  </option>
                ))}
              </select>
            </div>

            {formData.skills.length > 0 && (
              <div className="selected-skills">
                {formData.skills.map((skill) => (
                  <span className="selected-skill-tag" key={skill}>
                    {skill}

                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      aria-label={`Remove ${skill}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="career-error" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="onboarding-buttons">
            <button
              type="button"
              className="career-back-button"
              onClick={goBack}
            >
              Back
            </button>

            <button
              type="submit"
              className="career-next-button"
              disabled={!isFormComplete || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Finish"}
            </button>
          </div>

          <p className="career-privacy-note">
            Your information will be used to personalise job
            recommendations, skill-gap analysis, CV assistance and
            interview coaching.
          </p>
        </form>
      </section>
    </main>
  );
}

export default OnboardingStepTwo;
