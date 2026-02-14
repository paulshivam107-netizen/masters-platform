import { createDefaultApplicationForm, createDefaultEssayForm } from './formDefaults';

export const ESSAY_DRAFT_KEY = 'ui_draft_essay';
export const APPLICATION_DRAFT_KEY = 'ui_draft_application';
export const ONBOARDING_DISMISSED_KEY = 'ui_onboarding_dismissed';
export const ONBOARDING_HIDDEN_KEY = 'ui_onboarding_hidden';

function parseDraft(rawValue, fallbackFactory) {
  if (!rawValue) return { value: fallbackFactory(), recovered: false };
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') {
      return { value: fallbackFactory(), recovered: false };
    }
    return { value: parsed, recovered: true };
  } catch {
    return { value: fallbackFactory(), recovered: false };
  }
}

export function loadEssayDraft() {
  return parseDraft(localStorage.getItem(ESSAY_DRAFT_KEY), () => createDefaultEssayForm());
}

export function loadApplicationDraft() {
  return parseDraft(localStorage.getItem(APPLICATION_DRAFT_KEY), () => createDefaultApplicationForm());
}

export function hasEssayDraftContent(draft) {
  return Boolean(
    (draft.school_name || '').trim() ||
      (draft.essay_prompt || '').trim() ||
      (draft.essay_content || '').trim()
  );
}

export function hasApplicationDraftContent(draft) {
  return Boolean(
    (draft.school_name || '').trim() ||
      (draft.deadline || '').trim() ||
      (draft.requirements_notes || '').trim() ||
      (draft.application_fee || '').toString().trim() ||
      (draft.program_total_fee || '').toString().trim()
  );
}
