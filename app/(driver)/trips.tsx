import { useEffect, useState } from "react";
import * as Location from "expo-location";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTransportStore } from "@/store/transportStore";
import { useAuthStore } from "@/store/authStore";
import { DriverAvailability } from "@/types/transport";
import DriverAvailabilityControl from "@/components/DriverAvailabilityControl";
import VanuatuScreenBackground from "@/components/VanuatuScreenBackground";
import { DriverVerificationStatus } from "@/types/user";
import { API_BASE_URL } from "@/constants";

let locationInterval: ReturnType<typeof setInterval> | null = null;

async function syncDriverLocation(driverId: string) {
  if (!driverId) {
    return false;
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const response = await fetch(`${API_BASE_URL}/driver/location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        driverId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Failed to sync location:", data.error || response.statusText);
      return false;
    }

    console.log("GPS synced successfully:", position.coords.latitude, position.coords.longitude);
    return true;
  } catch (error) {
    console.error("Unable to get or sync driver location:", error);
    return false;
  }
}

async function ensureDriverLocationAccess() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Location permission required",
      "Allow location access for Vanuatu Smart Transport in your phone settings to share your trip location."
    );
    return false;
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    Alert.alert("Location is turned off", "Turn on Location on your phone, then try starting the trip again.");
    return false;
  }

  return true;
}

function startDriverTracking(driverId: string) {
  if (!driverId) return;

  if (locationInterval) {
    stopDriverTracking();
  }

  void syncDriverLocation(driverId);

  locationInterval = setInterval(() => {
    void syncDriverLocation(driverId);
  }, 10000);
}

function stopDriverTracking() {
  if (locationInterval) {
    clearInterval(locationInterval);
    locationInterval = null;
    console.log("Driver tracking stopped.");
  }
}

const PRESET_ORIGINS = [
  "Main Wharf (Ship Berth & Cargo)",
  "Star Wharf (Domestic Wharf)",
  "Port Vila Central Market",
  "Bauerfield Airport",
  "Mele Cascades",
  "Pango Point",
  "Teouma Valley",
  "Freswota 4",
  "Luganville Market (Santo)",
];

const PRESET_DESTINATIONS = [
  "Port Vila Central Market",
  "Freswota 4 Market",
  "Port Vila Seafront",
  "Main Wharf (Ship Cargo Pickup)",
  "Mele Cascades & Beach",
  "Bauerfield Airport",
  "Pango Breakas Resort",
  "Havannah Harbour",
  "Erakor Village",
  "Champagne Beach (Santo)",
];

export default function TripsScreen() {
  const { user } = useAuthStore();
  const {
    trips,
    driverAvailability,
    fetchTrips,
    fetchDriverAvailability,
    setDriverAvailability,
    createTrip,
    updateTripStatus,
    removeTrip,
  } = useTransportStore();

  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [origin, setOrigin] = useState("Port Vila Central Market");
  const [destination, setDestination] = useState("Mele Cascades & Beach");
  const [vehiclePlate, setVehiclePlate] = useState("B 1842");
  const [departureTime, setDepartureTime] = useState("In 10 mins");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [fare, setFare] = useState("150");
  const [totalSeats, setTotalSeats] = useState("15");
  const [intermediateStop, setIntermediateStop] = useState("Freswota Junction");

  const currentDriverId = user?.id ?? "";
  const currentDriverName = user ? `${user.firstName} ${user.lastName}` : "Driver";
  const isDriverApproved =
    user?.role !== "DRIVER" || user.driverVerificationStatus === DriverVerificationStatus.VERIFIED;
  const isBusDriver = user?.vehicleType === "BUS" || user?.vehicleType === "MINIBUS";
  const supportsAvailability = user?.vehicleType === "TAXI" || user?.vehicleType === "PUBLIC_TRANSPORT";

  useEffect(() => {
    void fetchTrips().catch((error) => console.error("Failed to fetch trips:", error));
    if (supportsAvailability) void fetchDriverAvailability();
  }, [fetchTrips, fetchDriverAvailability, supportsAvailability]);

  // Filter trips for this driver
  const myTrips = user
    ? trips.filter(
        (t) => t.driverId === currentDriverId && (t.vehicleType === "BUS" || t.vehicleType === "MINIBUS")
      )
    : [];
  const displayedTrips = myTrips.filter((trip) => trip.status !== "COMPLETED");

  const activeCount = displayedTrips.filter((t) => t.status === "ACTIVE").length;
  const plannedCount = displayedTrips.filter((t) => t.status === "PLANNED").length;

  const handleCreateTrip = async () => {
    if (user?.role === "DRIVER" && user.driverVerificationStatus !== DriverVerificationStatus.VERIFIED) {
      Alert.alert(
        "Approval required",
        "Your driver account is still pending admin approval. You cannot create or start service trips until the admin verifies your registration."
      );
      return;
    }

    if (!origin.trim() || !destination.trim()) {
      Alert.alert("Missing Route", "Please provide both origin and destination.");
      return;
    }

    const stopsList = [origin.trim()];
    if (intermediateStop.trim()) {
      stopsList.push(intermediateStop.trim());
    }
    stopsList.push(destination.trim());

    try {
      await createTrip({
        origin: origin.trim(),
        destination: destination.trim(),
        vehiclePlate: vehiclePlate.trim() || "B 1000",
        departureTime: departureTime.trim() || "Departing Now",
        durationMinutes: parseInt(durationMinutes, 10) || 30,
        fare: parseInt(fare, 10) || 150,
        totalSeats: parseInt(totalSeats, 10) || 14,
        stops: stopsList,
      });

      setModalVisible(false);
      Alert.alert(
        "Trip Created Successfully!",
        `Your trip from ${origin} to ${destination} has been saved and is visible to passengers.`
      );
    } catch (error) {
      Alert.alert("Trip Could Not Be Saved", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const handleStartTrip = async (id: string) => {
    if (user?.role === "DRIVER" && user.driverVerificationStatus !== DriverVerificationStatus.VERIFIED) {
      Alert.alert(
        "Approval required",
        "Your driver account is still pending admin approval. You cannot start trips until approval is granted."
      );
      return;
    }

    if (!(await ensureDriverLocationAccess())) {
      return;
    }
    try {
      await updateTripStatus(id, "ACTIVE");
      startDriverTracking(currentDriverId);
      Alert.alert("Trip Started", "Passengers can now track your bus in real time!");
    } catch (error) {
      Alert.alert("Unable to Start Trip", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const handleCompleteTrip = async (id: string) => {
    try {
      await updateTripStatus(id, "COMPLETED");
      stopDriverTracking();
      Alert.alert("Trip Completed", "Great job! This trip has been saved as completed.");
    } catch (error) {
      Alert.alert("Unable to Complete Trip", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const handleAvailabilityChange = async (status: DriverAvailability) => {
    try {
      await setDriverAvailability(status);
      Alert.alert("Availability Updated", `Your status is now ${status.replace("_", " ").toLowerCase()}.`);
    } catch (error) {
      Alert.alert("Status Error", error instanceof Error ? error.message : "Could not update availability.");
    }
  };

  if (!isBusDriver) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <VanuatuScreenBackground />
        <View style={styles.container}>
          <Text style={styles.title}>Service Availability</Text>
          <Text style={styles.subtitle}>
            {supportsAvailability
              ? "Set when passengers can find, book, or call your service."
              : "Scheduled route trips are available to Bus drivers."}
          </Text>
          {supportsAvailability && (
            <View style={styles.summaryCard}>
              <Text style={styles.formLabel}>CURRENT STATUS</Text>
              <DriverAvailabilityControl
                status={driverAvailability}
                onChange={(status) => void handleAvailabilityChange(status)}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <VanuatuScreenBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with New Trip Button */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Driver Trips</Text>
            <Text style={styles.subtitle}>
              Manage, create and broadcast trips to passengers
            </Text>
          </View>

          <Pressable
            style={[styles.createButton, !isDriverApproved && styles.createButtonDisabled]}
            onPress={() => {
              if (!isDriverApproved) {
                Alert.alert(
                  "Approval required",
                  "Your driver account must be approved by the admin before you can create service trips."
                );
                return;
              }
              setModalVisible(true);
            }}
            disabled={!isDriverApproved}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Trip</Text>
          </Pressable>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{displayedTrips.length}</Text>
            <Text style={styles.summaryLabel}>Current Trips</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: "#34C759" }]}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>Active En Route</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: "#0A84FF" }]}>{plannedCount}</Text>
            <Text style={styles.summaryLabel}>Upcoming</Text>
          </View>
        </View>

        {/* Trips List */}
        {displayedTrips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="car-outline" size={44} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No Current Trips</Text>
            <Text style={styles.emptyText}>
              Completed trips are saved in Trip History. Create a trip to publish a route and destination.
            </Text>
            <Pressable
              style={styles.emptyActionBtn}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyActionBtnText}>Create My First Trip</Text>
            </Pressable>
          </View>
        ) : (
          displayedTrips.map((trip) => {
            const isActive = trip.status === "ACTIVE";
            return (
              <View key={trip.id} style={styles.tripCard}>
                {/* Trip Header */}
                <View style={styles.tripHeader}>
                  <View style={styles.vehicleContainer}>
                    <View style={styles.vehicleIcon}>
                      <Ionicons
                        name={
                          trip.vehicleType === "TAXI"
                            ? "car-outline"
                            : "bus-outline"
                        }
                        size={22}
                        color="#0A84FF"
                      />
                    </View>
                    <View>
                      <Text style={styles.vehicleName}>
                        {trip.vehicleType} • {trip.vehiclePlate}
                      </Text>
                      <Text style={styles.driverNameSub}>
                        Driver: {trip.driverName}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isActive && styles.statusBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isActive && styles.statusTextActive,
                      ]}
                    >
                      {trip.status}
                    </Text>
                  </View>
                </View>

                {/* Route */}
                <View style={styles.routeContainer}>
                  <View style={styles.routeIconColumn}>
                    <View style={styles.dot} />
                    <View style={styles.routeLine} />
                    <View style={styles.destinationDot} />
                  </View>

                  <View style={styles.routeTextColumn}>
                    <View style={styles.routeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeLabel}>START ROUTE (ORIGIN)</Text>
                        <Text style={styles.location}>{trip.origin}</Text>
                      </View>
                      <Text style={styles.time}>{trip.departureTime}</Text>
                    </View>

                    <View style={styles.routeSpacing} />

                    <View style={styles.routeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeLabel}>END ROUTE (DESTINATION)</Text>
                        <Text style={styles.location}>{trip.destination}</Text>
                      </View>
                      <Text style={styles.time}>{trip.arrivalTime}</Text>
                    </View>
                  </View>
                </View>

                {/* Stops chip summary */}
                {trip.stops && trip.stops.length > 2 && (
                  <View style={styles.stopsChipRow}>
                    <Ionicons name="git-commit-outline" size={14} color="#8E8E93" />
                    <Text style={styles.stopsChipText}>
                      Via: {trip.stops.slice(1, -1).map((s) => s.name).join(", ")}
                    </Text>
                  </View>
                )}

                {/* Capacity and Fare */}
                <View style={styles.fareRow}>
                  <View style={styles.fareItem}>
                    <Ionicons name="people-outline" size={16} color="#8E8E93" />
                    <Text style={styles.fareLabel}>
                      {trip.availableSeats} of {trip.totalSeats} seats open
                    </Text>
                  </View>

                  <Text style={styles.fareAmount}>
                    {trip.fare} {trip.currency}
                  </Text>
                </View>

                {/* Driver Controls */}
                <View style={styles.controlsRow}>
                  {trip.status === "PLANNED" ? (
                    <Pressable
                      style={styles.startTripBtn}
                      onPress={() => handleStartTrip(trip.id)}
                    >
                      <Ionicons name="play" size={14} color="#FFFFFF" />
                      <Text style={styles.startTripBtnText}>Start Trip</Text>
                    </Pressable>
                  ) : isActive ? (
                    <Pressable
                      style={styles.completeTripBtn}
                      onPress={() => handleCompleteTrip(trip.id)}
                    >
                      <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                      <Text style={styles.completeTripBtnText}>Complete Trip</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.cancelledTag}>
                      <Ionicons name="close-circle-outline" size={14} color="#8E8E93" />
                      <Text style={styles.cancelledTagText}>Trip Cancelled</Text>
                    </View>
                  )}

                  <Pressable
                    style={styles.deleteTripBtn}
                    onPress={() => {
                      Alert.alert(
                        "Delete Trip",
                        "Are you sure you want to cancel and delete this trip?",
                        [
                          { text: "Keep", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => {
                              void removeTrip(trip.id)
                                .then(stopDriverTracking)
                                .catch((error) => {
                                  Alert.alert("Unable to Cancel Trip", error instanceof Error ? error.message : "Please try again.");
                                });
                    },
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#8E8E93" />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* CREATE TRIP MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create New Trip</Text>
                <Text style={styles.modalSubtitle}>
                  Set start route, destination & departure time
                </Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#1C1C1E" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Origin Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>START ROUTE (ORIGIN)</Text>
                <TextInput
                  style={styles.formInput}
                  value={origin}
                  onChangeText={setOrigin}
                  placeholder="e.g. Port Vila Central Market"
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.quickChipsScroll}
                >
                  {PRESET_ORIGINS.map((item) => (
                    <Pressable
                      key={item}
                      style={[
                        styles.quickChip,
                        origin === item && styles.quickChipActive,
                      ]}
                      onPress={() => setOrigin(item)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          origin === item && styles.quickChipTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Destination Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>END ROUTE (DESTINATION)</Text>
                <TextInput
                  style={styles.formInput}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="e.g. Mele Cascades"
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.quickChipsScroll}
                >
                  {PRESET_DESTINATIONS.map((item) => (
                    <Pressable
                      key={item}
                      style={[
                        styles.quickChip,
                        destination === item && styles.quickChipActive,
                      ]}
                      onPress={() => setDestination(item)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          destination === item && styles.quickChipTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Intermediate Stop */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>INTERMEDIATE STOP (OPTIONAL)</Text>
                <TextInput
                  style={styles.formInput}
                  value={intermediateStop}
                  onChangeText={setIntermediateStop}
                  placeholder="e.g. Freswota Junction, Tagabe"
                />
              </View>

              {/* Vehicle Plate & Departure Time */}
              <View style={styles.twoColumnRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>VEHICLE PLATE</Text>
                  <TextInput
                    style={styles.formInput}
                    value={vehiclePlate}
                    onChangeText={setVehiclePlate}
                    placeholder="B 1234"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>DEPARTURE TIME</Text>
                  <TextInput
                    style={styles.formInput}
                    value={departureTime}
                    onChangeText={setDepartureTime}
                    placeholder="e.g. In 10 mins / 08:30 AM"
                  />
                </View>
              </View>

              {/* Fare & Seats */}
              <View style={styles.twoColumnRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>FARE (VT)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={fare}
                    onChangeText={setFare}
                    placeholder="150"
                  />
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    <Pressable
                      style={[styles.zoneMiniChip, fare === '150' && styles.zoneMiniChipActive]}
                      onPress={() => setFare('150')}
                    >
                      <Text style={[styles.zoneMiniChipText, fare === '150' && styles.zoneMiniChipTextActive]}>
                        150 (Urban)
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.zoneMiniChip, fare === '250' && styles.zoneMiniChipActive]}
                      onPress={() => setFare('250')}
                    >
                      <Text style={[styles.zoneMiniChipText, fare === '250' && styles.zoneMiniChipTextActive]}>
                        250 (Zon 2)
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.zoneMiniChip, fare === '500' && styles.zoneMiniChipActive]}
                      onPress={() => setFare('500')}
                    >
                      <Text style={[styles.zoneMiniChipText, fare === '500' && styles.zoneMiniChipTextActive]}>
                        500 (Ring Rd)
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>AVAILABLE SEATS</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={totalSeats}
                    onChangeText={setTotalSeats}
                    placeholder="14"
                  />
                </View>
              </View>

              {/* Duration */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>ESTIMATED DURATION (MINUTES)</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="numeric"
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  placeholder="30"
                />
              </View>

              {/* Publish Button */}
              <Pressable
                style={styles.publishBtn}
                onPress={handleCreateTrip}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                <Text style={styles.publishBtnText}>Publish Trip Now</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#1C1C1E" },
  subtitle: { fontSize: 13, color: "#8E8E93", marginTop: 3 },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0A84FF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonDisabled: {
    backgroundColor: "#9AA0A6",
    opacity: 0.8,
  },
  createButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryNumber: { fontSize: 22, fontWeight: "800", color: "#1C1C1E" },
  summaryLabel: { fontSize: 12, color: "#8E8E93", marginTop: 4 },
  divider: { width: 1, height: 32, backgroundColor: "#E5E5EA" },

  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#E5E5EA",
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: { fontSize: 12, fontWeight: "600", color: "#8E8E93" },
  toggleBtnTextActive: { color: "#1C1C1E", fontWeight: "700" },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  emptyText: { fontSize: 13, color: "#8E8E93", textAlign: "center" },
  emptyActionBtn: {
    marginTop: 8,
    backgroundColor: "#0A84FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  tripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  vehicleContainer: { flexDirection: "row", alignItems: "center" },
  vehicleIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  vehicleName: { fontSize: 15, fontWeight: "700", color: "#1C1C1E" },
  driverNameSub: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  statusBadge: {
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActive: { backgroundColor: "#E8F8EE" },
  statusText: { fontSize: 11, fontWeight: "700", color: "#8E8E93" },
  statusTextActive: { color: "#34C759" },

  routeContainer: { flexDirection: "row", marginBottom: 14 },
  routeIconColumn: { width: 20, alignItems: "center", paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0A84FF" },
  routeLine: { width: 2, height: 38, backgroundColor: "#D1D1D6" },
  destinationDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#34C759" },
  routeTextColumn: { flex: 1, marginLeft: 10 },
  routeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeLabel: { fontSize: 9, fontWeight: "700", color: "#8E8E93", marginBottom: 2 },
  location: { fontSize: 14, fontWeight: "700", color: "#1C1C1E" },
  time: { fontSize: 13, fontWeight: "700", color: "#1C1C1E" },
  routeSpacing: { height: 18 },

  stopsChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  stopsChipText: { fontSize: 12, color: "#636366" },

  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  fareItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  fareLabel: { fontSize: 12, color: "#636366" },
  fareAmount: { fontSize: 15, fontWeight: "800", color: "#0A84FF" },

  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  startTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#34C759",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startTripBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  completeTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0A84FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeTripBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  cancelledTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  cancelledTagText: { fontSize: 12, fontWeight: "600", color: "#8E8E93" },
  deleteTripBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1C1C1E" },
  modalSubtitle: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: { marginBottom: 10 },
  formGroup: { marginBottom: 14 },
  formLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8E8E93",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1C1C1E",
  },
  quickChipsScroll: { marginTop: 6 },
  quickChip: {
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  quickChipActive: { backgroundColor: "#0A84FF" },
  quickChipText: { fontSize: 12, color: "#636366" },
  quickChipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  vehicleCategoryGrid: { flexDirection: "row", gap: 8 },
  categoryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingVertical: 10,
  },
  categoryCardActive: {
    backgroundColor: "#EAF3FF",
    borderWidth: 1.5,
    borderColor: "#0A84FF",
  },
  categoryText: { fontSize: 11, fontWeight: "700", color: "#636366" },
  categoryTextActive: { color: "#0A84FF" },
  twoColumnRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  publishBtn: {
    backgroundColor: "#0A84FF",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  zoneMiniChip: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  zoneMiniChipActive: {
    backgroundColor: '#E8F5EE',
    borderColor: '#167D5A',
  },
  zoneMiniChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#636366',
  },
  zoneMiniChipTextActive: {
    color: '#167D5A',
    fontWeight: '700',
  },
});