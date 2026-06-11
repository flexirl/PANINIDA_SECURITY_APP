import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles, useFontScale } from '../context/FontSizeContext';
import { useAuth } from '../hooks/useAuth';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import * as dashboardService from '../api/dashboardService';
import * as attendanceService from '../api/attendanceService';
import * as notificationService from '../api/notificationService';
import { supabase } from '../api/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const STAT_CARD_WIDTH = (SCREEN_WIDTH - Spacing.screenPadding * 2 - CARD_GAP) / 2;

// ─── Types ──────────────────────────────────────────
interface AdminDashboardProps {
  navigation: any;
  route: any;
}

interface AlertBanner {
  id: string;
  type: 'error' | 'warning' | 'info';
  icon: string;
  message: string;
}

interface StatCard {
  id: string;
  icon: string;
  value: string | number;
  subValue?: string;
  label: string;
  trend?: { direction: 'up' | 'down'; value: string };
  highlight?: boolean;
  progress?: number; // 0-1
}

interface ActivityItem {
  id: string;
  name: string;
  action: string;
  site: string;
  time: string;
  avatar?: string;
  initials?: string;
  initialsColor?: string;
  badge: { label: string; color: string; bg: string };
}

// ─── Main Dashboard Component ───────────────────────
export default function AdminDashboardScreen({ navigation }: AdminDashboardProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedCategory, setSelectedCategory, categoryFilterIds, getLabel, categoryFilterError } = usePersonnelCategory();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<dashboardService.DashboardOverview | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // Cache for frontend recalculation (capped at 1000 personnel, 500 attendance/day)
  const [cachedPersonnel, setCachedPersonnel] = useState<any[]>([]);
  const [cachedAttendance, setCachedAttendance] = useState<any[]>([]);
  const [dataFullyCached, setDataFullyCached] = useState(false);
  const [baseOverview, setBaseOverview] = useState<dashboardService.DashboardOverview | null>(null);
  const [cachedPayroll, setCachedPayroll] = useState<any[]>([]);

  const adminName = user?.name ? user.name.split(' ')[0] : 'Admin';
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Greeting animation
  const greetFade = useRef(new Animated.Value(0)).current;
  const greetSlide = useRef(new Animated.Value(-20)).current;

  // FAB animation
  const fabScale = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState('dashboard');

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Frontend recalculation function — filters all metrics by category
  const recalculateMetrics = (
    base: dashboardService.DashboardOverview,
    attendanceRecords: any[],
    personnelRecords: any[],
    payrollRecords: any[],
    filterIds: string[]
  ) => {
    // If no filter (all personnel), return base overview
    if (filterIds.length === 0) {
      return base;
    }

    // Filter personnel by category
    const filteredPersonnel = personnelRecords.filter((p: any) => filterIds.includes(p.category_id));
    const totalFiltered = filteredPersonnel.length;
    const activeFiltered = filteredPersonnel.filter((p: any) => p.employment_status === 'active').length;

    // Filter attendance records by category
    const filteredAttendance = attendanceRecords.filter((record: any) => {
      const categoryId = record.guards?.category_id || record.personnel?.category_id;
      return filterIds.includes(categoryId);
    });

    const present = filteredAttendance.filter((r: any) => r.status === 'present').length;
    const late = filteredAttendance.filter((r: any) => r.status === 'late').length;
    const absent = filteredAttendance.filter((r: any) => r.status === 'absent').length;

    // Filter payroll by category
    const filteredPayroll = payrollRecords.filter((p: any) => {
      const categoryId = p.guards?.category_id;
      return categoryId && filterIds.includes(categoryId);
    });

    return {
      ...base,
      guards: {
        total: totalFiltered,
        active: activeFiltered,
        assigned: base.guards.assigned,
      },
      today: { present, late, absent },
      payroll: { pending: filteredPayroll.length },
    };
  };

  const loadDashboardData = async () => {
    try {
      const todayStr = getTodayDateString();
      
      // Fetch all data without category filter for caching (prefetch for all categories)
      const [overviewData, allAttendanceRecords, unreadNotifications, personnelResult, payrollResult] = await Promise.all([
        dashboardService.getDashboardOverview([]).catch(err => {
          console.warn('Overview API failed, using fallback metrics', err);
          return {
            guards: { total: 0, active: 0, assigned: 0 },
            sites: { total: 0, active: 0 },
            today: { present: 0, late: 0, absent: 0 },
            payroll: { pending: 0 },
            recruitment: { active_candidates: 0 },
            incidents: { last_7_days: 0 },
          };
        }),
        attendanceService.getAttendance({ date: todayStr }).catch(err => {
          console.warn('Attendance API failed', err);
          return [];
        }),
        notificationService.getNotifications({ unread_only: true }).catch(err => {
          console.warn('Notifications API failed', err);
          return [];
        }),
        supabase
          .from('workforce_personnel')
          .select('id, category_id, employment_status')
          .limit(1000)
          .then(res => res.data || [])
          .catch(err => {
            console.warn('Personnel cache fetch failed', err);
            return [] as any[];
          }),
        supabase
          .from('payroll')
          .select('id, guards:workforce_personnel(category_id)')
          .in('status', ['draft', 'generated'])
          .limit(500)
          .then(res => res.data || [])
          .catch(err => {
            console.warn('Payroll cache fetch failed', err);
            return [] as any[];
          }),
      ]);

      // Cache the data for frontend recalculation (capped at 500 attendance records per day)
      const cappedAttendance = allAttendanceRecords.slice(0, 500);
      setCachedAttendance(cappedAttendance);
      setCachedPersonnel(personnelResult);
      setCachedPayroll(payrollResult);
      setBaseOverview(overviewData);
      setDataFullyCached(true);
      
      // Calculate filtered metrics based on categoryFilterIds
      const filteredOverview = recalculateMetrics(overviewData, cappedAttendance, personnelResult, payrollResult, categoryFilterIds);
      setOverview(filteredOverview);
      setUnreadCount(unreadNotifications.length);

      // Filter attendance records for activity feed based on category
      const filteredAttendanceForActivity = categoryFilterIds.length > 0
        ? allAttendanceRecords.filter((record: any) => {
            const categoryId = record.guards?.category_id || record.personnel?.category_id;
            return categoryFilterIds.includes(categoryId);
          })
        : allAttendanceRecords;

      // Map attendance records to ActivityItem
      const mappedActivities: ActivityItem[] = filteredAttendanceForActivity.map((record: any) => {
        let timeStr = '';
        if (record.check_in_time) {
          try {
            const timeObj = new Date(record.check_in_time);
            timeStr = timeObj.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
          } catch (e) {
            timeStr = 'Just Now';
          }
        } else {
          timeStr = 'Scheduled';
        }

        let badgeLabel = 'ON-TIME';
        let badgeColor = '#27AE60';
        let badgeBg = 'rgba(39, 174, 96, 0.08)';

        if (record.status === 'late') {
          badgeLabel = 'LATE';
          badgeColor = Colors.secondary;
          badgeBg = 'rgba(178, 43, 29, 0.08)';
        } else if (record.status === 'absent') {
          badgeLabel = 'ABSENT';
          badgeColor = Colors.secondary;
          badgeBg = 'rgba(178, 43, 29, 0.08)';
        } else if (record.status === 'half_day') {
          badgeLabel = 'HALF-DAY';
          badgeColor = Colors.primaryContainer;
          badgeBg = 'rgba(26, 61, 109, 0.08)';
        }

        const guardName = record.guards?.name || 'Unknown Guard';
        const nameParts = guardName.trim().split(' ');
        const initials = nameParts.length > 1
          ? (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
          : nameParts[0].substring(0, 2).toUpperCase();

        const initialsColors = [
          Colors.primaryContainer,
          Colors.secondaryContainer,
          '#2E7D32',
          '#1565C0',
          '#C62828',
          '#6A1B9A',
        ];
        const charSum = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
        const initialsColor = initialsColors[charSum % initialsColors.length];

        return {
          id: record.id,
          name: guardName,
          action: record.status === 'present'
            ? `checked in at`
            : record.status === 'late'
              ? `marked late at`
              : record.status === 'half_day'
                ? `completed half day at`
                : `marked absent for`,
          site: record.sites?.site_name || 'Assigned Site',
          time: timeStr,
          avatar: record.check_in_selfie || undefined,
          initials,
          initialsColor,
          badge: { label: badgeLabel, color: badgeColor, bg: badgeBg },
        };
      });

      setActivities(mappedActivities);
    } catch (error) {
      console.error('Fatal error loading dashboard metrics:', error);
      Alert.alert('Load Failure', 'Could not refresh some real-time metrics. Swipe down to try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [categoryFilterIds])
  );

  // Removed: duplicate useEffect that re-fetched on every category switch.
  // Frontend recalculation below handles instant category switching from cached data.

  // Recalculate metrics instantly when category filter changes (frontend only, no loading spinner)
  useEffect(() => {
    if (baseOverview && dataFullyCached) {
      // Frontend recalculation completes within 100-200ms
      const startTime = performance.now();
      
      const recalculated = recalculateMetrics(baseOverview, cachedAttendance, cachedPersonnel, cachedPayroll, categoryFilterIds);
      setOverview(recalculated);
      
      // Also filter activities
      const filteredAttendanceForActivity = categoryFilterIds.length > 0
        ? cachedAttendance.filter((record: any) => {
            const categoryId = record.guards?.category_id || record.personnel?.category_id;
            return categoryFilterIds.includes(categoryId);
          })
        : cachedAttendance;
      
      // Remap activities (reuse the mapping logic)
      const mappedActivities: ActivityItem[] = filteredAttendanceForActivity.slice(0, 10).map((record: any) => {
        let timeStr = '';
        if (record.check_in_time) {
          try {
            const timeObj = new Date(record.check_in_time);
            timeStr = timeObj.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
          } catch (e) {
            timeStr = 'Just Now';
          }
        } else {
          timeStr = 'Scheduled';
        }

        let badgeLabel = 'ON-TIME';
        let badgeColor = '#27AE60';
        let badgeBg = 'rgba(39, 174, 96, 0.08)';

        if (record.status === 'late') {
          badgeLabel = 'LATE';
          badgeColor = Colors.secondary;
          badgeBg = 'rgba(178, 43, 29, 0.08)';
        } else if (record.status === 'absent') {
          badgeLabel = 'ABSENT';
          badgeColor = Colors.secondary;
          badgeBg = 'rgba(178, 43, 29, 0.08)';
        } else if (record.status === 'half_day') {
          badgeLabel = 'HALF-DAY';
          badgeColor = Colors.primaryContainer;
          badgeBg = 'rgba(26, 61, 109, 0.08)';
        }

        const guardName = record.guards?.name || 'Unknown Guard';
        const nameParts = guardName.trim().split(' ');
        const initials = nameParts.length > 1
          ? (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
          : nameParts[0].substring(0, 2).toUpperCase();

        const initialsColors = [
          Colors.primaryContainer,
          Colors.secondaryContainer,
          '#2E7D32',
          '#1565C0',
          '#C62828',
          '#6A1B9A',
        ];
        const charSum = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
        const initialsColor = initialsColors[charSum % initialsColors.length];

        return {
          id: record.id,
          name: guardName,
          action: record.status === 'present'
            ? `checked in at`
            : record.status === 'late'
              ? `marked late at`
              : record.status === 'half_day'
                ? `completed half day at`
                : `marked absent for`,
          site: record.sites?.site_name || 'Assigned Site',
          time: timeStr,
          avatar: record.check_in_selfie || undefined,
          initials,
          initialsColor,
          badge: { label: badgeLabel, color: badgeColor, bg: badgeBg },
        };
      });
      
      setActivities(mappedActivities);
      
      const endTime = performance.now();
      const recalcTime = endTime - startTime;
      console.log(`Category filter recalculation completed in ${recalcTime.toFixed(2)}ms`);
    }
  }, [categoryFilterIds, cachedAttendance, cachedPersonnel, cachedPayroll, baseOverview, dataFullyCached]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [categoryFilterIds]);

  useEffect(() => {
    // Animate greeting
    Animated.parallel([
      Animated.timing(greetFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(greetSlide, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // FAB pop-in
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      delay: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const statsList: StatCard[] = useMemo(() => {
    return [
      {
        id: 'guards',
        icon: 'people',
        value: overview ? overview.guards.total : 0,
        label: selectedCategory === 'all' ? 'Total Workforce' : `Total ${getLabel('plural')}`,
        trend: { direction: 'up', value: '+4%' },
      },
      {
        id: 'sites',
        icon: 'location-city',
        value: overview ? overview.sites.total : 0,
        label: 'Active Sites',
        trend: { direction: 'up', value: 'Stable' },
      },
      {
        id: 'attendance',
        icon: 'how-to-reg',
        value: overview ? String(overview.today.present) : '0',
        subValue: overview ? `/${overview.guards.total}` : '/0',
        label: 'Present Today',
      },
      {
        id: 'payroll',
        icon: 'account-balance-wallet',
        value: overview ? overview.payroll.pending : 0,
        label: 'Pending Payroll',
        highlight: true,
      },
    ];
  }, [overview, selectedCategory, getLabel]);

  const alertsList: AlertBanner[] = useMemo(() => {
    const list: AlertBanner[] = [];
    if (overview) {
      if (overview.today.absent > 0) {
        list.push({
          id: 'absent-alert',
          type: 'error',
          icon: 'error',
          message: `${overview.today.absent} ${getLabel('singular').toLowerCase()}${overview.today.absent > 1 ? (selectedCategory === 'gunmen' ? ' personnel' : 's') : ''} absent today`,
        });
      }
      if (overview.payroll.pending > 0) {
        list.push({
          id: 'payroll-alert',
          type: 'warning',
          icon: 'warning',
          message: `${overview.payroll.pending} payroll approval${overview.payroll.pending > 1 ? 's' : ''} pending`,
        });
      }
    }
    // Fallback if everything is 100% fine or overview is loading
    if (list.length === 0) {
      list.push({
        id: 'all-secure',
        type: 'info',
        icon: 'check-circle',
        message: 'All sites fully staffed & secure today!',
      });
    }
    return list;
  }, [overview, getLabel, selectedCategory]);

  const attendanceData = {
    present: baseOverview ? baseOverview.today.present : 0,
    late: baseOverview ? baseOverview.today.late : 0,
    absent: baseOverview ? baseOverview.today.absent : 0,
    total: baseOverview ? baseOverview.guards.total : 0,
  };
  const attendanceTotal = attendanceData.total || 1; // Prevent NaN/division by zero
  const presentPct = (attendanceData.present / attendanceTotal) * 100;
  const latePct = (attendanceData.late / attendanceTotal) * 100;
  const absentPct = (attendanceData.absent / attendanceTotal) * 100;

  const navItems = useMemo(() => [
    { key: 'dashboard', icon: 'dashboard' as const, label: 'Dashboard' },
    { key: 'workforce', icon: 'people' as const, label: getLabel('plural') },
    { key: 'sites', icon: 'location-on' as const, label: 'Sites' },
    { key: 'more', icon: 'menu' as const, label: 'More' },
  ], [getLabel]);

  if (loading && !refreshing) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.outline, fontWeight: '600', fontSize: 14 }}>
          Syncing with command center...
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Top App Bar ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRyhUcTQWkIXJhYfiYHNsCWBHbHW-BmdKstBO-GTXBU8GREShei1cC7zxtCgfILG4L14WEnclS8-skHvaUwmfBQ24vnZwIANui91FPIfw-PStCPxGYhYTt873ArflucH4XT1zX_J3gx43ROSeEJ2bPa1gbSTw8c5bcrmEkC36obgQe0Z0Wrlq7ODX_WCNqg-PdCBxe4CZZO3KsClAQ_LGoGJO9p_2uEFwdrMeaMPyNxGYJvT2hzczjcUAt081W7V5pJAsvlwUnaF0' }}
              style={s.logoImage}
            />
          </View>
          <View style={s.topBarRight}>
            {/* Notification bell */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
              <View style={s.notifBadgeRedDot} />
            </TouchableOpacity>
            {/* Settings button */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <MaterialIcons name="settings" size={24} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ═══ Scrollable Content ═══ */}
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* ─── Greeting Card ─── */}
        <Animated.View
          style={[
            s.greetingCard,
            {
              opacity: greetFade,
              transform: [{ translateY: greetSlide }],
            },
          ]}
        >
          <Text style={s.greetingCardLabel}>NAMASTE</Text>
          <View style={s.greetingNameRow}>
            <Text style={s.greetingCardName}>
              {user?.name || 'Rajesh Kumar'}
            </Text>
            <View style={s.statusDot} />
          </View>
          <Text style={s.greetingCardSub}>
            Welcome to your security command center.
          </Text>
        </Animated.View>

        {/* ─── Category Switcher ─── */}
        {/* Hide category switcher for client users */}
        {user?.role !== 'client_user' && (
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
        )}

        {/* ─── Category Filter Error Message ─── */}
        {categoryFilterError && (
          <View style={s.categoryErrorContainer}>
            <MaterialIcons name="error-outline" size={20} color={Colors.error} />
            <Text style={s.categoryErrorText}>{categoryFilterError}</Text>
          </View>
        )}

        {/* ─── Alerts ─── */}
        <View style={s.alertsSection}>
          {alertsList.map((alert, index) => (
            <AlertBannerCard
              key={alert.id}
              alert={alert}
              index={index}
              onPress={() => {
                if (alert.id === 'absent-alert') {
                  navigation.navigate('WorkforcePersonnelList');
                } else if (alert.id === 'payroll-alert') {
                  navigation.navigate('PayrollList');
                }
              }}
            />
          ))}
        </View>

        {/* ─── Stats Grid ─── */}
        <View style={s.statsGrid}>
          {statsList.map((stat, index) => (
            <StatCardView
              key={stat.id}
              stat={stat}
              index={index}
              onPress={() => {
                if (stat.id === 'guards') {
                  navigation.navigate('WorkforcePersonnelList');
                } else if (stat.id === 'sites') {
                  navigation.navigate('SiteList');
                } else if (stat.id === 'attendance') {
                  navigation.navigate('WorkforcePersonnelList');
                } else if (stat.id === 'payroll') {
                  navigation.navigate('PayrollList');
                }
              }}
            />
          ))}
        </View>

        {/* ─── Attendance Overview ─── */}
        <View style={s.sectionCard}>
          <View style={s.sectionCardHeader}>
            <Text style={s.sectionTitle}>Attendance Overview</Text>
            <Text style={s.dateLabel}>{dateStr}</Text>
          </View>

          {/* Bar */}
          <View style={s.attendanceBar}>
            {presentPct > 0 && (
              <View
                style={[
                  s.attendanceSegment,
                  {
                    width: `${presentPct}%`,
                    backgroundColor: Colors.primary,
                    borderTopLeftRadius: 8,
                    borderBottomLeftRadius: 8,
                    borderTopRightRadius: (latePct === 0 && absentPct === 0) ? 8 : 0,
                    borderBottomRightRadius: (latePct === 0 && absentPct === 0) ? 8 : 0,
                  },
                ]}
              />
            )}
            {latePct > 0 && (
              <View
                style={[
                  s.attendanceSegment,
                  {
                    width: `${latePct}%`,
                    backgroundColor: Colors.secondaryContainer,
                    borderTopLeftRadius: presentPct === 0 ? 8 : 0,
                    borderBottomLeftRadius: presentPct === 0 ? 8 : 0,
                    borderTopRightRadius: absentPct === 0 ? 8 : 0,
                    borderBottomRightRadius: absentPct === 0 ? 8 : 0,
                  },
                ]}
              />
            )}
            {absentPct > 0 && (
              <View
                style={[
                  s.attendanceSegment,
                  {
                    width: `${absentPct}%`,
                    backgroundColor: 'rgba(186, 26, 26, 0.4)',
                    borderTopRightRadius: 8,
                    borderBottomRightRadius: 8,
                    borderTopLeftRadius: (presentPct === 0 && latePct === 0) ? 8 : 0,
                    borderBottomLeftRadius: (presentPct === 0 && latePct === 0) ? 8 : 0,
                  },
                ]}
              />
            )}
          </View>

          {/* Legend Grid */}
          <View style={s.legendGrid}>
            <View style={s.legendColumn}>
              <Text style={s.legendColLabel}>Present</Text>
              <View style={s.legendValueRow}>
                <View style={[s.legendDot, { backgroundColor: Colors.primary }]} />
                <Text style={s.legendValueText}>{attendanceData.present}</Text>
              </View>
              <Text style={s.legendColSub}>Personnel</Text>
            </View>

            <View style={s.legendColumn}>
              <Text style={s.legendColLabel}>Late</Text>
              <View style={s.legendValueRow}>
                <View style={[s.legendDot, { backgroundColor: Colors.secondaryContainer }]} />
                <Text style={s.legendValueText}>{attendanceData.late}</Text>
              </View>
              <Text style={s.legendColSub}>Personnel</Text>
            </View>

            <View style={s.legendColumn}>
              <Text style={s.legendColLabel}>Absent</Text>
              <View style={s.legendValueRow}>
                <View style={[s.legendDot, { backgroundColor: '#FCA5A5' }]} />
                <Text style={s.legendValueText}>{attendanceData.absent}</Text>
              </View>
              <Text style={s.legendColSub}>Personnel</Text>
            </View>
          </View>
        </View>

        {/* ─── Management Section ─── */}
        <View style={s.managementSection}>
          <Text style={s.sectionTitle}>Management</Text>
          <View style={s.managementCard}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AddWorkforcePersonnel')}
              style={s.managementBtn}
            >
              <View style={s.managementIconWrapper}>
                <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
              </View>
              <Text style={s.managementBtnText}>{getLabel('onboard')}</Text>
              <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AddSite')}
              style={s.managementBtn}
            >
              <View style={s.managementIconWrapper}>
                <MaterialIcons name="domain-add" size={20} color="#FFFFFF" />
              </View>
              <Text style={s.managementBtnText}>Register Site</Text>
              <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AssignPersonnel', {})}
              style={s.managementBtn}
            >
              <View style={s.managementIconWrapper}>
                <MaterialIcons name="assignment-ind" size={20} color="#FFFFFF" />
              </View>
              <Text style={s.managementBtnText}>{getLabel('assign') + " to Site"}</Text>
              <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('WorkforceCategoryList')}
              style={[s.managementBtn, s.managementBtnOutline]}
            >
              <View style={s.managementIconWrapperOutline}>
                <MaterialIcons name="category" size={20} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={s.managementBtnTextOutline}>Workforce Categories</Text>
              <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.3)" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AnalyticsDashboard')}
              style={[s.managementBtn, s.managementBtnOutline]}
            >
              <View style={s.managementIconWrapperOutline}>
                <MaterialIcons name="analytics" size={20} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={s.managementBtnTextOutline}>Analytics Dashboard</Text>
              <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.3)" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Live Activity Feed ─── */}
        <View style={s.activitySection}>
          <View style={s.activityHeader}>
            <Text style={s.sectionTitle}>Live Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('WorkforcePersonnelList')}>
              <Text style={s.viewAllText}>View Log</Text>
            </TouchableOpacity>
          </View>

          <View style={s.activityList}>
            {activities.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <MaterialIcons name="event-busy" size={40} color={Colors.outline} />
                <Text style={{ marginTop: 8, color: Colors.onSurfaceVariant, fontSize: 13, fontWeight: '500' }}>
                  No check-ins logged for today yet.
                </Text>
              </View>
            ) : (
              activities.slice(0, 3).map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  style={[
                    s.activityItem,
                    index < Math.min(activities.length, 3) - 1 && s.activityItemBorder,
                  ]}
                >
                  {/* Avatar */}
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={s.activityAvatar} />
                  ) : (
                    <View
                      style={[
                        s.activityInitials,
                        { backgroundColor: item.initialsColor || Colors.primaryContainer },
                      ]}
                    >
                      <Text style={s.activityInitialsText}>
                        {item.initials}
                      </Text>
                    </View>
                  )}

                  {/* Content */}
                  <View style={s.activityContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={s.activityText}>
                          <Text style={s.activityNameBold}>{item.name}</Text>
                          <Text style={s.activityActionText}> {item.action} </Text>
                          <Text style={s.activitySiteBold}>{item.site}</Text>
                        </Text>
                      </View>
                      <Text style={s.activityTime}>{item.time}</Text>
                    </View>

                    {/* Badge */}
                    <View
                      style={[
                        s.activityBadge,
                        { backgroundColor: item.badge.bg },
                      ]}
                    >
                      <View
                        style={[
                          s.badgeDot,
                          { backgroundColor: item.badge.color },
                        ]}
                      />
                      <Text
                        style={[s.activityBadgeText, { color: item.badge.color }]}
                      >
                        {item.badge.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* ─── Priority Site Card ─── */}
        <View style={s.prioritySiteCard}>
          <View style={s.priorityImageContainer}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
              }}
              style={s.priorityImage}
            />
            <View style={s.priorityBadge}>
              <Text style={s.priorityBadgeText}>CRITICAL PRIORITY</Text>
            </View>
          </View>

          <View style={s.priorityBody}>
            <Text style={s.priorityName}>Cyber City HQ</Text>
            <View style={s.locationRow}>
              <MaterialIcons name="location-on" size={16} color={Colors.onSurfaceVariant} />
              <Text style={s.locationText}>Sector 24, Gurugram</Text>
            </View>

            <View style={s.priorityStats}>
              <View style={s.priorityStatRow}>
                <Text style={s.priorityStatLabel}>{getLabel('singular')} Strength</Text>
                <Text style={s.priorityStatValue}>12 / 12</Text>
              </View>
              <View style={s.priorityProgressTrack}>
                <View style={[s.priorityProgressFill, { width: '100%' }]} />
              </View>
            </View>

            <View style={s.incidentBox}>
              <View style={s.incidentLeft}>
                <MaterialIcons name="security" size={18} color={Colors.secondary} />
                <Text style={s.incidentLabel}>Last Incident</Text>
              </View>
              <Text style={s.incidentValue}>None (14 Days)</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={s.priorityButton}
              onPress={() => navigation.navigate('SiteList')}
            >
              <Text style={s.priorityButtonText}>Manage Site</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacer for nav bar + FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ═══ Bottom Nav Bar (Floating pill style) ═══ */}
      <View style={s.bottomNav}>
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navItem, isActive && s.navItemActive]}
              activeOpacity={0.7}
              onPress={() => {
                if (item.key === 'workforce') {
                  navigation.navigate('WorkforcePersonnelList');
                } else if (item.key === 'sites') {
                  navigation.navigate('SiteList');
                } else if (item.key === 'more') {
                  navigation.navigate('MoreMenu');
                } else {
                  setActiveTab(item.key);
                }
              }}
            >
              <MaterialIcons
                name={item.icon}
                size={24}
                color={isActive ? '#ffffff' : Colors.onSurfaceVariant}
              />
              <Text style={[s.navLabel, isActive && s.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Alert Banner Card Component ────────────────────
interface AlertBannerCardProps {
  alert: AlertBanner;
  index: number;
  onPress: () => void;
}

const AlertBannerCard: React.FC<AlertBannerCardProps> = ({ alert, index, onPress }) => {
  const s = useScaledStyles(styles);
  
  const getBannerColors = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return {
          bg: 'rgba(186, 26, 26, 0.08)',
          border: 'rgba(186, 26, 26, 0.2)',
          text: Colors.secondary,
          icon: Colors.secondary,
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.08)',
          border: 'rgba(245, 158, 11, 0.2)',
          text: '#D97706',
          icon: '#F59E0B',
        };
      case 'info':
        return {
          bg: 'rgba(39, 174, 96, 0.08)',
          border: 'rgba(39, 174, 96, 0.2)',
          text: '#059669',
          icon: '#10B981',
        };
    }
  };

  const colors = getBannerColors(alert.type);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        s.alertBanner,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <MaterialIcons name={alert.icon as any} size={20} color={colors.icon} />
      <Text style={[s.alertText, { color: colors.text }]}>{alert.message}</Text>
      <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
    </TouchableOpacity>
  );
};

