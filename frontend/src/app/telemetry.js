import { ingestTelemetryEventApi } from '../api/telemetryApi';

const EVENT_BUFFER_KEY = 'pilot_event_log_v1';
const MAX_EVENTS = 200;

export function trackEvent(name, payload = {}) {
  try {
    const event = {
      name,
      payload,
      at: new Date().toISOString()
    };

    const raw = localStorage.getItem(EVENT_BUFFER_KEY);
    const current = raw ? JSON.parse(raw) : [];
    const next = [...current, event].slice(-MAX_EVENTS);
    localStorage.setItem(EVENT_BUFFER_KEY, JSON.stringify(next));

    if (process.env.NODE_ENV !== 'production') {
      // Keep this concise so it is useful during pilot debugging.
      // eslint-disable-next-line no-console
      console.info('[telemetry]', name, payload);
    }

    ingestTelemetryEventApi(name, payload).catch(() => {
      // Keep local buffer only when backend ingest is unavailable.
    });
  } catch (_err) {
    // Telemetry must never break user actions.
  }
}

export function getTrackedEvents() {
  try {
    const raw = localStorage.getItem(EVENT_BUFFER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_err) {
    return [];
  }
}
