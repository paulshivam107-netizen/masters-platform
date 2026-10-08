import { useEffect, useRef } from "react";
import { writeUserValue } from "../workspaceStorage";
import { DOC_GLOBAL_SCOPE, getDocScopeKey } from "../helpers";
import {
  APPLICATION_DRAFT_KEY,
  ESSAY_DRAFT_KEY,
  hasApplicationDraftContent,
  hasEssayDraftContent,
  ONBOARDING_DISMISSED_KEY,
  ONBOARDING_HIDDEN_KEY,
} from "../drafts";

export function useAppEffects({
  user,
  notify,
  fetchEssays,
  fetchApplications,
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
}) {
  // Initial data load should run when auth user changes.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (user) {
      fetchEssays();
      fetchApplications();
    }
  }, [user?.id]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const storageWarningShown = useRef(false);
  useEffect(() => {
    try {
      localStorage.setItem("ui_confirm_delete", JSON.stringify(confirmDelete));
      localStorage.setItem(
        "ui_show_checklist",
        JSON.stringify(showHomeChecklist),
      );
    } catch {
      /* Appearance preferences are optional. */
    }
  }, [confirmDelete, showHomeChecklist]);

  useEffect(() => {
    const values = {
      ui_doc_status_by_application: docStatusByApplication,
      ui_dismissed_notifications: dismissedNotifications,
      ui_interview_prep_by_application: interviewPrepByApplication,
      ui_research_by_application: researchByApplication,
      ui_decision_matrix_weights: decisionMatrixWeights,
      [ONBOARDING_DISMISSED_KEY]: onboardingDismissed,
      [ONBOARDING_HIDDEN_KEY]: onboardingHidden,
    };
    const saved = Object.entries(values).map(([key, value]) =>
      writeUserValue(user?.id, key, value),
    );
    if (saved.some((value) => !value) && !storageWarningShown.current) {
      storageWarningShown.current = true;
      notify?.(
        "This browser cannot save local notes. Keep this tab open and copy important notes before leaving.",
      );
    }
  }, [
    user?.id,
    docStatusByApplication,
    dismissedNotifications,
    interviewPrepByApplication,
    researchByApplication,
    decisionMatrixWeights,
    onboardingDismissed,
    onboardingHidden,
    notify,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const essaySaved = writeUserValue(
        user?.id,
        ESSAY_DRAFT_KEY,
        hasEssayDraftContent(formData) ? formData : null,
      );
      const applicationSaved = writeUserValue(
        user?.id,
        APPLICATION_DRAFT_KEY,
        hasApplicationDraftContent(applicationFormData)
          ? applicationFormData
          : null,
      );
      if ((!essaySaved || !applicationSaved) && !storageWarningShown.current) {
        storageWarningShown.current = true;
        notify?.(
          "Draft recovery is unavailable in this browser. Save your work before leaving this page.",
        );
      }
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [user?.id, formData, applicationFormData, notify]);

  useEffect(() => {
    setExpandedNavGroups((prev) => {
      const next = { ...prev };
      if (
        [
          "home",
          "compose",
          "essays",
          "tracker",
          "notifications",
          "interviews",
        ].includes(activeNav)
      )
        next.core = true;
      if (["deadlines", "requirements", "matrix"].includes(activeNav))
        next.planning = true;
      if (["docs", "research", "share"].includes(activeNav))
        next.resources = true;
      return next;
    });
  }, [activeNav, setExpandedNavGroups]);

  useEffect(() => {
    if (!user) return;
    setProfileFormData({
      name: user.name || "",
      avatar_url: user.avatar_url || "",
      timezone: user.timezone || "UTC",
      target_intake: user.target_intake || "",
      target_countries: user.target_countries || "",
      preferred_currency: user.preferred_currency || "USD",
      notification_email: user.notification_email || user.email || "",
      email_provider: user.email_provider || "manual",
      email_reminders_enabled: Boolean(user.email_reminders_enabled),
      reminder_days: user.reminder_days || "30,14,7,1",
      bio: user.bio || "",
    });
  }, [user, setProfileFormData]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [profileMenuRef, setIsProfileMenuOpen]);

  useEffect(() => {
    if (
      selectedApplicationId &&
      !applications.some(
        (application) => application.id === selectedApplicationId,
      )
    ) {
      setSelectedApplicationId(null);
    }
  }, [applications, selectedApplicationId, setSelectedApplicationId]);

  useEffect(() => {
    if (!applications.length) {
      setDocsApplicationId(null);
      return;
    }
    if (
      !docsApplicationId ||
      !applications.some((application) => application.id === docsApplicationId)
    ) {
      setDocsApplicationId(applications[0].id);
    }
  }, [applications, docsApplicationId, setDocsApplicationId]);

  useEffect(() => {
    const globalDocs = docStatusByApplication[DOC_GLOBAL_SCOPE];
    if (!globalDocs || !applications.length) return;

    let shouldUpdate = false;
    const nextState = { ...docStatusByApplication };

    for (const application of applications) {
      const scopeKey = getDocScopeKey(application.id);
      if (!nextState[scopeKey]) {
        nextState[scopeKey] = { ...globalDocs };
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      setDocStatusByApplication(nextState);
    }
  }, [applications, docStatusByApplication, setDocStatusByApplication]);
}