// ─── Stat Card Component ────────────────────────────
interface StatCardViewProps {
  stat: StatCard;
  index: number;
  onPress: () => void;
}

const StatCardView: React.FC<StatCardViewProps> = ({ stat, index, onPress }) => {
  const s = useScaledStyles(styles);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={s.statCard}
    >
      <View style={s.statCardInner}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <MaterialIcons
            name={stat.icon as any}
            size={24}
            color={stat.highlight ? Colors.secondary : Colors.primary}
          />
          {stat.trend && (
            <View
              style={[
                s.trendBadge,
                stat.trend.direction === 'up' ? s.trendBadgeUp : s.trendBadgeStable,
              ]}
            >
              <Text
                style={[
                  s.trendText,
                  {
                    color: stat.trend.direction === 'up' ? '#059669' : Colors.onSurfaceVariant,
                  },
                ]}
              >
                {stat.trend.value}
              </Text>
            </View>
          )}
        </View>

        <View style={s.statCardBottom}>
          <View>
            <View style={s.statValueContainer}>
              <Text style={[s.statValue, stat.highlight && { color: Colors.secondary }]}>
                {stat.value}
              </Text>
              {stat.subValue && (
                <Text style={s.statSubValue}>{stat.subValue}</Text>
              )}
            </View>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ── Top App Bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 1,
    paddingRight: 8,
    height: 56,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.3)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 50,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 175,
    height: 44,
    resizeMode: 'contain',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarIconBtn: {
    position: 'relative',
  },
  notifBadgeRedDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerLowest,
  },

  // ── Scroll View ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.stackMd,
  },

  // ── Greeting Card ──
  greetingCard: {
    backgroundColor: 'rgba(238, 237, 242, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: Spacing.stackMd,
  },
  greetingCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  greetingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  greetingCardName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  greetingCardSub: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    opacity: 0.8,
  },

  // ── Category Switcher ──
  categorySwitcherContainer: {
    marginBottom: Spacing.stackMd,
  },
  categorySwitcherContent: {
    paddingHorizontal: 2,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },

  // ── Category Error ──
  categoryErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.2)',
    marginBottom: Spacing.stackMd,
  },
  categoryErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.error,
    lineHeight: 18,
  },

  // ── Alerts ──
  alertsSection: {
    gap: 10,
    marginBottom: Spacing.stackMd,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  alertActionBtn: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  alertActionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // ── Stats Grid ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: Spacing.stackLg,
  },
  statCard: {
    width: STAT_CARD_WIDTH,
  },
  statCardInner: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 14,
    height: 110,
    justifyContent: 'space-between',
  },
  statCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 34,
  },
  statSubValue: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.onSurfaceVariant,
    marginLeft: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendBadgeUp: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  trendBadgeStable: {
    backgroundColor: 'rgba(67, 71, 79, 0.1)',
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Attendance Distribution ──
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: Spacing.stackLg,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  attendanceBar: {
    height: 16,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14,
  },
  attendanceSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },

  // ── Management Actions ──
  managementSection: {
    marginBottom: Spacing.stackLg,
    gap: 10,
  },
  managementCard: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 16,
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  managementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  managementIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  managementBtnOutline: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  managementIconWrapperOutline: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementBtnTextOutline: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Recent Activity ──
  activitySection: {
    marginBottom: Spacing.stackLg,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  activityList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  activityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  activityInitials: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInitialsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activityContent: {
    flex: 1,
    gap: 3,
  },
  activityText: {
    fontSize: 14,
    color: Colors.onSurface,
    lineHeight: 18,
  },
  activityNameBold: {
    fontWeight: '700',
  },
  activityActionText: {
    color: Colors.onSurfaceVariant,
  },
  activitySiteBold: {
    fontWeight: '700',
    color: Colors.onSurface,
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Priority Site Card ──
  prioritySiteCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerLowest,
    marginBottom: Spacing.stackLg,
  },
  priorityImageContainer: {
    height: 160,
    position: 'relative',
  },
  priorityImage: {
    width: '100%',
    height: '100%',
  },
  priorityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  priorityBody: {
    padding: 20,
    gap: 12,
  },
  priorityName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -4,
  },
  locationText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  priorityStats: {
    gap: 6,
    marginTop: 4,
  },
  priorityStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityStatLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  priorityStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  priorityProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  priorityProgressFill: {
    height: '100%',
    backgroundColor: Colors.successGreen,
    borderRadius: 3,
  },
  incidentBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  incidentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incidentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  incidentValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  priorityButton: {
    marginTop: 8,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  priorityButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 80,
    right: Spacing.screenPadding,
    zIndex: 40,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },

  // ── Bottom Nav (Floating pill style) ──
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: '5%',
    right: '5%',
    width: '90%',
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.2)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
  },
  navItemActive: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 56,
  },
  // ── Legend Grid (Screenshot column style) ──
  legendGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 18,
  },
  legendColumn: {
    alignItems: 'center',
    gap: 2,
  },
  legendColLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  legendValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  legendValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  legendColSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
});
