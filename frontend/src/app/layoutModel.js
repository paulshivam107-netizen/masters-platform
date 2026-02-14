import React from 'react';
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
  ShareIcon
} from './icons';

const BASE_NAV_GROUPS = [
  {
    id: 'core',
    label: 'Core',
    items: [
      { id: 'home', label: 'Overview', icon: <HomeIcon /> },
      { id: 'essays', label: 'Essays', icon: <EssaysIcon /> },
      { id: 'tracker', label: 'Applications', icon: <ApplicationsIcon /> }
    ]
  },
  {
    id: 'planning',
    label: 'Planning',
    items: [
      { id: 'deadlines', label: 'Deadlines', icon: <DeadlinesIcon /> },
      { id: 'requirements', label: 'Requirements', icon: <RequirementsIcon /> },
      { id: 'matrix', label: 'Decision Matrix', icon: <MatrixIcon /> },
      { id: 'interviews', label: 'Interviews', icon: <InterviewIcon /> }
    ]
  },
  {
    id: 'resources',
    label: 'Resources',
    items: [
      { id: 'docs', label: 'Documents', icon: <DocsIcon /> },
      { id: 'research', label: 'Research', icon: <ResearchIcon /> },
      { id: 'share', label: 'Export & Share', icon: <ShareIcon /> }
    ]
  }
];

export function resolveNavGroups(user) {
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';
  if (!isAdmin) return BASE_NAV_GROUPS;

  return [
    ...BASE_NAV_GROUPS,
    {
      id: 'admin',
      label: 'Admin',
      items: [{ id: 'admin', label: 'Pilot Admin', icon: <AdminIcon /> }]
    }
  ];
}

export function resolvePageHeader({
  activeNav,
  selectedApplication,
  selectedEssay,
  activeDocsApplication
}) {
  let pageHeading = 'Build your next chapter';
  let pageSubtitle = "Master's Application Command Center";

  if (activeNav === 'compose') {
    pageHeading = selectedApplication ? `Essay Draft: ${selectedApplication.school_name}` : 'Create a New Essay';
    pageSubtitle = selectedApplication
      ? `${selectedApplication.program_name} application essay workspace`
      : 'Write and save a new draft for your applications';
  } else if (activeNav === 'essays') {
    pageHeading = 'Essay Library';
    pageSubtitle = 'Browse existing drafts and open one to edit or review';
  } else if (activeNav === 'tracker') {
    pageHeading = 'Application Portfolio';
    pageSubtitle = 'Manage schools, deadlines, fees, and requirements';
  } else if (activeNav === 'deadlines') {
    pageHeading = 'Deadlines Radar';
    pageSubtitle = 'Prioritize upcoming deadlines across your target schools';
  } else if (activeNav === 'notifications') {
    pageHeading = 'Notification Center';
    pageSubtitle = 'Stay on top of deadlines, readiness gaps, and interview tasks';
  } else if (activeNav === 'requirements') {
    pageHeading = 'Requirements Tracker';
    pageSubtitle = 'Monitor essays, recommendations, and application completeness';
  } else if (activeNav === 'matrix') {
    pageHeading = 'Decision Matrix';
    pageSubtitle = 'Rank schools using weighted readiness, deadlines, costs, and outcomes';
  } else if (activeNav === 'interviews') {
    pageHeading = 'Interview Prep Workspace';
    pageSubtitle = 'Prepare stories, mock notes, and schedules for interview rounds';
  } else if (activeNav === 'research') {
    pageHeading = 'School Research Cards';
    pageSubtitle = 'Capture program fit, outcomes, funding notes, and key links';
  } else if (activeNav === 'share') {
    pageHeading = 'Export & Share';
    pageSubtitle = 'Export a summary, CSV, or calendar file to share your progress';
  } else if (activeNav === 'docs') {
    pageHeading = 'Document Center';
    pageSubtitle = activeDocsApplication
      ? `Document checklist for ${activeDocsApplication.school_name}`
      : 'Keep core application documents organized and submission-ready';
  } else if (activeNav === 'profile') {
    pageHeading = 'Profile';
    pageSubtitle = 'Manage your account identity, admissions focus, and contact details';
  } else if (activeNav === 'settings') {
    pageHeading = 'Settings';
    pageSubtitle = 'Control account, accessibility, and workflow preferences';
  } else if (activeNav === 'admin') {
    pageHeading = 'Pilot Admin Panel';
    pageSubtitle = 'Monitor activity, feedback, and usage signals during local and pilot runs';
  } else if (selectedEssay) {
    pageHeading = `${selectedEssay.school_name} Essay`;
    pageSubtitle = `${selectedEssay.program_type} essay review and version history`;
  } else if (selectedApplication) {
    pageHeading = `${selectedApplication.school_name} Workspace`;
    pageSubtitle = `${selectedApplication.program_name} application tasks, essays, and progress`;
  }

  return { pageHeading, pageSubtitle };
}
