import { api } from './client';

export interface UserNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationInbox {
  items: UserNotification[];
  unreadCount: number;
}

export async function listNotificationsApi(): Promise<NotificationInbox> {
  const response = await api.get<NotificationInbox>('/notifications');
  return response.data;
}

export async function markNotificationReadApi(id: string): Promise<void> {
  await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsReadApi(): Promise<void> {
  await api.patch('/notifications/read-all');
}
