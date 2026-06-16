import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../api/supabase';
import * as siteService from '../api/siteService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCRyhUcTQWkIXJhYfiYHNsCWBHbHW-BmdKstBO-GTXBU8GREShei1cC7zxtCgfILG4L14WEnclS8-skHvaUwmfBQ24vnZwIANui91FPIfw-PStCPxGYhYTt873ArflucH4XT1zX_J3gx43ROSeEJ2bPa1gbSTw8c5bcrmEkC36obgQe0Z0Wrlq7ODX_WCNqg-PdCBxe4CZZO3KsClAQ_LGoGJO9p_2uEFwdrMeaMPyNxGYJvT2hzczjcUAt081W7V5pJAsvlwUnaF0';

// ── Helper Functions ───────────────────────────────────────────
const getGreeting = (): { en: string; hi: string } => {
  const hour = new Date().getHours();
  if (hour < 12) return { en: 'Good Morning', hi: 'शुभ प्रभात' };
  if (hour < 17) return { en: 'Good Afternoon', hi: 'शुभ दोपहर' };
  return { en: 'Good Evening', hi: 'शुभ संध्या' };
};

const formatTime12 = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '';
  }
};

// ── Personnel Dashboard Data Types ────────────────────────────
interface PersonnelProfile {
  id: string;
  name: string;
  employee_id: string;
  category_name: string;
  photo_url?: string;
  base_salary: number;
  shift_type?: string;
}

interface AttendanceStat {
  present: number;
  absent: number;
  late: number;
  total_days: number;
}

interface TodayAttendance {
  id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
}

interface RecentActivityItem {
  id: string;
  type: 'check_in' | 'check_out' | 'document' | 'assignment' | 'complaint';
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  timestamp: string;
}

