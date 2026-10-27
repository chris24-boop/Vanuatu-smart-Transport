import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '@/i18n';
import { useTransportStore } from '@/store/transportStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  defaultVehiclePlate?: string;
  defaultDriverName?: string;
}

export default function ReportIncidentModal({
  visible,
  onClose,
  defaultVehiclePlate,
  defaultDriverName,
}: Props) {
  const { t } = useLanguageStore();
  const { reportIncident } = useTransportStore();

  const [category, setCategory] = useState<string>('OVERCHARGING');
  const [vehiclePlate, setVehiclePlate] = useState(defaultVehiclePlate || '');
  const [driverName, setDriverName] = useState(defaultDriverName || '');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const CATEGORIES = [
    { id: 'OVERCHARGING', label: t('catOvercharging'), icon: 'cash-outline' },
    { id: 'RECKLESS_DRIVING', label: t('catReckless'), icon: 'speedometer-outline' },
    { id: 'UNLICENSED_VEHICLE', label: t('catUnlicensed'), icon: 'alert-circle-outline' },
    { id: 'HARASSMENT', label: t('catHarassment'), icon: 'hand-left-outline' },
    { id: 'VEHICLE_CONDITION', label: t('catCondition'), icon: 'build-outline' },
    { id: 'OTHER', label: t('catOther'), icon: 'ellipsis-horizontal-circle-outline' },
  ];

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert(t('error'), 'Plis eksplenem smol wanem problem we i hapen.');
      return;
    }

    setIsSubmitting(true);
    try {
      await reportIncident({
        category,
        vehiclePlate: vehiclePlate.trim(),
        driverName: driverName.trim(),
        location: location.trim(),
        description: description.trim(),
      });

      setIsSubmitting(false);
      Alert.alert(t('success'), t('reportSuccess'));
      setDescription('');
      setLocation('');
      onClose();
    } catch (error: any) {
      setIsSubmitting(false);
      Alert.alert(t('error'), error?.message || 'Unable to submit report.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('reportIncidentTitle')}</Text>
              <Text style={styles.subtitle}>{t('reportSubtitle')}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#8E8E93" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
            {/* Category selection */}
            <Text style={styles.fieldLabel}>{t('incidentCategory')}</Text>
            <View style={styles.categoryPills}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={15}
                      color={isSelected ? '#FFFFFF' : '#48484A'}
                    />
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Vehicle Plate */}
            <Text style={styles.fieldLabel}>{t('vehiclePlate')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. B 1245 o T 560"
              placeholderTextColor="#8E8E93"
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              autoCapitalize="characters"
            />

            {/* Driver Name */}
            <Text style={styles.fieldLabel}>{t('driverName')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John K."
              placeholderTextColor="#8E8E93"
              value={driverName}
              onChangeText={setDriverName}
            />

            {/* Incident Location */}
            <Text style={styles.fieldLabel}>{t('incidentLocation')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Freswota 4, Mele Road, Port Vila Market..."
              placeholderTextColor="#8E8E93"
              value={location}
              onChangeText={setLocation}
            />

            {/* Detailed Description */}
            <Text style={styles.fieldLabel}>{t('incidentDetails')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Eksplenem wanem we i hapen, fia we drayva i askem, o wanem fasin we i no stret..."
              placeholderTextColor="#8E8E93"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            {/* Submit Button */}
            <Pressable
              style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>{t('submitReport')}</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: '#D1D1D6',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF9500',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  form: {
    paddingBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 12,
    marginBottom: 6,
  },
  categoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    gap: 6,
  },
  categoryPillActive: {
    backgroundColor: '#FF9500',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#48484A',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C1C1E',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C92A2A',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 18,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
