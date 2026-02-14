export function createNotificationActions({ setDismissedNotifications }) {
  const markNotificationRead = (notificationId) => {
    setDismissedNotifications((prev) => ({ ...prev, [notificationId]: true }));
  };

  const markAllNotificationsRead = (notificationIds) => {
    setDismissedNotifications((prev) => {
      const next = { ...prev };
      notificationIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  };

  const clearNotificationHistory = () => {
    setDismissedNotifications({});
  };

  return {
    markNotificationRead,
    markAllNotificationsRead,
    clearNotificationHistory
  };
}
