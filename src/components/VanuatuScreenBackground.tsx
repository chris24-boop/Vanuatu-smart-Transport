
import { StyleSheet, View } from 'react-native';

export default function VanuatuScreenBackground() {
  return (
    <View pointerEvents="none" style={styles.background}>
      {/* Soft island-inspired gradients */}
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      {/* Decorative concentric rings */}
      <View style={styles.outerRing} />
      <View style={styles.middleRing} />

      {/* Transport route */}
      <View style={styles.routeLine} />

      <View style={[styles.routeStop, styles.stopOne]} />
      <View style={[styles.routeStop, styles.stopTwo]} />
      <View style={[styles.routeStop, styles.stopThree]} />

      {/* Subtle island-inspired shapes */}
      <View style={styles.islandShape} />
      <View style={styles.islandAccent} />

      {/* Small decorative elements */}
      <View style={styles.accentOne} />
      <View style={styles.accentTwo} />
      <View style={styles.accentThree} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#F8FBF9',
  },

  topGlow: {
    position: 'absolute',
    top: -180,
    right: -140,
    width: 390,
    height: 390,
    borderRadius: 195,
    backgroundColor: '#DCEFE6',
    opacity: 0.72,
  },

  bottomGlow: {
    position: 'absolute',
    bottom: -220,
    left: -165,
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: '#E5F1E9',
    opacity: 0.8,
  },

  outerRing: {
    position: 'absolute',
    top: '10%',
    right: '-29%',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: 'rgba(13, 112, 91, 0.065)',
  },

  middleRing: {
    position: 'absolute',
    top: '13%',
    right: '-20%',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1,
    borderColor: 'rgba(13, 112, 91, 0.055)',
  },

  routeLine: {
    position: 'absolute',
    top: '23%',
    right: '-12%',
    width: '78%',
    borderTopWidth: 1.5,
    borderColor: 'rgba(13, 112, 91, 0.13)',
    borderStyle: 'dashed',
    transform: [{ rotate: '-25deg' }],
  },

  routeStop: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F8FBF9',
    borderWidth: 2,
    borderColor: '#0D705B',
  },

  stopOne: {
    top: '17%',
    right: '19%',
  },

  stopTwo: {
    top: '23%',
    right: '39%',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderColor: '#D4A545',
  },

  stopThree: {
    top: '29%',
    right: '59%',
    width: 7,
    height: 7,
    borderRadius: 4,
    borderColor: '#0D705B',
  },

  islandShape: {
    position: 'absolute',
    bottom: '13%',
    right: '-19%',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1,
    borderColor: 'rgba(13, 112, 91, 0.07)',
    transform: [{ scaleX: 0.7 }, { rotate: '28deg' }],
  },

  islandAccent: {
    position: 'absolute',
    bottom: '18%',
    right: '-8%',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 69, 0.10)',
    transform: [{ scaleX: 0.72 }, { rotate: '-25deg' }],
  },

  accentOne: {
    position: 'absolute',
    top: '38%',
    left: '8%',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D4A545',
    opacity: 0.55,
  },

  accentTwo: {
    position: 'absolute',
    top: '43%',
    right: '9%',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#0D705B',
    opacity: 0.18,
  },

  accentThree: {
    position: 'absolute',
    bottom: '30%',
    left: '15%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4A545',
    opacity: 0.35,
  },
});
