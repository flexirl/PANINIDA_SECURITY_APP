import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getEscalatedComplaints } from '../api/operationsService';
import { resolveComplaint } from '../api/complaintService';
import SuccessModal from '../components/SuccessModal';
import type { Complaint } from '../types/workforce';

// Countdown Timer component for each complaint card
function SLACountdown({ deadline }: { deadline: string | null | undefined }) {
  const s = useScaledStyles(styles);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline) {
      setTimeLeft('No SLA Set');
      return;
    }

    const updateTimer = () => {
      const targetTime = new Date(deadline).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setIsExpired(true);
        const absDiff = Math.abs(diff);
        const hours = Math.floor(absDiff / (1000 * 60 * 60));
        const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((absDiff % (1000 * 60)) / 1000);
        setTimeLeft(`Expired by ${hours}h ${mins}m ${secs}s`);
      } else {
        setIsExpired(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <View style={s.timerContainer}>
      <MaterialIcons
        name="access-time"
        size={16}
        color={isExpired ? Colors.dangerRed : Colors.primary}
      />
      <Text style={[s.timerText, isExpired ? s.timerTextExpired : s.timerTextActive]}>
        {timeLeft}
      </Text>
    </View>
  );
}

export default function EscalatedComplaintsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeTab, setActiveTab] = useState<2 | 3>(2); // 2: L2 Escalated, 3: L3 Escalated

  // Resolution Modal state
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [submittingResolve, setSubmittingResolve] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [onSuccessClose, setOnSuccessClose] = useState<() => void>(() => () => {});

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const data = await getEscalatedComplaints();
      setComplaints(data);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err?.message || 'Failed to load escalated complaints.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const handleResolvePress = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    setResolutionNote('');
    setResolveModalVisible(true);
  };

  const handleResolveSubmit = async () => {
    if (!resolutionNote.trim()) {
      Alert.alert('Error', 'Please enter a resolution note.');
      return;
    }

    if (!selectedComplaintId) return;

    try {
      setSubmittingResolve(true);
      await resolveComplaint(selectedComplaintId, resolutionNote);
      setSuccessMessage('Complaint resolved successfully.');
      setOnSuccessClose(() => () => {});
      setShowSuccessModal(true);
      setResolveModalVisible(false);
      fetchComplaints();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err?.message || 'Failed to resolve complaint.');
    } finally {
      setSubmittingResolve(false);
    }
  };

  const getSeverityColor = (severity?: string | null) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return Colors.dangerRed;
      case 'high':
        return Colors.secondary;
      case 'medium':
        return Colors.warningAmber;
      default:
        return Colors.infoBlue;
    }
  };

  // Filter complaints by active level tab switcher
  const filteredComplaints = complaints.filter(
    (c) => c.current_level === activeTab
  );

  const renderComplaintCard = ({ item }: { item: Complaint }) => {
    const severityColor = getSeverityColor(item.severity);

    return (
      <View style={s.card}>
        <TouchableOpacity
          style={s.cardClickable}
          onPress={() => navigation.navigate('ComplaintDetail', { complaintId: item.id })}
          activeOpacity={0.7}
        >
          {/* Header row */}
          <View style={s.cardHeader}>
            <Text style={s.categoryText}>{item.category}</Text>
            {item.severity && (
              <View style={[s.severityBadge, { backgroundColor: severityColor }]}>
                <Text style={s.severityText}>{item.severity.toUpperCase()}</Text>
              </View>
            )}
          </View>

          {/* Details */}
          <Text style={s.siteText}>
            Site: <Text style={s.siteNameHighlight}>{item.site?.site_name || 'N/A'}</Text>
          </Text>
          <Text style={s.raisedByText}>
            Raised By: {item.raised_by_user?.name || 'Client'} ({item.raised_by_user?.role || 'client'})
          </Text>
          <Text style={s.description} numberOfLines={3}>
            {item.description}
          </Text>

          {/* SLA Countdown Timer */}
          <SLACountdown deadline={item.sla_deadline} />
        </TouchableOpacity>

        <View style={s.cardActions}>
          <TouchableOpacity
            style={s.resolveBtn}
            onPress={() => handleResolvePress(item.id)}
          >
            <MaterialIcons name="done" size={18} color={Colors.onPrimary} />
            <Text style={s.resolveBtnText}>Resolve Complaint</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={s.emptyContainer}>
      <MaterialIcons name="done-all" size={60} color={Colors.successGreen} />
      <Text style={s.emptyTitle}>All Clear!</Text>
      <Text style={s.emptySubtitle}>
        No Level {activeTab} escalated complaints requiring action.
      </Text>
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Navbar */}
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.navbarTitle}>Escalated Complaints</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tab, activeTab === 2 && s.activeTab]}
          onPress={() => setActiveTab(2)}
        >
          <Text style={[s.tabText, activeTab === 2 && s.activeTabText]}>Level 2 (Ops)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 3 && s.activeTab]}
          onPress={() => setActiveTab(3)}
        >
          <Text style={[s.tabText, activeTab === 3 && s.activeTabText]}>Level 3 (Admin)</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Fetching complaints...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredComplaints}
          renderItem={renderComplaintCard}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        />
      )}

      {/* Resolution Dialog Modal */}
      <Modal
        visible={resolveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResolveModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Resolve Complaint</Text>
            <Text style={s.modalSubtitle}>
              Please enter notes describing the action taken to resolve this ticket.
            </Text>

            <TextInput
              style={s.textInput}
              multiline
              numberOfLines={4}
              placeholder="e.g. Dispatched supervisor to site, replacement staff deployed."
              value={resolutionNote}
              onChangeText={setResolutionNote}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalCancelBtn]}
                onPress={() => setResolveModalVisible(false)}
                disabled={submittingResolve}
              >
                <Text style={s.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modalBtn, s.modalSubmitBtn]}
                onPress={handleResolveSubmit}
                disabled={submittingResolve}
              >
                {submittingResolve ? (
                  <ActivityIndicator size="small" color={Colors.onPrimary} />
                ) : (
                  <Text style={s.modalSubmitBtnText}>Resolve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SuccessModal
        visible={showSuccessModal}
        description={successMessage}
        onClose={() => { setShowSuccessModal(false); onSuccessClose(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  navbarTitle: {
    ...Typography.h2,
    color: Colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    ...Typography.bodyBold,
    color: Colors.outline,
  },
  activeTabText: {
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.outline,
    marginTop: 8,
  },
  listContent: {
    padding: Spacing.screenPadding,
    paddingBottom: Spacing.stackLg,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginBottom: Spacing.stackMd,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardClickable: {
    padding: Spacing.stackMd,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryText: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.primary,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.default,
  },
  severityText: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: 10,
  },
  siteText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  siteNameHighlight: {
    ...Typography.bodyBold,
    color: Colors.primaryContainer,
  },
  raisedByText: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginBottom: 8,
  },
  description: {
    ...Typography.body,
    color: Colors.onSurface,
    marginBottom: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    alignSelf: 'flex-start',
  },
  timerText: {
    ...Typography.labelSm,
    fontWeight: '600',
  },
  timerTextActive: {
    color: Colors.primary,
  },
  timerTextExpired: {
    color: Colors.dangerRed,
    fontWeight: '700',
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.stackMd,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceContainerLow,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.successGreen,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
  },
  resolveBtnText: {
    ...Typography.button,
    color: Colors.onPrimary,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.primary,
    marginTop: 16,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    ...Typography.body,
    color: Colors.outline,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    padding: 12,
    textAlignVertical: 'top',
    height: 100,
    marginBottom: 20,
    color: Colors.onSurface,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  modalCancelBtnText: {
    ...Typography.button,
    color: Colors.onSurfaceVariant,
    fontSize: 14,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.primary,
  },
  modalSubmitBtnText: {
    ...Typography.button,
    color: Colors.onPrimary,
    fontSize: 14,
  },
});
