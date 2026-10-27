import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  applyForTouristServiceApi,
  createTouristDestinationApi,
  createTouristQuoteApi,
  declineTouristRequestApi,
  getAdminTouristDestinationsApi,
  getTouristDriverApplicationApi,
  getTouristDriverBookingsApi,
  getTouristDriverRequestsApi,
  recordTouristCashPaymentApi,
  TouristDriverApplication,
  TouristDriverBooking,
  TouristDriverRequest,
  TouristServiceType,
  updateTouristDestinationApi,
  updateTouristBookingStatusApi,
} from '@/api/tourist';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/utils/apiError';

const TOURIST_SERVICE_OPTIONS: { type: TouristServiceType; label: string }[] = [
  { type: 'AIRPORT_TRANSFER', label: 'Airport transfer' },
  { type: 'CRUISE_TRANSFER', label: 'Cruise-terminal transfer' },
  { type: 'POINT_TO_POINT', label: 'Point-to-point transport' },
  { type: 'SIGHTSEEING_TRIP', label: 'Sightseeing trip' },
  { type: 'HALF_DAY_TOUR', label: 'Half-day tour' },
  { type: 'FULL_DAY_TOUR', label: 'Full-day tour' },
  { type: 'CUSTOM_ITINERARY', label: 'Custom itinerary' },
];

