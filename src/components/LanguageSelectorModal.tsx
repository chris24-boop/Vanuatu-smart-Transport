import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '@/i18n';
import { SupportedLanguage } from '@/i18n/translations';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const LANGUAGES: { code: SupportedLanguage; label: string; sublabel: string; flag: string }[] = [
  { code: 'bi', label: 'Bislama', sublabel: 'Nasonal lanwis blong Vanuatu', flag: '🇻🇺' },
  { code: 'en', label: 'English', sublabel: 'Official language', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', sublabel: 'Langue officielle', flag: '🇫🇷' },
];

export default function LanguageSelectorModal({ visible, onClose }: Props) {
  const { language, setLanguage, t } = useLanguageStore();

  const handleSelect = async (code: SupportedLanguage) => {
    await setLanguage(code);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Chuusum Lanwis / Language</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#8E8E93" />
            </Pressable>
          </View>

          <View style={styles.list}>
            {LANGUAGES.map((item) => {
              const isSelected = language === item.code;
              return (
                <Pressable
                  key={item.code}
                  style={[styles.langItem, isSelected && styles.langItemActive]}
                  onPress={() => handleSelect(item.code)}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <View style={styles.textCol}>
                    <Text style={[styles.langName, isSelected && styles.langNameActive]}>
                      {item.label}
                    </Text>
                    <Text style={styles.langSub}>{item.sublabel}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color="#167D5A" />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    gap: 10,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F9F9FB',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  langItemActive: {
    borderColor: '#167D5A',
    backgroundColor: '#E8F5EE',
  },
  flag: {
    fontSize: 24,
    marginRight: 14,
  },
  textCol: {
    flex: 1,
  },
  langName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  langNameActive: {
    color: '#167D5A',
  },
  langSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
});
