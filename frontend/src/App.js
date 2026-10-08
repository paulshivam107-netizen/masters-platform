import React from "react";
import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  createAdminProgramCatalogItemApi,
  deleteAdminProgramCatalogItemApi,
  getAdminEventCoverageApi,
  getAdminEventBreakdownApi,
  getAdminEventsApi,
  getAdminFeedbackApi,
  getAdminOverviewApi,
  getAdminAiRuntimeConfigApi,
  getAdminUsersApi,
  updateAdminAiRuntimeConfigApi,
  updateAdminProgramCatalogItemApi,
  updateAdminUserRoleApi,
  listProgramCatalogApi,
  assistEssayOutlineApi,
} from "./api";
import AppErrorBoundary from "./components/common/AppErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import SidebarNav from "./components/layout/SidebarNav";
import TopControls from "./components/layout/TopControls";
import AdminView from "./components/views/workspace/AdminView";
import WorkspaceArea from "./components/views/WorkspaceArea";
import LandingPage from "./components/public/LandingPage";
import ProgramsPage from "./components/public/ProgramsPage";
import AuthPage from "./components/public/AuthPage";
import {
  GuidesPage,
  GuidePage,
  HelpPage,
  NotFoundPage,
} from "./components/public/ResourcePages";
import Seo from "./seo/Seo";
import {
  UNIVERSITY_OPTIONS,
  DEGREE_OPTIONS,
  DOC_TEMPLATES,
} from "./app/constants";
import {
  getDefaultInterviewPrep,
  getDefaultResearchCard,
  getDocScopeKey,
  getVersionIdentity,
} from "./app/helpers";
import { useAppState } from "./app/hooks/useAppState";
import { useAppEffects } from "./app/hooks/useAppEffects";
import { useAppActions } from "./app/hooks/useAppActions";
import { useWorkspaceComputed } from "./app/hooks/useWorkspaceComputed";
import { trackEvent } from "./app/telemetry";

