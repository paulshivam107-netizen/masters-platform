import React, { useState } from "react";
import "./WorkspaceAccount.css";

function NotificationsView({
  activeNotifications,
  markAllNotificationsRead,
  dismissedNotifications,
  remindersEnabled,
  clearNotificationHistory,
  setSelectedApplicationId,
  setDocsApplicationId,
  handleNavChange,
  markNotificationRead,
}) {
  const [visibleCount, setVisibleCount] = useState(6);
  const total = activeNotifications.length;
  const dismissedCount = Object.keys(dismissedNotifications).length;
  return (
    <div className="wac-page ws-stack">
      <h2 className="sr-only" data-testid="notifications-heading">
        Notifications
      </h2>
      <div className="ws-row ws-row--between wac-toolbar">
        <p className="wac-toolbar__text" aria-live="polite">
          <strong className="ws-num">{total}</strong> unread notification
          {total === 1 ? "" : "s"}
          {dismissedCount > 0 && (
            <span className="ws-muted"> · {dismissedCount} dismissed</span>
          )}
        </p>
        <div className="ws-row">
          <button
            type="button"
            data-testid="notifications-mark-all-read"
            className="ws-btn ws-btn--sm"
            onClick={() =>
              markAllNotificationsRead(
                activeNotifications.map((item) => item.id),
              )
            }
            disabled={!total}
          >
            Mark all read
          </button>
          <button
            type="button"
            data-testid="notifications-reset-history"
            className="ws-btn ws-btn--sm ws-btn--ghost"
            onClick={clearNotificationHistory}
            disabled={!dismissedCount}
          >
            Show dismissed updates
          </button>
        </div>
      </div>

      {total === 0 ? (
        <div className="ws-card ws-empty wac-empty">
          <h3 className="ws-empty__title">You are all caught up</h3>
          <p>
            {remindersEnabled
              ? "Reminder alerts are on and will appear here as deadlines and requirements change."
              : "Turn on reminders to get proactive deadline alerts here and by email."}
          </p>
          <div className="ws-row">
            <button
              type="button"
              className="ws-btn ws-btn--primary"
              onClick={() => handleNavChange("tracker")}
            >
              Go to Applications
            </button>
            <button
              type="button"
              className="ws-btn"
              onClick={() => handleNavChange("settings")}
            >
              {remindersEnabled ? "Manage reminders" : "Enable reminders"}
            </button>
          </div>
        </div>
      ) : (
        <ul className="ws-card ws-card--pad-0 wac-list">
          {activeNotifications.slice(0, visibleCount).map((notification) => (
            <li key={notification.id}>
              <article
                data-testid="notification-item"
                className={`wac-note wac-note--${notification.severity}`}
              >
                <span className="wac-note__dot" aria-hidden="true" />
                <div className="wac-note__main">
                  <strong>
                    {notification.title}
                    <span className="sr-only"> (unread)</span>
                  </strong>
                  <p className="ws-muted">{notification.message}</p>
                </div>
                <div className="ws-row wac-note__actions">
                  <button
                    type="button"
                    data-testid="notification-open-button"
                    className="ws-btn ws-btn--sm"
                    onClick={() => {
                      if (notification.applicationId) {
                        setSelectedApplicationId(notification.applicationId);
                        setDocsApplicationId(notification.applicationId);
                      }
                      handleNavChange(notification.targetNav || "home");
                      markNotificationRead(notification.id);
                    }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    data-testid="notification-dismiss-button"
                    className="ws-btn ws-btn--sm ws-btn--ghost"
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      {total > visibleCount && (
        <div className="ws-row">
          <button
            type="button"
            className="ws-btn"
            onClick={() => setVisibleCount((count) => count + 6)}
          >
            Show more updates ({total - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationsView;
