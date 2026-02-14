import { getDaysUntilDeadline } from './derived';

export const buildDeadlinesIcsContent = ({ applications, parseDate, now = new Date() }) => {
  const datedApplications = applications.filter((application) => parseDate(application.deadline));
  if (!datedApplications.length) return null;

  const dtStamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
    now.getUTCDate()
  ).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(
    2,
    '0'
  )}${String(now.getUTCSeconds()).padStart(2, '0')}Z`;

  const events = datedApplications
    .map((application) => {
      const dateObj = parseDate(application.deadline);
      if (!dateObj) return '';
      const start = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(
        dateObj.getDate()
      ).padStart(2, '0')}`;
      const endDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1);
      const end = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(
        endDate.getDate()
      ).padStart(2, '0')}`;
      const safeSchool = (application.school_name || 'Application').replace(/[,;\n]/g, ' ');
      const safeProgram = (application.program_name || 'Program').replace(/[,;\n]/g, ' ');
      const summary = `${safeSchool} ${safeProgram} Deadline`;
      const description = `Round: ${application.application_round || 'N/A'}\\nStatus: ${
        application.status || 'Planning'
      }\\nDecision: ${application.decision_status || 'Pending'}`;
      return [
        'BEGIN:VEVENT',
        `UID:${application.id}-${start}@masters-platform`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        'END:VEVENT'
      ].join('\r\n');
    })
    .filter(Boolean)
    .join('\r\n');

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Masters Application Platform//EN', events, 'END:VCALENDAR'].join(
    '\r\n'
  );
};

export const buildPortfolioSnapshotData = ({
  applications,
  essays,
  profileFormData,
  user,
  docStatusByApplication,
  interviewPrepByApplication,
  researchByApplication,
  getApplicationReadiness
}) => {
  const applicationsWithReadiness = applications.map((application) => {
    const readiness = getApplicationReadiness(application);
    return {
      ...application,
      readiness_score: readiness.readiness,
      essays_drafted: readiness.essayDrafted,
      docs_ready: readiness.docsReady,
      days_until_deadline: getDaysUntilDeadline(application.deadline)
    };
  });

  return {
    generated_at: new Date().toISOString(),
    profile: {
      name: profileFormData.name || user?.name || '',
      target_intake: profileFormData.target_intake,
      target_countries: profileFormData.target_countries,
      preferred_currency: profileFormData.preferred_currency
    },
    summary: {
      applications: applications.length,
      essays: essays.length,
      upcoming_deadlines: applicationsWithReadiness.filter((app) => app.days_until_deadline !== null && app.days_until_deadline >= 0)
        .length
    },
    applications: applicationsWithReadiness,
    essays,
    documents: docStatusByApplication,
    interview_prep: interviewPrepByApplication,
    school_research: researchByApplication
  };
};

const toCsvCell = (value) => {
  const normalized = value === null || value === undefined ? '' : String(value);
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
};

export const buildApplicationsCsvContent = ({ applications, getApplicationReadiness }) => {
  const headers = [
    'School',
    'Program',
    'Round',
    'Deadline',
    'Days Until Deadline',
    'Status',
    'Decision'
  ];

  const rows = applications.map((application) => {
    return [
      application.school_name,
      application.program_name,
      application.application_round,
      application.deadline,
      getDaysUntilDeadline(application.deadline),
      application.status,
      application.decision_status
    ];
  });

  return [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
};
