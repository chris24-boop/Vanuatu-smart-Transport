import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useTransportStore } from '@/store/transportStore';
import { useLanguageStore } from '@/i18n';
import LanguageSelectorModal from '@/components/LanguageSelectorModal';
import EmergencySosModal from '@/components/EmergencySosModal';
import ReportIncidentModal from '@/components/ReportIncidentModal';
import DriverRatingModal from '@/components/DriverRatingModal';
import RegulatedZoneGuideModal from '@/components/RegulatedZoneGuideModal';
import { calculateRegulatedFare, detectZone } from '@/constants/zones';
import { sendBookingViaSms } from '@/utils/smsHelper';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';
import { AvailableServiceItem, TripItem, VehicleCategory } from '@/types/transport';

const getVehicleTypeLabel = (vehicleType: string) =>
  vehicleType === 'MINIBUS'
    ? 'BUS'
    : vehicleType === 'CAR'
      ? 'PUBLIC_TRANSPORT'
      : vehicleType;

const PRESET_PICKUPS = [
  'Main Wharf (Ship Berth / Inter-Island Cargo)',
  'Star Wharf (Domestic Wharf)',
  'Port Vila Central Market',
  'Freswota 4 Market',
  'Bauerfield Airport (Domestic & Cargo)',
  'Mele Village & Cascades',
  'Pango Point & Breakas',
];

const PRESET_DROPOFFS = [
  'Port Vila Central Market (Produce & Stalls)',
  'Freswota 4 Market',
  'Port Vila Seafront',
  'Main Wharf (Ship Cargo Pickup)',
  'Bauerfield Airport',
  'Mele Beach & Village',
  'Erakor Village',
];

