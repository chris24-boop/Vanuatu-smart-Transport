import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  listNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  NotificationInbox,
  UserNotification,
} from '@/api/notifications';

export default function NotificationBell() {
  const [visible, setVisible] = useState(false);
  const [inbox, setInbox] = useState<NotificationInbox>({ items: [], unreadCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      const result = await listNotificationsApi();
      setInbox(result);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (active) void loadNotifications();
    };
    const initialLoad = setTimeout(refresh, 0);
    const interval = setInterval(refresh, 30_000);
    return () => {
      active = false;
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadNotifications]);

  const openInbox = () => {
    setVisible(true);
    setLoading(true);
    void loadNotifications().finally(() => setLoading(false));
  };

  const markRead = async (item: UserNotification) => {
    if (item.readAt) return;
    try {
      await markNotificationReadApi(item.id);
      setInbox((current) => ({
        ...current,
        unreadCount: Math.max(0, current.unreadCount - 1),
        items: current.items.map((notification) =>
          notification.id === item.id
            ? { ...notification, readAt: new Date().toISOString() }
            : notification,
        ),
      }));
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Unable to mark this notification as read.');
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsReadApi();
      const readAt = new Date().toISOString();
      setInbox((current) => ({
        unreadCount: 0,
        items: current.items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
      }));
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Unable to mark notifications as read.');
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={inbox.unreadCount ? `${inbox.unreadCount} unread notifications` : 'Notifications'}
        onPress={openInbox}
        style={styles.bell}
      >
        <Ionicons name="notifications-outline" size={22} color="#344054" />
        {inbox.unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{inbox.unreadCount > 99 ? '99+' : inbox.unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Notifications</Text>
                <Text style={styles.subtitle}>{inbox.unreadCount} unread</Text>
              </View>
              <Pressable accessibilityLabel="Close notifications" onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color="#475467" />
              </Pressable>
            </View>
            {inbox.unreadCount > 0 ? (
              <Pressable onPress={() => void markAllRead()} style={styles.markAll}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </Pressable>
            ) : null}
            {loading ? <ActivityIndicator color="#0A84FF" /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <ScrollView style={styles.list}>
              {inbox.items.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() => void markRead(item)}
                  style={[styles.item, !item.readAt && styles.unreadItem]}
                >
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemBody}>{item.body}</Text>
                  <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                </Pressable>
              ))}
              {!loading && inbox.items.length === 0 && !error ? (
                <Text style={styles.empty}>You are all caught up.</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: { padding: 8, marginRight: 8, position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#D92D20', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  panel: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: 520, maxHeight: '80%', borderRadius: 18, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#101828', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#667085', fontSize: 12, marginTop: 3 },
  markAll: { alignSelf: 'flex-end', paddingVertical: 10 },
  markAllText: { color: '#0A84FF', fontSize: 12, fontWeight: '700' },
  list: { marginTop: 4 },
  item: { borderTopWidth: 1, borderTopColor: '#EAECF0', paddingVertical: 12, paddingHorizontal: 8 },
  unreadItem: { backgroundColor: '#EFF8FF' },
  itemTitle: { color: '#101828', fontWeight: '700', fontSize: 14 },
  itemBody: { color: '#475467', fontSize: 13, lineHeight: 19, marginTop: 3 },
  itemDate: { color: '#98A2B3', fontSize: 11, marginTop: 6 },
  empty: { color: '#667085', textAlign: 'center', padding: 24 },
  error: { color: '#B42318', fontSize: 12, marginTop: 8 },
});
