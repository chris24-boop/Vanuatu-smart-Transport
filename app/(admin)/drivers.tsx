import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTransportStore } from '@/store/transportStore';
import { DriverApplicant } from '@/types/transport';
import { DriverVerificationStatus } from '@/types/user';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';

type FilterTab = 'ALL' | 'PENDING' | 'VERIFIED' | 'SUSPENDED';

export default function AdminDriversScreen() {
  const { drivers, verifyDriver, rejectDriver, suspendDriver, fetchDrivers } = useTransportStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void fetchDrivers();
  }, [fetchDrivers]);

  const pendingCount = drivers.filter(
    (d) => d.verificationStatus === DriverVerificationStatus.PENDING_VERIFICATION
  ).length;

  const filteredDrivers = drivers.filter((driver) => {
    // Tab filter
    if (activeTab === 'PENDING' && driver.verificationStatus !== DriverVerificationStatus.PENDING_VERIFICATION) {
      return false;
    }
    if (activeTab === 'VERIFIED' && driver.verificationStatus !== DriverVerificationStatus.VERIFIED) {
      return false;
    }
    if (activeTab === 'SUSPENDED' && driver.verificationStatus !== DriverVerificationStatus.SUSPENDED) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = driver.fullName.toLowerCase().includes(q);
      const matchPlate = driver.vehiclePlate.toLowerCase().includes(q);
      const matchLicence = driver.licenceNumber.toLowerCase().includes(q);
      const matchIsland = driver.island.toLowerCase().includes(q);
      return matchName || matchPlate || matchLicence || matchIsland;
    }

    return true;
  });

  const handleVerify = (driver: DriverApplicant) => {
    Alert.alert(
      'Approve Driver Registration',
      `Confirm registration for ${driver.fullName} (${driver.licenceNumber}) for ${driver.vehicleType} ${driver.vehiclePlate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Verify',
          style: 'default',
          onPress: async () => {
            try {
              await verifyDriver(driver.userId);
              Alert.alert('Driver Verified', `${driver.fullName} is now an authorized driver on Vanuatu Smart Transport.`);
            } catch (error) {
              Alert.alert('Approval Failed', error instanceof Error ? error.message : 'Unable to approve this driver right now.');
            }
          },
        },
      ]
    );
  };

  const handleReject = (driver: DriverApplicant) => {
    Alert.prompt(
      'Reject Driver Registration',
      'Add a reason for rejecting this driver application:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject Driver',
          style: 'destructive',
          onPress: async (reason?: string) => {
            try {
              await rejectDriver(driver.userId, reason || 'No reason provided');
              Alert.alert('Driver Rejected', `${driver.fullName} was rejected. Reason: ${reason || 'No reason provided'}`);
            } catch {
              Alert.alert('Error', 'Unable to reject this driver right now.');
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleSuspend = (driver: DriverApplicant) => {
    Alert.alert(
      'Suspend Driver',
      `Are you sure you want to suspend driver licence for ${driver.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: () => {
            void suspendDriver(driver.userId).catch(() => {
              Alert.alert('Error', 'Unable to suspend this driver right now.');
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <VanuatuScreenBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Driver Verification</Text>
          <Text style={styles.subtitle}>
            Review licence documentation and approve driver registrations
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by driver name, plate, licence..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8E8E93" />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <Pressable
            style={[styles.tab, activeTab === 'PENDING' && styles.tabActive]}
            onPress={() => setActiveTab('PENDING')}
          >
            <Text style={[styles.tabText, activeTab === 'PENDING' && styles.tabTextActive]}>
              Pending Approval
            </Text>
            {pendingCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'VERIFIED' && styles.tabActive]}
            onPress={() => setActiveTab('VERIFIED')}
          >
            <Text style={[styles.tabText, activeTab === 'VERIFIED' && styles.tabTextActive]}>
              Verified
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'SUSPENDED' && styles.tabActive]}
            onPress={() => setActiveTab('SUSPENDED')}
          >
            <Text style={[styles.tabText, activeTab === 'SUSPENDED' && styles.tabTextActive]}>
              Suspended
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'ALL' && styles.tabActive]}
            onPress={() => setActiveTab('ALL')}
          >
            <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
              All ({drivers.length})
            </Text>
          </Pressable>
        </View>

        {/* Driver List */}
        {filteredDrivers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={44} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Drivers Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'PENDING'
                ? 'All driver registration requests have been addressed.'
                : 'No driver records matching the filter criteria.'}
            </Text>
          </View>
        ) : (
          filteredDrivers.map((driver) => {
            const isPending =
              driver.verificationStatus === DriverVerificationStatus.PENDING_VERIFICATION;
            const isVerified =
              driver.verificationStatus === DriverVerificationStatus.VERIFIED;

            return (
              <View key={driver.id} style={styles.driverCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarInitial}>
                      {driver.fullName.charAt(0)}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.driverName}>{driver.fullName}</Text>
                      {isVerified && (
                        <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                      )}
                    </View>
                    <Text style={styles.phoneText}>📞 {driver.phone}</Text>
                    {driver.email ? (
                      <Text style={styles.emailText}>✉️ {driver.email}</Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isPending && styles.statusPillPending,
                      isVerified && styles.statusPillVerified,
                      !isPending && !isVerified && styles.statusPillSuspended,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isPending && styles.statusPillTextPending,
                        isVerified && styles.statusPillTextVerified,
                        !isPending && !isVerified && styles.statusPillTextSuspended,
                      ]}
                    >
                      {driver.verificationStatus.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Info Grid */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>VEHICLE</Text>
                    <Text style={styles.infoValue}>
                      {driver.vehicleType} • {driver.vehiclePlate}
                    </Text>
                    <Text style={styles.infoSub}>{driver.vehicleModel}</Text>
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>LICENCE</Text>
                    <Text style={styles.infoValue}>{driver.licenceNumber}</Text>
                    <Text style={styles.infoSub}>Exp: {driver.licenceExpiry}</Text>
                  </View>
                </View>

                <View style={styles.locationFooter}>
                  <Ionicons name="location-outline" size={14} color="#8E8E93" />
                  <Text style={styles.locationText}>{driver.island}</Text>
                  <Text style={styles.appliedDate}>Applied: {driver.appliedDate}</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {isPending ? (
                    <>
                      <Pressable
                        style={styles.acceptButton}
                        onPress={() => handleVerify(driver)}
                      >
                        <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                        <Text style={styles.acceptButtonText}>Accept Registration</Text>
                      </Pressable>

                      <Pressable
                        style={styles.rejectButton}
                        onPress={() => handleReject(driver)}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </Pressable>
                    </>
                  ) : isVerified ? (
                    <Pressable
                      style={styles.suspendButton}
                      onPress={() => handleSuspend(driver)}
                    >
                      <Ionicons name="ban-outline" size={15} color="#FF3B30" />
                      <Text style={styles.suspendButtonText}>Suspend Licence</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.acceptButton}
                      onPress={() => {
                        void verifyDriver(driver.userId).catch(() => {
                          Alert.alert('Error', 'Unable to reactivate this driver right now.');
                        });
                      }}
                    >
                      <Ionicons name="refresh" size={15} color="#FFFFFF" />
                      <Text style={styles.acceptButtonText}>Re-activate Driver</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#1C1C1E' },
  subtitle: { fontSize: 13, color: '#636366', marginTop: 3 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1C1C1E' },

  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tabActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  tabText: { fontSize: 12, fontWeight: '600', color: '#636366' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  tabBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tabBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  emptySubtitle: { fontSize: 13, color: '#8E8E93', textAlign: 'center' },

  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#FF9500' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  phoneText: { fontSize: 12, color: '#636366', marginTop: 2 },
  emailText: { fontSize: 11, color: '#8E8E93', marginTop: 1 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillPending: { backgroundColor: '#FFF3E0' },
  statusPillVerified: { backgroundColor: '#E8F8EE' },
  statusPillSuspended: { backgroundColor: '#FFEBEA' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  statusPillTextPending: { color: '#FF9500' },
  statusPillTextVerified: { color: '#34C759' },
  statusPillTextSuspended: { color: '#FF3B30' },

  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 10,
    marginVertical: 12,
  },
  infoBox: { flex: 1 },
  infoLabel: { fontSize: 9, fontWeight: '700', color: '#8E8E93', marginBottom: 2 },
  infoValue: { fontSize: 12, fontWeight: '700', color: '#1C1C1E' },
  infoSub: { fontSize: 11, color: '#636366', marginTop: 2 },

  locationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 10,
  },
  locationText: { fontSize: 12, color: '#636366', fontWeight: '500', flex: 1 },
  appliedDate: { fontSize: 11, color: '#8E8E93' },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  rejectButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: { color: '#FF3B30', fontSize: 13, fontWeight: '600' },
  suspendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD1D1',
    backgroundColor: '#FFF5F5',
  },
  suspendButtonText: { color: '#FF3B30', fontSize: 12, fontWeight: '600' },
});
