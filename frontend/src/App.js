import React from "react";
import "./App.css";
import "./components/views/Workspace.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  getAdminEventCoverageApi,
  getAdminEventBreakdownApi,
  getAdminEventsApi,
  getAdminFeedbackApi,
  getAdminOverviewApi,
  getAdminAiRuntimeConfigApi,
  getAdminUsersApi,
  updateAdminAiRuntimeConfigApi,
  updateAdminUserRoleApi,
  listProgramCatalogApi,
  assistEssayOutlineApi,
} from "./api";
import AppErrorBoundary from "./components/common/AppErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import SidebarNav from "./components/layout/SidebarNav";
import TopControls from "./components/layout/TopControls";
import PageHeader from "./components/layout/PageHeader";
import AdminView from "./components/views/workspace/AdminView";
import VerifyEmailBanner from "./components/layout/VerifyEmailBanner";
import WorkspaceArea from "./components/views/WorkspaceArea";
import { catalogAutofillPatch } from "./app/catalogAutofill";
import LandingPage from "./components/public/LandingPage";
import ProgramsPage from "./components/public/ProgramsPage";
import AuthPage from "./components/public/AuthPage";
import {
  ResetPasswordPage,
  VerifyEmailPage,
} from "./components/public/AuthLinkPage";
import {
  GuidesPage,
  GuidePage,
  PracticePage,
  HelpPage,
  PrivacyPage,
  NotFoundPage,
} from "./components/public/ResourcePages";
import { SchoolsPage, SchoolPage } from "./components/public/SchoolPages";
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
      // R09: only verified, fresh, current-cycle records may fill deadline/fee.
      const { warning } = catalogAutofillPatch(item);
      setApplicationFormData((prev) => ({
        ...prev,
        ...catalogAutofillPatch(item, prev).patch,
        requirements_notes: prev.requirements_notes || "",
      }));
      if (warning) notify(warning);

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
      notify,
    ],
  );

  const handleAssistOutline = React.useCallback(async (payload) => {
    const response = await assistEssayOutlineApi(payload);
    return response;
  }, []);

  React.useEffect(() => {
    document.querySelector(".main-content")?.scrollTo?.({ top: 0 });
    window.scrollTo(0, 0);
  }, [activeNav]);

  React.useEffect(() => {
    if (activeNav === "compose") setShowForm(true);
  }, [activeNav, setShowForm]);

  const pageEyebrow =
    activeNav === "compose"
      ? "Essays"
      : navGroups.find((group) =>
          group.items.some((item) => item.id === activeNav),
        )?.label || "Your account";

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
      <div className="ws-app">
        {/* 1. Left Navigation */}
        <SidebarNav
          navGroups={navGroups}
          activeNav={activeNav}
          expandedNavGroups={expandedNavGroups}
          onToggleGroup={actions.handleToggleNavGroup}
          onNavigate={actions.handleNavChange}
          user={user}
        />

        <div className="ws-shell">
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
            className={`ws-body ${showAdminPage ? "ws-body--wide" : ""}`}
          >
            {/* 2. Main Center Workspace */}
            <main className="ws-main ws-page" id="main-workspace" tabIndex="-1" key={activeNav}>
              <PageHeader
                eyebrow={pageEyebrow}
                title={pageHeading}
                subtitle={pageSubtitle}
              />

              <VerifyEmailBanner user={user} />
              {!["settings", "profile", "admin"].includes(activeNav) &&
                Object.values(dataLoadState).includes("error") && (
                  <div className="ws-alert" role="alert">
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
    if (pathname.startsWith("/app")) return;
    // In-app links don't scroll to a #section themselves, so do it once the page has rendered.
    if (hash)
      document
        .getElementById(decodeURIComponent(hash.slice(1)))
        ?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <>
      <Seo />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/guides/:slug" element={<GuidePage />} />
        <Route path="/schools" element={<SchoolsPage />} />
        <Route path="/schools/:slug" element={<SchoolPage />} />
        <Route path="/mba-interview-practice" element={<PracticePage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
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
