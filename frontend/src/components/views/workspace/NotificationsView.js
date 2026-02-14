import React from 'react';

function NotificationsView({
  activeNotifications,
  markAllNotificationsRead,
  dismissedNotifications,
  remindersEnabled,
  clearNotificationHistory,
  setSelectedApplicationId,
  setDocsApplicationId,
  handleNavChange,
  markNotificationRead
}) {
  return (
            <div className="notifications-panel">
              <h2 className="sr-only" data-testid="notifications-heading">Notifications</h2>
              <div className="notifications-toolbar">
                <p>
                  {activeNotifications.length} active notification
                  {activeNotifications.length === 1 ? '' : 's'}
                </p>
                <div className="notifications-actions">
                  <button
                    type="button"
                    data-testid="notifications-mark-all-read"
                    className="secondary-action-btn"
                    onClick={() => markAllNotificationsRead(activeNotifications.map((item) => item.id))}
                    disabled={!activeNotifications.length}
                  >
                    Mark all read
                  </button>
                  <button
                    type="button"
                    data-testid="notifications-reset-history"
                    className="secondary-action-btn"
                    onClick={clearNotificationHistory}
                    disabled={!Object.keys(dismissedNotifications).length}
                  >
                    Reset history
                  </button>
                </div>
              </div>

              {activeNotifications.length === 0 ? (
                <div className="empty-state-main">
                  <h2>No active notifications</h2>
                  <p>
                    {remindersEnabled
                      ? "You're caught up. Reminder alerts are enabled and will appear as deadlines and requirements change."
                      : "You're caught up. Enable reminders to receive proactive deadline alerts."}
                  </p>
                  <div className="empty-state-actions">
                    <button type="button" className="history-btn" onClick={() => handleNavChange('tracker')}>
                      Go to Applications
                    </button>
                    <button type="button" className="secondary-action-btn" onClick={() => handleNavChange('settings')}>
                      {remindersEnabled ? 'Manage Reminders' : 'Enable Reminders'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="detail-list">
                  {activeNotifications.map((notification) => (
                    <article
                      key={notification.id}
                      data-testid="notification-item"
                      className={`notification-item notification-item--${notification.severity}`}
                    >
                      <div className="notification-item-main">
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                      </div>
                      <div className="notification-item-actions">
                        <button
                          type="button"
                          data-testid="notification-open-button"
                          className="history-btn"
                          onClick={() => {
                            if (notification.applicationId) {
                              setSelectedApplicationId(notification.applicationId);
                              setDocsApplicationId(notification.applicationId);
                            }
                            handleNavChange(notification.targetNav || 'home');
                            markNotificationRead(notification.id);
                          }}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          data-testid="notification-dismiss-button"
                          className="secondary-action-btn"
                          onClick={() => markNotificationRead(notification.id)}
                        >
                          Dismiss
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
  );
}

export default NotificationsView;
