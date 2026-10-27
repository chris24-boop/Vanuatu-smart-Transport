import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import TransportAuthBackground from "@/components/TransportAuthBackground";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"PASSENGER" | "DRIVER">("PASSENGER");
  const [vehicleType, setVehicleType] = useState<"TAXI" | "BUS" | "PUBLIC_TRANSPORT">("BUS");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");

  const {
    register,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const router = useRouter();

  const handleRegister = async () => {
    if (!firstName || !lastName || !phone || !email || !password) return;
    if (role === "DRIVER" && (!vehiclePlate || !licenceNumber)) return;

    try {
      await register({
        firstName,
        lastName,
        phone,
        email,
        password,
        role,
        vehicleType: role === "DRIVER" ? vehicleType : undefined,
        vehiclePlate: role === "DRIVER" ? vehiclePlate.trim() : undefined,
        licenceNumber: role === "DRIVER" ? licenceNumber.trim() : undefined,
        vehicleModel: role === "DRIVER" ? (vehicleModel.trim() || undefined) : undefined,
        island: "Port Vila (Efate)",
      });
    } catch {
      // Error is set in store
    }
  };

  const isFormValid =
    firstName &&
    lastName &&
    phone &&
    email &&
    password &&
    (role === "PASSENGER" || (vehiclePlate && licenceNumber));

  return (
    <View style={styles.background}>
      <TransportAuthBackground />
      {/* Dark transparent overlay */}
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={
              Platform.OS === "ios"
                ? "padding"
                : "height"
            }
          >
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ================= HEADER ================= */}

              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <Image
                    source={require("@/assets/images/vanuatuflag.png")}
                    style={styles.flag}
                    resizeMode="contain"
                  />
                </View>

                <Text style={styles.title}>
                  Vanuatu Smart Transport
                </Text>

                <Text style={styles.subtitle}>
                  Join Vanuatu Transport
                </Text>
              </View>

              {/* ================= REGISTER CARD ================= */}

              <View style={styles.card}>
                {/* Card Header */}

                <View style={styles.cardHeader}>
                  <Text style={styles.welcomeTitle}>
                    Create Account
                  </Text>

                  <Text style={styles.welcomeText}>
                    Register to access Vanuatu Smart Transport
                  </Text>

                  {/* Role Selector Tabs */}
                  <View style={styles.roleTabsContainer}>
                    <Pressable
                      style={[
                        styles.roleTab,
                        role === "PASSENGER" && styles.roleTabActive,
                      ]}
                      onPress={() => {
                        clearError();
                        setRole("PASSENGER");
                      }}
                    >
                      <Ionicons
                        name="person"
                        size={16}
                        color={role === "PASSENGER" ? "#0A84FF" : "rgba(255,255,255,0.7)"}
                      />
                      <Text
                        style={[
                          styles.roleTabText,
                          role === "PASSENGER" && styles.roleTabTextActive,
                        ]}
                      >
                        Passenger
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.roleTab,
                        role === "DRIVER" && styles.roleTabActive,
                      ]}
                      onPress={() => {
                        clearError();
                        setRole("DRIVER");
                      }}
                    >
                      <Ionicons
                        name="car"
                        size={16}
                        color={role === "DRIVER" ? "#0A84FF" : "rgba(255,255,255,0.7)"}
                      />
                      <Text
                        style={[
                          styles.roleTabText,
                          role === "DRIVER" && styles.roleTabTextActive,
                        ]}
                      >
                        Driver
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* ================= ERROR ================= */}

                {error && (
                  <View style={styles.errorBox}>
                    <View style={styles.errorIcon}>
                      <Ionicons
                        name="alert-circle"
                        size={20}
                        color="#FF453A"
                      />
                    </View>

                    <Text style={styles.errorText}>
                      {error}
                    </Text>
                  </View>
                )}

                {/* ================= FORM ================= */}

                <View style={styles.form}>
                  {/* First + Last Name */}

                  <View style={styles.row}>
                    <View style={styles.halfInput}>
                      <View style={styles.inputLabelRow}>
                        <Ionicons
                          name="person-outline"
                          size={15}
                          color="rgba(255,255,255,0.8)"
                        />

                        <Text style={styles.inputLabel}>
                          First Name
                        </Text>
                      </View>

                      <Input
                        label=""
                        placeholder="John"
                        value={firstName}
                        onChangeText={(text: string) => {
                          clearError();
                          setFirstName(text);
                        }}
                      />
                    </View>

                    <View style={styles.halfInput}>
                      <View style={styles.inputLabelRow}>
                        <Ionicons
                          name="person-outline"
                          size={15}
                          color="rgba(255,255,255,0.8)"
                        />

                        <Text style={styles.inputLabel}>
                          Last Name
                        </Text>
                      </View>

                      <Input
                        label=""
                        placeholder="Doe"
                        value={lastName}
                        onChangeText={(text: string) => {
                          clearError();
                          setLastName(text);
                        }}
                      />
                    </View>
                  </View>

                  {/* Phone */}

                  <View style={styles.inputSection}>
                    <View style={styles.inputLabelRow}>
                      <Ionicons
                        name="call-outline"
                        size={15}
                        color="rgba(255,255,255,0.8)"
                      />

                      <Text style={styles.inputLabel}>
                        Phone Number
                      </Text>
                    </View>

                    <Input
                      label=""
                      placeholder="+678 XXXXXXX"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(text: string) => {
                        clearError();
                        setPhone(text);
                      }}
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Email */}

                  <View style={styles.inputSection}>
                    <View style={styles.inputLabelRow}>
                      <Ionicons
                        name="mail-outline"
                        size={15}
                        color="rgba(255,255,255,0.8)"
                      />

                      <Text style={styles.inputLabel}>
                        Email address
                      </Text>
                    </View>

                    <Input
                      label=""
                      placeholder="john.smith@midriver.com or you@gmail.com"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={(text: string) => {
                        clearError();
                        setEmail(text);
                      }}
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Password */}

                  <View style={styles.inputSection}>
                    <View style={styles.inputLabelRow}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={15}
                        color="rgba(255,255,255,0.8)"
                      />

                      <Text style={styles.inputLabel}>
                        Password
                      </Text>
                    </View>

                    <View style={styles.passwordWrapper}>
                      <Input
                        label=""
                        placeholder="Create a password"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={(text: string) => {
                          clearError();
                          setPassword(text);
                        }}
                        autoCapitalize="none"
                      />

                      <Pressable
                        onPress={() =>
                          setShowPassword(!showPassword)
                        }
                        style={styles.eyeButton}
                        hitSlop={10}
                      >
                        <Ionicons
                          name={
                            showPassword
                              ? "eye-outline"
                              : "eye-off-outline"
                          }
                          size={21}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* ================= DRIVER DETAILS (CONDITIONAL) ================= */}
                  {role === "DRIVER" && (
                    <View style={styles.driverSectionBox}>
                      <View style={styles.driverSectionHeader}>
                        <Ionicons name="car-sport-outline" size={16} color="#0A84FF" />
                        <Text style={styles.driverSectionTitle}>Vehicle & Permit Information</Text>
                      </View>

                      {/* Vehicle Category Pills */}
                      <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Select Vehicle Type</Text>
                        <View style={styles.vehiclePillsRow}>
                          {[
                            { id: "TAXI", label: "Taxi", icon: "car-outline" },
                            { id: "PUBLIC_TRANSPORT", label: "Public Transport", icon: "bus-outline" },
                            { id: "BUS", label: "Bus", icon: "bus" },
                          ].map((v) => (
                            <Pressable
                              key={v.id}
                              style={[
                                styles.vehiclePill,
                                vehicleType === v.id && styles.vehiclePillActive,
                              ]}
                              onPress={() => setVehicleType(v.id as any)}
                            >
                              <Ionicons
                                name={v.icon as any}
                                size={14}
                                color={vehicleType === v.id ? "#FFFFFF" : "rgba(255,255,255,0.7)"}
                              />
                              <Text
                                style={[
                                  styles.vehiclePillText,
                                  vehicleType === v.id && styles.vehiclePillTextActive,
                                ]}
                              >
                                {v.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>

                      {/* Plate Number & Licence */}
                      <View style={styles.row}>
                        <View style={styles.halfInput}>
                          <Text style={styles.inputLabel}>License Plate</Text>
                          <Input
                            label=""
                            placeholder="e.g. B 1842 / T 104"
                            value={vehiclePlate}
                            onChangeText={(text: string) => {
                              clearError();
                              setVehiclePlate(text);
                            }}
                            autoCapitalize="characters"
                          />
                        </View>

                        <View style={styles.halfInput}>
                          <Text style={styles.inputLabel}>Driver License #</Text>
                          <Input
                            label=""
                            placeholder="e.g. VUT-8921"
                            value={licenceNumber}
                            onChangeText={(text: string) => {
                              clearError();
                              setLicenceNumber(text);
                            }}
                            autoCapitalize="characters"
                          />
                        </View>
                      </View>

                      {/* Make / Model / Cargo details */}
                      <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>
                          {vehicleType === "PUBLIC_TRANSPORT" ? "Public Transport Vehicle Model" : "Vehicle Make & Model"}
                        </Text>
                        <Input
                          label=""
                          placeholder={
                            vehicleType === "PUBLIC_TRANSPORT"
                              ? "e.g. Toyota HiAce 15-seater"
                              : "e.g. Toyota Corolla"
                          }
                          value={vehicleModel}
                          onChangeText={(text: string) => {
                            clearError();
                            setVehicleModel(text);
                          }}
                        />
                      </View>
                    </View>
                  )}

                  {/* ================= BUTTON ================= */}

                  <View style={styles.buttonContainer}>
                    <Button
                      title={role === "DRIVER" ? "Register as Driver" : "Create Passenger Account"}
                      onPress={handleRegister}
                      loading={isLoading}
                      disabled={!isFormValid}
                    />
                  </View>
                </View>

                {/* ================= FOOTER ================= */}

                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Already have an account?
                  </Text>

                  <Pressable
                    onPress={() => router.back()}
                    style={styles.signInButton}
                  >
                    <Text style={styles.footerLink}>
                      Sign In
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </View>
              </View>

              {/* ================= BOTTOM ================= */}

              <View style={styles.bottomFooter}>
                <View style={styles.secureRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={15}
                    color="rgba(255,255,255,0.75)"
                  />

                  <Text style={styles.secureText}>
                    Secure Transport Platform
                  </Text>
                </View>

                <Text style={styles.version}>
                  Vanuatu Smart Transport
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ================= BACKGROUND ================= */

  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(5, 15, 30, 0.35)",
  },

  safe: {
    flex: 1,
  },

  flex: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
    justifyContent: "center",
  },

  /* ================= HEADER ================= */

  header: {
    alignItems: "center",
    marginBottom: 22,
  },

  logoContainer: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  flag: {
    width: 58,
    height: 48,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.4,
  },

  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    marginTop: 6,
    textAlign: "center",
  },

  /* ================= CARD ================= */

  card: {
    backgroundColor: "rgba(20, 30, 35, 0.72)",

    borderRadius: 24,

    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",

    paddingHorizontal: 22,
    paddingVertical: 26,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  cardHeader: {
    marginBottom: 20,
  },

  welcomeTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },

  welcomeText: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.75)",
  },

  /* ================= ERROR ================= */

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,69,58,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.35)",
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 18,
  },

  errorIcon: {
    marginRight: 9,
  },

  errorText: {
    flex: 1,
    color: "#FFB4AE",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },

  /* ================= FORM ================= */

  form: {
    marginBottom: 2,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  halfInput: {
    flex: 1,
  },

  inputSection: {
    marginBottom: 15,
  },

  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },

  passwordWrapper: {
    position: "relative",
  },

  eyeButton: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },

  /* ================= BUTTON ================= */

  buttonContainer: {
    marginTop: 2,
  },

  /* ================= FOOTER ================= */

  footer: {
    alignItems: "center",
  },

  footerText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 8,
  },

  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
  },

  footerLink: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "800",
  },

  /* ================= BOTTOM ================= */

  bottomFooter: {
    alignItems: "center",
    marginTop: 20,
  },

  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  secureText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
  },

  version: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 5,
  },

  /* ================= ROLE SELECTOR & DRIVER INPUTS ================= */
  roleTabsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    backgroundColor: "rgba(0,0,0,0.25)",
    padding: 4,
    borderRadius: 14,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  roleTabActive: {
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
  roleTabTextActive: {
    color: "#0A84FF",
    fontWeight: "800",
  },
  driverSectionBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  driverSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  driverSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  vehiclePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  vehiclePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  vehiclePillActive: {
    backgroundColor: "#0A84FF",
    borderColor: "#0A84FF",
  },
  vehiclePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
  vehiclePillTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});