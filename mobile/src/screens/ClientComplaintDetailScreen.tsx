import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getComplaintById, addComment } from '../api/complaintService';
import ClientTopNav from '../components/ClientTopNav';
import type { Complaint, ComplaintComment, ComplaintEscalation, ComplaintStatus } from '../types/workforce';

export default function ClientComplaintDetailScreen({ route, navigation }: any) {
  const { complaintId } = route.params || {};
  const insets = useSafeAreaInsets();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<ComplaintComment[]>([]);
  const [escalations, setEscalations] = useState<ComplaintEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (complaintId) {
      fetchDetails();
    } else {
      Alert.alert('Error', 'Missing complaint ID');
      navigation.goBack();
    }
  }, [complaintId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await getComplaintById(complaintId);
      setComplaint(data);
      setComments(data.comments || []);
      setEscalations(data.escalations || []);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load complaint details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      setSubmitting(true);
      const newComment = await addComment(complaintId, commentText);
      setComments([...comments, newComment]);
      setCommentText('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status?: ComplaintStatus) => {
    switch (status) {
      case 'open':
        return '#747780'; // outline
      case 'in_progress':
        return '#3b82f6'; // infoBlue
      case 'escalated_l2':
      case 'escalated_l3':
        return '#B02021'; // dangerRed
      case 'resolved':
      case 'closed':
        return '#10b981'; // successGreen
      default:
        return '#747780';
    }
  };

  const getStatusLabel = (status?: ComplaintStatus) => {
    if (!status) return 'UNKNOWN';
    if (status.startsWith('escalated')) return 'ESCALATED';
    return status.replace('_', ' ').toUpperCase();
  };

  const isClosed = complaint?.status === 'resolved' || complaint?.status === 'closed';

  // Merge comments and escalations into a single timeline array, sorted by date
  const timeline: Array<any> = [
    ...comments.map(c => ({ ...c, type: 'comment', date: new Date(c.created_at) })),
    ...escalations.map(e => ({ ...e, type: 'escalation', date: new Date(e.escalated_at) }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#002752" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ClientTopNav showBack />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Details */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.categoryContainer}>
              <Text style={styles.ticketId}>Ticket #{complaint?.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.categoryTitle}>{complaint?.category}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(complaint?.status) + '15' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(complaint?.status) }]}>
                {getStatusLabel(complaint?.status)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.descriptionText}>{complaint?.description}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="person" size={16} color="#747780" />
              <Text style={styles.metaText}>{complaint?.raised_by_user?.name || 'Client'}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="event" size={16} color="#747780" />
              <Text style={styles.metaText}>
                {new Date(complaint?.created_at || '').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Timeline Section */}
        <Text style={styles.sectionTitle}>Timeline & Updates</Text>

        <View style={styles.timelineContainer}>
          {timeline.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Text style={styles.emptyTimelineText}>No updates yet.</Text>
            </View>
          ) : (
            timeline.map((item, index) => {
              const isLast = index === timeline.length - 1;
              const isComment = item.type === 'comment';

              return (
                <View key={item.id} style={styles.timelineRow}>
                  {/* Timeline Line & Dot */}
                  <View style={styles.timelineDecorator}>
                    <View style={[styles.timelineDot, !isComment && styles.timelineDotEscalation]} />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>

                  {/* Content Card */}
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineAuthor}>
                        {isComment ? item.author?.name || 'Unknown' : 'System Action'}
                        {isComment && <Text style={styles.timelineRole}> • {item.author?.role === 'client_user' ? 'Client' : 'Operations'}</Text>}
                      </Text>
                      <Text style={styles.timelineTime}>
                        {item.date.toLocaleDateString([], { month: 'short', day: 'numeric' })} {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                    {isComment ? (
                      <View style={styles.commentBox}>
                        <Text style={styles.commentText}>{item.comment_text}</Text>
                        {item.action_taken && (
                          <View style={styles.actionBox}>
                            <MaterialIcons name="check-circle" size={14} color="#10b981" />
                            <Text style={styles.actionText}>{item.action_taken}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.escalationBox}>
                        <MaterialIcons name="warning" size={16} color="#B02021" />
                        <Text style={styles.escalationText}>Escalated to Level {item.to_level}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Input Footer */}
      {!isClosed && (
        <View style={[styles.inputFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment or reply..."
            placeholderTextColor="#747780"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <MaterialIcons name="send" size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fd',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf9fd',
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryContainer: {
    flex: 1,
    paddingRight: 12,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#747780',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00132d',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#eeedf2',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: '#43474f',
    lineHeight: 22,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#747780',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00132d',
    marginBottom: -8,
  },
  timelineContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
  },
  emptyTimeline: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTimelineText: {
    fontSize: 14,
    color: '#747780',
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineDecorator: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#002752',
    borderWidth: 2,
    borderColor: '#e0e7ff',
    marginTop: 4,
    zIndex: 2,
  },
  timelineDotEscalation: {
    backgroundColor: '#B02021',
    borderColor: '#fef2f2',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#eeedf2',
    marginTop: -8,
    marginBottom: -4,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 24,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00132d',
  },
  timelineRole: {
    fontSize: 12,
    fontWeight: '500',
    color: '#747780',
  },
  timelineTime: {
    fontSize: 10,
    color: '#747780',
  },
  commentBox: {
    backgroundColor: '#f4f3f7',
    padding: 12,
    borderRadius: 12,
    borderTopLeftRadius: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#43474f',
    lineHeight: 20,
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  escalationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
    borderTopLeftRadius: 4,
    gap: 8,
  },
  escalationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B02021',
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 198, 208, 0.2)',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f4f3f7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 48,
    maxHeight: 120,
    fontSize: 15,
    color: '#00132d',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#002752',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
