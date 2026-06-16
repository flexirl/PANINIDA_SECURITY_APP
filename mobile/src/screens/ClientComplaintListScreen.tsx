import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getComplaintsForSite } from '../api/complaintService';
import { supabase } from '../api/supabase';
import ClientTopNav from '../components/ClientTopNav';
import ClientBottomNav from '../components/ClientBottomNav';
import type { Complaint, ComplaintStatus } from '../types/workforce';

interface ClientComplaintListScreenProps {
  navigation: any;
}

export default function ClientComplaintListScreen({ navigation }: ClientComplaintListScreenProps) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [siteId, setSiteId] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);

  // Resolve current client user's siteId on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: client } = await supabase
            .from('client_users')
            .select('site_id')
            .eq('user_id', user.id)
            .single();

          if (client) {
            setSiteId(client.site_id);
          } else {
            // Check fallback for admins
            const { data: firstSite } = await supabase.from('sites').select('id').limit(1).single();
            if (firstSite) setSiteId(firstSite.id);
          }
        }
      } catch (err) {
        console.warn('Error resolving client user site:', err);
      }
    })();
  }, []);

  const fetchComplaints = async () => {
    if (!siteId) return;
    try {
      setLoading(true);
      const data = await getComplaintsForSite(siteId);
      setComplaints(data);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to retrieve complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (siteId) {
      fetchComplaints();
    }
  }, [siteId]);

  // SLA Countdown Timer display
  const getSlaCountdown = (deadline?: string | null) => {
    if (!deadline) return '';
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return 'SLA Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case 'open':
        return Colors.outline;
      case 'in_progress':
        return Colors.infoBlue;
      case 'escalated_l2':
      case 'escalated_l3':
        return Colors.dangerRed;
      case 'resolved':
        return Colors.successGreen;
      default:
        return Colors.outline;
    }
  };

  const getStatusLabel = (status: ComplaintStatus) => {
    if (status.startsWith('escalated')) return 'ESCALATED';
    return status.toUpperCase();
  };

  const filteredComplaints = complaints.filter((c) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'resolved') return c.status === 'resolved' || c.status === 'closed';
    if (selectedFilter === 'in_progress') return c.status === 'in_progress';
    if (selectedFilter === 'open') return c.status === 'open' || c.status.startsWith('escalated');
    return true;
  });

  const renderItem = ({ item }: { item: Complaint }) => {
    const isSlaActive = item.status !== 'resolved' && item.status !== 'closed';
    const countdown = getSlaCountdown(item.sla_deadline);

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={s.card}
        onPress={() => navigation.navigate('ClientComplaintDetail', { complaintId: item.id })}
      >
        <View style={s.cardHeader}>
          <Text style={s.categoryName}>{item.category}</Text>
          <View style={[s.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[s.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <Text style={s.description} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={s.divider} />

        <View style={s.cardFooter}>
          <Text style={s.timestamp}>
            Raised {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>

          {isSlaActive && item.sla_deadline && (
            <View style={s.slaRow}>
              <MaterialIcons name="schedule" size={14} color={countdown === 'SLA Expired' ? Colors.dangerRed : Colors.outline} />
              <Text style={[s.slaText, countdown === 'SLA Expired' && s.dangerText]}>
                {countdown}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container]}>
      {/* Top App Bar */}
      <ClientTopNav showBack />

      {/* Screen Title & Actions */}
      <View style={s.pageHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.pageBackButton}
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.pageTitle}>Complaints</Text>
        <TouchableOpacity
          onPress={() => siteId && navigation.navigate('ClientRaiseComplaint', { siteId })}
          style={s.addButton}
          disabled={!siteId}
          accessibilityLabel="File a complaint"
        >
          <MaterialIcons name="add" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={s.tabContainer}>
        {(['all', 'open', 'in_progress', 'resolved'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[s.tabItem, selectedFilter === filter && s.tabItemActive]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[s.tabText, selectedFilter === filter && s.tabTextActive]}>
              {filter === 'all' ? 'All' : filter === 'in_progress' ? 'In Progress' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Body List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredComplaints.length === 0 ? (
        <View style={s.center}>
          <MaterialIcons name="assignment-turned-in" size={64} color={Colors.surfaceDim} />
          <Text style={s.emptyText}>No complaints match this filter</Text>
        </View>
      ) : (
        <FlatList
          data={filteredComplaints}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 16) + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ═══ Bottom Navigation ═══ */}
      <ClientBottomNav activeTab="more" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
  },
  pageBackButton: {
    padding: 6,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    marginRight: 10,
  },
  addButton: {
    padding: 6,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  pageTitle: {
    ...Typography.h3,
    color: Colors.onBackground,
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 12,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  tabItemActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...Typography.bodyBold,
    color: Colors.onSurfaceVariant,
    marginTop: 12,
  },
  list: {
    padding: Spacing.screenPadding,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    ...Typography.labelSm,
    fontSize: 10,
    fontWeight: '700',
  },
  description: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
  slaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slaText: {
    ...Typography.labelSm,
    color: Colors.outline,
    fontWeight: '600',
  },
  dangerText: {
    color: Colors.dangerRed,
  },
});
