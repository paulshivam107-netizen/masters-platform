import React from 'react';

function TrackerView({
  handleOpenApplicationForm,
  applicationSearch,
  setApplicationSearch,
  applicationSummary,
  formatCurrencyTotals,
  showApplicationForm,
  editingApplicationId,
  handleApplicationSubmit,
  applicationFormData,
  setApplicationFormData,
  UNIVERSITY_OPTIONS,
  DEGREE_OPTIONS,
  applicationDegreeChoice,
  setApplicationDegreeChoice,
  setApplicationCustomDegree,
  applicationCustomDegree,
  applicationLoading,
  setShowApplicationForm,
  resetApplicationForm,
  handleDiscardApplicationDraft,
  applicationDraftRecovered,
  filteredApplications,
  getDaysUntilDeadline,
  getApplicationReadiness,
  parseDate,
  handleDeleteApplication,
  programCatalog,
  programCatalogLoading,
  onApplyProgramCatalogItem
}) {
  const [catalogSelectionId, setCatalogSelectionId] = React.useState('');

  const normalizeValue = (value) => (value || '').trim().toLowerCase();
  const matchedCatalogEntry = (programCatalog || []).find(
    (item) =>
      normalizeValue(item.school_name) === normalizeValue(applicationFormData.school_name) &&
      normalizeValue(item.program_name) === normalizeValue(applicationFormData.program_name)
  );

  return (
            <div className="tracker-panel">
              <div className="tracker-top-row">
                <div>
                  <h2 data-testid="tracker-heading">Applications Tracker</h2>
                  <p>Track deadlines, fees, and requirements for every school in one place.</p>
                </div>
                <button type="button" data-testid="tracker-add-application" className="new-essay-btn tracker-add-btn" onClick={() => handleOpenApplicationForm()}>
                  + Add Application
                </button>
              </div>
              <div className="tracker-search-row">
                <input
                  data-testid="tracker-search-input"
                  type="text"
                  value={applicationSearch}
                  onChange={(e) => setApplicationSearch(e.target.value)}
                  placeholder="Search school, degree, status, decision..."
                />
              </div>

              <div className="tracker-metrics-grid">
                <div className="tracker-metric-card">
                  <h3>Upcoming Deadlines</h3>
                  <p>{applicationSummary.upcoming}</p>
                </div>
                <div className="tracker-metric-card">
                  <h3>Due in 21 Days</h3>
                  <p>{applicationSummary.dueSoon}</p>
                </div>
                <div className="tracker-metric-card">
                  <h3>Total Application Fees</h3>
                  <p>{formatCurrencyTotals(applicationSummary.applicationFeesByCurrency)}</p>
                </div>
                <div className="tracker-metric-card">
                  <h3>Total Program Fees</h3>
                  <p>{formatCurrencyTotals(applicationSummary.programFeesByCurrency)}</p>
                </div>
              </div>

              {showApplicationForm && (
                <div className="tracker-form-card" data-testid="tracker-form-card">
                  <h3>{editingApplicationId ? 'Edit Application' : 'Add New Application'}</h3>
                  {applicationDraftRecovered && !editingApplicationId && (
                    <div className="draft-recovered-banner">
                      <p>Recovered unsaved application draft from this browser.</p>
                      <button type="button" onClick={handleDiscardApplicationDraft}>
                        Discard local draft
                      </button>
                    </div>
                  )}
                  <form className="tracker-form" onSubmit={handleApplicationSubmit}>
                    <div className="tracker-form-grid">
                      <div className="form-group">
                        <label>Quick Fill from Catalog</label>
                        <select
                          data-testid="tracker-program-catalog-select"
                          value={catalogSelectionId}
                          onChange={(e) => {
                            const nextId = e.target.value;
                            setCatalogSelectionId(nextId);
                            const selectedItem = (programCatalog || []).find((item) => item.id === nextId);
                            if (selectedItem) {
                              onApplyProgramCatalogItem(selectedItem);
                            }
                          }}
                        >
                          <option value="">Select school/program...</option>
                          {(programCatalog || []).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.school_name} - {item.program_name}
                            </option>
                          ))}
                        </select>
                        {programCatalogLoading && <small>Loading program catalog...</small>}
                      </div>
                      <div className="form-group">
                        <label>School Name</label>
                        <input
                          data-testid="tracker-school-input"
                          type="text"
                          value={applicationFormData.school_name}
                          onChange={(e) =>
                            setApplicationFormData({ ...applicationFormData, school_name: e.target.value })
                          }
                          list="application-university-options"
                          placeholder="e.g., Harvard Business School"
                          required
                        />
                        <datalist id="application-university-options">
                          {UNIVERSITY_OPTIONS.map((school) => (
                            <option key={school} value={school} />
                          ))}
                        </datalist>
                      </div>
                      <div className="form-group">
                        <label>Degree</label>
                        <select
                          data-testid="tracker-degree-select"
                          value={applicationDegreeChoice}
                          onChange={(e) => {
                            const choice = e.target.value;
                            setApplicationDegreeChoice(choice);
                            if (choice !== 'Other') {
                              setApplicationCustomDegree('');
                              setApplicationFormData({ ...applicationFormData, program_name: choice });
                            }
                          }}
                          required
                        >
                          {DEGREE_OPTIONS.map((degree) => (
                            <option key={degree} value={degree}>
                              {degree}
                            </option>
                          ))}
                        </select>
                      </div>
                      {applicationDegreeChoice === 'Other' && (
                        <div className="form-group">
                          <label>Custom Degree</label>
                          <input
                            data-testid="tracker-custom-degree-input"
                            type="text"
                            value={applicationCustomDegree}
                            onChange={(e) => {
                              const value = e.target.value;
                              setApplicationCustomDegree(value);
                              setApplicationFormData({ ...applicationFormData, program_name: value });
                            }}
                            placeholder="Enter your degree"
                            required
                          />
                        </div>
                      )}
                      <div className="form-group">
                        <label>Application Round</label>
                        <input
                          type="text"
                          value={applicationFormData.application_round}
                          onChange={(e) =>
                            setApplicationFormData({ ...applicationFormData, application_round: e.target.value })
                          }
                          placeholder="Round 1"
                        />
                      </div>
                      <div className="form-group">
                        <label>Deadline</label>
                        <input
                          data-testid="tracker-deadline-input"
                          type="date"
                          value={applicationFormData.deadline}
                          onChange={(e) =>
                            setApplicationFormData({ ...applicationFormData, deadline: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Application Fee</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={applicationFormData.application_fee}
                          onChange={(e) =>
                            setApplicationFormData({ ...applicationFormData, application_fee: e.target.value })
                          }
                          placeholder="250"
                        />
                      </div>
                      <div className="form-group">
                        <label>Total Program Fee</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={applicationFormData.program_total_fee}
                          onChange={(e) =>
                            setApplicationFormData({ ...applicationFormData, program_total_fee: e.target.value })
                          }
                          placeholder="120000"
                        />
                      </div>
                      <div className="form-group">
                        <label>Fee Currency</label>
                        <select
                          value={applicationFormData.fee_currency}
                          onChange={(e) =>
                            setApplicationFormData({ ...applicationFormData, fee_currency: e.target.value })
                          }
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="INR">INR</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Essays Required</label>
                        <input
                          type="number"
                          min="0"
                          value={applicationFormData.essays_required}
                          onChange={(e) =>
                            setApplicationFormData({ ...applicationFormData, essays_required: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>LORs Required</label>
                        <input
                          type="number"
                          min="0"
                          value={applicationFormData.lors_required}
                          onChange={(e) =>
                            setApplicationFormData({ ...applicationFormData, lors_required: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>LORs Submitted</label>
                        <input
                          type="number"
                          min="0"
                          value={applicationFormData.lors_submitted}
                          onChange={(e) =>
                            setApplicationFormData({ ...applicationFormData, lors_submitted: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group form-group-checkbox">
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(applicationFormData.interview_required)}
                            onChange={(e) =>
                              setApplicationFormData({
                                ...applicationFormData,
                                interview_required: e.target.checked,
                                interview_completed: e.target.checked ? applicationFormData.interview_completed : false
                              })
                            }
                          />
                          Interview Required
                        </label>
                      </div>
                      <div className="form-group form-group-checkbox">
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(applicationFormData.interview_completed)}
                            disabled={!applicationFormData.interview_required}
                            onChange={(e) =>
                              setApplicationFormData({ ...applicationFormData, interview_completed: e.target.checked })
                            }
                          />
                          Interview Completed
                        </label>
                      </div>
                      <div className="form-group">
                        <label>Decision Status</label>
                        <select
                          value={applicationFormData.decision_status}
                          onChange={(e) =>
                            setApplicationFormData({ ...applicationFormData, decision_status: e.target.value })
                          }
                        >
                          <option>Pending</option>
                          <option>Interview Invite</option>
                          <option>Waitlisted</option>
                          <option>Admitted</option>
                          <option>Rejected</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Status</label>
                        <select
                          data-testid="tracker-status-select"
                          value={applicationFormData.status}
                          onChange={(e) =>
                            setApplicationFormData({ ...applicationFormData, status: e.target.value })
                          }
                        >
                          <option>Planning</option>
                          <option>In Progress</option>
                          <option>Submitted</option>
                          <option>Awaiting Decision</option>
                        </select>
                      </div>
                    </div>

                    {matchedCatalogEntry && (
                      <div className="tracker-catalog-meta" data-testid="tracker-catalog-meta">
                        <small>
                          Catalog match: {matchedCatalogEntry.confidence || 'medium'} confidence
                          {matchedCatalogEntry.last_updated ? ` · Updated ${matchedCatalogEntry.last_updated}` : ''}
                        </small>
                        {matchedCatalogEntry.source_url && (
                          <a href={matchedCatalogEntry.source_url} target="_blank" rel="noreferrer">
                            Source
                          </a>
                        )}
                      </div>
                    )}

                    <div className="form-group">
                      <label>Requirements Notes</label>
                      <textarea
                        data-testid="tracker-requirements-notes-input"
                        value={applicationFormData.requirements_notes}
                        onChange={(e) =>
                          setApplicationFormData({
                            ...applicationFormData,
                            requirements_notes: e.target.value
                          })
                        }
                        placeholder="Example: 3 essays, 2 LORs, GMAT required, video interview."
                      />
                    </div>

                    <div className="form-actions">
                      <button type="submit" data-testid="tracker-save-application" disabled={applicationLoading}>
                        {applicationLoading ? 'Saving...' : editingApplicationId ? 'Update Application' : 'Save Application'}
                      </button>
                      <button
                        type="button"
                        data-testid="tracker-cancel-application"
                        onClick={() => {
                          setShowApplicationForm(false);
                          resetApplicationForm();
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="tracker-list-grid">
                {filteredApplications.length === 0 ? (
                  <div className="empty-state-main tracker-empty-state">
                    {applicationSearch.trim() ? (
                      <>
                        <h2>No matching applications</h2>
                        <p>Try a different search term or add a new application.</p>
                      </>
                    ) : (
                      <>
                        <h2>No applications yet</h2>
                        <p>Add your first school to start tracking deadlines, fees, and requirements.</p>
                        <button type="button" className="history-btn" onClick={() => handleOpenApplicationForm()}>
                          Add Application
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  filteredApplications.map((application) => {
                    const daysUntil = getDaysUntilDeadline(application.deadline);
                    const readiness = getApplicationReadiness(application);
                    const catalogMatch = (programCatalog || []).find(
                      (item) =>
                        normalizeValue(item.school_name) === normalizeValue(application.school_name) &&
                        normalizeValue(item.program_name) === normalizeValue(application.program_name)
                    );
                    const deadlineText =
                      daysUntil === null
                        ? 'No deadline'
                        : daysUntil < 0
                          ? 'Deadline passed'
                          : daysUntil === 0
                            ? 'Due today'
                            : `${daysUntil} day${daysUntil === 1 ? '' : 's'} left`;

                    return (
                      <article key={application.id} className="application-card" data-testid="tracker-application-card">
                        <div className="application-card-top">
                          <div>
                            <h3>{application.school_name}</h3>
                            <p className="application-program">{application.program_name}</p>
                          </div>
                          <span className="application-status">{application.status}</span>
                        </div>
                        <div className="application-meta-grid">
                          <p>
                            <strong>Round:</strong> {application.application_round || 'Not set'}
                          </p>
                          <p>
                            <strong>Deadline:</strong>{' '}
                            {parseDate(application.deadline)?.toLocaleDateString() || 'Not set'}
                          </p>
                          <p>
                            <strong>Fee:</strong>{' '}
                            {application.application_fee
                              ? `${application.fee_currency} ${Number(application.application_fee).toLocaleString()}`
                              : 'Not added'}
                          </p>
                          <p>
                            <strong>Program Fee:</strong>{' '}
                            {application.program_total_fee
                              ? `${application.fee_currency} ${Number(application.program_total_fee).toLocaleString()}`
                              : 'Not added'}
                          </p>
                          <p>
                            <strong>Requirements:</strong> {application.essays_required} essays, {application.lors_required} LORs
                          </p>
                          <p>
                            <strong>LOR Progress:</strong> {application.lors_submitted}/{application.lors_required}
                          </p>
                          <p>
                            <strong>Interview:</strong>{' '}
                            {application.interview_required ? (application.interview_completed ? 'Completed' : 'Pending') : 'Not required'}
                          </p>
                          <p>
                            <strong>Decision:</strong> {application.decision_status || 'Pending'}
                          </p>
                        </div>
                        {application.requirements_notes && (
                          <p className="application-notes">{application.requirements_notes}</p>
                        )}
                        {catalogMatch && (
                          <p className="application-notes">
                            Source: {catalogMatch.last_updated ? `updated ${catalogMatch.last_updated}` : 'catalog'}{' '}
                            {catalogMatch.source_url ? (
                              <a href={catalogMatch.source_url} target="_blank" rel="noreferrer">
                                View
                              </a>
                            ) : null}
                          </p>
                        )}
                        <div className="application-card-footer">
                          <span className={`deadline-chip ${daysUntil !== null && daysUntil < 0 ? 'late' : ''}`}>
                            {deadlineText}
                          </span>
                          <span className={`urgency-chip ${readiness.readiness >= 80 ? 'done' : readiness.readiness >= 50 ? 'critical' : 'upcoming'}`}>
                            Readiness {readiness.readiness}%
                          </span>
                          <div className="application-actions">
                            <button
                              type="button"
                              className="history-btn"
                              onClick={() => handleOpenApplicationForm(application)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDeleteApplication(application.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
  );
}

export default TrackerView;
