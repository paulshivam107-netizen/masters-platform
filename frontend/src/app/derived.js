export const parseDate = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  const [year, month, day] = String(dateValue).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const getDaysUntilDeadline = (deadlineValue, parseDateFn = parseDate) => {
  const deadlineDate = parseDateFn(deadlineValue);
  if (!deadlineDate) return null;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const deadlineMidnight = new Date(
    deadlineDate.getFullYear(),
    deadlineDate.getMonth(),
    deadlineDate.getDate()
  );
  return Math.ceil((deadlineMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
};

export const formatCurrencyTotals = (totals) => {
  const entries = Object.entries(totals);
  if (!entries.length) return '0';
  return entries
    .map(([currency, amount]) => `${currency} ${Math.round(amount).toLocaleString()}`)
    .join(' | ');
};

export const getEssayCountForApplication = (application, essays) =>
  essays.filter(
    (essay) =>
      essay.application_id === application.id ||
      ((essay.school_name || '').trim().toLowerCase() ===
        (application.school_name || '').trim().toLowerCase() &&
        (essay.program_type || '').trim().toLowerCase() ===
          (application.program_name || '').trim().toLowerCase())
  ).length;

export const getApplicationReadiness = ({
  application,
  essays,
  docStatusByApplication,
  DOC_TEMPLATES,
  getDocScopeKey
}) => {
  const essayTarget = Number(application.essays_required || 0);
  const essayDrafted = getEssayCountForApplication(application, essays);
  const essayScore = essayTarget === 0 ? 1 : Math.min(essayDrafted / essayTarget, 1);

  const lorTarget = Number(application.lors_required || 0);
  const lorSubmitted = Number(application.lors_submitted || 0);
  const lorScore = lorTarget === 0 ? 1 : Math.min(lorSubmitted / lorTarget, 1);

  const docsScope = docStatusByApplication[getDocScopeKey(application.id)] || {};
  const docsReady = DOC_TEMPLATES.filter((doc) => docsScope[doc.id]?.status === 'ready').length;
  const docScore = DOC_TEMPLATES.length ? docsReady / DOC_TEMPLATES.length : 0;

  const interviewScore = !application.interview_required || application.interview_completed ? 1 : 0;
  const readiness = Math.round((essayScore * 0.4 + lorScore * 0.25 + docScore * 0.25 + interviewScore * 0.1) * 100);

  return { readiness, docsReady, essayDrafted, essayTarget, lorSubmitted, lorTarget };
};

export const filterApplications = ({ applications, applicationSearch, parseDateFn = parseDate }) =>
  applications.filter((application) => {
    if (!applicationSearch.trim()) return true;
    const query = applicationSearch.trim().toLowerCase();
    const deadlineLabel = parseDateFn(application.deadline)?.toLocaleDateString()?.toLowerCase() || '';
    return (
      (application.school_name || '').toLowerCase().includes(query) ||
      (application.program_name || '').toLowerCase().includes(query) ||
      (application.application_round || '').toLowerCase().includes(query) ||
      (application.status || '').toLowerCase().includes(query) ||
      (application.decision_status || '').toLowerCase().includes(query) ||
      (application.fee_currency || '').toLowerCase().includes(query) ||
      (application.requirements_notes || '').toLowerCase().includes(query) ||
      deadlineLabel.includes(query)
    );
  });

export const buildApplicationSummary = ({ applications, getDaysUntilDeadlineFn = getDaysUntilDeadline }) => {
  const addCurrencyTotal = (bucket, currency, amount) => {
    if (!currency || !Number.isFinite(amount)) return;
    bucket[currency] = (bucket[currency] || 0) + amount;
  };

  return applications.reduce(
    (acc, application) => {
      const daysUntil = getDaysUntilDeadlineFn(application.deadline);
      if (daysUntil !== null && daysUntil >= 0) acc.upcoming += 1;
      if (daysUntil !== null && daysUntil >= 0 && daysUntil <= 21) acc.dueSoon += 1;
      if (application.application_fee) {
        addCurrencyTotal(
          acc.applicationFeesByCurrency,
          (application.fee_currency || 'USD').toUpperCase(),
          Number(application.application_fee)
        );
      }
      if (application.program_total_fee) {
        addCurrencyTotal(
          acc.programFeesByCurrency,
          (application.fee_currency || 'USD').toUpperCase(),
          Number(application.program_total_fee)
        );
      }
      return acc;
    },
    { upcoming: 0, dueSoon: 0, applicationFeesByCurrency: {}, programFeesByCurrency: {} }
  );
};

export const buildApplicationReadinessRows = ({ applications, getApplicationReadinessFn }) =>
  applications.map((application) => ({
    application,
    readiness: getApplicationReadinessFn(application)
  }));

export const buildAverageReadiness = (applicationReadinessRows) =>
  applicationReadinessRows.length
    ? Math.round(
        applicationReadinessRows.reduce((sum, item) => sum + item.readiness.readiness, 0) /
          applicationReadinessRows.length
      )
    : 0;

export const buildGeneratedNotifications = ({
  applicationReadinessRows,
  getDaysUntilDeadlineFn = getDaysUntilDeadline,
  docStatusByApplication,
  DOC_TEMPLATES,
  getDocScopeKey,
  reminderDayMarkers
}) =>
  applicationReadinessRows.flatMap(({ application, readiness }) => {
    const notices = [];
    const daysUntil = getDaysUntilDeadlineFn(application.deadline);
    const scopeDocs = docStatusByApplication[getDocScopeKey(application.id)] || {};
    const missingDocs = DOC_TEMPLATES.filter((doc) => (scopeDocs[doc.id]?.status || 'missing') === 'missing');

    if (daysUntil !== null) {
      if (daysUntil < 0) {
        notices.push({
          id: `deadline-overdue-${application.id}`,
          severity: 'high',
          title: `${application.school_name} deadline passed`,
          message: `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue`,
          targetNav: 'deadlines',
          applicationId: application.id
        });
      } else if (reminderDayMarkers.includes(daysUntil)) {
        notices.push({
          id: `deadline-reminder-${application.id}-${daysUntil}`,
          severity: daysUntil <= 7 ? 'high' : 'medium',
          title: `${application.school_name} due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
          message: `${application.program_name} • ${application.application_round || 'Round not set'}`,
          targetNav: 'deadlines',
          applicationId: application.id
        });
      }
    }

    if (readiness.readiness < 60) {
      notices.push({
        id: `readiness-low-${application.id}`,
        severity: 'medium',
        title: `${application.school_name} readiness is ${readiness.readiness}%`,
        message: 'Complete essays, LORs, and documents to improve readiness.',
        targetNav: 'requirements',
        applicationId: application.id
      });
    }

    if (application.interview_required && !application.interview_completed) {
      notices.push({
        id: `interview-pending-${application.id}`,
        severity: 'medium',
        title: `Interview prep pending for ${application.school_name}`,
        message: 'Add stories, notes, and schedule in Interview Prep Workspace.',
        targetNav: 'interviews',
        applicationId: application.id
      });
    }

    if (missingDocs.length >= 3) {
      notices.push({
        id: `docs-missing-${application.id}`,
        severity: 'low',
        title: `${missingDocs.length} documents missing for ${application.school_name}`,
        message: 'Update checklist in Document Center.',
        targetNav: 'docs',
        applicationId: application.id
      });
    }

    return notices;
  });

export const buildApplicationDecisionMatrixRows = ({
  applications,
  applicationReadinessRows,
  getDaysUntilDeadlineFn = getDaysUntilDeadline,
  decisionMatrixWeights,
  DOC_TEMPLATES
}) => {
  const matrixWeightTotal =
    Object.values(decisionMatrixWeights).reduce((sum, value) => sum + Number(value || 0), 0) || 1;

  const maxProgramFee = applications.reduce((maxValue, application) => {
    const feeCandidate = Number(application.program_total_fee || application.application_fee || 0);
    return Math.max(maxValue, Number.isFinite(feeCandidate) ? feeCandidate : 0);
  }, 0);

  const decisionScoreLookup = {
    Admitted: 100,
    'Interview Invite': 75,
    Waitlisted: 55,
    Pending: 45,
    Rejected: 5
  };

  return applicationReadinessRows
    .map(({ application, readiness }) => {
      const daysUntil = getDaysUntilDeadlineFn(application.deadline);
      const deadlineScore =
        daysUntil === null
          ? 45
          : daysUntil < 0
            ? 0
            : daysUntil <= 7
              ? 100
              : daysUntil <= 21
                ? 88
                : daysUntil <= 45
                  ? 72
                  : 55;
      const feeCandidate = Number(application.program_total_fee || application.application_fee || 0);
      const affordabilityScore =
        maxProgramFee > 0 ? Math.max(12, Math.round((1 - feeCandidate / maxProgramFee) * 100)) : 70;
      const decisionScore = decisionScoreLookup[application.decision_status] ?? 45;
      const docsScore = DOC_TEMPLATES.length ? Math.round((readiness.docsReady / DOC_TEMPLATES.length) * 100) : 0;

      const weightedScore = Math.round(
        (readiness.readiness * Number(decisionMatrixWeights.readiness || 0) +
          deadlineScore * Number(decisionMatrixWeights.deadline || 0) +
          affordabilityScore * Number(decisionMatrixWeights.affordability || 0) +
          decisionScore * Number(decisionMatrixWeights.decision || 0) +
          docsScore * Number(decisionMatrixWeights.documents || 0)) /
          matrixWeightTotal
      );

      return {
        application,
        weightedScore,
        readinessScore: readiness.readiness,
        deadlineScore,
        affordabilityScore,
        decisionScore,
        docsScore
      };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore);
};

export const buildVersionDiffRows = (baseText, compareText) => {
  const left = String(baseText || '')
    .replace(/\r/g, '')
    .split('\n');
  const right = String(compareText || '')
    .replace(/\r/g, '')
    .split('\n');
  const maxLines = Math.max(left.length, right.length);
  const rows = [];
  for (let i = 0; i < maxLines; i += 1) {
    const before = left[i] ?? '';
    const after = right[i] ?? '';
    if (before === after) {
      rows.push({ id: `same-${i}`, type: 'same', before, after });
    } else if (!before && after) {
      rows.push({ id: `added-${i}`, type: 'added', before: '', after });
    } else if (before && !after) {
      rows.push({ id: `removed-${i}`, type: 'removed', before, after: '' });
    } else {
      rows.push({ id: `changed-${i}`, type: 'changed', before, after });
    }
  }
  return rows;
};

export const buildTimelineData = ({ applications, timelineMonthOffset, parseDateFn = parseDate }) => {
  const todayDate = new Date();
  const timelineMonthDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + timelineMonthOffset, 1);
  const timelineMonthLabel = timelineMonthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const timelineStartWeekday = timelineMonthDate.getDay();
  const timelineDaysInMonth = new Date(
    timelineMonthDate.getFullYear(),
    timelineMonthDate.getMonth() + 1,
    0
  ).getDate();

  const timelineCells = [];
  const appByDeadlineKey = applications.reduce((acc, application) => {
    if (!application.deadline) return acc;
    const key = String(application.deadline);
    if (!acc[key]) acc[key] = [];
    acc[key].push(application);
    return acc;
  }, {});

  for (let i = 0; i < timelineStartWeekday; i += 1) {
    timelineCells.push({ kind: 'empty', key: `empty-${i}` });
  }
  for (let day = 1; day <= timelineDaysInMonth; day += 1) {
    const dateObj = new Date(timelineMonthDate.getFullYear(), timelineMonthDate.getMonth(), day);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    timelineCells.push({
      kind: 'day',
      key,
      day,
      dateValue: key,
      applications: appByDeadlineKey[key] || []
    });
  }

  const applicationsByDeadline = [...applications].sort((a, b) => {
    const aDate = parseDateFn(a.deadline);
    const bDate = parseDateFn(b.deadline);
    if (!aDate || !bDate) return 0;
    return aDate - bDate;
  });

  return {
    timelineMonthLabel,
    timelineCells,
    applicationsByDeadline
  };
};

export const buildDeadlineBuckets = ({ applicationsByDeadline, getDaysUntilDeadlineFn = getDaysUntilDeadline }) =>
  applicationsByDeadline.reduce(
    (acc, application) => {
      const days = getDaysUntilDeadlineFn(application.deadline);
      if (days === null) return acc;
      if (days < 0) acc.overdue.push(application);
      else if (days <= 14) acc.critical.push(application);
      else acc.upcoming.push(application);
      return acc;
    },
    { overdue: [], critical: [], upcoming: [] }
  );

export const buildRequirementsSummary = (applications) =>
  applications.reduce(
    (acc, application) => {
      acc.totalEssaysRequired += Number(application.essays_required || 0);
      acc.totalLorsRequired += Number(application.lors_required || 0);
      acc.totalLorsSubmitted += Number(application.lors_submitted || 0);
      if (application.interview_required) acc.interviewsRequired += 1;
      if (application.interview_completed) acc.interviewsCompleted += 1;
      acc.totalApplications += 1;
      return acc;
    },
    {
      totalEssaysRequired: 0,
      totalLorsRequired: 0,
      totalLorsSubmitted: 0,
      interviewsRequired: 0,
      interviewsCompleted: 0,
      totalApplications: 0
    }
  );

export const buildDocProgress = ({ DOC_TEMPLATES, activeDocsMap }) =>
  DOC_TEMPLATES.reduce(
    (acc, doc) => {
      const status = activeDocsMap[doc.id]?.status || 'missing';
      if (status === 'ready') acc.ready += 1;
      else if (status === 'in_progress') acc.inProgress += 1;
      else acc.missing += 1;
      return acc;
    },
    { ready: 0, inProgress: 0, missing: 0 }
  );

export const buildDocProgressOverall = ({ applications, docStatusByApplication, getDocScopeKey, DOC_TEMPLATES }) =>
  applications.reduce(
    (acc, application) => {
      const scopedDocs = docStatusByApplication[getDocScopeKey(application.id)] || {};
      for (const doc of DOC_TEMPLATES) {
        const status = scopedDocs[doc.id]?.status || 'missing';
        if (status === 'ready') acc.ready += 1;
        else if (status === 'in_progress') acc.inProgress += 1;
        else acc.missing += 1;
      }
      return acc;
    },
    { ready: 0, inProgress: 0, missing: 0 }
  );

export const buildResearchApplications = ({ applications, researchByApplication }) =>
  applications.filter(
    (application) =>
      Boolean(researchByApplication[application.id]?.website) ||
      Boolean(researchByApplication[application.id]?.program_highlights) ||
      Boolean(researchByApplication[application.id]?.career_outcomes) ||
      Boolean(researchByApplication[application.id]?.ranking_notes)
  );

export const buildInterviewApplications = ({ applications, interviewPrepByApplication }) =>
  applications.filter(
    (application) =>
      application.interview_required ||
      Boolean(interviewPrepByApplication[application.id]?.scheduled_at) ||
      Boolean(interviewPrepByApplication[application.id]?.strategy_notes)
  );
