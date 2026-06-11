import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getAssignedSites } from '../api/supervisorService';
import { getReplacementsForSites } from '../api/replacementService';
import VacancyWorkflowStepper from '../components/VacancyWorkflowStepper';
import type { Replacement } from '../types/workforce';

type VacancyFilter = 'open' | 'assigned' | 'history';

export default function VacancyManagementScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<VacancyFilter>('open');
  const [replacements, setReplacements] = useState<Replacement[]>([]);

  const loadData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const sites = await getAssignedSites();
      const siteIds = sites.map(site => site.id);
      
      if (siteIds.length > 0) {
        const data = await getReplacementsForSites(siteIds);
        setReplacements(data);
      } else {
        setReplacements([]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to retrieve vacancy data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const getFilteredReplacements = () => {
    if (filter === 'open') {
      return replacements.filter(r => r.status === 'requested');
    } else if (filter === 'assigned') {
      return replacements.filter(r => r.status === 'assigned');
    } else {
      return replacements.filter(r => r.status === 'completed' || r.status === 'cancelled');
    }
  };

  const getDurationText = (startStr: string) => {
    const diffMs = new Date().getTime() - new Date(startStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs / (1000 * 60)) % 60);
    
    if (diffHours < 0 || diffMins < 0) return 'Just now';
    if (diffHours === 0) return `${diffMins} mins ago`;
    return `${diffHours}h ${diffMins}m ago`;
  };

  const renderVacancyCard = ({ item }: { item: Replacement }) => {
    const absent = item.absent_personnel;
    const replacement = item.replacement_personnel;
    const site = item.site;
    const isOpen = item.status === 'requested';

    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.siteInfo}>
            <Text style={s.siteName}>{site?.site_name || 'Site Location'}</Text>
            <Text style={s.dateSub}>
              Shift Date: {new Date(item.shift_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          {isOpen && (
            <View style={s.durationBadge}>
              <MaterialIcons name="timer" size={14} color={Colors.secondary} style={s.durationIcon} />
              <Text style={s.durationText}>{getDurationText(item.vacancy_start)}</Text>
            </View>
          )}
        </View>

        <View style={s.divider} />

        {/* Absent Personnel Info */}
        <View style={s.personRow}>
          <View style={[s.avatarBg, { backgroundColor: '#FCE4EC' }]}>
            <MaterialIcons name="person-off" size={18} color="#D81B60" />
          </View>
          <View style={s.personMeta}>
            <Text style={s.personRole}>ABSENT PERSONNEL</Text>
            <Text style={s.personName}>{absent?.name || 'Unknown Staff'}</Text>
            <Text style={s.personId}>{absent?.employee_id || 'N/A'} • {absent?.category?.name || 'Uncategorized'}</Text>
          </View>
        </View>

        {/* Replacement Personnel Info (if assigned) */}
        {item.status === 'assigned' && replacement && (
          <View style={[s.personRow, { marginTop: 12 }]}>
            <View style={[s.avatarBg, { backgroundColor: '#E8F5E9' }]}>
              <MaterialIcons name="person" size={18} color="#43A047" />
            </View>
            <View style={s.personMeta}>
              <Text style={[s.personRole, { color: Colors.successGreen }]}>ASSIGNED REPLACEMENT</Text>
              <Text style={s.personName}>{replacement.name}</Text>
              <Text style={s.personId}>{replacement.employee_id} • {replacement.category?.name || 'Uncategorized'}</Text>
            </View>
          </View>
        )}

        <View style={s.divider} />

        <VacancyWorkflowStepper status={item.status} />

        {isOpen && (
          <TouchableOpacity
            style={s.assignBtn}
            onPress={() => navigation.navigate('AssignReplacement', {
              replacementId: item.id,
              siteId: item.site_id,
              shiftDate: item.shift_date
            })}
          >
            <MaterialIcons name="person-add" size={18} color={Colors.onPrimary} style={s.btnIcon} />
            <Text style={s.assignBtnText}>Assign Replacement Staff</Text>
          </TouchableOpacity>
        )}
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
        <Text style={s.headerTitle}>Vacancy & Replacements</Text>
        <View style={s.placeholder} />
      </View>

      {/* Tabs */}
      <View style={s.tabsContainer}>
        {(['open', 'assigned', 'history'] as VacancyFilter[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tabButton, filter === tab && s.activeTabButton]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[s.tabText, filter === tab && s.activeTabText]}>
              {tab === 'open' ? 'Open Vacancies' : tab === 'assigned' ? 'Filled' : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={getFilteredReplacements()}
          keyExtractor={(item) => item.id}
          renderItem={renderVacancyCard}
          contentContainerStyle={[s.listContainer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyCenter}>
              <MaterialIcons name="find-in-page" size={48} color={Colors.surfaceDim} />
              <Text style={s.emptyText}>No replacement logs found</Text>
              <Text style={s.emptySubText}>
                {filter === 'open'
                  ? 'No active vacancies at your sites today.'
                  : filter === 'assigned'
                  ? 'No currently assigned replacement shifts.'
                  : 'No past vacancy history records.'}
              </Text>
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
  placeholder: {
    width: 40,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.onBackground,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.xl,
    padding: 4,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  activeTabButton: {
    backgroundColor: Colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    ...Typography.labelSm,
    color: Colors.outline,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.primary,
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  siteInfo: {
    flex: 1,
    marginRight: 8,
  },
  siteName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    fontSize: 16,
  },
  dateSub: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginTop: 2,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  durationIcon: {
    marginRight: 4,
  },
  durationText: {
    ...Typography.labelSm,
    color: Colors.onSecondaryFixedVariant || Colors.secondary,
    fontWeight: 'bold',
    fontSize: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: 12,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBg: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  personMeta: {
    flex: 1,
  },
  personRole: {
    ...Typography.labelSm,
    fontSize: 9,
    fontWeight: '700',
    color: Colors.outline,
  },
  personName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginTop: 1,
  },
  personId: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginTop: 1,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 44,
    borderRadius: BorderRadius.xl,
    marginTop: 8,
  },
  btnIcon: {
    marginRight: 6,
  },
  assignBtnText: {
    ...Typography.button,
    color: Colors.onPrimary,
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: 20,
  },
  emptyText: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginTop: 12,
  },
  emptySubText: {
    ...Typography.body,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
  },
});
