import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useTransportStore } from '@/store/transportStore';
import DriverAvailabilityControl from '@/components/DriverAvailabilityControl';
import { CURRENCY } from '@/constants';
import { DriverAvailability } from '@/types/transport';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    trips,
    driverBookings,
    driverAvailability,
    fetchTrips,
    fetchDriverBookings,
    fetchDriverAvailability,
    setDriverAvailability,
    updateBookingStatus,
  } = useTransportStore();
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [selectedService, setSelectedService] = useState<'NORMAL' | 'TOURIST' | null>(null);
  const isBusDriver = user?.vehicleType === 'BUS' || user?.vehicleType === 'MINIBUS';
  const supportsAvailability = user?.vehicleType === 'TAXI' || user?.vehicleType === 'PUBLIC_TRANSPORT';

  useEffect(() => {
    if (!user || user.role !== 'DRIVER') return;

    void fetchTrips().catch((error) => console.error('Failed to fetch trips:', error));
    void fetchDriverBookings().catch((error) => console.error('Failed to fetch bookings:', error));
    if (supportsAvailability) {
      void fetchDriverAvailability();
    }
  }, [user, fetchTrips, fetchDriverBookings, fetchDriverAvailability, supportsAvailability]);

  const currentDriverId = user?.id ?? '';
  const currentDriverBookings = driverBookings.filter((booking) => booking.status !== 'COMPLETED');
  const driverTrips = user
    ? trips.filter(
        (t) => t.driverId === currentDriverId && (t.vehicleType === 'BUS' || t.vehicleType === 'MINIBUS')
      )
    : [];
  const activeTrips = driverTrips.filter((t) => t.status === 'ACTIVE');

  // Estimate earnings based on trips and completed bookings
  const estimatedEarnings = isBusDriver
    ? driverTrips.reduce((acc, trip) => acc + (trip.totalSeats - trip.availableSeats) * trip.fare, 0)
    : driverBookings
        .filter((booking) => booking.status === 'COMPLETED')
        .reduce((total, booking) => total + booking.fare, 0);

  const handleAvailabilityChange = async (status: DriverAvailability) => {
    setIsUpdatingAvailability(true);
    try {
      await setDriverAvailability(status);
      Alert.alert(
        'Availability Updated',
        `Your status is now ${status.replace('_', ' ').toLowerCase()}.`,
      );
    } catch (error: any) {
      Alert.alert('Status Error', error?.message || 'Could not update online status.');
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      await updateBookingStatus(bookingId, 'CONFIRMED');
      Alert.alert('Booking Confirmed', 'The passenger has been notified that you accepted the trip.');
    } catch {
      Alert.alert('Error', 'Unable to confirm booking.');
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      await updateBookingStatus(bookingId, 'COMPLETED');
      Alert.alert(
        'Trip Completed',
        supportsAvailability
          ? 'Booking saved to Trip History. Choose Available or Not Available in Service Availability when you are ready.'
          : 'Booking marked as completed. Payment collected in cash!',
      );
    } catch {
      Alert.alert('Error', 'Unable to complete booking.');
    }
  };

  const isPending = user?.driverVerificationStatus === 'PENDING_VERIFICATION';
  const isVerified = user?.driverVerificationStatus === 'VERIFIED';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <VanuatuScreenBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greeting}>
          <Text style={styles.hello}>Hello, Welcome back</Text>
          <Text style={styles.name}>{user?.firstName || 'Driver'}</Text>
        </View>

        <View style={styles.serviceChoiceCard}>
          <Text style={styles.serviceChoiceTitle}>What service are you doing today?</Text>
          <Pressable
            onPress={() => setSelectedService('NORMAL')}
            style={[
              styles.serviceChoice,
              selectedService === 'NORMAL' && styles.serviceChoiceSelected,
            ]}
          >
            <Ionicons name="bus-outline" size={22} color="#0D705B" />
            <View style={styles.serviceChoiceText}>
              <Text style={styles.serviceChoiceName}>Normal Transport Service</Text>
              <Text style={styles.serviceChoiceSubtitle}>
                Continue with bus, taxi and other existing transport work.
              </Text>
            </View>
            {selectedService === 'NORMAL' ? (
              <Ionicons name="checkmark-circle" size={20} color="#0D705B" />
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => {
              setSelectedService('TOURIST');
              router.push('/tourist/manage');
            }}
            style={styles.serviceChoice}
          >
            <Ionicons name="compass-outline" size={22} color="#0D705B" />
            <View style={styles.serviceChoiceText}>
              <Text style={styles.serviceChoiceName}>Tourist Transport Service</Text>
              <Text style={styles.serviceChoiceSubtitle}>
                Publish availability, accept tour requests and record cash payments.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color="#0D705B" />
          </Pressable>
        </View>

        {selectedService === 'NORMAL' ? (
          <>
        {/* Pending Approval Notice Banner */}
        {isPending && (
          <View style={styles.pendingNoticeCard}>
            <Ionicons name="information-circle" size={24} color="#FF9500" />
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingNoticeTitle}>Transport Authority Verification Pending</Text>
              <Text style={styles.pendingNoticeSub}>
                Your driver license & vehicle permit are undergoing verification. You can test routes and view dispatch in the meantime.
              </Text>
            </View>
          </View>
        )}

        {supportsAvailability && (
          <View style={[styles.statusCard, { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
            <View>
              <Text style={styles.statusLabel}>Service Availability</Text>
              <Text style={styles.statusSub}>Choose whether passengers can find or book you.</Text>
            </View>
            <View pointerEvents={isUpdatingAvailability || !isVerified ? 'none' : 'auto'} style={isUpdatingAvailability || !isVerified ? { opacity: 0.6 } : undefined}>
              <DriverAvailabilityControl
                status={driverAvailability}
                onChange={(status) => void handleAvailabilityChange(status)}
              />
            </View>
          </View>
        )}

        {/* Schedule trip direct action button */}
        {isBusDriver && <Pressable
          style={styles.createTripBanner}
          onPress={() => router.push('/(driver)/trips')}
        >
          <View style={styles.bannerIconBox}>
            <Ionicons name="add-circle" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Schedule Regular Trip</Text>
            <Text style={styles.bannerSub}>
              Publish timed route from wharf, airport, or market
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverTrips.length}</Text>
            <Text style={styles.statLabel}>My Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>{currentDriverBookings.length}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#0A84FF' }]}>
              {CURRENCY} {estimatedEarnings}
            </Text>
            <Text style={styles.statLabel}>Today&apos;s Est.</Text>
          </View>
        </View>

        {/* Live Booking Requests Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Incoming Booking & Cargo Requests</Text>
          <Text style={styles.countBadgeText}>{currentDriverBookings.length} total</Text>
        </View>

        {currentDriverBookings.length === 0 ? (
          <View style={styles.emptyBookingsCard}>
            <Ionicons name="receipt-outline" size={36} color="#8E8E93" />
            <Text style={styles.emptyBookingsTitle}>No Booking Requests Yet</Text>
            <Text style={styles.emptyBookingsSub}>
              {isBusDriver ? 'Publish a scheduled trip so passengers can request seats.' : 'Set your status to Available so passengers can find and book you.'}
            </Text>
          </View>
        ) : (
          currentDriverBookings.map((b) => (
            <View key={b.id} style={styles.driverBookingCard}>
              <View style={styles.driverBookingTop}>
                <View>
                  <Text style={styles.bookingPassengerName}>{b.passengerName}</Text>
                  <Text style={styles.bookingPassengerPhone}>📞 {b.passengerPhone || 'No phone'}</Text>
                </View>
                <View
                  style={[
                    styles.bookingStatusBadge,
                    b.status === 'CONFIRMED' && styles.bookingStatusConfirmed,
                    b.status === 'REQUESTED' && styles.bookingStatusRequested,
                    b.status === 'COMPLETED' && styles.bookingStatusCompleted,
                  ]}
                >
                  <Text style={styles.bookingStatusBadgeText}>{b.status}</Text>
                </View>
              </View>

              <Text style={styles.driverBookingRoute}>
                📍 {b.pickupLocation} → {b.dropoffLocation}
              </Text>

              {b.cargoNotes ? (
                <View style={styles.driverBookingCargoBox}>
                  <Ionicons name="cube" size={14} color="#FF9500" />
                  <Text style={styles.driverBookingCargoText}>Cargo: {b.cargoNotes}</Text>
                </View>
              ) : null}

              <View style={styles.driverBookingBottom}>
                <Text style={styles.driverBookingFare}>
                  Fare: <Text style={styles.driverBookingFareBold}>{b.fare} VT</Text>
                </Text>

                <View style={styles.driverBookingActions}>
                  {b.passengerPhone ? (
                    <Pressable
                      style={styles.driverCallBtn}
                      onPress={() => Alert.alert('Contact Passenger', `Calling ${b.passengerName} at ${b.passengerPhone}`)}
                    >
                      <Ionicons name="call" size={14} color="#0A84FF" />
                    </Pressable>
                  ) : null}

                  {b.status === 'REQUESTED' && (
                    <Pressable
                      style={styles.acceptBookingBtn}
                      onPress={() => handleConfirmBooking(b.id)}
                    >
                      <Text style={styles.acceptBookingBtnText}>Accept</Text>
                    </Pressable>
                  )}

                  {b.status === 'CONFIRMED' && (
                    <Pressable
                      style={styles.completeBookingBtn}
                      onPress={() => handleCompleteBooking(b.id)}
                    >
                      <Text style={styles.completeBookingBtnText}>Complete</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          ))
        )}

        {/* Recent Trips Section */}
        {isBusDriver && <>
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>My Scheduled Routes</Text>
          <Pressable onPress={() => router.push('/(driver)/trips')}>
            <Text style={styles.viewAllText}>Manage ({driverTrips.length})</Text>
          </Pressable>
        </View>

        {driverTrips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No scheduled routes today</Text>
            <Text style={styles.emptySubtext}>
              Tap &quot;Schedule Regular Trip&quot; to broadcast a fixed route
            </Text>
          </View>
        ) : (
          driverTrips.slice(0, 3).map((trip) => (
            <Pressable
              key={trip.id}
              style={styles.tripItemCard}
              onPress={() => router.push('/(driver)/trips')}
            >
              <View style={styles.tripItemIcon}>
                <Ionicons
                  name={trip.vehicleType === 'TAXI' ? 'car-outline' : 'bus-outline'}
                  size={20}
                  color="#0A84FF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripRouteText}>
                  {trip.origin} → {trip.destination}
                </Text>
                <Text style={styles.tripMetaText}>
                  {trip.vehicleType} • Departs: {trip.departureTime} • {trip.fare} {trip.currency}
                </Text>
              </View>
              <View
                style={[
                  styles.tripBadge,
                  trip.status === 'ACTIVE' && styles.tripBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tripBadgeText,
                    trip.status === 'ACTIVE' && styles.tripBadgeTextActive,
                  ]}
                >
                  {trip.status}
                </Text>
              </View>
            </Pressable>
          ))
        )}
        </>}
          </>
        ) : selectedService === 'TOURIST' ? (
          <Pressable
            onPress={() => router.push('/tourist/manage')}
            style={styles.touristSelectedCard}
          >
            <Ionicons name="compass-outline" size={24} color="#0D705B" />
            <View style={styles.serviceChoiceText}>
              <Text style={styles.serviceChoiceName}>Tourist Transport Service selected</Text>
              <Text style={styles.serviceChoiceSubtitle}>
                Set availability, publish an eligible vehicle, and manage tourist bookings.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color="#0D705B" />
          </Pressable>
        ) : (
          <Text style={styles.serviceChoicePrompt}>
            Choose a service to open today’s driver tools.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  greeting: { marginBottom: 16 },
  hello: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: '#1C1C1E', marginTop: 2 },
  serviceChoiceCard: {
    gap: 8,
    marginBottom: 18,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D3E7DE',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  serviceChoiceTitle: { marginBottom: 3, color: '#173D33', fontSize: 16, fontWeight: '800' },
  serviceChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1EAE5',
    backgroundColor: '#FBFDFC',
  },
  serviceChoiceSelected: { borderColor: '#0D705B', backgroundColor: '#E7F4EE' },
  serviceChoiceText: { flex: 1 },
  serviceChoiceName: { color: '#173D33', fontSize: 13, fontWeight: '700' },
  serviceChoiceSubtitle: { marginTop: 3, color: '#687871', fontSize: 11, lineHeight: 15 },
  touristSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#E7F4EE',
  },
  serviceChoicePrompt: { marginTop: 4, color: '#687871', fontSize: 13, textAlign: 'center' },

  statusCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: { fontSize: 14, color: '#1C1C1E', fontWeight: '700' },
  statusSub: { fontSize: 11, color: '#8E8E93', marginTop: 2, maxWidth: 200 },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusToggleOnline: { backgroundColor: '#E8F8EE' },
  statusToggleOffline: { backgroundColor: '#FFEBEA' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: '#34C759' },
  dotOffline: { backgroundColor: '#FF3B30' },
  statusText: { fontSize: 12, fontWeight: '800' },
  textOnline: { color: '#34C759' },
  textOffline: { color: '#FF3B30' },

  createTripBanner: {
    backgroundColor: '#0A84FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  viewAllText: { fontSize: 13, color: '#0A84FF', fontWeight: '600' },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: '#F9F9FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginBottom: 4 },
  emptySubtext: { fontSize: 12, color: '#8E8E93', textAlign: 'center', paddingHorizontal: 20 },

  tripItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tripItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripRouteText: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },
  tripMetaText: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  tripBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  tripBadgeActive: { backgroundColor: '#E8F8EE' },
  tripBadgeText: { fontSize: 10, fontWeight: '800', color: '#8E8E93' },
  tripBadgeTextActive: { color: '#34C759' },

  /* ================= BOOKINGS & PENDING STATUS STYLES ================= */
  pendingNoticeCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFF9EE',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE0A3',
  },
  pendingNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B36B00',
    marginBottom: 2,
  },
  pendingNoticeSub: {
    fontSize: 12,
    color: '#8A5300',
    lineHeight: 17,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A84FF',
  },
  emptyBookingsCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  emptyBookingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyBookingsSub: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
  },
  driverBookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  driverBookingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bookingPassengerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  bookingPassengerPhone: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  bookingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  bookingStatusConfirmed: { backgroundColor: '#E8F8EE' },
  bookingStatusRequested: { backgroundColor: '#FFF3E0' },
  bookingStatusCompleted: { backgroundColor: '#EAF3FF' },
  bookingStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8E93',
  },
  driverBookingRoute: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    marginVertical: 4,
  },
  driverBookingCargoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF9EE',
    padding: 6,
    borderRadius: 8,
    marginVertical: 4,
  },
  driverBookingCargoText: {
    fontSize: 12,
    color: '#B36B00',
    fontWeight: '600',
  },
  driverBookingBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  driverBookingFare: {
    fontSize: 12,
    color: '#8E8E93',
  },
  driverBookingFareBold: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  driverBookingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBookingBtn: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptBookingBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  completeBookingBtn: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completeBookingBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
