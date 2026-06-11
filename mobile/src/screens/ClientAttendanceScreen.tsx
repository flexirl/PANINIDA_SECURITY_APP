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
  Image,
  TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getClientAttendance } from '../api/clientPortalService';

type Granularity = 'daily' | 'weekly' | 'monthly';

interface PersonnelRecord {
  personnel_id: string;
  name: string;
  employee_id: string;
  status: string;
}

const STATUS_WEIGHT: Record<string, number> = {
  absent: 0,
  late: 1,
  half_day: 2,
  present: 3,
  corrected: 3,
  not_required: 4
};

// Mockup Portrait Photos mapping for premium visual representation
const PORTRAIT_PHOTOS: Record<string, string> = {
  'Alexander Thorne': 'https://lh3.googleusercontent.com/aida/AP1WRLtr6r0-EuKEDRbAA77zmuHFa2eHRmjD-QOYng-n97mI7qVoTI7COpPf9gqATA8lD0al0BurP2WueJ1YJi30wBBhWhAM608BQVnI6oYbNhpqCxThSHHjfHMyeSNjwho8eptJBDFDmTkZLLbPfMFJxBBkzJoPoyEHVolPVdPa2Gxv3WRubcz5INCQTKCk-Uyd12ddRAmFdLixl3mCnr_86ZumOxscnHiVWrssKSv0zIvQ8uJYMzlp4ctSLcw',
  'Marcus Sterling': 'https://lh3.googleusercontent.com/aida/AP1WRLv7ASdfaJ6D1aNHpZfIMfqSDIomMcxwjvnJ5RrXyBc3BFF0reC2yXjBL95T-1SJVO-UKfjqm2xRWBxBl9hwaTMPbWuIYXr7j7pXaoHNdid6g3PddNMlH3eD2tBjL01chLNnj6YtYOMm5-w1JBitJIp7ozdQBHtpJJtj_AduLtdlkH_rzrc9-Zj8pwlha0Z6PamTJWmtsBPnMgEHqseCvrUYQM_JFjN7NmxyAe-gCuHPgPRKDMwxBSiFor8',
  'Sarah Jenkins': 'https://lh3.googleusercontent.com/aida/AP1WRLvo90SdxaAAWClMnu8hPsqrI1dg2G6s3iktwzgdHOEZKHUd6UedIWN8SNzNs9B3Kq3WRNXaIHgAfhvw6HMvcpn2ZWfXPEt2Z7fyAYIncbdvxyYvMxkynBz8IkCOvIDXTtDIDP6-EYvY2ezc-5J6E8eA-l2m3i0xJc4_F4i50geOCwSFz_GtrslvJI73k2a6352QJx973ijx8oypAF7Ro94B93nn6mp3O6PmP8SmJt69XBS42jxWYKkKYLY'
};

