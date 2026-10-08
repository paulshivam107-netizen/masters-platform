import { readUserValue } from "./workspaceStorage";
import {
  createDefaultApplicationForm,
  createDefaultEssayForm,
} from "./formDefaults";

export const ESSAY_DRAFT_KEY = "ui_draft_essay";
export const APPLICATION_DRAFT_KEY = "ui_draft_application";
export const ONBOARDING_DISMISSED_KEY = "ui_onboarding_dismissed";
export const ONBOARDING_HIDDEN_KEY = "ui_onboarding_hidden";

function parseDraft(rawValue, fallbackFactory) {
  if (!rawValue) return { value: fallbackFactory(), recovered: false };
  try {
    const parsed = rawValue;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { value: fallbackFactory(), recovered: false };
    }
    return { value: { ...fallbackFactory(), ...parsed }, recovered: true };
  } catch {
    return { value: fallbackFactory(), recovered: false };
  }
}

export function loadEssayDraft(userId) {
  return parseDraft(readUserValue(userId, ESSAY_DRAFT_KEY, null), () =>
    createDefaultEssayForm(),
  );
}

export function loadApplicationDraft(userId) {
  return parseDraft(readUserValue(userId, APPLICATION_DRAFT_KEY, null), () =>
    createDefaultApplicationForm(),
  );
}

export function hasEssayDraftContent(draft) {
  return Boolean(
    (draft.school_name || "").trim() ||
      (draft.essay_prompt || "").trim() ||
      (draft.essay_content || "").trim(),
  );
}

export function hasApplicationDraftContent(draft) {
  return Boolean(
    (draft.school_name || "").trim() ||
      (draft.deadline || "").trim() ||
      (draft.requirements_notes || "").trim() ||
      (draft.application_fee || "").toString().trim() ||
      (draft.program_total_fee || "").toString().trim(),
  );
}
