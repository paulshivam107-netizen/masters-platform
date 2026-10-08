import { useTheme } from "../../contexts/ThemeContext";
import { useWorkspaceNavigation } from "../workspaceNavigation";
import { useRef, useState } from "react";
import { createDefaultProfileForm } from "../formDefaults";
import { readStoredValue, readUserValue } from "../workspaceStorage";
import {
  loadApplicationDraft,
  loadEssayDraft,
  ONBOARDING_DISMISSED_KEY,
  ONBOARDING_HIDDEN_KEY,
} from "../drafts";

export function useAppState(userId) {
  const initialEssayDraft = loadEssayDraft(userId);
  const initialApplicationDraft = loadApplicationDraft(userId);
  const profileMenuRef = useRef(null);
  const [essays, setEssays] = useState([]);
  const [selectedEssay, setSelectedEssay] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAuth, setShowAuth] = useState("login");
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [activeNav, setActiveNav] = useWorkspaceNavigation();
  const [confirmDelete, setConfirmDelete] = useState(
    () => readStoredValue("ui_confirm_delete", true) !== false,
  );
  const [showHomeChecklist, setShowHomeChecklist] = useState(
    () => readStoredValue("ui_show_checklist", true) !== false,
  );
  const { reducedMotion, setReducedMotion } = useTheme();
  const [applications, setApplications] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [applicationSearch, setApplicationSearch] = useState("");
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [essayDegreeChoice, setEssayDegreeChoice] = useState("MBA");
  const [essayCustomDegree, setEssayCustomDegree] = useState("");
  const [applicationDegreeChoice, setApplicationDegreeChoice] = useState("MBA");
  const [applicationCustomDegree, setApplicationCustomDegree] = useState("");
  const [docStatusByApplication, setDocStatusByApplication] = useState(() =>
    readUserValue(userId, "ui_doc_status_by_application", {}),
  );
  const [docsApplicationId, setDocsApplicationId] = useState(null);
  const [docsCopySourceId, setDocsCopySourceId] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [reminderPreview, setReminderPreview] = useState(null);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [timelineMonthOffset, setTimelineMonthOffset] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [expandedNavGroups, setExpandedNavGroups] = useState({
    core: true,
    planning: true,
    resources: false,
  });
  const [dismissedNotifications, setDismissedNotifications] = useState(() =>
    readUserValue(userId, "ui_dismissed_notifications", {}),
  );
  const [interviewPrepByApplication, setInterviewPrepByApplication] = useState(
    () => readUserValue(userId, "ui_interview_prep_by_application", {}),
  );
  const [researchByApplication, setResearchByApplication] = useState(() =>
    readUserValue(userId, "ui_research_by_application", {}),
  );
  const [decisionMatrixWeights, setDecisionMatrixWeights] = useState(() =>
    readUserValue(userId, "ui_decision_matrix_weights", {
      readiness: 35,
      deadline: 25,
      affordability: 20,
      decision: 10,
      documents: 10,
    }),
  );
  const [versionDiffSelection, setVersionDiffSelection] = useState({
    base: "",
    compare: "",
  });
  const [profileFormData, setProfileFormData] = useState(
    createDefaultProfileForm,
  );
  const [formData, setFormData] = useState(initialEssayDraft.value);
  const [applicationFormData, setApplicationFormData] = useState(
    initialApplicationDraft.value,
  );
  const [essayDraftRecovered, setEssayDraftRecovered] = useState(
    initialEssayDraft.recovered,
  );
  const [applicationDraftRecovered, setApplicationDraftRecovered] = useState(
    initialApplicationDraft.recovered,
  );
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => readUserValue(userId, ONBOARDING_DISMISSED_KEY, false) === true,
  );
  const [onboardingHidden, setOnboardingHidden] = useState(
    () => readUserValue(userId, ONBOARDING_HIDDEN_KEY, false) === true,
  );
  const [feedbackCategory, setFeedbackCategory] = useState("general");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState("");

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
    setFeedbackStatus,
  };
}
