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
import { TripItem, VehicleCategory } from '@/types/transport';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';

export default function AdminTripsScreen() {
  const { trips, fetchTrips, removeTrip } = useTransportStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    void fetchTrips().catch((error) => console.error('Failed to fetch trips:', error));
  }, [fetchTrips]);

  const liveTrips = trips.filter((trip) => trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED');

  const filteredTrips = trips.filter((trip) => {
    if (filterType === 'LIVE' && (trip.status === 'CANCELLED' || trip.status === 'COMPLETED')) {
      return false;
    }
    if (
      filterType !== 'ALL' &&
      filterType !== 'LIVE' &&
      trip.vehicleType !== filterType &&
      !(filterType === 'BUS' && trip.vehicleType === 'MINIBUS')
    ) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrigin = trip.origin.toLowerCase().includes(q);
      const matchDest = trip.destination.toLowerCase().includes(q);
      const matchDriver = trip.driverName.toLowerCase().includes(q);
      const matchPlate = trip.vehiclePlate.toLowerCase().includes(q);
      return matchOrigin || matchDest || matchDriver || matchPlate;
    }

    return true;
  });

  const handleDeleteTrip = (trip: TripItem) => {
    Alert.alert(
      'Delete Trip',
      `Delete trip "${trip.origin} → ${trip.destination}" by ${trip.driverName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTrip(trip.id);
            } catch (error) {
              Alert.alert('Unable to Cancel Trip', error instanceof Error ? error.message : 'Please try again.');
            }
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
          <Text style={styles.title}>System Trip Control</Text>
          <Text style={styles.subtitle}>
            Manage live driver trips across Vanuatu
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Filter by route, driver, or plate..."
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

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterPills}
        >
          <Pressable
            style={[styles.pill, filterType === 'ALL' && styles.pillActive]}
            onPress={() => setFilterType('ALL')}
          >
            <Text style={[styles.pillText, filterType === 'ALL' && styles.pillTextActive]}>
              All Trips ({trips.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.pill, filterType === 'LIVE' && styles.pillActive]}
            onPress={() => setFilterType('LIVE')}
          >
            <Text style={[styles.pillText, filterType === 'LIVE' && styles.pillTextActive]}>
              Live Driver Trips ({liveTrips.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.pill, filterType === 'BUS' && styles.pillActive]}
            onPress={() => setFilterType('BUS')}
          >
            <Text style={[styles.pillText, filterType === 'BUS' && styles.pillTextActive]}>
              Bus
            </Text>
          </Pressable>

          <Pressable
            style={[styles.pill, filterType === 'TAXI' && styles.pillActive]}
            onPress={() => setFilterType('TAXI')}
          >
            <Text style={[styles.pillText, filterType === 'TAXI' && styles.pillTextActive]}>
              Taxi
            </Text>
          </Pressable>

          <Pressable
            style={[styles.pill, filterType === 'PUBLIC_TRANSPORT' && styles.pillActive]}
            onPress={() => setFilterType('PUBLIC_TRANSPORT')}
          >
            <Text style={[styles.pillText, filterType === 'PUBLIC_TRANSPORT' && styles.pillTextActive]}>
              Public Transport
            </Text>
          </Pressable>

        </ScrollView>

        {/* Trips List */}
        {filteredTrips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="map-outline" size={42} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Trips Found</Text>
            <Text style={styles.emptyText}>
              There are no trips matching your search filter.
            </Text>
          </View>
        ) : (
          filteredTrips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              {/* Top Bar */}
              <View style={styles.tripCardTop}>
                <View style={styles.vehiclePill}>
                  <Ionicons
                    name={
                      trip.vehicleType === 'TAXI'
                        ? 'car-outline'
                        : 'bus-outline'
                    }
                    size={14}
                    color="#0A84FF"
                  />
                  <Text style={styles.vehiclePillText}>
                    {trip.vehicleType === 'MINIBUS' ? 'BUS' : trip.vehicleType} • {trip.vehiclePlate}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>DRIVER CREATED</Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      trip.status === 'ACTIVE'
                        ? styles.statusPillActive
                        : styles.statusPillPlanned,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        trip.status === 'ACTIVE'
                          ? styles.statusPillTextActive
                          : styles.statusPillTextPlanned,
                      ]}
                    >
                      {trip.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Route */}
              <View style={styles.routeBox}>
                <View style={styles.routeEndpoints}>
                  <View style={styles.routePoint}>
                    <View style={styles.dotOrigin} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointLabel}>ORIGIN</Text>
                      <Text style={styles.pointLocation}>{trip.origin}</Text>
                    </View>
                    <Text style={styles.pointTime}>{trip.departureTime}</Text>
                  </View>

                  <View style={styles.routeConnector} />

                  <View style={styles.routePoint}>
                    <View style={styles.dotDest} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointLabel}>DESTINATION</Text>
                      <Text style={styles.pointLocation}>{trip.destination}</Text>
                    </View>
                    <Text style={styles.pointTime}>{trip.arrivalTime}</Text>
                  </View>
                </View>
              </View>

              {/* Details & Delete Action */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.driverName}>Driver: {trip.driverName}</Text>
                  <Text style={styles.fareInfo}>
                    Fare: {trip.fare} {trip.currency} • {trip.availableSeats} of {trip.totalSeats} seats free
                  </Text>
                </View>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTrip(trip)}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
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
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1C1C1E' },

  filterScroll: { marginBottom: 16 },
  filterPills: { gap: 8 },
  pill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  pillActive: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#636366' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '700' },

  emptyCard: {
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
  emptyText: { fontSize: 13, color: '#8E8E93', textAlign: 'center' },

  tripCard: {
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
  tripCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vehiclePillText: { fontSize: 11, fontWeight: '700', color: '#0A84FF' },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  liveBadge: {
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  liveBadgeText: { fontSize: 9, fontWeight: '800', color: '#34C759' },
  statusPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  statusPillActive: { backgroundColor: '#E8F8EE' },
  statusPillPlanned: { backgroundColor: '#F2F2F7' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  statusPillTextActive: { color: '#34C759' },
  statusPillTextPlanned: { color: '#8E8E93' },

  routeBox: {
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  routeEndpoints: { gap: 10 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotOrigin: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0A84FF' },
  dotDest: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#34C759' },
  pointLabel: { fontSize: 9, fontWeight: '700', color: '#8E8E93' },
  pointLocation: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginTop: 1 },
  pointTime: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },
  routeConnector: {
    width: 2,
    height: 12,
    backgroundColor: '#D1D1D6',
    marginLeft: 4,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  driverName: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  fareInfo: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFF0F0',
  },
  deleteButtonText: { fontSize: 12, fontWeight: '700', color: '#FF3B30' },
});