export default function ClientAttendanceScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [sortByStatus, setSortByStatus] = useState(false);

  const [attendanceData, setAttendanceData] = useState<{
    overall_percentage: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    half_day_count: number;
    total_expected: number;
    personnel_breakdown: PersonnelRecord[];
  }>({
    overall_percentage: 0,
    present_count: 0,
    absent_count: 0,
    late_count: 0,
    half_day_count: 0,
    total_expected: 0,
    personnel_breakdown: []
  });

  const loadData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const data = await getClientAttendance(granularity, currentDate);
      setAttendanceData(data);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to retrieve attendance report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [granularity, currentDate]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const changeDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const amount = direction === 'prev' ? -1 : 1;

    if (granularity === 'daily') {
      newDate.setDate(newDate.getDate() + amount);
    } else if (granularity === 'weekly') {
      newDate.setDate(newDate.getDate() + amount * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + amount);
    }
    setCurrentDate(newDate);
  };

  const getPeriodLabel = () => {
    if (granularity === 'daily') {
      return currentDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } else if (granularity === 'weekly') {
      const start = new Date(currentDate);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      const sLabel = start.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const eLabel = end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      return `${sLabel} - ${eLabel}`;
    } else {
      return currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
    }
  };

  const getStatusConfig = (status: string) => {
    const cleanStatus = status.toLowerCase();
    switch (cleanStatus) {
      case 'present':
        return { bg: '#E8F5E9', color: Colors.successGreen, label: 'PRESENT' };
      case 'late':
        return { bg: '#FFF3E0', color: '#E65100', label: 'LATE' };
      case 'absent':
        return { bg: '#FFEBEE', color: Colors.secondary, label: 'ABSENT' };
      case 'half_day':
      case 'half day':
        return { bg: '#E8EAF6', color: '#3F51B5', label: 'HALF DAY' };
      case 'corrected':
        return { bg: '#E3F2FD', color: '#1565C0', label: 'CORRECTED' };
      default:
        return { bg: Colors.surfaceContainer, color: Colors.outline, label: status.toUpperCase() };
    }
  };

  const renderPersonnelItem = ({ item }: { item: PersonnelRecord }) => {
    const isRatio = item.status.includes('/');
    const statusConfig = getStatusConfig(item.status);
    const photoUrl = PORTRAIT_PHOTOS[item.name];

    return (
      <View style={s.personnelCard}>
        <View style={s.personnelRow}>
          {/* Avatar with Status indicator dot */}
          <View style={s.avatarContainer}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={s.avatarImage} />
            ) : (
              <MaterialIcons name="person" size={28} color={Colors.outline} style={s.avatarFallbackIcon} />
            )}
            {!isRatio && (
              <View
                style={[
                  s.avatarStatusDot,
                  { backgroundColor: statusConfig.color }
                ]}
              />
            )}
          </View>

          {/* Details */}
          <View style={s.personnelDetails}>
            <Text style={s.personnelNameText}>{item.name}</Text>
            <Text style={s.personnelIdText}>
              ID: {item.employee_id} • <Text style={s.personnelRoleText}>Security Staff</Text>
            </Text>
          </View>

          {/* Status Badge */}
          <View style={s.badgeContainer}>
            {isRatio ? (
              <View style={s.ratioBadge}>
                <MaterialIcons name="event" size={14} color={Colors.primary} style={s.ratioIcon} />
                <Text style={s.ratioText}>{item.status}</Text>
              </View>
            ) : (
              <View style={[s.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.color + '30' }]}>
                <Text style={[s.statusBadgeText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            )}
          </View>
          <MaterialIcons name="chevron-right" size={20} color={Colors.outline} style={s.chevronIcon} />
        </View>
      </View>
    );
  };

  // Filter & Sort breakdown records
  const filteredPersonnel = attendanceData.personnel_breakdown
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortByStatus) return 0;
      const weightA = a.status.includes('/') ? 5 : (STATUS_WEIGHT[a.status.toLowerCase()] ?? 99);
      const weightB = b.status.includes('/') ? 5 : (STATUS_WEIGHT[b.status.toLowerCase()] ?? 99);
      return weightA - weightB;
    });

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 8) }]}>
      {/* Top App Bar styled as Client Dashboard */}
      <View style={s.header}>
        <View style={s.brandBar}>
          {isSearchActive ? (
            <View style={s.searchBarContainer}>
              <MaterialIcons name="search" size={20} color={Colors.outline} />
              <TextInput
                style={s.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search staff members..."
                placeholderTextColor={Colors.outline}
                autoFocus
              />
              <TouchableOpacity
                style={s.searchCloseButton}
                onPress={() => {
                  setIsSearchActive(false);
                  setSearchQuery('');
                }}
              >
                <MaterialIcons name="close" size={20} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.logoContainer}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
                <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <Image
                alt="PIS Logo"
                style={s.logoImage}
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9Er0KEhzi1SGHxy9tveR8S8Rv75AaVW4UOzQE3AJmfXJm6AVqQE7ilqzSqwZKr04wOplhfm29vGwqE9KcTt3DObEz98QZA-qL7PpXc34fmeN6Axa6LiksDqZjURzrjR6M0SR1IUVbEdVhWfLfjQgu2VmoWyKPwkg2r3eoxItrdEVIUL2EaCBQTQx4ZzcSzfbdPYtZFMjhAOQLfgDH3u5SzBXV8WrZF4CEGm473zRLTDvTOux2TUkm_NZZa0Eiu_TCfw'
                }}
              />
              <View style={s.brandTextContainer}>
                <Text style={s.brandText}>PIS</Text>
                <Text style={s.brandSubText}>ATTENDANCE</Text>
              </View>
            </View>
          )}
          <View style={s.headerActions}>
            {!isSearchActive && (
              <TouchableOpacity style={s.iconButton} onPress={() => setIsSearchActive(true)}>
                <MaterialIcons name="search" size={22} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.iconButton}>
              <MaterialIcons name="more-vert" size={22} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={s.tabBar}>
        {(['daily', 'weekly', 'monthly'] as Granularity[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tabButton, granularity === tab && s.activeTabButton]}
            onPress={() => {
              setGranularity(tab);
              setCurrentDate(new Date());
            }}
          >
            <Text style={[s.tabText, granularity === tab && s.activeTabText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date Picker Section */}
      <View style={s.datePickerCard}>
        <TouchableOpacity onPress={() => changeDate('prev')} style={s.navBtn}>
          <MaterialIcons name="chevron-left" size={20} color={Colors.primary} />
          <Text style={s.navBtnText}>PREVIOUS</Text>
        </TouchableOpacity>
        <View style={s.dateDisplay}>
          <MaterialIcons name="calendar-today" size={16} style={s.calendarIcon} />
          <Text style={s.dateText}>{getPeriodLabel()}</Text>
        </View>
        <TouchableOpacity onPress={() => changeDate('next')} style={s.navBtn}>
          <Text style={s.navBtnText}>NEXT</Text>
          <MaterialIcons name="chevron-right" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredPersonnel}
          keyExtractor={(item) => item.personnel_id}
          renderItem={renderPersonnelItem}
          contentContainerStyle={[s.listContainer]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Executive Summary Card */}
              <View style={s.summaryCard}>
                {/* Left: Circular gauge display */}
                <View style={s.summaryCircleContainer}>
                  <View style={s.percentageGauge}>
                    <Text style={s.percentageValue}>{attendanceData.overall_percentage}%</Text>
                    <Text style={s.percentageLabel}>TOTAL</Text>
                  </View>
                  <Text style={s.summaryCircleLabel}>OPERATIONAL RATE</Text>
                </View>

                {/* Right: Detailed stats grid */}
                <View style={s.statsGrid}>
                  <View style={s.statItem}>
                    <View style={s.statHeader}>
                      <View style={[s.statDot, { backgroundColor: Colors.successGreen }]} />
                      <Text style={s.statLabelText}>Present</Text>
                    </View>
                    <Text style={s.statValueText}>{attendanceData.present_count}</Text>
                  </View>

                  <View style={s.statItem}>
                    <View style={s.statHeader}>
                      <View style={[s.statDot, { backgroundColor: Colors.secondary }]} />
                      <Text style={s.statLabelText}>Absent</Text>
                    </View>
                    <Text style={s.statValueText}>{attendanceData.absent_count}</Text>
                  </View>

                  <View style={s.statItem}>
                    <View style={s.statHeader}>
                      <View style={[s.statDot, { backgroundColor: '#FFF3E0' }]} />
                      <Text style={s.statLabelText}>Late</Text>
                    </View>
                    <Text style={s.statValueText}>{attendanceData.late_count}</Text>
                  </View>

                  <View style={s.statItem}>
                    <View style={s.statHeader}>
                      <View style={[s.statDot, { backgroundColor: '#E8EAF6' }]} />
                      <Text style={s.statLabelText}>Half Days</Text>
                    </View>
                    <Text style={s.statValueText}>{attendanceData.half_day_count}</Text>
                  </View>
                </View>
              </View>

              {/* Personnel Records Header */}
              <View style={s.sectionHeader}>
                <View style={s.sectionTitleContainer}>
                  <View style={s.titleBar} />
                  <Text style={s.sectionTitleText}>Personnel Records</Text>
                </View>
                <TouchableOpacity
                  style={[s.sortBtn, sortByStatus && { backgroundColor: Colors.primary }]}
                  onPress={() => setSortByStatus(!sortByStatus)}
                >
                  <Text style={[s.sortText, sortByStatus && { color: Colors.onPrimary }]}>SORT BY STATUS</Text>
                  <MaterialIcons name="filter-list" size={16} color={sortByStatus ? Colors.onPrimary : Colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </>
          }
          ListFooterComponent={
            /* System Version Footer */
            <View style={s.footer}>
              <View style={s.footerLogoRow}>
                <Image
                  alt="PIS Logo"
                  style={s.footerLogo}
                  source={{
                    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9Er0KEhzi1SGHxy9tveR8S8Rv75AaVW4UOzQE3AJmfXJm6AVqQE7ilqzSqwZKr04wOplhfm29vGwqE9KcTt3DObEz98QZA-qL7PpXc34fmeN6Axa6LiksDqZjURzrjR6M0SR1IUVbEdVhWfLfjQgu2VmoWyKPwkg2r3eoxItrdEVIUL2EaCBQTQx4ZzcSzfbdPYtZFMjhAOQLfgDH3u5SzBXV8WrZF4CEGm473zRLTDvTOux2TUkm_NZZa0Eiu_TCfw'
                  }}
                />
                <Text style={s.footerLogoText}>PAN India Security</Text>
              </View>
              <Text style={s.copyrightText}>© 2026 PAN India Security. All rights reserved.</Text>
              <View style={s.footerSystemRow}>
                <View style={s.systemMeta}>
                  <Text style={s.systemMetaLabel}>System Version</Text>
                  <Text style={s.systemMetaValue}>OPS_CORE_V4.2.0-PRO</Text>
                </View>
                <View style={s.footerIcons}>
                  <MaterialIcons name="verified-user" size={18} style={s.footerIcon} />
                  <MaterialIcons name="military-tech" size={20} style={s.footerIcon} />
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyCenter}>
              <MaterialIcons name="event-busy" size={48} color={Colors.surfaceDim} />
              <Text style={s.emptyText}>No attendance records found</Text>
            </View>
          }
        />
      )}

      {/* FAB for Reports, links to Analytics Dashboard */}
      <TouchableOpacity
        style={s.fabButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AnalyticsDashboard')}
      >
        <MaterialIcons name="analytics" size={24} color={Colors.onSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    paddingBottom: 4
  },
  brandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 12
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    marginRight: 12
  },
  logoImage: {
    width: 32,
    height: 32,
    marginRight: 10,
    resizeMode: 'contain'
  },
  brandTextContainer: {
    flexDirection: 'column'
  },
  brandText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.primary,
    fontWeight: 'bold',
    lineHeight: 18
  },
  brandSubText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: Colors.outline,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    lineHeight: 10
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    marginLeft: 8
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 40,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 10,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    padding: 0,
    marginLeft: 6
  },
  searchCloseButton: {
    padding: 4
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    padding: 4,
    marginHorizontal: Spacing.screenPadding,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '30'
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.lg
  },
  activeTabButton: {
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.outline,
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  activeTabText: {
    color: Colors.onPrimary
  },
  datePickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  navBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: Colors.outlineVariant,
    borderRightWidth: 1,
    borderRightColor: Colors.outlineVariant
  },
  calendarIcon: {
    marginRight: 6,
    color: Colors.primary
  },
  dateText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.primary
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding
  },
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderBottomWidth: 4,
    borderBottomColor: Colors.primary,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2
  },
  summaryCircleContainer: {
    alignItems: 'center',
    marginRight: 20
  },
  percentageGauge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 8,
    borderColor: Colors.primary,
    borderBottomColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center'
  },
  percentageValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: Colors.primary,
    fontWeight: 'bold',
    lineHeight: 28
  },
  percentageLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: Colors.outline,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2
  },
  summaryCircleLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: Colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 8
  },
  statsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statItem: {
    width: '48%',
    backgroundColor: Colors.surfaceContainerLow + '60',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '20',
    padding: 12,
    marginBottom: 10
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statLabelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.onSurfaceVariant
  },
  statValueText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.primary
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  titleBar: {
    width: 6,
    height: 24,
    backgroundColor: Colors.secondary,
    borderRadius: 3,
    marginRight: 10
  },
  sectionTitleText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  sortText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginRight: 4
  },
  personnelCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '70',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1
  },
  personnelRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    resizeMode: 'cover'
  },
  avatarFallbackIcon: {
    color: Colors.outline
  },
  avatarStatusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surfaceContainerLowest
  },
  personnelDetails: {
    flex: 1
  },
  personnelNameText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.primary,
    fontWeight: 'bold',
    lineHeight: 18
  },
  personnelIdText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.onSurfaceVariant
  },
  personnelRoleText: {
    color: Colors.primary + 'B0'
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8
  },
  ratioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.lg
  },
  ratioIcon: {
    marginRight: 4
  },
  ratioText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.onPrimaryFixed
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  chevronIcon: {
    color: Colors.outline
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.primary,
    marginTop: 24,
    marginHorizontal: -Spacing.screenPadding
  },
  footerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.4,
    marginBottom: 6
  },
  footerLogo: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    marginRight: 6
  },
  footerLogoText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.onPrimary,
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  },
  copyrightText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.onPrimary,
    opacity: 0.5,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  footerSystemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 24
  },
  systemMeta: {
    flexDirection: 'column'
  },
  systemMetaLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8,
    color: Colors.onPrimary,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 1.5
  },
  systemMetaValue: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.onPrimary,
    opacity: 0.4
  },
  footerIcons: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  footerIcon: {
    color: Colors.onPrimary,
    opacity: 0.4,
    marginLeft: 10
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: Spacing.screenPadding,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  emptyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 12
  }
});
