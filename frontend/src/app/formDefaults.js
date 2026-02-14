export const DEFAULT_PROFILE_FORM = {
  name: '',
  avatar_url: '',
  timezone: 'UTC',
  target_intake: '',
  target_countries: '',
  preferred_currency: 'USD',
  notification_email: '',
  email_provider: 'manual',
  email_reminders_enabled: false,
  reminder_days: '30,14,7,1',
  bio: ''
};

export const DEFAULT_ESSAY_FORM = {
  school_name: '',
  program_type: 'MBA',
  essay_prompt: '',
  essay_content: '',
  parent_essay_id: null,
  application_id: null
};

export const DEFAULT_APPLICATION_FORM = {
  school_name: '',
  program_name: 'MBA',
  application_round: 'Round 1',
  deadline: '',
  application_fee: '',
  program_total_fee: '',
  fee_currency: 'USD',
  essays_required: 1,
  lors_required: 2,
  lors_submitted: 0,
  interview_required: false,
  interview_completed: false,
  decision_status: 'Pending',
  requirements_notes: '',
  status: 'Planning'
};

export function createDefaultEssayForm(applicationId = null) {
  return {
    ...DEFAULT_ESSAY_FORM,
    application_id: applicationId
  };
}

export function createDefaultApplicationForm() {
  return { ...DEFAULT_APPLICATION_FORM };
}

export function createDefaultProfileForm() {
  return { ...DEFAULT_PROFILE_FORM };
}
