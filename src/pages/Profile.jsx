import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Bookmark,
  Building2,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Upload,
  X,
} from "lucide-react";

import DashboardLayout from "../Components/dashboard/DashboardLayout";
import DashboardPageLoader from "../pages/DashboardPageLoader";
import "./DashboardPages.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://dwuma-api.onrender.com/api";

function getAuthToken() {
  return localStorage.getItem("dwumaToken") || sessionStorage.getItem("dwumaToken");
}

function readStoredJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key)) || null;
  } catch {
    return null;
  }
}

function valueOf(item, ...keys) {
  for (const key of keys) {
    if (item?.[key] !== undefined && item[key] !== null && item[key] !== "") {
      return item[key];
    }
  }
  return "";
}

function Profile() {
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [editForm, setEditForm] = useState({
    fullName: "", email: "", phoneNumber: "", location: "",
    fieldOfStudy: "", education: "", linkedin: "", skills: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProfile() {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/profile`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (response.ok) setProfile(await response.json());
      } catch (error) {
        if (error.name !== "AbortError") setProfile(null);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    fetchProfile();
    return () => controller.abort();
  }, []);

  const storedUser = readStoredJson("dwumaUser") || {};
  const onboarding = readStoredJson("dwumaOnboardingData") || {};
  const displayProfile = { ...storedUser, ...onboarding, ...(profile || {}) };
  const onboardingLocation =
    valueOf(onboarding, "location") ||
    (onboarding.city && onboarding.region
      ? `${onboarding.city}, ${onboarding.region}`
      : "");
  const profileLocation =
    valueOf(profile, "location", "city") ||
    valueOf(storedUser, "location", "city") ||
    onboardingLocation;

  const information = [
    { label: "Email Address", value: valueOf(displayProfile, "email"), icon: Mail },
    { label: "Phone Number", value: valueOf(displayProfile, "phoneNumber", "phone") || "Not added", icon: Phone },
    { label: "Location", value: profileLocation || "Not added", icon: MapPin },
    {
      label: "Field of Study",
      value: valueOf(displayProfile, "fieldOfStudy", "fieldOfWork", "studyField") || "Not added",
      icon: GraduationCap,
    },
    {
      label: "Education",
      value: valueOf(displayProfile, "education", "educationLevel", "degree") || "Not added",
      icon: GraduationCap,
    },
    {
      label: "LinkedIn",
      value: valueOf(displayProfile, "linkedin", "linkedIn", "linkedinUrl") || "Not added",
      icon: Link2,
      link: valueOf(displayProfile, "linkedin", "linkedIn", "linkedinUrl"),
    },
  ];

  const skillsSource = valueOf(displayProfile, "skills");
  const skills = Array.isArray(skillsSource) ? skillsSource : [];
  const resume = valueOf(displayProfile, "resume", "cv", "uploadedResume") || null;
  const storedSavedJobs = readStoredJson("dwumaSavedJobs");
  const savedJobsSource = valueOf(displayProfile, "savedJobs", "bookmarkedJobs") || storedSavedJobs;
  const savedJobs = Array.isArray(savedJobsSource) ? savedJobsSource : [];

  function openEditor() {
    setEditForm({
      fullName: valueOf(displayProfile, "fullName", "name", "username"),
      email: valueOf(displayProfile, "email"),
      phoneNumber: valueOf(displayProfile, "phoneNumber", "phone"),
      location: profileLocation,
      fieldOfStudy: valueOf(displayProfile, "fieldOfStudy", "fieldOfWork", "studyField"),
      education: valueOf(displayProfile, "education", "educationLevel", "degree"),
      linkedin: valueOf(displayProfile, "linkedin", "linkedIn", "linkedinUrl"),
      skills: skills.map((skill) => typeof skill === "string" ? skill : valueOf(skill, "name", "skillName", "title")).filter(Boolean).join(", "),
    });
    setEditMessage("");
    setIsEditing(true);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
    setEditMessage("");
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!editForm.email.trim()) {
      setEditMessage("Email address is required.");
      return;
    }

    const nextSkills = editForm.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    const payload = {
      fullName: editForm.fullName.trim(),
      email: editForm.email.trim().toLowerCase(),
      phoneNumber: editForm.phoneNumber.trim(),
      location: editForm.location.trim(),
      fieldOfStudy: editForm.fieldOfStudy.trim(),
      careerField: editForm.fieldOfStudy.trim(),
      education: editForm.education.trim(),
      linkedin: editForm.linkedin.trim(),
      skills: nextSkills,
    };

    setIsSaving(true);
    setEditMessage("");
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/settings/account`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || error?.title || "Your profile could not be saved.");
      }

      setProfile((current) => ({ ...(current || {}), ...payload }));
      const nextStoredUser = { ...storedUser, ...payload };
      const storage = localStorage.getItem("dwumaToken") ? localStorage : sessionStorage;
      storage.setItem("dwumaUser", JSON.stringify(nextStoredUser));
      localStorage.setItem("dwumaOnboardingData", JSON.stringify({ ...onboarding, fieldOfStudy: payload.fieldOfStudy, skills: nextSkills }));
      setIsEditing(false);
    } catch (error) {
      setEditMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardLayout user={displayProfile}>
      <main className="dashboard-page profile-page-reference">
        {isLoading ? <DashboardPageLoader message="Loading your profile information..." /> : (
          <section className="profile-reference-grid">
            <article className="dashboard-card profile-reference-information">
              <div className="profile-reference-heading">
                <h2>Personal Information</h2>
                <button type="button" className="secondary-button" onClick={openEditor}>
                  <Pencil size={14} />Edit Profile
                </button>
              </div>

              <div className="profile-reference-details">
                {information.map(({ label, value, icon: Icon, link }) => (
                  <div className="profile-reference-detail" key={label}>
                    <Icon size={17} />
                    <span>{label}</span>
                    {link ? (
                      <a href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noreferrer">{value}<ExternalLink size={12} /></a>
                    ) : <strong>{value}</strong>}
                  </div>
                ))}
              </div>
            </article>

            <div className="profile-reference-right">
              <article className="dashboard-card profile-reference-card">
                <div className="profile-reference-heading">
                  <h2>Skills</h2>
                  <button type="button" className="secondary-button" onClick={openEditor}><Pencil size={14} />Edit Skills</button>
                </div>
                {skills.length ? <div className="skills-list">{skills.map((skill, index) => {
                  const name = typeof skill === "string" ? skill : valueOf(skill, "name", "skillName", "title");
                  return name ? <span className="skill-pill" key={valueOf(skill, "id", "skillId") || `${name}-${index}`}>{name}</span> : null;
                })}</div> : <p className="profile-reference-empty">Your skills will appear here after they are added.</p>}
              </article>

              <article className="dashboard-card profile-reference-card">
                <div className="profile-reference-heading"><h2>Resume</h2></div>
                {resume ? <div className="resume-content">
                  <div className="resume-file"><div className="resume-icon"><FileText size={22} /></div><div><strong>{valueOf(resume, "fileName", "name") || "Uploaded resume"}</strong><span>{valueOf(resume, "uploadedAt") ? `Uploaded ${new Date(resume.uploadedAt).toLocaleDateString()}` : "Resume uploaded"}</span></div></div>
                  <button type="button" className="secondary-button" onClick={() => navigate("/dashboard/cv-tailor")}><Upload size={15} />View / Replace</button>
                </div> : <div className="profile-reference-empty-row"><FileText size={22} /><span>No resume uploaded yet.</span><button type="button" className="secondary-button" onClick={() => navigate("/dashboard/cv-tailor")}><Upload size={15} />Upload Resume</button></div>}
              </article>

              <article className="dashboard-card profile-reference-card profile-saved-jobs-card">
                <div className="profile-reference-heading"><h2>Saved Jobs</h2><button type="button" className="secondary-button" onClick={() => navigate("/dashboard/jobs")}>View Jobs</button></div>
                {savedJobs.length ? <div className="profile-saved-jobs-list">{savedJobs.slice(0, 4).map((job, index) => {
                  const title = valueOf(job, "title", "jobTitle", "position") || "Saved opportunity";
                  const company = valueOf(job, "company", "companyName", "employer") || "Company";
                  const url = valueOf(job, "url", "applicationUrl", "applyUrl");
                  return <div className="profile-saved-job" key={valueOf(job, "id", "jobId") || `${title}-${index}`}><div className="profile-saved-job-icon"><Building2 size={18} /></div><div><strong>{title}</strong><span>{company}</span></div>{url && <a href={url} target="_blank" rel="noreferrer" aria-label={`View ${title}`}><ExternalLink size={15} /></a>}</div>;
                })}</div> : <div className="profile-reference-empty-row"><Bookmark size={21} /><span>You have not saved any jobs yet.</span><button type="button" className="secondary-button" onClick={() => navigate("/dashboard/jobs")}>Browse Jobs</button></div>}
              </article>
            </div>
          </section>
        )}
        {isEditing && <div className="profile-edit-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsEditing(false)}>
          <section className="profile-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
            <div className="profile-edit-dialog-heading"><div><span>Edit account</span><h2 id="profile-edit-title">Profile information</h2></div><button type="button" onClick={() => setIsEditing(false)} aria-label="Close profile editor"><X size={19} /></button></div>
            <form onSubmit={saveProfile} className="profile-edit-form">
              <label>Full Name<input name="fullName" value={editForm.fullName} onChange={handleEditChange} /></label>
              <label>Email Address *<input type="email" name="email" value={editForm.email} onChange={handleEditChange} required /></label>
              <label>Phone Number<input type="tel" name="phoneNumber" value={editForm.phoneNumber} onChange={handleEditChange} /></label>
              <label>Location<input name="location" value={editForm.location} onChange={handleEditChange} /></label>
              <label>Field of Study<input name="fieldOfStudy" value={editForm.fieldOfStudy} onChange={handleEditChange} /></label>
              <label>Education<input name="education" value={editForm.education} onChange={handleEditChange} /></label>
              <label className="profile-edit-wide">LinkedIn<input type="url" name="linkedin" value={editForm.linkedin} onChange={handleEditChange} placeholder="https://linkedin.com/in/your-profile" /></label>
              <label className="profile-edit-wide">Skills<input name="skills" value={editForm.skills} onChange={handleEditChange} placeholder="React, JavaScript, Python" /><small>Separate skills with commas.</small></label>
              {editMessage && <p className="profile-edit-message" role="alert">{editMessage}</p>}
              <div className="profile-edit-actions"><button type="button" className="secondary-button" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</button><button type="submit" className="primary-button" disabled={isSaving}><Save size={15} />{isSaving ? "Saving..." : "Save Changes"}</button></div>
            </form>
          </section>
        </div>}
      </main>
    </DashboardLayout>
  );
}

export default Profile;
