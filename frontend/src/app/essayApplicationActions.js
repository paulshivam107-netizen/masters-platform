import { createDefaultApplicationForm, createDefaultEssayForm } from './formDefaults';
import { APPLICATION_DRAFT_KEY, ESSAY_DRAFT_KEY } from './drafts';
import {
  createApplicationApi,
  createEssayApi,
  deleteApplicationApi,
  deleteEssayApi,
  listApplicationsApi,
  listEssaysApi,
  listEssayVersionsApi,
  reviewEssayApi,
  updateApplicationApi
} from '../api';

export function createEssayApplicationActions({
  degreeOptions,
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
  setEssayDraftRecovered,
  setApplicationDraftRecovered
}) {
  const resolveDegreeValue = (choice, customValue) => {
    if (choice === 'Other') return customValue.trim();
    return choice;
  };

  const hydrateDegreeFields = (value, setChoice, setCustom) => {
    if (degreeOptions.includes(value) && value !== 'Other') {
      setChoice(value);
      setCustom('');
      return;
    }
    setChoice('Other');
    setCustom(value || '');
  };

  const fetchEssays = async () => {
    try {
      const data = await listEssaysApi();
      setEssays(data);
    } catch (error) {
      console.error('Error fetching essays:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const data = await listApplicationsApi();
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchVersions = async (essayId) => {
    try {
      const response = await listEssayVersionsApi(essayId);
      const payload = response?.versions || response || [];
      const versionList = Array.isArray(payload) ? payload : [];
      setVersions(versionList);
      if (versionList.length >= 2) {
        setVersionDiffSelection({
          base: getVersionIdentity(versionList[1], 1),
          compare: getVersionIdentity(versionList[0], 0)
        });
      } else if (versionList.length === 1) {
        setVersionDiffSelection({
          base: getVersionIdentity(versionList[0], 0),
          compare: getVersionIdentity(versionList[0], 0)
        });
      } else {
        setVersionDiffSelection({ base: '', compare: '' });
      }
      setShowVersions(true);
    } catch (error) {
      console.error('Error fetching versions:', error);
      alert('Error fetching versions');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const resolvedDegree = resolveDegreeValue(essayDegreeChoice, essayCustomDegree);
    if (!resolvedDegree) {
      alert('Please enter a custom degree when selecting Other.');
      setLoading(false);
      return;
    }

    const payload = {
      ...formData,
      program_type: resolvedDegree,
      application_id: formData.application_id || selectedApplicationId || null
    };
    const validationErrors = [];
    if (!payload.school_name || payload.school_name.trim().length < 2) {
      validationErrors.push('School name must be at least 2 characters.');
    }
    if (!payload.program_type || payload.program_type.trim().length < 2) {
      validationErrors.push('Program type must be at least 2 characters.');
    }
    if (!payload.essay_prompt || payload.essay_prompt.trim().length < 5) {
      validationErrors.push('Essay prompt must be at least 5 characters.');
    }
    if (!payload.essay_content || payload.essay_content.trim().length < 20) {
      validationErrors.push('Essay content must be at least 20 characters.');
    }
    if (validationErrors.length) {
      alert(validationErrors.join('\n'));
      setLoading(false);
      return;
    }

    if (!payload.application_id) {
      const matchedApplication = applications.find(
        (application) =>
          application.school_name.toLowerCase() === payload.school_name.trim().toLowerCase()
      );
      if (matchedApplication) {
        payload.application_id = matchedApplication.id;
      }
    }

    try {
      await createEssayApi(payload);
      setFormData(createDefaultEssayForm(selectedApplicationId || null));
      setEssayDegreeChoice('MBA');
      setEssayCustomDegree('');
      setEssayDraftRecovered(false);
      localStorage.removeItem(ESSAY_DRAFT_KEY);
      setShowForm(false);
      setActiveNav('essays');
      fetchEssays();
      alert('Essay submitted successfully!');
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const detailText = Array.isArray(detail)
        ? detail.map((item) => item?.msg || item?.message).filter(Boolean).join('\n')
        : detail;
      if (detailText) {
        alert(`Error submitting essay:\n${detailText}`);
      } else {
        alert('Error submitting essay');
      }
      console.error('Error submitting essay:', error);
    }
    setLoading(false);
  };

  const handleReview = async (essayId) => {
    setLoading(true);
    setReview(null);
    try {
      const response = await reviewEssayApi(essayId, {
        focus_areas: ['structure', 'content', 'grammar']
      });
      setReview(response);
    } catch (error) {
      console.error('Error getting review:', error);
      alert('Error getting AI review');
    }
    setLoading(false);
  };

  const handleDelete = async (essayId) => {
    if (!confirmDelete || window.confirm('Are you sure you want to delete this essay?')) {
      try {
        await deleteEssayApi(essayId);
        fetchEssays();
        setSelectedEssay(null);
        setReview(null);
      } catch (error) {
        console.error('Error deleting essay:', error);
      }
    }
  };

  const resetApplicationForm = () => {
    setApplicationFormData(createDefaultApplicationForm());
    setApplicationDegreeChoice('MBA');
    setApplicationCustomDegree('');
    setEditingApplicationId(null);
  };

  const handleOpenApplicationForm = (application = null) => {
    if (application) {
      setApplicationFormData({
        school_name: application.school_name || '',
        program_name: application.program_name || 'MBA',
        application_round: application.application_round || 'Round 1',
        deadline: application.deadline || '',
        application_fee: application.application_fee ?? '',
        program_total_fee: application.program_total_fee ?? '',
        fee_currency: application.fee_currency || 'USD',
        essays_required: application.essays_required ?? 0,
        lors_required: application.lors_required ?? 0,
        lors_submitted: application.lors_submitted ?? 0,
        interview_required: Boolean(application.interview_required),
        interview_completed: Boolean(application.interview_completed),
        decision_status: application.decision_status || 'Pending',
        requirements_notes: application.requirements_notes || '',
        status: application.status || 'Planning'
      });
      hydrateDegreeFields(
        application.program_name || 'MBA',
        setApplicationDegreeChoice,
        setApplicationCustomDegree
      );
      setEditingApplicationId(application.id);
      setApplicationDraftRecovered(false);
    } else {
      resetApplicationForm();
    }

    setShowApplicationForm(true);
    setShowForm(false);
    setSelectedEssay(null);
    setReview(null);
    setShowVersions(false);
    setActiveNav('tracker');
  };

  const handleApplicationSubmit = async (e) => {
    e.preventDefault();
    setApplicationLoading(true);
    const resolvedDegree = resolveDegreeValue(applicationDegreeChoice, applicationCustomDegree);
    if (!resolvedDegree) {
      alert('Please enter a custom degree when selecting Other.');
      setApplicationLoading(false);
      return;
    }

    const payload = {
      ...applicationFormData,
      program_name: resolvedDegree,
      application_fee:
        applicationFormData.application_fee === '' ? null : Number(applicationFormData.application_fee),
      program_total_fee:
        applicationFormData.program_total_fee === '' ? null : Number(applicationFormData.program_total_fee),
      essays_required: Number(applicationFormData.essays_required || 0),
      lors_required: Number(applicationFormData.lors_required || 0),
      lors_submitted: Math.min(
        Number(applicationFormData.lors_submitted || 0),
        Number(applicationFormData.lors_required || 0)
      ),
      interview_required: Boolean(applicationFormData.interview_required),
      interview_completed: Boolean(
        applicationFormData.interview_required && applicationFormData.interview_completed
      ),
      decision_status: applicationFormData.decision_status || 'Pending',
      fee_currency: (applicationFormData.fee_currency || 'USD').toUpperCase()
    };

    try {
      if (editingApplicationId) {
        await updateApplicationApi(editingApplicationId, payload);
      } else {
        await createApplicationApi(payload);
      }
      await fetchApplications();
      setShowApplicationForm(false);
      resetApplicationForm();
      setApplicationDraftRecovered(false);
      localStorage.removeItem(APPLICATION_DRAFT_KEY);
    } catch (error) {
      console.error('Error saving application tracker entry:', error);
      alert('Could not save application tracker details');
    }

    setApplicationLoading(false);
  };

  const handleDeleteApplication = async (applicationId) => {
    const confirmed =
      !confirmDelete || window.confirm('Are you sure you want to delete this tracked application?');
    if (!confirmed) return;

    try {
      await deleteApplicationApi(applicationId);
      await fetchApplications();
      if (editingApplicationId === applicationId) {
        setShowApplicationForm(false);
        resetApplicationForm();
      }
    } catch (error) {
      console.error('Error deleting tracked application:', error);
    }
  };

  const handleCreateNewVersion = (baseEssay = selectedEssay) => {
    if (!baseEssay) return;

    setFormData({
      school_name: baseEssay.school_name,
      program_type: baseEssay.program_type,
      essay_prompt: baseEssay.essay_prompt,
      essay_content: baseEssay.essay_content,
      parent_essay_id: baseEssay.parent_essay_id || baseEssay.id,
      application_id: baseEssay.application_id || selectedApplicationId || null
    });
    hydrateDegreeFields(baseEssay.program_type, setEssayDegreeChoice, setEssayCustomDegree);
    setShowForm(true);
    setShowApplicationForm(false);
    setEditingApplicationId(null);
    setShowVersions(false);
    setActiveNav('compose');
    setEssayDraftRecovered(false);
  };

  const handleSelectVersion = (version) => {
    setSelectedEssay(version);
    if (version.application_id) {
      setSelectedApplicationId(version.application_id);
    } else {
      const matched = applications.find(
        (application) =>
          (application.school_name || '').trim().toLowerCase() ===
            (version.school_name || '').trim().toLowerCase() &&
          (application.program_name || '').trim().toLowerCase() ===
            (version.program_type || '').trim().toLowerCase()
      );
      setSelectedApplicationId(matched?.id || null);
    }
    setReview(null);
    setShowForm(false);
  };

  const handleOpenNewEssayForm = (applicationId = selectedApplicationId) => {
    const selectedApplication = applications.find((application) => application.id === applicationId);
    const defaultProgram = selectedApplication?.program_name || 'MBA';
    setFormData({
      school_name: selectedApplication?.school_name || '',
      program_type: defaultProgram,
      essay_prompt: '',
      essay_content: '',
      parent_essay_id: null,
      application_id: applicationId || null
    });
    hydrateDegreeFields(defaultProgram, setEssayDegreeChoice, setEssayCustomDegree);
    setSelectedEssay(null);
    setReview(null);
    setShowVersions(false);
    setShowForm(true);
    setShowApplicationForm(false);
    setEditingApplicationId(null);
    setActiveNav('compose');
    setEssayDraftRecovered(false);
  };

  const handleDiscardEssayDraft = () => {
    setFormData(createDefaultEssayForm(selectedApplicationId || null));
    setEssayDegreeChoice('MBA');
    setEssayCustomDegree('');
    setEssayDraftRecovered(false);
    localStorage.removeItem(ESSAY_DRAFT_KEY);
  };

  const handleDiscardApplicationDraft = () => {
    resetApplicationForm();
    setApplicationDraftRecovered(false);
    localStorage.removeItem(APPLICATION_DRAFT_KEY);
  };

  return {
    fetchEssays,
    fetchApplications,
    fetchVersions,
    handleSubmit,
    handleReview,
    handleDelete,
    resetApplicationForm,
    handleOpenApplicationForm,
    handleApplicationSubmit,
    handleDeleteApplication,
    handleCreateNewVersion,
    handleSelectVersion,
    handleOpenNewEssayForm,
    handleDiscardEssayDraft,
    handleDiscardApplicationDraft
  };
}
