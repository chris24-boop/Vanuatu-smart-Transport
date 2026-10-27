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
import type { Href } from "expo-router";
import TransportAuthBackground from "@/components/TransportAuthBackground";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return;

    try {
      await login({ email, password });
    } catch {
      // Error is set in store
    }
  };

  return (
    <View style={styles.background}>
      <TransportAuthBackground />
      {/* Dark background overlay */}
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
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

                <Text style={styles.title}>Vanuatu Smart Transport</Text>

                <Text style={styles.subtitle}>Your journey starts here</Text>
              </View>

              {/* ================= LOGIN CARD ================= */}

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.welcomeTitle}>Welcome back</Text>

                  <Text style={styles.welcomeText}>
                    Sign in to access your transport account
                  </Text>
                </View>

                {/* Error */}
                {error && (
                  <View style={styles.errorBox}>
                    <View style={styles.errorIcon}>
                      <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                    </View>

                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* ================= FORM ================= */}

                <View style={styles.form}>
                  {/* Email */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputLabelRow}>
                      <Ionicons name="mail-outline" size={16} color="#6B7280" />

                      <Text style={styles.inputLabel}>Email address</Text>
                    </View>

                    <Input
                      label=""
                      placeholder="you@example.com"
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
                        size={16}
                        color="#6B7280"
                      />

                      <Text style={styles.inputLabel}>Password</Text>
                    </View>

                    <View style={styles.passwordWrapper}>
                      <Input
                        label=""
                        placeholder="Enter your password"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={(text: string) => {
                          clearError();
                          setPassword(text);
                        }}
                        autoCapitalize="none"
                      />

                      <Pressable
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                        hitSlop={10}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-outline" : "eye-off-outline"
                          }
                          size={21}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Forgot password */}
                <Pressable
                  onPress={() => router.push("/(auth)/forgot-password")}
                  style={styles.forgotLink}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>

                {/* Sign in */}
                <View style={styles.buttonContainer}>
                  <Button
                    title="Sign In"
                    onPress={handleLogin}
                    loading={isLoading}
                    disabled={!email || !password}
                  />
                </View>

                <Pressable
                  onPress={() => router.push("/tourist" as Href)}
                  style={styles.touristButton}
                  accessibilityRole="button"
                  accessibilityLabel="Browse tourist transport and private tours"
                >
                  <Ionicons name="compass-outline" size={20} color="#0D705B" />
                  <View style={styles.touristButtonText}>
                    <Text style={styles.touristButtonTitle}>Tourist & Private Tours</Text>
                    <Text style={styles.touristButtonSubtitle}>
                      Explore Vanuatu with a local driver.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#0D705B" />
                </Pressable>

                {/* Register */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>Don't have an account?</Text>

                  <Pressable
                    onPress={() => router.push("/(auth)/register")}
                    style={styles.signUpButton}
                  >
                    <Text style={styles.footerLink}>Create Account</Text>

                    <Ionicons name="arrow-forward" size={16} color="#0A84FF" />
                  </Pressable>
                </View>
              </View>

              {/* ================= FOOTER ================= */}

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

                <Text style={styles.version}>Vanuatu Smart Transport</Text>
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
    marginBottom: 24,
  },

  logoContainer: {
    width: 80,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginTop:25,
    
  },

  flag: {
    width: 58,
    height: 48,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    marginTop: 7,
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
  shadowOpacity: 0.30,
  shadowRadius: 20,
  elevation: 10,
},


  cardHeader: {
    marginBottom: 22,
  },

  welcomeTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#ffff",
    marginBottom: 6,
  },

  welcomeText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#ffff",
  },

  /* ================= ERROR ================= */

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F0",
    borderWidth: 1,
    borderColor: "#FFD6D3",
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
    color: "#D92D20",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },

  /* ================= FORM ================= */

  form: {
    marginBottom: 1,
  },

  inputSection: {
    marginBottom: 16,
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
    color: "rgb(241, 242, 245)",
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

  /* ================= FORGOT ================= */

  forgotLink: {
    alignSelf: "flex-end",
    marginBottom: 5,
  },

  forgotText: {
    fontSize: 13,
    color: "#0A84FF",
    fontWeight: "700",
  },

  /* ================= BUTTON ================= */

  buttonContainer: {
    marginTop: 2,
  },

  touristButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(13, 112, 91, 0.24)",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  touristButtonText: {
    flex: 1,
  },
  touristButtonTitle: {
    color: "#173D33",
    fontSize: 14,
    fontWeight: "700",
  },
  touristButtonSubtitle: {
    marginTop: 3,
    color: "#687871",
    fontSize: 12,
  },

  /* ================= FOOTER ================= */

  footer: {
    alignItems: "center",
  },

  footerText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 9,
  },

  signUpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
  },

  footerLink: {
    fontSize: 14,
    color: "#0A84FF",
    fontWeight: "800",
  },

  /* ================= BOTTOM ================= */

  bottomFooter: {
    alignItems: "center",
    marginTop: 22,
  },

  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  secureText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    fontWeight: "500",
  },

  version: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 5,
  },
});
