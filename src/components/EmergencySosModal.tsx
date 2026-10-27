import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Linking, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLanguageStore } from '@/i18n';
import { sendEmergencySosSms } from '@/utils/smsHelper';

interface Props {
  visible: boolean;
  onClose: () => void;
  activeVehiclePlate?: string;
  activeDriverName?: string;
  activeRoute?: string;
  passengerName?: string;
}

export default function EmergencySosModal({
  visible,
  onClose,
  activeVehiclePlate,
  activeDriverName,
  activeRoute,
  passengerName,
}: Props) {
  const { t } = useLanguageStore();
  const [isLocating, setIsLocating] = useState(false);

  const makeCall = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Unable to Call', `Could not place call to ${number}. Please dial manually.`);
    });
  };

  const handleSendSosSms = async () => {
    setIsLocating(true);
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }
    } catch (e) {
      console.warn('Could not read location for SOS:', e);
    } finally {
      setIsLocating(false);
    }

    const sent = await sendEmergencySosSms({
      vehiclePlate: activeVehiclePlate,
      driverName: activeDriverName,
      route: activeRoute,
      latitude: lat,
      longitude: lng,
      passengerName,
    });

    if (sent) {
      Alert.alert(t('emergencyTitle'), t('sosSmsPrepared'));
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="warning" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('emergencyTitle')}</Text>
              <Text style={styles.subtitle}>{t('emergencySubtitle')}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#8E8E93" />
            </Pressable>
          </View>

          {activeVehiclePlate ? (
            <View style={styles.vehicleContextBox}>
              <Text style={styles.contextLabel}>CURRENT VEHICLE / TRAK YA:</Text>
              <Text style={styles.contextText}>
                Plate: <Text style={styles.bold}>{activeVehiclePlate}</Text>
                {activeDriverName ? ` • Driver: ${activeDriverName}` : ''}
              </Text>
            </View>
          ) : null}

          {/* Quick Call Actions */}
          <View style={styles.actionGrid}>
            <Pressable
              style={[styles.callCard, { backgroundColor: '#FF3B30' }]}
              onPress={() => makeCall('111')}
            >
              <Ionicons name="shield" size={24} color="#FFFFFF" />
              <View style={styles.callCardText}>
                <Text style={styles.callCardTitle}>Vanuatu Police Force</Text>
                <Text style={styles.callCardNumber}>📞 111 (Toll-Free Emergency)</Text>
              </View>
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={[styles.callCard, { backgroundColor: '#0D705B' }]}
              onPress={() => makeCall('22222')}
            >
              <Ionicons name="business" size={24} color="#FFFFFF" />
              <View style={styles.callCardText}>
                <Text style={styles.callCardTitle}>Port Vila Central Police</Text>
                <Text style={styles.callCardNumber}>📞 22222 (Direct Line)</Text>
              </View>
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={[styles.callCard, { backgroundColor: '#FF9500' }]}
              onPress={() => makeCall('115')}
            >
              <Ionicons name="medical" size={24} color="#FFFFFF" />
              <View style={styles.callCardText}>
                <Text style={styles.callCardTitle}>Promedical Ambulance</Text>
                <Text style={styles.callCardNumber}>📞 115 (Emergency Care)</Text>
              </View>
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </Pressable>

            {/* GPS SMS Dispatch */}
            <Pressable
              style={[styles.callCard, styles.smsDispatchCard]}
              onPress={handleSendSosSms}
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="navigate" size={24} color="#FFFFFF" />
              )}
              <View style={styles.callCardText}>
                <Text style={styles.callCardTitle}>{t('sendSosSms')}</Text>
                <Text style={styles.callCardNumber}>📍 Auto-attaches Google Maps GPS Link</Text>
              </View>
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: '#D1D1D6',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  vehicleContextBox: {
    backgroundColor: '#FFF2F2',
    borderWidth: 1,
    borderColor: '#FFD1D1',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  contextLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C92A2A',
    letterSpacing: 0.5,
  },
  contextText: {
    fontSize: 13,
    color: '#1C1C1E',
    marginTop: 2,
  },
  bold: {
    fontWeight: '700',
  },
  actionGrid: {
    gap: 10,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  smsDispatchCard: {
    backgroundColor: '#1E293B',
  },
  callCardText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  callCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callCardNumber: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
});
