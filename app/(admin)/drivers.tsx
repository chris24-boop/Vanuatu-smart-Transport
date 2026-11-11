import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTransportStore } from '@/store/transportStore';
import { DriverApplicant } from '@/types/transport';
import { DriverVerificationStatus } from '@/types/user';
import VanuatuScreenBackground from '@/components/VanuatuScreenBackground';
import {
  getDriverDocumentApi,
  reviewDriverDocumentApi,
} from '@/api/admin';
import { confirmAdminAction, showAdminMessage } from '@/utils/adminDialogs';

type FilterTab = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
type ReviewAction = 'REJECT_DRIVER' | 'SUSPEND_DRIVER' | 'REJECT_DOCUMENT';

export default function AdminDriversScreen() {
  const { drivers, verifyDriver, rejectDriver, suspendDriver, fetchDrivers } = useTransportStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialog, setDialog] = useState<{ driver: DriverApplicant; action: ReviewAction; documentId?: string } | null>(null);
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    void fetchDrivers().catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Unable to load driver applications.');
    });
  }, [fetchDrivers]);

  const pendingCount = drivers.filter(
    (d) => d.verificationStatus === DriverVerificationStatus.PENDING_VERIFICATION
  ).length;

  const filteredDrivers = drivers.filter((driver) => {
    // Tab filter
    if (activeTab === 'PENDING' && driver.verificationStatus !== DriverVerificationStatus.PENDING_VERIFICATION) {
      return false;
    }
    if (activeTab === 'VERIFIED' && driver.verificationStatus !== DriverVerificationStatus.VERIFIED) {
      return false;
    }
    if (activeTab === 'REJECTED' && driver.verificationStatus !== DriverVerificationStatus.REJECTED) {
      return false;
    }
    if (activeTab === 'SUSPENDED' && driver.verificationStatus !== DriverVerificationStatus.SUSPENDED) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = driver.fullName.toLowerCase().includes(q);
      const matchPlate = driver.vehiclePlate.toLowerCase().includes(q);
      const matchLicence = driver.licenceNumber.toLowerCase().includes(q);
      const matchIsland = driver.island?.toLowerCase().includes(q) ?? false;
      return matchName || matchPlate || matchLicence || matchIsland;
    }

    return true;
  });

  const handleVerify = async (driver: DriverApplicant) => {
    const confirmed = await confirmAdminAction(
      'Verify driver',
      `Approve ${driver.fullName}? The licence and vehicle registration must both be approved first.`,
    );
    if (!confirmed) return;
    try {
      await verifyDriver(driver.userId);
      await fetchDrivers();
      showAdminMessage('Driver verified', `${driver.fullName} is now verified.`);
    } catch (error) {
      showAdminMessage('Could not verify driver', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleReject = (driver: DriverApplicant) => {
    setReason('');
    setDialogError('');
    setDialog({ driver, action: 'REJECT_DRIVER' });
  };

  const handleSuspend = (driver: DriverApplicant) => {
    setReason('');
    setDialogError('');
    setDialog({ driver, action: 'SUSPEND_DRIVER' });
  };

  const handleReviewDocument = async (
    driver: DriverApplicant,
    documentId: string,
    status: 'APPROVED' | 'REJECTED',
  ) => {
    if (status === 'REJECTED') {
      setReason('');
      setDialogError('');
      setDialog({ driver, action: 'REJECT_DOCUMENT', documentId });
      return;
    }
    try {
      await reviewDriverDocumentApi(driver.userId, documentId, 'APPROVED');
      await fetchDrivers();
    } catch (error) {
      showAdminMessage('Could not review document', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const openDocument = async (driver: DriverApplicant, documentId: string) => {
    if (Platform.OS !== 'web') {
      showAdminMessage('Document preview', 'Open the admin portal in a browser to preview verification documents.');
      return;
    }
    try {
      const file = await getDriverDocumentApi(driver.userId, documentId);
      const url = window.URL.createObjectURL(file);
      const viewer = window.open(url, '_blank', 'noopener,noreferrer');
      if (!viewer) showAdminMessage('Pop-up blocked', 'Allow pop-ups to preview this document.');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      showAdminMessage('Could not open document', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const submitReason = async () => {
    const trimmedReason = reason.trim();
    if (!dialog || !trimmedReason) {
      setDialogError('Enter a reason to continue.');
      return;
    }
    setIsSubmitting(true);
    setDialogError('');
    try {
      if (dialog.action === 'REJECT_DRIVER') {
        await rejectDriver(dialog.driver.userId, trimmedReason);
      } else if (dialog.action === 'SUSPEND_DRIVER') {
        await suspendDriver(dialog.driver.userId, trimmedReason);
      } else if (dialog.documentId) {
        await reviewDriverDocumentApi(dialog.driver.userId, dialog.documentId, 'REJECTED', trimmedReason);
      }
      await fetchDrivers();
      setDialog(null);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Unable to save this review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <VanuatuScreenBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {loadError ? (
          <Pressable onPress={() => {
            setLoadError('');
            void fetchDrivers().catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Unable to load drivers.'));
          }} style={styles.loadError}>
            <Text style={styles.loadErrorText}>{loadError} · Tap to retry</Text>
          </Pressable>
        ) : null}
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Driver Verification</Text>
          <Text style={styles.subtitle}>
            Review licence documentation and approve driver registrations
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by driver name, plate, licence..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8E8E93" />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <Pressable
            style={[styles.tab, activeTab === 'PENDING' && styles.tabActive]}
            onPress={() => setActiveTab('PENDING')}
          >
            <Text style={[styles.tabText, activeTab === 'PENDING' && styles.tabTextActive]}>
              Pending Approval
            </Text>
            {pendingCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'VERIFIED' && styles.tabActive]}
            onPress={() => setActiveTab('VERIFIED')}
          >
            <Text style={[styles.tabText, activeTab === 'VERIFIED' && styles.tabTextActive]}>
              Verified
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'SUSPENDED' && styles.tabActive]}
            onPress={() => setActiveTab('SUSPENDED')}
          >
            <Text style={[styles.tabText, activeTab === 'SUSPENDED' && styles.tabTextActive]}>
              Suspended
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'REJECTED' && styles.tabActive]}
            onPress={() => setActiveTab('REJECTED')}
          >
            <Text style={[styles.tabText, activeTab === 'REJECTED' && styles.tabTextActive]}>
              Rejected
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'ALL' && styles.tabActive]}
            onPress={() => setActiveTab('ALL')}
          >
            <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
              All ({drivers.length})
            </Text>
          </Pressable>
        </View>

        {/* Driver List */}
        {filteredDrivers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={44} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Drivers Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'PENDING'
                ? 'All driver registration requests have been addressed.'
                : 'No driver records matching the filter criteria.'}
            </Text>
          </View>
        ) : (
          filteredDrivers.map((driver) => {
            const isPending =
              driver.verificationStatus === DriverVerificationStatus.PENDING_VERIFICATION;
            const isVerified =
              driver.verificationStatus === DriverVerificationStatus.VERIFIED;
            const isRejected =
              driver.verificationStatus === DriverVerificationStatus.REJECTED;

            return (
              <View key={driver.id} style={styles.driverCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarInitial}>
                      {driver.fullName.charAt(0)}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.driverName}>{driver.fullName}</Text>
                      {isVerified && (
                        <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                      )}
                    </View>
                    <Text style={styles.phoneText}>📞 {driver.phone}</Text>
                    {driver.email ? (
                      <Text style={styles.emailText}>✉️ {driver.email}</Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isPending && styles.statusPillPending,
                      isVerified && styles.statusPillVerified,
                      !isPending && !isVerified && styles.statusPillSuspended,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isPending && styles.statusPillTextPending,
                        isVerified && styles.statusPillTextVerified,
                        !isPending && !isVerified && styles.statusPillTextSuspended,
                      ]}
                    >
                      {driver.verificationStatus.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Info Grid */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>VEHICLE</Text>
                    <Text style={styles.infoValue}>
                      {driver.vehicleType} • {driver.vehiclePlate}
                    </Text>
                    <Text style={styles.infoSub}>{driver.vehicleModel}</Text>
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>LICENCE</Text>
                    <Text style={styles.infoValue}>{driver.licenceNumber}</Text>
                    <Text style={styles.infoSub}>Exp: {driver.licenceExpiry}</Text>
                  </View>
                </View>

                <View style={styles.locationFooter}>
                  <Ionicons name="location-outline" size={14} color="#8E8E93" />
                  <Text style={styles.locationText}>{driver.island || 'Island not provided'}</Text>
                  <Text style={styles.appliedDate}>Applied: {driver.appliedDate}</Text>
                </View>

                <View style={styles.reviewDetails}>
                  <Text style={styles.reviewDetailsText}>
                    Experience: {driver.yearsExperience == null ? 'Not provided' : `${driver.yearsExperience} years`} · Licence expires: {driver.licenceExpiry || 'Not provided'}
                  </Text>
                  {driver.rejectionReason ? (
                    <Text style={styles.reviewReasonText}>Rejection reason: {driver.rejectionReason}</Text>
                  ) : null}
                  {driver.suspensionReason ? (
                    <Text style={styles.reviewReasonText}>Suspension reason: {driver.suspensionReason}</Text>
                  ) : null}
                </View>

                <View style={styles.documentsPanel}>
                  <Text style={styles.documentsHeading}>Submitted documents</Text>
                  {driver.documents.length === 0 ? (
                    <Text style={styles.documentEmpty}>No documents submitted. Verification is blocked until a licence and vehicle registration are reviewed.</Text>
                  ) : driver.documents.map((document) => (
                    <View key={document.id} style={styles.documentRow}>
                      <Pressable onPress={() => void openDocument(driver, document.id)} style={styles.documentLink}>
                        <Text style={styles.documentLinkText}>{document.type.replace('_', ' ')} · {document.filename}</Text>
                      </Pressable>
                      <Text style={styles.documentStatus}>{document.status}</Text>
                      {document.status === 'PENDING' ? (
                        <>
                          <Pressable onPress={() => void handleReviewDocument(driver, document.id, 'APPROVED')}>
                            <Text style={styles.documentApprove}>Approve</Text>
                          </Pressable>
                          <Pressable onPress={() => handleReviewDocument(driver, document.id, 'REJECTED')}>
                            <Text style={styles.documentReject}>Reject</Text>
                          </Pressable>
                        </>
                      ) : null}
                      {document.reviewReason ? <Text style={styles.documentReason}>{document.reviewReason}</Text> : null}
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {isPending ? (
                    <>
                      <Pressable
                        style={styles.acceptButton}
                        onPress={() => handleVerify(driver)}
                      >
                        <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                        <Text style={styles.acceptButtonText}>Accept Registration</Text>
                      </Pressable>

                      <Pressable
                        style={styles.rejectButton}
                        onPress={() => handleReject(driver)}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </Pressable>
                    </>
                  ) : isVerified ? (
                    <Pressable
                      style={styles.suspendButton}
                      onPress={() => handleSuspend(driver)}
                    >
                      <Ionicons name="ban-outline" size={15} color="#FF3B30" />
                      <Text style={styles.suspendButtonText}>Suspend Licence</Text>
                    </Pressable>
                  ) : isRejected ? (
                    <Text style={styles.rejectedNotice}>Waiting for replacement documents from the driver.</Text>
                  ) : (
                    <Pressable
                      style={styles.acceptButton}
                      onPress={() => {
                        void verifyDriver(driver.userId).catch(() => {
                          showAdminMessage('Error', 'Unable to reactivate this driver right now.');
                        });
                      }}
                    >
                      <Ionicons name="refresh" size={15} color="#FFFFFF" />
                      <Text style={styles.acceptButtonText}>Re-activate Driver</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={dialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDialog(null)}
      >
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>
              {dialog?.action === 'SUSPEND_DRIVER' ? 'Suspend driver' : dialog?.action === 'REJECT_DOCUMENT' ? 'Reject document' : 'Reject driver application'}
            </Text>
            <Text style={styles.dialogSubtitle}>
              Provide a reason. It will be saved with the review record.
            </Text>
            <TextInput
              style={styles.reasonInput}
              multiline
              value={reason}
              onChangeText={setReason}
              placeholder="Explain what needs attention"
              maxLength={500}
            />
            {dialogError ? <Text style={styles.dialogError}>{dialogError}</Text> : null}
            <View style={styles.dialogActions}>
              <Pressable disabled={isSubmitting} onPress={() => setDialog(null)} style={styles.dialogCancel}>
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={isSubmitting} onPress={() => void submitReason()} style={styles.dialogConfirm}>
                {isSubmitting
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={styles.dialogConfirmText}>Save review</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 50, width: '100%', maxWidth: 1180, alignSelf: 'center' },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#1C1C1E' },
  subtitle: { fontSize: 13, color: '#636366', marginTop: 3 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1C1C1E' },

  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tabActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  tabText: { fontSize: 12, fontWeight: '600', color: '#636366' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  tabBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tabBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  loadError: { backgroundColor: '#FFF1F0', padding: 14, borderRadius: 10, marginBottom: 12 },
  loadErrorText: { color: '#B42318', fontWeight: '600' },

  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  emptySubtitle: { fontSize: 13, color: '#8E8E93', textAlign: 'center' },

  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#FF9500' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  phoneText: { fontSize: 12, color: '#636366', marginTop: 2 },
  emailText: { fontSize: 11, color: '#8E8E93', marginTop: 1 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillPending: { backgroundColor: '#FFF3E0' },
  statusPillVerified: { backgroundColor: '#E8F8EE' },
  statusPillSuspended: { backgroundColor: '#FFEBEA' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  statusPillTextPending: { color: '#FF9500' },
  statusPillTextVerified: { color: '#34C759' },
  statusPillTextSuspended: { color: '#FF3B30' },

  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 10,
    marginVertical: 12,
  },
  infoBox: { flex: 1 },
  infoLabel: { fontSize: 9, fontWeight: '700', color: '#8E8E93', marginBottom: 2 },
  infoValue: { fontSize: 12, fontWeight: '700', color: '#1C1C1E' },
  infoSub: { fontSize: 11, color: '#636366', marginTop: 2 },

  locationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 10,
  },
  locationText: { fontSize: 12, color: '#636366', fontWeight: '500', flex: 1 },
  appliedDate: { fontSize: 11, color: '#8E8E93' },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  reviewDetails: { backgroundColor: '#F9F9FB', borderRadius: 10, padding: 10, marginBottom: 12, gap: 5 },
  reviewDetailsText: { color: '#475467', fontSize: 12 },
  reviewReasonText: { color: '#B42318', fontSize: 12 },
  documentsPanel: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12, marginBottom: 12 },
  documentsHeading: { color: '#1C1C1E', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  documentEmpty: { color: '#667085', fontSize: 12, lineHeight: 18 },
  documentRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingVertical: 9 },
  documentLink: { flex: 1, minWidth: 180 },
  documentLinkText: { color: '#0A84FF', fontSize: 12, fontWeight: '600' },
  documentStatus: { color: '#667085', fontSize: 11, fontWeight: '700' },
  documentApprove: { color: '#16803C', fontWeight: '700', fontSize: 12 },
  documentReject: { color: '#B42318', fontWeight: '700', fontSize: 12 },
  documentReason: { width: '100%', color: '#B42318', fontSize: 12 },
  rejectedNotice: { color: '#B42318', fontSize: 12, paddingVertical: 8 },
  dialogBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialogCard: { width: '100%', maxWidth: 480, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, gap: 12 },
  dialogTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E' },
  dialogSubtitle: { color: '#667085', lineHeight: 20 },
  reasonInput: { minHeight: 110, textAlignVertical: 'top', borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 10, padding: 12, color: '#1C1C1E' },
  dialogError: { color: '#B42318', fontSize: 13 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  dialogCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  dialogCancelText: { color: '#344054', fontWeight: '700' },
  dialogConfirm: { backgroundColor: '#B42318', minWidth: 110, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingVertical: 10, paddingHorizontal: 16 },
  dialogConfirmText: { color: '#FFFFFF', fontWeight: '700' },
  acceptButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  rejectButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: { color: '#FF3B30', fontSize: 13, fontWeight: '600' },
  suspendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD1D1',
    backgroundColor: '#FFF5F5',
  },
  suspendButtonText: { color: '#FF3B30', fontSize: 12, fontWeight: '600' },
});
