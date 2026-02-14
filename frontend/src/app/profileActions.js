import { previewRemindersApi, sendTestReminderApi, submitFeedbackApi } from '../api';

export function createProfileActions({
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
  feedbackCategory,
  feedbackMessage,
  activeNav,
  setFeedbackCategory,
  setFeedbackMessage,
  setFeedbackSending,
  setFeedbackStatus
}) {
  const handleProfileFieldChange = (field, value) => {
    setProfileFormData((prev) => ({ ...prev, [field]: value }));
    if (profileMessage) setProfileMessage('');
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');
    try {
      await updateProfile({
        ...profileFormData,
        preferred_currency: (profileFormData.preferred_currency || 'USD').toUpperCase(),
        notification_email: profileFormData.notification_email || user.email
      });
      setProfileMessage('Profile saved.');
    } catch (error) {
      setProfileMessage(error.response?.data?.detail || 'Could not save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const fetchReminderPreview = async () => {
    setReminderLoading(true);
    try {
      const data = await previewRemindersApi();
      setReminderPreview(data);
    } catch (error) {
      setReminderPreview({
        notification_email: profileFormData.notification_email || user?.email || null,
        reminders_enabled: false,
        total_matches: 0,
        items: [],
        error: error.response?.data?.detail || 'Could not load reminder preview.'
      });
    } finally {
      setReminderLoading(false);
    }
  };

  const sendTestReminder = async () => {
    setReminderSending(true);
    try {
      const data = await sendTestReminderApi();
      setProfileMessage(data.message || 'Reminder action completed.');
      await fetchReminderPreview();
    } catch (error) {
      setProfileMessage(error.response?.data?.detail || 'Could not send reminder.');
    } finally {
      setReminderSending(false);
    }
  };

  const submitPilotFeedback = async (e) => {
    if (e) e.preventDefault();
    const message = (feedbackMessage || '').trim();
    if (message.length < 10) {
      setFeedbackStatus('Please share at least 10 characters of feedback.');
      return;
    }
    setFeedbackSending(true);
    setFeedbackStatus('');
    try {
      await submitFeedbackApi({
        category: feedbackCategory,
        message,
        page_context: activeNav
      });
      setFeedbackMessage('');
      setFeedbackCategory('general');
      setFeedbackStatus('Thanks. Feedback captured for pilot review.');
    } catch (error) {
      setFeedbackStatus(error.response?.data?.detail || 'Could not submit feedback right now.');
    } finally {
      setFeedbackSending(false);
    }
  };

  return {
    handleProfileFieldChange,
    handleProfileSave,
    fetchReminderPreview,
    sendTestReminder,
    submitPilotFeedback
  };
}
