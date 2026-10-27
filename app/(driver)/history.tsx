import { useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import VanuatuScreenBackground from "@/components/VanuatuScreenBackground";
import { useAuthStore } from "@/store/authStore";
import { useTransportStore } from "@/store/transportStore";

export default function DriverTripHistoryScreen() {
  const user = useAuthStore((state) => state.user);
  const trips = useTransportStore((state) => state.trips);
  const driverBookings = useTransportStore((state) => state.driverBookings);
  const fetchTrips = useTransportStore((state) => state.fetchTrips);
  const fetchDriverBookings = useTransportStore((state) => state.fetchDriverBookings);

  useEffect(() => {
    if (!user || user.role !== 'DRIVER') return;

    void fetchTrips();
    void fetchDriverBookings();
  }, [user, fetchDriverBookings, fetchTrips]);

  const completedTrips = useMemo(
    () =>
      trips
        .filter((trip) => trip.driverId === user?.id && trip.status === "COMPLETED")
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
        ),
    [trips, user?.id],
  );
  const completedBookings = useMemo(
    () =>
      driverBookings
        .filter(
          (booking) =>
            booking.driverId === user?.id &&
            booking.tripId === null &&
            (booking.vehicleType === "TAXI" || booking.vehicleType === "PUBLIC_TRANSPORT") &&
            booking.status === "COMPLETED",
        )
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
        ),
    [driverBookings, user?.id],
  );
  const historyCount = completedTrips.length + completedBookings.length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <VanuatuScreenBackground />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="time-outline" size={24} color="#0D705B" />
          </View>
          <Text style={styles.title}>Trip History</Text>
          <Text style={styles.subtitle}>
            Your completed journeys across Vanuatu
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="checkmark-done" size={20} color="#0D705B" />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryCount}>{historyCount}</Text>
            <Text style={styles.summaryLabel}>
              {historyCount === 1 ? "Completed trip" : "Completed trips"}
            </Text>
          </View>
          <View style={styles.islandTag}>
            <Ionicons name="location-outline" size={13} color="#0D705B" />
            <Text style={styles.islandTagText}>Vanuatu</Text>
          </View>
        </View>

        {historyCount === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="map-outline" size={30} color="#0D705B" />
            </View>
            <Text style={styles.emptyTitle}>No completed trips yet</Text>
            <Text style={styles.emptyText}>
              Trips will appear here after you mark them as completed.
            </Text>
          </View>
        ) : null}

        {completedTrips.length > 0 && (
          <Text style={styles.sectionTitle}>Scheduled trips</Text>
        )}
        {completedTrips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.cardHeader}>
                <View style={styles.vehicleRow}>
                  <View style={styles.vehicleIcon}>
                    <Ionicons name="bus-outline" size={19} color="#0D705B" />
                  </View>
                  <View>
                    <Text style={styles.vehicleName}>
                      {trip.vehicleType} · {trip.vehiclePlate}
                    </Text>
                    <Text style={styles.tripTime}>
                      {trip.departureTime} – {trip.arrivalTime}
                    </Text>
                  </View>
                </View>
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#17734D" />
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              </View>

              <View style={styles.route}>
                <View style={styles.routeMarkers}>
                  <View style={styles.originDot} />
                  <View style={styles.routeConnector} />
                  <View style={styles.destinationDot} />
                </View>
                <View style={styles.routeLocations}>
                  <View style={styles.locationBlock}>
                    <Text style={styles.locationLabel}>FROM</Text>
                    <Text style={styles.locationName}>{trip.origin}</Text>
                  </View>
                  <View style={styles.locationBlock}>
                    <Text style={styles.locationLabel}>TO</Text>
                    <Text style={styles.locationName}>{trip.destination}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tripFooter}>
                <Text style={styles.seatCount}>
                  {trip.totalSeats - trip.availableSeats} / {trip.totalSeats} seats
                </Text>
                <Text style={styles.fare}>
                  {trip.currency} {trip.fare}
                </Text>
              </View>
            </View>
        ))}

        {completedBookings.length > 0 && (
          <Text style={styles.sectionTitle}>Taxi & public-transport bookings</Text>
        )}
        {completedBookings.map((booking) => (
          <View key={booking.id} style={styles.tripCard}>
            <View style={styles.cardHeader}>
              <View style={styles.vehicleRow}>
                <View style={styles.vehicleIcon}>
                  <Ionicons
                    name={booking.vehicleType === "TAXI" ? "car-outline" : "bus-outline"}
                    size={19}
                    color="#0D705B"
                  />
                </View>
                <View>
                  <Text style={styles.vehicleName}>
                    {booking.vehicleType.replace("_", " ")} · {booking.vehiclePlate}
                  </Text>
                  <Text style={styles.tripTime}>
                    Booked {new Date(booking.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#17734D" />
                <Text style={styles.completedText}>Completed</Text>
              </View>
            </View>

            <View style={styles.route}>
              <View style={styles.routeMarkers}>
                <View style={styles.originDot} />
                <View style={styles.routeConnector} />
                <View style={styles.destinationDot} />
              </View>
              <View style={styles.routeLocations}>
                <View style={styles.locationBlock}>
                  <Text style={styles.locationLabel}>PICKUP</Text>
                  <Text style={styles.locationName}>{booking.pickupLocation}</Text>
                </View>
                <View style={styles.locationBlock}>
                  <Text style={styles.locationLabel}>DROPOFF</Text>
                  <Text style={styles.locationName}>{booking.dropoffLocation}</Text>
                </View>
              </View>
            </View>

            <View style={styles.tripFooter}>
              <Text style={styles.seatCount}>Passenger: {booking.passengerName}</Text>
              <Text style={styles.fare}>
                {booking.currency} {booking.fare}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  container: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 22 },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#E4F1EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontSize: 25, fontWeight: "800", color: "#17332C" },
  subtitle: { fontSize: 14, color: "#71817A", marginTop: 5 },
  sectionTitle: {
    color: "#34564A",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 4,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EAF5EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  summaryText: { flex: 1 },
  summaryCount: { fontSize: 20, fontWeight: "800", color: "#17332C" },
  summaryLabel: { fontSize: 12, color: "#71817A", marginTop: 1 },
  islandTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF5EF",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },
  islandTagText: { color: "#0D705B", fontSize: 11, fontWeight: "700" },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#EAF5EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { color: "#17332C", fontSize: 16, fontWeight: "700" },
  emptyText: {
    color: "#71817A",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
  },
  tripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    shadowColor: "#17332C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  vehicleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EAF5EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  vehicleName: { color: "#263B33", fontSize: 13, fontWeight: "700" },
  tripTime: { color: "#71817A", fontSize: 11, marginTop: 3 },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF5EF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedText: { color: "#17734D", fontSize: 10, fontWeight: "700" },
  route: { flexDirection: "row", marginBottom: 16 },
  routeMarkers: { width: 20, alignItems: "center", paddingTop: 3 },
  originDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#0D705B",
  },
  routeConnector: {
    height: 25,
    borderLeftWidth: 1,
    borderColor: "#C8DAD1",
    borderStyle: "dashed",
  },
  destinationDot: {
    width: 9,
    height: 9,
    borderRadius: 2,
    backgroundColor: "#D2A64B",
    transform: [{ rotate: "45deg" }],
  },
  routeLocations: { flex: 1, marginLeft: 9, justifyContent: "space-between" },
  locationBlock: { minHeight: 42 },
  locationLabel: {
    color: "#87958E",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  locationName: { color: "#263B33", fontSize: 14, fontWeight: "600" },
  tripFooter: {
    borderTopWidth: 1,
    borderTopColor: "#EDF1EE",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seatCount: { color: "#71817A", fontSize: 12 },
  fare: { color: "#0D705B", fontSize: 15, fontWeight: "800" },
});
