import React from 'react';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  createAdminProgramCatalogItemApi,
  deleteAdminProgramCatalogItemApi,
  getAdminEventCoverageApi,
  getAdminEventBreakdownApi,
  getAdminEventsApi,
  getAdminFeedbackApi,
  getAdminOverviewApi,
  getAdminUsersApi,
  updateAdminProgramCatalogItemApi,
  updateAdminUserRoleApi,
  listProgramCatalogApi,
  assistEssayOutlineApi
} from './api';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import RightSidebar from './components/layout/RightSidebar';
import SidebarNav from './components/layout/SidebarNav';
import TopControls from './components/layout/TopControls';
import AdminView from './components/views/workspace/AdminView';
import WorkspaceArea from './components/views/WorkspaceArea';
import LandingPage from './components/public/LandingPage';
import ProgramsPage from './components/public/ProgramsPage';
import AuthPage from './components/public/AuthPage';
import { UNIVERSITY_OPTIONS, DEGREE_OPTIONS, DOC_TEMPLATES } from './app/constants';
import { getDefaultInterviewPrep, getDefaultResearchCard, getDocScopeKey, getVersionIdentity } from './app/helpers';
import { useAppState } from './app/hooks/useAppState';
import { useAppEffects } from './app/hooks/useAppEffects';
import { useAppActions } from './app/hooks/useAppActions';
import { useWorkspaceComputed } from './app/hooks/useWorkspaceComputed';
import { trackEvent } from './app/telemetry';

