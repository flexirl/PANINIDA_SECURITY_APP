import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  Modal,
  Dimensions,
  Linking,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import ClientTopNav from '../components/ClientTopNav';
import { getClientDocuments } from '../api/clientPortalService';
import { getAttendanceForPersonnel } from '../api/workforceAttendanceService';
import { resolveImageUrl } from '../utils/imageUtils';
import type { WorkforceDocument, WorkforceAttendance, WorkforcePersonnel } from '../types/workforce';
import CachedImage from '../components/CachedImage';

export default function ClientStaffDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);
  const personnel: WorkforcePersonnel = route.params?.personnel;

  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'attendance'>('details');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<WorkforceDocument[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<WorkforceAttendance[]>([]);

  // Modal State for Image/Document Viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerLoading, setViewerLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'documents' && documents.length === 0) {
      loadDocuments();
    } else if (activeTab === 'attendance' && attendanceLogs.length === 0) {
      loadAttendance();
    }
  }, [activeTab]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getClientDocuments(personnel.id);
      setDocuments(docs);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const start = new Date();
      start.setDate(1); // Start of current month
      const end = new Date();
      
      // Use date-only strings (YYYY-MM-DD) to match the DB attendance_date column type
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      const logs = await getAttendanceForPersonnel(
        personnel.id,
        startStr,
        endStr
      );
      setAttendanceLogs(logs);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const getDocDisplayName = (docType: string): string => {
    const nameMap: Record<string, string> = {
      'aadhaar_front': 'Aadhaar Front',
      'aadhaar_back': 'Aadhaar Back',
      'aadhaar': 'Aadhaar Card',
      'pan': 'PAN Card',
      'address_proof': 'PAN Card',
      'police_verification': 'Police Verification',
      'security_training': 'Security Training Certificate',
      'weapon_training': 'Weapon Training Certificate',
      'gun_license': 'Gun License',
      'ex_servicemen_proof': 'Ex-Servicemen Proof',
    };
    return nameMap[docType] || docType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const openDocument = async (url: string, title: string) => {
    // Always show documents in-app via the modal viewer
    setViewerTitle(title);
    setViewerLoading(true);
    setViewerVisible(true);
    try {
      // Resolve storage:// paths and expired signed URLs to viewable URLs
      const resolvedUrl = await resolveImageUrl(url);
      setViewerUrl(resolvedUrl || url);
    } catch (err) {
      console.error('Failed to resolve document URL:', err);
      // Fallback to original URL
      setViewerUrl(url);
    } finally {
      setViewerLoading(false);
    }
  };

  const isActive = personnel.employment_status === 'active';
  const statusLabel = personnel.employment_status === 'active' ? 'ACTIVE DUTY' :
    personnel.employment_status === 'inactive' ? 'INACTIVE' : 'TERMINATED';
  const statusColor = isActive ? Colors.successGreen : (personnel.employment_status === 'terminated' ? Colors.error : '#f59e0b');

  const initials = personnel.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  const handleCall = (phone?: string | null) => {
    if (!phone) {
      Alert.alert('No Phone', 'Phone number not available.');
      return;
    }
    const cleaned = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() =>
      Alert.alert('Error', 'Unable to open phone dialer.')
    );
  };

  const renderDetails = () => (
    <View style={s.tabContent}>
      <View style={s.detailCard}>
        <View style={s.detailRow}>
          <MaterialIcons name="person" size={24} color={Colors.primary} style={s.detailIcon} />
          <View style={s.detailTextContainer}>
            <Text style={s.detailLabel}>Name</Text>
            <Text style={s.detailValue}>{personnel.name}</Text>
          </View>
        </View>

        <View style={s.detailRow}>
          <MaterialIcons name="phone" size={24} color={Colors.primary} style={s.detailIcon} />
          <View style={s.detailTextContainer}>
            <Text style={s.detailLabel}>Phone Number</Text>
            <Text style={s.detailValue}>{personnel.phone || 'N/A'}</Text>
          </View>
        </View>

        <View style={s.detailRow}>
          <MaterialIcons name="badge" size={24} color={Colors.primary} style={s.detailIcon} />
          <View style={s.detailTextContainer}>
            <Text style={s.detailLabel}>Aadhaar Number</Text>
            <Text style={s.detailValue}>{personnel.aadhaar_number || 'N/A'}</Text>
          </View>
        </View>

        <View style={s.detailRow}>
          <MaterialIcons name="location-on" size={24} color={Colors.primary} style={s.detailIcon} />
          <View style={s.detailTextContainer}>
            <Text style={s.detailLabel}>Address</Text>
            <Text style={s.detailValue}>{personnel.address || 'N/A'}</Text>
          </View>
        </View>

        <View style={[s.detailRow, s.lastDetailRow]}>
          <MaterialIcons name="verified-user" size={24} color={personnel.police_verification ? Colors.successGreen : Colors.error} style={s.detailIcon} />
          <View style={s.detailTextContainer}>
            <Text style={s.detailLabel}>Police Verification</Text>
            <Text style={[s.detailValue, { color: personnel.police_verification ? Colors.successGreen : Colors.error }]}>
              {personnel.police_verification ? 'Verified' : 'Not Verified'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderDocuments = () => (
    <View style={s.tabContent}>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={s.loader} />
      ) : documents.length === 0 ? (
        <View style={s.emptyState}>
          <MaterialIcons name="folder-off" size={48} color={Colors.outline} />
          <Text style={s.emptyStateText}>No documents uploaded yet.</Text>
        </View>
      ) : (
        documents.map((doc) => (
          <TouchableOpacity 
            key={doc.id} 
            style={s.documentCard} 
            activeOpacity={0.7} 
            onPress={() => openDocument(doc.file_url, getDocDisplayName(doc.document_type))}
          >
            <MaterialIcons name="description" size={32} color={Colors.primary} style={s.docIcon} />
            <View style={s.docInfo}>
              <Text style={s.docType}>{getDocDisplayName(doc.document_type)}</Text>
              <Text style={s.docStatus}>
                {doc.verified ? 'Verified' : 'Pending Verification'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.outline} />
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderAttendance = () => (
    <View style={s.tabContent}>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={s.loader} />
      ) : attendanceLogs.length === 0 ? (
        <View style={s.emptyState}>
          <MaterialIcons name="event-busy" size={48} color={Colors.outline} />
          <Text style={s.emptyStateText}>No attendance records for this month.</Text>
        </View>
      ) : (
        attendanceLogs.map((log) => (
          <View key={log.id} style={s.attendanceCard}>
            <View style={s.attendanceDateRow}>
              <Text style={s.attendanceDate}>{new Date(log.attendance_date).toLocaleDateString()}</Text>
              <View style={[
                s.statusBadge, 
                { backgroundColor: log.status === 'present' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(178, 43, 29, 0.1)' }
              ]}>
                <Text style={[
                  s.statusText,
                  { color: log.status === 'present' ? '#10b981' : '#b22b1d' }
                ]}>
                  {log.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={s.attendanceTimeRow}>
              <View style={s.timeBlock}>
                <Text style={s.timeLabel}>Check In</Text>
                <Text style={s.timeValue}>
                  {log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </Text>
              </View>
              <View style={s.timeBlock}>
                <Text style={s.timeLabel}>Check Out</Text>
                <Text style={s.timeValue}>
                  {log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );

  if (!personnel) {
    return (
      <View style={s.container}>
        <ClientTopNav showBack />
        <View style={s.emptyState}>
          <Text>Error: Personnel data not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ClientTopNav showBack />

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={s.profileCard}>
          {/* Avatar + Name + Status */}
          <View style={s.profileRow}>
            <View style={s.avatarContainer}>
              {personnel.photo_url ? (
                <CachedImage
                  uri={personnel.photo_url}
                  style={s.avatar}
                  containerStyle={s.avatar}
                  fallbackIcon="person"
                  fallbackIconSize={28}
                  showRetry={false}
                />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarText}>{initials}</Text>
                </View>
              )}
              {/* Status dot */}
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            </View>
            <View style={s.profileInfo}>
              <Text style={s.profileName} numberOfLines={1}>{personnel.name}</Text>
              <Text style={s.profileEmpId}>{personnel.employee_id}</Text>
              <View style={[s.statusBadge, { backgroundColor: statusColor + '18' }]}>
                <Text style={[s.statusBadgeText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Call Option */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.callButton}
              onPress={() => handleCall(personnel.phone)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="call" size={18} color={Colors.successGreen} />
              <Text style={s.callButtonText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Tabs */}
        <View style={s.tabBar}>
          <TouchableOpacity 
            style={[s.tabItem, activeTab === 'details' && s.tabItemActive]} 
            onPress={() => setActiveTab('details')}
          >
            <Text style={[s.tabText, activeTab === 'details' && s.tabTextActive]}>DETAILS</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.tabItem, activeTab === 'documents' && s.tabItemActive]} 
            onPress={() => setActiveTab('documents')}
          >
            <Text style={[s.tabText, activeTab === 'documents' && s.tabTextActive]}>DOCUMENTS</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.tabItem, activeTab === 'attendance' && s.tabItemActive]} 
            onPress={() => setActiveTab('attendance')}
          >
            <Text style={[s.tabText, activeTab === 'attendance' && s.tabTextActive]}>ATTENDANCE</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'details' && renderDetails()}
        {activeTab === 'documents' && renderDocuments()}
        {activeTab === 'attendance' && renderAttendance()}

      </ScrollView>

      {/* Document Viewer Modal */}
      <Modal
        visible={viewerVisible}
        transparent={true}
        onRequestClose={() => { setViewerVisible(false); setViewerUrl(''); }}
        animationType="fade"
      >
        <View style={s.modalOverlay}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle} numberOfLines={1}>{viewerTitle}</Text>
            <TouchableOpacity
              onPress={() => { setViewerVisible(false); setViewerUrl(''); }}
              style={s.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View style={s.imageContainer}>
            {viewerLoading ? (
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 14 }}>Loading document...</Text>
              </View>
            ) : viewerUrl ? (
              <CachedImage
                uri={viewerUrl}
                style={s.viewerImage}
                containerStyle={s.viewerImage}
                resizeMode="contain"
                fallbackIcon="broken-image"
                fallbackIconSize={64}
                fallbackIconColor="rgba(255,255,255,0.4)"
                showRetry={true}
                onError={() => {
                  setViewerVisible(false);
                  Alert.alert(
                    'Format Not Supported',
                    'This document appears to be a PDF or unsupported image format. Would you like to open it in your browser?',
                    [
                      { text: 'Cancel', style: 'cancel', onPress: () => setViewerUrl('') },
                      { 
                        text: 'Open in Browser', 
                        onPress: () => {
                          Linking.openURL(viewerUrl).catch(() => {
                            Alert.alert('Error', 'Unable to open the document.');
                          });
                          setViewerUrl('');
                        }
                      }
                    ]
                  );
                }}
              />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <MaterialIcons name="broken-image" size={64} color="rgba(255,255,255,0.4)" />
                <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 12, fontSize: 14 }}>Document not available</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fd',
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 60,
  },
  profileCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    marginBottom: 24,
    borderRadius: BorderRadius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    position: 'relative',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: Colors.surfaceContainerHigh,
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.surfaceContainerHigh,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  profileEmpId: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.successGreen,
    backgroundColor: Colors.successGreen + '08',
    gap: 8,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    marginBottom: 24,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tabContent: {
    minHeight: 200,
  },
  detailCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  lastDetailRow: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    marginRight: 16,
  },
  detailTextContainer: {
    flex: 1,
  },
  docName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  detailValue: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  detailLabel: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginBottom: 2,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.outline,
    marginTop: 16,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.default,
  },
  docIcon: {
    marginRight: 16,
  },
  docInfo: {
    flex: 1,
  },
  docType: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  docStatus: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginTop: 4,
  },
  attendanceCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  attendanceDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceDate: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  attendanceTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
  timeValue: {
    ...Typography.body,
    color: Colors.onSurface,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
  },
  modalTitle: {
    ...Typography.h2,
    color: '#ffffff',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
  },
});
