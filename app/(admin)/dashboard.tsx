import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransportStore } from '@/store/transportStore';
import { DriverVerificationStatus } from '@/types/user';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { AdminActivityItem, LiveTripLocation } from '@/types/transport';
import { listAdminActivityApi, listLiveOperationsApi } from '@/api/admin';
import { confirmAdminAction, showAdminMessage } from '@/utils/adminDialogs';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const {
    trips,
    drivers,
    availableServices,
    incidents,
    verifyDriver,
    updateIncidentStatus,
    fetchTrips,
    fetchDrivers,
    fetchAvailableServices,
    fetchIncidents,
  } = useTransportStore();

  const [incidentsModalVisible, setIncidentsModalVisible] = useState(false);
  const [liveLocations, setLiveLocations] = useState<LiveTripLocation[]>([]);
  const [activity, setActivity] = useState<AdminActivityItem[]>([]);
  const [operationsError, setOperationsError] = useState('');
  const [activityError, setActivityError] = useState('');
  const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    void fetchTrips().catch((error) => console.error('Failed to fetch trips:', error));
    void fetchDrivers().catch((error) => console.error('Failed to fetch drivers:', error));
    void fetchAvailableServices().catch((error) => console.error('Failed to fetch available services:', error));
    void fetchIncidents().catch((error) => console.error('Failed to fetch incidents:', error));
    let active = true;
    const refreshLiveLocations = async () => {
      try {
        const locations = await listLiveOperationsApi();
        if (active) {
          setLiveLocations(locations);
          setCurrentTime(Date.now());
          setOperationsError('');
        }
      } catch (error) {
        if (active) setOperationsError(error instanceof Error ? error.message : 'Unable to load live locations.');
      }
    };
    void refreshLiveLocations();
    const interval = setInterval(() => void refreshLiveLocations(), 15_000);
    void listAdminActivityApi()
      .then((entries) => {
        if (active) setActivity(entries);
      })
      .catch((error: unknown) => {
        if (active) setActivityError(error instanceof Error ? error.message : 'Unable to load the audit log.');
      });
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchTrips, fetchDrivers, fetchAvailableServices, fetchIncidents]);

  const pendingDrivers = drivers.filter(
    (d) => d.verificationStatus === DriverVerificationStatus.PENDING_VERIFICATION
  );
  const verifiedDrivers = drivers.filter(
    (d) => d.verificationStatus === DriverVerificationStatus.VERIFIED
  );
  const activeTrips = trips.filter((t) => t.status === 'ACTIVE' || t.status === 'PLANNED');
  const recordIncidentStatus = async (id: string, status: 'INVESTIGATING' | 'RESOLVED' | 'OPEN') => {
    setUpdatingIncidentId(id);
    try {
      await updateIncidentStatus(id, status);
      await fetchIncidents();
    } catch (error) {
      showAdminMessage('Could not update incident', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setUpdatingIncidentId(null);
    }
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
        <View style={styles.operationsCard}>
          <View style={styles.operationsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Live operations</Text>
              <Text style={styles.sectionSubtitle}>Active trips with recently shared driver locations</Text>
            </View>
            <Pressable
              onPress={() => void listLiveOperationsApi().then((locations) => {
                setLiveLocations(locations);
                setOperationsError('');
              }).catch((error: unknown) => setOperationsError(error instanceof Error ? error.message : 'Unable to refresh live locations.'))}
            >
              <Text style={styles.viewAllLink}>Refresh</Text>
            </Pressable>
          </View>
          {operationsError ? <Text style={styles.inlineError}>{operationsError}</Text> : null}
          {liveLocations.length === 0 ? (
            <View style={styles.noLiveTrips}>
              <Ionicons name="navigate-outline" size={24} color="#667085" />
              <Text style={styles.noLiveTripsText}>No active trip is currently sharing a GPS location.</Text>
            </View>
          ) : (
            <View style={styles.operationsContent}>
              <Svg width="100%" height={280} viewBox="0 0 1000 550" style={styles.map}>
                <Path d="M170 140 Q205 115 252 126 L276 153 Q252 188 214 195 L184 177 Z" fill="#A8D8B9" stroke="#61A77A" strokeWidth="4" />
                <Path d="M266 218 Q286 199 314 211 L322 236 Q304 259 277 253 Z" fill="#A8D8B9" stroke="#61A77A" strokeWidth="4" />
                <Path d="M442 224 Q457 213 471 224 L466 242 Q452 248 442 224 Z" fill="#A8D8B9" stroke="#61A77A" strokeWidth="4" />
                <Path d="M452 187 L466 170 L478 190 L470 212 Z" fill="#A8D8B9" stroke="#61A77A" strokeWidth="4" />
                <Path d="M468 146 L479 127 L492 148 L480 165 Z" fill="#A8D8B9" stroke="#61A77A" strokeWidth="4" />
                <Path d="M497 321 Q516 306 541 320 L548 342 Q527 357 507 349 Z" fill="#A8D8B9" stroke="#61A77A" strokeWidth="4" />
                <Path d="M785 459 Q803 439 824 456 L817 484 L798 494 Z" fill="#A8D8B9" stroke="#61A77A" strokeWidth="4" />
                <SvgText x="195" y="215" fill="#475467" fontSize="18">Santo</SvgText>
                <SvgText x="494" y="384" fill="#475467" fontSize="18">Efate</SvgText>
                <SvgText x="772" y="520" fill="#475467" fontSize="18">Tanna</SvgText>
                {liveLocations.map((location) => {
                  const x = Math.max(12, Math.min(988, ((location.longitude - 166.5) / 4) * 1000));
                  const y = Math.max(12, Math.min(538, ((-13 - location.latitude) / 7.5) * 550));
                  const isFresh = location.updatedAt !== null && currentTime - new Date(location.updatedAt).getTime() < 60_000;
                  return (
                    <Circle
                      key={location.id}
                      cx={x}
                      cy={y}
                      r={isFresh ? 14 : 11}
                      fill={isFresh ? '#12B76A' : '#F79009'}
                      stroke="#FFFFFF"
                      strokeWidth="5"
                      onPress={() => void Linking.openURL(`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=14/${location.latitude}/${location.longitude}`)}
                    />
                  );
                })}
              </Svg>
              <View style={styles.liveTripList}>
                {liveLocations.map((location) => {
                  const isFresh = location.updatedAt !== null && currentTime - new Date(location.updatedAt).getTime() < 60_000;
                  return (
                    <Pressable
                      key={location.id}
                      style={styles.liveTripRow}
                      onPress={() => void Linking.openURL(`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=14/${location.latitude}/${location.longitude}`)}
                    >
                      <View style={[styles.liveDot, { backgroundColor: isFresh ? '#12B76A' : '#F79009' }]} />
                      <View style={styles.liveTripDetails}>
                        <Text style={styles.liveTripTitle}>{location.origin} to {location.destination}</Text>
                        <Text style={styles.liveTripSubtitle}>{location.driverName} · {location.vehiclePlate}</Text>
                      </View>
                      <Text style={styles.liveTripTimestamp}>
                        {location.updatedAt ? new Date(location.updatedAt).toLocaleTimeString() : 'No timestamp'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
          <Text style={styles.mapNote}>Schematic island view. Select a trip to open its coordinates in OpenStreetMap.</Text>
        </View>

        <View style={styles.operationsCard}>
          <View style={styles.operationsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Admin activity</Text>
              <Text style={styles.sectionSubtitle}>Recent driver and incident decisions</Text>
            </View>
          </View>
          {activityError ? <Text style={styles.inlineError}>{activityError}</Text> : null}
          {activity.length === 0 && !activityError ? <Text style={styles.emptyText}>No administrative actions have been recorded yet.</Text> : null}
          {activity.slice(0, 8).map((entry) => (
            <View key={entry.id} style={styles.activityRow}>
              <Ionicons name="shield-checkmark-outline" size={17} color="#0A84FF" />
              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>{entry.action.replaceAll('_', ' ')}</Text>
                <Text style={styles.activitySubtitle}>{entry.actorName} · {new Date(entry.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
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
                    if (!(await confirmAdminAction('Verify driver', `Approve ${driver.fullName}?`))) return;
                    try {
                      await verifyDriver(driver.userId);
                      await fetchDrivers();
                      showAdminMessage('Driver approved', `${driver.fullName} is now verified to drive.`);
                    } catch (error) {
                      showAdminMessage('Approval failed', error instanceof Error ? error.message : 'Unable to approve this driver right now.');
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
                    <View style={styles.incidentActions}>
                      {item.status === 'OPEN' ? (
                        <Pressable
                          disabled={updatingIncidentId === item.id}
                          onPress={() => void recordIncidentStatus(item.id, 'INVESTIGATING')}
                          style={styles.incidentAction}
                        >
                          <Text style={styles.incidentActionText}>Mark investigating</Text>
                        </Pressable>
                      ) : null}
                      {item.status !== 'RESOLVED' ? (
                        <Pressable
                          disabled={updatingIncidentId === item.id}
                          onPress={() => void recordIncidentStatus(item.id, 'RESOLVED')}
                          style={[styles.incidentAction, styles.resolveAction]}
                        >
                          {updatingIncidentId === item.id
                            ? <ActivityIndicator size="small" color="#FFFFFF" />
                            : <Text style={styles.resolveActionText}>Resolve</Text>}
                        </Pressable>
                      ) : (
                        <Pressable
                          disabled={updatingIncidentId === item.id}
                          onPress={() => void recordIncidentStatus(item.id, 'OPEN')}
                          style={styles.incidentAction}
                        >
                          <Text style={styles.incidentActionText}>Reopen</Text>
                        </Pressable>
                      )}
                    </View>
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
  incidentActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  incidentAction: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D0D5DD' },
  incidentActionText: { color: '#344054', fontSize: 12, fontWeight: '700' },
  resolveAction: { backgroundColor: '#16803C', borderColor: '#16803C', minWidth: 78, alignItems: 'center' },
  resolveActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 50, width: '100%', maxWidth: 1240, alignSelf: 'center' },
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
  operationsCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E5E5EA' },
  operationsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  operationsContent: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  map: { flexGrow: 1, minWidth: 320, maxWidth: 650, borderRadius: 14, backgroundColor: '#EAF3FF' },
  noLiveTrips: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F9FAFB', borderRadius: 12 },
  noLiveTripsText: { color: '#667085', fontSize: 13, textAlign: 'center', paddingHorizontal: 14 },
  liveTripList: { flex: 1, minWidth: 260 },
  liveTripRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EAECF0' },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  liveTripDetails: { flex: 1 },
  liveTripTitle: { color: '#101828', fontSize: 12, fontWeight: '700' },
  liveTripSubtitle: { color: '#667085', fontSize: 11, marginTop: 3 },
  liveTripTimestamp: { color: '#667085', fontSize: 10 },
  mapNote: { color: '#98A2B3', fontSize: 11, marginTop: 12 },
  inlineError: { color: '#B42318', fontSize: 12, marginBottom: 10 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#EAECF0', paddingVertical: 11 },
  activityDetails: { flex: 1 },
  activityTitle: { color: '#101828', fontSize: 12, fontWeight: '700' },
  activitySubtitle: { color: '#667085', fontSize: 11, marginTop: 3 },

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
