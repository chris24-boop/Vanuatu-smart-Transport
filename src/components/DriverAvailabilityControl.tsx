import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverAvailability } from '@/types/transport';

const OPTIONS: { status: DriverAvailability; label: string; icon: string }[] = [
  { status: 'AVAILABLE', label: 'Available', icon: 'checkmark-circle' },
  { status: 'ON_TRIP', label: 'On a Trip', icon: 'navigate' },
  { status: 'NOT_AVAILABLE', label: 'Not Available', icon: 'moon' },
];

interface DriverAvailabilityControlProps {
  status: DriverAvailability;
  onChange: (status: DriverAvailability) => void;
}

export default function DriverAvailabilityControl({
  status,
  onChange,
}: DriverAvailabilityControlProps) {
  return (
    <View style={styles.options}>
      {OPTIONS.map((option) => {
        const selected = status === option.status;
        return (
          <Pressable
            key={option.status}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.option, selected && styles.selectedOption]}
            onPress={() => onChange(option.status)}
          >
            <Ionicons
              name={option.icon as 'checkmark-circle' | 'navigate' | 'moon'}
              size={15}
              color={selected ? '#FFFFFF' : '#52525B'}
            />
            <Text style={[styles.label, selected && styles.selectedLabel]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', gap: 6 },
  option: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4D4D8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  selectedOption: { backgroundColor: '#167D5A', borderColor: '#167D5A' },
  label: { color: '#52525B', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  selectedLabel: { color: '#FFFFFF' },
});
