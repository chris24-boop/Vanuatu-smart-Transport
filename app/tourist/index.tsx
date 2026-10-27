import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getTouristDestinationsApi,
  getTouristDriversApi,
  getTouristServicesApi,
  TouristDestination,
  TouristServiceType,
  TouristVehicleService,
} from '@/api/tourist';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';
import { getApiErrorMessage } from '@/utils/apiError';

function formatVanuatuDateTime(value: string) {
  const date = new Date(new Date(value).getTime() + 11 * 60 * 60 * 1000);
  return `${date.toISOString().slice(0, 10)} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

export default function TouristHomeScreen() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<TouristVehicleService[]>([]);
  const [destinations, setDestinations] = useState<TouristDestination[]>([]);
  const [services, setServices] = useState<
    { type: TouristServiceType; label: string }[]
  >([]);
  const [selectedService, setSelectedService] = useState<TouristServiceType | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTouristData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [serviceDrivers, serviceDestinations, serviceTypes] = await Promise.all([
        getTouristDriversApi(),
        getTouristDestinationsApi(),
        getTouristServicesApi(),
      ]);
      setDrivers(serviceDrivers);
      setDestinations(serviceDestinations);
      setServices(serviceTypes);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Unable to load tourist transport services.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTouristData();
  }, [loadTouristData]);

  const visibleDrivers = selectedService
    ? drivers.filter((driver) => driver.serviceTypes.includes(selectedService))
    : drivers;

  return (
    <SafeAreaView style={styles.safe}>
      <VanuatuScreenBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={21} color="#173D33" />
          </Pressable>
          <View style={styles.brandMark}>
            <Ionicons name="compass" size={23} color="#FFFFFF" />
          </View>
          <Text style={styles.eyebrow}>VANUATU SMART TRANSPORT</Text>
          <Text style={styles.title}>Explore Vanuatu</Text>
          <Text style={styles.subtitle}>
            Airport transfers, local drivers and private island tours.
          </Text>
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={20} color="#8A6417" />
          <Text style={styles.noticeText}>
            Prices and availability are confirmed by the driver. Destination access
            and fees may need local confirmation; inter-island connections are arranged separately.
          </Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Choose a service</Text>
          {selectedService ? (
            <Pressable onPress={() => setSelectedService(null)}>
              <Text style={styles.clearFilter}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.serviceList}>
          {services.map((service) => {
            const selected = selectedService === service.type;
            return (
              <Pressable
                key={service.type}
                onPress={() => setSelectedService(selected ? null : service.type)}
                style={[styles.serviceChip, selected && styles.serviceChipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.serviceChipText,
                    selected && styles.serviceChipTextSelected,
                  ]}
                >
                  {service.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Destinations around Vanuatu</Text>
        </View>
        <View style={styles.destinationList}>
          {destinations.map((destination) => (
            <View style={styles.destinationChip} key={destination.id}>
              <Ionicons name="location-outline" size={14} color="#0D705B" />
              <Text style={styles.destinationText}>{destination.name} · {destination.island}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Approved local services</Text>
          <Text style={styles.resultCount}>{visibleDrivers.length}</Text>
        </View>

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#0D705B" />
            <Text style={styles.stateText}>Finding approved local services…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={30} color="#687871" />
            <Text style={styles.stateText}>{error}</Text>
            <Pressable onPress={() => void loadTouristData()} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : visibleDrivers.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="car-outline" size={30} color="#687871" />
            <Text style={styles.stateText}>
              {selectedService
                ? 'No verified drivers currently offer this service. Clear the filter or check again later.'
                : 'No published tourist transport services are available to browse yet. Please check again later.'}
            </Text>
          </View>
        ) : (
          visibleDrivers.map((service) => (
            <View key={service.vehicleId} style={styles.driverCard}>
              <View style={styles.driverIcon}>
                <Ionicons name="car-sport-outline" size={24} color="#0D705B" />
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{service.driverName}</Text>
                <Text style={styles.vehicleName}>
                  {service.vehicleName} · {service.vehicleType.replace('_', ' ')}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="people-outline" size={14} color="#687871" />
                  <Text style={styles.metaText}>
                    Up to {service.passengerCapacity} passengers
                  </Text>
                  {service.luggageCapacity !== null ? (
                    <Text style={styles.metaText}> · {service.luggageCapacity} bags</Text>
                  ) : null}
                </View>
                <Text style={styles.metaText}>
                  {service.serviceArea}
                  {service.languages.length ? ` · ${service.languages.join(', ')}` : ''}
                </Text>
                <Text style={styles.metaText}>
                  Offers: {service.serviceTypes
                    .map((type) => services.find((item) => item.type === type)?.label ?? type)
                    .join(', ')}
                </Text>
                {service.availableFrom && service.availableUntil ? (
                  <Text style={styles.metaText}>
                    Available (Vanuatu time): {formatVanuatuDateTime(service.availableFrom)} –{' '}
                    {formatVanuatuDateTime(service.availableUntil)}
                  </Text>
                ) : null}
                <Text style={styles.quoteNote}>{service.pricing}</Text>
              </View>
              <Pressable
                style={styles.requestButton}
                onPress={() =>
                  router.push({
                    pathname: '/tourist/request',
                    params: {
                      driverId: service.driverId,
                      vehicleId: service.vehicleId,
                      driverName: service.driverName,
                      vehicleName: service.vehicleName,
                      serviceType: selectedService ?? undefined,
                      serviceTypes: service.serviceTypes.join(','),
                      availableFrom: service.availableFrom ?? undefined,
                      availableUntil: service.availableUntil ?? undefined,
                    },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Request ${service.driverName} in ${service.vehicleName}`}
              >
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          ))
        )}

        <Pressable
          onPress={() => router.push('/tourist/request?lookup=1')}
          style={styles.lookupButton}
        >
          <Ionicons name="receipt-outline" size={19} color="#0D705B" />
          <Text style={styles.lookupButtonText}>Check an existing tour request</Text>
          <Ionicons name="chevron-forward" size={18} color="#0D705B" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FBF9' },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 36 },
  header: { alignItems: 'center', paddingTop: 8, paddingBottom: 22 },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 5,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  brandMark: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#0D705B',
    marginBottom: 12,
  },
  eyebrow: { color: '#0D705B', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title: { marginTop: 6, color: '#173D33', fontSize: 28, fontWeight: '800' },
  subtitle: { marginTop: 6, color: '#687871', fontSize: 14, textAlign: 'center' },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 13,
    borderRadius: 13,
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F0DFAF',
  },
  noticeText: { flex: 1, color: '#725C2B', fontSize: 12, lineHeight: 18 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: { color: '#173D33', fontSize: 17, fontWeight: '700' },
  clearFilter: { color: '#0D705B', fontWeight: '600' },
  serviceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D5E4DC',
    backgroundColor: '#FFFFFF',
  },
  serviceChipSelected: { backgroundColor: '#0D705B', borderColor: '#0D705B' },
  serviceChipText: { color: '#36554A', fontSize: 12, fontWeight: '600' },
  serviceChipTextSelected: { color: '#FFFFFF' },
  destinationList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  destinationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  destinationText: { color: '#52675F', fontSize: 11 },
  resultCount: {
    color: '#0D705B',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: '#D9F0E9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  centerState: { alignItems: 'center', paddingVertical: 34, gap: 10 },
  stateCard: {
    alignItems: 'center',
    gap: 10,
    padding: 22,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  stateText: { color: '#687871', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#0D705B',
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1EAE5',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  driverIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#E7F4EE',
  },
  driverInfo: { flex: 1 },
  driverName: { color: '#173D33', fontSize: 15, fontWeight: '700' },
  vehicleName: { marginTop: 3, color: '#52675F', fontSize: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  metaText: { marginTop: 4, color: '#687871', fontSize: 11 },
  quoteNote: { marginTop: 6, color: '#0D705B', fontSize: 11, fontWeight: '600' },
  requestButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#0D705B',
  },
  lookupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 24,
    padding: 14,
    borderRadius: 13,
    backgroundColor: '#E7F4EE',
  },
  lookupButtonText: { flex: 1, color: '#173D33', fontWeight: '600' },
});
