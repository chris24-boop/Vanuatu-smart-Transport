
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

interface SplashScreenProps {
  onLayout: (event: LayoutChangeEvent) => void;
}

export default function SplashScreen({
  onLayout,
}: SplashScreenProps) {
  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Decorative background */}
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />
      <View style={styles.orbit} />
      <View style={styles.orbitInner} />

      <View style={styles.content}>
        {/* Brand logo */}
        <View style={styles.brandContainer}>
          <View style={styles.logo}>
            <Ionicons
              name="bus"
              size={46}
              color="#FFFFFF"
            />

            <View style={styles.pinBadge}>
              <Ionicons
                name="location"
                size={17}
                color="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.brandCaption}>
            <View style={styles.brandLine} />
            <Text style={styles.brandCaptionText}>
              ISLAND MOBILITY
            </Text>
            <View style={styles.brandLine} />
          </View>
        </View>

        {/* Vanuatu map */}
        <View style={styles.mapContainer}>
          <View style={styles.mapGlow} />

          <Image
            source={require('@/assets/images/vanuatu-map.png')}
            resizeMode="contain"
            style={styles.map}
            accessible={false}
          />

          <View style={styles.mapMarker}>
            <Ionicons
              name="navigate"
              size={15}
              color="#FFFFFF"
            />
          </View>
        </View>

        {/* App title */}
        <View style={styles.heading}>
          <Text style={styles.title}>VANUATU</Text>

          <Text style={styles.subtitle}>
            SMART TRANSPORT
          </Text>
        </View>

        <Text style={styles.tagline}>
          Your islands, connected.
        </Text>

        <Text style={styles.description}>
          BUS  ·  TAXI  ·  CARGO  ·  JOURNEYS
        </Text>

        {/* Loading state */}
        <View style={styles.loadingSection}>
          <View style={styles.loadingTrack}>
            <View style={styles.loadingProgress} />
          </View>

          <View style={styles.loadingRow}>
            <ActivityIndicator
              size="small"
              color="#0D705B"
            />

            <Text style={styles.loadingText}>
              Preparing your journey
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLine} />

        <Text style={styles.footerText}>
          MADE FOR VANUATU
        </Text>

        <View style={styles.footerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#F8FBF9',
    zIndex: 10,
    elevation: 10,
  },

  topGlow: {
    position: 'absolute',
    top: -180,
    right: -150,
    width: 390,
    height: 390,
    borderRadius: 195,
    backgroundColor: '#DDEFE7',
    opacity: 0.75,
  },

  bottomGlow: {
    position: 'absolute',
    bottom: -220,
    left: -170,
    width: 430,
    height: 430,
    borderRadius: 215,
    backgroundColor: '#E5F1EA',
    opacity: 0.9,
  },

  orbit: {
    position: 'absolute',
    width: 310,
    height: 310,
    borderRadius: 155,
    borderWidth: 1,
    borderColor: 'rgba(13,112,91,0.07)',
  },

  orbitInner: {
    position: 'absolute',
    width: 255,
    height: 255,
    borderRadius: 128,
    borderWidth: 1,
    borderColor: 'rgba(13,112,91,0.05)',
  },

  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: -8,
  },

  brandContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },

  logo: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D705B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#0D705B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 9,
  },

  pinBadge: {
    position: 'absolute',
    right: -9,
    bottom: -5,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 3,
    borderColor: '#F8FBF9',
    backgroundColor: '#D4A545',
  },

  brandCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 19,
  },

  brandLine: {
    width: 22,
    height: 1,
    backgroundColor: '#B8D5C8',
  },

  brandCaptionText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#678478',
  },

  mapContainer: {
    width: 170,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  mapGlow: {
    position: 'absolute',
    width: 130,
    height: 180,
    borderRadius: 65,
    backgroundColor: '#E7F3EC',
  },

  map: {
    width: 145,
    height: 215,
  },

  mapMarker: {
    position: 'absolute',
    right: 10,
    top: 40,
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A545',
    borderWidth: 3,
    borderColor: '#F8FBF9',
  },

  heading: {
    alignItems: 'center',
    marginTop: 4,
  },

  title: {
    color: '#173D33',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
  },

  subtitle: {
    marginTop: 7,
    color: '#0D705B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
  },

  tagline: {
    marginTop: 14,
    color: '#526C61',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  description: {
    marginTop: 12,
    color: '#8A9B92',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  loadingSection: {
    width: 205,
    marginTop: 32,
    alignItems: 'center',
  },

  loadingTrack: {
    width: '100%',
    height: 3,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: '#DFEAE3',
  },

  loadingProgress: {
    width: '42%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#0D705B',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 14,
  },

  loadingText: {
    color: '#687D73',
    fontSize: 12,
    fontWeight: '500',
  },

  footer: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  footerLine: {
    width: 24,
    height: 1,
    backgroundColor: '#C8DCD1',
  },

  footerText: {
    color: '#80958A',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3,
  },
});
