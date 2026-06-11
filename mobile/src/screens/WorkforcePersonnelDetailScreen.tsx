import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getPersonnelById, terminatePersonnel } from '../api/workforcePersonnelService';
import { getDocumentChecklist, verifyDocument } from '../api/workforceDocumentService';
import { supabase } from '../api/supabase';
import AttendanceStatusBadge from '../components/AttendanceStatusBadge';
import Skeleton from '../components/Skeleton';
import type { WorkforcePersonnel, DocumentChecklistItem, WorkforceAttendance, SiteAssignment } from '../types/workforce';
import { useFileUpload } from '../hooks/useFileUpload';

interface WorkforcePersonnelDetailScreenProps {
  route: any;
  navigation: any;
}

type TabType = 'profile' | 'documents' | 'attendance' | 'assignment';

// ─── Helper: format date ────────────────────────────
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// ─── Helper: format salary ──────────────────────────
const formatSalary = (amount?: number) => {
  if (!amount) return 'N/A';
  return `₹${amount.toLocaleString('en-IN')}/mo`;
};

export default function WorkforcePersonnelDetailScreen({ route, navigation }: WorkforcePersonnelDetailScreenProps) {
  const { personnelId } = route.params;
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [personnel, setPersonnel] = useState<WorkforcePersonnel | null>(null);
  const [checklist, setChecklist] = useState<DocumentChecklistItem[]>([]);
  const [attendance, setAttendance] = useState<WorkforceAttendance[]>([]);
  const [assignments, setAssignments] = useState<SiteAssignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { upload, uploading, progress } = useFileUpload();
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Image Viewer Modal State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');

  const pickAndUpload = async (docType: string, useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Required / अनुमति आवश्यक', 'Camera access is needed. / कैमरा एक्सेस आवश्यक है।');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Required / अनुमति आवश्यक', 'Gallery access is needed. / गैलरी एक्सेस आवश्यक है।');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      }

      if (!result.canceled && result.assets?.length > 0) {
        processUpload(docType, result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Error / त्रुटि', err?.message || 'Could not pick image. / छवि चुनने में विफल।');
    }
  };

  const handleUpload = (docType: string) => {
    Alert.alert(
      'Upload Document / दस्तावेज़ अपलोड करें',
      'Choose how to upload: / अपलोड कैसे करें चुनें:',
      [
        { text: '📷 Camera / कैमरा', onPress: () => pickAndUpload(docType, true) },
        { text: '🖼️ Gallery / गैलरी', onPress: () => pickAndUpload(docType, false) },
        { text: 'Cancel / रद्द करें', style: 'cancel' },
      ]
    );
  };

  const processUpload = async (docType: string, fileUri: string) => {
    try {
      setActionLoading(true);
      setUploadingDocType(docType);
      const uploadRes = await upload({
        fileUri,
        category: docType === 'photo' ? 'profiles' : 'documents',
        personnelId: personnelId,
        documentType: docType,
      });

      if (uploadRes.success) {
        Alert.alert('Success / सफलता', 'Document uploaded successfully. / दस्तावेज़ सफलतापूर्वक अपलोड किया गया।');
        loadData(true);
      } else {
        Alert.alert('Upload Failed / अपलोड विफल', uploadRes.error?.message || 'Could not save document. / दस्तावेज़ सहेज नहीं सके।');
      }
    } catch (err: any) {
      Alert.alert('Error / त्रुटि', err?.message || 'Upload failed. / अपलोड विफल।');
    } finally {
      setActionLoading(false);
      setUploadingDocType(null);
    }
  };

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const pData = await getPersonnelById(personnelId);
      setPersonnel(pData);

      const docChecklist = await getDocumentChecklist(personnelId);
      setChecklist(docChecklist);

      const { data: attData } = await supabase
        .from('workforce_attendance')
        .select('*')
        .eq('personnel_id', personnelId)
        .order('attendance_date', { ascending: false })
        .limit(30);
      setAttendance(attData || []);

      const { data: assignData } = await supabase
        .from('site_assignments')
        .select(`*, site:sites(*)`)
        .eq('personnel_id', personnelId)
        .order('start_date', { ascending: false });
      setAssignments(assignData || []);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to retrieve profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [personnelId]);

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

  const handleVerifyDoc = async (docId: string) => {
    try {
      setActionLoading(true);
      await verifyDocument(docId);
      Alert.alert('Success', 'Document marked as verified.');
      loadData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to verify document.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminate = () => {
    Alert.alert(
      'Confirm Termination',
      `Are you sure you want to terminate ${personnel?.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await terminatePersonnel(personnelId);
              Alert.alert('Success', 'Personnel profile terminated successfully.');
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to terminate personnel.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ─── Loading State ───
  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />
        {/* Top Bar Skeleton */}
        <View style={[s.topBar, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.topBarBtn}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={s.topBarTitle}>Officer Profile</Text>
          <View style={s.topBarRight}>
            <View style={s.topBarBtn} />
            <View style={s.topBarBtn} />
          </View>
        </View>

        <ScrollView
          style={s.scrollView}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header Card Skeleton */}
          <View style={s.profileCard}>
            <View style={s.profileRow}>
              <Skeleton circle width={68} height={68} />
              <View style={[s.profileInfo, { gap: 8 }]}>
                <Skeleton width="60%" height={20} />
                <Skeleton width="40%" height={14} />
                <Skeleton width="30%" height={16} borderRadius={8} />
              </View>
            </View>
            <View style={[s.actionRow, { marginTop: 8 }]}>
              <Skeleton style={{ flex: 1 }} height={42} borderRadius={8} />
              <Skeleton width={42} height={42} borderRadius={8} />
            </View>
          </View>

          {/* Tab Bar Skeleton */}
          <View style={[s.tabBar, { paddingVertical: 12 }]}>
            <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 16 }}>
              <Skeleton width={80} height={30} borderRadius={15} />
              <Skeleton width={100} height={30} borderRadius={15} />
              <Skeleton width={90} height={30} borderRadius={15} />
              <Skeleton width={90} height={30} borderRadius={15} />
            </View>
          </View>

          {/* Section Card Skeleton */}
          <View style={s.tabContent}>
            <View style={s.sectionCard}>
              <View style={[s.sectionTitleRow, { marginBottom: 16 }]}>
                <Skeleton width={150} height={20} />
              </View>
              <View style={s.infoGrid}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <View key={idx} style={[s.infoGridItem, { gap: 6, marginBottom: 12 }]}>
                    <Skeleton width="50%" height={12} />
                    <Skeleton width="80%" height={16} />
                  </View>
                ))}
              </View>
              <View style={[s.infoFullRow, { gap: 6, marginTop: 8 }]}>
                <Skeleton width="30%" height={12} />
                <Skeleton width="70%" height={16} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Not Found State ───
  if (!personnel) {
    return (
      <View style={[s.container, s.centerFull]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />
        <MaterialIcons name="person-off" size={64} color={Colors.surfaceDim} />
        <Text style={s.errorText}>Personnel profile not found.</Text>
        <TouchableOpacity style={s.goBackBtn} onPress={() => navigation.goBack()}>
          <Text style={s.goBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isActive = personnel.employment_status === 'active';
  const statusLabel = personnel.employment_status === 'active' ? 'ACTIVE DUTY' :
    personnel.employment_status === 'inactive' ? 'INACTIVE' : 'TERMINATED';
  const statusColor = isActive ? Colors.successGreen : (personnel.employment_status === 'terminated' ? Colors.dangerRed : Colors.warningAmber);

  const initials = personnel.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const activeAssignment = assignments.find(a => a.is_active);

  const verifiedCount = checklist.filter(d => d.status === 'verified').length;
  const totalDocs = checklist.length;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'profile', label: 'PROFILE' },
    { key: 'documents', label: 'DOCUMENTS' },
    { key: 'attendance', label: 'ATTENDANCE' },
    { key: 'assignment', label: 'ASSIGNMENT' },
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Top App Bar ═══ */}
      <View style={[s.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.topBarBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Officer Profile</Text>
        <View style={s.topBarRight}>
          <TouchableOpacity
            style={s.topBarBtn}
            onPress={() => navigation.navigate('NotificationCenter')}
          >
            <MaterialIcons name="notifications-none" size={22} color={Colors.primary} />
            <View style={s.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.topBarBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <MaterialIcons name="settings" size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Profile Header Card ═══ */}
        <View style={s.profileCard}>
          {/* Avatar + Name + Status */}
          <View style={s.profileRow}>
            <View style={s.avatarContainer}>
              {personnel.photo_url ? (
                <Image source={{ uri: personnel.photo_url }} style={s.avatar} />
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

          {/* Call + Edit Buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.callButton}
              onPress={() => handleCall(personnel.phone)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="call" size={18} color={Colors.successGreen} />
              <Text style={s.callButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.editButton}
              onPress={() => navigation.navigate('AddWorkforcePersonnel', {
                editMode: true,
                personnelId: personnel.id,
              })}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={18} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ Tab Bar ═══ */}
        <View style={s.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ═══ Tab Content ═══ */}

        {/* ─── PROFILE TAB ─── */}
        {activeTab === 'profile' && (
          <View style={s.tabContent}>
            {/* Personal Information Section */}
            <View style={s.sectionCard}>
              <View style={s.sectionTitleRow}>
                <MaterialIcons name="person" size={20} color={Colors.primary} />
                <Text style={s.sectionTitle}>Personal Information</Text>
              </View>

              <View style={s.infoGrid}>
                <View style={s.infoGridItem}>
                  <Text style={s.infoLabel}>JOINING DATE</Text>
                  <Text style={s.infoValue}>{formatDate(personnel.joining_date)}</Text>
                </View>
                <View style={s.infoGridItem}>
                  <Text style={s.infoLabel}>PROFESSION</Text>
                  <Text style={s.infoValue}>{personnel.category?.name || 'Staff'}</Text>
                </View>
                <View style={s.infoGridItem}>
                  <Text style={s.infoLabel}>BASE SALARY</Text>
                  <Text style={s.infoValue}>{formatSalary(personnel.base_salary)}</Text>
                </View>
                <View style={s.infoGridItem}>
                  <Text style={s.infoLabel}>PREFERRED SHIFT</Text>
                  <Text style={s.infoValue}>{personnel.shift_type ? personnel.shift_type.toUpperCase() : 'DAY'}</Text>
                </View>
                <View style={s.infoGridItem}>
                  <Text style={s.infoLabel}>AADHAAR</Text>
                  <Text style={s.infoValue}>{personnel.aadhaar_number || 'N/A'}</Text>
                </View>
                <View style={s.infoGridItem}>
                  <Text style={s.infoLabel}>PAN CARD</Text>
                  <Text style={s.infoValue}>{personnel.pan_number || 'N/A'}</Text>
                </View>
              </View>

              <View style={s.infoFullRow}>
                <Text style={s.infoLabel}>PHONE NUMBER</Text>
                <Text style={s.infoValue}>
                  {personnel.phone ? (personnel.phone.startsWith('+91') ? personnel.phone : `+91 ${personnel.phone}`) : 'N/A'}
                </Text>
              </View>
              <View style={s.infoFullRow}>
                <Text style={s.infoLabel}>ADDRESS</Text>
                <Text style={s.infoValue}>{personnel.address || 'N/A'}</Text>
              </View>
            </View>

            {/* Emergency Contact Card */}
            <View style={s.emergencyCard}>
              <View style={s.emergencyHeader}>
                <MaterialIcons name="health-and-safety" size={20} color="#ffffff" />
                <Text style={s.emergencyTitle}>Emergency Contact</Text>
              </View>
              <Text style={s.emergencyName}>
                {personnel.emergency_contact_name || 'Not Provided'}
              </Text>
              <Text style={s.emergencyRelation}>RELATIONSHIP: FAMILY</Text>
              {personnel.emergency_contact_phone && (
                <TouchableOpacity
                  style={s.emergencyCallBtn}
                  onPress={() => handleCall(personnel.emergency_contact_phone)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="call" size={16} color="#ffffff" />
                  <Text style={s.emergencyCallText}>
                    {personnel.emergency_contact_phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bank Details Card */}
            <View style={s.sectionCard}>
              <View style={s.sectionTitleRow}>
                <MaterialIcons name="account-balance" size={20} color={Colors.primary} />
                <Text style={s.sectionTitle}>Bank Details</Text>
              </View>
              <View style={s.infoGrid}>
                <View style={s.infoGridItem}>
                  <Text style={s.infoLabel}>BANK NAME</Text>
                  <Text style={s.infoValue}>{personnel.bank_name || 'N/A'}</Text>
                </View>
                <View style={s.infoGridItem}>
                  <Text style={s.infoLabel}>IFSC CODE</Text>
                  <Text style={s.infoValue}>{personnel.bank_ifsc || 'N/A'}</Text>
                </View>
              </View>
              <View style={s.infoFullRow}>
                <Text style={s.infoLabel}>ACCOUNT NUMBER</Text>
                <Text style={s.infoValue}>{personnel.bank_account_number || 'N/A'}</Text>
              </View>
            </View>

            {/* Terminate Action */}
            {personnel.employment_status !== 'terminated' && (
              <TouchableOpacity
                style={s.terminateButton}
                onPress={handleTerminate}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                <MaterialIcons name="person-off" size={18} color={Colors.error} />
                <Text style={s.terminateButtonText}>Terminate Personnel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── DOCUMENTS TAB ─── */}
        {activeTab === 'documents' && (
          <View style={s.tabContent}>
            <View style={s.sectionCard}>
              <View style={s.docHeaderRow}>
                <View style={s.sectionTitleRow}>
                  <MaterialIcons name="description" size={20} color={Colors.primary} />
                  <Text style={s.sectionTitle}>Uploaded Documents</Text>
                </View>
                <View style={s.docCountBadge}>
                  <Text style={s.docCountText}>{verifiedCount}/{totalDocs} Verified</Text>
                </View>
              </View>

              {checklist.length === 0 ? (
                <View style={s.emptyCenter}>
                  <MaterialIcons name="folder-off" size={48} color={Colors.surfaceDim} />
                  <Text style={s.emptyText}>No documents found.</Text>
                </View>
              ) : (
                checklist.map((item, idx) => {
                  const isVerified = item.status === 'verified';
                  const isPending = item.status === 'pending';
                  const isMissing = item.status === 'missing';

                  return (
                    <View
                      key={item.document_type}
                      style={[s.docItem, idx === checklist.length - 1 && { borderBottomWidth: 0 }]}
                    >
                      <View style={[s.docIconCircle, {
                        backgroundColor: isVerified ? Colors.successGreen + '15' : (isPending ? Colors.warningAmber + '15' : Colors.surfaceContainerHigh),
                      }]}>
                        <MaterialIcons
                          name={isVerified ? 'check-circle' : (isPending ? 'schedule' : 'cloud-off')}
                          size={20}
                          color={isVerified ? Colors.successGreen : (isPending ? Colors.warningAmber : Colors.outline)}
                        />
                      </View>
                      <View style={s.docInfo}>
                        <Text style={s.docName}>{item.display_name}</Text>
                        <Text style={s.docSubtext}>
                          {isMissing
                            ? 'Not Uploaded'
                            : item.document?.file_url
                              ? `${personnel.name} • ${formatDate(item.document?.created_at)}`
                              : 'Pending verification'
                          }
                        </Text>
                      </View>
                      <View style={s.docActions}>
                        {isPending && item.document && (
                          <TouchableOpacity
                            onPress={() => handleVerifyDoc(item.document!.id)}
                            style={s.verifyBtn}
                            disabled={actionLoading}
                          >
                            <Text style={s.verifyBtnText}>Verify</Text>
                          </TouchableOpacity>
                        )}
                        {!isMissing && item.document?.file_url && (
                          <TouchableOpacity
                            onPress={() => {
                              setViewerTitle(item.display_name);
                              setViewerUrl(item.document!.file_url);
                              setViewerVisible(true);
                            }}
                            style={s.viewDocIconBtn}
                          >
                            <MaterialIcons name="visibility" size={18} color={Colors.primary} />
                          </TouchableOpacity>
                        )}
                        {isMissing && (
                          uploadingDocType === item.document_type ? (
                            <View style={s.uploadProgressContainer}>
                              <ActivityIndicator size="small" color={Colors.primary} />
                              <Text style={s.uploadProgressText}>{progress}%</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleUpload(item.document_type)}
                              style={s.inlineUploadBtn}
                              disabled={actionLoading}
                            >
                              <MaterialIcons name="cloud-upload" size={18} color={Colors.primary} />
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    </View>
                  );
                })
              )}

              {/* Upload CTA */}
              <TouchableOpacity
                style={s.uploadCta}
                onPress={() => navigation.navigate('DocumentChecklist', { personnelId })}
                activeOpacity={0.7}
              >
                <MaterialIcons name="cloud-upload" size={18} color={Colors.primary} />
                <Text style={s.uploadCtaText}>Upload / Manage Documents</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── ATTENDANCE TAB ─── */}
        {activeTab === 'attendance' && (
          <View style={s.tabContent}>
            <View style={s.sectionCard}>
              <View style={s.sectionTitleRow}>
                <MaterialIcons name="event-available" size={20} color={Colors.primary} />
                <Text style={s.sectionTitle}>Last 30 Days Activity</Text>
              </View>
              {attendance.length === 0 ? (
                <View style={s.emptyCenter}>
                  <MaterialIcons name="event-busy" size={48} color={Colors.surfaceDim} />
                  <Text style={s.emptyText}>No attendance records found.</Text>
                </View>
              ) : (
                attendance.map((att, idx) => (
                  <View
                    key={att.id}
                    style={[s.attendanceRow, idx === attendance.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={s.attDateCol}>
                      <Text style={s.attDateText}>{formatDate(att.attendance_date)}</Text>
                      {att.check_in_time && (
                        <Text style={s.attTimeText}>
                          In: {new Date(att.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {att.check_out_time ? ` • Out: ${new Date(att.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </Text>
                      )}
                    </View>
                    <AttendanceStatusBadge status={att.status} size="sm" />
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ─── ASSIGNMENT TAB ─── */}
        {activeTab === 'assignment' && (
          <View style={s.tabContent}>
            {/* Current Deployment */}
            <View style={s.sectionCard}>
              <View style={s.sectionTitleRow}>
                <MaterialIcons name="business" size={20} color={Colors.primary} />
                <Text style={s.sectionTitle}>Current Site Deployment</Text>
              </View>

              {activeAssignment ? (
                <View style={s.deploymentCard}>
                  <View style={s.deploymentHeader}>
                    <View style={s.deployIconCircle}>
                      <MaterialIcons name="location-on" size={22} color={Colors.primary} />
                    </View>
                    <View style={s.deployInfo}>
                      <Text style={s.deploySiteName}>{activeAssignment.site?.site_name}</Text>
                      <Text style={s.deployClient}>{activeAssignment.site?.client_name || 'Individual client'}</Text>
                    </View>
                  </View>
                  <View style={s.deployMeta}>
                    <View style={s.deployMetaItem}>
                      <Text style={s.deployMetaLabel}>SHIFT TYPE</Text>
                      <Text style={s.deployMetaValue}>{(activeAssignment.shift_type || 'Day').toUpperCase()}</Text>
                    </View>
                    <View style={s.deployMetaItem}>
                      <Text style={s.deployMetaLabel}>ASSIGNED DATE</Text>
                      <Text style={s.deployMetaValue}>{formatDate(activeAssignment.start_date)}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={s.unassignedCard}>
                  <MaterialIcons name="person-pin" size={40} color={Colors.surfaceDim} />
                  <Text style={s.unassignedText}>Currently unassigned</Text>
                  <TouchableOpacity
                    style={s.deployNowBtn}
                    onPress={() => navigation.navigate('AssignPersonnel', { personnelId })}
                  >
                    <Text style={s.deployNowText}>Deploy to Site</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Assignment History */}
            <View style={s.sectionCard}>
              <View style={s.sectionTitleRow}>
                <MaterialIcons name="history" size={20} color={Colors.primary} />
                <Text style={s.sectionTitle}>Assignment History</Text>
              </View>
              {assignments.length === 0 ? (
                <Text style={s.noHistoryText}>No assignment history exists.</Text>
              ) : (
                assignments.map((asg, idx) => (
                  <View
                    key={asg.id}
                    style={[s.historyRow, idx === assignments.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={s.historyInfo}>
                      <Text style={s.historySiteName}>{asg.site?.site_name}</Text>
                      <Text style={s.historyDateRange}>
                        {formatDate(asg.start_date)} — {asg.end_date ? formatDate(asg.end_date) : 'Present'}
                      </Text>
                    </View>
                    <View style={[s.historyBadge, asg.is_active ? s.historyBadgeActive : s.historyBadgePast]}>
                      <Text style={[s.historyBadgeText, asg.is_active && { color: Colors.successGreen }]}>
                        {asg.is_active ? 'ACTIVE' : 'PAST'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={viewerVisible}
        transparent={true}
        onRequestClose={() => setViewerVisible(false)}
        animationType="fade"
      >
        <View style={s.modalOverlay}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle} numberOfLines={1}>{viewerTitle}</Text>
            <TouchableOpacity
              onPress={() => setViewerVisible(false)}
              style={s.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View style={s.imageContainer}>
            {viewerUrl ? (
              <Image
                source={{ uri: viewerUrl }}
                style={s.viewerImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerFull: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    marginTop: 12,
  },
  errorText: {
    ...Typography.bodyBold,
    color: Colors.onSurfaceVariant,
    marginTop: 12,
    marginBottom: 16,
  },
  goBackBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  goBackBtnText: {
    ...Typography.button,
    color: Colors.onPrimary,
    fontSize: 14,
  },

  // ── Top App Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.3)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerLowest,
  },

  scrollView: {
    flex: 1,
  },

  // ── Profile Header Card ──
  profileCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    marginHorizontal: Spacing.screenPadding,
    marginTop: 16,
    borderRadius: BorderRadius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
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
    borderColor: Colors.outlineVariant,
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.outlineVariant,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
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
  editButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tab Bar ──
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    marginTop: 16,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  tabScroll: {
    paddingHorizontal: 8,
  },
  tabItem: {
    paddingHorizontal: 16,
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

  // ── Tab Content ──
  tabContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    gap: 16,
  },

  // ── Section Card ──
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },

  // ── Info Grid (2-col) ──
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoGridItem: {
    width: '50%',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  infoFullRow: {
    marginBottom: 14,
  },

  // ── Emergency Card ──
  emergencyCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  emergencyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  emergencyRelation: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  emergencyCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  emergencyCallText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // ── Terminate Button ──
  terminateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.error + '40',
    backgroundColor: Colors.error + '08',
  },
  terminateButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.error,
  },

  // ── Documents Tab ──
  docHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  docCountBadge: {
    backgroundColor: Colors.successGreen + '15',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  docCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    gap: 12,
  },
  docIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  docSubtext: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  docActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyBtn: {
    backgroundColor: Colors.successGreen + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.default,
    borderWidth: 1,
    borderColor: Colors.successGreen,
  },
  verifyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  viewDocIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    backgroundColor: Colors.primary + '08',
  },
  uploadCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ── Empty States ──
  emptyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    marginTop: 8,
  },

  // ── Attendance Tab ──
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  attDateCol: {
    flex: 1,
  },
  attDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  attTimeText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },

  // ── Assignment Tab ──
  deploymentCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  deploymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  deployIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deployInfo: {
    flex: 1,
  },
  deploySiteName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  deployClient: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  deployMeta: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: 12,
    gap: 16,
  },
  deployMetaItem: {
    flex: 1,
  },
  deployMetaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  deployMetaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  unassignedCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderStyle: 'dashed',
    backgroundColor: Colors.surfaceContainerLow,
  },
  unassignedText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    marginTop: 8,
    marginBottom: 16,
  },
  deployNowBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    height: 40,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  deployNowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // ── History ──
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  historyInfo: {
    flex: 1,
  },
  historySiteName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  historyDateRange: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  historyBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  historyBadgeActive: {
    backgroundColor: Colors.successGreen + '15',
  },
  historyBadgePast: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.outline,
    letterSpacing: 0.5,
  },
  noHistoryText: {
    ...Typography.body,
    color: Colors.outline,
    fontStyle: 'italic',
  },
  uploadProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
  },
  uploadProgressText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
  },
  inlineUploadBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 120,
  },
});