function defaultAvailabilityDate() {
  const date = new Date(Date.now() + 11 * 60 * 60 * 1000);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function formatVanuatuDateTime(value: Date) {
  const vanuatuDate = new Date(value.getTime() + 11 * 60 * 60 * 1000);
  return {
    date: vanuatuDate.toISOString().slice(0, 10),
    time: `${String(vanuatuDate.getUTCHours()).padStart(2, '0')}:${String(vanuatuDate.getUTCMinutes()).padStart(2, '0')}`,
  };
}

export default function TouristManagementScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [driverData, setDriverData] = useState<TouristDriverApplication | null>(null);
  const [requests, setRequests] = useState<TouristDriverRequest[]>([]);
  const [bookings, setBookings] = useState<TouristDriverBooking[]>([]);
  const [adminDestinations, setAdminDestinations] = useState<
    (import('@/api/tourist').TouristDestination & { active: boolean })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [serviceArea, setServiceArea] = useState(user?.island ?? 'Port Vila');
  const [languageText, setLanguageText] = useState('English, Bislama');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [vehicleCapacities, setVehicleCapacities] = useState<
    Record<string, { passengers: string; luggage: string }>
  >({});
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<TouristServiceType[]>([
    'AIRPORT_TRANSFER',
    'CRUISE_TRANSFER',
    'POINT_TO_POINT',
    'SIGHTSEEING_TRIP',
    'HALF_DAY_TOUR',
    'FULL_DAY_TOUR',
    'CUSTOM_ITINERARY',
  ]);
  const [pricingDescription, setPricingDescription] = useState('');
  const [availabilityStartDate, setAvailabilityStartDate] = useState(defaultAvailabilityDate());
  const [availabilityStartTime, setAvailabilityStartTime] = useState('08:00');
  const [availabilityEndDate, setAvailabilityEndDate] = useState(defaultAvailabilityDate());
  const [availabilityEndTime, setAvailabilityEndTime] = useState('18:00');
  const [newDestination, setNewDestination] = useState({ name: '', island: 'Efate' });
  const [destinationDescription, setDestinationDescription] = useState('');

  const loadDriver = useCallback(async () => {
    const application = await getTouristDriverApplicationApi();
    setDriverData(application);
    setServiceArea(application.profile?.serviceArea ?? user?.island ?? 'Port Vila');
    setLanguageText(application.profile?.languages.join(', ') ?? 'English, Bislama');
    const availableVehicleIds = application.vehicles.map((vehicle) => vehicle.id);
    const savedVehicleIds = (application.profile?.vehicleIds ?? []).filter((id) =>
      availableVehicleIds.includes(id),
    );
    setSelectedVehicles(
      savedVehicleIds.length > 0
        ? savedVehicleIds
        : application.vehicles.length === 1
          ? [application.vehicles[0].id]
          : [],
    );
    setVehicleCapacities(
      Object.fromEntries(
        application.vehicles.map((vehicle) => [
          vehicle.id,
          {
            passengers: String(vehicle.touristCapacity ?? vehicle.capacity ?? 1),
            luggage: String(vehicle.luggageCapacity ?? 0),
          },
        ]),
      ),
    );
    setSelectedServiceTypes(
      application.profile?.serviceTypes ?? [
        'AIRPORT_TRANSFER',
        'CRUISE_TRANSFER',
        'POINT_TO_POINT',
        'SIGHTSEEING_TRIP',
        'HALF_DAY_TOUR',
        'FULL_DAY_TOUR',
        'CUSTOM_ITINERARY',
      ],
    );
    setPricingDescription(application.profile?.pricingDescription ?? '');
    if (application.profile?.availableFrom && application.profile.availableUntil) {
      const start = new Date(application.profile.availableFrom);
      const end = new Date(application.profile.availableUntil);
      const startVanuatu = formatVanuatuDateTime(start);
      const endVanuatu = formatVanuatuDateTime(end);
      setAvailabilityStartDate(startVanuatu.date);
      setAvailabilityStartTime(startVanuatu.time);
      setAvailabilityEndDate(endVanuatu.date);
      setAvailabilityEndTime(endVanuatu.time);
    }
    if (application.profile?.enabled) {
      const [incoming, activeBookings] = await Promise.all([
        getTouristDriverRequestsApi(),
        getTouristDriverBookingsApi(),
      ]);
      setRequests(incoming);
      setBookings(activeBookings);
    } else {
      setRequests([]);
      setBookings([]);
    }
  }, [user?.island]);

  const loadAdmin = useCallback(async () => {
    const destinations = await getAdminTouristDestinationsApi();
    setAdminDestinations(destinations);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    if (!user) {
      setError('Sign in with a driver or administrator account to manage tourist services.');
      setIsLoading(false);
      return;
    }
    try {
      if (isAdmin) await loadAdmin();
      else await loadDriver();
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, loadAdmin, loadDriver, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function toggleVehicle(vehicleId: string) {
    setSelectedVehicles((current) =>
      current.includes(vehicleId)
        ? current.filter((id) => id !== vehicleId)
        : [...current, vehicleId],
    );
  }

  function toggleServiceType(serviceType: TouristServiceType) {
    setSelectedServiceTypes((current) =>
      current.includes(serviceType)
        ? current.filter((item) => item !== serviceType)
        : [...current, serviceType],
    );
  }

  async function submitApplication() {
    const availableFrom = new Date(
      `${availabilityStartDate}T${availabilityStartTime}:00+11:00`,
    );
    const availableUntil = new Date(
      `${availabilityEndDate}T${availabilityEndTime}:00+11:00`,
    );
    if (
      !Number.isFinite(availableFrom.getTime()) ||
      !Number.isFinite(availableUntil.getTime()) ||
      availableFrom <= new Date() ||
      availableUntil <= availableFrom
    ) {
      setError('Set a future availability window with the end after the start.');
      return;
    }
    const capacities = selectedVehicles.map((vehicleId) => ({
      vehicleId,
      passengerCapacity: Number(vehicleCapacities[vehicleId]?.passengers),
      luggageCapacity: Number(vehicleCapacities[vehicleId]?.luggage),
    }));
    if (!selectedVehicles.length) {
      setError('Select at least one registered vehicle for your tourist listing.');
      return;
    }
    if (!selectedServiceTypes.length) {
      setError('Choose at least one tourist transport option.');
      return;
    }
    const invalidCapacity = capacities.find((capacity) => {
      const vehicle = driverData?.vehicles.find((item) => item.id === capacity.vehicleId);
      return (
        !Number.isInteger(capacity.passengerCapacity) ||
        capacity.passengerCapacity < 1 ||
        (vehicle?.capacity !== null &&
          vehicle?.capacity !== undefined &&
          capacity.passengerCapacity > vehicle.capacity) ||
        !Number.isInteger(capacity.luggageCapacity) ||
        capacity.luggageCapacity < 0
      );
    });
    if (invalidCapacity) {
      const vehicle = driverData?.vehicles.find((item) => item.id === invalidCapacity.vehicleId);
      setError(
        vehicle?.capacity
          ? `Enter 1 to ${vehicle.capacity} passenger seats and a valid luggage capacity for each selected vehicle.`
          : 'Enter at least 1 passenger seat and a valid luggage capacity for each selected vehicle.',
      );
      return;
    }
    if (!pricingDescription.trim()) {
      setError('Describe your starting price or pricing method so tourists know what to expect.');
      return;
    }
    if (!languageText.split(',').some((language) => language.trim())) {
      setError('Enter at least one language spoken by the driver.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await applyForTouristServiceApi({
        serviceArea: serviceArea.trim(),
        languages: languageText.split(',').map((item) => item.trim()).filter(Boolean),
        vehicleIds: selectedVehicles,
        vehicleCapacities: capacities,
        serviceTypes: selectedServiceTypes,
        pricingDescription: pricingDescription.trim(),
        availableFrom: availableFrom.toISOString(),
        availableUntil: availableUntil.toISOString(),
      });
      Alert.alert(
        driverData?.profile ? 'Tourist listing updated' : 'Tourist service published',
        driverData?.profile
          ? 'Your updated tourist service details are published.'
          : 'Your tourist service is now published for tourists to browse.',
      );
      await refresh();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
    } finally {
      setIsSaving(false);
    }
  }

  async function addDestination() {
    if (!newDestination.name.trim() || !newDestination.island.trim()) {
      setError('Enter the destination name and island.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await createTouristDestinationApi({
        name: newDestination.name.trim(),
        island: newDestination.island.trim(),
        ...(destinationDescription.trim()
          ? { description: destinationDescription.trim() }
          : {}),
      });
      setNewDestination({ name: '', island: 'Efate' });
      setDestinationDescription('');
      await refresh();
      Alert.alert('Destination added', 'The destination is now available in tourist requests.');
    } catch (destinationError) {
      setError(getApiErrorMessage(destinationError));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleDestination(
    destination: (typeof adminDestinations)[number],
  ) {
    setIsSaving(true);
    setError('');
    try {
      await updateTouristDestinationApi({ ...destination, active: !destination.active });
      await refresh();
    } catch (destinationError) {
      setError(getApiErrorMessage(destinationError));
    } finally {
      setIsSaving(false);
    }
  }

  async function declineRequest(requestId: string) {
    try {
      await declineTouristRequestApi(requestId);
      await refresh();
    } catch (declineError) {
      setError(getApiErrorMessage(declineError));
    }
  }

  async function sendQuote(
    request: TouristDriverRequest,
    amount: string,
    hours: string,
    includedText: string,
    excludedText: string,
  ) {
    const numericAmount = Number(amount);
    const durationHours = Number(hours);
    if (!Number.isFinite(numericAmount) || numericAmount < 1 || !Number.isFinite(durationHours) || durationHours < 0.5) {
      setError('Enter a valid quote amount and duration.');
      return;
    }
    const travelTime = new Date(request.travelAt).getTime();
    const expiresAt = new Date(Math.min(Date.now() + 12 * 60 * 60 * 1000, travelTime - 5 * 60 * 1000));
    if (expiresAt.getTime() <= Date.now()) {
      setError('This trip is too soon to issue a valid quote.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await createTouristQuoteApi(request.id, {
        amount: numericAmount,
        durationHours,
        expiresAt: expiresAt.toISOString(),
        includedServices: includedText.split(',').map((item) => item.trim()).filter(Boolean),
        excludedServices: excludedText.split(',').map((item) => item.trim()).filter(Boolean),
      });
      await refresh();
    } catch (quoteError) {
      setError(getApiErrorMessage(quoteError));
    } finally {
      setIsSaving(false);
    }
  }

  async function updateBooking(booking: TouristDriverBooking) {
    const status = booking.status === 'CONFIRMED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      await updateTouristBookingStatusApi(booking.id, status);
      await refresh();
    } catch (bookingError) {
      setError(getApiErrorMessage(bookingError));
    }
  }

  async function markCashPaid(booking: TouristDriverBooking) {
    try {
      await recordTouristCashPaymentApi(booking.id, 'PAID', Number(booking.amount));
      await refresh();
    } catch (paymentError) {
      setError(getApiErrorMessage(paymentError));
    }
  }

  const driverSettingsForm = driverData ? (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Tourist service details</Text>
      <Text style={styles.bodyText}>
        Enter the dates and hours you can take tourist bookings. Existing normal transport services remain unchanged.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Service area (town or island)"
        placeholderTextColor="#82918A"
        value={serviceArea}
        onChangeText={setServiceArea}
      />
      <TextInput
        style={styles.input}
        placeholder="Languages, separated by commas"
        placeholderTextColor="#82918A"
        value={languageText}
        onChangeText={setLanguageText}
      />
      <Text style={styles.fieldLabel}>Available from (Vanuatu time)</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#82918A"
          value={availabilityStartDate}
          onChangeText={setAvailabilityStartDate}
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="HH:MM"
          placeholderTextColor="#82918A"
          value={availabilityStartTime}
          onChangeText={setAvailabilityStartTime}
        />
      </View>
      <Text style={styles.fieldLabel}>Available until (Vanuatu time)</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#82918A"
          value={availabilityEndDate}
          onChangeText={setAvailabilityEndDate}
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="HH:MM"
          placeholderTextColor="#82918A"
          value={availabilityEndTime}
          onChangeText={setAvailabilityEndTime}
        />
      </View>
      <Text style={styles.fieldLabel}>Transport options</Text>
      <View style={styles.serviceList}>
        {TOURIST_SERVICE_OPTIONS.map((option) => {
          const selected = selectedServiceTypes.includes(option.type);
          return (
            <Pressable
              key={option.type}
              onPress={() => toggleServiceType(option.type)}
              style={[styles.serviceChip, selected && styles.serviceChipSelected]}
            >
              <Text style={[styles.serviceChipText, selected && styles.serviceChipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Pricing (e.g. from 5,000 VUV; final quote depends on route)"
        placeholderTextColor="#82918A"
        value={pricingDescription}
        onChangeText={setPricingDescription}
      />
      <Text style={styles.fieldLabel}>Registered vehicles for this listing</Text>
      <Text style={styles.bodyText}>
        Vehicle type comes from your verified registration. Select each vehicle and enter the seats available to tourists.
      </Text>
      {driverData.vehicles.length === 0 ? (
        <Text style={styles.bodyText}>Add an active vehicle to your driver account first.</Text>
      ) : (
        driverData.vehicles.map((vehicle) => {
          const selected = selectedVehicles.includes(vehicle.id);
          const name = [vehicle.make, vehicle.model].filter(Boolean).join(' ') ||
            vehicle.vehicleType.replaceAll('_', ' ');
          const capacity = vehicleCapacities[vehicle.id] ?? {
            passengers: String(vehicle.touristCapacity ?? vehicle.capacity ?? 1),
            luggage: String(vehicle.luggageCapacity ?? 0),
          };
          return (
            <View key={vehicle.id} style={styles.vehicleSettings}>
              <Pressable onPress={() => toggleVehicle(vehicle.id)} style={styles.vehicleRow}>
                <Ionicons
                  name={selected ? 'checkbox' : 'square-outline'}
                  size={19}
                  color={selected ? '#0D705B' : '#75847D'}
                />
                <View style={styles.vehicleDetails}>
                  <Text style={styles.cardTitle}>{name}</Text>
                  <Text style={styles.bodyText}>
                    {vehicle.vehicleType.replaceAll('_', ' ')}
                    {vehicle.capacity !== null ? ` · ${vehicle.capacity} registered seats` : ''}
                  </Text>
                </View>
              </Pressable>
              <Text style={styles.fieldLabel}>Passenger seats for tourists</Text>
              <Text style={styles.bodyText}>
                {vehicle.capacity !== null
                  ? `Enter the number of passenger seats you are offering (maximum ${vehicle.capacity}).`
                  : 'Enter the number of passenger seats you are offering.'}
              </Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Number of seats"
                  placeholderTextColor="#82918A"
                  value={capacity.passengers}
                  onChangeText={(value) =>
                    setVehicleCapacities((current) => ({
                      ...current,
                      [vehicle.id]: { ...capacity, passengers: value },
                    }))
                  }
                  keyboardType="number-pad"
                  maxLength={3}
                  accessibilityLabel={`${name} number of passenger seats for tourist services`}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Luggage bags"
                  placeholderTextColor="#82918A"
                  value={capacity.luggage}
                  onChangeText={(value) =>
                    setVehicleCapacities((current) => ({
                      ...current,
                      [vehicle.id]: { ...capacity, luggage: value },
                    }))
                  }
                  keyboardType="number-pad"
                  maxLength={3}
                  accessibilityLabel={`${name} tourist luggage capacity`}
                />
              </View>
            </View>
          );
        })
      )}
      {driverData.vehicles.length > 0 && !selectedVehicles.length ? (
        <Text style={styles.bodyText}>Select at least one registered vehicle before publishing.</Text>
      ) : null}
      <Pressable
        disabled={isSaving}
        onPress={() => void submitApplication()}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaving, busy: isSaving }}
        style={[styles.primaryButton, styles.publishButton, isSaving && styles.disabledButton]}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {driverData.profile ? 'Update tourist listing' : 'Publish tourist listing'}
          </Text>
        )}
      </Pressable>
      {error ? (
        <View style={styles.formErrorBox} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={17} color="#A33A34" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {driverData.verificationStatus !== 'VERIFIED' ? (
      <Text style={styles.bodyText}>Driver registration verification is required before publishing.</Text>
      ) : null}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <VanuatuScreenBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backLink}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={19} color="#0D705B" />
            <Text style={styles.backText}>{isAdmin ? 'Admin dashboard' : 'Driver dashboard'}</Text>
          </Pressable>
          <Text style={styles.eyebrow}>TOURIST TRANSPORT</Text>
          <Text style={styles.title}>{isAdmin ? 'Tourist destinations' : 'Tourist services'}</Text>
          <Text style={styles.subtitle}>
            {isAdmin
              ? 'Manage the destination catalog. Driver registration verification is managed separately.'
              : 'Publish your tourist availability, respond to requests and track confirmed trips.'}
          </Text>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#A33A34" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {!user ? (
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Sign in</Text>
            </Pressable>
          ) : null}

          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#0D705B" />
              <Text style={styles.bodyText}>Loading tourist services…</Text>
            </View>
          ) : isAdmin ? (
            <>
              <Text style={styles.bodyText}>
                Driver tourist services are published by verified drivers. Manage driver registration from the admin driver review.
              </Text>
              <SectionTitle title="Manage destinations" />
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  placeholder="Destination name"
                  placeholderTextColor="#82918A"
                  value={newDestination.name}
                  onChangeText={(name) => setNewDestination((current) => ({ ...current, name }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Island"
                  placeholderTextColor="#82918A"
                  value={newDestination.island}
                  onChangeText={(island) => setNewDestination((current) => ({ ...current, island }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Short description (optional)"
                  placeholderTextColor="#82918A"
                  value={destinationDescription}
                  onChangeText={setDestinationDescription}
                />
                <Pressable
                  disabled={isSaving}
                  onPress={() => void addDestination()}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Add destination</Text>
                </Pressable>
                {adminDestinations.map((destination) => (
                  <View key={destination.id} style={styles.destinationRow}>
                    <View style={styles.destinationInfo}>
                      <Text style={styles.cardTitle}>{destination.name}</Text>
                      <Text style={styles.bodyText}>{destination.island}</Text>
                    </View>
                    <Pressable
                      disabled={isSaving}
                      onPress={() => void toggleDestination(destination)}
                      style={[
                        styles.destinationToggle,
                        destination.active ? styles.activeDestination : styles.inactiveDestination,
                      ]}
                    >
                      <Text style={styles.destinationToggleText}>
                        {destination.active ? 'Active' : 'Hidden'}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          ) : driverData ? (
            <>
              {driverData.verificationStatus !== 'VERIFIED' ? (
                <View style={styles.notice}>
                  <Ionicons name="time-outline" size={21} color="#8A6417" />
                  <Text style={styles.noticeText}>
                    Complete driver registration and verification before publishing tourist availability.
                  </Text>
                </View>
              ) : driverData.profile ? (
                <>
                  <View style={styles.statusCard}>
                    <Ionicons name="shield-checkmark-outline" size={22} color="#0D705B" />
                    <View style={styles.statusTextGroup}>
                      <Text style={styles.cardTitle}>
                        {driverData.profile.enabled ? 'Tourist service published' : 'Tourist service paused'}
                      </Text>
                      <Text style={styles.bodyText}>
                        {driverData.profile.serviceArea} · {driverData.profile.languages.join(', ')}
                      </Text>
                    </View>
                    <Pressable onPress={() => void refresh()} accessibilityLabel="Refresh tourist requests">
                      <Ionicons name="refresh" size={20} color="#0D705B" />
                    </Pressable>
                  </View>
                  {driverSettingsForm}
                  <SectionTitle title={`Incoming requests (${requests.length})`} />
                  {requests.length === 0 ? (
                    <EmptyState text="There are no open tourist requests at the moment." />
                  ) : (
                    requests.map((request) => (
                      <IncomingRequestCard
                        key={request.id}
                        request={request}
                        busy={isSaving}
                        onQuote={(amount, hours, included, excluded) =>
                          void sendQuote(request, amount, hours, included, excluded)
                        }
                        onDecline={() => void declineRequest(request.id)}
                      />
                    ))
                  )}

                  <SectionTitle title={`Confirmed tours (${bookings.length})`} />
                  {bookings.length === 0 ? (
                    <EmptyState text="Confirmed tours and outstanding cash payments will appear here." />
                  ) : (
                    bookings.map((booking) => (
                      <View style={styles.card} key={booking.id}>
                        <Text style={styles.cardTitle}>{booking.requesterName}</Text>
                        <Text style={styles.bodyText}>
                          {new Date(booking.startAt).toLocaleString()} · {booking.vehicleName}
                        </Text>
                        <Text style={styles.bodyText}>
                          Pickup: {booking.pickupLocation} · {booking.passengerCount} passengers
                        </Text>
                        <Text style={styles.bodyText}>
                          Contact: {booking.contactPhone} · {booking.amount} {booking.currency}
                        </Text>
                        <Text style={styles.bodyText}>
                          Status: {booking.status.replaceAll('_', ' ')} · Cash: {booking.paymentStatus.replaceAll('_', ' ')}
                        </Text>
                        {booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS' ? (
                          <Pressable
                            onPress={() => void updateBooking(booking)}
                            style={styles.primaryButton}
                          >
                            <Text style={styles.primaryButtonText}>
                              {booking.status === 'CONFIRMED' ? 'Start tour' : 'Mark tour completed'}
                            </Text>
                          </Pressable>
                        ) : null}
                        {booking.paymentStatus !== 'PAID' &&
                        (booking.status === 'IN_PROGRESS' || booking.status === 'COMPLETED') ? (
                          <Pressable
                            onPress={() =>
                              Alert.alert(
                                'Record cash payment',
                                `Confirm that ${booking.amount} ${booking.currency} was collected in cash?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Record payment', onPress: () => void markCashPaid(booking) },
                                ],
                              )
                            }
                            style={styles.secondaryButton}
                          >
                            <Text style={styles.secondaryButtonText}>Record full cash payment</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ))
                  )}
                </>
              ) : (
                <>
                  <View style={styles.notice}>
                    <Ionicons name="information-circle-outline" size={21} color="#8A6417" />
                    <Text style={styles.noticeText}>
                      Set your availability, service options, vehicle capacity, area, languages and pricing. The listing is published when you submit, provided your driver registration is verified.
                    </Text>
                  </View>
                  {driverSettingsForm}
                </>
              )}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name="sunny-outline" size={24} color="#0D705B" />
      <Text style={styles.bodyText}>{text}</Text>
    </View>
  );
}

function IncomingRequestCard({
  request,
  busy,
  onQuote,
  onDecline,
}: {
  request: TouristDriverRequest;
  busy: boolean;
  onQuote: (
    amount: string,
    hours: string,
    included: string,
    excluded: string,
  ) => void;
  onDecline: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [hours, setHours] = useState('2');
  const [included, setIncluded] = useState('');
  const [excluded, setExcluded] = useState('');
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{request.requesterName}</Text>
      <Text style={styles.bodyText}>
        {request.serviceType.replaceAll('_', ' ')} · {new Date(request.travelAt).toLocaleString()}
      </Text>
      <Text style={styles.bodyText}>
        {request.passengerCount} passengers · {request.luggageCount} bags · {request.contactPhone}
      </Text>
      {request.contactEmail ? <Text style={styles.bodyText}>{request.contactEmail}</Text> : null}
      <Text style={styles.bodyText}>Pickup: {request.pickupLocation}</Text>
      {request.flightNumber ? <Text style={styles.bodyText}>Flight: {request.flightNumber}</Text> : null}
      {request.cruiseShipName ? <Text style={styles.bodyText}>Ship: {request.cruiseShipName}</Text> : null}
      {request.stops.map((stop, index) => (
        <Text style={styles.bodyText} key={`${stop}-${index}`}>Stop {index + 1}: {stop}</Text>
      ))}
      {request.specialRequests ? (
        <Text style={styles.specialRequest}>Notes: {request.specialRequests}</Text>
      ) : null}
      <Text style={styles.fieldLabel}>Quote in VUV</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Amount"
          placeholderTextColor="#82918A"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Duration (hours)"
          placeholderTextColor="#82918A"
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Included services (comma-separated)"
        placeholderTextColor="#82918A"
        value={included}
        onChangeText={setIncluded}
      />
      <TextInput
        style={styles.input}
        placeholder="Not included (comma-separated)"
        placeholderTextColor="#82918A"
        value={excluded}
        onChangeText={setExcluded}
      />
      <Pressable
        disabled={busy}
        onPress={() => onQuote(amount, hours, included, excluded)}
        style={[styles.primaryButton, busy && styles.disabledButton]}
      >
        <Text style={styles.primaryButtonText}>Send quote</Text>
      </Pressable>
      {request.status === 'REQUESTED' ? (
        <Pressable disabled={busy} onPress={onDecline} style={styles.rejectButton}>
          <Text style={styles.rejectText}>Decline request</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FBF9' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText: { color: '#0D705B', fontWeight: '600' },
  eyebrow: { color: '#0D705B', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title: { marginTop: 7, color: '#173D33', fontSize: 26, fontWeight: '800' },
  subtitle: { marginTop: 6, marginBottom: 16, color: '#687871', fontSize: 14, lineHeight: 20 },
  sectionTitle: { marginTop: 21, marginBottom: 10, color: '#173D33', fontSize: 17, fontWeight: '700' },
  card: {
    marginTop: 11,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E1EAE5',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  cardTitle: { color: '#173D33', fontSize: 15, fontWeight: '700' },
  bodyText: { marginTop: 5, color: '#687871', fontSize: 12, lineHeight: 18 },
  fieldLabel: { marginTop: 13, marginBottom: 6, color: '#52675F', fontSize: 12, fontWeight: '600' },
  input: {
    minHeight: 45,
    marginTop: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE7E1',
    backgroundColor: '#FBFDFC',
    color: '#173D33',
    fontSize: 13,
  },
  row: { flexDirection: 'row', gap: 9 },
  halfInput: { flex: 1, minWidth: 0 },
  vehicleSettings: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E1EAE5',
  },
  serviceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  serviceChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D5E4DC',
    backgroundColor: '#FFFFFF',
  },
  serviceChipSelected: { backgroundColor: '#0D705B', borderColor: '#0D705B' },
  serviceChipText: { color: '#36554A', fontSize: 11, fontWeight: '600' },
  serviceChipTextSelected: { color: '#FFFFFF' },
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: '#0D705B',
  },
  publishButton: {
    minHeight: 54,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#075A49',
    elevation: 3,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  secondaryButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0D705B',
  },
  secondaryButtonText: { color: '#0D705B', fontWeight: '700' },
  rejectButton: { alignItems: 'center', padding: 11, marginTop: 5 },
  rejectText: { color: '#A33A34', fontSize: 12, fontWeight: '700' },
  disabledButton: { opacity: 0.5 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5 },
  vehicleDetails: { flex: 1 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 13,
    backgroundColor: '#E7F4EE',
  },
  statusTextGroup: { flex: 1 },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1EAE5',
  },
  destinationInfo: { flex: 1 },
  destinationToggle: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12 },
  activeDestination: { backgroundColor: '#E7F4EE' },
  inactiveDestination: { backgroundColor: '#FDEDEC' },
  destinationToggleText: { color: '#36554A', fontSize: 11, fontWeight: '700' },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 13,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#FFF8E7',
  },
  noticeText: { flex: 1, color: '#725C2B', fontSize: 12, lineHeight: 18 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    marginBottom: 10,
    borderRadius: 11,
    backgroundColor: '#FDEDEC',
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    marginTop: 9,
    borderRadius: 10,
    backgroundColor: '#FDEDEC',
  },
  errorText: { flex: 1, color: '#8D302A', fontSize: 13, lineHeight: 19 },
  loading: { alignItems: 'center', gap: 10, padding: 30 },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    padding: 20,
    marginTop: 7,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  specialRequest: { marginTop: 8, color: '#725C2B', fontSize: 12, lineHeight: 18 },
});
