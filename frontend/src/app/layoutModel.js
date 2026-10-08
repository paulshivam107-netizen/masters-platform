import React from "react";
import {
  ApplicationsIcon,
  AdminIcon,
  DeadlinesIcon,
  DocsIcon,
  EssaysIcon,
  HomeIcon,
  InterviewIcon,
  MatrixIcon,
  RequirementsIcon,
  ResearchIcon,
  ShareIcon,
} from "./icons";

const BASE_NAV_GROUPS = [
  {
    id: "core",
    label: "Workspace",
    items: [
      { id: "home", label: "Today", icon: <HomeIcon /> },
      { id: "tracker", label: "Applications", icon: <ApplicationsIcon /> },
      { id: "essays", label: "Essays", icon: <EssaysIcon /> },
      { id: "interviews", label: "Interviews", icon: <InterviewIcon /> },
    ],
  },
  {
    id: "planning",
    label: "Planning",
    items: [
      { id: "deadlines", label: "Calendar", icon: <DeadlinesIcon /> },
      { id: "requirements", label: "Requirements", icon: <RequirementsIcon /> },
      { id: "matrix", label: "Compare", icon: <MatrixIcon /> },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    items: [
      { id: "docs", label: "Documents", icon: <DocsIcon /> },
      { id: "research", label: "Research", icon: <ResearchIcon /> },
      { id: "share", label: "Export & Share", icon: <ShareIcon /> },
    ],
  },
];

export function resolveNavGroups(user) {
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  if (!isAdmin) return BASE_NAV_GROUPS;

  return [
    ...BASE_NAV_GROUPS,
    {
      id: "admin",
      label: "Admin",
      items: [{ id: "admin", label: "Pilot Admin", icon: <AdminIcon /> }],
    },
  ];
}

export function resolvePageHeader({
  activeNav,
  selectedApplication,
  selectedEssay,
  activeDocsApplication,
}) {
  let pageHeading = "Today";
  let pageSubtitle = "Your next step, in one place.";

  if (activeNav === "compose") {
    pageHeading = selectedApplication
      ? `Essay Draft: ${selectedApplication.school_name}`
      : "Create a New Essay";
    pageSubtitle = selectedApplication
      ? `${selectedApplication.program_name} application essay workspace`
      : "Write and save a new draft for your applications";
  } else if (activeNav === "essays") {
    pageHeading = "Your essay library";
    pageSubtitle = "Open a draft to continue writing or review feedback";
  } else if (activeNav === "tracker") {
    pageHeading = "Your applications";
    pageSubtitle = "Manage schools, deadlines, fees, and requirements";
  } else if (activeNav === "deadlines") {
    pageHeading = "Your calendar";
    pageSubtitle = "Prioritize upcoming deadlines across your target schools";
  } else if (activeNav === "notifications") {
    pageHeading = "Updates";
    pageSubtitle =
      "Stay on top of deadlines, readiness gaps, and interview tasks";
  } else if (activeNav === "requirements") {
    pageHeading = "Application checklist";
    pageSubtitle =
      "Monitor essays, recommendations, and application completeness";
  } else if (activeNav === "matrix") {
    pageHeading = "Compare priorities";
    pageSubtitle = "Use your application details to decide where to focus next";
  } else if (activeNav === "interviews") {
    pageHeading = "Interview preparation";
    pageSubtitle =
      "Prepare stories, mock notes, and schedules for interview rounds";
  } else if (activeNav === "research") {
    pageHeading = "School research";
    pageSubtitle =
      "Capture program fit, outcomes, funding notes, and key links";
  } else if (activeNav === "share") {
    pageHeading = "Export & Share";
    pageSubtitle =
      "Export a summary, CSV, or calendar file to share your progress";
  } else if (activeNav === "docs") {
    pageHeading = "Document checklist";
    pageSubtitle = activeDocsApplication
      ? `Document checklist for ${activeDocsApplication.school_name}`
      : "Keep core application documents organized and submission-ready";
  } else if (activeNav === "profile") {
    pageHeading = "Profile";
    pageSubtitle =
      "Manage your account identity, admissions focus, and contact details";
  } else if (activeNav === "settings") {
    pageHeading = "Settings";
    pageSubtitle = "Make this workspace feel like yours";
  } else if (activeNav === "admin") {
    pageHeading = "Pilot Admin Panel";
    pageSubtitle =
      "Monitor activity, feedback, and usage signals during local and pilot runs";
  } else if (selectedEssay) {
    pageHeading = `${selectedEssay.school_name} Essay`;
    pageSubtitle = `${selectedEssay.program_type} essay review and version history`;
  } else if (selectedApplication) {
    pageHeading = `${selectedApplication.school_name} Workspace`;
    pageSubtitle = `${selectedApplication.program_name} application tasks, essays, and progress`;
  }

  return { pageHeading, pageSubtitle };
}
