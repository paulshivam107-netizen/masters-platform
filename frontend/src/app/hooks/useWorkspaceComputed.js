import { resolveNavGroups, resolvePageHeader } from '../layoutModel';
import { buildWorkspaceAreaProps } from '../workspaceProps';
import { createDocumentActions } from '../documentActions';
import { createExportActions } from '../exportActions';
import {
  buildApplicationDecisionMatrixRows,
  buildApplicationReadinessRows,
  buildApplicationSummary,
  buildAverageReadiness,
  buildDeadlineBuckets,
  buildDocProgress,
  buildDocProgressOverall,
  buildGeneratedNotifications,
  buildInterviewApplications,
  buildRequirementsSummary,
  buildResearchApplications,
  buildTimelineData,
  buildVersionDiffRows,
  filterApplications,
  formatCurrencyTotals,
  getApplicationReadiness as getApplicationReadinessCalc,
  getDaysUntilDeadline,
  getEssayCountForApplication as getEssayCountForApplicationCalc,
  parseDate
} from '../derived';

export function useWorkspaceComputed({
  user,
  logout,
  state,
  actions,
  constants,
  helpers
}) {
  const {
    activeNav,
    essays,
    profileFormData,
    profileSaving,
    applications,
    isDarkMode,
    setIsDarkMode,
    reducedMotion,
    setReducedMotion,
    confirmDelete,
    setConfirmDelete,
    showHomeChecklist,
    setShowHomeChecklist,
    reminderLoading,
    reminderSending,
    reminderPreview,
    profileMessage,
    setSelectedApplicationId,
    setDocsApplicationId,
    decisionMatrixWeights,
    setDecisionMatrixWeights,
    interviewPrepByApplication,
    setInterviewPrepByApplication,
    researchByApplication,
    setResearchByApplication,
    timelineMonthOffset,
    setTimelineMonthOffset,
    docsCopySourceId,
    setDocsCopySourceId,
    showApplicationForm,
    editingApplicationId,
    applicationFormData,
    setApplicationFormData,
    applicationDegreeChoice,
    setApplicationDegreeChoice,
    setApplicationCustomDegree,
    applicationCustomDegree,
    applicationLoading,
    setShowApplicationForm,
    applicationSearch,
    setApplicationSearch,
    selectedEssay,
    setSelectedEssay,
    setReview,
    setShowVersions,
    setShowForm,
    showForm,
    formData,
    setFormData,
    loading,
    essayDegreeChoice,
    setEssayDegreeChoice,
    setEssayCustomDegree,
    essayCustomDegree,
    setActiveNav,
    showVersions,
    versions,
    versionDiffSelection,
    setVersionDiffSelection,
    review,
    selectedApplicationId,
    docStatusByApplication,
    setDocStatusByApplication,
    docsApplicationId,
    dismissedNotifications,
    onboardingDismissed,
    setOnboardingDismissed,
    onboardingHidden,
    setOnboardingHidden,
    essayDraftRecovered,
    applicationDraftRecovered,
    feedbackCategory,
    setFeedbackCategory,
    feedbackMessage,
    setFeedbackMessage,
    feedbackSending,
    feedbackStatus
  } = state;

  const {
    DEGREE_OPTIONS,
    UNIVERSITY_OPTIONS,
    DOC_TEMPLATES
  } = constants;

  const {
    getDocScopeKey,
    getDefaultInterviewPrep,
    getDefaultResearchCard,
    getVersionIdentity
  } = helpers;

  const {
    handleProfileSave,
    handleProfileFieldChange,
    fetchReminderPreview,
    sendTestReminder,
    markAllNotificationsRead,
    clearNotificationHistory,
    markNotificationRead,
    handleNavChange,
    handleApplicationSubmit,
    resetApplicationForm,
    handleOpenApplicationForm,
    handleDeleteApplication,
    handleOpenNewEssayForm,
    handleSubmit,
    fetchVersions,
    handleReview,
    handleDelete,
    handleSelectVersion,
    handleCreateNewVersion,
    handleViewAllApplications,
    handleSelectSidebarApplication,
    resolveEssayApplicationId,
    handleDiscardEssayDraft,
    handleDiscardApplicationDraft,
    submitPilotFeedback
  } = actions;

  const getEssayCountForApplication = (application) =>
    getEssayCountForApplicationCalc(application, essays);

  const getApplicationReadiness = (application) =>
    getApplicationReadinessCalc({
      application,
      essays,
      docStatusByApplication,
      DOC_TEMPLATES,
      getDocScopeKey
    });

  const applicationSummary = buildApplicationSummary({
    applications,
    getDaysUntilDeadlineFn: getDaysUntilDeadline
  });

  const reminderDayMarkers = (profileFormData.reminder_days || '30,14,7,1')
    .split(',')
    .map((day) => Number(day.trim()))
    .filter((day) => Number.isFinite(day) && day >= 0);

  const applicationReadinessRows = buildApplicationReadinessRows({
    applications,
    getApplicationReadinessFn: getApplicationReadiness
  });
  const averageReadiness = buildAverageReadiness(applicationReadinessRows);

  const generatedNotifications = buildGeneratedNotifications({
    applicationReadinessRows,
    getDaysUntilDeadlineFn: getDaysUntilDeadline,
    docStatusByApplication,
    DOC_TEMPLATES,
    getDocScopeKey,
    reminderDayMarkers
  });

  const activeNotifications = generatedNotifications.filter(
    (notification) => !dismissedNotifications[notification.id]
  );
  const notificationCount = activeNotifications.length;

  const applicationDecisionMatrixRows = buildApplicationDecisionMatrixRows({
    applications,
    applicationReadinessRows,
    getDaysUntilDeadlineFn: getDaysUntilDeadline,
    decisionMatrixWeights,
    DOC_TEMPLATES
  });

  const versionOptionRows = versions.map((version, idx) => ({
    ...version,
    __identity: getVersionIdentity(version, idx)
  }));
  const fallbackCompare = versionOptionRows[0]?.__identity || '';
  const fallbackBase = versionOptionRows[1]?.__identity || fallbackCompare;
  const selectedDiffBaseId = versionDiffSelection.base || fallbackBase;
  const selectedDiffCompareId = versionDiffSelection.compare || fallbackCompare;
  const diffBaseVersion =
    versionOptionRows.find((version) => version.__identity === selectedDiffBaseId) || null;
  const diffCompareVersion =
    versionOptionRows.find((version) => version.__identity === selectedDiffCompareId) || null;
  const versionDiffRows =
    diffBaseVersion && diffCompareVersion
      ? buildVersionDiffRows(diffBaseVersion.essay_content, diffCompareVersion.essay_content)
      : [];
  const versionDiffSummary = versionDiffRows.reduce(
    (acc, row) => {
      if (row.type === 'added') acc.added += 1;
      if (row.type === 'removed') acc.removed += 1;
      if (row.type === 'changed') acc.changed += 1;
      return acc;
    },
    { added: 0, removed: 0, changed: 0 }
  );

  const selectedApplication =
    applications.find((application) => application.id === selectedApplicationId) || null;

  const essaysForSelectedApplication = selectedApplication
    ? essays.filter((essay) => {
        if (essay.application_id === selectedApplication.id) return true;
        const schoolMatches =
          (essay.school_name || '').trim().toLowerCase() ===
          (selectedApplication.school_name || '').trim().toLowerCase();
        const degreeMatches =
          (essay.program_type || '').trim().toLowerCase() ===
          (selectedApplication.program_name || '').trim().toLowerCase();
        return schoolMatches && degreeMatches;
      })
    : essays;

  const resolveEssayApplicationIdLocal = (essay) => {
    if (essay.application_id) return essay.application_id;
    const matched = applications.find(
      (application) =>
        (application.school_name || '').trim().toLowerCase() ===
          (essay.school_name || '').trim().toLowerCase() &&
        (application.program_name || '').trim().toLowerCase() ===
          (essay.program_type || '').trim().toLowerCase()
    );
    return matched?.id || null;
  };

  const filteredApplications = filterApplications({
    applications,
    applicationSearch,
    parseDateFn: parseDate
  });
  const sidebarApplications = applicationSearch.trim() ? filteredApplications : applications;
  const sidebarPreviewLimit = 4;
  const visibleSidebarApplications = sidebarApplications.slice(0, sidebarPreviewLimit);
  const hasMoreSidebarApplications = sidebarApplications.length > sidebarPreviewLimit;

  const { timelineMonthLabel, timelineCells, applicationsByDeadline } = buildTimelineData({
    applications,
    timelineMonthOffset,
    parseDateFn: parseDate
  });

  const deadlineBuckets = buildDeadlineBuckets({
    applicationsByDeadline,
    getDaysUntilDeadlineFn: getDaysUntilDeadline
  });

  const requirementsSummary = buildRequirementsSummary(applications);
  const activeDocsApplicationId = docsApplicationId || selectedApplicationId || applications[0]?.id || null;
  const activeDocsApplication =
    applications.find((application) => application.id === activeDocsApplicationId) || null;
  const activeDocsScopeKey = getDocScopeKey(activeDocsApplicationId);
  const activeDocsMap = docStatusByApplication[activeDocsScopeKey] || {};

  const docProgress = buildDocProgress({ DOC_TEMPLATES, activeDocsMap });
  const docProgressOverall = buildDocProgressOverall({
    applications,
    docStatusByApplication,
    getDocScopeKey,
    DOC_TEMPLATES
  });

  const interviewApplications = buildInterviewApplications({
    applications,
    interviewPrepByApplication
  });
  const researchApplications = buildResearchApplications({
    applications,
    researchByApplication
  });

  const { pageHeading, pageSubtitle } = resolvePageHeader({
    activeNav,
    selectedApplication,
    selectedEssay,
    activeDocsApplication
  });

  const navGroups = resolveNavGroups(user);

  const { updateDocStatus, copyDocsFromApplication, updateInterviewPrepField, updateResearchField } =
    createDocumentActions({
      getDocScopeKey,
      docsApplicationId,
      setDocStatusByApplication,
      docsCopySourceId,
      activeDocsApplicationId,
      docStatusByApplication,
      setInterviewPrepByApplication,
      getDefaultInterviewPrep,
      setResearchByApplication,
      getDefaultResearchCard
    });

  const exportActions = createExportActions({
    applications,
    essays,
    interviewPrepByApplication,
    researchByApplication,
    getApplicationReadiness,
    parseDate
  });

  const workspaceAreaProps = buildWorkspaceAreaProps({
    activeNav,
    user,
    essays,
    profileFormData,
    logout,
    handleProfileSave,
    handleProfileFieldChange,
    profileSaving,
    applications,
    isDarkMode,
    setIsDarkMode,
    reducedMotion,
    setReducedMotion,
    confirmDelete,
    setConfirmDelete,
    showHomeChecklist,
    setShowHomeChecklist,
    fetchReminderPreview,
    reminderLoading,
    sendTestReminder,
    reminderSending,
    reminderPreview,
    profileMessage,
    activeNotifications,
    markAllNotificationsRead,
    dismissedNotifications,
    clearNotificationHistory,
    setSelectedApplicationId,
    setDocsApplicationId,
    handleNavChange,
    markNotificationRead,
    decisionMatrixWeights,
    setDecisionMatrixWeights,
    applicationDecisionMatrixRows,
    interviewPrepByApplication,
    interviewApplications,
    getDefaultInterviewPrep,
    updateInterviewPrepField,
    researchByApplication,
    getDefaultResearchCard,
    updateResearchField,
    handleExportApplicationsCsv: exportActions.handleExportApplicationsCsv,
    handleExportDeadlinesICS: exportActions.handleExportDeadlinesICS,
    handleCopyShareSummary: exportActions.handleCopyShareSummary,
    averageReadiness,
    deadlineBuckets,
    timelineMonthOffset,
    setTimelineMonthOffset,
    timelineMonthLabel,
    timelineCells,
    applicationsByDeadline,
    getDaysUntilDeadline,
    parseDate,
    requirementsSummary,
    getApplicationReadiness,
    applicationReadinessRows,
    DOC_TEMPLATES,
    activeDocsApplication,
    activeDocsApplicationId,
    docsCopySourceId,
    setDocsCopySourceId,
    copyDocsFromApplication,
    docProgress,
    activeDocsMap,
    activeDocsScopeKey,
    updateDocStatus,
    showApplicationForm,
    editingApplicationId,
    handleApplicationSubmit,
    applicationFormData,
    setApplicationFormData,
    UNIVERSITY_OPTIONS,
    DEGREE_OPTIONS,
    applicationDegreeChoice,
    setApplicationDegreeChoice,
    setApplicationCustomDegree,
    applicationCustomDegree,
    applicationLoading,
    setShowApplicationForm,
    resetApplicationForm,
    filteredApplications,
    applicationSummary,
    formatCurrencyTotals,
    applicationSearch,
    setApplicationSearch,
    handleDeleteApplication,
    selectedApplication,
    essaysForSelectedApplication,
    selectedEssay,
    setSelectedEssay,
    setReview,
    setShowVersions,
    setShowForm,
    handleOpenNewEssayForm,
    handleOpenApplicationForm,
    handleDiscardEssayDraft,
    handleDiscardApplicationDraft,
    resolveEssayApplicationId: resolveEssayApplicationId || resolveEssayApplicationIdLocal,
    docProgressOverall,
    onboardingDismissed,
    setOnboardingDismissed,
    onboardingHidden,
    setOnboardingHidden,
    essayDraftRecovered,
    applicationDraftRecovered,
    showForm,
    formData,
    setFormData,
    handleSubmit,
    loading,
    essayDegreeChoice,
    setEssayDegreeChoice,
    setEssayCustomDegree,
    essayCustomDegree,
    setActiveNav,
    showVersions,
    fetchVersions,
    handleReview,
    handleDelete,
    versions,
    handleSelectVersion,
    handleCreateNewVersion,
    versionOptionRows,
    versionDiffSummary,
    selectedDiffBaseId,
    setVersionDiffSelection,
    selectedDiffCompareId,
    versionDiffRows,
    review,
    researchApplications,
    feedbackCategory,
    setFeedbackCategory,
    feedbackMessage,
    setFeedbackMessage,
    feedbackSending,
    feedbackStatus,
    submitPilotFeedback
  });

  return {
    notificationCount,
    navGroups,
    pageHeading,
    pageSubtitle,
    workspaceAreaProps,
    visibleSidebarApplications,
    hasMoreSidebarApplications,
    sidebarApplications,
    getEssayCountForApplication,
    parseDate,
    handleViewAllApplications,
    handleSelectSidebarApplication
  };
}
