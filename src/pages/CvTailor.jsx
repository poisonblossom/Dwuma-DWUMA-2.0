import { useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Settings,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";

import logo from "../assets/logo.svg";
import DashboardLayout from "../Components/dashboard/DashboardLayout";
import "../Components/dashboard/Dashboard.css";
import { tailorCv } from "../Components/services/cvTailorService";
import "./CvTailor.css";

function CvTailor() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function goToPage(path) {
    closeMenu();
    navigate(path);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function validateAndSaveFile(file) {
    if (!file) {
      return;
    }

    const allowedExtensions = ["pdf", "doc", "docx"];

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    const maximumFileSize = 10 * 1024 * 1024;

    if (!extension || !allowedExtensions.includes(extension)) {
      setSelectedFile(null);

      setStatusMessage(
        "Please upload a PDF, DOC or DOCX file."
      );

      return;
    }

    if (file.size > maximumFileSize) {
      setSelectedFile(null);

      setStatusMessage(
        "The selected file is larger than 10MB."
      );

      return;
    }

    setSelectedFile(file);
    setStatusMessage("");
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    validateAndSaveFile(file);

    event.target.value = "";
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    validateAndSaveFile(file);
  }

  function resetCvTailor() {
    setSelectedFile(null);
    setJobDescription("");
    setJobTitle("");
    setCompanyName("");
    setStatusMessage("");

    sessionStorage.removeItem(
      "dwumaCvTailorRequest"
    );

    sessionStorage.removeItem(
      "dwumaCvTailorResult"
    );
  }

  async function handleTailorCv() {
    if (!selectedFile) {
      setStatusMessage(
        "Upload your CV before tailoring it."
      );

      return;
    }

    if (!jobTitle.trim()) {
      setStatusMessage(
        "Add the target job title before tailoring your CV."
      );
      return;
    }

    const cvTailorRequest = {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim(),
      jobDescription: jobDescription.trim(),
      submittedAt: new Date().toISOString(),
    };

    /*
      Temporary frontend storage.

      Only the upload details are stored. The actual CV
      file is not stored in sessionStorage.
    */
    sessionStorage.setItem(
      "dwumaCvTailorRequest",
      JSON.stringify(cvTailorRequest)
    );

    sessionStorage.removeItem("dwumaCvTailorResult");
    setIsSubmitting(true);
    setStatusMessage("");

    try {
      const result = await tailorCv({
        file: selectedFile,
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription.trim(),
        companyName: companyName.trim(),
      });
      sessionStorage.setItem(
        "dwumaCvTailorResult",
        JSON.stringify({
          type: "tailored-cv",
          previewText: result.tailoredCv,
          tailoredCv: result.tailoredCv,
          atsScore: result.atsScore,
          atsSummary: result.atsSummary,
          matchedKeywords: result.matchedKeywords || [],
          missingKeywords: result.missingKeywords || [],
          changelog: result.changelog || [],
          changesMade: result.changelog?.length || 0,
          improvements: (result.changelog || []).map((change) => change.reason),
        })
      );
      navigate("/dashboard/cv-tailor/results");
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardLayout pageTitle="CV Tailor">
    <main className="cv-tailor-screen">
      <header className="cv-tailor-header">
        <button
          type="button"
          className="cv-tailor-logo-button"
          onClick={() => navigate("/dashboard")}
          aria-label="Go to dashboard"
        >
          <img
            src={logo}
            alt="DWUMA"
            className="cv-tailor-logo"
          />
        </button>
      </header>

      <section className="cv-tailor-body">
        <button
          type="button"
          className="cv-tailor-menu-button"
          onClick={() =>
            setMenuOpen((currentValue) => !currentValue)
          }
          aria-label={
            menuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={menuOpen}
        >
          <Menu size={29} strokeWidth={1.8} />
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              className="cv-tailor-menu-overlay"
              onClick={closeMenu}
              aria-label="Close menu"
            />

            <aside className="cv-tailor-menu">
              <button
                type="button"
                onClick={() =>
                  goToPage("/dashboard")
                }
              >
                <LayoutDashboard size={17} />

                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  goToPage(
                    "/dashboard/interview-coach"
                  )
                }
              >
                <UsersRound size={17} />

                <span>Interview Coach</span>
              </button>

              <button
                type="button"
                className="cv-tailor-menu-active"
                onClick={closeMenu}
              >
                <FileText size={17} />

                <span>CV Tailor</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  goToPage("/dashboard/jobs")
                }
              >
                <BriefcaseBusiness size={17} />

                <span>Jobs</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  goToPage("/dashboard/profile")
                }
              >
                <UserRound size={17} />

                <span>Profile</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  goToPage(
                    "/dashboard/notifications"
                  )
                }
              >
                <Bell size={17} />

                <span>Notifications</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  goToPage("/dashboard/settings")
                }
              >
                <Settings size={17} />

                <span>Settings</span>
              </button>
            </aside>
          </>
        )}

        <div className="cv-tailor-content">
          <div className="cv-tailor-heading">
            <h1>CV Tailor</h1>

            <p>
              Upload your CV and tailor it for the role
              you are applying for.
            </p>
          </div>

          <section
            className={`cv-upload-card ${
              isDragging
                ? "cv-upload-card-dragging"
                : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="cv-upload-inner">
              <div className="cv-upload-icon-wrapper">
                <Upload
                  className="cv-upload-icon"
                  size={42}
                  strokeWidth={1.8}
                />
              </div>

              <h2>
                {selectedFile
                  ? selectedFile.name
                  : "Drag & drop your CV here"}
              </h2>

              <p>
                {selectedFile
                  ? "Your CV has been selected successfully."
                  : "or click the button below to browse your files"}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                hidden
              />

              <div className="cv-upload-actions">
                <button
                  type="button"
                  className="cv-upload-button"
                  onClick={openFilePicker}
                >
                  <Upload size={17} strokeWidth={2.2} />

                  <span>
                    {selectedFile
                      ? "Change CV"
                      : "Upload CV"}
                  </span>
                </button>

                {selectedFile && (
                  <button
                    type="button"
                    className="cv-remove-file-button"
                    onClick={() => {
                      setSelectedFile(null);
                      setStatusMessage("");
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <small>
                Supported formats: PDF, DOCX and DOC.
                Maximum size: 10MB.
              </small>
            </div>
          </section>

          <div className="cv-tailor-grid">
            <section className="cv-tailor-card">
              <div className="cv-card-heading">
                <span className="cv-card-icon">
                  <FileText
                    size={22}
                    strokeWidth={2}
                  />
                </span>

                <div>
                  <h2>Job Description</h2>

                  <p>
                    Paste the job description to tailor
                    your CV for a specific role.
                  </p>
                </div>
              </div>

              <div className="cv-target-fields">
                <label>
                  Target job title *
                  <input
                    value={jobTitle}
                    onChange={(event) => setJobTitle(event.target.value.slice(0, 120))}
                    placeholder="e.g. Junior DevOps Engineer"
                    maxLength={120}
                  />
                </label>
                <label>
                  Company
                  <input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value.slice(0, 120))}
                    placeholder="e.g. Google"
                    maxLength={120}
                  />
                </label>
              </div>

              <textarea
                value={jobDescription}
                onChange={(event) =>
                  setJobDescription(
                    event.target.value.slice(0, 2000)
                  )
                }
                placeholder="Paste the job description here..."
                maxLength={2000}
              />

              <span className="cv-character-count">
                {jobDescription.length}/2000 characters
              </span>

            </section>
          </div>

          {statusMessage && (
            <p
              className="cv-tailor-status"
              role="status"
            >
              {statusMessage}
            </p>
          )}

          <div className="cv-tailor-bottom-actions">
            <button
              type="button"
              className="cv-tailor-reset-button"
              onClick={resetCvTailor}
              disabled={isSubmitting}
            >
              Clear
            </button>

            <button
              type="button"
              className="cv-tailor-submit-button"
              onClick={handleTailorCv}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><LoaderCircle className="cv-tailor-spinner" size={17} />Tailoring your CV...</>
              ) : "Tailor My CV"}
            </button>
          </div>
        </div>
      </section>
    </main>
    </DashboardLayout>
  );
}

export default CvTailor;
