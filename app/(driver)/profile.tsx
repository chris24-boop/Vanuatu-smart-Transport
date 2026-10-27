import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/Button';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';

export default function DriverProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const isVerified = user?.driverVerificationStatus === 'VERIFIED';
  const isSuspended = user?.driverVerificationStatus === 'SUSPENDED';

  const vehicleEmoji =
    user?.vehicleType === 'TAXI'
      ? ''
      : user?.vehicleType === 'PUBLIC_TRANSPORT'
      ? '🚌'
      : user?.vehicleType === 'MINIBUS' || user?.vehicleType === 'BUS'
      ? '🚌'
      : '🚗';

  const verificationText = isVerified
    ? 'Verified Driver'
    : isSuspended
    ? 'Suspended'
    : 'Pending Approval';

  const verificationColor = isVerified
    ? '#34C759'
    : isSuspended
    ? '#FF3B30'
    : '#FF9500';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <VanuatuScreenBackground />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{vehicleEmoji}</Text>
        </View>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>









        
        <Text style={styles.role}>
          {user?.vehicleType
            ? `${user.vehicleType === 'MINIBUS' ? 'BUS' : user.vehicleType === 'PUBLIC_TRANSPORT' ? 'Public Transport' : user.vehicleType} Driver`
            : 'Land Transport Driver'}
        </Text>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Licence Status</Text>
            <Text style={[styles.infoValue, { color: verificationColor, fontWeight: '700' }]}>
              {verificationText}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Driver Licence #</Text>
            <Text style={styles.infoValue}>{user?.licenceNumber || 'VT-DRV-PENDING'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehicle Type</Text>
            <Text style={styles.infoValue}>
              {user?.vehicleType === 'MINIBUS'
                ? 'BUS'
                : user?.vehicleType === 'PUBLIC_TRANSPORT'
                  ? 'Public Transport'
                  : user?.vehicleType || 'TAXI'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Number Plate</Text>
            <Text style={styles.infoValue}>{user?.vehiclePlate || '—'}</Text>
          </View>
          {user?.vehicleModel ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vehicle Model</Text>
              <Text style={styles.infoValue}>{user.vehicleModel}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user?.phone || '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.lastRow]}>
            <Text style={styles.infoLabel}>Island Region</Text>
            <Text style={styles.infoValue}>{user?.island || 'Efate (Port Vila)'}</Text>
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
    backgroundColor: '#E8F4FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarEmoji: { fontSize: 40 },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#0A84FF',
    fontWeight: '600',
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
