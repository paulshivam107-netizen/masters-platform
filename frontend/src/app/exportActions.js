import {
  buildApplicationsCsvContent,
  buildDeadlinesIcsContent
} from './exporters';
import { getDaysUntilDeadline } from './derived';

export function createExportActions({
  applications,
  essays,
  interviewPrepByApplication,
  researchByApplication,
  getApplicationReadiness,
  parseDate
}) {
  const downloadTextFile = (filename, content, mimeType = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleExportDeadlinesICS = () => {
    const calendarContent = buildDeadlinesIcsContent({ applications, parseDate });
    if (!calendarContent) {
      alert('Add at least one application deadline before exporting calendar events.');
      return;
    }
    downloadTextFile('application-deadlines.ics', calendarContent, 'text/calendar;charset=utf-8');
  };

  const handleExportApplicationsCsv = () => {
    const content = buildApplicationsCsvContent({ applications, getApplicationReadiness });
    downloadTextFile(
      `applications-${new Date().toISOString().slice(0, 10)}.csv`,
      content,
      'text/csv;charset=utf-8'
    );
  };

  const buildShareSummary = () => {
    const totalApps = applications.length;
    const totalEssays = essays.length;
    const interviewCount = Object.keys(interviewPrepByApplication || {}).length;
    const researchCount = Object.keys(researchByApplication || {}).length;
    const readinessValues = applications.map((application) => getApplicationReadiness(application).readiness);
    const readinessAvg =
      readinessValues.length > 0
        ? Math.round(readinessValues.reduce((sum, value) => sum + value, 0) / readinessValues.length)
        : 0;
    const upcoming = applications
      .map((application) => {
        const days = getDaysUntilDeadline(application.deadline, parseDate);
        return {
          school: application.school_name || 'School',
          program: application.program_name || 'Program',
          deadline: application.deadline,
          days
        };
      })
      .filter((row) => row.deadline && row.days !== null && row.days >= 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);

    const lines = [
      `MBA Platform Summary (${new Date().toISOString().slice(0, 10)})`,
      `Applications: ${totalApps}`,
      `Essays: ${totalEssays}`,
      `Research cards: ${researchCount}`,
      `Interview notes: ${interviewCount}`,
      `Average readiness: ${readinessAvg}%`
    ];

    if (upcoming.length) {
      lines.push('Upcoming deadlines:');
      upcoming.forEach((row) => {
        lines.push(`- ${row.school} ${row.program}: ${row.deadline} (${row.days} days)`);
      });
    }
    return lines.join('\n');
  };

  const handleCopyShareSummary = async () => {
    const summary = buildShareSummary();
    try {
      await navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard.');
    } catch {
      alert('Clipboard access is unavailable in this browser.');
    }
  };

  return {
    handleExportDeadlinesICS,
    handleExportApplicationsCsv,
    handleCopyShareSummary
  };
}
