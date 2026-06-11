import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import { supabase } from '../api/supabase';
import {
  getWorkforceDistribution,
  getAttendanceTrend,
  getSiteDeployment,
  getComplaintTrends,
  getAverageResolutionTime,
  getStaffTurnoverRate,
  getVacancyRate,
  exportAnalyticsCSV
} from '../api/analyticsService';
import type { AnalyticsFilters } from '../types/workforce';

export default function AnalyticsDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);
  const { categoryFilterIds, getLabel } = usePersonnelCategory();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filters
  const [datePreset, setDatePreset] = useState<'7' | '30' | '90'>('30');
  const [filters, setFilters] = useState<AnalyticsFilters>({
    from_date: '',
    to_date: ''
  });

  // Metrics Data States
  const [workforceDist, setWorkforceDist] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [siteDeployment, setSiteDeployment] = useState<any[]>([]);
  const [complaintTrends, setComplaintTrends] = useState<any[]>([]);
  const [resolutionTimes, setResolutionTimes] = useState<any[]>([]);
  const [turnover, setTurnover] = useState<any>({ rate: 'N/A', terminated_count: 0, average_headcount: 0 });
  const [vacancyRate, setVacancyRate] = useState<any[]>([]);

  // Resolve date range from preset
  const calculateDateRange = (preset: '7' | '30' | '90') => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - parseInt(preset));
    
    return {
      from_date: from.toISOString().split('T')[0],
      to_date: to.toISOString().split('T')[0]
    };
  };

  const checkRoleAndLoadData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      // 1. Role Guard Check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Access Denied', 'Authentication required.');
        navigation.replace('Login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'super_admin')) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(true);

      // 2. Fetch Metrics with category filtering
      const range = calculateDateRange(datePreset);
      setFilters(range);

      // Apply category filtering to all analytics queries
      const filtersWithCategory: AnalyticsFilters = {
        ...range,
        category_ids: categoryFilterIds.length > 0 ? categoryFilterIds : undefined
      };

      const [distData, attData, deployData, compData, resData, turnData, vacData] = await Promise.all([
        getWorkforceDistribution(filtersWithCategory),
        getAttendanceTrend(filtersWithCategory),
        getSiteDeployment(filtersWithCategory),
        getComplaintTrends(filtersWithCategory),
        getAverageResolutionTime(filtersWithCategory),
        getStaffTurnoverRate(filtersWithCategory),
        getVacancyRate(filtersWithCategory)
      ]);

      setWorkforceDist(distData);
      setAttendanceTrend(attData);
      setSiteDeployment(deployData);
      setComplaintTrends(compData);
      setResolutionTimes(resData);
      setTurnover(turnData);
      setVacancyRate(vacData);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to compute analytics dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkRoleAndLoadData();
  }, [datePreset, categoryFilterIds]);

  const handleRefresh = () => {
    setRefreshing(true);
    checkRoleAndLoadData(true);
  };

  const handleCSVExport = async () => {
    try {
      const csvContent = await exportAnalyticsCSV(filters);
      await Share.share({
        message: csvContent,
        title: 'Workforce Analytics Report'
      });
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Unable to share CSV report');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[s.container, s.center, { padding: 24 }]}>
        <MaterialIcons name="security" size={80} color={Colors.dangerRed} />
        <Text style={s.restrictedTitle}>Access Denied</Text>
        <Text style={s.restrictedText}>
          The Analytics Dashboard is restricted to Administrator roles only. If you require access, please contact your systems manager.
        </Text>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate sum of active workforce
  const totalActiveWorkforce = workforceDist.reduce((sum, item) => sum + item.count, 0);

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Analytics Dashboard</Text>
        <TouchableOpacity onPress={handleCSVExport} style={s.exportBtn}>
          <MaterialIcons name="share" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters Toolbar */}
      <View style={s.filterBar}>
        <Text style={s.filterLabel}>Period preset:</Text>
        <View style={s.presetGroup}>
          {(['7', '30', '90'] as const).map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[s.presetBtn, datePreset === preset && s.presetBtnActive]}
              onPress={() => setDatePreset(preset)}
            >
              <Text style={[s.presetText, datePreset === preset && s.presetTextActive]}>
                {preset} Days
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
      >
        {/* Metric 1: Headcount Card */}
        <View style={s.summaryOverviewCard}>
          <View style={s.summaryOverviewItem}>
            <Text style={s.summaryOverviewVal}>{totalActiveWorkforce}</Text>
            <Text style={s.summaryOverviewLabel}>Total Active {getLabel('plural')}</Text>
          </View>
          <View style={s.summaryOverviewDivider} />
          <View style={s.summaryOverviewItem}>
            <Text style={s.summaryOverviewVal}>
              {turnover.rate === 'N/A' ? 'N/A' : `${turnover.rate}%`}
            </Text>
            <Text style={s.summaryOverviewLabel}>{getLabel('plural')} Turnover Rate</Text>
          </View>
        </View>

        {/* Chart 1: Workforce Distribution */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>{getLabel('plural')} Distribution by Site</Text>
          {workforceDist.length === 0 ? (
            <Text style={s.emptyChartText}>No active staff</Text>
          ) : (
            workforceDist.map((item) => {
              const pct = totalActiveWorkforce > 0 ? (item.count / totalActiveWorkforce) * 100 : 0;
              return (
                <View key={item.category_id} style={s.distRow}>
                  <View style={s.distMeta}>
                    <Text style={s.distLabel}>{item.category_name}</Text>
                    <Text style={s.distVal}>{item.count} staff ({Math.round(pct)}%)</Text>
                  </View>
                  <View style={s.progressBarBg}>
                    <View style={[s.progressBarFill, { width: `${pct}%`, backgroundColor: Colors.primary }]} />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Chart 2: Daily Attendance Rate (Vertical Histograms) */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>{getLabel('plural')} Attendance Trends</Text>
          {attendanceTrend.length === 0 ? (
            <Text style={s.emptyChartText}>No records in date range</Text>
          ) : (
            <View style={s.trendContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.histogramRow}>
                  {attendanceTrend.map((point) => (
                    <View key={point.date} style={s.histCol}>
                      <Text style={s.histValText}>{Math.round(point.attendance_percentage)}%</Text>
                      <View style={s.histBarBg}>
                        <View style={[s.histBarFill, { height: `${point.attendance_percentage}%` }]} />
                      </View>
                      <Text style={s.histLabelText}>
                        {new Date(point.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Chart 3: Deployment Capacity per Site */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Site Deployment vs Configured Strength</Text>
          {siteDeployment.length === 0 ? (
            <Text style={s.emptyChartText}>No active deployments</Text>
          ) : (
            siteDeployment.map((site) => {
              const active = site.active_assignments;
              const strength = site.workforce_strength || active; // fallback if null
              const pct = strength > 0 ? (active / strength) * 100 : 0;
              return (
                <View key={site.site_id} style={s.distRow}>
                  <View style={s.distMeta}>
                    <Text style={s.distLabel}>{site.site_name}</Text>
                    <Text style={s.distVal}>
                      Deployed: {active} / Strength: {site.workforce_strength || 'Not Configured'}
                    </Text>
                  </View>
                  <View style={s.progressBarBg}>
                    <View style={[s.progressBarFill, { width: `${Math.min(100, pct)}%`, backgroundColor: Colors.successGreen }]} />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Chart 4: Vacancy Rate */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Vacancy Rate per Site</Text>
          <Text style={s.chartSubtitle}>Calculated from cumulative vacancy days / capacity days</Text>
          {vacancyRate.length === 0 ? (
            <Text style={s.emptyChartText}>No vacancy calculations</Text>
          ) : (
            vacancyRate.map((item) => (
              <View key={item.site_id} style={s.distRow}>
                <View style={s.distMeta}>
                  <Text style={s.distLabel}>{item.site_name}</Text>
                  <Text style={s.distVal}>
                    Rate: {item.vacancy_rate}% • Vacancy days: {item.vacancy_days}d
                  </Text>
                </View>
                <View style={s.progressBarBg}>
                  <View style={[s.progressBarFill, { width: `${Math.min(100, item.vacancy_rate)}%`, backgroundColor: Colors.warningAmber }]} />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Chart 5: Complaint Average Resolution Times */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Average Ticket Resolution Time (Hours)</Text>
          {resolutionTimes.length === 0 ? (
            <Text style={s.emptyChartText}>No resolved complaints in range</Text>
          ) : (
            resolutionTimes.map((item, idx) => (
              <View key={idx} style={s.distRow}>
                <View style={s.distMeta}>
                  <Text style={s.distLabel}>{item.site_name}</Text>
                  <Text style={s.distVal}>{item.avg_time_hours} hours</Text>
                </View>
                <View style={s.progressBarBg}>
                  <View
                    style={[
                      s.progressBarFill,
                      {
                        width: `${Math.min(100, (item.avg_time_hours / 48) * 100)}%`, // scale relative to 48h limit
                        backgroundColor: item.avg_time_hours > 24 ? Colors.dangerRed : Colors.primary
                      }
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </View>

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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  exportBtn: {
    padding: 8,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.onBackground,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 16,
  },
  filterLabel: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginRight: 12,
  },
  presetGroup: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.xl,
    padding: 2,
    flex: 1,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  presetBtnActive: {
    backgroundColor: Colors.surfaceContainerLowest,
  },
  presetText: {
    ...Typography.labelSm,
    fontSize: 11,
    color: Colors.outline,
    fontWeight: 'bold',
  },
  presetTextActive: {
    color: Colors.primary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
  },
  restrictedTitle: {
    ...Typography.h1,
    color: Colors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  restrictedText: {
    ...Typography.body,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
  },
  backBtnText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
  summaryOverviewCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    paddingVertical: 16,
    marginBottom: 20,
  },
  summaryOverviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryOverviewVal: {
    ...Typography.h1,
    fontSize: 26,
    color: Colors.primary,
  },
  summaryOverviewLabel: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.outline,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  summaryOverviewDivider: {
    width: 1,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  chartCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: 16,
    marginBottom: 20,
  },
  chartTitle: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    fontSize: 15,
  },
  chartSubtitle: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.outline,
    marginTop: 2,
    marginBottom: 12,
  },
  emptyChartText: {
    ...Typography.body,
    color: Colors.outline,
    textAlign: 'center',
    marginVertical: 20,
  },
  distRow: {
    marginVertical: 8,
  },
  distMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  distLabel: {
    ...Typography.body,
    color: Colors.onSurface,
    fontWeight: '500',
  },
  distVal: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  trendContainer: {
    marginTop: 16,
  },
  histogramRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: 24,
  },
  histCol: {
    alignItems: 'center',
    width: 65,
    marginHorizontal: 4,
  },
  histValText: {
    ...Typography.labelSm,
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  histBarBg: {
    height: 80,
    width: 14,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  histBarFill: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  histLabelText: {
    ...Typography.labelSm,
    fontSize: 8,
    color: Colors.outline,
    marginTop: 6,
    width: '100%',
    textAlign: 'center',
  },
});
