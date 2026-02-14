import { useEffect } from 'react';
import { DOC_GLOBAL_SCOPE, getDocScopeKey } from '../helpers';
import {
  APPLICATION_DRAFT_KEY,
  ESSAY_DRAFT_KEY,
  hasApplicationDraftContent,
  hasEssayDraftContent,
  ONBOARDING_DISMISSED_KEY,
  ONBOARDING_HIDDEN_KEY
} from '../drafts';

export function useAppEffects({
  user,
  fetchEssays,
  fetchApplications,
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
}) {
  // Initial data load should run when auth user changes.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (user) {
      fetchEssays();
      fetchApplications();
    }
  }, [user]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    localStorage.setItem('ui_theme', isDarkMode ? 'dark' : 'light');
    document.body.classList.toggle('dark-body', isDarkMode);
    document.documentElement.classList.toggle('dark', isDarkMode);
    return () => {
      document.body.classList.remove('dark-body');
      document.documentElement.classList.remove('dark');
    };
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('ui_confirm_delete', String(confirmDelete));
    localStorage.setItem('ui_show_checklist', String(showHomeChecklist));
    localStorage.setItem('ui_reduced_motion', String(reducedMotion));
  }, [confirmDelete, showHomeChecklist, reducedMotion]);

  useEffect(() => {
    localStorage.setItem('ui_doc_status_by_application', JSON.stringify(docStatusByApplication));
  }, [docStatusByApplication]);

  useEffect(() => {
    localStorage.setItem('ui_dismissed_notifications', JSON.stringify(dismissedNotifications));
  }, [dismissedNotifications]);

  useEffect(() => {
    localStorage.setItem('ui_interview_prep_by_application', JSON.stringify(interviewPrepByApplication));
  }, [interviewPrepByApplication]);

  useEffect(() => {
    localStorage.setItem('ui_research_by_application', JSON.stringify(researchByApplication));
  }, [researchByApplication]);

  useEffect(() => {
    localStorage.setItem('ui_decision_matrix_weights', JSON.stringify(decisionMatrixWeights));
  }, [decisionMatrixWeights]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (hasEssayDraftContent(formData)) {
        localStorage.setItem(ESSAY_DRAFT_KEY, JSON.stringify(formData));
      } else {
        localStorage.removeItem(ESSAY_DRAFT_KEY);
      }
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [formData]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (hasApplicationDraftContent(applicationFormData)) {
        localStorage.setItem(APPLICATION_DRAFT_KEY, JSON.stringify(applicationFormData));
      } else {
        localStorage.removeItem(APPLICATION_DRAFT_KEY);
      }
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [applicationFormData]);

  useEffect(() => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, String(onboardingDismissed));
  }, [onboardingDismissed]);

  useEffect(() => {
    localStorage.setItem(ONBOARDING_HIDDEN_KEY, String(onboardingHidden));
  }, [onboardingHidden]);

  useEffect(() => {
    setExpandedNavGroups((prev) => {
      const next = { ...prev };
      if (['home', 'compose', 'essays', 'tracker', 'notifications'].includes(activeNav)) next.core = true;
      if (['deadlines', 'requirements', 'matrix', 'interviews'].includes(activeNav)) next.planning = true;
      if (['docs', 'research', 'share'].includes(activeNav)) next.resources = true;
      return next;
    });
  }, [activeNav, setExpandedNavGroups]);

  useEffect(() => {
    if (!user) return;
    setProfileFormData({
      name: user.name || '',
      avatar_url: user.avatar_url || '',
      timezone: user.timezone || 'UTC',
      target_intake: user.target_intake || '',
      target_countries: user.target_countries || '',
      preferred_currency: user.preferred_currency || 'USD',
      notification_email: user.notification_email || user.email || '',
      email_provider: user.email_provider || 'manual',
      email_reminders_enabled: Boolean(user.email_reminders_enabled),
      reminder_days: user.reminder_days || '30,14,7,1',
      bio: user.bio || ''
    });
  }, [user, setProfileFormData]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [profileMenuRef, setIsProfileMenuOpen]);

  useEffect(() => {
    if (selectedApplicationId && !applications.some((application) => application.id === selectedApplicationId)) {
      setSelectedApplicationId(null);
    }
  }, [applications, selectedApplicationId, setSelectedApplicationId]);

  useEffect(() => {
    if (!applications.length) {
      setDocsApplicationId(null);
      return;
    }
    if (!docsApplicationId || !applications.some((application) => application.id === docsApplicationId)) {
      setDocsApplicationId(applications[0].id);
    }
  }, [applications, docsApplicationId, setDocsApplicationId]);

  useEffect(() => {
    const glowSelector = [
      '.home-welcome-card',
      '.home-metric-card',
      '.home-tips-card',
      '.settings-card',
      '.application-essay-list-card',
      '.insight-card',
      '.detail-list-card',
      '.tracker-metric-card',
      '.tracker-form-card',
      '.application-card',
      '.essay-section',
      '.versions-panel',
      '.essay-header',
      '.review-section',
      '.essay-form',
      '.user-profile-card',
      '.empty-state-main',
      '.doc-item',
      '.detail-item',
      '.version-item'
    ].join(',');

    const targets = Array.from(document.querySelectorAll(glowSelector));
    if (!targets.length) return undefined;

    const handleMove = (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
      event.currentTarget.style.setProperty('--glow-opacity', '0.16');
    };

    const handleEnter = (event) => {
      event.currentTarget.style.setProperty('--glow-opacity', '0.12');
    };

    const handleLeave = (event) => {
      event.currentTarget.style.setProperty('--glow-opacity', '0');
    };

    for (const node of targets) {
      node.addEventListener('pointermove', handleMove);
      node.addEventListener('pointerenter', handleEnter);
      node.addEventListener('pointerleave', handleLeave);
    }

    return () => {
      for (const node of targets) {
        node.removeEventListener('pointermove', handleMove);
        node.removeEventListener('pointerenter', handleEnter);
        node.removeEventListener('pointerleave', handleLeave);
      }
    };
  }, [activeNav, showForm, showApplicationForm, showVersions, selectedEssay]);

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
