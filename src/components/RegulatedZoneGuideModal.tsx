import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '@/i18n';
import { REGULATED_ZONES } from '@/constants/zones';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectZone?: (presetLocation: string, fare: number) => void;
}

export default function RegulatedZoneGuideModal({ visible, onClose, onSelectZone }: Props) {
  const { language, t } = useLanguageStore();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="pricetags" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Ofisel Fia blong Transpot</Text>
              <Text style={styles.subtitle}>Regulated Zone Fares • Republic of Vanuatu</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#8E8E93" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {REGULATED_ZONES.map((zone) => {
              const zoneName = language === 'bi' ? zone.nameBi : language === 'fr' ? zone.nameFr : zone.name;
              const desc = language === 'bi' ? zone.descriptionBi : zone.description;

              return (
                <View key={zone.id} style={styles.zoneCard}>
                  <View style={styles.zoneHeader}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{zone.id.replace('_', ' ')}</Text>
                    </View>
                    <Text style={styles.fareTag}>{zone.busFare} VT / seat</Text>
                  </View>

                  <Text style={styles.zoneTitle}>{zoneName}</Text>
                  <Text style={styles.zoneDesc}>{desc}</Text>

                  <View style={styles.ratesRow}>
                    <Text style={styles.rateDetail}>Bus: {zone.busFare} VT</Text>
                    <Text style={styles.rateDetail}>Taxi: {zone.taxiMinFare} - {zone.taxiMaxFare} VT</Text>
                  </View>

                  <Text style={styles.presetsLabel}>Ol ples we i stap insaed long zon ya:</Text>
                  <View style={styles.pillsWrap}>
                    {zone.presets.map((preset, idx) => (
                      <Pressable
                        key={idx}
                        style={styles.presetPill}
                        onPress={() => {
                          if (onSelectZone) {
                            onSelectZone(preset, zone.busFare);
                            onClose();
                          }
                        }}
                      >
                        <Text style={styles.presetText}>{preset}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '85%',
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#167D5A',
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
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scroll: {
    gap: 14,
    paddingBottom: 20,
  },
  zoneCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#167D5A',
  },
  fareTag: {
    fontSize: 15,
    fontWeight: '800',
    color: '#167D5A',
  },
  zoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  zoneDesc: {
    fontSize: 13,
    color: '#48484A',
    marginBottom: 10,
    lineHeight: 18,
  },
  ratesRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  rateDetail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  presetsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 6,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetText: {
    fontSize: 11,
    color: '#1C1C1E',
    fontWeight: '500',
  },
});
