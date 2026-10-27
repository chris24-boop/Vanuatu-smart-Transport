import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  cancelTouristRequestApi,
  confirmTouristQuoteApi,
  createTouristRequestApi,
  getTouristDestinationsApi,
  TouristDestination,
  TouristRequestInput,
  TouristServiceType,
  verifyTouristRequestApi,
  GuestTouristRequest,
} from '@/api/tourist';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';
import { getApiErrorMessage } from '@/utils/apiError';

type TouristForm = Omit<TouristRequestInput, 'travelAt' | 'stops'> & {
  contactEmail: string;
  flightNumber: string;
  cruiseShipName: string;
  specialRequests: string;
  travelDate: string;
  travelTime: string;
  stops: string[];
};

const SERVICE_TYPES: TouristServiceType[] = [
  'AIRPORT_TRANSFER',
  'CRUISE_TRANSFER',
  'POINT_TO_POINT',
  'SIGHTSEEING_TRIP',
  'HALF_DAY_TOUR',
  'FULL_DAY_TOUR',
  'CUSTOM_ITINERARY',
];

const SERVICE_LABELS: Record<TouristServiceType, string> = {
  AIRPORT_TRANSFER: 'Airport transfer',
  CRUISE_TRANSFER: 'Cruise transfer',
  POINT_TO_POINT: 'Point to point',
  SIGHTSEEING_TRIP: 'Sightseeing trip',
  HALF_DAY_TOUR: 'Half-day tour',
  FULL_DAY_TOUR: 'Full-day tour',
  CUSTOM_ITINERARY: 'Custom itinerary',
};