function AppContent() {
  const { user, logout, updateProfile } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const [dataLoadState, setDataLoadState] = React.useState({
    essays: "loading",
    applications: "loading",
  });
  const [notice, setNotice] = React.useState(null);
  const notify = React.useCallback(
    (message) => setNotice({ message, id: Date.now() }),
    [],
  );
  React.useEffect(() => {
    if (!notice) return undefined;
    if (/error|failed|could not|please/i.test(notice.message)) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [notice]);
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
  } = useAppState(user?.id);

  const actions = useAppActions({
    setDataLoadState,
    notify,
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
    setFeedbackStatus,
  });

  useAppEffects({
    user,
    notify,
    fetchEssays: actions.fetchEssays,
    fetchApplications: actions.fetchApplications,
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
    onboardingHidden,
  });

  const {
    notificationCount,
    navGroups,
    pageHeading,
    pageSubtitle,
    workspaceAreaProps,
  } = useWorkspaceComputed({
    user,
    logout,
    state: {
      isDarkMode,
      setIsDarkMode,
      activeNav,
      essays,
      profileFormData,
      profileSaving,
      applications,
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
      feedbackStatus,
    },
    actions,
    constants: {
      DEGREE_OPTIONS,
      UNIVERSITY_OPTIONS,
      DOC_TEMPLATES,
    },
    helpers: {
      getDocScopeKey,
      getDefaultInterviewPrep,
      getDefaultResearchCard,
      getVersionIdentity,
    },
  });

  const [adminLoading, setAdminLoading] = React.useState(false);
  const [adminError, setAdminError] = React.useState("");
  const [adminOverview, setAdminOverview] = React.useState(null);
  const [adminUsers, setAdminUsers] = React.useState([]);
  const [adminEvents, setAdminEvents] = React.useState([]);
  const [adminFeedback, setAdminFeedback] = React.useState([]);
  const [adminBreakdown, setAdminBreakdown] = React.useState([]);
  const [adminCoverage, setAdminCoverage] = React.useState(null);
  const [adminAiRuntimeConfig, setAdminAiRuntimeConfig] = React.useState(null);
  const [adminLastUpdatedAt, setAdminLastUpdatedAt] = React.useState(null);
  const [programCatalog, setProgramCatalog] = React.useState([]);
  const [programCatalogLoading, setProgramCatalogLoading] =
    React.useState(false);

  const isAdminUser = (user?.role || "").toLowerCase() === "admin";
  const showAdminPage = isAdminUser && activeNav === "admin";

  const loadAdminData = React.useCallback(async () => {
    if (!isAdminUser) return;
    try {
      setAdminLoading(true);
      setAdminError("");
      const [
        overview,
        users,
        events,
        feedback,
        breakdown,
        coverage,
        aiRuntimeConfig,
      ] = await Promise.all([
        getAdminOverviewApi(),
        getAdminUsersApi(30),
        getAdminEventsApi(60),
        getAdminFeedbackApi(25),
        getAdminEventBreakdownApi(10),
        getAdminEventCoverageApi(),
        getAdminAiRuntimeConfigApi(),
      ]);
      setAdminOverview(overview);
      setAdminUsers(users);
      setAdminEvents(events);
      setAdminFeedback(feedback);
      setAdminBreakdown(breakdown);
      setAdminCoverage(coverage);
      setAdminAiRuntimeConfig(aiRuntimeConfig);
      setAdminLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      setAdminError(
        error?.response?.data?.detail || "Failed to load admin data",
      );
    } finally {
      setAdminLoading(false);
    }
  }, [isAdminUser]);

  const handleAdminRoleChange = React.useCallback(
    async (targetUserId, nextRole) => {
      try {
        setAdminError("");
        await updateAdminUserRoleApi(targetUserId, nextRole);
        await loadAdminData();
      } catch (error) {
        const message =
          error?.response?.data?.detail || "Failed to update user role";
        setAdminError(message);
        throw new Error(message);
      }
    },
    [loadAdminData],
  );

  const handleAdminUpdateAiRuntimeConfig = React.useCallback(
    async (payload) => {
      try {
        setAdminError("");
        const updated = await updateAdminAiRuntimeConfigApi(payload);
        setAdminAiRuntimeConfig(updated);
        await loadAdminData();
        return updated;
      } catch (error) {
        const message =
          error?.response?.data?.detail || "Failed to update AI runtime config";
        setAdminError(message);
        throw new Error(message);
      }
    },
    [loadAdminData],
  );

  React.useEffect(() => {
    if (showAdminPage) {
      loadAdminData();
    }
  }, [showAdminPage, loadAdminData]);

  React.useEffect(() => {
    if (!isAdminUser && activeNav === "admin") {
      setActiveNav("home");
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
      const response = await listProgramCatalogApi("", 200);
      setProgramCatalog(response?.items || []);
    } catch (error) {
      console.error("Failed to load program catalog:", error);
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
        fee_currency: item.fee_currency || prev.fee_currency || "USD",
        application_fee:
          item.application_fee === null || item.application_fee === undefined
            ? prev.application_fee
            : String(item.application_fee),
        deadline: item.deadline_round_1 || prev.deadline,
        requirements_notes: prev.requirements_notes || "",
      }));

      const normalizedDegree = (item.degree || item.program_name || "").trim();
      if (
        DEGREE_OPTIONS.includes(normalizedDegree) &&
        normalizedDegree !== "Other"
      ) {
        setApplicationDegreeChoice(normalizedDegree);
        setApplicationCustomDegree("");
      } else if (normalizedDegree) {
        setApplicationDegreeChoice("Other");
        setApplicationCustomDegree(normalizedDegree);
      }
    },
    [
      setApplicationFormData,
      setApplicationDegreeChoice,
      setApplicationCustomDegree,
    ],
  );

  const handleAssistOutline = React.useCallback(async (payload) => {
    const response = await assistEssayOutlineApi(payload);
    return response;
  }, []);

  const handleAdminSaveProgramCatalogItem = React.useCallback(
    async (programId, payload) => {
      try {
        setAdminError("");
        if (programId) {
          await updateAdminProgramCatalogItemApi(programId, payload);
        } else {
          await createAdminProgramCatalogItemApi(payload);
        }
        await Promise.all([loadAdminData(), loadProgramCatalog()]);
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          "Failed to save program catalog item";
        setAdminError(message);
        throw new Error(message);
      }
    },
    [loadAdminData, loadProgramCatalog],
  );

  const handleAdminDeleteProgramCatalogItem = React.useCallback(
    async (programId) => {
      try {
        setAdminError("");
        await deleteAdminProgramCatalogItemApi(programId);
        await Promise.all([loadAdminData(), loadProgramCatalog()]);
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          "Failed to delete program catalog item";
        setAdminError(message);
        throw new Error(message);
      }
    },
    [loadAdminData, loadProgramCatalog],
  );

  React.useEffect(() => {
    document.querySelector(".main-content")?.scrollTo?.({ top: 0 });
    window.scrollTo(0, 0);
  }, [activeNav]);

  React.useEffect(() => {
    if (activeNav === "compose") setShowForm(true);
  }, [activeNav, setShowForm]);

  return (
    <div
      className={`App ${isDarkMode ? "dark-mode" : "light-mode"} ${reducedMotion ? "reduced-motion" : ""}`}
    >
      {notice && (
        <div
          className={`workspace-toast ${/error|failed|could not|please/i.test(notice.message) ? "toast-warning" : ""}`}
          role={
            /error|failed|could not|please/i.test(notice.message)
              ? "alert"
              : "status"
          }
        >
          <span>{notice.message}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
      <a className="skip-link" href="#main-workspace">
        Skip to content
      </a>
      <div className="app-layout">
        {/* 1. Left Navigation */}
        <SidebarNav
          navGroups={navGroups}
          activeNav={activeNav}
          expandedNavGroups={expandedNavGroups}
          onToggleGroup={actions.handleToggleNavGroup}
          onNavigate={actions.handleNavChange}
        />

        <div className="workspace-shell">
          <TopControls
            onGoHome={() => actions.handleNavChange("home")}
            globalSearch={globalSearch}
            onGlobalSearchChange={setGlobalSearch}
            onGlobalSearchSubmit={actions.handleGlobalSearch}
            onCreateEssay={() => {
              trackEvent("ui_create_essay_clicked", { source: "top_controls" });
              actions.handleOpenNewEssayForm();
            }}
            onCreateApplication={() => {
              trackEvent("ui_create_application_clicked", {
                source: "top_controls",
              });
              actions.handleOpenApplicationForm();
            }}
            notificationCount={notificationCount}
            onOpenNotifications={() => actions.handleNavChange("notifications")}
            profileMenuRef={profileMenuRef}
            isProfileMenuOpen={isProfileMenuOpen}
            onToggleProfileMenu={() => setIsProfileMenuOpen((prev) => !prev)}
            onGoProfile={() => actions.handleNavChange("profile")}
            onGoSettings={() => actions.handleNavChange("settings")}
            onLogout={logout}
            user={user}
          />

          <div
            className={`workspace-body ${showAdminPage ? "workspace-body-admin" : ""}`}
          >
            {/* 2. Main Center Workspace */}
            <main className="main-content" id="main-workspace" tabIndex="-1">
              <div className="content-header">
                <div className="content-header-main">
                  <p className="eyebrow">YOUR ADMISSIONS WORKSPACE</p>
                  <h1>{pageHeading}</h1>
                  <p className="header-subtitle">{pageSubtitle}</p>
                </div>
              </div>

              {!["settings", "profile", "admin"].includes(activeNav) &&
                Object.values(dataLoadState).includes("error") && (
                  <div className="data-status" role="alert">
                    <div>
                      <strong>We couldn’t load all your work.</strong>
                      <p>Check your connection and try again.</p>
                    </div>
                    <button
                      className="secondary-action-btn"
                      onClick={() => {
                        actions.fetchApplications();
                        actions.fetchEssays();
                      }}
                    >
                      Try again
                    </button>
                  </div>
                )}
              <AppErrorBoundary
                name="workspace_shell"
                onReset={() => {
                  setActiveNav("home");
                  setSelectedEssay(null);
                  setShowForm(false);
                  setShowVersions(false);
                }}
              >
                {!["settings", "profile", "admin"].includes(activeNav) &&
                Object.values(dataLoadState).includes("loading") ? (
                  <div className="workspace-loading" role="status">
                    <span className="sr-only">Loading your workspace…</span>
                    <div className="skeleton-hero" />
                    <div className="skeleton-grid">
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                ) : !["settings", "profile", "admin"].includes(activeNav) &&
                  Object.values(dataLoadState).includes(
                    "error",
                  ) ? null : showAdminPage ? (
                  <AdminView
                    adminLoading={adminLoading}
                    adminError={adminError}
                    adminOverview={adminOverview}
                    adminUsers={adminUsers}
                    adminEvents={adminEvents}
                    adminFeedback={adminFeedback}
                    adminBreakdown={adminBreakdown}
                    adminCoverage={adminCoverage}
                    adminAiRuntimeConfig={adminAiRuntimeConfig}
                    adminLastUpdatedAt={adminLastUpdatedAt}
                    currentUserId={user?.id}
                    onChangeRole={handleAdminRoleChange}
                    onRefresh={loadAdminData}
                    programCatalog={programCatalog}
                    programCatalogLoading={programCatalogLoading}
                    onSaveProgramCatalogItem={handleAdminSaveProgramCatalogItem}
                    onDeleteProgramCatalogItem={
                      handleAdminDeleteProgramCatalogItem
                    }
                    onUpdateAiRuntimeConfig={handleAdminUpdateAiRuntimeConfig}
                  />
                ) : (
                  <WorkspaceArea
                    key={activeNav}
                    {...workspaceAreaProps}
                    programCatalog={programCatalog}
                    programCatalogLoading={programCatalogLoading}
                    onApplyProgramCatalogItem={handleApplyProgramCatalogItem}
                    onAssistOutline={handleAssistOutline}
                  />
                )}
              </AppErrorBoundary>
            </main>
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

  return <AppContent key={user.id} />;
}

function AppRoutes() {
  const { pathname, hash } = useLocation();
  React.useEffect(() => {
    if (!pathname.startsWith("/app") && !hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <>
      <Seo />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/guides/:slug" element={<GuidePage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app/*" element={<ProtectedAppRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AppErrorBoundary
      name="root_shell"
      onReset={() => window.location.reload()}
    >
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

export default App;
