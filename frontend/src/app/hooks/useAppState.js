import { useRef, useState } from 'react';
import {
  createDefaultProfileForm
} from '../formDefaults';
import { DOC_GLOBAL_SCOPE, isLegacyDocMap } from '../helpers';
import {
  loadApplicationDraft,
  loadEssayDraft,
  ONBOARDING_DISMISSED_KEY,
  ONBOARDING_HIDDEN_KEY
} from '../drafts';

export function useAppState() {
  const initialEssayDraft = loadEssayDraft();
  const initialApplicationDraft = loadApplicationDraft();
  const profileMenuRef = useRef(null);
  const [essays, setEssays] = useState([]);
  const [selectedEssay, setSelectedEssay] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAuth, setShowAuth] = useState('login');
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('ui_theme') !== 'light');
  const [confirmDelete, setConfirmDelete] = useState(() => localStorage.getItem('ui_confirm_delete') !== 'false');
  const [showHomeChecklist, setShowHomeChecklist] = useState(() => localStorage.getItem('ui_show_checklist') !== 'false');
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('ui_reduced_motion') === 'true');
  const [applications, setApplications] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [applicationSearch, setApplicationSearch] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [essayDegreeChoice, setEssayDegreeChoice] = useState('MBA');
  const [essayCustomDegree, setEssayCustomDegree] = useState('');
  const [applicationDegreeChoice, setApplicationDegreeChoice] = useState('MBA');
  const [applicationCustomDegree, setApplicationCustomDegree] = useState('');
  const [docStatusByApplication, setDocStatusByApplication] = useState(() => {
    try {
      const savedByApp = localStorage.getItem('ui_doc_status_by_application');
      if (savedByApp) return JSON.parse(savedByApp);

      const legacy = localStorage.getItem('ui_doc_status_map');
      if (!legacy) return {};
      const parsed = JSON.parse(legacy);
      if (isLegacyDocMap(parsed)) {
        return { [DOC_GLOBAL_SCOPE]: parsed };
      }
      return parsed;
    } catch {
      return {};
    }
  });
  const [docsApplicationId, setDocsApplicationId] = useState(null);
  const [docsCopySourceId, setDocsCopySourceId] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [reminderPreview, setReminderPreview] = useState(null);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [timelineMonthOffset, setTimelineMonthOffset] = useState(0);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [expandedNavGroups, setExpandedNavGroups] = useState({
    core: true,
    planning: true,
    resources: true
  });
  const [dismissedNotifications, setDismissedNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('ui_dismissed_notifications');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [interviewPrepByApplication, setInterviewPrepByApplication] = useState(() => {
    try {
      const saved = localStorage.getItem('ui_interview_prep_by_application');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [researchByApplication, setResearchByApplication] = useState(() => {
    try {
      const saved = localStorage.getItem('ui_research_by_application');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [decisionMatrixWeights, setDecisionMatrixWeights] = useState(() => {
    try {
      const saved = localStorage.getItem('ui_decision_matrix_weights');
      if (saved) return JSON.parse(saved);
    } catch {
      // no-op
    }
    return {
      readiness: 35,
      deadline: 25,
      affordability: 20,
      decision: 10,
      documents: 10
    };
  });
  const [versionDiffSelection, setVersionDiffSelection] = useState({ base: '', compare: '' });
  const [profileFormData, setProfileFormData] = useState(createDefaultProfileForm);
  const [formData, setFormData] = useState(initialEssayDraft.value);
  const [applicationFormData, setApplicationFormData] = useState(initialApplicationDraft.value);
  const [essayDraftRecovered, setEssayDraftRecovered] = useState(initialEssayDraft.recovered);
  const [applicationDraftRecovered, setApplicationDraftRecovered] = useState(initialApplicationDraft.recovered);
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true'
  );
  const [onboardingHidden, setOnboardingHidden] = useState(
    () => localStorage.getItem(ONBOARDING_HIDDEN_KEY) === 'true'
  );
  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState('');

  return {
    profileMenuRef,
    essays,
    setEssays,
    selectedEssay,
    setSelectedEssay,
    review,
    setReview,
    loading,
    setLoading,
    showForm,
    setShowForm,
    showAuth,
    setShowAuth,
    versions,
    setVersions,
    showVersions,
    setShowVersions,
    activeNav,
    setActiveNav,
    isDarkMode,
    setIsDarkMode,
    confirmDelete,
    setConfirmDelete,
    showHomeChecklist,
    setShowHomeChecklist,
    reducedMotion,
    setReducedMotion,
    applications,
    setApplications,
    selectedApplicationId,
    setSelectedApplicationId,
    applicationSearch,
    setApplicationSearch,
    showApplicationForm,
    setShowApplicationForm,
    editingApplicationId,
    setEditingApplicationId,
    applicationLoading,
    setApplicationLoading,
    essayDegreeChoice,
    setEssayDegreeChoice,
    essayCustomDegree,
    setEssayCustomDegree,
    applicationDegreeChoice,
    setApplicationDegreeChoice,
    applicationCustomDegree,
    setApplicationCustomDegree,
    docStatusByApplication,
    setDocStatusByApplication,
    docsApplicationId,
    setDocsApplicationId,
    docsCopySourceId,
    setDocsCopySourceId,
    profileSaving,
    setProfileSaving,
    profileMessage,
    setProfileMessage,
    reminderPreview,
    setReminderPreview,
    reminderLoading,
    setReminderLoading,
    reminderSending,
    setReminderSending,
    timelineMonthOffset,
    setTimelineMonthOffset,
    globalSearch,
    setGlobalSearch,
    isProfileMenuOpen,
    setIsProfileMenuOpen,
    expandedNavGroups,
    setExpandedNavGroups,
    dismissedNotifications,
    setDismissedNotifications,
    interviewPrepByApplication,
    setInterviewPrepByApplication,
    researchByApplication,
    setResearchByApplication,
    decisionMatrixWeights,
    setDecisionMatrixWeights,
    versionDiffSelection,
    setVersionDiffSelection,
    profileFormData,
    setProfileFormData,
    formData,
    setFormData,
    applicationFormData,
    setApplicationFormData,
    essayDraftRecovered,
    setEssayDraftRecovered,
    applicationDraftRecovered,
    setApplicationDraftRecovered,
    onboardingDismissed,
    setOnboardingDismissed,
    onboardingHidden,
    setOnboardingHidden,
    feedbackCategory,
    setFeedbackCategory,
    feedbackMessage,
    setFeedbackMessage,
    feedbackSending,
    setFeedbackSending,
    feedbackStatus,
    setFeedbackStatus
  };
}
