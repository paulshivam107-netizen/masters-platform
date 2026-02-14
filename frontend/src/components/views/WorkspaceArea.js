import React from 'react';
import ProfileView from './workspace/ProfileView';
import SettingsView from './workspace/SettingsView';
import NotificationsView from './workspace/NotificationsView';
import MatrixView from './workspace/MatrixView';
import InterviewsView from './workspace/InterviewsView';
import ResearchView from './workspace/ResearchView';
import ShareView from './workspace/ShareView';
import DeadlinesView from './workspace/DeadlinesView';
import RequirementsView from './workspace/RequirementsView';
import DocsView from './workspace/DocsView';
import TrackerView from './workspace/TrackerView';
import HomeView from './workspace/HomeView';
import EssayFormView from './workspace/EssayFormView';
import EssayDetailView from './workspace/EssayDetailView';
import EssaysView from './workspace/EssaysView';

function WorkspaceArea({
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
  handleExportApplicationsCsv,
  handleExportDeadlinesICS,
  handleCopyShareSummary,
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
  handleDiscardApplicationDraft,
  filteredApplications,
  applicationSummary,
  formatCurrencyTotals,
  applicationSearch,
  setApplicationSearch,
  handleOpenApplicationForm,
  handleDeleteApplication,
  selectedApplication,
  essaysForSelectedApplication,
  selectedEssay,
  setSelectedEssay,
  setReview,
  setShowVersions,
  setShowForm,
  handleOpenNewEssayForm,
  handleDiscardEssayDraft,
  resolveEssayApplicationId,
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
  submitPilotFeedback,
  programCatalog,
  programCatalogLoading,
  onApplyProgramCatalogItem,
  onAssistOutline
}) {
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';
  return (
    <div className="workspace-area">
      {activeNav === 'profile' ? (
        <ProfileView
          user={user}
          essays={essays}
          logout={logout}
          profileFormData={profileFormData}
          handleProfileSave={handleProfileSave}
          handleProfileFieldChange={handleProfileFieldChange}
          profileSaving={profileSaving}
        />
      ) : activeNav === 'settings' ? (
        <SettingsView
          applications={applications}
          essays={essays}
          profileFormData={profileFormData}
          handleProfileFieldChange={handleProfileFieldChange}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          reducedMotion={reducedMotion}
          setReducedMotion={setReducedMotion}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          showHomeChecklist={showHomeChecklist}
          setShowHomeChecklist={setShowHomeChecklist}
          onboardingDismissed={onboardingDismissed}
          setOnboardingDismissed={setOnboardingDismissed}
          setOnboardingHidden={setOnboardingHidden}
          fetchReminderPreview={fetchReminderPreview}
          reminderLoading={reminderLoading}
          sendTestReminder={sendTestReminder}
          reminderSending={reminderSending}
          reminderPreview={reminderPreview}
          profileMessage={profileMessage}
          user={user}
          feedbackCategory={feedbackCategory}
          setFeedbackCategory={setFeedbackCategory}
          feedbackMessage={feedbackMessage}
          setFeedbackMessage={setFeedbackMessage}
          feedbackSending={feedbackSending}
          feedbackStatus={feedbackStatus}
          submitPilotFeedback={submitPilotFeedback}
        />
      ) : activeNav === 'notifications' ? (
        <NotificationsView
          activeNotifications={activeNotifications}
          markAllNotificationsRead={markAllNotificationsRead}
          dismissedNotifications={dismissedNotifications}
          remindersEnabled={Boolean(profileFormData?.email_reminders_enabled || user?.email_reminders_enabled)}
          clearNotificationHistory={clearNotificationHistory}
          setSelectedApplicationId={setSelectedApplicationId}
          setDocsApplicationId={setDocsApplicationId}
          handleNavChange={handleNavChange}
          markNotificationRead={markNotificationRead}
        />
      ) : activeNav === 'matrix' ? (
        <MatrixView
          decisionMatrixWeights={decisionMatrixWeights}
          setDecisionMatrixWeights={setDecisionMatrixWeights}
          applicationDecisionMatrixRows={applicationDecisionMatrixRows}
          handleNavChange={handleNavChange}
          handleOpenApplicationForm={handleOpenApplicationForm}
        />
      ) : activeNav === 'interviews' ? (
        <InterviewsView
          applications={applications}
          interviewPrepByApplication={interviewPrepByApplication}
          interviewApplications={interviewApplications}
          getDefaultInterviewPrep={getDefaultInterviewPrep}
          updateInterviewPrepField={updateInterviewPrepField}
          handleNavChange={handleNavChange}
          handleOpenApplicationForm={handleOpenApplicationForm}
        />
      ) : activeNav === 'research' ? (
        <ResearchView
          applications={applications}
          researchByApplication={researchByApplication}
          getDefaultResearchCard={getDefaultResearchCard}
          updateResearchField={updateResearchField}
          handleNavChange={handleNavChange}
          handleOpenApplicationForm={handleOpenApplicationForm}
        />
      ) : activeNav === 'share' ? (
        <ShareView
          handleExportApplicationsCsv={handleExportApplicationsCsv}
          handleExportDeadlinesICS={handleExportDeadlinesICS}
          handleCopyShareSummary={handleCopyShareSummary}
          researchApplications={researchApplications}
          interviewPrepByApplication={interviewPrepByApplication}
          averageReadiness={averageReadiness}
        />
      ) : activeNav === 'deadlines' ? (
        <DeadlinesView
          deadlineBuckets={deadlineBuckets}
          handleExportDeadlinesICS={handleExportDeadlinesICS}
          setTimelineMonthOffset={setTimelineMonthOffset}
          timelineMonthLabel={timelineMonthLabel}
          timelineCells={timelineCells}
          setSelectedApplicationId={setSelectedApplicationId}
          setDocsApplicationId={setDocsApplicationId}
          setActiveNav={setActiveNav}
          applicationsByDeadline={applicationsByDeadline}
          getDaysUntilDeadline={getDaysUntilDeadline}
          parseDate={parseDate}
        />
      ) : activeNav === 'requirements' ? (
        <RequirementsView
          requirementsSummary={requirementsSummary}
          essays={essays}
          averageReadiness={averageReadiness}
          applications={applications}
          getApplicationReadiness={getApplicationReadiness}
          setSelectedApplicationId={setSelectedApplicationId}
          setDocsApplicationId={setDocsApplicationId}
          setActiveNav={setActiveNav}
          applicationReadinessRows={applicationReadinessRows}
          DOC_TEMPLATES={DOC_TEMPLATES}
          handleOpenApplicationForm={handleOpenApplicationForm}
        />
      ) : activeNav === 'docs' ? (
        <DocsView
          applications={applications}
          activeDocsApplicationId={activeDocsApplicationId}
          setDocsApplicationId={setDocsApplicationId}
          setDocsCopySourceId={setDocsCopySourceId}
          docsCopySourceId={docsCopySourceId}
          copyDocsFromApplication={copyDocsFromApplication}
          docProgress={docProgress}
          activeDocsApplication={activeDocsApplication}
          getApplicationReadiness={getApplicationReadiness}
          DOC_TEMPLATES={DOC_TEMPLATES}
          activeDocsMap={activeDocsMap}
          activeDocsScopeKey={activeDocsScopeKey}
          updateDocStatus={updateDocStatus}
          handleOpenApplicationForm={handleOpenApplicationForm}
          handleNavChange={handleNavChange}
        />
      ) : activeNav === 'tracker' ? (
        <TrackerView
          handleOpenApplicationForm={handleOpenApplicationForm}
          applicationSearch={applicationSearch}
          setApplicationSearch={setApplicationSearch}
          applicationSummary={applicationSummary}
          formatCurrencyTotals={formatCurrencyTotals}
          showApplicationForm={showApplicationForm}
          editingApplicationId={editingApplicationId}
          handleApplicationSubmit={handleApplicationSubmit}
          applicationFormData={applicationFormData}
          setApplicationFormData={setApplicationFormData}
          UNIVERSITY_OPTIONS={UNIVERSITY_OPTIONS}
          DEGREE_OPTIONS={DEGREE_OPTIONS}
          applicationDegreeChoice={applicationDegreeChoice}
          setApplicationDegreeChoice={setApplicationDegreeChoice}
          setApplicationCustomDegree={setApplicationCustomDegree}
          applicationCustomDegree={applicationCustomDegree}
          applicationLoading={applicationLoading}
          setShowApplicationForm={setShowApplicationForm}
          resetApplicationForm={resetApplicationForm}
          handleDiscardApplicationDraft={handleDiscardApplicationDraft}
          applicationDraftRecovered={applicationDraftRecovered}
          filteredApplications={filteredApplications}
          getDaysUntilDeadline={getDaysUntilDeadline}
          getApplicationReadiness={getApplicationReadiness}
          parseDate={parseDate}
          handleDeleteApplication={handleDeleteApplication}
          programCatalog={programCatalog}
          programCatalogLoading={programCatalogLoading}
          onApplyProgramCatalogItem={onApplyProgramCatalogItem}
        />
      ) : activeNav === 'home' && !showForm && !selectedEssay ? (
        <HomeView
          selectedApplication={selectedApplication}
          essaysForSelectedApplication={essaysForSelectedApplication}
          selectedEssay={selectedEssay}
          setSelectedEssay={setSelectedEssay}
          setReview={setReview}
          setShowVersions={setShowVersions}
          setShowForm={setShowForm}
          handleOpenNewEssayForm={handleOpenNewEssayForm}
          handleOpenApplicationForm={handleOpenApplicationForm}
          handleNavChange={handleNavChange}
          parseDate={parseDate}
          getApplicationReadiness={getApplicationReadiness}
          user={user}
          applications={applications}
          applicationSummary={applicationSummary}
          docProgressOverall={docProgressOverall}
          DOC_TEMPLATES={DOC_TEMPLATES}
          essays={essays}
          resolveEssayApplicationId={resolveEssayApplicationId}
          setSelectedApplicationId={setSelectedApplicationId}
          showHomeChecklist={showHomeChecklist}
          onboardingDismissed={onboardingDismissed}
          setOnboardingDismissed={setOnboardingDismissed}
          onboardingHidden={onboardingHidden}
          setOnboardingHidden={setOnboardingHidden}
        />
      ) : activeNav === 'essays' && !showForm && !selectedEssay ? (
        <EssaysView
          essays={essays}
          handleOpenNewEssayForm={handleOpenNewEssayForm}
          setSelectedEssay={setSelectedEssay}
          setSelectedApplicationId={setSelectedApplicationId}
          setReview={setReview}
          setShowVersions={setShowVersions}
          setShowForm={setShowForm}
          resolveEssayApplicationId={resolveEssayApplicationId}
        />
      ) : showForm ? (
        <EssayFormView
          isAdmin={isAdmin}
          formData={formData}
          setFormData={setFormData}
          UNIVERSITY_OPTIONS={UNIVERSITY_OPTIONS}
          essayDegreeChoice={essayDegreeChoice}
          setEssayDegreeChoice={setEssayDegreeChoice}
          setEssayCustomDegree={setEssayCustomDegree}
          DEGREE_OPTIONS={DEGREE_OPTIONS}
          essayCustomDegree={essayCustomDegree}
          handleSubmit={handleSubmit}
          loading={loading}
          setShowForm={setShowForm}
          setActiveNav={setActiveNav}
          essayDraftRecovered={essayDraftRecovered}
          handleDiscardEssayDraft={handleDiscardEssayDraft}
          onAssistOutline={onAssistOutline}
        />
      ) : selectedEssay ? (
        <EssayDetailView
          selectedEssay={selectedEssay}
          loading={loading}
          handleReview={handleReview}
          showVersions={showVersions}
          setShowVersions={setShowVersions}
          fetchVersions={fetchVersions}
          handleDelete={handleDelete}
          versions={versions}
          handleSelectVersion={handleSelectVersion}
          handleCreateNewVersion={handleCreateNewVersion}
          versionOptionRows={versionOptionRows}
          versionDiffSummary={versionDiffSummary}
          selectedDiffBaseId={selectedDiffBaseId}
          setVersionDiffSelection={setVersionDiffSelection}
          selectedDiffCompareId={selectedDiffCompareId}
          versionDiffRows={versionDiffRows}
          review={review}
        />
      ) : (
        <div className="empty-state-main">
          <h2>Select an essay to begin</h2>
          <p>Choose a saved essay from the right panel to view details and generate review feedback.</p>
        </div>
      )}
    </div>
  );
}

export default WorkspaceArea;