function AppContent() {
  const { user, logout, updateProfile } = useAuth();
  const {
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
  } = useAppState();

  const actions = useAppActions({
    DEGREE_OPTIONS,
    getVersionIdentity,
    applications,
    selectedApplicationId,
    selectedEssay,
    confirmDelete,
    editingApplicationId,
    essayDegreeChoice,
    essayCustomDegree,
    applicationDegreeChoice,
    applicationCustomDegree,
    formData,
    applicationFormData,
    setEssays,
    setApplications,
    setVersions,
    setVersionDiffSelection,
    setShowVersions,
    setLoading,
    setFormData,
    setEssayDegreeChoice,
    setEssayCustomDegree,
    setShowForm,
    setSelectedEssay,
    setReview,
    setApplicationFormData,
    setApplicationDegreeChoice,
    setApplicationCustomDegree,
    setEditingApplicationId,
    setShowApplicationForm,
    setActiveNav,
    setApplicationLoading,
    setSelectedApplicationId,
    setDismissedNotifications,
    setIsProfileMenuOpen,
    setExpandedNavGroups,
    setDocsApplicationId,
    setApplicationSearch,
    globalSearch,
    updateProfile,
    profileFormData,
    user,
    setProfileFormData,
    profileMessage,
    setProfileMessage,
    setProfileSaving,
    setReminderLoading,
    setReminderPreview,
    setReminderSending,
    setEssayDraftRecovered,
    setApplicationDraftRecovered,
    feedbackCategory,
    feedbackMessage,
    activeNav,
    setFeedbackCategory,
    setFeedbackMessage,
    setFeedbackSending,
    setFeedbackStatus
  });

  useAppEffects({
    user,
    fetchEssays: actions.fetchEssays,
    fetchApplications: actions.fetchApplications,
    isDarkMode,
    confirmDelete,
    showHomeChecklist,
    reducedMotion,
    docStatusByApplication,
    dismissedNotifications,
    interviewPrepByApplication,
    researchByApplication,
    decisionMatrixWeights,
    activeNav,
    setExpandedNavGroups,
    setProfileFormData,
    profileMenuRef,
    setIsProfileMenuOpen,
    selectedApplicationId,
    applications,
    setSelectedApplicationId,
    docsApplicationId,
    setDocsApplicationId,
    showForm,
    showApplicationForm,
    showVersions,
    selectedEssay,
    setDocStatusByApplication,
    formData,
    applicationFormData,
    onboardingDismissed,
    onboardingHidden
  });

  const {
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
  } = useWorkspaceComputed({
    user,
    logout,
    state: {
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
    },
    actions,
    constants: {
      DEGREE_OPTIONS,
      UNIVERSITY_OPTIONS,
      DOC_TEMPLATES
    },
    helpers: {
      getDocScopeKey,
      getDefaultInterviewPrep,
      getDefaultResearchCard,
      getVersionIdentity
    }
  });

  const [adminLoading, setAdminLoading] = React.useState(false);
  const [adminError, setAdminError] = React.useState('');
  const [adminOverview, setAdminOverview] = React.useState(null);
  const [adminUsers, setAdminUsers] = React.useState([]);
  const [adminEvents, setAdminEvents] = React.useState([]);
  const [adminFeedback, setAdminFeedback] = React.useState([]);
  const [adminBreakdown, setAdminBreakdown] = React.useState([]);
  const [adminCoverage, setAdminCoverage] = React.useState(null);
  const [adminLastUpdatedAt, setAdminLastUpdatedAt] = React.useState(null);
  const [programCatalog, setProgramCatalog] = React.useState([]);
  const [programCatalogLoading, setProgramCatalogLoading] = React.useState(false);

  const isAdminUser = (user?.role || '').toLowerCase() === 'admin';
  const showAdminPage = isAdminUser && activeNav === 'admin';

  const loadAdminData = React.useCallback(async () => {
    if (!isAdminUser) return;
    try {
      setAdminLoading(true);
      setAdminError('');
      const [overview, users, events, feedback, breakdown, coverage] = await Promise.all([
        getAdminOverviewApi(),
        getAdminUsersApi(30),
        getAdminEventsApi(60),
        getAdminFeedbackApi(25),
        getAdminEventBreakdownApi(10),
        getAdminEventCoverageApi()
      ]);
      setAdminOverview(overview);
      setAdminUsers(users);
      setAdminEvents(events);
      setAdminFeedback(feedback);
      setAdminBreakdown(breakdown);
      setAdminCoverage(coverage);
      setAdminLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      setAdminError(error?.response?.data?.detail || 'Failed to load admin data');
    } finally {
      setAdminLoading(false);
    }
  }, [isAdminUser]);

  const handleAdminRoleChange = React.useCallback(
    async (targetUserId, nextRole) => {
      try {
        setAdminError('');
        await updateAdminUserRoleApi(targetUserId, nextRole);
        await loadAdminData();
      } catch (error) {
        const message = error?.response?.data?.detail || 'Failed to update user role';
        setAdminError(message);
        throw new Error(message);
      }
    },
    [loadAdminData]
  );

  React.useEffect(() => {
    if (showAdminPage) {
      loadAdminData();
    }
  }, [showAdminPage, loadAdminData]);

  React.useEffect(() => {
    if (!isAdminUser && activeNav === 'admin') {
      setActiveNav('home');
    }
  }, [isAdminUser, activeNav, setActiveNav]);

  React.useEffect(() => {
    if (isAdminUser) {
      setExpandedNavGroups((prev) => ({ ...prev, admin: true }));
    }
  }, [isAdminUser, setExpandedNavGroups]);

  const loadProgramCatalog = React.useCallback(async () => {
    if (!user) return;
    try {
      setProgramCatalogLoading(true);
      const response = await listProgramCatalogApi('', 200);
      setProgramCatalog(response?.items || []);
    } catch (error) {
      console.error('Failed to load program catalog:', error);
      setProgramCatalog([]);
    } finally {
      setProgramCatalogLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadProgramCatalog();
  }, [loadProgramCatalog]);

  const handleApplyProgramCatalogItem = React.useCallback(
    (item) => {
      if (!item) return;
      setApplicationFormData((prev) => ({
        ...prev,
        school_name: item.school_name || prev.school_name,
        program_name: item.program_name || prev.program_name,
        fee_currency: item.fee_currency || prev.fee_currency || 'USD',
        application_fee:
          item.application_fee === null || item.application_fee === undefined
            ? prev.application_fee
            : String(item.application_fee),
        deadline: item.deadline_round_1 || prev.deadline,
        requirements_notes: prev.requirements_notes || ''
      }));

      const normalizedDegree = (item.degree || item.program_name || '').trim();
      if (DEGREE_OPTIONS.includes(normalizedDegree) && normalizedDegree !== 'Other') {
        setApplicationDegreeChoice(normalizedDegree);
        setApplicationCustomDegree('');
      } else if (normalizedDegree) {
        setApplicationDegreeChoice('Other');
        setApplicationCustomDegree(normalizedDegree);
      }
    },
    [
      setApplicationFormData,
      setApplicationDegreeChoice,
      setApplicationCustomDegree
    ]
  );

  const handleAssistOutline = React.useCallback(async (payload) => {
    const response = await assistEssayOutlineApi(payload);
    return response;
  }, []);

  const handleAdminSaveProgramCatalogItem = React.useCallback(
    async (programId, payload) => {
      try {
        setAdminError('');
        if (programId) {
          await updateAdminProgramCatalogItemApi(programId, payload);
        } else {
          await createAdminProgramCatalogItemApi(payload);
        }
        await Promise.all([loadAdminData(), loadProgramCatalog()]);
      } catch (error) {
        const message = error?.response?.data?.detail || 'Failed to save program catalog item';
        setAdminError(message);
        throw new Error(message);
      }
    },
    [loadAdminData, loadProgramCatalog]
  );

  const handleAdminDeleteProgramCatalogItem = React.useCallback(
    async (programId) => {
      try {
        setAdminError('');
        await deleteAdminProgramCatalogItemApi(programId);
        await Promise.all([loadAdminData(), loadProgramCatalog()]);
      } catch (error) {
        const message = error?.response?.data?.detail || 'Failed to delete program catalog item';
        setAdminError(message);
        throw new Error(message);
      }
    },
    [loadAdminData, loadProgramCatalog]
  );

  React.useEffect(() => {
    const scrollContainers = Array.from(
      document.querySelectorAll('.main-content, .right-sidebar, .soft-nav-list')
    );
    if (!scrollContainers.length) return undefined;

    const scrollTimers = new Map();
    const markScrolling = (target) => {
      target.classList.add('is-scrolling');
      if (scrollTimers.has(target)) {
        window.clearTimeout(scrollTimers.get(target));
      }
      const timeoutId = window.setTimeout(() => {
        target.classList.remove('is-scrolling');
        scrollTimers.delete(target);
      }, 420);
      scrollTimers.set(target, timeoutId);
    };
    const handleScrollActivity = (event) => markScrolling(event.currentTarget);
    const handleWheelActivity = (event) => markScrolling(event.currentTarget);
    const handleTouchActivity = (event) => markScrolling(event.currentTarget);

    scrollContainers.forEach((container) => {
      container.addEventListener('scroll', handleScrollActivity, { passive: true });
      container.addEventListener('wheel', handleWheelActivity, { passive: true });
      container.addEventListener('touchmove', handleTouchActivity, { passive: true });
    });

    return () => {
      scrollContainers.forEach((container) => {
        container.removeEventListener('scroll', handleScrollActivity);
        container.removeEventListener('wheel', handleWheelActivity);
        container.removeEventListener('touchmove', handleTouchActivity);
        container.classList.remove('is-scrolling');
        const timeoutId = scrollTimers.get(container);
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      });
      scrollTimers.clear();
    };
  }, [activeNav, showAdminPage, showForm, showApplicationForm, showVersions]);

  return (
  <div className={`App ${isDarkMode ? 'dark-mode' : ''} ${reducedMotion ? 'reduced-motion' : ''}`}>
    <div className="app-layout">
      {/* 1. Left Navigation */}
      <SidebarNav
        navGroups={navGroups}
        activeNav={activeNav}
        expandedNavGroups={expandedNavGroups}
        onToggleGroup={actions.handleToggleNavGroup}
        onNavigate={actions.handleNavChange}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
      />

      <div className="workspace-shell">
        <TopControls
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
          onGlobalSearchSubmit={actions.handleGlobalSearch}
          onCreateEssay={() => {
            trackEvent('ui_create_essay_clicked', { source: 'top_controls' });
            actions.handleOpenNewEssayForm();
          }}
          onCreateApplication={() => {
            trackEvent('ui_create_application_clicked', { source: 'top_controls' });
            actions.handleOpenApplicationForm();
          }}
          notificationCount={notificationCount}
          onOpenNotifications={() => actions.handleNavChange('notifications')}
          profileMenuRef={profileMenuRef}
          isProfileMenuOpen={isProfileMenuOpen}
          onToggleProfileMenu={() => setIsProfileMenuOpen((prev) => !prev)}
          onGoProfile={() => actions.handleNavChange('profile')}
          onGoSettings={() => actions.handleNavChange('settings')}
          onLogout={logout}
          user={user}
        />

        <div className={`workspace-body ${showAdminPage ? 'workspace-body-admin' : ''}`}>
      {/* 2. Main Center Workspace */}
      <div className="main-content">
        <div className="content-header">
          <div className="content-header-main">
            <h1>{pageHeading}</h1>
            <p className="header-subtitle">{pageSubtitle}</p>
          </div>
        </div>
        
        <AppErrorBoundary
          name="workspace_shell"
          onReset={() => {
            setActiveNav('home');
            setSelectedEssay(null);
            setShowForm(false);
            setShowVersions(false);
          }}
        >
          {showAdminPage ? (
            <AdminView
              adminLoading={adminLoading}
              adminError={adminError}
              adminOverview={adminOverview}
              adminUsers={adminUsers}
              adminEvents={adminEvents}
              adminFeedback={adminFeedback}
              adminBreakdown={adminBreakdown}
              adminCoverage={adminCoverage}
              adminLastUpdatedAt={adminLastUpdatedAt}
              currentUserId={user?.id}
              onChangeRole={handleAdminRoleChange}
              onRefresh={loadAdminData}
              programCatalog={programCatalog}
              programCatalogLoading={programCatalogLoading}
              onSaveProgramCatalogItem={handleAdminSaveProgramCatalogItem}
              onDeleteProgramCatalogItem={handleAdminDeleteProgramCatalogItem}
            />
          ) : (
            <WorkspaceArea
              {...workspaceAreaProps}
              programCatalog={programCatalog}
              programCatalogLoading={programCatalogLoading}
              onApplyProgramCatalogItem={handleApplyProgramCatalogItem}
              onAssistOutline={handleAssistOutline}
            />
          )}
        </AppErrorBoundary>
      </div>

      {/* 3. Right Sidebar */}
      {!showAdminPage && (
        <RightSidebar
          onViewAllApplications={handleViewAllApplications}
          onViewAllEssays={() => actions.handleNavChange('essays')}
          onSelectApplication={handleSelectSidebarApplication}
          onSelectEssay={(essay) => {
            trackEvent('ui_right_sidebar_essay_selected', { essayId: essay?.id || null });
            setSelectedEssay(essay);
            setReview(null);
            setShowVersions(false);
            setShowForm(false);
            setActiveNav('essays');
          }}
          visibleSidebarApplications={visibleSidebarApplications}
          selectedApplicationId={selectedApplicationId}
          essays={essays}
          selectedEssayId={selectedEssay?.id}
          getEssayCountForApplication={getEssayCountForApplication}
          parseDate={parseDate}
          hasMoreSidebarApplications={hasMoreSidebarApplications}
          sidebarApplications={sidebarApplications}
          applications={applications}
          applicationSearch={applicationSearch}
        />
      )}
      </div>
      </div>
    </div>
  </div>
);
}

function ProtectedAppRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth?mode=login&next=${next}`} replace />;
  }

  return <AppContent />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/programs" element={<ProgramsPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/app/*" element={<ProtectedAppRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AppErrorBoundary name="root_shell" onReset={() => window.location.reload()}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export default App;