export default function PersonnelDashboardScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [personnelProfile, setPersonnelProfile] = useState<PersonnelProfile | null>(null);
  const [siteDetails, setSiteDetails] = useState<any>(null);
  const [todayRecord, setTodayRecord] = useState<TodayAttendance | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStat>({
    present: 0, absent: 0, late: 0, total_days: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [documentCount, setDocumentCount] = useState({ verified: 0, total: 0 });
  const [liveTime, setLiveTime] = useState('');

  // Animation
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setLiveTime(`${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Entry animation
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const personnelId = user?.guard_id || (user as any)?.workforce_personnel_id;

  const loadData = async () => {
    try {
      const freshProfile = await refreshProfile();
      const currentUser = freshProfile || user;
      const currentPersonnelId = currentUser?.guard_id || (currentUser as any)?.workforce_personnel_id;

      if (!currentPersonnelId) {
        setLoading(false);
        return;
      }

      // 1. Personnel profile with category
      const { data: wp } = await supabase
        .from('workforce_personnel')
        .select('id, name, employee_id, base_salary, shift_type, photo_url, category:workforce_categories(name)')
        .eq('id', currentPersonnelId)
        .single();

      if (wp) {
        setPersonnelProfile({
          id: wp.id,
          name: wp.name,
          employee_id: wp.employee_id,
          category_name: (wp.category as any)?.name || 'Staff',
          photo_url: wp.photo_url,
          base_salary: wp.base_salary,
          shift_type: wp.shift_type,
        });
      }

      // 2. Current site assignment
      try {
        // Query the active assignment directly to ensure we have the latest
        const { data: assignment } = await supabase
          .from('site_assignments')
          .select('site_id')
          .eq('personnel_id', currentPersonnelId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const activeSiteId = assignment?.site_id || currentUser?.current_assignment?.site_id;
        
        if (activeSiteId) {
          const site = await siteService.getSiteDetail(activeSiteId);
          setSiteDetails(site);
        } else {
          setSiteDetails(null);
        }
      } catch (err) {
        console.warn('Could not fetch site assignment:', err);
        // Fallback to user profile assignment if direct query fails
        if (currentUser?.current_assignment?.site_id) {
          try {
            const site = await siteService.getSiteDetail(currentUser.current_assignment.site_id);
            setSiteDetails(site);
          } catch {}
        }
      }

      // 3. Today's attendance
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: todayAtt } = await supabase
        .from('workforce_attendance')
        .select('id, check_in_time, check_out_time, status')
        .eq('personnel_id', currentPersonnelId)
        .eq('attendance_date', todayStr)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setTodayRecord(todayAtt || null);

      // 4. Monthly attendance stats
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      const { data: monthAtt } = await supabase
        .from('workforce_attendance')
        .select('status')
        .eq('personnel_id', currentPersonnelId)
        .gte('attendance_date', monthStartStr)
        .lte('attendance_date', todayStr);

      if (monthAtt) {
        let p = 0, a = 0, l = 0;
        monthAtt.forEach((r: any) => {
          if (r.status === 'present' || r.status === 'present_late') p++;
          if (r.status === 'late' || r.status === 'present_late') l++;
          if (r.status === 'absent') a++;
        });
        setAttendanceStats({ present: p, absent: a, late: l, total_days: monthAtt.length });
      }

      // 5. Document verification status
      const { data: docs } = await supabase
        .from('workforce_documents')
        .select('id, verified')
        .eq('personnel_id', currentPersonnelId);

      if (docs) {
        setDocumentCount({
          verified: docs.filter((d: any) => d.verified).length,
          total: docs.length,
        });
      }

      // 6. Recent activity (last 5 attendance records + recent notifications)
      const { data: recentAtt } = await supabase
        .from('workforce_attendance')
        .select('id, attendance_date, check_in_time, check_out_time, status')
        .eq('personnel_id', currentPersonnelId)
        .order('attendance_date', { ascending: false })
        .limit(5);

      const activities: RecentActivityItem[] = [];
      if (recentAtt) {
        recentAtt.forEach((att: any) => {
          if (att.check_out_time) {
            activities.push({
              id: `${att.id}-out`,
              type: 'check_out',
              title: 'Shift Check-out / शिफ्ट चेक-आउट',
              subtitle: `${formatDate(att.attendance_date)}, ${formatTime12(att.check_out_time)}`,
              icon: 'logout',
              iconBg: '#FFF3E0',
              iconColor: '#FB8C00',
              timestamp: att.check_out_time,
            });
          }
          if (att.check_in_time) {
            activities.push({
              id: `${att.id}-in`,
              type: 'check_in',
              title: 'Shift Check-in / शिफ्ट चेक-इन',
              subtitle: `${formatDate(att.attendance_date)}, ${formatTime12(att.check_in_time)}`,
              icon: 'login',
              iconBg: '#E3F2FD',
              iconColor: Colors.primary,
              timestamp: att.check_in_time,
            });
          }
        });
      }

      // Sort by timestamp desc and limit to 5
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 5));

    } catch (err) {
      console.error('Error loading personnel dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  // ── Computed values ──────────────────────────────────────────
  const displayName = personnelProfile?.name || user?.name || 'Personnel';
  const firstName = displayName.split(' ')[0];
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const categoryLabel = personnelProfile?.category_name || 'Staff';
  const shiftLabel = personnelProfile?.shift_type === 'night' ? '8 PM — 8 AM' : '8 AM — 8 PM';
  const monthlyEarnings = personnelProfile?.base_salary
    ? Math.round((personnelProfile.base_salary / 26) * attendanceStats.present)
    : 0;

  let checkInStatus: 'not_checked_in' | 'checked_in' | 'shift_complete' = 'not_checked_in';
  if (todayRecord?.check_out_time) checkInStatus = 'shift_complete';
  else if (todayRecord?.check_in_time) checkInStatus = 'checked_in';

  // ── Bottom Nav ──────────────────────────────────────────────
  const navItems = [
    { key: 'home', icon: 'dashboard' as const, label: 'Home' },
    { key: 'attendance', icon: 'fingerprint' as const, label: 'Attendance' },
    { key: 'salary', icon: 'payments' as const, label: 'Salary' },
    { key: 'profile', icon: 'person' as const, label: 'Profile' },
  ];

  const handleNavPress = (key: string) => {
    if (key === 'attendance') navigation.navigate('GuardAttendanceHistory');
    else if (key === 'salary') navigation.navigate('GuardSalarySlips');
    else if (key === 'profile') navigation.navigate('GuardProfile');
  };

  // ── Loading ─────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <View style={s.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.loadingText}>Loading your dashboard... / आपका डैशबोर्ड लोड हो रहा है...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <Image source={{ uri: LOGO_URL }} style={s.logoImage} />
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* ─── Profile Greeting Card ─── */}
        <Animated.View
          style={[
            s.greetingCard,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <View style={s.greetingRow}>
            <View style={s.greetingAvatarContainer}>
              {personnelProfile?.photo_url ? (
                <Image source={{ uri: personnelProfile.photo_url }} style={s.greetingAvatar} />
              ) : (
                <View style={s.greetingAvatarFallback}>
                  <Text style={s.greetingAvatarText}>{initials}</Text>
                </View>
              )}
              <View style={s.onlineDot} />
            </View>
            <View style={s.greetingInfo}>
              <Text style={s.greetingLabel}>{getGreeting().en} / {getGreeting().hi}</Text>
              <Text style={s.greetingName} numberOfLines={1}>{firstName}</Text>
              <View style={s.categoryBadge}>
                <Text style={s.categoryBadgeText}>{categoryLabel.toUpperCase()}</Text>
              </View>
            </View>
            <View style={s.liveTimeContainer}>
              <Text style={s.liveTimeText}>{liveTime}</Text>
              <Text style={s.liveDateText}>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            </View>
          </View>
        </Animated.View>
 
        {/* ─── Current Site & Check-In Card ─── */}
        <View style={s.siteCard}>
          <View style={s.siteHeaderContainer}>
            <View style={s.siteIconContainer}>
              <MaterialIcons name="location-on" size={28} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.siteName} numberOfLines={1}>
                {siteDetails?.site_name || 'Not Assigned / आवंटित नहीं'}
              </Text>
              <View style={s.shiftRow}>
                <MaterialIcons name="schedule" size={15} color={Colors.onSurfaceVariant} />
                <Text style={s.shiftTimeText}>{shiftLabel}</Text>
                <View style={s.shiftBadge}>
                  <Text style={s.shiftBadgeText}>
                    {personnelProfile?.shift_type === 'night' ? 'NIGHT / रात' : 'DAY / दिन'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
 
          {/* Check-in / Out Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              s.checkInBtn,
              checkInStatus === 'shift_complete' && s.checkInBtnDisabled,
              checkInStatus === 'checked_in' && s.checkInBtnActive,
              checkInStatus === 'not_checked_in' && s.checkInBtnInactive,
            ]}
            onPress={() => navigation.navigate('GuardAttendance')}
            disabled={checkInStatus === 'shift_complete'}
          >
            <MaterialIcons
              name={
                checkInStatus === 'shift_complete'
                  ? 'check-circle'
                  : checkInStatus === 'checked_in'
                  ? 'check-circle'
                  : 'login'
              }
              size={22}
              color="#ffffff"
            />
            <Text style={s.checkInBtnText}>
              {checkInStatus === 'shift_complete'
                ? 'SHIFT COMPLETE / पाली समाप्त'
                : checkInStatus === 'checked_in'
                ? `CHECKED IN / उपस्थित • ${todayRecord?.check_in_time ? formatTime12(todayRecord.check_in_time) : ''}`
                : 'CHECK IN NOW / उपस्थिति दर्ज करें'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Stats Grid ─── */}
        <View style={s.statsRow}>
          {/* Days Present */}
          <View style={s.statCard}>
            <View style={s.statCardHeader}>
              <View style={[s.statIconContainer, { backgroundColor: 'rgba(0, 39, 82, 0.06)' }]}>
                <MaterialIcons name="calendar-month" size={20} color={Colors.primary} />
              </View>
              {attendanceStats.present > 0 && (
                <Text style={s.statTrend}>+{attendanceStats.present > 20 ? 2 : 1}</Text>
              )}
            </View>
            <Text style={s.statLabel}>DAYS PRESENT</Text>
            <Text style={s.statSubLabel}>उपस्थित दिन</Text>
            <Text style={s.statValue}>
              {attendanceStats.present}
              <Text style={s.statValueSlash}>/26</Text>
            </Text>
          </View>

          {/* Earnings */}
          <View style={s.statCard}>
            <View style={s.statCardHeader}>
              <View style={[s.statIconContainer, { backgroundColor: 'rgba(39, 174, 96, 0.06)' }]}>
                <MaterialIcons name="payments" size={20} color={Colors.successGreen} />
              </View>
            </View>
            <Text style={s.statLabel}>EARNINGS</Text>
            <Text style={s.statSubLabel}>कमाई</Text>
            <Text style={s.earningsText}>
              Will be available at end of month
            </Text>
            <Text style={s.earningsTextHindi}>
              महीने के अंत में उपलब्ध होगा
            </Text>
          </View>
        </View>

        {/* ─── Visitor Log Banner ─── */}
        <TouchableOpacity 
          style={s.visitorLogBanner} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('GuardVisitorLog')}
        >
          <View style={s.visitorLogBannerLeft}>
            <View style={[s.statIconContainer, { backgroundColor: 'rgba(46, 125, 50, 0.1)' }]}>
              <MaterialIcons name="groups" size={24} color="#2E7D32" />
            </View>
            <View style={{ marginLeft: 14 }}>
              <Text style={s.visitorLogBannerTitle}>Visitor Log</Text>
              <Text style={s.visitorLogBannerSub}>आगंतुक लॉग प्रबंधित करें</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={Colors.outlineVariant} />
        </TouchableOpacity>

        {/* ─── Quick Actions ─── */}
        <View style={s.quickActionsSection}>
          <View>
            <Text style={s.sectionTitle}>Quick Actions</Text>
            <Text style={s.sectionSubTitle}>त्वरित कार्रवाई</Text>
          </View>
          <View style={s.quickActionsRow}>
            <TouchableOpacity
              style={s.quickActionItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GuardAttendanceHistory')}
            >
              <View style={[s.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="history" size={24} color="#1565C0" />
              </View>
              <Text style={s.quickActionLabel}>History</Text>
              <Text style={s.quickActionLabelHindi}>इतिहास</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quickActionItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GuardSalarySlips')}
            >
              <View style={[s.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                <MaterialIcons name="receipt-long" size={24} color="#2E7D32" />
              </View>
              <Text style={s.quickActionLabel}>Salary Slips</Text>
              <Text style={s.quickActionLabelHindi}>वेतन पर्ची</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quickActionItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('DocumentChecklist', { personnelId })}
            >
              <View style={[s.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
                <MaterialIcons name="folder-open" size={24} color="#EF6C00" />
              </View>
              <Text style={s.quickActionLabel}>Documents</Text>
              <Text style={s.quickActionLabelHindi}>दस्तावेज़</Text>
            </TouchableOpacity>
          </View>
          <View style={[s.quickActionsRow, { marginTop: 12 }]}>
            <TouchableOpacity
              style={s.quickActionItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GuardProfile')}
            >
              <View style={[s.quickActionIcon, { backgroundColor: '#F3E5F5' }]}>
                <MaterialIcons name="badge" size={24} color="#7B1FA2" />
              </View>
              <Text style={s.quickActionLabel}>My Profile</Text>
              <Text style={s.quickActionLabelHindi}>मेरी प्रोफ़ाइल</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quickActionItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GuardVisitorLog')}
            >
              <View style={[s.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                <MaterialIcons name="groups" size={24} color="#2E7D32" />
              </View>
              <Text style={s.quickActionLabel}>Visitor Log</Text>
              <Text style={s.quickActionLabelHindi}>आगंतुक लॉग</Text>
            </TouchableOpacity>
            
            <View style={{ flex: 1 }} />
          </View>
        </View>

        {/* ─── Recent Activity ─── */}
        <View style={s.activitySection}>
          <View style={s.activityHeader}>
            <View>
              <Text style={s.sectionTitle}>Recent Activity</Text>
              <Text style={s.sectionSubTitle}>हाल की गतिविधि</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('GuardAttendanceHistory')}>
              <Text style={s.viewAllLink}>View All / सभी देखें</Text>
            </TouchableOpacity>
          </View>

          <View style={s.activityListCard}>
            {recentActivity.length === 0 ? (
              <View style={s.emptyActivity}>
                <MaterialIcons name="inbox" size={36} color={Colors.surfaceDim} />
                <Text style={s.emptyActivityText}>No recent activity</Text>
                <Text style={s.emptyActivityTextHindi}>कोई हाल की गतिविधि नहीं</Text>
              </View>
            ) : (
              recentActivity.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  style={[
                    s.activityItem,
                    idx === recentActivity.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => navigation.navigate('GuardAttendanceHistory')}
                >
                  <View style={s.activityItemLeft}>
                    <View style={[s.activityIconCircle, { backgroundColor: item.iconBg }]}>
                      <MaterialIcons name={item.icon as any} size={20} color={item.iconColor} />
                    </View>
                    <View>
                      <Text style={s.activityItemTitle}>{item.title}</Text>
                      <Text style={s.activityItemTime}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={Colors.outlineVariant} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Bottom spacer for nav bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ═══ Bottom Navigation Bar ═══ */}
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        {navItems.map((item) => {
          const isActive = item.key === 'home';
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navItem, isActive && s.navItemActive]}
              activeOpacity={0.7}
              onPress={() => handleNavPress(item.key)}
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

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.outline,
    fontWeight: '600',
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    gap: 16,
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 2,
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
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
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

  // ── Greeting Card ──
  greetingCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: 20,
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    position: 'relative',
  },
  greetingAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  greetingAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  greetingAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Manrope',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.successGreen,
    borderWidth: 2.5,
    borderColor: Colors.primary,
  },
  greetingInfo: {
    flex: 1,
    marginLeft: 14,
  },
  greetingLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Inter',
    letterSpacing: 0.3,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Manrope',
    marginTop: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
  },
  liveTimeContainer: {
    alignItems: 'flex-end',
  },
  liveTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Manrope',
  },
  liveDateText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // ── Site Card ──
  siteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.5)',
    borderRadius: BorderRadius.xl,
    padding: 20,
    gap: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  siteHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  siteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 39, 82, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Manrope',
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  shiftTimeText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  shiftBadge: {
    backgroundColor: 'rgba(0, 39, 82, 0.06)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  shiftBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  // ── Check-in Button ──
  checkInBtn: {
    height: 60,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  checkInBtnInactive: {
    backgroundColor: Colors.secondary,
  },
  checkInBtnActive: {
    backgroundColor: Colors.successGreen,
  },
  checkInBtnDisabled: {
    backgroundColor: '#7a818c',
  },
  checkInBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Manrope',
    letterSpacing: 0.5,
  },

  // ── Stats Cards ──
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.5)',
    borderRadius: BorderRadius.xl,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTrend: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statSubLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
    marginTop: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
    fontFamily: 'Manrope',
    marginTop: 4,
  },
  statValueSlash: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  earningsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter',
    marginTop: 6,
    lineHeight: 16,
  },
  earningsTextHindi: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.outline,
    fontFamily: 'Inter',
    marginTop: 2,
    lineHeight: 14,
  },

  // ── Visitor Log Banner ──
  visitorLogBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.5)',
    borderRadius: BorderRadius.xl,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  visitorLogBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitorLogBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Manrope',
  },
  visitorLogBannerSub: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.outline,
    fontFamily: 'Inter',
    marginTop: 2,
  },

  // ── Quick Actions ──
  quickActionsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Manrope',
  },
  sectionSubTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.outline,
    fontFamily: 'Inter',
    marginTop: 1,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.5)',
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurface,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  quickActionLabelHindi: {
    fontSize: 9,
    fontWeight: '500',
    color: Colors.outline,
    fontFamily: 'Inter',
    textAlign: 'center',
    marginTop: 1,
  },

  // ── Activity Section ──
  activitySection: {
    gap: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'Inter',
  },
  activityListCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.5)',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.15)',
  },
  activityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'Inter',
  },
  activityItemTime: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    fontFamily: 'Inter',
  },
  emptyActivity: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyActivityText: {
    fontSize: 14,
    color: Colors.outline,
    fontWeight: '500',
  },
  emptyActivityTextHindi: {
    fontSize: 12,
    color: Colors.outline,
    fontWeight: '400',
    opacity: 0.8,
  },

  // ── Bottom Nav ──
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 36,
    height: 72,
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
    zIndex: 100,
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
});
