import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '@/i18n';
import { useTransportStore } from '@/store/transportStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  driverName: string;
  vehiclePlate: string;
}

export default function DriverRatingModal({
  visible,
  onClose,
  bookingId,
  driverName,
  vehiclePlate,
}: Props) {
  const { t } = useLanguageStore();
  const { rateBooking } = useTransportStore();

  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const TAGS = [
    { id: 'SAFE', label: t('tagSafe') },
    { id: 'CLEAN', label: t('tagClean') },
    { id: 'FAIR', label: t('tagFair') },
    { id: 'PUNCTUAL', label: t('tagPunctual') },
  ];

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const fullComment = [
        selectedTags.map((tagId) => TAGS.find((tg) => tg.id === tagId)?.label).filter(Boolean).join(' | '),
        comment.trim(),
      ]
        .filter(Boolean)
        .join(' - ');

      await rateBooking(bookingId, rating, fullComment);
      setIsSubmitting(false);
      Alert.alert(t('success'), t('ratingSuccess'));
      onClose();
    } catch (error: any) {
      setIsSubmitting(false);
      Alert.alert(t('error'), error?.message || 'Unable to submit rating.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <Text style={styles.title}>{t('rateDriverTitle')}</Text>
          <Text style={styles.subtitle}>
            {driverName} • {vehiclePlate}
          </Text>

          {/* Star Rating Row */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= rating ? '#FF9500' : '#D1D1D6'}
                />
              </Pressable>
            ))}
          </View>
          <Text style={styles.ratingLabel}>{t('starRating', { stars: rating })}</Text>

          {/* Feedback Tags */}
          <View style={styles.tagsContainer}>
            {TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <Pressable
                  key={tag.id}
                  style={[styles.tagPill, isSelected && styles.tagPillActive]}
                  onPress={() => toggleTag(tag.id)}
                >
                  <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
                    {tag.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Comment text input */}
          <TextInput
            style={styles.commentInput}
            placeholder={t('reviewCommentPlaceholder')}
            placeholderTextColor="#8E8E93"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{t('submitRating')}</Text>
              )}
            </Pressable>
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
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9500',
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 14,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tagPillActive: {
    backgroundColor: '#E8F5EE',
    borderColor: '#167D5A',
  },
  tagText: {
    fontSize: 12,
    color: '#48484A',
    fontWeight: '500',
  },
  tagTextActive: {
    color: '#167D5A',
    fontWeight: '700',
  },
  commentInput: {
    width: '100%',
    height: 70,
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: '#1C1C1E',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#167D5A',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
