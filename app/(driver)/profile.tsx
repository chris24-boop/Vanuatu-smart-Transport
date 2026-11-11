import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/Button';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadDriverDocumentApi, listDriverDocumentsApi } from '@/api/driverDocuments';
import { DriverDocumentItem, DriverDocumentType } from '@/types/transport';
import { DriverVerificationStatus } from '@/types/user';
import { confirmAdminAction } from '@/utils/adminDialogs';

export default function DriverProfileScreen() {
  const { user, logout } = useAuthStore();
  const [documents, setDocuments] = useState<DriverDocumentItem[]>(user?.driverDocuments ?? []);
  const [uploadingType, setUploadingType] = useState<DriverDocumentType | null>(null);
  const [documentMessage, setDocumentMessage] = useState('');

  useEffect(() => {
    void listDriverDocumentsApi()
      .then(setDocuments)
      .catch((error: unknown) => {
        setDocumentMessage(error instanceof Error ? error.message : 'Could not load verification documents.');
      });
  }, []);

  const uploadDocument = async (type: DriverDocumentType) => {
    setDocumentMessage('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        base64: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset || !asset.mimeType || !['application/pdf', 'image/jpeg', 'image/png'].includes(asset.mimeType)) {
        throw new Error('Choose a PDF, JPEG, or PNG document.');
      }
      if (asset.size !== undefined && asset.size > 5 * 1024 * 1024) {
        throw new Error('The selected document must be no larger than 5 MB.');
      }

      setUploadingType(type);
      const contentBase64 = asset.base64 ?? await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const document = await uploadDriverDocumentApi({
        type,
        filename: asset.name,
        mimeType: asset.mimeType,
        contentBase64,
      });
      setDocuments((current) => [document, ...current]);
      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              driverDocuments: [document, ...(state.user.driverDocuments ?? [])],
              ...(state.user.driverVerificationStatus === 'REJECTED'
                ? { driverVerificationStatus: DriverVerificationStatus.PENDING_VERIFICATION, driverRejectionReason: null }
                : {}),
            }
          : null,
      }));
      setDocumentMessage('Document uploaded. It is now waiting for admin review.');
    } catch (error) {
      setDocumentMessage(error instanceof Error ? error.message : 'Document upload failed. Please try again.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleLogout = async () => {
    if (await confirmAdminAction('Logout', 'Are you sure you want to log out?')) {
      await logout();
    }
  };

  const isVerified = user?.driverVerificationStatus === 'VERIFIED';
  const isSuspended = user?.driverVerificationStatus === 'SUSPENDED';

  const vehicleEmoji =
    user?.vehicleType === 'TAXI'
      ? ''
      : user?.vehicleType === 'PUBLIC_TRANSPORT'
      ? '🚌'
      : user?.vehicleType === 'MINIBUS' || user?.vehicleType === 'BUS'
      ? '🚌'
      : '🚗';

  const verificationText = isVerified
    ? 'Verified Driver'
    : isSuspended
    ? 'Suspended'
    : user?.driverVerificationStatus === 'REJECTED'
      ? 'Action Required'
    : 'Pending Approval';

  const verificationColor = isVerified
    ? '#34C759'
    : isSuspended || user?.driverVerificationStatus === 'REJECTED'
    ? '#FF3B30'
    : '#FF9500';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <VanuatuScreenBackground />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{vehicleEmoji}</Text>
        </View>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>









        
        <Text style={styles.role}>
          {user?.vehicleType
            ? `${user.vehicleType === 'MINIBUS' ? 'BUS' : user.vehicleType === 'PUBLIC_TRANSPORT' ? 'Public Transport' : user.vehicleType} Driver`
            : 'Land Transport Driver'}
        </Text>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Licence Status</Text>
            <Text style={[styles.infoValue, { color: verificationColor, fontWeight: '700' }]}>
              {verificationText}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Driver Licence #</Text>
            <Text style={styles.infoValue}>{user?.licenceNumber || 'VT-DRV-PENDING'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehicle Type</Text>
            <Text style={styles.infoValue}>
              {user?.vehicleType === 'MINIBUS'
                ? 'BUS'
                : user?.vehicleType === 'PUBLIC_TRANSPORT'
                  ? 'Public Transport'
                  : user?.vehicleType || 'TAXI'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Number Plate</Text>
            <Text style={styles.infoValue}>{user?.vehiclePlate || '—'}</Text>
          </View>
          {user?.vehicleModel ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vehicle Model</Text>
              <Text style={styles.infoValue}>{user.vehicleModel}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user?.phone || '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.lastRow]}>
            <Text style={styles.infoLabel}>Island Region</Text>
            <Text style={styles.infoValue}>{user?.island || 'Efate (Port Vila)'}</Text>
          </View>
          {user?.yearsExperience !== null && user?.yearsExperience !== undefined ? (
            <View style={[styles.infoRow, styles.lastRow]}>
              <Text style={styles.infoLabel}>Driving Experience</Text>
              <Text style={styles.infoValue}>{user.yearsExperience} years</Text>
            </View>
          ) : null}
        </View>

        {user?.driverRejectionReason ? (
          <View style={styles.rejectionNotice}>
            <Text style={styles.rejectionTitle}>Changes requested</Text>
            <Text style={styles.rejectionText}>{user.driverRejectionReason}</Text>
          </View>
        ) : null}

        <View style={styles.documentsSection}>
          <Text style={styles.documentsTitle}>Verification documents</Text>
          <Text style={styles.documentsSubtitle}>Upload clear PDFs or photos (up to 5 MB each).</Text>
          {([
            ['LICENCE', 'Driver licence'],
            ['VEHICLE_REGISTRATION', 'Vehicle registration'],
            ['INSURANCE', 'Vehicle insurance (optional)'],
          ] as const).map(([type, title]) => {
            const latest = documents.find((document) => document.type === type);
            return (
              <View key={type} style={styles.documentRow}>
                <View style={styles.documentDetails}>
                  <Text style={styles.documentName}>{title}</Text>
                  <Text style={styles.documentStatus}>
                    {latest ? `${latest.status}${latest.reviewReason ? ` · ${latest.reviewReason}` : ''}` : 'Not uploaded'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={uploadingType !== null}
                  onPress={() => void uploadDocument(type)}
                  style={styles.uploadButton}
                >
                  {uploadingType === type
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={styles.uploadButtonText}>{latest ? 'Replace' : 'Upload'}</Text>}
                </Pressable>
              </View>
            );
          })}
          {documentMessage ? <Text style={styles.documentMessage}>{documentMessage}</Text> : null}
        </View>

        <Button
          title="Log Out"
          onPress={handleLogout}
          variant="outline"
          style={{ marginTop: 32 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 40,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F4FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarEmoji: { fontSize: 40 },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#0A84FF',
    fontWeight: '600',
    marginBottom: 32,
  },
  infoSection: {
    width: '100%',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  infoLabel: { fontSize: 15, color: '#8E8E93' },
  infoValue: { fontSize: 15, fontWeight: '500', color: '#1C1C1E' },
  rejectionNotice: {
    width: '100%',
    backgroundColor: '#FFF1F0',
    borderColor: '#FFCCC7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  rejectionTitle: { color: '#B42318', fontWeight: '700', marginBottom: 4 },
  rejectionText: { color: '#7A271A', lineHeight: 20 },
  documentsSection: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  documentsTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  documentsSubtitle: { color: '#636366', marginTop: 4, marginBottom: 12 },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingVertical: 12,
    gap: 12,
  },
  documentDetails: { flex: 1 },
  documentName: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  documentStatus: { fontSize: 12, color: '#636366', marginTop: 3 },
  uploadButton: { backgroundColor: '#0A84FF', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  uploadButtonText: { color: '#FFFFFF', fontWeight: '700' },
  documentMessage: { color: '#344054', marginTop: 10, lineHeight: 20 },
});
