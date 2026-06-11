import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { approveCorrection } from '../api/workforceAttendanceService';
import { supabase } from '../api/supabase';
import CategoryBadge from '../components/CategoryBadge';
import type { WorkforceAttendance } from '../types/workforce';

interface AttendanceCorrectionScreenProps {
  navigation: any;
}

export default function AttendanceCorrectionScreen({ navigation }: AttendanceCorrectionScreenProps) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [corrections, setCorrections] = useState<WorkforceAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch sites assigned to this supervisor
      // In Req 2.1, assigned_supervisor_id points to workforce_personnel.id.
      // So first look up the personnel profile matching this user.id.
      const { data: personnel } = await supabase
        .from('workforce_personnel')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let siteQuery = supabase.from('sites').select('id');
      if (personnel) {
        siteQuery = siteQuery.or(`site_manager_id.eq.${user.id},assigned_supervisor_id.eq.${personnel.id}`);
      } else {
        siteQuery = siteQuery.eq('site_manager_id', user.id);
      }

      const { data: sites } = await siteQuery;
      const siteIds = (sites || []).map(s => s.id);

      if (siteIds.length === 0) {
        setCorrections([]);
        return;
      }

      // 2. Fetch pending manual check-ins
      const { data: attendanceData, error } = await supabase
        .from('workforce_attendance')
        .select(`
          *,
          personnel:workforce_personnel(
            *,
            category:workforce_categories(*)
          )
        `)
        .in('site_id', siteIds)
        .eq('is_manual_entry', true)
        .is('approved_by', null)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      setCorrections(attendanceData || []);

    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to retrieve corrections list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setActionId(id);
      await approveCorrection(id);
      Alert.alert('Approved', 'Attendance correction has been approved.');
      
      // Update local state
      setCorrections(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to approve correction.');
    } finally {
      setActionId(null);
    }
  };

  const renderItem = ({ item }: { item: WorkforceAttendance }) => {
    const isProcessing = actionId === item.id;

    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.personInfo}>
            <Text style={s.personName}>{item.personnel?.name}</Text>
            <Text style={s.personId}>{item.personnel?.employee_id}</Text>
          </View>
          <CategoryBadge categoryName={item.personnel?.category?.name || 'Staff'} size="sm" />
        </View>

        <View style={s.divider} />

        <View style={s.cardBody}>
          <View style={s.infoRow}>
            <MaterialIcons name="event" size={16} color={Colors.outline} />
            <Text style={s.infoText}>Date: {item.attendance_date}</Text>
          </View>
          <View style={s.infoRow}>
            <MaterialIcons name="schedule" size={16} color={Colors.outline} />
            <Text style={s.infoText}>Shift: {(item.shift_type || 'day').toUpperCase()}</Text>
          </View>
          <View style={s.infoRow}>
            <MaterialIcons name="check" size={16} color={Colors.outline} />
            <Text style={s.infoText}>Submitted Status: {item.status.toUpperCase()}</Text>
          </View>
          {item.remarks ? (
            <View style={s.remarksContainer}>
              <Text style={s.remarksLabel}>Remarks:</Text>
              <Text style={s.remarksText}>{item.remarks}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[s.approveBtn, isProcessing && s.disabledBtn]}
          onPress={() => handleApprove(item.id)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={Colors.onPrimary} />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={18} color={Colors.onPrimary} />
              <Text style={s.approveText}>Approve Correction</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Corrections</Text>
        <View style={s.placeholder} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : corrections.length === 0 ? (
        <View style={s.center}>
          <MaterialIcons name="verified" size={64} color={Colors.successGreen + '40'} />
          <Text style={s.emptyText}>All corrections approved!</Text>
          <Text style={s.emptySub}>No pending manual entries awaiting approval.</Text>
        </View>
      ) : (
        <FlatList
          data={corrections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              colors={[Colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  placeholder: {
    width: 40,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.onBackground,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...Typography.h2,
    color: Colors.onSurface,
    marginTop: 16,
  },
  emptySub: {
    ...Typography.body,
    color: Colors.outline,
    marginTop: 6,
    textAlign: 'center',
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
  },
  personInfo: {
    flex: 1,
    marginRight: 12,
  },
  personName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginBottom: 2,
  },
  personId: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: 12,
  },
  cardBody: {
    marginBottom: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
  },
  remarksContainer: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  remarksLabel: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginBottom: 4,
  },
  remarksText: {
    ...Typography.body,
    color: Colors.onSurface,
  },
  approveBtn: {
    backgroundColor: Colors.successGreen,
    borderRadius: BorderRadius.lg,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  approveText: {
    ...Typography.button,
    color: Colors.onPrimary,
    fontSize: 14,
  },
});
