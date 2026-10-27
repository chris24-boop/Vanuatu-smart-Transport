import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/Button';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';

export default function PassengerProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <VanuatuScreenBackground />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>👤</Text>
        </View>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.role}>{user?.role || 'Passenger'}</Text>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user?.phone || '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.lastRow]}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || '—'}</Text>
          </View>
        </View>

        <Button
          title="Log Out"
          onPress={handleLogout}
          variant="outline"
          style={{ marginTop: 32 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 40,
    
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarEmoji: { fontSize: 40,},
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1e1d',
    marginBottom: 4,
    
  },
  role: {
    fontSize: 14,
    color: '#8E8E93',
    textTransform: 'capitalize',
    marginBottom: 32,
  },
  infoSection: {
    width: '100%',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  infoLabel: { fontSize: 15, color: '#8E8E93' },
  infoValue: { fontSize: 15, fontWeight: '500', color: '#1C1C1E' },
});
