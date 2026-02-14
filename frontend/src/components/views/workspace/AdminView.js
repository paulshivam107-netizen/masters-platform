import React, { useEffect, useRef, useState } from 'react';

function AdminView({
  adminLoading,
  adminError,
  adminOverview,
  adminUsers,
  adminEvents,
  adminFeedback,
  adminBreakdown,
  adminCoverage,
  adminLastUpdatedAt,
  currentUserId,
  onChangeRole,
  onRefresh,
  programCatalog,
  programCatalogLoading,
  onSaveProgramCatalogItem,
  onDeleteProgramCatalogItem
}) {
  const USERS_BATCH = 20;
  const EVENTS_BATCH = 30;
  const FEEDBACK_BATCH = 20;

  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [roleUpdateLoading, setRoleUpdateLoading] = useState(false);
  const [catalogEditingId, setCatalogEditingId] = useState(null);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogDeletingId, setCatalogDeletingId] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTouched, setCatalogTouched] = useState({});
  const [catalogErrors, setCatalogErrors] = useState({});
  const [catalogForm, setCatalogForm] = useState({
    id: '',
    school_name: '',
    program_name: '',
    degree: '',
    country: '',
    city: '',
    application_fee: '',
    fee_currency: 'USD',
    deadline_round_1: '',
    deadline_round_2: '',
    source_url: '',
    last_updated: '',
    confidence: 'medium'
  });
  const [toasts, setToasts] = useState([]);
  const [liveMessage, setLiveMessage] = useState('');
  const [visibleUsersCount, setVisibleUsersCount] = useState(USERS_BATCH);
  const [visibleEventsCount, setVisibleEventsCount] = useState(EVENTS_BATCH);
  const [visibleFeedbackCount, setVisibleFeedbackCount] = useState(FEEDBACK_BATCH);
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

  const resetCatalogForm = () => {
    setCatalogEditingId(null);
    setCatalogTouched({});
    setCatalogErrors({});
    setCatalogForm({
      id: '',
      school_name: '',
      program_name: '',
      degree: '',
      country: '',
      city: '',
      application_fee: '',
      fee_currency: 'USD',
      deadline_round_1: '',
      deadline_round_2: '',
      source_url: '',
      last_updated: '',
      confidence: 'medium'
    });
  };

  const generateCatalogSample = () => {
    const schools = ['Harvard Business School', 'Stanford GSB', 'Wharton', 'INSEAD', 'Chicago Booth'];
    const programs = ['MBA', 'MiM', 'MS Finance', 'MS Management', 'MBA/MPP'];
    const countries = ['USA', 'UK', 'France', 'Singapore', 'Canada'];
    const cities = ['Boston', 'Stanford', 'Philadelphia', 'Fontainebleau', 'Singapore'];
    const degrees = ['MBA', 'MS', 'MiM', 'MSc', 'MBA/MPP'];
    const fees = [250, 275, 300, 325, 350];

    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const baseDate = new Date();
    const round1 = new Date(baseDate);
    round1.setMonth(round1.getMonth() + 2);
    const round2 = new Date(baseDate);
    round2.setMonth(round2.getMonth() + 4);

    setCatalogEditingId(null);
    setCatalogTouched({});
    setCatalogErrors({});
    setCatalogForm({
      id: '',
      school_name: pick(schools),
      program_name: pick(programs),
      degree: pick(degrees),
      country: pick(countries),
      city: pick(cities),
      application_fee: String(pick(fees)),
      fee_currency: 'USD',
      deadline_round_1: round1.toISOString().slice(0, 10),
      deadline_round_2: round2.toISOString().slice(0, 10),
      source_url: 'https://example.edu/admissions',
      last_updated: baseDate.toISOString().slice(0, 10),
      confidence: 'medium'
    });
  };

  const beginCatalogEdit = (item) => {
    setCatalogEditingId(item.id);
    setCatalogTouched({});
    setCatalogErrors({});
    setCatalogForm({
      id: item.id || '',
      school_name: item.school_name || '',
      program_name: item.program_name || '',
      degree: item.degree || '',
      country: item.country || '',
      city: item.city || '',
      application_fee: item.application_fee === null || item.application_fee === undefined ? '' : String(item.application_fee),
      fee_currency: item.fee_currency || 'USD',
      deadline_round_1: item.deadline_round_1 || '',
      deadline_round_2: item.deadline_round_2 || '',
      source_url: item.source_url || '',
      last_updated: item.last_updated || '',
      confidence: item.confidence || 'medium'
    });
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

  const closeRoleChangeModal = () => {
    if (roleUpdateLoading) return;
    setPendingRoleChange(null);
    if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === 'function') {
      lastFocusedRef.current.focus();
    }
  };

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
    try {
      await onRefresh();
      pushToast('success', 'Admin data refreshed.');
    } catch (_error) {
      pushToast('error', 'Could not refresh admin data.');
    }
  };

  const handleCatalogFormChange = (field, value) => {
    setCatalogForm((prev) => ({ ...prev, [field]: value }));
  };

  const markCatalogTouched = (field) => {
    setCatalogTouched((prev) => ({ ...prev, [field]: true }));
  };

  const normalizeDateInput = (value) => {
    const raw = (value || '').trim();
    if (!raw) return '';
    if (/^\\d{8}$/.test(raw)) {
      return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    }
    const parts = raw.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      const monthPad = month.padStart(2, '0');
      const dayPad = day.padStart(2, '0');
      return `${year}-${monthPad}-${dayPad}`;
    }
    return raw;
  };

  const isValidDateString = (value) => {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day
    );
  };

  const normalizeSourceUrl = (value) => {
    const raw = (value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  };

  const validateCatalogForm = (form) => {
    const errors = {};
    const requiredFields = ['school_name', 'program_name', 'degree', 'country'];
    requiredFields.forEach((field) => {
      if (!form[field] || !form[field].trim()) {
        errors[field] = 'Required field.';
      }
    });

    if (form.fee_currency && form.fee_currency.trim().length !== 3) {
      errors.fee_currency = 'Use 3-letter ISO code (e.g., USD).';
    }

    const feeValue = form.application_fee.trim();
    if (feeValue) {
      const parsedFee = Number(feeValue);
      if (Number.isNaN(parsedFee)) {
        errors.application_fee = 'Must be a number.';
      } else if (parsedFee < 0) {
        errors.application_fee = 'Must be 0 or more.';
      }
    }

    ['deadline_round_1', 'deadline_round_2', 'last_updated'].forEach((field) => {
      if (form[field]) {
        const normalized = normalizeDateInput(form[field]);
        if (!isValidDateString(normalized)) {
          errors[field] = 'Use a real date in YYYY-MM-DD.';
        }
      }
    });

    if (form.deadline_round_1 && form.deadline_round_2) {
      const round1 = normalizeDateInput(form.deadline_round_1);
      const round2 = normalizeDateInput(form.deadline_round_2);
      if (isValidDateString(round1) && isValidDateString(round2) && round2 < round1) {
        errors.deadline_round_2 = 'Round 2 must be after Round 1.';
      }
    }

    if (form.last_updated) {
      const normalized = normalizeDateInput(form.last_updated);
      if (isValidDateString(normalized)) {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        if (normalized > todayStr) {
          errors.last_updated = 'Last updated cannot be in the future.';
        }
      }
    }

    if (form.source_url) {
      try {
        const url = new URL(normalizeSourceUrl(form.source_url));
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.source_url = 'URL must start with http or https.';
        }
      } catch (_error) {
        errors.source_url = 'Invalid URL.';
      }
    }

    return errors;
  };

  const validateAndSetErrors = (nextForm) => {
    const nextErrors = validateCatalogForm(nextForm);
    setCatalogErrors(nextErrors);
    return nextErrors;
  };

  const handleCatalogBlur = (field) => {
    let nextValue = catalogForm[field];
    if (['deadline_round_1', 'deadline_round_2', 'last_updated'].includes(field)) {
      nextValue = normalizeDateInput(nextValue);
    }
    if (field === 'source_url') {
      nextValue = normalizeSourceUrl(nextValue);
    }
    if (field === 'fee_currency') {
      nextValue = (nextValue || '').trim().toUpperCase();
    }
    if (nextValue !== catalogForm[field]) {
      const nextForm = { ...catalogForm, [field]: nextValue };
      setCatalogForm(nextForm);
      markCatalogTouched(field);
      validateAndSetErrors(nextForm);
    } else {
      markCatalogTouched(field);
      validateAndSetErrors(catalogForm);
    }
  };

  const handleCatalogSubmit = async (event) => {
    event.preventDefault();
    const normalizedForm = {
      ...catalogForm,
      deadline_round_1: normalizeDateInput(catalogForm.deadline_round_1),
      deadline_round_2: normalizeDateInput(catalogForm.deadline_round_2),
      last_updated: normalizeDateInput(catalogForm.last_updated),
      source_url: normalizeSourceUrl(catalogForm.source_url),
      fee_currency: (catalogForm.fee_currency || 'USD').trim().toUpperCase()
    };
    setCatalogForm(normalizedForm);
    const nextErrors = validateAndSetErrors(normalizedForm);
    if (Object.keys(nextErrors).length > 0) {
      pushToast('error', 'Fix the highlighted fields before saving.');
      return;
    }

    const feeValue = normalizedForm.application_fee.trim();
    const parsedFee = feeValue ? Number(feeValue) : null;
    const payload = {
      id: catalogEditingId ? undefined : (catalogForm.id || undefined),
      school_name: normalizedForm.school_name,
      program_name: normalizedForm.program_name,
      degree: normalizedForm.degree,
      country: normalizedForm.country,
      city: normalizedForm.city || null,
      application_fee: parsedFee,
      fee_currency: normalizedForm.fee_currency || 'USD',
      deadline_round_1: normalizedForm.deadline_round_1 || null,
      deadline_round_2: normalizedForm.deadline_round_2 || null,
      source_url: normalizedForm.source_url || null,
      last_updated: normalizedForm.last_updated || null,
      confidence: normalizedForm.confidence || 'medium'
    };

    try {
      setCatalogSaving(true);
      await onSaveProgramCatalogItem(catalogEditingId, payload);
      pushToast('success', catalogEditingId ? 'Catalog item updated.' : 'Catalog item created.');
      resetCatalogForm();
    } catch (error) {
      pushToast('error', error?.message || 'Failed to save catalog item.');
    } finally {
      setCatalogSaving(false);
    }
  };

  const handleCatalogDelete = async (item) => {
    const confirmed = window.confirm(`Delete ${item.school_name} ${item.program_name}?`);
    if (!confirmed) return;
    try {
      setCatalogDeletingId(item.id);
      await onDeleteProgramCatalogItem(item.id);
      pushToast('success', 'Catalog item deleted.');
      if (catalogEditingId === item.id) {
        resetCatalogForm();
      }
    } catch (error) {
      pushToast('error', error?.message || 'Failed to delete catalog item.');
    } finally {
      setCatalogDeletingId(null);
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
  }, [pendingRoleChange, roleUpdateLoading]);

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
    setVisibleUsersCount(USERS_BATCH);
  }, [adminUsers.length]);

  useEffect(() => {
    setVisibleEventsCount(EVENTS_BATCH);
  }, [adminEvents.length]);

  useEffect(() => {
    setVisibleFeedbackCount(FEEDBACK_BATCH);
  }, [adminFeedback.length]);

  const visibleUsers = adminUsers.slice(0, visibleUsersCount);
  const visibleEvents = adminEvents.slice(0, visibleEventsCount);
  const visibleFeedback = adminFeedback.slice(0, visibleFeedbackCount);
  const normalizedCatalogSearch = catalogSearch.trim().toLowerCase();
  const filteredCatalog = programCatalog.filter((item) => {
    if (!normalizedCatalogSearch) return true;
    return (
      (item.school_name || '').toLowerCase().includes(normalizedCatalogSearch)
      || (item.program_name || '').toLowerCase().includes(normalizedCatalogSearch)
      || (item.degree || '').toLowerCase().includes(normalizedCatalogSearch)
      || (item.country || '').toLowerCase().includes(normalizedCatalogSearch)
    );
  });
  const hasMoreUsers = visibleUsersCount < adminUsers.length;
  const hasMoreEvents = visibleEventsCount < adminEvents.length;
  const hasMoreFeedback = visibleFeedbackCount < adminFeedback.length;

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

      {adminError && <p className="admin-error" data-testid="admin-error" aria-live="assertive">{adminError}</p>}
      {adminLoading && !adminOverview && <p className="admin-loading" data-testid="admin-loading">Loading admin analytics...</p>}

      <div className="settings-grid admin-stats-grid">
        <div className="settings-card"><h3>Total users</h3><p>{adminOverview?.total_users ?? 0}</p></div>
        <div className="settings-card"><h3>Active users</h3><p>{adminOverview?.active_users ?? 0}</p></div>
        <div className="settings-card"><h3>Verified users</h3><p>{adminOverview?.verified_users ?? 0}</p></div>
        <div className="settings-card"><h3>Total events</h3><p>{adminOverview?.total_events ?? 0}</p></div>
        <div className="settings-card"><h3>Events in last 7 days</h3><p>{adminOverview?.recent_events_7d ?? 0}</p></div>
        <div className="settings-card"><h3>Feedback in last 7 days</h3><p>{adminOverview?.recent_feedback_7d ?? 0}</p></div>
        <div className="settings-card"><h3>Daily active users (DAU)</h3><p>{adminOverview?.dau_users_1d ?? 0}</p></div>
        <div className="settings-card"><h3>Weekly active users (WAU)</h3><p>{adminOverview?.wau_users_7d ?? 0}</p></div>
        <div className="settings-card"><h3>New users (last 7 days)</h3><p>{adminOverview?.new_users_7d ?? 0}</p></div>
        <div className="settings-card"><h3>Activated users (last 7 days)</h3><p>{adminOverview?.activated_users_7d ?? 0}</p></div>
        <div className="settings-card"><h3>Activation rate</h3><p>{adminOverview?.activation_rate_7d ?? 0}%</p></div>
        <div className="settings-card"><h3>Error events (last 7 days)</h3><p>{adminOverview?.api_error_events_7d ?? 0}</p></div>
        <div className="settings-card"><h3>New applications (last 7 days)</h3><p>{adminOverview?.applications_created_7d ?? 0}</p></div>
        <div className="settings-card"><h3>New essays (last 7 days)</h3><p>{adminOverview?.essays_created_7d ?? 0}</p></div>
      </div>

      <div className="settings-grid">
        <div className="settings-card settings-card-wide">
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

        <div className="settings-card settings-card-wide">
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

        <div className="settings-card settings-card-wide">
          <h3>Program Catalog Editor</h3>
          <form className="admin-catalog-form" onSubmit={handleCatalogSubmit}>
            <div className="admin-catalog-grid">
              <input
                type="text"
                placeholder="Catalog ID (optional for create)"
                value={catalogForm.id}
                disabled={Boolean(catalogEditingId)}
                onChange={(event) => handleCatalogFormChange('id', event.target.value)}
                onBlur={() => handleCatalogBlur('id')}
              />
              {catalogTouched.id && catalogErrors.id && (
                <span className="admin-field-error">{catalogErrors.id}</span>
              )}
              <input
                type="text"
                placeholder="School name"
                value={catalogForm.school_name}
                onChange={(event) => handleCatalogFormChange('school_name', event.target.value)}
                onBlur={() => handleCatalogBlur('school_name')}
                required
              />
              {catalogTouched.school_name && catalogErrors.school_name && (
                <span className="admin-field-error">{catalogErrors.school_name}</span>
              )}
              <input
                type="text"
                placeholder="Program name"
                value={catalogForm.program_name}
                onChange={(event) => handleCatalogFormChange('program_name', event.target.value)}
                onBlur={() => handleCatalogBlur('program_name')}
                required
              />
              {catalogTouched.program_name && catalogErrors.program_name && (
                <span className="admin-field-error">{catalogErrors.program_name}</span>
              )}
              <input
                type="text"
                placeholder="Degree"
                value={catalogForm.degree}
                onChange={(event) => handleCatalogFormChange('degree', event.target.value)}
                onBlur={() => handleCatalogBlur('degree')}
                required
              />
              {catalogTouched.degree && catalogErrors.degree && (
                <span className="admin-field-error">{catalogErrors.degree}</span>
              )}
              <input
                type="text"
                placeholder="Country"
                value={catalogForm.country}
                onChange={(event) => handleCatalogFormChange('country', event.target.value)}
                onBlur={() => handleCatalogBlur('country')}
                required
              />
              {catalogTouched.country && catalogErrors.country && (
                <span className="admin-field-error">{catalogErrors.country}</span>
              )}
              <input
                type="text"
                placeholder="City"
                value={catalogForm.city}
                onChange={(event) => handleCatalogFormChange('city', event.target.value)}
                onBlur={() => handleCatalogBlur('city')}
              />
              {catalogTouched.city && catalogErrors.city && (
                <span className="admin-field-error">{catalogErrors.city}</span>
              )}
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Application fee"
                value={catalogForm.application_fee}
                onChange={(event) => handleCatalogFormChange('application_fee', event.target.value)}
                onBlur={() => handleCatalogBlur('application_fee')}
              />
              {catalogTouched.application_fee && catalogErrors.application_fee && (
                <span className="admin-field-error">{catalogErrors.application_fee}</span>
              )}
              <input
                type="text"
                placeholder="Currency (USD)"
                value={catalogForm.fee_currency}
                onChange={(event) => handleCatalogFormChange('fee_currency', event.target.value.toUpperCase())}
                onBlur={() => handleCatalogBlur('fee_currency')}
                maxLength={3}
              />
              {catalogTouched.fee_currency && catalogErrors.fee_currency && (
                <span className="admin-field-error">{catalogErrors.fee_currency}</span>
              )}
              <input
                type="text"
                placeholder="Round 1 deadline (YYYY-MM-DD)"
                value={catalogForm.deadline_round_1}
                onChange={(event) => handleCatalogFormChange('deadline_round_1', event.target.value)}
                onBlur={() => handleCatalogBlur('deadline_round_1')}
              />
              {catalogTouched.deadline_round_1 && catalogErrors.deadline_round_1 && (
                <span className="admin-field-error">{catalogErrors.deadline_round_1}</span>
              )}
              <input
                type="text"
                placeholder="Round 2 deadline (YYYY-MM-DD)"
                value={catalogForm.deadline_round_2}
                onChange={(event) => handleCatalogFormChange('deadline_round_2', event.target.value)}
                onBlur={() => handleCatalogBlur('deadline_round_2')}
              />
              {catalogTouched.deadline_round_2 && catalogErrors.deadline_round_2 && (
                <span className="admin-field-error">{catalogErrors.deadline_round_2}</span>
              )}
              <input
                type="text"
                placeholder="Source URL"
                value={catalogForm.source_url}
                onChange={(event) => handleCatalogFormChange('source_url', event.target.value)}
                onBlur={() => handleCatalogBlur('source_url')}
              />
              {catalogTouched.source_url && catalogErrors.source_url && (
                <span className="admin-field-error">{catalogErrors.source_url}</span>
              )}
              <input
                type="text"
                placeholder="Last updated (YYYY-MM-DD)"
                value={catalogForm.last_updated}
                onChange={(event) => handleCatalogFormChange('last_updated', event.target.value)}
                onBlur={() => handleCatalogBlur('last_updated')}
              />
              {catalogTouched.last_updated && catalogErrors.last_updated && (
                <span className="admin-field-error">{catalogErrors.last_updated}</span>
              )}
              <select
                value={catalogForm.confidence}
                onChange={(event) => handleCatalogFormChange('confidence', event.target.value)}
                onBlur={() => handleCatalogBlur('confidence')}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
              {catalogTouched.confidence && catalogErrors.confidence && (
                <span className="admin-field-error">{catalogErrors.confidence}</span>
              )}
            </div>
            <div className="admin-catalog-actions">
              <button type="submit" disabled={catalogSaving}>
                {catalogSaving ? 'Saving...' : catalogEditingId ? 'Update Entry' : 'Create Entry'}
              </button>
              <button type="button" onClick={generateCatalogSample} disabled={catalogSaving || Boolean(catalogEditingId)}>
                Generate sample
              </button>
              <button type="button" onClick={resetCatalogForm} disabled={catalogSaving}>
                Reset
              </button>
            </div>
          </form>

          <div className="admin-catalog-toolbar">
            <input
              type="search"
              placeholder="Search catalog by school/program/country"
              value={catalogSearch}
              onChange={(event) => setCatalogSearch(event.target.value)}
            />
            <span>{programCatalogLoading ? 'Refreshing catalog...' : `${filteredCatalog.length} items`}</span>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="sr-only">Program catalog entries</caption>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>School</th>
                  <th>Program</th>
                  <th>Country</th>
                  <th>Fee</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No catalog entries match this search.</td>
                  </tr>
                ) : (
                  filteredCatalog.map((item) => (
                    <tr key={`admin-catalog-${item.id}`}>
                      <td>{item.id}</td>
                      <td>{item.school_name}</td>
                      <td>{item.program_name}</td>
                      <td>{item.country}</td>
                      <td>{item.application_fee ?? '-'}</td>
                      <td>{item.last_updated || '-'}</td>
                      <td>
                        <div className="admin-catalog-row-actions">
                          <button type="button" onClick={() => beginCatalogEdit(item)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCatalogDelete(item)}
                            disabled={catalogDeletingId === item.id}
                          >
                            {catalogDeletingId === item.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="settings-card settings-card-wide">
          <h3>Recent Feedback</h3>
          <div className="admin-list">
            {adminFeedback.length === 0 ? (
              <p>No feedback submitted yet.</p>
            ) : (
              visibleFeedback.map((row) => (
                <p key={`feedback-${row.id}`} data-testid="admin-feedback-item">
                  <strong>[{row.category}]</strong> {row.message} ({row.user_email})
                </p>
              ))
            )}
            {hasMoreFeedback && (
              <button
                type="button"
                className="admin-load-more"
                onClick={() => setVisibleFeedbackCount((prev) => prev + FEEDBACK_BATCH)}
              >
                Load More Feedback
              </button>
            )}
          </div>
        </div>

        <div className="settings-card settings-card-wide">
          <h3>Recent Users</h3>
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
                {adminUsers.length === 0 ? (
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

        <div className="settings-card settings-card-wide">
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
