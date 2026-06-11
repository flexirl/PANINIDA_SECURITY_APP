import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import { getWorkforceRoster } from '../api/siteAssignmentService';
import { supabase } from '../api/supabase';
import CategoryBadge from '../components/CategoryBadge';
import AttendanceStatusBadge from '../components/AttendanceStatusBadge';
import type { WorkforcePersonnel, ShiftType } from '../types/workforce';

interface WorkforceRosterScreenProps {
  route: any;
  navigation: any;
}

export default function WorkforceRosterScreen({ route, navigation }: WorkforceRosterScreenProps) {
  const { siteId } = route.params;
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);
  const { selectedCategory, categoryFilterIds, getLabel } = usePersonnelCategory();

  const [siteName, setSiteName] = useState('');
  const [roster, setRoster] = useState<{ title: string; data: any[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSiteName = async () => {
    const { data } = await supabase
      .from('sites')
      .select('site_name')
      .eq('id', siteId)
      .single();
    if (data) setSiteName(data.site_name);
  };

  const loadData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      await fetchSiteName();
      const rosterData = await getWorkforceRoster(siteId, categoryFilterIds);
      setRoster(rosterData);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to retrieve roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [siteId, categoryFilterIds]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // Filter roster sections based on search query
  const filteredRoster = roster
    .map(section => {
      const filteredData = section.data.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return {
        ...section,
        data: filteredData
      };
    })
    .filter(section => section.data.length > 0);

  const renderRosterItem = ({ item }: { item: WorkforcePersonnel & { shift_type?: ShiftType; assignment_id: string } }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={s.rosterCard}
        onPress={() => navigation.navigate('WorkforcePersonnelDetail', { personnelId: item.id })}
      >
        <View style={s.rosterRow}>
          <View style={s.rosterMainInfo}>
            <Text style={s.rosterName}>{item.name}</Text>
            <Text style={s.rosterId}>{item.employee_id} • {(item.shift_type || 'day').toUpperCase()}</Text>
          </View>
          <View style={s.rosterBadges}>
            <AttendanceStatusBadge status={item.today_attendance?.status} size="sm" />
            <MaterialIcons name="chevron-right" size={20} color={Colors.outlineVariant} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backButton}
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={s.titleContainer}>
          <Text style={s.headerTitle}>{getLabel('plural')} Roster</Text>
          <Text style={s.siteSub}>{siteName || 'Loading location...'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('AssignPersonnel', { siteId })}
          style={s.assignButton}
          accessibilityLabel={`${getLabel('assign')} to Site`}
        >
          <MaterialIcons name="person-add" size={20} color={Colors.onPrimary} style={s.assignIcon} />
          <Text style={s.assignButtonText}>{getLabel('assign')} to Site</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar inside Roster */}
      <View style={s.searchSection}>
        <View style={s.searchContainer}>
          <MaterialIcons name="search" size={20} color={Colors.outline} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search within roster..."
            placeholderTextColor={Colors.outline}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={filteredRoster}
          keyExtractor={(item) => item.id}
          renderItem={renderRosterItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={s.sectionHeader}>
              <CategoryBadge categoryName={title} size="md" />
            </View>
          )}
          contentContainerStyle={[s.listContainer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyCenter}>
              <MaterialIcons name="people-outline" size={48} color={Colors.surfaceDim} />
              <Text style={s.emptyText}>No {getLabel('plural').toLowerCase()} assigned to sites</Text>
            </View>
          }
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
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    gap: 4,
  },
  assignIcon: {
    marginRight: 2,
  },
  assignButtonText: {
    ...Typography.labelMd,
    color: Colors.onPrimary,
    fontWeight: '600',
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.onBackground,
  },
  siteSub: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.onSurface,
    ...Typography.body,
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding,
  },
  sectionHeader: {
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  rosterCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  rosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rosterMainInfo: {
    flex: 1,
    marginRight: 16,
  },
  rosterName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  rosterId: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
  rosterBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    ...Typography.bodyBold,
    color: Colors.onSurfaceVariant,
    marginTop: 12,
  },
});