function localDateValue() {
  return new Date(Date.now() + 11 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatVanuatuDateTime(value: string) {
  const date = new Date(new Date(value).getTime() + 11 * 60 * 60 * 1000);
  return `${date.toISOString().slice(0, 10)} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function parseVanuatuDateTime(dateValue: string, timeValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue)) {
    return null;
  }
  const [year, month, day] = dateValue.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }
  const dateTime = new Date(`${dateValue}T${timeValue}:00+11:00`);
  return Number.isFinite(dateTime.getTime()) ? dateTime : null;
}

export default function TouristRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    driverId?: string;
    vehicleId?: string;
    driverName?: string;
    vehicleName?: string;
    serviceType?: string;
    serviceTypes?: string;
    availableFrom?: string;
    availableUntil?: string;
    lookup?: string;
  }>();
  const offeredServiceTypes = (params.serviceTypes ?? '')
    .split(',')
    .filter((serviceType): serviceType is TouristServiceType =>
      SERVICE_TYPES.includes(serviceType as TouristServiceType),
    );
  const availableServiceTypes = offeredServiceTypes.length
    ? offeredServiceTypes
    : SERVICE_TYPES;
  const initialServiceType = availableServiceTypes.includes(
    params.serviceType as TouristServiceType,
  )
    ? (params.serviceType as TouristServiceType)
    : availableServiceTypes[0];
  const [form, setForm] = useState<TouristForm>({
    requesterName: '',
    contactEmail: '',
    contactPhone: '',
    serviceType: initialServiceType,
    pickupLocation: '',
    travelDate: localDateValue(),
    travelTime: '09:00',
    passengerCount: 1,
    luggageCount: 0,
    flightNumber: '',
    cruiseShipName: '',
    specialRequests: '',
    driverId: params.driverId ?? '',
    vehicleId: params.vehicleId ?? '',
    stops: [],
  });
  const [destinations, setDestinations] = useState<TouristDestination[]>([]);
  const [customStop, setCustomStop] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [reference, setReference] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [createdReference, setCreatedReference] = useState('');
  const [createdAccessToken, setCreatedAccessToken] = useState('');
  const [guestRequest, setGuestRequest] = useState<GuestTouristRequest | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const isLookupMode = params.lookup === '1';

  useEffect(() => {
    getTouristDestinationsApi()
      .then(setDestinations)
      .catch((loadError: unknown) => setError(getApiErrorMessage(loadError)));
  }, []);

  const canSubmit = useMemo(
    () =>
      Boolean(
        form.requesterName.trim() &&
          form.contactPhone.trim() &&
          form.pickupLocation.trim() &&
          form.driverId &&
          form.vehicleId &&
          form.travelDate &&
          form.travelTime,
      ),
    [form],
  );

  function updateForm<K extends keyof TouristForm>(key: K, value: TouristForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitRequest() {
    setError('');
    setNotice('');
    const travelAt = parseVanuatuDateTime(form.travelDate, form.travelTime);
    if (!travelAt) {
      setError('Enter a valid date as YYYY-MM-DD and time as HH:MM in Vanuatu time (for example, 17:00).');
      return;
    }
    if (travelAt.getTime() <= Date.now()) {
      setError('Choose a valid future date and time for your trip.');
      return;
    }
    if (
      params.availableFrom &&
      params.availableUntil &&
      (travelAt < new Date(params.availableFrom) ||
        travelAt > new Date(params.availableUntil))
    ) {
      setError('Choose a travel time within this driver’s published availability in Vanuatu time.');
      return;
    }
    if (
      ['SIGHTSEEING_TRIP', 'HALF_DAY_TOUR', 'FULL_DAY_TOUR', 'CUSTOM_ITINERARY'].includes(form.serviceType) &&
      form.stops.length === 0
    ) {
      setError('Choose at least one destination for a private tour.');
      return;
    }
    if (!canSubmit) {
      setError('Please fill in your name, phone, pickup and travel time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const input: TouristRequestInput = {
        requesterName: form.requesterName.trim(),
        contactPhone: form.contactPhone.trim(),
        serviceType: form.serviceType,
        pickupLocation: form.pickupLocation.trim(),
        travelAt: travelAt.toISOString(),
        passengerCount: form.passengerCount,
        luggageCount: form.luggageCount,
        driverId: form.driverId,
        vehicleId: form.vehicleId,
        stops: form.stops,
      };
      if (form.contactEmail.trim()) input.contactEmail = form.contactEmail.trim();
      if (form.flightNumber.trim()) input.flightNumber = form.flightNumber.trim();
      if (form.cruiseShipName.trim()) input.cruiseShipName = form.cruiseShipName.trim();
      if (form.specialRequests.trim()) input.specialRequests = form.specialRequests.trim();

      const result = await createTouristRequestApi(input);
      setCreatedReference(result.reference);
      setCreatedAccessToken(result.accessToken);
      setReference(result.reference);
      setAccessToken(result.accessToken);
      setNotice(result.notice);
      await refreshRequest(result.reference, result.accessToken);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function refreshRequest(
    requestReference = reference.trim(),
    requestToken = accessToken.trim(),
  ) {
    if (!requestReference || !requestToken) {
      setError('Enter both the reference and the private access code.');
      return;
    }
    setIsLookingUp(true);
    setError('');
    try {
      const result = await verifyTouristRequestApi(requestReference, requestToken);
      setGuestRequest(result);
      setReference(requestReference);
      setAccessToken(requestToken);
    } catch (lookupError) {
      setError(getApiErrorMessage(lookupError));
    } finally {
      setIsLookingUp(false);
    }
  }

  async function confirmQuote(quoteId: string) {
    try {
      const confirmed = await confirmTouristQuoteApi(
        quoteId,
        reference.trim(),
        accessToken.trim(),
      );
      Alert.alert(
        'Tour confirmed',
        `${confirmed.paymentNotice}\n\n${confirmed.amount} ${confirmed.currency}`,
      );
      await refreshRequest();
    } catch (confirmError) {
      setError(getApiErrorMessage(confirmError));
    }
  }

  async function cancelRequest() {
    setIsCancelling(true);
    setError('');
    try {
      await cancelTouristRequestApi(reference.trim(), accessToken.trim());
      setNotice('Your request has been cancelled.');
      await refreshRequest();
    } catch (cancelError) {
      setError(getApiErrorMessage(cancelError));
    } finally {
      setIsCancelling(false);
    }
  }

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
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Ionicons name="arrow-back" size={19} color="#0D705B" />
            <Text style={styles.backText}>Explore services</Text>
          </Pressable>
          <Text style={styles.eyebrow}>
            {isLookupMode ? 'GUEST BOOKING ACCESS' : 'NO ACCOUNT REQUIRED'}
          </Text>
          <Text style={styles.title}>
            {isLookupMode ? 'Check your request' : 'Request a local service'}
          </Text>
          <Text style={styles.subtitle}>
            {isLookupMode
              ? 'Use the reference and private access code you received when you submitted the request.'
              : `${params.driverName ? `Request ${params.driverName}` : 'Send a tour or transfer request'}`}
          </Text>
          {!isLookupMode && params.availableFrom && params.availableUntil ? (
            <View style={styles.driverNotice}>
              <Ionicons name="time-outline" size={19} color="#0D705B" />
              <Text style={styles.driverNoticeText}>
                Driver availability (Vanuatu time): {formatVanuatuDateTime(params.availableFrom)} –{' '}
                {formatVanuatuDateTime(params.availableUntil)}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#A33A34" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {notice ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#0D705B" />
              <Text style={styles.successText}>{notice}</Text>
            </View>
          ) : null}

          {!isLookupMode && !createdReference ? (
            <>
              <View style={styles.card}>
                <Text style={styles.groupTitle}>Your contact details</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor="#82918A"
                  value={form.requesterName}
                  onChangeText={(value) => updateForm('requesterName', value)}
                  autoCapitalize="words"
                  accessibilityLabel="Full name"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone number (include country code)"
                  placeholderTextColor="#82918A"
                  value={form.contactPhone}
                  onChangeText={(value) => updateForm('contactPhone', value)}
                  keyboardType="phone-pad"
                  accessibilityLabel="Phone number"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email (optional)"
                  placeholderTextColor="#82918A"
                  value={form.contactEmail}
                  onChangeText={(value) => updateForm('contactEmail', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accessibilityLabel="Email address"
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.groupTitle}>Trip details</Text>
                <Text style={styles.fieldLabel}>Service type</Text>
                <View style={styles.serviceList}>
                  {availableServiceTypes.map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => updateForm('serviceType', type)}
                      style={[
                        styles.serviceChip,
                        form.serviceType === type && styles.serviceChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.serviceChipText,
                          form.serviceType === type && styles.serviceChipTextSelected,
                        ]}
                      >
                        {SERVICE_LABELS[type]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Pickup location (for example, Bauerfield Airport)"
                  placeholderTextColor="#82918A"
                  value={form.pickupLocation}
                  onChangeText={(value) => updateForm('pickupLocation', value)}
                  accessibilityLabel="Pickup location"
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Date YYYY-MM-DD (Vanuatu)"
                    placeholderTextColor="#82918A"
                    value={form.travelDate}
                    onChangeText={(value) => updateForm('travelDate', value)}
                    accessibilityLabel="Travel date"
                  />
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Time HH:MM (Vanuatu)"
                    placeholderTextColor="#82918A"
                    value={form.travelTime}
                    onChangeText={(value) => updateForm('travelTime', value)}
                    accessibilityLabel="Travel time"
                  />
                </View>
                <View style={styles.row}>
                  <View style={styles.counter}>
                    <Text style={styles.fieldLabel}>Passengers</Text>
                    <View style={styles.counterControls}>
                      <Pressable
                        onPress={() =>
                          updateForm('passengerCount', Math.max(1, form.passengerCount - 1))
                        }
                        style={styles.counterButton}
                      >
                        <Ionicons name="remove" size={18} color="#0D705B" />
                      </Pressable>
                      <Text style={styles.counterValue}>{form.passengerCount}</Text>
                      <Pressable
                        onPress={() => updateForm('passengerCount', form.passengerCount + 1)}
                        disabled={form.passengerCount >= 30}
                        style={styles.counterButton}
                      >
                        <Ionicons name="add" size={18} color="#0D705B" />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.counter}>
                    <Text style={styles.fieldLabel}>Bags</Text>
                    <View style={styles.counterControls}>
                      <Pressable
                        onPress={() =>
                          updateForm('luggageCount', Math.max(0, form.luggageCount - 1))
                        }
                        style={styles.counterButton}
                      >
                        <Ionicons name="remove" size={18} color="#0D705B" />
                      </Pressable>
                      <Text style={styles.counterValue}>{form.luggageCount}</Text>
                      <Pressable
                        onPress={() => updateForm('luggageCount', form.luggageCount + 1)}
                        disabled={form.luggageCount >= 40}
                        style={styles.counterButton}
                      >
                        <Ionicons name="add" size={18} color="#0D705B" />
                      </Pressable>
                    </View>
                  </View>
                </View>
                {form.serviceType === 'AIRPORT_TRANSFER' ? (
                  <TextInput
                    style={styles.input}
                    placeholder="Flight number (optional)"
                    placeholderTextColor="#82918A"
                    value={form.flightNumber}
                    onChangeText={(value) => updateForm('flightNumber', value)}
                  />
                ) : null}
                {form.serviceType === 'CRUISE_TRANSFER' ? (
                  <TextInput
                    style={styles.input}
                    placeholder="Cruise ship name (optional)"
                    placeholderTextColor="#82918A"
                    value={form.cruiseShipName}
                    onChangeText={(value) => updateForm('cruiseShipName', value)}
                  />
                ) : null}
                <Text style={styles.fieldLabel}>Stops / destinations (optional)</Text>
                <View style={styles.destinationList}>
                  {destinations.map((destination) => {
                    const selected = form.stops.includes(destination.name);
                    return (
                      <Pressable
                        key={destination.id}
                        onPress={() =>
                          updateForm(
                            'stops',
                            selected
                              ? form.stops.filter((stop) => stop !== destination.name)
                              : [...form.stops, destination.name],
                          )
                        }
                        style={[styles.destinationChip, selected && styles.destinationSelected]}
                      >
                        <Text
                          style={[
                            styles.destinationText,
                            selected && styles.destinationSelectedText,
                          ]}
                        >
                          {destination.name} · {destination.island}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Add another stop"
                    placeholderTextColor="#82918A"
                    value={customStop}
                    onChangeText={setCustomStop}
                  />
                  <Pressable
                    disabled={
                      !customStop.trim() ||
                      form.stops.includes(customStop.trim()) ||
                      form.stops.length >= 12
                    }
                    onPress={() => {
                      updateForm('stops', [...form.stops, customStop.trim()]);
                      setCustomStop('');
                    }}
                    style={[
                      styles.addStopButton,
                      (!customStop.trim() ||
                        form.stops.includes(customStop.trim()) ||
                        form.stops.length >= 12) &&
                        styles.disabledButton,
                    ]}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
                {form.stops.length ? (
                  <View style={styles.destinationList}>
                    {form.stops.map((stop) => (
                      <Pressable
                        key={stop}
                        onPress={() => updateForm('stops', form.stops.filter((item) => item !== stop))}
                        style={[styles.destinationChip, styles.destinationSelected]}
                      >
                        <Text style={[styles.destinationText, styles.destinationSelectedText]}>
                          {stop}  ×
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Special requests or accessibility needs (optional)"
                  placeholderTextColor="#82918A"
                  value={form.specialRequests}
                  onChangeText={(value) => updateForm('specialRequests', value)}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {params.driverName ? (
                <View style={styles.driverNotice}>
                  <Ionicons name="person-circle-outline" size={20} color="#0D705B" />
                  <Text style={styles.driverNoticeText}>
                    {params.driverName}
                    {params.vehicleName ? ` · ${params.vehicleName}` : ''}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void submitRequest()}
                disabled={!canSubmit || isSubmitting}
                style={[styles.primaryButton, (!canSubmit || isSubmitting) && styles.disabledButton]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Send request</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
              <Text style={styles.disclaimer}>
                Submitting is a request, not a confirmed booking. Review the driver’s quote
                before accepting; payment is arranged directly as shown in the quote.
              </Text>
            </>
          ) : null}

          {createdReference ? (
            <View style={styles.card}>
              <View style={styles.successHeading}>
                <Ionicons name="shield-checkmark-outline" size={23} color="#0D705B" />
                <Text style={styles.groupTitle}>Keep your secure access details</Text>
              </View>
              <Text style={styles.securityNote}>
                This private code is shown only once. Save it with your reference to check
                quotes later. Anyone with both can view this request.
              </Text>
              <Text style={styles.codeLabel}>REFERENCE</Text>
              <Text selectable style={styles.codeValue}>{createdReference}</Text>
              <Text style={styles.codeLabel}>PRIVATE ACCESS CODE</Text>
              <Text selectable style={styles.codeValue}>{createdAccessToken}</Text>
              <Pressable
                onPress={() => void refreshRequest(createdReference, createdAccessToken)}
                style={styles.secondaryButton}
              >
                {isLookingUp ? (
                  <ActivityIndicator color="#0D705B" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Refresh request status</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {isLookupMode && !guestRequest ? (
            <View style={styles.card}>
              <Text style={styles.groupTitle}>Secure guest lookup</Text>
              <TextInput
                style={styles.input}
                placeholder="Request reference"
                placeholderTextColor="#82918A"
                value={reference}
                onChangeText={setReference}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.input}
                placeholder="Private access code"
                placeholderTextColor="#82918A"
                value={accessToken}
                onChangeText={setAccessToken}
                autoCapitalize="none"
                secureTextEntry
              />
              <Pressable
                onPress={() => void refreshRequest()}
                disabled={isLookingUp}
                style={styles.primaryButton}
              >
                {isLookingUp ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>View my request</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {guestRequest ? (
            <View style={styles.card}>
              <View style={styles.statusHeader}>
                <View>
                  <Text style={styles.groupTitle}>Request {guestRequest.reference}</Text>
                  <Text style={styles.requestMeta}>
                    {SERVICE_LABELS[guestRequest.serviceType]} ·{' '}
                    {new Date(guestRequest.travelAt).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.statusPill}>
                  {guestRequest.status.replaceAll('_', ' ')}
                </Text>
              </View>
              <Text style={styles.requestMeta}>Pickup: {guestRequest.pickupLocation}</Text>
              <Text style={styles.requestMeta}>
                {guestRequest.passengerCount} passengers · {guestRequest.luggageCount} bags
              </Text>
              {guestRequest.stops.map((stop, index) => (
                <Text key={`${stop}-${index}`} style={styles.requestMeta}>
                  Stop {index + 1}: {stop}
                </Text>
              ))}
              {guestRequest.quotes.length === 0 ? (
                <Text style={styles.waitingText}>
                  No quote yet. Your selected driver has not sent a quote. Check again later.
                </Text>
              ) : (
                guestRequest.quotes.map((quote) => (
                  <View key={quote.id} style={styles.quoteCard}>
                    <Text style={styles.quoteTitle}>
                      {quote.driverName ?? 'Driver'} · {quote.vehicleName ?? 'Vehicle'}
                    </Text>
                    <Text style={styles.quoteAmount}>
                      {quote.amount} {quote.currency}
                    </Text>
                    <Text style={styles.requestMeta}>
                      Estimated duration: {quote.durationHours} hours
                    </Text>
                    {quote.includedServices.length ? (
                      <Text style={styles.requestMeta}>
                        Included: {quote.includedServices.join(', ')}
                      </Text>
                    ) : null}
                    {quote.excludedServices.length ? (
                      <Text style={styles.requestMeta}>
                        Not included: {quote.excludedServices.join(', ')}
                      </Text>
                    ) : null}
                    {quote.waitingTerms ? (
                      <Text style={styles.requestMeta}>Waiting: {quote.waitingTerms}</Text>
                    ) : null}
                    {quote.cancellationTerms ? (
                      <Text style={styles.requestMeta}>
                        Cancellation: {quote.cancellationTerms}
                      </Text>
                    ) : null}
                    <Text style={styles.expiresText}>
                      Quote expires {new Date(quote.expiresAt).toLocaleString()}
                    </Text>
                    {guestRequest.booking ? (
                      <Text style={styles.confirmedText}>
                        Booking {guestRequest.booking.status.replaceAll('_', ' ')} · Payment{' '}
                        {guestRequest.booking.paymentStatus.replaceAll('_', ' ')}
                      </Text>
                    ) : (
                      <Pressable
                        onPress={() =>
                          Alert.alert(
                            'Confirm this quote?',
                            `Confirm ${quote.amount} ${quote.currency}? Your trip will be booked and payment is handled as stated in the quote.`,
                            [
                              { text: 'Review later', style: 'cancel' },
                              { text: 'Confirm quote', onPress: () => void confirmQuote(quote.id) },
                            ],
                          )
                        }
                        style={styles.confirmButton}
                      >
                        <Text style={styles.confirmButtonText}>Accept and confirm quote</Text>
                      </Pressable>
                    )}
                  </View>
                ))
              )}
              {!guestRequest.booking &&
              (guestRequest.status === 'REQUESTED' || guestRequest.status === 'QUOTED') ? (
                <Pressable
                  disabled={isCancelling || isLookingUp}
                  onPress={() =>
                    Alert.alert(
                      'Cancel this request?',
                      'The driver will no longer be able to quote on this request.',
                      [
                        { text: 'Keep request', style: 'cancel' },
                        {
                          text: 'Cancel request',
                          style: 'destructive',
                          onPress: () => void cancelRequest(),
                        },
                      ],
                    )
                  }
                  style={[
                    styles.cancelButton,
                    (isCancelling || isLookingUp) && styles.disabledButton,
                  ]}
                >
                  {isCancelling ? (
                    <ActivityIndicator color="#A33A34" />
                  ) : (
                    <Text style={styles.cancelButtonText}>Cancel request</Text>
                  )}
                </Pressable>
              ) : null}
              <Pressable
                disabled={isLookingUp || isCancelling}
                onPress={() => void refreshRequest()}
                style={styles.secondaryButton}
              >
                {isLookingUp ? (
                  <ActivityIndicator color="#0D705B" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Refresh request and quotes</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  card: {
    marginTop: 13,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1EAE5',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  groupTitle: { color: '#173D33', fontSize: 16, fontWeight: '700' },
  input: {
    minHeight: 48,
    marginTop: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#DCE7E1',
    borderRadius: 11,
    backgroundColor: '#FBFDFC',
    color: '#173D33',
    fontSize: 14,
  },
  multiline: { minHeight: 82, marginTop: 14 },
  fieldLabel: { marginTop: 14, marginBottom: 8, color: '#52675F', fontSize: 12, fontWeight: '600' },
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
  row: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1, minWidth: 0 },
  addStopButton: {
    width: 46,
    minHeight: 45,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: 9,
    borderRadius: 10,
    backgroundColor: '#0D705B',
  },
  counter: { flex: 1 },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 5,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DCE7E1',
  },
  counterButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#E7F4EE',
  },
  counterValue: { color: '#173D33', fontWeight: '700' },
  destinationList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  destinationChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D5E4DC',
    backgroundColor: '#FFFFFF',
  },
  destinationSelected: { backgroundColor: '#DDF1E9', borderColor: '#0D705B' },
  destinationText: { color: '#52675F', fontSize: 11 },
  destinationSelectedText: { color: '#0D705B', fontWeight: '700' },
  driverNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 13,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#E7F4EE',
  },
  driverNoticeText: { color: '#173D33', fontWeight: '600' },
  primaryButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: '#0D705B',
  },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  disclaimer: { marginTop: 10, color: '#687871', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 11,
    backgroundColor: '#FDEDEC',
  },
  errorText: { flex: 1, color: '#8D302A', fontSize: 13, lineHeight: 19 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 11,
    backgroundColor: '#E7F4EE',
  },
  successText: { flex: 1, color: '#245847', fontSize: 13, lineHeight: 19 },
  successHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  securityNote: { marginTop: 9, color: '#687871', fontSize: 12, lineHeight: 18 },
  codeLabel: { marginTop: 15, color: '#687871', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  codeValue: { marginTop: 3, color: '#173D33', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#0D705B',
  },
  secondaryButtonText: { color: '#0D705B', fontWeight: '700' },
  cancelButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
    padding: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#A33A34',
  },
  cancelButtonText: { color: '#A33A34', fontWeight: '700' },
  statusHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  statusPill: {
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#E7F4EE',
    color: '#0D705B',
    fontSize: 10,
    fontWeight: '800',
  },
  requestMeta: { marginTop: 7, color: '#687871', fontSize: 12, lineHeight: 18 },
  waitingText: { marginTop: 17, color: '#687871', fontSize: 13, lineHeight: 19 },
  quoteCard: { marginTop: 14, padding: 13, borderRadius: 12, backgroundColor: '#F5FAF7' },
  quoteTitle: { color: '#173D33', fontSize: 14, fontWeight: '700' },
  quoteAmount: { marginTop: 8, color: '#0D705B', fontSize: 22, fontWeight: '800' },
  expiresText: { marginTop: 8, color: '#8A6417', fontSize: 11 },
  confirmedText: { marginTop: 12, color: '#0D705B', fontWeight: '700' },
  confirmButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#0D705B',
  },
  confirmButtonText: { color: '#FFFFFF', fontWeight: '700' },
});
