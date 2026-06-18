import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import Skeleton from '../components/Skeleton';
import { getComplaintById, addComment, resolveComplaint } from '../api/complaintService';
import { supabase } from '../api/supabase';
import SuccessModal from '../components/SuccessModal';
import type { Complaint, ComplaintComment, UserRole } from '../types/workforce';

interface ComplaintDetailScreenProps {
  route: any;
  navigation: any;
}

export default function ComplaintDetailScreen({ route, navigation }: ComplaintDetailScreenProps) {
  const { complaintId } = route.params;
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [complaint, setComplaint] = useState<any | null>(null);
  const [comments, setComments] = useState<ComplaintComment[]>([]);
  const [loading, setLoading] = useState(true);

  // Current logged in user info
  const [userRole, setUserRole] = useState<UserRole>('client_user');
  const [userId, setUserId] = useState<string>('');

  // Comment Form states
  const [commentText, setCommentText] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Resolution Modal/Form
  const [resolving, setResolving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [onSuccessClose, setOnSuccessClose] = useState<() => void>(() => () => {});

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // Resolve current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: userDetails } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (userDetails) setUserRole(userDetails.role as UserRole);
      }

      // Fetch complaint detail
      const data = await getComplaintById(complaintId);
      setComplaint(data);
      setComments(data.comments);

    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to retrieve complaint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [complaintId]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      await addComment(complaintId, commentText.trim(), actionTaken.trim() || undefined);
      setCommentText('');
      setActionTaken('');
      setSuccessMessage('Comment posted.');
      setOnSuccessClose(() => () => {});
      setShowSuccessModal(true);
      loadData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleResolve = async () => {
    if (!resolutionNote.trim()) {
      return Alert.alert('Validation Error', 'Resolution details are required.');
    }

    try {
      setSubmittingComment(true);
      await resolveComplaint(complaintId, resolutionNote.trim());
      setResolving(false);
      setResolutionNote('');
      setSuccessMessage('Complaint marked as resolved.');
      setOnSuccessClose(() => () => {});
      setShowSuccessModal(true);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resolve complaint.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Determine if user is permitted to resolve based on complaint level and role:
  // Level 1: Supervisor (or higher)
  // Level 2: Operations Manager (or higher)
  // Level 3: Admin (or higher)
  const canUserResolve = () => {
    if (!complaint) return false;
    if (complaint.status === 'resolved' || complaint.status === 'closed') return false;

    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isOpsManager = userRole === 'operations_manager' || isAdmin;
    const isSupervisor = userRole === 'supervisor' || isOpsManager;

    if (complaint.current_level === 1) return isSupervisor;
    if (complaint.current_level === 2) return isOpsManager;
    return isAdmin; // Level 3
  };

  if (loading) {
    return (
      <View style={s.container}>
        {/* Header Skeleton */}
        <View style={[s.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Complaint Detail</Text>
          <View style={s.timelineBtn}>
            <MaterialIcons name="history" size={24} color={Colors.primary} />
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scrollContent}>
          {/* Main Info Card Skeleton */}
          <View style={s.card}>
            <View style={[s.titleRow, { marginBottom: 16 }]}>
              <Skeleton width="50%" height={22} />
              <Skeleton width="15%" height={20} borderRadius={4} />
            </View>

            <View style={{ gap: 8, marginBottom: 20 }}>
              <Skeleton width="100%" height={16} />
              <Skeleton width="90%" height={16} />
              <Skeleton width="60%" height={16} />
            </View>

            <View style={s.metadataGrid}>
              <View style={s.metaCol}>
                <Skeleton width="40%" height={10} style={{ marginBottom: 6 }} />
                <Skeleton width="60%" height={16} />
              </View>
              <View style={s.metaCol}>
                <Skeleton width="40%" height={10} style={{ marginBottom: 6 }} />
                <Skeleton width="60%" height={16} />
              </View>
            </View>
          </View>

          {/* Activity Log Skeleton */}
          <View style={s.commentsSection}>
            <Skeleton width="35%" height={18} style={{ marginBottom: 12 }} />
            {Array.from({ length: 2 }).map((_, idx) => (
              <View key={idx} style={[s.commentCard, { gap: 8 }]}>
                <View style={[s.cmtHeader, { marginBottom: 4 }]}>
                  <Skeleton width="50%" height={12} />
                  <Skeleton width="20%" height={10} />
                </View>
                <Skeleton width="90%" height={14} />
                <Skeleton width="40%" height={10} style={{ marginTop: 4 }} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  const isResolved = complaint.status === 'resolved' || complaint.status === 'closed';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <View style={s.innerContainer}>
        {/* Header */}
        <View style={[s.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Complaint Detail</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ComplaintTimeline', { complaintId })}
            style={s.timelineBtn}
          >
            <MaterialIcons name="history" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          {/* Main Info Card */}
          <View style={s.card}>
            <View style={s.titleRow}>
              <Text style={s.category}>{complaint.category}</Text>
              <View style={[s.levelBadge, complaint.current_level > 1 && s.escalatedBadge]}>
                <Text style={s.levelText}>L{complaint.current_level}</Text>
              </View>
            </View>

            <Text style={s.description}>{complaint.description}</Text>

            <View style={s.metadataGrid}>
              <View style={s.metaCol}>
                <Text style={s.metaLabel}>Status</Text>
                <Text style={s.metaValue}>{complaint.status.toUpperCase()}</Text>
              </View>
              {complaint.severity && (
                <View style={s.metaCol}>
                  <Text style={s.metaLabel}>Severity</Text>
                  <Text style={s.metaValue}>{complaint.severity.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* Resolve trigger button */}
            {canUserResolve() && !resolving && (
              <TouchableOpacity style={s.resolveBtn} onPress={() => setResolving(true)}>
                <MaterialIcons name="check-circle" size={18} color={Colors.onPrimary} />
                <Text style={s.resolveBtnText}>Mark as Resolved</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Resolve Form inside details */}
          {resolving && (
            <View style={s.card}>
              <Text style={s.sectionHeader}>Resolve Complaint</Text>
              <TextInput
                style={[s.input, s.textArea]}
                value={resolutionNote}
                onChangeText={setResolutionNote}
                placeholder="Describe resolution details/actions taken..."
                placeholderTextColor={Colors.outline}
                multiline
              />
              <View style={s.btnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setResolving(false)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmResolveBtn} onPress={handleResolve}>
                  <Text style={s.confirmResolveText}>Resolve Ticket</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Comments/Timeline Area */}
          <View style={s.commentsSection}>
            <Text style={s.sectionHeader}>Activity Log</Text>
            {comments.slice(-3).map((cmt) => (
              <View key={cmt.id} style={s.commentCard}>
                <View style={s.cmtHeader}>
                  <Text style={s.cmtAuthor}>{cmt.author?.name} ({cmt.author?.role})</Text>
                  <Text style={s.cmtTime}>
                    {new Date(cmt.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={s.cmtText}>{cmt.comment_text}</Text>
                {cmt.action_taken && (
                  <View style={s.actionBadge}>
                    <Text style={s.actionBadgeText}>Action: {cmt.action_taken}</Text>
                  </View>
                )}
              </View>
            ))}

            {comments.length > 3 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ComplaintTimeline', { complaintId })}
                style={s.viewAllTimelineLink}
              >
                <Text style={s.viewAllText}>View Full Timeline History ({comments.length} items)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* New Comment Input */}
          {!isResolved && (
            <View style={s.addCommentCard}>
              <Text style={s.sectionHeader}>Add Update / Comment</Text>
              
              <TextInput
                style={[s.input, s.commentInput]}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Type your comment..."
                placeholderTextColor={Colors.outline}
              />

              {userRole !== 'client_user' && (
                <TextInput
                  style={[s.input, s.actionInput]}
                  value={actionTaken}
                  onChangeText={setActionTaken}
                  placeholder="Action taken (optional, e.g. Contacted electrician)"
                  placeholderTextColor={Colors.outline}
                />
              )}

              <TouchableOpacity
                style={[s.postCommentBtn, !commentText.trim() && s.disabledBtn]}
                onPress={handleAddComment}
                disabled={submittingComment || !commentText.trim()}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color={Colors.onPrimary} />
                ) : (
                  <Text style={s.postCommentText}>Post Comment</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      <SuccessModal
        visible={showSuccessModal}
        description={successMessage}
        onClose={() => { setShowSuccessModal(false); onSuccessClose(); }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  timelineBtn: {
    padding: 8,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.onBackground,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.screenPadding,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    ...Typography.h1,
    fontSize: 20,
    color: Colors.onSurface,
  },
  levelBadge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.default,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  escalatedBadge: {
    backgroundColor: Colors.secondary,
  },
  levelText: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  description: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 20,
  },
  metadataGrid: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginBottom: 4,
  },
  metaValue: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  resolveBtn: {
    backgroundColor: Colors.successGreen,
    borderRadius: BorderRadius.lg,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  resolveBtnText: {
    ...Typography.button,
    color: Colors.onPrimary,
    fontSize: 14,
  },
  sectionHeader: {
    ...Typography.h2,
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 16,
    height: 48,
    color: Colors.onSurface,
    ...Typography.body,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cancelText: {
    ...Typography.button,
    color: Colors.onSurfaceVariant,
    fontSize: 14,
  },
  confirmResolveBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successGreen,
  },
  confirmResolveText: {
    ...Typography.button,
    color: Colors.onPrimary,
    fontSize: 14,
  },
  commentsSection: {
    marginBottom: 20,
  },
  commentCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cmtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cmtAuthor: {
    ...Typography.labelSm,
    fontWeight: '700',
    color: Colors.primary,
  },
  cmtTime: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.outline,
  },
  cmtText: {
    ...Typography.body,
    color: Colors.onSurface,
    lineHeight: 18,
  },
  actionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.default,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  actionBadgeText: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.onPrimaryFixedVariant || Colors.primary,
  },
  viewAllTimelineLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewAllText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontWeight: '700',
  },
  addCommentCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  commentInput: {
    marginBottom: 12,
  },
  actionInput: {
    marginBottom: 16,
  },
  postCommentBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  postCommentText: {
    ...Typography.button,
    color: Colors.onPrimary,
    fontSize: 14,
  },
});
