import { DOC_TEMPLATES } from './constants';

export const DOC_GLOBAL_SCOPE = 'global';

export const getDocScopeKey = (applicationId) =>
  applicationId ? `application:${applicationId}` : DOC_GLOBAL_SCOPE;

export const getVersionIdentity = (version, idx) =>
  String(version?.id ?? `${version?.created_at || 'version'}-${idx}`);

export const isLegacyDocMap = (value) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  DOC_TEMPLATES.some((doc) => Object.prototype.hasOwnProperty.call(value, doc.id));

export const getDefaultInterviewPrep = () => ({
  scheduled_at: '',
  strategy_notes: '',
  stories_bank: '',
  mock_feedback: ''
});

export const getDefaultResearchCard = () => ({
  website: '',
  location: '',
  ranking_notes: '',
  program_highlights: '',
  career_outcomes: '',
  scholarship_notes: ''
});
