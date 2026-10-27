import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransportStore } from '@/store/transportStore';
import { useAuthStore } from '@/store/authStore';
import { DriverVerificationStatus } from '@/types/user';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    trips,
    drivers,
    availableServices,
    incidents,
    verifyDriver,
    fetchTrips,
    fetchDrivers,
    fetchAvailableServices,
    fetchIncidents,
  } = useTransportStore();

  const [incidentsModalVisible, setIncidentsModalVisible] = useState(false);

  useEffect(() => {
    void fetchTrips().catch((error) => console.error('Failed to fetch trips:', error));
    void fetchDrivers().catch((error) => console.error('Failed to fetch drivers:', error));
    void fetchAvailableServices();
    void fetchIncidents();
  }, [fetchTrips, fetchDrivers, fetchAvailableServices, fetchIncidents]);

  const pendingDrivers = drivers.filter(
    (d) => d.verificationStatus === DriverVerificationStatus.PENDING_VERIFICATION
  );
  const verifiedDrivers = drivers.filter(
    (d) => d.verificationStatus === DriverVerificationStatus.VERIFIED
  );
  const activeTrips = trips.filter((t) => t.status === 'ACTIVE' || t.status === 'PLANNED');

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
          <View>
            <View style={styles.badgeRow}>
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                <Text style={styles.adminBadgeText}>ADMIN CONTROL</Text>
              </View>
              <Text style={styles.jurisdictionText}>Republic of Vanuatu</Text>
            </View>
            <Text style={styles.title}>Transport Authority</Text>
            <Text style={styles.subtitle}>
              Manage drivers, vehicle verification & island routes
            </Text>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Pending Drivers */}
          <Pressable
            style={[styles.statCard, pendingDrivers.length > 0 && styles.statCardAlert]}
            onPress={() => router.push('/(admin)/drivers')}
          >
            <View style={styles.statHeader}>
              <View style={[styles.statIconBox, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="person-add" size={20} color="#FF9500" />
              </View>
              {pendingDrivers.length > 0 && (
                <View style={styles.pillAlert}>
                  <Text style={styles.pillAlertText}>ACTION REQ</Text>
                </View>
              )}
            </View>
            <Text style={styles.statValue}>{pendingDrivers.length}</Text>
            <Text style={styles.statLabel}>Pending Drivers</Text>
            <Text style={styles.statSublabel}>Requires licence verification</Text>
          </Pressable>

          {/* Active Trips */}
          <Pressable
            style={styles.statCard}
            onPress={() => router.push('/(admin)/trips')}
          >
            <View style={styles.statHeader}>
              <View style={[styles.statIconBox, { backgroundColor: '#E8F8EE' }]}>
                <Ionicons name="navigate" size={20} color="#34C759" />
              </View>
              <View style={[styles.pillAlert, { backgroundColor: '#E8F8EE' }]}>
                <Text style={[styles.pillAlertText, { color: '#34C759' }]}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.statValue}>{activeTrips.length}</Text>
            <Text style={styles.statLabel}>Active Trips</Text>
            <Text style={styles.statSublabel}>Live route activity</Text>
          </Pressable>

          {/* Verified Drivers */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIconBox, { backgroundColor: '#EAF3FF' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#0A84FF" />
              </View>
            </View>
            <Text style={styles.statValue}>{verifiedDrivers.length}</Text>
            <Text style={styles.statLabel}>Verified Drivers</Text>
            <Text style={styles.statSublabel}>Approved on road</Text>
          </View>

          {/* Incident Reports */}
          <Pressable
            style={[styles.statCard, incidents.length > 0 && { borderColor: '#FF3B30', borderWidth: 1 }]}
            onPress={() => setIncidentsModalVisible(true)}
          >
            <View style={styles.statHeader}>
              <View style={[styles.statIconBox, { backgroundColor: '#FFECEC' }]}>
                <Ionicons name="warning" size={20} color="#FF3B30" />
              </View>
              {incidents.filter((i) => i.status === 'OPEN').length > 0 && (
                <View style={[styles.pillAlert, { backgroundColor: '#FFECEC' }]}>
                  <Text style={[styles.pillAlertText, { color: '#FF3B30' }]}>NEW</Text>
                </View>
              )}
            </View>
            <Text style={styles.statValue}>{incidents.length}</Text>
            <Text style={styles.statLabel}>Incident Reports</Text>
            <Text style={styles.statSublabel}>Safety, fares & complaints</Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.touristServicesBanner}
          onPress={() => router.push('/tourist/manage')}
        >
          <View style={styles.touristServicesIcon}>
            <Ionicons name="compass-outline" size={22} color="#0D705B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.touristServicesTitle}>Tourist destinations</Text>
            <Text style={styles.touristServicesSubtitle}>
              Manage destination information for tourist transport.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color="#0D705B" />
        </Pressable>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Driver Registration Requests</Text>
            <Text style={styles.sectionSubtitle}>Review and accept new drivers</Text>
          </View>
          <Pressable onPress={() => router.push('/(admin)/drivers')}>
            <Text style={styles.viewAllLink}>View All ({drivers.length})</Text>
          </Pressable>
        </View>

        {pendingDrivers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={36} color="#34C759" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>There are no pending driver applications to verify.</Text>
          </View>
        ) : (
          pendingDrivers.map((driver) => (
            <View key={driver.id} style={styles.driverAppCard}>
              <View style={styles.driverAppTop}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.avatarInitial}>
                    {driver.fullName.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{driver.fullName}</Text>
                  <Text style={styles.driverMeta}>
                    {driver.vehicleType} • {driver.vehiclePlate} • {driver.island}
                  </Text>
                  <Text style={styles.licenceText}>
                    Licence: <Text style={styles.licenceCode}>{driver.licenceNumber}</Text>
                  </Text>
                </View>
                <View style={styles.pendingTag}>
                  <Text style={styles.pendingTagText}>PENDING</Text>
                </View>
              </View>

              <View style={styles.driverCardActions}>
                <Pressable
                  style={styles.verifyBtn}
                  onPress={async () => {
                    try {
                      await verifyDriver(driver.userId);
                      Alert.alert('Driver Approved', `${driver.fullName} is now verified to drive.`);
                    } catch (error) {
                      Alert.alert('Approval Failed', error instanceof Error ? error.message : 'Unable to approve this driver right now.');
                    }
                  }}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.verifyBtnText}>Accept & Verify</Text>
                </Pressable>

                <Pressable
                  style={styles.detailsBtn}
                  onPress={() => router.push('/(admin)/drivers')}
                >
                  <Text style={styles.detailsBtnText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={14} color="#0A84FF" />
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* Section: Live Transport Overview */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View>
            <Text style={styles.sectionTitle}>Active Island Routes</Text>
            <Text style={styles.sectionSubtitle}>Monitoring Port Vila & Santo corridors</Text>
          </View>
          <Pressable onPress={() => router.push('/(admin)/trips')}>
            <Text style={styles.viewAllLink}>Manage Trips ({trips.length})</Text>
          </Pressable>
        </View>

        <View style={styles.routesOverviewCard}>
          <View style={styles.routeRowItem}>
            <View style={styles.routeBullet} />
            <Text style={styles.routeHubName}>Port Vila Market ↔ Mele Cascades</Text>
            <Text style={styles.routeCountText}>
              {trips.filter((t) => t.origin.includes('Mele') || t.destination.includes('Mele')).length} trips
            </Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRowItem}>
            <View style={[styles.routeBullet, { backgroundColor: '#34C759' }]} />
            <Text style={styles.routeHubName}>Port Vila ↔ Bauerfield Airport</Text>
            <Text style={styles.routeCountText}>
              {trips.filter((t) => t.origin.includes('Airport') || t.destination.includes('Airport')).length} trips
            </Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRowItem}>
            <View style={[styles.routeBullet, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.routeHubName}>Taxi & Public Transport Drivers</Text>
            <Text style={styles.routeCountText}>
              {availableServices.length} available
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ================= INCIDENTS MODAL ================= */}
      <Modal
        visible={incidentsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIncidentsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.incidentsSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetHeaderCategory}>AUTHORITY REVIEW</Text>
                <Text style={styles.sheetRouteTitle}>Safety & Incident Reports</Text>
              </View>
              <Pressable
                onPress={() => setIncidentsModalVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <Ionicons name="close" size={22} color="#1C1C1E" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {incidents.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="shield-checkmark-outline" size={44} color="#34C759" />
                  <Text style={styles.emptyTitle}>No Incidents Reported</Text>
                  <Text style={styles.emptyText}>All island transport operations are in order.</Text>
                </View>
              ) : (
                incidents.map((item) => (
                  <View key={item.id} style={styles.incidentCard}>
                    <View style={styles.incidentTop}>
                      <View style={styles.incidentCategoryBadge}>
                        <Ionicons name="alert-circle" size={14} color="#FF3B30" />
                        <Text style={styles.incidentCategoryText}>{item.category.replace('_', ' ')}</Text>
                      </View>
                      <Text style={styles.incidentStatusText}>{item.status}</Text>
                    </View>
                    <Text style={styles.incidentDesc}>{item.description}</Text>
                    <View style={styles.incidentMetaRow}>
                      <Text style={styles.incidentMetaText}>🚗 Plate: {item.vehiclePlate}</Text>
                      <Text style={styles.incidentMetaText}>📍 {item.location}</Text>
                    </View>
                    {item.driverName !== 'N/A' && (
                      <Text style={styles.incidentMetaSub}>Driver: {item.driverName}</Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  incidentsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#D1D1D6',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sheetHeaderCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF3B30',
    letterSpacing: 0.5,
  },
  sheetRouteTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 6,
  },
  incidentCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  incidentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  incidentCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF3B30',
  },
  incidentStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  incidentDesc: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 8,
  },
  incidentMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  incidentMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#48484A',
  },
  incidentMetaSub: {
    fontSize: 11,
    color: '#8E8E93',
  },
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 },
  header: { marginBottom: 20 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  jurisdictionText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '800', color: '#1C1C1E' },
  subtitle: { fontSize: 13, color: '#636366', marginTop: 3 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  touristServicesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 14,
    marginBottom: 6,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D3E7DE',
    backgroundColor: '#FFFFFF',
  },
  touristServicesIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E7F4EE',
  },
  touristServicesTitle: { color: '#173D33', fontSize: 14, fontWeight: '700' },
  touristServicesSubtitle: { marginTop: 3, color: '#687871', fontSize: 11, lineHeight: 16 },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardAlert: {
    borderColor: '#FFD60A',
    backgroundColor: '#FFFDF5',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillAlert: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillAlertText: { fontSize: 9, fontWeight: '800', color: '#FF9500' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1C1C1E' },
  statLabel: { fontSize: 13, fontWeight: '700', color: '#1C1C1E', marginTop: 2 },
  statSublabel: { fontSize: 11, color: '#8E8E93', marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  sectionSubtitle: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  viewAllLink: { fontSize: 13, fontWeight: '600', color: '#0A84FF' },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  emptyText: { fontSize: 12, color: '#8E8E93', textAlign: 'center' },

  driverAppCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  driverAppTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: '#0A84FF' },
  driverName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  driverMeta: { fontSize: 12, color: '#636366', marginTop: 2 },
  licenceText: { fontSize: 12, color: '#8E8E93', marginTop: 3 },
  licenceCode: { color: '#1C1C1E', fontWeight: '600' },
  pendingTag: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingTagText: { fontSize: 10, fontWeight: '800', color: '#FF9500' },
  driverCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#34C759',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  detailsBtnText: { fontSize: 13, color: '#0A84FF', fontWeight: '600' },

  routesOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  routeRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  routeBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0A84FF' },
  routeHubName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  routeCountText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  routeDivider: { height: 1, backgroundColor: '#F2F2F7', marginVertical: 4 },
});
