import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Animated,
  Platform,
  Dimensions,
  Linking,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import Skeleton from '../components/Skeleton';
import * as guardService from '../api/guardService';
import * as siteService from '../api/siteService';
import * as attendanceService from '../api/attendanceService';
import * as payrollService from '../api/payrollService';
import * as uniformService from '../api/uniformService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GuardDetailScreenProps {
  navigation: any;
  route: any;
}

type TabKey = 'profile' | 'assignment' | 'attendance' | 'salary' | 'uniform';

// ─── Reusable Sub-components ────────────────────────
function InfoRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  const s = useScaledStyles(styles);
  return (
    <View style={[s.infoRow, full && { width: '100%' }]}>
      <Text style={s.infoLabel}>{label.toUpperCase()}</Text>
      <Text style={s.infoValue}>{value || 'N/A'}</Text>
    </View>
  );
}

function DocumentRow({ icon, title, subtitle, onPress }: { icon: string; title: string; subtitle: string; onPress?: () => void }) {
  const s = useScaledStyles(styles);
  return (
    <View style={s.docRow}>
      <View style={s.docIconWrap}>
        <MaterialIcons name={icon as any} size={20} color={Colors.primaryContainer} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.docTitle}>{title}</Text>
        <Text style={s.docSubtitle}>{subtitle}</Text>
      </View>
      <TouchableOpacity style={s.docViewBtn} onPress={onPress} activeOpacity={0.7}>
        <MaterialIcons name="visibility" size={20} color={Colors.onSurfaceVariant} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Tab Content Components ─────────────────────────
function ProfileTab({ guard }: { guard: guardService.GuardProfile }) {
  const s = useScaledStyles(styles);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [viewerImage, setViewerImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [guard]);

  const formattedJoiningDate = useMemo(() => {
    if (!guard.joining_date) return 'N/A';
    try {
      return new Date(guard.joining_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return guard.joining_date;
    }
  }, [guard.joining_date]);

  const emergencyName = guard.emergency_contact_name || 'No Emergency Contact';
  const emergencyPhone = guard.emergency_contact_phone || 'N/A';

  return (
    <Animated.View style={{ opacity: fadeIn, gap: 14 }}>
      {/* Personal Information */}
      <View style={s.infoCard}>
        <View style={s.infoCardHeader}>
          <MaterialIcons name="person" size={20} color={Colors.primaryContainer} />
          <Text style={s.infoCardTitle}>Personal Information</Text>
        </View>
        <View style={s.infoGrid}>
          <InfoRow label="Joining Date" value={formattedJoiningDate} />
          <InfoRow label="Education" value={guard.education || 'N/A'} />
          <InfoRow label="Base Salary" value={guard.base_salary ? `₹${guard.base_salary.toLocaleString('en-IN')}/mo` : 'N/A'} />
          <InfoRow label="Preferred Shift" value={(guard.shift_type || 'rotational').toUpperCase()} />
          <InfoRow label="Height" value={guard.height ? `${guard.height} cm` : 'N/A'} />
          <InfoRow label="Weight" value={guard.weight ? `${guard.weight} kg` : 'N/A'} />
          <InfoRow label="Address" value={guard.address || 'N/A'} full />
        </View>
      </View>

      {/* Emergency Contact */}
      <View style={s.emergencyCard}>
        {/* Decorative circle overlay */}
        <View style={s.emergencyBgCircle} />
        
        <View style={s.infoCardHeader}>
          <MaterialIcons name="contact-emergency" size={20} color="#FFFFFF" />
          <Text style={[s.infoCardTitle, { color: '#FFFFFF' }]}>Emergency Contact</Text>
        </View>
        <Text style={s.emergencyName}>{emergencyName}</Text>
        <Text style={s.emergencyRelation}>
          RELATIONSHIP: FAMILY
        </Text>
        {emergencyPhone !== 'N/A' && (
          <View style={{ alignItems: 'flex-start', marginTop: 14 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.emergencyCallRow}
              onPress={() => Linking.openURL(`tel:${emergencyPhone}`)}
            >
              <MaterialIcons name="call" size={16} color="#FFFFFF" />
              <Text style={s.emergencyPhone}>{emergencyPhone}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Uploaded Documents */}
      <View style={s.infoCard}>
        <View style={s.infoCardHeader}>
          <MaterialIcons name="folder" size={20} color={Colors.primaryContainer} />
          <Text style={[s.infoCardTitle, { flex: 1 }]}>Uploaded Documents</Text>
          <View style={s.verifiedBadge}>
            <Text style={s.verifiedText}>
              {guard.guard_documents?.filter(d => ['aadhaar', 'address_proof', 'police_verification', 'photo'].includes(d.document_type)).length || 0}/4 Verified
            </Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {(() => {
            const requiredDocs = [
              { key: 'aadhaar', title: 'Aadhaar Front', icon: 'badge' },
              { key: 'address_proof', title: 'Aadhaar Back', icon: 'badge' },
              { key: 'police_verification', title: 'PVR', icon: 'verified-user' },
              { key: 'photo', title: 'Profile Photo', icon: 'person' },
            ];

            return requiredDocs.map((req) => {
              const doc = guard.guard_documents?.find(d => d.document_type === req.key);
              const isUploaded = !!doc;
              const uploadDate = doc?.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
              const url = doc?.document_url;

              return (
                <View key={req.key} style={[s.docRow, !isUploaded && { opacity: 0.6 }]}>
                  <View style={s.docIconWrap}>
                    <MaterialIcons name={req.icon as any} size={20} color={isUploaded ? Colors.primaryContainer : Colors.outline} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.docTitle}>{req.title}</Text>
                    <Text style={s.docSubtitle}>
                      {isUploaded ? `${doc.document_name}${uploadDate ? ` • ${uploadDate}` : ''}` : 'Not Uploaded'}
                    </Text>
                  </View>
                  {isUploaded ? (
                    <TouchableOpacity
                      style={s.docViewBtn}
                      onPress={() => setViewerImage({ url: url!, title: req.title })}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="visibility" size={20} color={Colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  ) : (
                    <View style={[s.docViewBtn, { backgroundColor: 'transparent' }]}>
                      <MaterialIcons name="cloud-off" size={20} color={Colors.outline} />
                    </View>
                  )}
                </View>
              );
            });
          })()}
        </View>
      </View>

      {/* ─── Document Image Viewer Modal ─── */}
      <Modal
        visible={!!viewerImage}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImage(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{viewerImage?.title || 'Document'}</Text>
            <TouchableOpacity
              onPress={() => setViewerImage(null)}
              style={s.modalCloseBtn}
            >
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {viewerImage && (
            <Image
              source={{ uri: viewerImage.url }}
              style={s.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </Animated.View>
  );
}

const UNIFORM_ITEM_OPTIONS: { label: string; value: uniformService.UniformItem['item_name'] }[] = [
  { label: 'Uniform Set', value: 'uniform_set' },
  { label: 'Shoes', value: 'shoes' },
  { label: 'Belt', value: 'belt' },
  { label: 'Cap', value: 'cap' },
  { label: 'ID Card', value: 'id_card' },
  { label: 'Torch', value: 'torch' },
  { label: 'Baton', value: 'baton' },
  { label: 'Whistle', value: 'whistle' },
  { label: 'Other', value: 'other' },
];

const DEFAULT_COSTS: Record<string, number> = {
  uniform_set: 2500,
  shoes: 800,
  belt: 200,
  cap: 150,
  id_card: 100,
  torch: 350,
  baton: 300,
  whistle: 50,
  other: 0,
};

function UniformTab({ guard, onUniformAdded }: { guard: guardService.GuardProfile; onUniformAdded?: () => void }) {
  const s = useScaledStyles(styles);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState<uniformService.UniformItem['item_name']>('uniform_set');
  const [costInput, setCostInput] = useState(String(DEFAULT_COSTS['uniform_set']));
  const [remarksInput, setRemarksInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [guard]);

  const openIssueModal = () => {
    setSelectedItemName('uniform_set');
    setCostInput(String(DEFAULT_COSTS['uniform_set']));
    setRemarksInput('');
    setIssueModalVisible(true);
  };

  const handleItemSelect = (value: uniformService.UniformItem['item_name']) => {
    setSelectedItemName(value);
    setCostInput(String(DEFAULT_COSTS[value] || 0));
    setShowItemPicker(false);
  };

  const handleSubmitUniform = async () => {
    const cost = parseFloat(costInput);
    if (isNaN(cost) || cost <= 0) {
      Alert.alert('Invalid Cost', 'Please enter a valid cost amount.');
      return;
    }

    setIsSaving(true);
    try {
      await uniformService.issueUniform({
        guard_id: guard.id,
        item_name: selectedItemName,
        item_cost: cost,
        remarks: remarksInput || undefined,
      });
      setIssueModalVisible(false);
      Alert.alert('Success', 'Uniform detail has been added successfully.');
      onUniformAdded?.();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add uniform detail. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedItemLabel = UNIFORM_ITEM_OPTIONS.find(o => o.value === selectedItemName)?.label || 'Uniform Set';

  return (
    <Animated.View style={{ opacity: fadeIn, gap: 14 }}>
      <View style={s.infoCard}>
        <View style={s.infoCardHeader}>
          <MaterialIcons name="checkroom" size={20} color={Colors.primaryContainer} />
          <Text style={[s.infoCardTitle, { flex: 1 }]}>Uniform Status</Text>
          {guard.uniforms && guard.uniforms.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openIssueModal}
              style={s.addUniformSmallBtn}
            >
              <MaterialIcons name="add" size={16} color={Colors.primary} />
              <Text style={s.addUniformSmallBtnText}>Add More</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {guard.uniforms && guard.uniforms.length > 0 ? (
          <View style={{ gap: 12 }}>
            {guard.uniforms.map((uni) => {
              const remaining = uni.item_cost - uni.amount_paid;
              const formattedDate = uni.issued_date ? new Date(uni.issued_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
              
              let statusLabel = uni.payment_status.toUpperCase();
              let statusColor = Colors.warningAmber;
              let statusBg = 'rgba(243,156,18,0.1)';
              if (uni.payment_status === 'paid' || uni.payment_status === 'deducted') {
                statusColor = Colors.successGreen;
                statusBg = 'rgba(39,174,96,0.1)';
              } else if (uni.payment_status === 'pending') {
                statusColor = Colors.secondary;
                statusBg = 'rgba(176,45,33,0.1)';
              }

              return (
                <View key={uni.id} style={s.uniformItemRow}>
                  <View style={s.uniformHeaderRow}>
                    <Text style={s.uniformNameText}>
                      {uni.item_name === 'uniform_set' ? 'Uniform Set' : uni.item_name.toUpperCase()}
                    </Text>
                    <View style={[s.uniformStatusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[s.uniformStatusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                  
                  <View style={s.uniformDetailGrid}>
                    <View style={s.uniformDetailCol}>
                      <Text style={s.uniformDetailLabel}>COST</Text>
                      <Text style={s.uniformDetailValue}>₹{uni.item_cost}</Text>
                    </View>
                    <View style={s.uniformDetailCol}>
                      <Text style={s.uniformDetailLabel}>PAID</Text>
                      <Text style={[s.uniformDetailValue, { color: Colors.successGreen }]}>₹{uni.amount_paid}</Text>
                    </View>
                    <View style={s.uniformDetailCol}>
                      <Text style={s.uniformDetailLabel}>OUTSTANDING</Text>
                      <Text style={[s.uniformDetailValue, remaining > 0 ? { color: Colors.secondary } : { color: Colors.onSurfaceVariant }]}>
                        ₹{remaining}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={s.uniformIssuedText}>Issued on: {formattedDate}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={s.noUniformContainer}>
            <View style={s.noUniformBadge}>
              <Text style={s.noUniformText}>NOT ISSUED / NO UNIFORM</Text>
            </View>
            <Text style={s.noUniformSubtext}>No uniform kit assignment has been recorded for this officer.</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.addUniformCTABtn}
              onPress={openIssueModal}
            >
              <MaterialIcons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={s.addUniformCTAText}>Add Uniform Detail</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ─── Issue Uniform Modal ─── */}
      <Modal
        visible={issueModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIssueModalVisible(false)}
      >
        <TouchableOpacity
          style={s.issueUniformBackdrop}
          activeOpacity={1}
          onPress={() => !isSaving && setIssueModalVisible(false)}
        >
          <View
            style={s.issueUniformSheet}
            onStartShouldSetResponder={() => true}
          >
            {/* Handle bar */}
            <View style={s.issueSheetHandle} />

            <View style={s.issueSheetHeader}>
              <Text style={s.issueSheetTitle}>Add Uniform Detail</Text>
              <TouchableOpacity onPress={() => !isSaving && setIssueModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={s.issueSheetSubtitle}>
              Assign a uniform item to{' '}
              <Text style={{ fontWeight: '700', color: Colors.primary }}>{guard.name || guard.users?.name || 'this officer'}</Text>
            </Text>

            {/* Item Selector */}
            <View style={s.issueFieldGroup}>
              <Text style={s.issueFieldLabel}>Uniform Item</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={s.issueDropdown}
                onPress={() => setShowItemPicker(!showItemPicker)}
              >
                <MaterialIcons name="checkroom" size={18} color={Colors.primary} />
                <Text style={s.issueDropdownText}>{selectedItemLabel}</Text>
                <MaterialIcons name={showItemPicker ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color={Colors.outline} />
              </TouchableOpacity>

              {showItemPicker && (
                <View style={s.issuePickerList}>
                  {UNIFORM_ITEM_OPTIONS.map((opt) => {
                    const isSelected = opt.value === selectedItemName;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        activeOpacity={0.7}
                        style={[s.issuePickerItem, isSelected && s.issuePickerItemActive]}
                        onPress={() => handleItemSelect(opt.value)}
                      >
                        <Text style={[s.issuePickerItemText, isSelected && { color: Colors.primary, fontWeight: '700' }]}>
                          {opt.label}
                        </Text>
                        {isSelected && <MaterialIcons name="check" size={16} color={Colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Cost */}
            <View style={s.issueFieldGroup}>
              <Text style={s.issueFieldLabel}>Cost (₹)</Text>
              <View style={s.issueInputContainer}>
                <MaterialIcons name="currency-rupee" size={16} color={Colors.outline} />
                <TextInput
                  style={s.issueTextInput}
                  keyboardType="numeric"
                  value={costInput}
                  onChangeText={setCostInput}
                  placeholder="Enter cost"
                  placeholderTextColor={Colors.outline}
                />
              </View>
            </View>

            {/* Remarks */}
            <View style={s.issueFieldGroup}>
              <Text style={s.issueFieldLabel}>Remarks (optional)</Text>
              <View style={[s.issueInputContainer, { minHeight: 60, alignItems: 'flex-start', paddingTop: 10 }]}>
                <TextInput
                  style={[s.issueTextInput, { minHeight: 40, textAlignVertical: 'top' }]}
                  placeholder="Size, condition, notes..."
                  placeholderTextColor={Colors.outline}
                  value={remarksInput}
                  onChangeText={setRemarksInput}
                  multiline
                />
              </View>
            </View>

            {/* Actions */}
            <View style={s.issueActions}>
              <TouchableOpacity
                style={s.issueCancelBtn}
                onPress={() => !isSaving && setIssueModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={s.issueCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.issueSubmitBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSubmitUniform}
                activeOpacity={0.8}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                    <Text style={s.issueSubmitText}>Add Uniform</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  );
}

function AssignmentTab({
  assignment,
  onUnassign,
  navigation,
  guardName,
}: {
  assignment: siteService.AssignmentRecord | null;
  onUnassign: () => void;
  navigation: any;
  guardName: string;
}) {
  const s = useScaledStyles(styles);
  const formattedAssignedAt = useMemo(() => {
    if (!assignment?.assigned_at) return '';
    try {
      return new Date(assignment.assigned_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return '';
    }
  }, [assignment?.assigned_at]);

  if (!assignment) {
    return (
      <View style={[s.infoCard, { alignItems: 'center', paddingVertical: 32 }]}>
        <MaterialIcons name="location-off" size={40} color={Colors.outline} />
        <Text style={{ marginTop: 12, fontWeight: '700', fontSize: 16, color: Colors.onSurface }}>
          No Current Assignment
        </Text>
        <Text style={{ marginTop: 4, color: Colors.outline, fontSize: 13, textAlign: 'center', paddingHorizontal: 16 }}>
          Assign this guard to an active security site to enable shift check-ins.
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SiteList')}
          style={[s.callBtn, { marginTop: 16, width: '60%', justifyContent: 'center' }]}
        >
          <MaterialIcons name="add-location" size={18} color="#FFFFFF" />
          <Text style={s.callBtnText}>Select Site</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.infoCard}>
      <View style={s.infoCardHeader}>
        <MaterialIcons name="location-on" size={20} color={Colors.primaryContainer} />
        <Text style={s.infoCardTitle}>Deployment details</Text>
      </View>
      <View style={[s.assignmentStatus, { borderLeftColor: Colors.successGreen }]}>
        <Text style={[s.assignmentLabel, { color: Colors.successGreen }]}>CURRENT PERIMETER COVERAGE</Text>
        <Text style={s.assignmentSite}>{assignment.sites?.site_name || 'Assigned Site'}</Text>
        <Text style={s.assignmentMeta}>{assignment.sites?.address || 'N/A'}</Text>
        <View style={s.assignmentShiftBadge}>
          <MaterialIcons
            name={assignment.shift_type === 'day' ? 'wb-sunny' : 'brightness-3'}
            size={14}
            color={Colors.onPrimaryFixedVariant}
          />
          <Text style={s.assignmentShiftText}>{assignment.shift_type.toUpperCase()} SHIFT</Text>
        </View>
        {formattedAssignedAt ? (
          <Text style={s.assignmentSince}>Assigned since {formattedAssignedAt}</Text>
        ) : null}
      </View>
      <View style={s.assignmentActions}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={s.assignmentBtn}
          onPress={() => navigation.navigate('SiteList')}
        >
          <Text style={s.assignmentBtnText}>Reassign</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[s.assignmentBtn, s.assignmentBtnDanger]}
          onPress={onUnassign}
        >
          <Text style={[s.assignmentBtnText, { color: Colors.error }]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AttendanceTab({ attendanceLogs }: { attendanceLogs: attendanceService.AttendanceRecord[] }) {
  const s = useScaledStyles(styles);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const monthStr = currentMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const monthYearKey = currentMonth.getFullYear() + '-' + String(currentMonth.getMonth() + 1).padStart(2, '0');

  // Filter logs locally for the current month
  const monthlyLogs = useMemo(() => {
    return attendanceLogs.filter(log => log.attendance_date.startsWith(monthYearKey));
  }, [attendanceLogs, monthYearKey]);

  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, total: monthlyLogs.length };
    monthlyLogs.forEach(log => {
      if (log.status === 'present') counts.present += 1;
      else if (log.status === 'late') counts.late += 1;
      else if (log.status === 'absent') counts.absent += 1;
      else if (log.status === 'half_day') counts.present += 0.5; // pro-rate half days
    });
    return counts;
  }, [monthlyLogs]);

  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
  };

  const attendanceRate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

  return (
    <View style={{ gap: 14 }}>
      {/* Month Stats */}
      <View style={s.attendanceStatsRow}>
        <View style={[s.attendanceStat, { backgroundColor: 'rgba(39,174,96,0.08)' }]}>
          <Text style={[s.attendanceStatNum, { color: Colors.successGreen }]}>{stats.present}</Text>
          <Text style={s.attendanceStatLabel}>On Time</Text>
        </View>
        <View style={[s.attendanceStat, { backgroundColor: 'rgba(176,45,33,0.08)' }]}>
          <Text style={[s.attendanceStatNum, { color: Colors.secondary }]}>{stats.absent}</Text>
          <Text style={s.attendanceStatLabel}>Absent</Text>
        </View>
        <View style={[s.attendanceStat, { backgroundColor: 'rgba(243,156,18,0.08)' }]}>
          <Text style={[s.attendanceStatNum, { color: Colors.warningAmber }]}>{stats.late}</Text>
          <Text style={s.attendanceStatLabel}>Late Arrivals</Text>
        </View>
      </View>

      {/* Month Selector */}
      <View style={s.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <MaterialIcons name="chevron-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.monthText}>{monthStr}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)}>
          <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={s.infoCard}>
        <View style={s.infoCardHeader}>
          <MaterialIcons name="calendar-today" size={20} color={Colors.primaryContainer} />
          <Text style={s.infoCardTitle}>Monthly Shift Summary</Text>
        </View>
        <InfoRow label="Logged Shifts" value={`${stats.total} shifts`} />
        <InfoRow label="Days Present" value={`${stats.present} days`} />
        <InfoRow label="Days Absent" value={`${stats.absent} days`} />
        <InfoRow label="Late Arrivals" value={`${stats.late} days`} />
        <InfoRow label="Duty Compliance Rate" value={`${attendanceRate}%`} />
      </View>
    </View>
  );
}

function SalaryTab({ salarySlips, navigation }: { salarySlips: payrollService.PayrollRecord[]; navigation: any }) {
  const s = useScaledStyles(styles);
  const mappedSlips = useMemo(() => {
    return salarySlips.map(slip => {
      let statusColor = Colors.warningAmber;
      let statusBg = 'rgba(243,156,18,0.1)';
      let statusLabel = slip.status.toUpperCase();

      if (slip.status === 'paid') {
        statusColor = Colors.successGreen;
        statusBg = 'rgba(39,174,96,0.1)';
      } else if (slip.status === 'approved') {
        statusColor = Colors.infoBlue;
        statusBg = 'rgba(41,128,185,0.1)';
        statusLabel = 'APPROVED';
      }

      // Format month YYYY-MM to word
      let displayMonth = slip.month;
      try {
        const parts = slip.month.split('-');
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
        displayMonth = dateObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      } catch (e) {}

      return {
        id: slip.id,
        month: displayMonth,
        amount: `₹${slip.final_salary.toLocaleString('en-IN')}`,
        status: statusLabel,
        statusColor,
        statusBg,
      };
    });
  }, [salarySlips]);

  if (salarySlips.length === 0) {
    return (
      <View style={[s.infoCard, { alignItems: 'center', paddingVertical: 28 }]}>
        <MaterialIcons name="money-off" size={40} color={Colors.outline} />
        <Text style={{ marginTop: 8, color: Colors.onSurfaceVariant, fontSize: 13, fontWeight: '500' }}>
          No payroll cycles compiled for this security guard.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {mappedSlips.map((slip, i) => (
        <TouchableOpacity
          key={slip.id}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('SalarySlipDetail', { payrollId: slip.id })}
          style={s.salarySlip}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.salaryMonth}>{slip.month}</Text>
            <Text style={s.salaryAmount}>{slip.amount}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={[s.salaryStatusBadge, { backgroundColor: slip.statusBg }]}>
              <Text style={[s.salaryStatusText, { color: slip.statusColor }]}>{slip.status}</Text>
            </View>
            <Text style={s.salaryViewLink}>View Details →</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main Component ─────────────────────────────────
export default function GuardDetailScreen({ navigation, route }: GuardDetailScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const guardId = route?.params?.guardId;

  // Local state variables
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [guard, setGuard] = useState<guardService.GuardProfile | null>(null);
  const [assignment, setAssignment] = useState<siteService.AssignmentRecord | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<attendanceService.AttendanceRecord[]>([]);
  const [salarySlips, setSalarySlips] = useState<payrollService.PayrollRecord[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  const loadGuardDetails = async () => {
    if (!guardId) {
      setLoading(false);
      return;
    }

    try {
      const [profile, assignments, attendance, payrollRecords] = await Promise.all([
        guardService.getGuardDetail(guardId),
        siteService.getAssignments({ guard_id: guardId }).catch(err => {
          console.warn('getAssignments failed, falling back to empty:', err?.message || err);
          return [] as siteService.AssignmentRecord[];
        }),
        attendanceService.getAttendance({ guard_id: guardId }).catch(err => {
          console.warn('getAttendance failed, falling back to empty:', err?.message || err);
          return [] as attendanceService.AttendanceRecord[];
        }),
        payrollService.getPayrollRecords().catch(err => {
          console.warn('getPayrollRecords failed, falling back to empty:', err?.message || err);
          return [] as payrollService.PayrollRecord[];
        }),
      ]);

      setGuard(profile);
      
      // Get the active assignment, if any
      const activeAssignment = assignments.find(a => a.is_active) || null;
      setAssignment(activeAssignment);

      setAttendanceLogs(attendance);

      // Filter payroll slips locally
      const filteredSlips = payrollRecords.filter(r => r.guard_id === guardId);
      setSalarySlips(filteredSlips);

    } catch (err) {
      console.error('Error loading guard details:', err);
      Alert.alert('Load Failure', 'Failed to retrieve guard directory details. swipe down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGuardDetails();
    }, [guardId])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [guardId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGuardDetails();
  }, [guardId]);

  const handleUnassignGuard = async () => {
    if (!assignment) return;

    Alert.alert(
      'Remove Assignment',
      `Are you sure you want to remove ${guard?.name || guard?.users?.name || 'this guard'} from ${assignment.sites?.site_name || 'their active site'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await siteService.unassignGuard(assignment.id);
              Alert.alert('Success', 'Guard unassigned successfully.');
              loadGuardDetails();
            } catch (err: any) {
              setLoading(false);
              Alert.alert('Action Failed', err.message || 'Unable to unassign guard.');
            }
          },
        },
      ]
    );
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'profile', label: 'PROFILE' },
    { key: 'uniform', label: 'UNIFORM' },
    { key: 'assignment', label: 'ASSIGNMENT' },
    { key: 'attendance', label: 'ATTENDANCE' },
    { key: 'salary', label: 'SALARY' },
  ];

  const handleCall = () => {
    const phone = guard?.phone || guard?.users?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleDeactivate = async () => {
    if (!guard) return;
    Alert.alert(
      'Deactivate Officer',
      `Are you sure you want to deactivate ${guard.name || guard.users?.name || 'this officer'}? This will restrict them from punch check-ins.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await guardService.updateGuard(guard.id, { employment_status: 'inactive' });
              Alert.alert('Deactivated', 'Officer profile is now deactivated.');
              loadGuardDetails();
            } catch (err: any) {
              setLoading(false);
              Alert.alert('Deactivation Failed', err.message);
            }
          },
        },
      ]
    );
  };

  const handleMore = () => {
    Alert.alert('Quick Actions', 'Select operation', [
      { text: 'Call Officer', onPress: handleCall },
      { text: 'Deactivate Officer', style: 'destructive', onPress: handleDeactivate },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderTab = () => {
    if (!guard) return null;
    switch (activeTab) {
      case 'profile':
        return <ProfileTab guard={guard} />;
      case 'uniform':
        return <UniformTab guard={guard} onUniformAdded={onRefresh} />;
      case 'assignment':
        return (
          <AssignmentTab
            assignment={assignment}
            onUnassign={handleUnassignGuard}
            navigation={navigation}
            guardName={guard.name}
          />
        );
      case 'attendance':
        return <AttendanceTab attendanceLogs={attendanceLogs} />;
      case 'salary':
        return <SalaryTab salarySlips={salarySlips} navigation={navigation} />;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />
        {/* Top Bar Skeleton */}
        <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
          <View style={s.topBarInner}>
            <View style={s.topBarLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
              <Text style={s.topBarTitle}>Officer Profile</Text>
            </View>
            <View style={s.topBarRight}>
              <View style={s.topBarIconBtn} />
              <View style={s.topBarIconBtn} />
            </View>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header Skeleton */}
          <View style={s.profileHeader}>
            <View style={s.headerTop}>
              <Skeleton circle width={72} height={72} />
              <View style={[s.headerTextGroup, { gap: 8 }]}>
                <Skeleton width="70%" height={20} />
                <Skeleton width="45%" height={14} />
                <Skeleton width="30%" height={18} borderRadius={10} />
              </View>
            </View>
            <View style={[s.profileActions, { marginTop: 8 }]}>
              <Skeleton style={{ flex: 1 }} height={40} borderRadius={8} />
              <Skeleton width={40} height={40} borderRadius={8} />
            </View>
          </View>

          {/* Tabs Skeleton */}
          <View style={[s.tabBar, { paddingVertical: 12 }]}>
            <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 16 }}>
              <Skeleton width={80} height={30} borderRadius={15} />
              <Skeleton width={90} height={30} borderRadius={15} />
              <Skeleton width={110} height={30} borderRadius={15} />
              <Skeleton width={100} height={30} borderRadius={15} />
              <Skeleton width={80} height={30} borderRadius={15} />
            </View>
          </View>

          {/* Tab Content (ProfileTab) Skeleton */}
          <View style={[s.tabContent, { gap: 14 }]}>
            <View style={s.infoCard}>
              <View style={[s.infoCardHeader, { marginBottom: 12 }]}>
                <Skeleton width={160} height={20} />
              </View>
              <View style={s.infoGrid}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <View key={idx} style={[s.infoRow, { gap: 6, marginBottom: 10 }]}>
                    <Skeleton width="50%" height={10} />
                    <Skeleton width="80%" height={16} />
                  </View>
                ))}
                <View style={[s.infoRow, { width: '100%', gap: 6, marginTop: 4 }]}>
                  <Skeleton width="20%" height={10} />
                  <Skeleton width="90%" height={16} />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Backend detail returns name under guard.users.name, list returns guard.name directly
  const guardName = guard?.name || guard?.users?.name || 'Security Officer';
  const guardPhone = guard?.phone || guard?.users?.phone || '';
  const guardEmpId = guard ? `EMP-${guard.id.slice(0, 4).toUpperCase()}` : 'N/A';
  const statusLabel = guard?.employment_status === 'active' ? 'ACTIVE DUTY' : guard?.employment_status === 'inactive' ? 'ON LEAVE' : 'TERMINATED';
  const statusBg = guard?.employment_status === 'active' ? Colors.successGreen : guard?.employment_status === 'inactive' ? Colors.warningAmber : Colors.secondary;

  const initials = guardName !== 'Security Officer' ? guardName.split(' ').map((n: string) => n.charAt(0)).join('').substring(0, 2).toUpperCase() : 'SO';

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Top App Bar ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
            <Text style={s.topBarTitle}>Officer Profile</Text>
          </View>
          <View style={s.topBarRight}>
            {/* Notification bell */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
              <View style={s.notifBadgeRedDot} />
            </TouchableOpacity>
            {/* Settings button */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <MaterialIcons name="settings" size={24} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* ═══ Profile Header ═══ */}
        <Animated.View
          style={[
            s.profileHeader,
            { opacity: headerFade, transform: [{ translateY: headerSlide }] },
          ]}
        >
          <View style={s.headerTop}>
            <View style={s.avatarWrap}>
              {guard?.photo_url ? (
                <Image source={{ uri: guard.photo_url }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, { backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800' }}>{initials}</Text>
                </View>
              )}
              <View style={[s.avatarDot, { backgroundColor: guard?.employment_status === 'active' ? '#10B981' : Colors.outline }]} />
            </View>

            <View style={s.headerTextGroup}>
              <Text style={s.profileName}>{guardName}</Text>
              <Text style={s.profileEmpId}>{guardEmpId}</Text>
              <View style={[s.profileStatusBadge, { backgroundColor: guard?.employment_status === 'active' ? '#EFFDF5' : '#FFF7ED', borderColor: guard?.employment_status === 'active' ? '#DCFCE7' : '#FFEDD5', borderWidth: 0.5 }]}>
                <Text style={[s.profileStatusText, { color: guard?.employment_status === 'active' ? '#15803D' : '#C2410C' }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>

          {/* Action Row */}
          <View style={s.profileActions}>
            <TouchableOpacity activeOpacity={0.8} style={s.callBtn} onPress={handleCall}>
              <MaterialIcons name="call" size={18} color={Colors.secondary} />
              <Text style={s.callBtnText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={s.editBtn}
              onPress={() => navigation.navigate('EditGuardProfile', { guardId: guard?.id })}
            >
              <MaterialIcons name="edit" size={18} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ═══ Tabs ═══ */}
        <View style={s.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
              >
                <Text
                  style={[
                    s.tabLabel,
                    activeTab === tab.key && s.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ═══ Tab Content ═══ */}
        <View style={s.tabContent}>
          {renderTab()}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  // Top Bar
  topBar: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.3)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 50,
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 56,
    paddingHorizontal: 8,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 140,
    height: 36,
    resizeMode: 'contain',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarIconBtn: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeRedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerLowest,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurface, marginLeft: 8 },

  scrollContent: { paddingHorizontal: Spacing.screenPadding },

  // Profile Header
  profileHeader: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.surfaceContainer,
  },
  avatarDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  headerTextGroup: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  profileEmpId: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    marginTop: 2,
  },
  profileStatusBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  profileStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FFA39E',
    borderRadius: 8,
  },
  callBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },

  // Tabs
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.3)',
    marginTop: Spacing.stackMd,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  tabScroll: { paddingHorizontal: 8 },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2.5,
    borderBottomColor: Colors.secondary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: Colors.secondary,
    fontWeight: '700',
  },

  tabContent: { marginTop: Spacing.stackMd },

  // Info Card
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl, padding: Spacing.stackMd,
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  infoCardTitle: { fontSize: 17, fontWeight: '600', color: Colors.onSurface },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  infoRow: { width: '50%', paddingVertical: 10 },
  infoLabel: { fontSize: 11, fontWeight: '500', color: Colors.onSurfaceVariant, letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },

  // Emergency Card
  emergencyCard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.xl,
    padding: Spacing.stackMd,
    position: 'relative',
    overflow: 'hidden',
  },
  emergencyBgCircle: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  emergencyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  emergencyRelation: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  emergencyCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  emergencyPhone: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Documents
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, backgroundColor: 'rgba(39,174,96,0.1)',
  },
  verifiedText: { fontSize: 11, fontWeight: '600', color: Colors.successGreen },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
  },
  docIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  docSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  docViewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Assignment
  assignmentStatus: { borderLeftWidth: 3, paddingLeft: 14, paddingVertical: 8, gap: 4 },
  assignmentLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  assignmentSite: { fontSize: 16, fontWeight: '700', color: Colors.onSurface },
  assignmentMeta: { fontSize: 13, color: Colors.onSurfaceVariant },
  assignmentShiftBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
    backgroundColor: Colors.primaryFixed, marginTop: 4,
  },
  assignmentShiftText: { fontSize: 11, fontWeight: '500', color: Colors.onPrimaryFixedVariant },
  assignmentSince: { fontSize: 12, color: Colors.outline, marginTop: 4 },
  assignmentActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  assignmentBtn: {
    flex: 1, height: 40, borderWidth: 1.5, borderColor: Colors.primaryContainer,
    borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center',
  },
  assignmentBtnDanger: { borderColor: Colors.error },
  assignmentBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primaryContainer },

  // Attendance
  attendanceStatsRow: { flexDirection: 'row', gap: 10 },
  attendanceStat: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  attendanceStatNum: { fontSize: 28, fontWeight: '700' },
  attendanceStatLabel: { fontSize: 11, fontWeight: '500', color: Colors.onSurfaceVariant, marginTop: 2 },
  monthSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 8,
  },
  monthText: { fontSize: 16, fontWeight: '600', color: Colors.onSurface },

  // Salary
  salarySlip: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: Colors.outlineVariant, borderRadius: BorderRadius.xl,
  },
  salaryMonth: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },
  salaryAmount: { fontSize: 20, fontWeight: '700', color: Colors.onSurface, marginTop: 4 },
  salaryStatusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  salaryStatusText: { fontSize: 11, fontWeight: '600' },
  salaryViewLink: { fontSize: 12, fontWeight: '500', color: Colors.infoBlue },

  // Document Viewer Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').height * 0.6,
  },
  uniformItemRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195,198,208,0.15)',
    paddingBottom: 12,
    marginBottom: 4,
  },
  uniformHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uniformNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  uniformStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  uniformStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  uniformDetailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 10,
    borderRadius: BorderRadius.lg,
  },
  uniformDetailCol: {
    alignItems: 'center',
    flex: 1,
  },
  uniformDetailLabel: {
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  uniformDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  uniformIssuedText: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 8,
    fontStyle: 'italic',
  },
  noUniformContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noUniformBadge: {
    backgroundColor: 'rgba(176,45,33,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  noUniformText: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  noUniformSubtext: {
    fontSize: 12,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  // ─── Add Uniform Button Styles ───
  addUniformSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(26,61,143,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addUniformSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  addUniformCTABtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    width: '80%',
  },
  addUniformCTAText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // ─── Issue Uniform Modal Styles ───
  issueUniformBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  issueUniformSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
    maxHeight: '85%',
  },
  issueSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: 14,
  },
  issueSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  issueSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSurface,
    letterSpacing: 0.3,
  },
  issueSheetSubtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginBottom: 18,
    lineHeight: 18,
  },
  issueFieldGroup: {
    marginBottom: 14,
  },
  issueFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  issueDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  issueDropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  issuePickerList: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  issuePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.outlineVariant,
  },
  issuePickerItemActive: {
    backgroundColor: 'rgba(26,61,143,0.06)',
  },
  issuePickerItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  issueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
  },
  issueTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  issueActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  issueCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  issueCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  issueSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.primaryContainer,
  },
  issueSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
