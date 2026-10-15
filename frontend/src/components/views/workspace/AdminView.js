import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminPilot from './AdminPilot';
import CatalogReview from './CatalogReview';

function AdminView({
  adminLoading,
  adminError,
  adminOverview,
  adminUsers,
  adminEvents,
  adminBreakdown,
  adminCoverage,
  adminAiRuntimeConfig,
  adminLastUpdatedAt,
  currentUserId,
  onChangeRole,
  onRefresh,
  onUpdateAiRuntimeConfig
}) {
  const USERS_BATCH = 20;
  const EVENTS_BATCH = 30;
  const sections = [['overview', 'Overview'], ['interviews', 'Interviews'], ['spending', 'Spending'], ['feedback', 'Feedback'], ['users', 'Users'], ['catalog', 'Programmes'], ['system', 'System']];
  const [searchParams, setSearchParams] = useSearchParams();
  const section = sections.some(([id]) => id === searchParams.get('section')) ? searchParams.get('section') : 'overview';
  const selectSection = id => setSearchParams({ section: id });
  const [pilotRefresh, setPilotRefresh] = useState(0);
  const [userSearch, setUserSearch] = useState('');

  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [roleUpdateLoading, setRoleUpdateLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [liveMessage, setLiveMessage] = useState('');
  const [visibleUsersCount, setVisibleUsersCount] = useState(USERS_BATCH);
  const [visibleEventsCount, setVisibleEventsCount] = useState(EVENTS_BATCH);
  const [aiConfigDraft, setAiConfigDraft] = useState({
    provider: 'mock',
    ai_enabled: true,
    openai_model: 'gpt-4o-mini',
    gemini_model: 'gemini-1.5-flash'
  });
  const [aiConfigSaving, setAiConfigSaving] = useState(false);
  const modalRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const toastIdRef = useRef(0);

  const EVENT_LABELS = {
    auth_login_success: 'Login success',
    auth_login_failure: 'Login failed',
    auth_signup_success: 'Sign-up success',
    auth_signup_failure: 'Sign-up failed',
    auth_google: 'Google login',
    ui_create_application_clicked: 'Clicked add application',
    ui_create_essay_clicked: 'Clicked new essay',
    ui_right_sidebar_essay_selected: 'Selected essay in sidebar',
    ui_error_boundary_triggered: 'UI error boundary triggered'
  };
  const AI_PROVIDER_LABELS = {
    mock: 'Mock (No API cost)',
    openai: 'OpenAI',
    gemini: 'Gemini'
  };

  const formatEventLabel = (name) => {
    if (!name) return 'Unknown event';
    if (EVENT_LABELS[name]) return EVENT_LABELS[name];
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };
  const pushToast = (kind, message) => {
    const id = toastIdRef.current + 1;
    toastIdRef.current = id;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setLiveMessage(message);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  };

  const handleAiConfigSubmit = async (event) => {
    event.preventDefault();
    try {
      setAiConfigSaving(true);
      await onUpdateAiRuntimeConfig({
        ...aiConfigDraft,
        openai_model: (aiConfigDraft.openai_model || '').trim(),
        gemini_model: (aiConfigDraft.gemini_model || '').trim()
      });
      pushToast('success', 'AI runtime config updated.');
    } catch (error) {
      pushToast('error', error?.message || 'Failed to update AI runtime config.');
    } finally {
      setAiConfigSaving(false);
    }
  };

  const openRoleChangeModal = (row) => {
    lastFocusedRef.current = document.activeElement;
    const nextRole = row.role === 'admin' ? 'user' : 'admin';
    setPendingRoleChange({
      userId: row.id,
      email: row.email,
      currentRole: row.role,
      nextRole
    });
  };

  const closeRoleChangeModal = useCallback(() => {
    if (roleUpdateLoading) return;
    setPendingRoleChange(null);
    if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === 'function') {
      lastFocusedRef.current.focus();
    }
  }, [roleUpdateLoading]);

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    try {
      setRoleUpdateLoading(true);
      await onChangeRole(pendingRoleChange.userId, pendingRoleChange.nextRole);
      pushToast('success', `Updated ${pendingRoleChange.email} to ${pendingRoleChange.nextRole}.`);
      setPendingRoleChange(null);
    } catch (error) {
      pushToast('error', error?.message || 'Failed to update user role.');
    } finally {
      setRoleUpdateLoading(false);
    }
  };

  const handleRefreshClick = async () => {
    setPilotRefresh(n => n + 1);
    try {
      await onRefresh();
      setLiveMessage('Refresh requested. Each section shows its own loading or error state.');
    } catch (_error) {
      pushToast('error', 'Could not refresh admin data.');
    }
  };

  useEffect(() => {
    if (!pendingRoleChange || !modalRef.current) return;

    const dialog = modalRef.current;
    const focusables = dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (first && typeof first.focus === 'function') {
      first.focus();
    } else {
      dialog.focus();
    }

    const handleKeyDown = (event) => {
      if (!pendingRoleChange) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeRoleChangeModal();
        return;
      }

      if (event.key === 'Tab' && focusables.length > 0) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeRoleChangeModal, pendingRoleChange]);

  useEffect(() => {
    if (!pendingRoleChange) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [pendingRoleChange]);

  useEffect(() => {
    if (!adminError) return;
    pushToast('error', adminError);
  }, [adminError]);

  useEffect(() => {
    if (!adminAiRuntimeConfig) return;
    setAiConfigDraft({
      provider: adminAiRuntimeConfig.provider || 'mock',
      ai_enabled: Boolean(adminAiRuntimeConfig.ai_enabled),
      openai_model: adminAiRuntimeConfig.openai_model || 'gpt-4o-mini',
      gemini_model: adminAiRuntimeConfig.gemini_model || 'gemini-1.5-flash'
    });
  }, [adminAiRuntimeConfig]);

  useEffect(() => {
    setVisibleUsersCount(USERS_BATCH);
  }, [adminUsers.length]);

  useEffect(() => {
    setVisibleEventsCount(EVENTS_BATCH);
  }, [adminEvents.length]);

  const filteredUsers = adminUsers.filter(row => `${row.email} ${row.name || ''}`.toLowerCase().includes(userSearch.toLowerCase()));
  const visibleUsers = filteredUsers.slice(0, visibleUsersCount);
  const visibleEvents = adminEvents.slice(0, visibleEventsCount);
  const hasMoreUsers = visibleUsersCount < filteredUsers.length;
  const hasMoreEvents = visibleEventsCount < adminEvents.length;

  return (
    <div className="settings-panel admin-panel">
      <h2 className="sr-only" data-testid="admin-heading">Pilot Admin</h2>
      <div className="sr-only" aria-live="polite">{liveMessage}</div>
      <div className="admin-toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={`toast-${toast.id}`} className={`admin-toast admin-toast-${toast.kind}`}>
            <span>{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>

      <div className="admin-toolbar" data-testid="admin-toolbar">
        <div className="admin-toolbar-title-wrap">
          <h2>Pilot Admin</h2>
          <p className="pilot-muted">Support applicants, review usage and keep the pilot running.</p>
          {adminLastUpdatedAt && (
            <p className="admin-last-updated">Last updated {new Date(adminLastUpdatedAt).toLocaleTimeString()}</p>
          )}
        </div>
        <button
          type="button"
          data-testid="admin-refresh-button"
          onClick={handleRefreshClick}
          disabled={adminLoading}
          aria-busy={adminLoading}
          aria-label={adminLoading ? 'Refreshing admin data' : 'Refresh admin data'}
        >
          {adminLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <nav className="pilot-tabs" aria-label="Admin sections">{sections.map(([id, label]) => <button type="button" key={id} aria-current={section === id ? 'page' : undefined} onClick={() => selectSection(id)}>{label}</button>)}</nav>
      <AdminPilot key={currentUserId} section={section} refresh={pilotRefresh} overview={adminOverview} onSelect={selectSection}/>

      {adminError && <p className="admin-error" data-testid="admin-error" aria-live="assertive">{adminError}</p>}
      {adminLoading && !adminOverview && <p className="admin-loading" data-testid="admin-loading">Loading admin analytics...</p>}

      <div className="settings-grid admin-stats-grid" hidden={section !== 'system'}>
        <div className="settings-card settings-card-wide">
          <h3>AI controls</h3>
          <p className="pilot-muted">The AI pause switch also pauses live interviews and résumé generation. Provider/model selection below controls essay reviews; interview models are configured on the server.</p>
          <form className="admin-ai-config-form" onSubmit={handleAiConfigSubmit}>
            <div className="admin-ai-config-grid">
              <label htmlFor="admin-ai-provider">Provider</label>
              <select
                id="admin-ai-provider"
                data-testid="admin-ai-provider"
                value={aiConfigDraft.provider}
                onChange={(event) => setAiConfigDraft((prev) => ({ ...prev, provider: event.target.value }))}
                disabled={aiConfigSaving}
              >
                {Object.entries(AI_PROVIDER_LABELS).map(([value, label]) => (
                  <option key={`provider-${value}`} value={value}>{label}</option>
                ))}
              </select>

              <label htmlFor="admin-ai-enabled">AI Enabled</label>
              <select
                id="admin-ai-enabled"
                data-testid="admin-ai-enabled"
                value={aiConfigDraft.ai_enabled ? 'true' : 'false'}
                onChange={(event) => setAiConfigDraft((prev) => ({ ...prev, ai_enabled: event.target.value === 'true' }))}
                disabled={aiConfigSaving}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled (Kill switch)</option>
              </select>

              <label htmlFor="admin-ai-openai-model">OpenAI model</label>
              <input
                id="admin-ai-openai-model"
                data-testid="admin-ai-openai-model"
                type="text"
                value={aiConfigDraft.openai_model}
                onChange={(event) => setAiConfigDraft((prev) => ({ ...prev, openai_model: event.target.value }))}
                disabled={aiConfigSaving}
                placeholder="gpt-4o-mini"
              />

              <label htmlFor="admin-ai-gemini-model">Gemini model</label>
              <input
                id="admin-ai-gemini-model"
                data-testid="admin-ai-gemini-model"
                type="text"
                value={aiConfigDraft.gemini_model}
                onChange={(event) => setAiConfigDraft((prev) => ({ ...prev, gemini_model: event.target.value }))}
                disabled={aiConfigSaving}
                placeholder="gemini-1.5-flash"
              />
            </div>

            <p className="admin-ai-config-meta" data-testid="admin-ai-provider-ready">
              Provider status: {adminAiRuntimeConfig?.provider_ready ? 'Ready' : 'Missing API key'}
            </p>
            <p className="admin-ai-config-meta">
              OpenAI key: {adminAiRuntimeConfig?.provider_readiness?.openai ? 'configured' : 'missing'} | Gemini key: {adminAiRuntimeConfig?.provider_readiness?.gemini ? 'configured' : 'missing'}
            </p>
            <button type="submit" disabled={aiConfigSaving}>
              {aiConfigSaving ? 'Saving...' : 'Save AI config'}
            </button>
          </form>
        </div>

        <div className="settings-card"><h3>Total users</h3><p>{adminOverview?.total_users ?? 0}</p></div>
        <div className="settings-card"><h3>Enabled accounts</h3><p>{adminOverview?.active_users ?? 0}</p></div>
        <div className="settings-card"><h3>Verified users</h3><p>{adminOverview?.verified_users ?? 0}</p></div>
        <div className="settings-card"><h3>Total events</h3><p>{adminOverview?.total_events ?? 0}</p></div>
        <div className="settings-card"><h3>Events in last 7 days</h3><p>{adminOverview?.recent_events_7d ?? 0}</p></div>
        <div className="settings-card"><h3>Feedback in last 7 days</h3><p>{adminOverview?.recent_feedback_7d ?? 0}</p></div>
        <div className="settings-card"><h3>Daily active users (DAU)</h3><p>{adminOverview?.dau_users_1d ?? 0}</p></div>
        <div className="settings-card"><h3>Weekly active users (WAU)</h3><p>{adminOverview?.wau_users_7d ?? 0}</p></div>
        <div className="settings-card"><h3>New users (last 7 days)</h3><p>{adminOverview?.new_users_7d ?? 0}</p></div>
        <div className="settings-card"><h3>Activated users (last 7 days)</h3><p>{adminOverview?.activated_users_7d ?? 0}</p></div>
        <div className="settings-card"><h3>Application + essay activation</h3><p>{adminOverview?.activation_rate_7d ?? 0}%</p></div>
        <div className="settings-card"><h3>Error events (last 7 days)</h3><p>{adminOverview?.api_error_events_7d ?? 0}</p></div>
        <div className="settings-card"><h3>New applications (last 7 days)</h3><p>{adminOverview?.applications_created_7d ?? 0}</p></div>
        <div className="settings-card"><h3>New essays (last 7 days)</h3><p>{adminOverview?.essays_created_7d ?? 0}</p></div>
      </div>

      <div className="settings-grid">
        <div className="settings-card settings-card-wide" hidden={section !== 'system'}>
          <h3>Top Events</h3>
          <div className="admin-list">
            {adminBreakdown.length === 0 ? (
              <p>No events yet.</p>
            ) : (
              adminBreakdown.map((row) => (
                <p key={`event-breakdown-${row.event_name}`} data-testid="admin-event-breakdown-item">
                  <strong>{formatEventLabel(row.event_name)}</strong>: {row.count}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="settings-card settings-card-wide" hidden={section !== 'system'}>
          <h3>Telemetry Coverage (7d)</h3>
          {!adminCoverage ? (
            <p>Coverage not available yet.</p>
          ) : (
            <div className="admin-list">
              <p>
                <strong>{adminCoverage.tracked_events_7d}/{adminCoverage.required_events}</strong> key events tracked in the last 7 days.
              </p>
              {adminCoverage.items.map((item) => (
                <p key={`coverage-${item.event_name}`} data-testid="admin-coverage-item">
                  <strong>{formatEventLabel(item.event_name)}</strong>: {item.count_7d} {item.covered ? 'tracked' : 'missing'}
                </p>
              ))}
              {adminCoverage.missing_events.length > 0 && (
                <p data-testid="admin-coverage-missing">
                  Missing: {adminCoverage.missing_events.map((eventName) => formatEventLabel(eventName)).join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="settings-card settings-card-wide" hidden={section !== 'catalog'}>
          {section === 'catalog' && <CatalogReview />}
        </div>

        <div className="settings-card settings-card-wide" hidden={section !== 'users'}>
          <h3>Recent users</h3>
          <label className="pilot-user-search">Find in loaded users<input type="search" value={userSearch} onChange={e => { setUserSearch(e.target.value); setVisibleUsersCount(USERS_BATCH); }} placeholder="Email or name"/></label>
          <p className="pilot-muted">Showing the latest {adminUsers.length} accounts loaded by the admin API.</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="sr-only">Recent users with role and activity metrics</caption>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Apps</th>
                  <th>Essays</th>
                  <th>Role Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No users found.</td>
                  </tr>
                ) : (
                  visibleUsers.map((row) => (
                    <tr key={`admin-user-${row.id}`} data-testid="admin-user-row">
                      <td>{row.email}</td>
                      <td><span className={`admin-role-badge admin-role-${row.role}`}>{row.role}</span></td>
                      <td>{row.email_verified ? 'Yes' : 'No'}</td>
                      <td>{row.applications_count}</td>
                      <td>{row.essays_count}</td>
                      <td>
                        <button
                          className={`admin-role-action admin-role-action-${row.role === 'admin' ? 'demote' : 'promote'}`}
                          type="button"
                          data-testid="admin-role-action"
                          disabled={row.id === currentUserId}
                          title={row.id === currentUserId ? 'You cannot change your own role here.' : undefined}
                          onClick={() => openRoleChangeModal(row)}
                        >
                          {row.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {hasMoreUsers && (
              <button
                type="button"
                className="admin-load-more"
                onClick={() => setVisibleUsersCount((prev) => prev + USERS_BATCH)}
              >
                Load More Users
              </button>
            )}
          </div>
        </div>

        <div className="settings-card settings-card-wide" hidden={section !== 'system'}>
          <h3>Recent Telemetry Events</h3>
          <div className="admin-list">
            {adminEvents.length === 0 ? (
              <p>No telemetry events found.</p>
            ) : (
              visibleEvents.map((row) => (
                <p key={`admin-event-${row.id}`} data-testid="admin-telemetry-item">
                  <strong>{row.event_name}</strong> | user {row.user_id ?? '-'} | {new Date(row.created_at).toLocaleString()}
                </p>
              ))
            )}
            {hasMoreEvents && (
              <button
                type="button"
                className="admin-load-more"
                onClick={() => setVisibleEventsCount((prev) => prev + EVENTS_BATCH)}
              >
                Load More Events
              </button>
            )}
          </div>
        </div>
      </div>

      {pendingRoleChange && (
        <div className="admin-modal-backdrop" role="presentation" onClick={closeRoleChangeModal}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-role-modal-title"
            tabIndex="-1"
            ref={modalRef}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="admin-role-modal-title">Confirm Role Change</h3>
            <p>
              Change <strong>{pendingRoleChange.email}</strong> from{' '}
              <strong>{pendingRoleChange.currentRole}</strong> to{' '}
              <strong>{pendingRoleChange.nextRole}</strong>?
            </p>
            <div className="admin-modal-actions">
              <button type="button" onClick={closeRoleChangeModal} disabled={roleUpdateLoading}>
                Cancel
              </button>
              <button type="button" onClick={confirmRoleChange} disabled={roleUpdateLoading}>
                {roleUpdateLoading ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminView;
