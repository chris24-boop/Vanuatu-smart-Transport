import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

export default function TransportAuthBackground() {
  const { width } = useWindowDimensions();
  const busPosition = useRef(new Animated.Value(-64)).current;
  const boatPosition = useRef(new Animated.Value(width + 64)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const busAnimation = Animated.loop(
      Animated.timing(busPosition, {
        toValue: width + 64,
        duration: 18000,
        useNativeDriver: true,
      }),
    );
    const boatAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(4500),
        Animated.timing(boatPosition, {
          toValue: -64,
          duration: 24000,
          useNativeDriver: true,
        }),
      ]),
    );
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );

    busAnimation.start();
    boatAnimation.start();
    pulseAnimation.start();

    return () => {
      busAnimation.stop();
      boatAnimation.stop();
      pulseAnimation.stop();
    };
  }, [boatPosition, busPosition, pulse, width]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.35],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.05],
  });

  return (
    <View pointerEvents="none" style={styles.background}>
      <View style={styles.sunGlow} />
      <View style={styles.sunCore} />
      <View style={styles.oceanHorizon} />
      <View style={styles.bottomGlow} />
      <View style={[styles.wave, styles.waveOne]} />
      <View style={[styles.wave, styles.waveTwo]} />
      <View style={[styles.wave, styles.waveThree]} />

      <Image
        source={require("@/assets/images/vanuatu-map.png")}
        resizeMode="contain"
        style={styles.map}
      />

      <View style={[styles.route, styles.busRoute]} />
      <View style={[styles.route, styles.boatRoute]} />

      <Animated.View
        style={[
          styles.vehicle,
          styles.bus,
          { transform: [{ translateX: busPosition }] },
        ]}
      >
        <Ionicons name="bus" size={22} color="#FFD166" />
      </Animated.View>

      <Animated.View
        style={[
          styles.vehicle,
          styles.boat,
          { transform: [{ translateX: boatPosition }] },
        ]}
      >
        <Ionicons name="boat" size={22} color="#7DE3E8" />
      </Animated.View>

      <View style={styles.islandMarker}>
        <Animated.View
          style={[
            styles.pulseRing,
            { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
          ]}
        />
        <View style={styles.markerDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    backgroundColor: "#14AFAE",
  },
  sunGlow: {
    position: "absolute",
    top: "-12%",
    right: "-15%",
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: "#FFE28A",
    opacity: 0.35,
  },
  sunCore: {
    position: "absolute",
    top: "7%",
    right: "12%",
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#FFE9A8",
    opacity: 0.24,
  },
  oceanHorizon: {
    position: "absolute",
    top: "34%",
    left: "-20%",
    right: "-20%",
    height: "34%",
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
    backgroundColor: "#21C7B7",
    opacity: 0.48,
  },
  bottomGlow: {
    position: "absolute",
    bottom: "-30%",
    left: "-18%",
    width: 470,
    height: 470,
    borderRadius: 235,
    backgroundColor: "#087F86",
    opacity: 0.58,
  },
  wave: {
    position: "absolute",
    left: "-18%",
    width: "136%",
    height: 100,
    borderTopWidth: 1,
    borderColor: "rgba(225, 255, 244, 0.22)",
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
  },
  waveOne: {
    top: "40%",
  },
  waveTwo: {
    top: "61%",
    opacity: 0.72,
    transform: [{ rotate: "4deg" }],
  },
  waveThree: {
    top: "86%",
    opacity: 0.62,
    transform: [{ rotate: "-3deg" }],
  },
  map: {
    position: "absolute",
    width: 230,
    height: "86%",
    right: "1%",
    top: "5%",
    opacity: 0.2,
  },
  route: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderColor: "rgba(239, 255, 246, 0.42)",
    borderStyle: "dashed",
  },
  busRoute: {
    top: "27%",
  },
  boatRoute: {
    top: "76%",
    borderColor: "rgba(255, 238, 174, 0.42)",
  },
  vehicle: {
    position: "absolute",
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "rgba(5, 75, 80, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.42)",
  },
  bus: {
    top: "25%",
  },
  boat: {
    top: "74%",
  },
  islandMarker: {
    position: "absolute",
    top: "48%",
    right: "25%",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E4FFF1",
    backgroundColor: "rgba(228, 255, 241, 0.18)",
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD166",
    borderWidth: 1,
    borderColor: "#FFF3C4",
  },
});
