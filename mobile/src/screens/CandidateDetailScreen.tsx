import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Linking,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import Skeleton from '../components/Skeleton';
import * as candidateService from '../api/candidateService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CandidateDetailScreenProps {
  navigation: any;
  route: any;
}

interface Note {
  id: string;
  author: string;
  text: string;
  date: string;
}

interface Document {
  name: string;
  type: string;
  size?: string;
}

interface CandidateDetail {
  id: string;
  name: string;
  phone: string;
  status: 'new' | 'contacted' | 'interested' | 'interview' | 'selected' | 'hired' | 'rejected';
  avatar: string;
  education: string;
  experience: string;
  height: string;
  weight: string;
  age: string;
  languages: string;
  notes: Note[];
  documents: Document[];
}

const STAGES = ['New', 'Contact', 'Interest', 'Interview', 'Select', 'Hired'];

/** Helper to format height from cm */
function formatHeight(cm?: number): string {
  if (!cm) return 'N/A';
  const inches = cm / 2.54;
  const feet = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  return `${cm} cm (${feet}' ${rem}")`;
}

export default function CandidateDetailScreen({ navigation, route }: CandidateDetailScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const candidateId = route?.params?.candidateId;

  const [data, setData] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isStatusDropdownVisible, setIsStatusDropdownVisible] = useState(false);

  const fetchCandidate = useCallback(async () => {
    if (!candidateId) {
      setError('No candidate ID provided');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const c = await candidateService.getCandidateDetail(candidateId);
      let status = c.status as CandidateDetail['status'];
      if (status === ('interview_scheduled' as any)) status = 'interview';

      setData({
        id: c.id,
        name: c.name,
        phone: c.phone,
        status,
        avatar: '',
        education: c.education || 'N/A',
        experience: c.experience_years ? `${c.experience_years} Year${c.experience_years !== 1 ? 's' : ''}` : 'Fresher',
        height: formatHeight(c.height),
        weight: c.weight ? `${c.weight} Kg` : 'N/A',
        age: 'N/A',
        languages: 'Hindi',
        notes: c.notes ? [{ id: '1', author: 'Recruiter', text: c.notes, date: 'Saved' }] : [],
        documents: [],
      });
    } catch (err: any) {
      console.error('Failed to fetch candidate:', err);
      setError(err.message || 'Failed to load candidate');
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        {/* Top Bar Skeleton */}
        <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
          <View style={s.topBarLeft}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={s.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.onPrimary} />
            </TouchableOpacity>
            <Text style={s.topBarTitle}>Candidate Profile</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={s.topBarIconBtn}>
            <MaterialIcons name="more-vert" size={24} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Card Skeleton */}
          <View style={[s.profileCard, { alignItems: 'center', gap: 8 }]}>
            <Skeleton circle width={80} height={80} />
            <Skeleton width="50%" height={22} style={{ marginTop: 8 }} />
            <Skeleton width="35%" height={14} />
            <Skeleton width="25%" height={20} borderRadius={10} style={{ marginTop: 6 }} />
            
            <View style={[s.profileActions, { gap: 16, marginTop: 12 }]}>
              <Skeleton circle width={42} height={42} />
              <Skeleton circle width={42} height={42} />
              <Skeleton circle width={42} height={42} />
            </View>
          </View>

          {/* Stepper Card Skeleton */}
          <View style={s.stepperCard}>
            <Skeleton width="45%" height={18} style={{ marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {Array.from({ length: 5 }).map((_, idx) => (
                <View key={idx} style={{ alignItems: 'center', gap: 8 }}>
                  <Skeleton circle width={36} height={36} />
                  <Skeleton width={50} height={10} />
                </View>
              ))}
            </View>
          </View>

          {/* Recruiter Notes Card Skeleton */}
          <View style={s.notesCard}>
            <View style={[s.notesCardHeader, { marginBottom: 12 }]}>
              <Skeleton width="40%" height={18} />
              <Skeleton width={90} height={26} borderRadius={13} />
            </View>
            <View style={{ gap: 12 }}>
              <View style={[s.noteItem, { gap: 6, padding: 12, backgroundColor: Colors.surfaceContainerLow }]}>
                <Skeleton width="90%" height={14} />
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={10} style={{ marginTop: 4 }} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <MaterialIcons name="error-outline" size={48} color={Colors.error} />
        <Text style={{ marginTop: 12, color: Colors.onSurfaceVariant, textAlign: 'center' }}>{error || 'Candidate not found'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16, padding: 12 }}>
          <Text style={{ color: Colors.primary, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCall = () => {
    Linking.openURL(`tel:${data.phone}`);
  };

  const handleShare = () => {
    Alert.alert('Share Profile', `Sharing candidate profile: ${data.name}`);
  };

  const getStatusBadgeConfig = (status: string) => {
    switch (status) {
      case 'new':
        return { label: 'New', bg: Colors.primaryFixed, text: Colors.onPrimaryFixedVariant };
      case 'contacted':
        return { label: 'Contacted', bg: '#E8F5E9', text: '#27AE60' };
      case 'interested':
        return { label: 'Interested', bg: '#FFF3E0', text: '#F39C12' };
      case 'interview':
        return { label: 'Interview', bg: '#F3E5F5', text: '#8E24AA' };
      case 'selected':
        return { label: 'Selected', bg: '#E8F8EF', text: '#27AE60' };
      case 'hired':
        return { label: 'Hired', bg: Colors.primary, text: '#FFFFFF' };
      case 'rejected':
        return { label: 'Rejected', bg: '#FFEBEE', text: '#E74C3C' };
      default:
        return { label: 'New', bg: Colors.primaryFixed, text: Colors.onPrimaryFixedVariant };
    }
  };

  const handleAddNote = () => {
    if (newNoteText.trim() === '') {
      Alert.alert('Empty Note', 'Please enter some text before adding the note.');
      return;
    }

    const newNote: Note = {
      id: Date.now().toString(),
      author: 'Admin',
      text: newNoteText,
      date: 'Today',
    };

    setData((prev) => prev ? ({
      ...prev,
      notes: [newNote, ...prev.notes],
    }) : null);

    setNewNoteText('');
    setIsNoteModalVisible(false);
    Alert.alert('Note Added', 'Recruiter note appended successfully.');
  };

  const handleUpdateStatus = async (newStatus: CandidateDetail['status']) => {
    try {
      // Map screen status back to backend status
      const backendStatus = newStatus === 'interview' ? 'interview_scheduled' : newStatus;
      await candidateService.updateCandidate(candidateId, { status: backendStatus as any });
      setData((prev) => prev ? ({ ...prev, status: newStatus }) : prev);
      setIsStatusDropdownVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    }
  };

  const handleConvertToGuard = async () => {
    if (!data) return;
    if (data.status === 'hired') {
      Alert.alert('Already Hired', `${data.name} is already converted to a guard.`);
      return;
    }

    try {
      await candidateService.convertToGuard(candidateId, { base_salary: 18000, shift_type: 'day' });
      setData((prev) => prev ? ({ ...prev, status: 'hired' }) : prev);
      Alert.alert(
        'Conversion Successful',
        `${data.name} has been successfully hired. A new guard profile has been generated.`,
        [
          {
            text: 'View Profile',
            onPress: () => {
              navigation.navigate('GuardList');
            },
          },
          { text: 'OK' },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to convert candidate');
    }
  };

  // Determine stage positions
  const getStageIndex = (status: string) => {
    switch (status) {
      case 'new':
        return 0;
      case 'contacted':
        return 1;
      case 'interested':
        return 2;
      case 'interview':
        return 3;
      case 'selected':
        return 4;
      case 'hired':
        return 5;
      default:
        return 0;
    }
  };

  const activeStageIndex = getStageIndex(data.status);
  const statusConfig = getStatusBadgeConfig(data.status);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarLeft}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={s.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.onPrimary} />
          </TouchableOpacity>
          <Text style={s.topBarTitle} numberOfLines={1}>
            {data.name}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={s.topBarIconBtn}>
          <MaterialIcons name="more-vert" size={24} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Card ─── */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            <Image source={{ uri: data.avatar }} style={s.profileAvatar} />
            <View style={s.statusIndicatorDot} />
          </View>
          <Text style={s.profileName}>{data.name}</Text>
          <Text style={s.profilePhone}>{data.phone}</Text>
          
          <View style={[s.statusBadge, { backgroundColor: statusConfig.bg, marginTop: 8 }]}>
            <Text style={[s.statusText, { color: statusConfig.text }]}>
              {statusConfig.label.toUpperCase()}
            </Text>
          </View>

          <View style={s.profileActions}>
            <TouchableOpacity activeOpacity={0.8} style={s.callCircleBtn} onPress={handleCall}>
              <MaterialIcons name="call" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={s.actionCircleBtn}>
              <MaterialIcons name="edit" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={s.actionCircleBtn} onPress={handleShare}>
              <MaterialIcons name="share" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Stepper Card ─── */}
        <View style={s.stepperCard}>
          <Text style={s.sectionCardTitle}>Recruitment Pipeline</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.stepperScroll}
          >
            <View style={s.stepperContainer}>
              {/* Stepper horizontal line */}
              <View style={s.stepperLine} />

              {STAGES.map((stage, idx) => {
                const isCompleted = idx < activeStageIndex;
                const isActive = idx === activeStageIndex;
                const isFuture = idx > activeStageIndex;

                let iconName = 'done-all';
                if (isCompleted) iconName = 'check-circle';
                else if (isActive) iconName = 'person-search';
                else if (stage === 'Hired') iconName = 'badge';

                return (
                  <View key={stage} style={s.stepItem}>
                    <View
                      style={[
                        s.stepCircle,
                        isCompleted && s.stepCompletedCircle,
                        isActive && s.stepActiveCircle,
                        isFuture && s.stepFutureCircle,
                      ]}
                    >
                      <MaterialIcons
                        name={iconName as any}
                        size={20}
                        color={
                          isCompleted
                            ? '#27AE60'
                            : isActive
                            ? '#FFFFFF'
                            : Colors.outline
                        }
                      />
                    </View>
                    <Text
                      style={[
                        s.stepLabel,
                        isActive && s.stepLabelActive,
                        isFuture && s.stepLabelFuture,
                      ]}
                    >
                      {stage}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* ─── Recruiter Notes ─── */}
        <View style={s.notesCard}>
          <View style={s.notesCardHeader}>
            <Text style={s.sectionCardTitle}>Recruiter Notes</Text>
            <TouchableOpacity
              style={s.addNoteBtn}
              onPress={() => setIsNoteModalVisible(true)}
            >
              <MaterialIcons name="add" size={16} color={Colors.primary} />
              <Text style={s.addNoteBtnText}>ADD NOTE</Text>
            </TouchableOpacity>
          </View>
          <View style={s.notesList}>
            {data.notes.map((note, index) => (
              <View
                key={note.id}
                style={[
                  s.noteItem,
                  index === 0 ? s.noteItemFirst : s.noteItemNormal,
                ]}
              >
                <Text style={s.noteText}>"{note.text}"</Text>
                <View style={s.noteFooter}>
                  <Text style={s.noteMeta}>
                    By {note.author} ({note.date})
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Details List Card ─── */}
        <View style={s.detailsCard}>
          <View style={s.detailsCardHeader}>
            <Text style={s.detailsCardHeaderTitle}>Candidate Details</Text>
            <Text style={s.detailsCardId}>ID: CAN-{data.id.split('-')[1] || '4429'}</Text>
          </View>
          <View style={s.detailsCardBody}>
            <View style={s.detailRow}>
              <View style={s.detailIconWrapper}>
                <MaterialIcons name="school" size={20} color={Colors.primary} />
              </View>
              <View style={s.detailTextWrapper}>
                <Text style={s.detailLabel}>Education</Text>
                <Text style={s.detailValue}>{data.education}</Text>
              </View>
            </View>

            <View style={s.detailRow}>
              <View style={s.detailIconWrapper}>
                <MaterialIcons name="history" size={20} color={Colors.primary} />
              </View>
              <View style={s.detailTextWrapper}>
                <Text style={s.detailLabel}>Experience</Text>
                <Text style={s.detailValue}>{data.experience}</Text>
              </View>
            </View>

            <View style={s.detailRow}>
              <View style={s.detailIconWrapper}>
                <MaterialIcons name="height" size={20} color={Colors.primary} />
              </View>
              <View style={s.detailTextWrapper}>
                <Text style={s.detailLabel}>Height</Text>
                <Text style={s.detailValue}>{data.height}</Text>
              </View>
            </View>

            <View style={s.detailRow}>
              <View style={s.detailIconWrapper}>
                <MaterialIcons name="fitness-center" size={20} color={Colors.primary} />
              </View>
              <View style={s.detailTextWrapper}>
                <Text style={s.detailLabel}>Weight</Text>
                <Text style={s.detailValue}>{data.weight}</Text>
              </View>
            </View>

            <View style={s.detailRow}>
              <View style={s.detailIconWrapper}>
                <MaterialIcons name="cake" size={20} color={Colors.primary} />
              </View>
              <View style={s.detailTextWrapper}>
                <Text style={s.detailLabel}>Age</Text>
                <Text style={s.detailValue}>{data.age}</Text>
              </View>
            </View>

            <View style={s.detailRow}>
              <View style={s.detailIconWrapper}>
                <MaterialIcons name="language" size={20} color={Colors.primary} />
              </View>
              <View style={s.detailTextWrapper}>
                <Text style={s.detailLabel}>Languages</Text>
                <Text style={s.detailValue}>{data.languages}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── Verification Documents ─── */}
        <View style={s.docsCard}>
          <Text style={s.sectionCardTitle}>Verification Documents</Text>
          <View style={s.docsList}>
            {data.documents.map((doc, idx) => {
              const isPdf = doc.name.endsWith('.pdf');
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  style={s.docItem}
                  onPress={() => Alert.alert('Download', `Downloading ${doc.name}`)}
                >
                  <MaterialIcons
                    name={isPdf ? 'picture-as-pdf' : 'image'}
                    size={22}
                    color={isPdf ? '#DC2626' : '#2563EB'}
                    style={s.docIcon}
                  />
                  <View style={s.docInfo}>
                    <Text style={s.docName} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={s.docType}>{doc.type}</Text>
                  </View>
                  <MaterialIcons name="file-download" size={20} color={Colors.outline} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── Bottom Action Bar ─── */}
      <View style={[s.bottomActionBar, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <View style={s.bottomActionBarInner}>
          <View style={s.dropdownWrapper}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.statusDropdownBtn}
              onPress={() => setIsStatusDropdownVisible(true)}
            >
              <Text style={s.statusDropdownBtnText}>UPDATE STATUS</Text>
              <MaterialIcons name="expand-more" size={20} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={s.convertBtn}
            onPress={handleConvertToGuard}
          >
            <MaterialIcons name="verified-user" size={18} color="#FFFFFF" />
            <Text style={s.convertBtnText}>CONVERT TO GUARD</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ Add Recruiter Note Modal ═══ */}
      <Modal
        visible={isNoteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsNoteModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.modalContainer}
          >
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Recruiter Note</Text>
              <TouchableOpacity onPress={() => setIsNoteModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <TextInput
                style={s.noteTextInput}
                placeholder="Type your notes here..."
                placeholderTextColor={Colors.outline}
                multiline
                numberOfLines={4}
                value={newNoteText}
                onChangeText={setNewNoteText}
              />
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={s.modalCancelBtn}
                  onPress={() => setIsNoteModalVisible(false)}
                >
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.modalSaveBtn} onPress={handleAddNote}>
                  <Text style={s.modalSaveText}>Add Note</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ═══ Status Picker Modal ═══ */}
      <Modal
        visible={isStatusDropdownVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsStatusDropdownVisible(false)}
      >
        <TouchableOpacity
          style={s.statusBackdrop}
          activeOpacity={1}
          onPress={() => setIsStatusDropdownVisible(false)}
        >
          <View style={s.statusPickerContainer}>
            <View style={s.statusPickerHeader}>
              <Text style={s.statusPickerTitle}>Update Pipeline Status</Text>
              <TouchableOpacity onPress={() => setIsStatusDropdownVisible(false)}>
                <MaterialIcons name="close" size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={s.statusOptions}>
              {(['new', 'contacted', 'interested', 'interview', 'selected', 'rejected'] as const).map(
                (status) => {
                  const badge = getStatusBadgeConfig(status);
                  return (
                    <TouchableOpacity
                      key={status}
                      style={s.statusOptionItem}
                      onPress={() => handleUpdateStatus(status)}
                    >
                      <View style={[s.statusOptionDot, { backgroundColor: badge.text }]} />
                      <Text style={s.statusOptionText}>Move to {badge.label}</Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    height: 56,
    backgroundColor: Colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 50,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onPrimary,
    flex: 1,
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.stackMd,
    gap: Spacing.stackMd,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: Colors.surfaceContainer,
  },
  statusIndicatorDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  callCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  actionCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  stepperScroll: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 540,
    position: 'relative',
    paddingVertical: 10,
  },
  stepperLine: {
    position: 'absolute',
    top: 28,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: Colors.outlineVariant,
    zIndex: 0,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    zIndex: 10,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    marginBottom: 6,
  },
  stepCompletedCircle: {
    backgroundColor: '#E8F5E9',
    borderColor: '#27AE60',
  },
  stepActiveCircle: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  stepFutureCircle: {
    backgroundColor: Colors.surfaceContainer,
    borderColor: Colors.outlineVariant,
  },
  stepLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  stepLabelActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  stepLabelFuture: {
    color: Colors.outline,
  },
  notesCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
  },
  notesCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addNoteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  notesList: {
    gap: 12,
  },
  noteItem: {
    padding: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  noteItemFirst: {
    borderColor: Colors.primary,
  },
  noteItemNormal: {
    borderColor: Colors.outlineVariant,
  },
  noteText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  noteFooter: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  noteMeta: {
    fontSize: 10,
    color: Colors.outline,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  detailsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  detailsCardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  detailsCardId: {
    fontSize: 12,
    color: Colors.outline,
  },
  detailsCardBody: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  detailRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrapper: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  docsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
  },
  docsList: {
    marginTop: 12,
    gap: 10,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8,
    padding: 12,
  },
  docIcon: {
    marginRight: 10,
  },
  docInfo: {
    flex: 1,
    gap: 2,
  },
  docName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  docType: {
    fontSize: 10,
    color: Colors.outline,
    textTransform: 'uppercase',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    zIndex: 40,
  },
  bottomActionBarInner: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  dropdownWrapper: {
    flex: 1,
  },
  statusDropdownBtn: {
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusDropdownBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  convertBtn: {
    flex: 1.2,
    backgroundColor: '#2E7D32',
    borderRadius: 4,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 2,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  convertBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  modalBody: {
    padding: 16,
  },
  noteTextInput: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: Colors.onSurface,
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: Colors.primaryContainer,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Status Backdrop
  statusBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  statusPickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  statusPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  statusPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  statusOptions: {
    paddingVertical: 8,
  },
  statusOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  statusOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
});
