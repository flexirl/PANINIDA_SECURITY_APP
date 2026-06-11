import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import { getSupervisorDashboard, getSupervisorPersonnelRecord } from '../api/supervisorService';
import { getSiteDashboardMetrics } from '../api/siteAssignmentService';
import { getComplaintsForSite } from '../api/complaintService';
import { signOut } from '../api/authService';
import SiteSummaryCard from '../components/SiteSummaryCard';
import type { Site } from '../types/workforce';

export default function SupervisorDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);
  const { selectedCategory, setSelectedCategory, categoryFilterIds, getLabel } = usePersonnelCategory();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [supervisorName, setSupervisorName] = useState('');
  const [sitesList, setSitesList] = useState<any[]>([]);
  const [allPersonnelData, setAllPersonnelData] = useState<any[]>([]); // Cache all personnel for filtering

  const loadData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      
      const record = await getSupervisorPersonnelRecord();
      setSupervisorName(record.name);

      const dashboard = await getSupervisorDashboard();
      
      // Store all personnel data for filtering
      setAllPersonnelData(dashboard);

      // Fetch individual site metrics for the SiteSummaryCards with category filtering
      const sitesWithMetrics = await Promise.all(
        dashboard.assigned_sites.map(async (site: Site) => {
          try {
            // Apply category filtering to site metrics
            const filterIds = categoryFilterIds.length > 0 ? categoryFilterIds : undefined;
            const metrics = await getSiteDashboardMetrics(site.id, filterIds);
            const complaints = await getComplaintsForSite(site.id);
            const openComplaintsCount = complaints.filter(
              c => c.status !== 'resolved' && c.status !== 'closed'
            ).length;

            return {
              ...site,
              workforce_count: metrics.total_workforce,
              present_count: metrics.present_today,
              absent_count: metrics.absent_today,
              open_complaints: openComplaintsCount
            };
          } catch (e) {
            return {
              ...site,
              workforce_count: 0,
              present_count: 0,
              absent_count: 0,
              open_complaints: 0
            };
          }
        })
      );

      setSitesList(sitesWithMetrics);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load supervisor dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload site metrics when category filter changes
  useEffect(() => {
    if (!loading && allPersonnelData) {
      // Reload site metrics with new category filter
      const reloadSiteMetrics = async () => {
        try {
          const sitesWithMetrics = await Promise.all(
            allPersonnelData.assigned_sites.map(async (site: Site) => {
              try {
                const filterIds = categoryFilterIds.length > 0 ? categoryFilterIds : undefined;
                const metrics = await getSiteDashboardMetrics(site.id, filterIds);
                const complaints = await getComplaintsForSite(site.id);
                const openComplaintsCount = complaints.filter(
                  c => c.status !== 'resolved' && c.status !== 'closed'
                ).length;

                return {
                  ...site,
                  workforce_count: metrics.total_workforce,
                  present_count: metrics.present_today,
                  absent_count: metrics.absent_today,
                  open_complaints: openComplaintsCount
                };
              } catch (e) {
                return {
                  ...site,
                  workforce_count: 0,
                  present_count: 0,
                  absent_count: 0,
                  open_complaints: 0
                };
              }
            })
          );
          setSitesList(sitesWithMetrics);
        } catch (err) {
          console.error('Error reloading site metrics:', err);
        }
      };
      reloadSiteMetrics();
    }
  }, [categoryFilterIds]);

  // Compute aggregate metrics from filtered site data
  const aggregateMetrics = useMemo(() => {
    const totalPresent = sitesList.reduce((sum, site) => sum + (site.present_count || 0), 0);
    const totalAbsent = sitesList.reduce((sum, site) => sum + (site.absent_count || 0), 0);
    const totalWorkforce = sitesList.reduce((sum, site) => sum + (site.workforce_count || 0), 0);
    const totalVacancies = allPersonnelData?.vacancy_count || 0;

    return {
      total_personnel: totalWorkforce,
      today_attendance_summary: {
        present: totalPresent,
        absent: totalAbsent,
        late: 0, // Not tracked at site level
        total: totalPresent + totalAbsent
      },
      vacancy_count: totalVacancies
    };
  }, [sitesList, allPersonnelData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigation.replace('Login');
    } catch (err: any) {
      Alert.alert('Logout Error', err.message);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.welcomeText}>Welcome Supervisor</Text>
          <Text style={s.supervisorNameText} numberOfLines={1}>
            {supervisorName || 'Loading...'}
          </Text>
        </View>
        <TouchableOpacity style={s.headerActionBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={22} color={Colors.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
      >
        {/* ─── Category Switcher ─── */}
        <View style={s.categorySwitcherContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.categorySwitcherContent}
          >
            {[
              { id: 'all', label: 'All Personnel' },
              { id: 'guards', label: 'Guards' },
              { id: 'gunmen', label: 'Gunman Personnel' },
              { id: 'bouncers', label: 'Bouncers' },
              { id: 'helpers', label: 'Helpers / Housekeeping' }
            ].map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.categoryChip, active && s.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.id as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.categoryChipText, active && s.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Quick Actions Row */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.quickActionsContainer}>
          <TouchableOpacity
            style={s.actionCard}
            onPress={() => navigation.navigate('AttendanceCorrection')}
          >
            <View style={[s.actionIconBg, { backgroundColor: '#E3F2FD' }]}>
              <MaterialIcons name="fact-check" size={24} color="#1E88E5" />
            </View>
            <Text style={s.actionText}>Corrections</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionCard}
            onPress={() => navigation.navigate('VacancyManagement')}
          >
            <View style={[s.actionIconBg, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcons name="find-replace" size={24} color="#FB8C00" />
            </View>
            <Text style={s.actionText}>Vacancies</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionCard}
            onPress={() => navigation.navigate('IncidentReport')}
          >
            <View style={[s.actionIconBg, { backgroundColor: '#FFEBEE' }]}>
              <MaterialIcons name="report-problem" size={24} color="#E53935" />
            </View>
            <Text style={s.actionText}>Incident</Text>
          </TouchableOpacity>
        </View>

        {/* Dashboard Aggregate Metrics */}
        <Text style={s.sectionTitle}>Daily Overview</Text>
        <View style={s.metricsRow}>
          <View style={s.metricCard}>
            <Text style={s.metricValue}>{aggregateMetrics.today_attendance_summary.present}/{aggregateMetrics.today_attendance_summary.total}</Text>
            <Text style={s.metricLabel}>Total Present</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={[s.metricValue, aggregateMetrics.today_attendance_summary.absent > 0 && s.dangerText]}>
              {aggregateMetrics.today_attendance_summary.absent}
            </Text>
            <Text style={s.metricLabel}>Total Absent</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={[s.metricValue, aggregateMetrics.vacancy_count > 0 && s.warningText]}>
              {aggregateMetrics.vacancy_count}
            </Text>
            <Text style={s.metricLabel}>Open Vacancies</Text>
          </View>
        </View>

        {/* Assigned Sites Section */}
        <Text style={s.sectionTitle}>My Assigned Sites</Text>
        {sitesList.length === 0 ? (
          <View style={s.emptyCenter}>
            <MaterialIcons name="business" size={64} color={Colors.surfaceDim} />
            <Text style={s.emptyText}>No sites assigned to your profile</Text>
            <Text style={s.emptySubText}>Please contact management to assign your supervisor profile to sites.</Text>
          </View>
        ) : (
          sitesList.map((site) => (
            <SiteSummaryCard
              key={site.id}
              site={site}
              onPress={() => navigation.navigate('SiteDashboard', { siteId: site.id })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    ...Typography.labelSm,
    color: Colors.outline,
    textTransform: 'uppercase',
  },
  supervisorNameText: {
    ...Typography.h1,
    color: Colors.primary,
    marginTop: 2,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.screenPadding,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.onSurface,
    marginTop: 8,
    marginBottom: 14,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    ...Typography.labelSm,
    color: Colors.onSurface,
    fontWeight: 'bold',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  metricValue: {
    ...Typography.h2,
    color: Colors.onSurface,
    fontSize: 20,
  },
  metricLabel: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.outline,
    marginTop: 4,
  },
  dangerText: {
    color: Colors.dangerRed,
  },
  warningText: {
    color: Colors.warningAmber,
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
  categorySwitcherContainer: {
    marginBottom: 20,
  },
  categorySwitcherContent: {
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceContainerHigh,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryChipText: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: Colors.onPrimary,
    fontWeight: 'bold',
  },
});