export default function PassengerHomeScreen() {
  const { user } = useAuthStore();
  const { t, language } = useLanguageStore();
  const {
    trips,
    availableServices,
    bookings,
    isOffline,
    fetchTrips,
    fetchAvailableServices,
    fetchMyBookings,
    createBooking,
    cancelBooking,
  } = useTransportStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTrip, setSelectedTrip] = useState<TripItem | null>(null);
  const [selectedService, setSelectedService] = useState<AvailableServiceItem | null>(null);

  // New Feature Modals
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [zoneGuideModalVisible, setZoneGuideModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{
    bookingId: string;
    driverName: string;
    vehiclePlate: string;
  } | null>(null);

  // Booking Modal states
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [bookingPickup, setBookingPickup] = useState('');
  const [bookingDropoff, setBookingDropoff] = useState('');
  const [bookingSeats, setBookingSeats] = useState('1');
  const [bookingCargo, setBookingCargo] = useState('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  // My Bookings Sheet state
  const [myBookingsVisible, setMyBookingsVisible] = useState(false);

  useEffect(() => {
    void fetchTrips().catch((error) => console.error('Failed to fetch trips:', error));
    void fetchAvailableServices();
    void fetchMyBookings().catch((error) => console.error('Failed to fetch bookings:', error));
  }, [fetchTrips, fetchAvailableServices, fetchMyBookings]);

  const activeBookingsCount = bookings.filter(
    (b) => b.status === 'REQUESTED' || b.status === 'CONFIRMED',
  ).length;

  // Filter trips based on search query and vehicle category
  const filteredTrips = trips.filter((trip) => {
    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      return false;
    }

    if (
      selectedCategory !== 'ALL' &&
      trip.vehicleType !== selectedCategory &&
      !(selectedCategory === 'BUS' && trip.vehicleType === 'MINIBUS')
    ) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrigin = trip.origin.toLowerCase().includes(q);
      const matchDest = trip.destination.toLowerCase().includes(q);
      const matchDriver = trip.driverName.toLowerCase().includes(q);
      const matchVehicle = trip.vehicleType.toLowerCase().includes(q);
      return matchOrigin || matchDest || matchDriver || matchVehicle;
    }

    return true;
  });

  const openBookingModal = (trip: TripItem) => {
    setSelectedService(null);
    setSelectedTrip(trip);
    setBookingPickup(trip.origin);
    setBookingDropoff(trip.destination);
    setBookingSeats('1');
    setBookingCargo('');
    setBookingModalVisible(true);
  };

  const openServiceBookingModal = (service: AvailableServiceItem) => {
    setSelectedTrip(null);
    setSelectedService(service);
    setBookingPickup('');
    setBookingDropoff('');
    setBookingSeats('1');
    setBookingCargo('');
    setBookingModalVisible(true);
  };

  const handleSendBookingSms = async () => {
    const bookingTarget = selectedTrip || selectedService;
    if (!bookingTarget) return;
    const seats = Math.max(1, parseInt(bookingSeats, 10) || 1);
    const reg = calculateRegulatedFare(
      bookingPickup,
      bookingDropoff,
      bookingTarget.vehicleType as any,
      seats,
    );

    setBookingModalVisible(false);
    await sendBookingViaSms({
      driverPhone: bookingTarget.driverPhone,
      driverName: bookingTarget.driverName,
      pickup: bookingPickup.trim() || 'Port Vila',
      dropoff: bookingDropoff.trim() || 'Destination',
      seats,
      fare: reg.fare || Number(bookingTarget.fare) * seats,
      passengerName: `${user?.firstName || 'Pasenja'} ${user?.lastName || ''}`.trim(),
      passengerPhone: user?.phone || '',
      cargoNotes: bookingCargo.trim() || undefined,
    });
  };

  const handleConfirmBooking = async () => {
    const bookingTarget = selectedTrip || selectedService;
    if (!bookingTarget) return;
    if (!bookingPickup.trim() || !bookingDropoff.trim()) {
      Alert.alert(t('error'), 'Plis givim ples blong pikimap mo dropem yu.');
      return;
    }

    try {
      setIsBookingSubmitting(true);
      const seats = Math.max(1, parseInt(bookingSeats, 10) || 1);
      const reg = calculateRegulatedFare(
        bookingPickup,
        bookingDropoff,
        bookingTarget.vehicleType as any,
        seats,
      );
      const fare = reg.fare || Number(bookingTarget.fare) * seats;

      await createBooking(selectedTrip ? {
        tripId: selectedTrip.id,
        pickupLocation: bookingPickup.trim(),
        dropoffLocation: bookingDropoff.trim(),
        seatsCount: seats,
        cargoNotes: bookingCargo.trim() || undefined,
        fare,
      } : {
        driverId: bookingTarget.driverId,
        pickupLocation: bookingPickup.trim(),
        dropoffLocation: bookingDropoff.trim(),
        seatsCount: seats,
        cargoNotes: bookingCargo.trim() || undefined,
        fare,
      });

      setIsBookingSubmitting(false);
      setBookingModalVisible(false);
      setSelectedTrip(null);

      Alert.alert(
        'Buking i Go Finis! / Booking Sent!',
        `Rikwes blong yu i go finis long ${bookingTarget.driverName} (${getVehicleTypeLabel(bookingTarget.vehicleType)}). Drayva bae i luksave kwiktaem!`,
        [
          {
            text: t('myBookings'),
            onPress: () => setMyBookingsVisible(true),
          },
          { text: t('ok') },
        ],
      );
    } catch (error: any) {
      setIsBookingSubmitting(false);
      const errMsg = error?.response?.data?.message || error.message || 'Intanet i slak o i no stap.';
      Alert.alert(
        'Intanet Problem / Offline',
        `${errMsg}\n\nYu wantem sen buking ya tru long SMS stret long fon blong drayva?`,
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('sendViaSms'),
            onPress: () => {
              void handleSendBookingSms();
            },
          },
        ],
      );
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking request?', [
      { text: 'Keep Booking', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(bookingId);
          } catch {
            Alert.alert('Error', 'Unable to cancel booking.');
          }
        },
      },
    ]);
  };

  const bookingTarget = selectedTrip || selectedService;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <VanuatuScreenBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting & Header */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.hello}>{t('greeting')}</Text>
            <Text style={styles.name}>{user?.firstName || 'Passenger'}</Text>
          </View>
          <View style={styles.headerRightActions}>
            <Pressable
              style={styles.langSelectorBtn}
              onPress={() => setLangModalVisible(true)}
            >
              <Text style={styles.langSelectorBtnText}>
                {language === 'bi' ? '🇻🇺 Bi' : language === 'fr' ? '🇫🇷 Fr' : '🇬🇧 En'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.sosHeaderBtn}
              onPress={() => setSosModalVisible(true)}
            >
              <Ionicons name="warning" size={14} color="#FFFFFF" />
              <Text style={styles.sosHeaderBtnText}>SOS</Text>
            </Pressable>

            <Pressable
              style={styles.myBookingsBadgeBtn}
              onPress={() => setMyBookingsVisible(true)}
            >
              <Ionicons name="receipt-outline" size={17} color="#0A84FF" />
              <Text style={styles.myBookingsBtnText}>{t('myBookings')}</Text>
              {activeBookingsCount > 0 && (
                <View style={styles.activePillBadge}>
                  <Text style={styles.activePillBadgeText}>{activeBookingsCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Quick Island Action Bar: Regulated Zone Fares & Incident Report */}
        <View style={styles.quickUtilityBar}>
          <Pressable style={styles.utilityActionChip} onPress={() => setZoneGuideModalVisible(true)}>
            <Ionicons name="pricetag" size={13} color="#167D5A" />
            <Text style={styles.utilityActionText}>{t('zoneUrban')} (150 VT)</Text>
          </Pressable>
          <Pressable style={styles.utilityActionChip} onPress={() => setIncidentModalVisible(true)}>
            <Ionicons name="document-text" size={13} color="#FF9500" />
            <Text style={styles.utilityActionText}>{t('reportIncident')}</Text>
          </Pressable>
        </View>

        {/* Offline Alert Banner */}
        {isOffline && (
          <View style={styles.offlineNoticeBox}>
            <Ionicons name="cloud-offline" size={18} color="#C92A2A" />
            <Text style={styles.offlineNoticeText}>{t('offlineBanner')}</Text>
          </View>
        )}

        {/* Live Tracking Banner */}
        <View style={styles.heroBanner}>
          <View style={{ flex: 1 }}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveIndicatorText}>{t('heroLive')}</Text>
            </View>
            <Text style={styles.heroTitle}>{t('heroTitle')}</Text>
            <Text style={styles.heroSubtitle}>{t('heroSub')}</Text>
          </View>
          <View style={styles.heroIconBox}>
            <Ionicons name="bus" size={32} color="#0A84FF" />
          </View>
        </View>

        {/* Search Box */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPlaceholder')}
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

        {/* Quick Filter Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryPills}
        >
          {[
            { id: 'ALL', label: t('catAll'), icon: 'apps' },
            { id: 'TAXI', label: t('catTaxi'), icon: 'car-outline' },
            { id: 'PUBLIC_TRANSPORT', label: t('catPublic'), icon: 'bus-outline' },
            { id: 'BUS', label: t('catBus'), icon: 'bus' },
          ].map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryPill,
                selectedCategory === cat.id && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={selectedCategory === cat.id ? '#FFFFFF' : '#8E8E93'}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat.id && styles.categoryPillTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.availableServicesSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Taxi & Public Transport Available Now</Text>
              <Text style={styles.sectionSubtitle}>Book or call a driver directly</Text>
            </View>
            <Text style={styles.countBadge}>{availableServices.length} available</Text>
          </View>
          {availableServices.length === 0 ? (
            <Text style={styles.noAvailableServices}>No taxi or public transport drivers are available right now.</Text>
          ) : availableServices.map((service) => (
            <View key={service.id} style={styles.availableServiceCard}>
              <View style={styles.availableServiceDetails}>
                <View style={styles.availableServiceNameRow}>
                  <Text style={styles.availableServiceName}>{service.driverName}</Text>
                  {service.driverVerified && <Ionicons name="checkmark-circle" size={16} color="#167D5A" />}
                </View>
                <Text style={styles.availableServiceMeta}>
                  {service.vehicleType === 'TAXI' ? 'Taxi' : 'Public Transport'} • {service.vehiclePlate}
                </Text>
                <Text style={styles.availableServiceFare}>From {service.fare} {service.currency}</Text>
              </View>
              <View style={styles.availableServiceActions}>
                <Pressable
                  style={styles.serviceCallButton}
                  onPress={() => {
                    void Linking.openURL(`tel:${service.driverPhone}`).catch(() => {
                      Alert.alert('Unable to Call', 'Calling is not available on this device.');
                    });
                  }}
                >
                  <Ionicons name="call" size={16} color="#167D5A" />
                </Pressable>
                <Pressable
                  style={styles.serviceBookButton}
                  onPress={() => openServiceBookingModal(service)}
                >
                  <Text style={styles.serviceBookButtonText}>Book</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Section: Live Trips from Drivers */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Available Trips & Arrival Times</Text>
            <Text style={styles.sectionSubtitle}>
              Tap any vehicle to track real-time arrival to your location
            </Text>
          </View>
          <Text style={styles.countBadge}>{filteredTrips.length} active</Text>
        </View>

        {/* Trips Feed */}
        {filteredTrips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="compass-outline" size={44} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Trips Found</Text>
            <Text style={styles.emptyText}>
              No drivers are currently scheduled for this route. Switch to the Driver view above to create one!
            </Text>
          </View>
        ) : (
          filteredTrips.map((trip) => {
            const isActive = trip.status === 'ACTIVE';

            return (
              <Pressable
                key={trip.id}
                style={styles.tripCard}
                onPress={() => setSelectedTrip(trip)}
              >
                {/* Card Top: Vehicle Type, Plate & Status */}
                <View style={styles.tripCardHeader}>
                  <View style={styles.vehicleTypeBox}>
                    <Ionicons
                      name={
                        trip.vehicleType === 'TAXI'
                          ? 'car-outline'
                          : 'bus-outline'
                      }
                      size={18}
                      color="#0A84FF"
                    />
                    <Text style={styles.vehicleTypeTitle}>
                      {getVehicleTypeLabel(trip.vehicleType)} • {trip.vehiclePlate}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusIndicatorBadge,
                      isActive && styles.statusIndicatorBadgeActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDotSmall,
                        isActive && styles.statusDotSmallActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusIndicatorText,
                        isActive && styles.statusIndicatorTextActive,
                      ]}
                    >
                      {isActive ? 'EN ROUTE' : 'SCHEDULED'}
                    </Text>
                  </View>
                </View>

                {/* Route Diagram */}
                <View style={styles.routeBox}>
                  <View style={styles.routeItem}>
                    <View style={styles.dotStart} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopLabel}>DEPARTURE</Text>
                      <Text style={styles.stopName}>{trip.origin}</Text>
                    </View>
                    <Text style={styles.stopTime}>{trip.departureTime}</Text>
                  </View>

                  <View style={styles.routeLineBox}>
                    <View style={styles.routeConnectorLine} />
                    {isActive ? (
                      <View style={styles.movingVehicleBadge}>
                        <Ionicons name="navigate" size={10} color="#0A84FF" />
                        <Text style={styles.movingVehicleText}>Arriving in ~{trip.durationMinutes} min</Text>
                      </View>
                    ) : (
                      <Text style={styles.routeDurationText}>~{trip.durationMinutes} min trip</Text>
                    )}
                  </View>

                  <View style={styles.routeItem}>
                    <View style={styles.dotEnd} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopLabel}>ARRIVAL DESTINATION</Text>
                      <Text style={styles.stopName}>{trip.destination}</Text>
                    </View>
                    <Text style={styles.stopTime}>{trip.arrivalTime}</Text>
                  </View>
                </View>

                {/* Driver Info & Action Bar */}
                <View style={styles.tripCardFooter}>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverAvatarSmall}>
                      <Text style={styles.driverInitial}>
                        {trip.driverName.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <View style={styles.driverVerifiedRow}>
                        <Text style={styles.driverNameText}>{trip.driverName}</Text>
                        {trip.driverVerified && (
                          <Ionicons name="checkmark-circle" size={13} color="#34C759" />
                        )}
                      </View>
                      <Text style={styles.seatAvailabilityText}>
                        {trip.availableSeats} seats available
                      </Text>
                    </View>
                  </View>

                  <View style={styles.fareContainer}>
                    <Text style={styles.fareNumber}>
                      {trip.fare} <Text style={styles.fareUnit}>{trip.currency}</Text>
                    </Text>
                    <Pressable
                      style={styles.bookDirectPill}
                      onPress={(e) => {
                        e.stopPropagation();
                        openBookingModal(trip);
                      }}
                    >
                      <Ionicons name="ticket" size={12} color="#FFFFFF" />
                      <Text style={styles.bookDirectPillText}>Book Now</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* TRIP DETAIL & LIVE ARRIVAL TRACKER MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedTrip}
        onRequestClose={() => setSelectedTrip(null)}
      >
        {selectedTrip && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              {/* Sheet Handle */}
              <View style={styles.sheetHandle} />

              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.sheetLiveRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.sheetLiveText}>LIVE ARRIVAL TRACKER</Text>
                  </View>
                  <Text style={styles.sheetRouteTitle}>
                    {selectedTrip.origin} → {selectedTrip.destination}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedTrip(null)}
                  style={styles.sheetCloseBtn}
                >
                  <Ionicons name="close" size={22} color="#1C1C1E" />
                </Pressable>
              </View>

              <ScrollView
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
              >
                {/* Arrival Countdown Hero Card */}
                <View style={styles.etaHeroCard}>
                  <View style={styles.etaIconCircle}>
                    <Ionicons name="time" size={28} color="#0A84FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.etaLabel}>ESTIMATED ARRIVAL TO YOU</Text>
                    <Text style={styles.etaTimeText}>
                      {selectedTrip.arrivalTime} (~{selectedTrip.durationMinutes} mins)
                    </Text>
                    <Text style={styles.etaStatusSub}>
                      {selectedTrip.status === 'ACTIVE'
                        ? 'Bus is currently en route on road'
                        : `Scheduled to depart at ${selectedTrip.departureTime}`}
                    </Text>
                  </View>
                </View>

                {/* Route Stops Tracker */}
                <View style={styles.stopsSection}>
                  <Text style={styles.stopsSectionTitle}>Route Progress & Stops</Text>
                  <View style={styles.timelineContainer}>
                    {selectedTrip.stops.map((stop, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === selectedTrip.stops.length - 1;
                      const isCurrent =
                        (selectedTrip.currentStopIndex || 0) === idx;
                      const isPassed =
                        (selectedTrip.currentStopIndex || 0) > idx;

                      return (
                        <View key={stop.id} style={styles.timelineRow}>
                          <View style={styles.timelineIconCol}>
                            <View
                              style={[
                                styles.timelineDot,
                                isPassed && styles.timelineDotPassed,
                                isCurrent && styles.timelineDotCurrent,
                              ]}
                            >
                              {isPassed && (
                                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                              )}
                              {isCurrent && (
                                <View style={styles.innerPulseDot} />
                              )}
                            </View>
                            {!isLast && <View style={styles.timelineBar} />}
                          </View>

                          <View style={styles.timelineContent}>
                            <View style={styles.timelineTitleRow}>
                              <Text
                                style={[
                                  styles.stopItemName,
                                  isCurrent && styles.stopItemNameCurrent,
                                ]}
                              >
                                {stop.name}
                              </Text>
                              <Text style={styles.stopEstimatedTime}>
                                +{stop.estimatedMinutesFromStart}m
                              </Text>
                            </View>
                            <Text style={styles.stopStatusSub}>
                              {isPassed
                                ? 'Departed'
                                : isCurrent
                                ? 'Approaching now'
                                : 'Next on route'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Driver & Vehicle Card */}
                <View style={styles.driverProfileCard}>
                  <View style={styles.driverProfileAvatar}>
                    <Text style={styles.driverProfileInitial}>
                      {selectedTrip.driverName.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.driverVerifiedRow}>
                      <Text style={styles.driverProfileName}>
                        {selectedTrip.driverName}
                      </Text>
                      {selectedTrip.driverVerified && (
                        <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                      )}
                    </View>
                    <Text style={styles.driverProfileVehicle}>
                      {getVehicleTypeLabel(selectedTrip.vehicleType)} • Plate {selectedTrip.vehiclePlate}
                    </Text>
                    <Text style={styles.driverProfilePhone}>
                      📞 {selectedTrip.driverPhone}
                    </Text>
                  </View>

                  <View style={styles.fareTagBox}>
                    <Text style={styles.fareTagNumber}>{selectedTrip.fare}</Text>
                    <Text style={styles.fareTagCurrency}>{selectedTrip.currency}</Text>
                  </View>
                </View>

                {/* Seat availability meter */}
                <View style={styles.seatsMeterCard}>
                  <View style={styles.seatsMeterHeader}>
                    <Text style={styles.seatsMeterTitle}>Passenger Seats</Text>
                    <Text style={styles.seatsMeterCount}>
                      {selectedTrip.availableSeats} of {selectedTrip.totalSeats} seats open
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.round(
                            (selectedTrip.availableSeats / selectedTrip.totalSeats) * 100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.sheetActions}>
                  <Pressable
                    style={styles.bookButton}
                    onPress={() => {
                      const trip = selectedTrip;
                      setSelectedTrip(null);
                      openBookingModal(trip);
                    }}
                  >
                    <Ionicons name="ticket-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.bookButtonText}>
                      Book / Reserve Now ({selectedTrip.fare} {selectedTrip.currency})
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.callButton}
                    onPress={() => {
                      Alert.alert(
                        'Contact Driver',
                        `Calling driver ${selectedTrip.driverName} at ${selectedTrip.driverPhone}`,
                      );
                    }}
                  >
                    <Ionicons name="call" size={18} color="#0A84FF" />
                    <Text style={styles.callButtonText}>Call Driver</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      {/* ================= DEDICATED BOOKING MODAL ================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={bookingModalVisible}
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bookingSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetHeaderCategory}>
                  {bookingTarget?.vehicleType === 'TAXI'
                    ? 'BOOK TAXI HIRE'
                    : bookingTarget?.vehicleType === 'BUS'
                      ? 'BOOK BUS TRIP'
                      : 'BOOK PUBLIC TRANSPORT'}
                </Text>
                <Text style={styles.sheetRouteTitle}>
                  {bookingTarget?.driverName} • {bookingTarget?.vehiclePlate}
                </Text>
              </View>
              <Pressable
                onPress={() => setBookingModalVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <Ionicons name="close" size={22} color="#1C1C1E" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Pickup location */}
              <View style={styles.bookingInputGroup}>
                <Text style={styles.bookingInputLabel}>Pickup Location</Text>
                <TextInput
                  style={styles.bookingTextInput}
                  value={bookingPickup}
                  onChangeText={setBookingPickup}
                  placeholder="e.g. Main Wharf (Ship Berth), Star Wharf..."
                  placeholderTextColor="#8E8E93"
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {PRESET_PICKUPS.map((p) => (
                    <Pressable
                      key={p}
                      style={styles.presetChip}
                      onPress={() => setBookingPickup(p)}
                    >
                      <Text style={styles.presetChipText}>{p.split(' ')[0]} {p.split(' ')[1]}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Dropoff location */}
              <View style={styles.bookingInputGroup}>
                <Text style={styles.bookingInputLabel}>Drop-off Destination</Text>
                <TextInput
                  style={styles.bookingTextInput}
                  value={bookingDropoff}
                  onChangeText={setBookingDropoff}
                  placeholder="e.g. Port Vila Central Market..."
                  placeholderTextColor="#8E8E93"
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {PRESET_DROPOFFS.map((d) => (
                    <Pressable
                      key={d}
                      style={styles.presetChip}
                      onPress={() => setBookingDropoff(d)}
                    >
                      <Text style={styles.presetChipText}>{d.split(' ')[0]} {d.split(' ')[1]}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Optional journey notes */}
              <View style={styles.bookingInputGroup}>
                <Text style={styles.bookingInputLabel}>Luggage / Special Requests (Optional)</Text>
                <TextInput
                  style={[styles.bookingTextInput, { height: 60, textAlignVertical: 'top' }]}
                  value={bookingCargo}
                  onChangeText={setBookingCargo}
                  multiline
                  placeholder="e.g. luggage or pickup instructions"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.bookingInputGroup}>
                <Text style={styles.bookingInputLabel}>Number of Passengers</Text>
                <TextInput
                  style={styles.bookingTextInput}
                  value={bookingSeats}
                  onChangeText={setBookingSeats}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor="#8E8E93"
                />
                </View>

              {/* Regulated Zone Info */}
              {(() => {
                const seats = Math.max(1, parseInt(bookingSeats, 10) || 1);
                const reg = calculateRegulatedFare(
                  bookingPickup,
                  bookingDropoff,
                  bookingTarget?.vehicleType as any,
                  seats,
                );
                return (
                  <View style={styles.zoneHintCard}>
                    <View style={styles.zoneHintHeader}>
                      <View style={styles.zoneBadge}>
                        <Text style={styles.zoneBadgeText}>{reg.zone.id.replace('_', ' ')}</Text>
                      </View>
                      <Pressable
                        style={styles.zoneInfoLink}
                        onPress={() => setZoneGuideModalVisible(true)}
                      >
                        <Ionicons name="information-circle-outline" size={15} color="#167D5A" />
                        <Text style={styles.zoneInfoLinkText}>Ofisel Fia Guide</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.zoneHintName}>{reg.zone.nameBi}</Text>
                    <Text style={styles.zoneHintDesc}>{reg.zone.descriptionBi}</Text>
                  </View>
                );
              })()}

              {/* Fare Summary Box */}
              <View style={styles.fareSummaryBox}>
                <View>
                  <Text style={styles.fareSummaryLabel}>{t('totalFare')}</Text>
                  <Text style={styles.fareSummaryAmount}>
                    {(() => {
                      const seats = Math.max(1, parseInt(bookingSeats, 10) || 1);
                      const reg = calculateRegulatedFare(
                        bookingPickup,
                        bookingDropoff,
                        bookingTarget?.vehicleType as any,
                        seats,
                      );
                      return reg.fare || Number(bookingTarget?.fare || 150) * seats;
                    })()}{' '}
                    VT
                  </Text>
                </View>
                <View style={styles.cashNotice}>
                  <Ionicons name="cash-outline" size={16} color="#34C759" />
                  <Text style={styles.cashNoticeText}>Cash to driver</Text>
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                style={[styles.confirmBookingBtn, isBookingSubmitting && { opacity: 0.6 }]}
                onPress={handleConfirmBooking}
                disabled={isBookingSubmitting}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.confirmBookingBtnText}>
                  {isBookingSubmitting ? t('submitting') : t('submitBooking')}
                </Text>
              </Pressable>

              {/* SMS Fallback Button */}
              <Pressable
                style={styles.smsFallbackBtn}
                onPress={handleSendBookingSms}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#0D705B" />
                <Text style={styles.smsFallbackBtnText}>{t('sendViaSms')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MY BOOKINGS MODAL ================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={myBookingsVisible}
        onRequestClose={() => setMyBookingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.myBookingsSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetLiveText}>PASSENGER & CARGO DISPATCH</Text>
                <Text style={styles.sheetRouteTitle}>{t('myBookings')}</Text>
              </View>
              <Pressable
                onPress={() => setMyBookingsVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <Ionicons name="close" size={22} color="#1C1C1E" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {bookings.length === 0 ? (
                <View style={styles.emptyBookingsCard}>
                  <Ionicons name="receipt-outline" size={44} color="#C7C7CC" />
                  <Text style={styles.emptyBookingsTitle}>No Bookings Found</Text>
                  <Text style={styles.emptyBookingsText}>
                    You haven't requested any rides yet. Choose a route or an available driver to book a trip.
                  </Text>
                </View>
              ) : (
                bookings.map((b) => (
                  <View key={b.id} style={styles.bookingHistoryCard}>
                    <View style={styles.bookingHistoryTop}>
                      <View style={styles.bookingTypeBadge}>
                        <Ionicons
                          name={
                            b.vehicleType === 'TAXI'
                              ? 'car-outline'
                              : 'bus-outline'
                          }
                          size={15}
                          color="#0A84FF"
                        />
                        <Text style={styles.bookingTypeBadgeText}>
                          {getVehicleTypeLabel(b.vehicleType)} • {b.vehiclePlate}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.bookingStatusBadge,
                          b.status === 'CONFIRMED' && styles.bookingStatusConfirmed,
                          b.status === 'REQUESTED' && styles.bookingStatusRequested,
                          b.status === 'COMPLETED' && styles.bookingStatusCompleted,
                          b.status === 'CANCELLED' && styles.bookingStatusCancelled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.bookingStatusText,
                            b.status === 'CONFIRMED' && styles.bookingStatusTextConfirmed,
                            b.status === 'REQUESTED' && styles.bookingStatusTextRequested,
                          ]}
                        >
                          {b.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.bookingRouteText}>
                      {b.pickupLocation} → {b.dropoffLocation}
                    </Text>

                    {b.cargoNotes ? (
                      <View style={styles.bookingCargoBox}>
                        <Ionicons name="cube" size={12} color="#FF9500" />
                        <Text style={styles.bookingCargoText}>Cargo: {b.cargoNotes}</Text>
                      </View>
                    ) : null}

                    <View style={styles.bookingHistoryFooter}>
                      <View>
                        <Text style={styles.bookingDriverText}>Driver: {b.driverName}</Text>
                        <Text style={styles.bookingFareText}>{b.fare} {b.currency}</Text>
                      </View>
                      <View style={styles.bookingActionRow}>
                        {b.driverPhone ? (
                          <Pressable
                            style={styles.bookingCallSmallBtn}
                            onPress={() => {
                              void Linking.openURL(`tel:${b.driverPhone}`).catch(() => {
                                Alert.alert('Call Driver', `Calling ${b.driverName} at ${b.driverPhone}`);
                              });
                            }}
                          >
                            <Ionicons name="call" size={14} color="#0A84FF" />
                            <Text style={styles.bookingCallSmallBtnText}>{t('callDriver')}</Text>
                          </Pressable>
                        ) : null}

                        {b.status === 'COMPLETED' && (
                          <Pressable
                            style={styles.bookingRateSmallBtn}
                            onPress={() => {
                              setRatingTarget({
                                bookingId: b.id,
                                driverName: b.driverName,
                                vehiclePlate: b.vehiclePlate,
                              });
                              setRatingModalVisible(true);
                            }}
                          >
                            <Ionicons name="star" size={13} color="#FF9500" />
                            <Text style={styles.bookingRateSmallBtnText}>Givim Mak</Text>
                          </Pressable>
                        )}

                        {b.status === 'REQUESTED' && (
                          <Pressable
                            style={styles.bookingCancelSmallBtn}
                            onPress={() => handleCancelBooking(b.id)}
                          >
                            <Text style={styles.bookingCancelSmallBtnText}>{t('cancel')}</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= NEW FEATURE MODALS ================= */}
      <LanguageSelectorModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />

      <EmergencySosModal
        visible={sosModalVisible}
        onClose={() => setSosModalVisible(false)}
        activeVehiclePlate={selectedTrip?.vehiclePlate || selectedService?.vehiclePlate}
        activeDriverName={selectedTrip?.driverName || selectedService?.driverName}
        activeRoute={selectedTrip ? `${selectedTrip.origin} → ${selectedTrip.destination}` : undefined}
        passengerName={`${user?.firstName || 'Pasenja'} ${user?.lastName || ''}`.trim()}
      />

      <ReportIncidentModal
        visible={incidentModalVisible}
        onClose={() => setIncidentModalVisible(false)}
        defaultVehiclePlate={selectedTrip?.vehiclePlate || selectedService?.vehiclePlate}
        defaultDriverName={selectedTrip?.driverName || selectedService?.driverName}
      />

      <RegulatedZoneGuideModal
        visible={zoneGuideModalVisible}
        onClose={() => setZoneGuideModalVisible(false)}
        onSelectZone={(preset) => {
          setBookingPickup(preset);
        }}
      />

      {ratingTarget && (
        <DriverRatingModal
          visible={ratingModalVisible}
          onClose={() => {
            setRatingModalVisible(false);
            setRatingTarget(null);
          }}
          bookingId={ratingTarget.bookingId}
          driverName={ratingTarget.driverName}
          vehiclePlate={ratingTarget.vehiclePlate}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },

  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  hello: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: '#1C1C1E', marginTop: 2 },
  langSelectorBtn: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  langSelectorBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  sosHeaderBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sosHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  quickUtilityBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  utilityActionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  utilityActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  offlineNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    borderWidth: 1,
    borderColor: '#FFD1D1',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  offlineNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#C92A2A',
    fontWeight: '600',
    lineHeight: 16,
  },
  zoneHintCard: {
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#C3E6D3',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  zoneHintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  zoneBadge: {
    backgroundColor: '#167D5A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  zoneBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  zoneInfoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoneInfoLinkText: {
    color: '#167D5A',
    fontSize: 12,
    fontWeight: '700',
  },
  zoneHintName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 2,
  },
  zoneHintDesc: {
    fontSize: 11,
    color: '#48484A',
    marginTop: 2,
  },
  smsFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5EE',
    borderWidth: 1.5,
    borderColor: '#167D5A',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  smsFallbackBtnText: {
    color: '#167D5A',
    fontSize: 14,
    fontWeight: '700',
  },
  bookingRateSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  bookingRateSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B78103',
  },
  driverRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
    marginLeft: 6,
  },
  driverRatingPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B78103',
  },
  vanuatuTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  vanuatuTagText: { fontSize: 13, fontWeight: '600' },

  heroBanner: {
    backgroundColor: '#F0F6FF',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#D0E3FF',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  liveIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0A84FF',
    letterSpacing: 0.5,
  },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
  heroSubtitle: { fontSize: 12, color: '#636366', marginTop: 3 },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1C1C1E' },

  categoryScroll: { marginBottom: 18 },
  categoryPills: { gap: 8 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  categoryPillActive: {
    backgroundColor: '#0A84FF',
  },
  categoryPillText: { fontSize: 13, fontWeight: '600', color: '#636366' },
  categoryPillTextActive: { color: '#FFFFFF', fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1C1C1E' },
  sectionSubtitle: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  countBadge: {
    backgroundColor: '#EAF3FF',
    color: '#0A84FF',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  availableServicesSection: { marginBottom: 22 },
  noAvailableServices: {
    color: '#71717A',
    fontSize: 13,
    paddingVertical: 12,
  },
  availableServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DCE7E2',
    borderRadius: 8,
    backgroundColor: '#F6FAF8',
  },
  availableServiceDetails: { flex: 1, gap: 3 },
  availableServiceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  availableServiceName: { color: '#1C1C1E', fontSize: 14, fontWeight: '700' },
  availableServiceMeta: { color: '#52525B', fontSize: 12 },
  availableServiceFare: { color: '#167D5A', fontSize: 12, fontWeight: '700' },
  availableServiceActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceCallButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7C9B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBookButton: {
    minWidth: 58,
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#167D5A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBookButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  emptyCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
    marginTop: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  emptyText: { fontSize: 13, color: '#8E8E93', textAlign: 'center' },

  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleTypeBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vehicleTypeTitle: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },
  statusIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusIndicatorBadgeActive: { backgroundColor: '#E8F8EE' },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8E8E93' },
  statusDotSmallActive: { backgroundColor: '#34C759' },
  statusIndicatorText: { fontSize: 10, fontWeight: '800', color: '#8E8E93' },
  statusIndicatorTextActive: { color: '#34C759' },

  routeBox: {
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  routeItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotStart: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0A84FF' },
  dotEnd: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#34C759' },
  stopLabel: { fontSize: 9, fontWeight: '700', color: '#8E8E93' },
  stopName: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginTop: 1 },
  stopTime: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },
  routeLineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    marginVertical: 4,
    gap: 8,
  },
  routeConnectorLine: { width: 2, height: 18, backgroundColor: '#D1D1D6' },
  movingVehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  movingVehicleText: { fontSize: 10, fontWeight: '700', color: '#0A84FF' },
  routeDurationText: { fontSize: 10, color: '#8E8E93' },

  tripCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitial: { fontSize: 14, fontWeight: '700', color: '#0A84FF' },
  driverVerifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  driverNameText: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },
  seatAvailabilityText: { fontSize: 11, color: '#34C759', fontWeight: '600', marginTop: 1 },

  fareContainer: { alignItems: 'flex-end' },
  fareNumber: { fontSize: 16, fontWeight: '800', color: '#0A84FF' },
  fareUnit: { fontSize: 11, fontWeight: '600', color: '#8E8E93' },
  trackArrivalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  trackArrivalPillText: { fontSize: 11, fontWeight: '700', color: '#0A84FF' },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sheetLiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sheetLiveText: { fontSize: 10, fontWeight: '800', color: '#34C759' },
  sheetRouteTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: { marginBottom: 10 },

  etaHeroCard: {
    backgroundColor: '#EAF3FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  etaIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaLabel: { fontSize: 10, fontWeight: '800', color: '#0A84FF', letterSpacing: 0.5 },
  etaTimeText: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginTop: 2 },
  etaStatusSub: { fontSize: 12, color: '#636366', marginTop: 2 },

  stopsSection: {
    backgroundColor: '#F9F9FB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  stopsSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },
  timelineContainer: { paddingLeft: 4 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineIconCol: { alignItems: 'center', width: 20 },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D1D1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotPassed: { backgroundColor: '#34C759' },
  timelineDotCurrent: {
    backgroundColor: '#0A84FF',
    borderWidth: 2,
    borderColor: '#EAF3FF',
  },
  innerPulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  timelineBar: { width: 2, height: 36, backgroundColor: '#E5E5EA' },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopItemName: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  stopItemNameCurrent: { color: '#0A84FF', fontWeight: '700' },
  stopEstimatedTime: { fontSize: 12, fontWeight: '700', color: '#8E8E93' },
  stopStatusSub: { fontSize: 11, color: '#8E8E93', marginTop: 2 },

  driverProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  driverProfileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverProfileInitial: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  driverProfileName: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  driverProfileVehicle: { fontSize: 12, color: '#636366', marginTop: 2 },
  driverProfilePhone: { fontSize: 12, color: '#0A84FF', marginTop: 2 },
  fareTagBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  fareTagNumber: { fontSize: 16, fontWeight: '800', color: '#0A84FF' },
  fareTagCurrency: { fontSize: 10, fontWeight: '700', color: '#8E8E93' },

  seatsMeterCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  seatsMeterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seatsMeterTitle: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  seatsMeterCount: { fontSize: 12, fontWeight: '700', color: '#34C759' },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },

  sheetActions: { gap: 10, marginBottom: 16 },
  bookButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  bookButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  callButton: {
    backgroundColor: '#EAF3FF',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callButtonText: { color: '#0A84FF', fontSize: 14, fontWeight: '700' },

  /* ================= BOOKINGS & ACTIONS STYLES ================= */
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myBookingsBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7E0FF',
  },
  myBookingsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A84FF',
  },
  activePillBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  activePillBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  bookDirectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bookDirectPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bookingSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: 36,
    paddingTop: 12,
    maxHeight: '90%',
  },
  myBookingsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    maxHeight: '92%',
  },
  sheetHeaderCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF9500',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bookingInputGroup: {
    marginBottom: 14,
  },
  bookingInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  bookingTextInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  presetChip: {
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A84FF',
  },
  fareSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  fareSummaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  fareSummaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    marginTop: 2,
  },
  cashNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cashNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  confirmBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBookingBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyBookingsCard: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyBookingsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyBookingsText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  bookingHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bookingHistoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingTypeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1C1E',
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
  bookingStatusCancelled: { backgroundColor: '#FFEBEA' },
  bookingStatusText: { fontSize: 10, fontWeight: '800', color: '#8E8E93' },
  bookingStatusTextConfirmed: { color: '#34C759' },
  bookingStatusTextRequested: { color: '#FF9500' },
  bookingRouteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  bookingCargoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF9EE',
    padding: 6,
    borderRadius: 8,
    marginVertical: 4,
  },
  bookingCargoText: {
    fontSize: 12,
    color: '#B36B00',
    fontWeight: '600',
  },
  bookingHistoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  bookingDriverText: { fontSize: 12, color: '#8E8E93' },
  bookingFareText: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', marginTop: 2 },
  bookingActionRow: { flexDirection: 'row', gap: 8 },
  bookingCallSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  bookingCallSmallBtnText: { fontSize: 12, fontWeight: '700', color: '#0A84FF' },
  bookingCancelSmallBtn: {
    backgroundColor: '#FFEBEA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  bookingCancelSmallBtnText: { fontSize: 12, fontWeight: '700', color: '#FF3B30' },
});
